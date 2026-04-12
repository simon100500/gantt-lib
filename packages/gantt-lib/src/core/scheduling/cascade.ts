/**
 * Cascade engine functions.
 * Moved from dependencyUtils.ts — verbatim implementations.
 * Zero React/DOM/date-fns imports.
 */

import type { Task, LinkType } from './types';
import {
  normalizeUTCDate,
  getTaskDuration,
  alignToWorkingDay,
} from './dateMath';
import {
  calculateSuccessorDate,
  getDependencyLag,
  normalizePredecessorDates,
} from './dependencies';
import {
  getChildren,
  isTaskParent,
  computeParentDates,
} from './hierarchy';
import {
  buildTaskRangeFromStart,
  buildTaskRangeFromEnd,
  moveTaskRange,
} from './commands';

function parseCascadeDateInput(date: string | Date): Date {
  if (date instanceof Date) {
    return normalizeUTCDate(date);
  }
  return normalizeUTCDate(new Date(`${date.split('T')[0]}T00:00:00.000Z`));
}

/**
 * Get successor tasks of a dragged task using BFS, filtered by link type(s).
 */
export function getSuccessorChain(
  draggedTaskId: string,
  allTasks: Task[],
  linkTypes: LinkType[] = ['FS']
): Task[] {
  const successorMap = new Map<string, string[]>();
  for (const task of allTasks) {
    successorMap.set(task.id, []);
  }
  for (const task of allTasks) {
    if (!task.dependencies) continue;
    for (const dep of task.dependencies) {
      if (linkTypes.includes(dep.type)) {
        const list = successorMap.get(dep.taskId) ?? [];
        list.push(task.id);
        successorMap.set(dep.taskId, list);
      }
    }
  }

  const taskById = new Map(allTasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const queue: string[] = [draggedTaskId];
  const chain: Task[] = [];
  visited.add(draggedTaskId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const successors = successorMap.get(current) ?? [];
    for (const sid of successors) {
      if (!visited.has(sid)) {
        visited.add(sid);
        const t = taskById.get(sid);
        if (t) {
          chain.push(t);
          queue.push(sid);
        }
      }
    }
  }

  return chain;
}

/**
 * Cascade successors by actual link constraints (BFS, constraint-based).
 */
export function cascadeByLinks(
  movedTaskId: string,
  newStart: Date,
  newEnd: Date,
  allTasks: Task[],
  skipChildCascade: boolean = false
): Task[] {
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  const updatedDates = new Map<string, { start: Date; end: Date }>();
  updatedDates.set(movedTaskId, { start: newStart, end: newEnd });

  const result: Task[] = [];
  const queue: string[] = [movedTaskId];
  const visited = new Set<string>([movedTaskId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const { start: predStart, end: predEnd } = updatedDates.get(currentId)!;

    if (!skipChildCascade) {
      const children = getChildren(currentId, allTasks);
      for (const child of children) {
        if (visited.has(child.id) || child.locked) continue;

        const origStart = new Date(child.startDate as string);
        const origEnd = new Date(child.endDate as string);
        const durationMs = origEnd.getTime() - origStart.getTime();

        const parentOrig = taskById.get(currentId)!;
        const parentOrigStart = new Date(parentOrig.startDate as string);
        const parentOrigEnd = new Date(parentOrig.endDate as string);

        const parentStartDelta = predStart.getTime() - parentOrigStart.getTime();
        const parentEndDelta = predEnd.getTime() - parentOrigEnd.getTime();

        const newChildStart = new Date(origStart.getTime() + parentStartDelta);
        const newChildEnd = new Date(origEnd.getTime() + parentEndDelta);

        visited.add(child.id);
        updatedDates.set(child.id, { start: newChildStart, end: newChildEnd });
        result.push({
          ...child,
          startDate: newChildStart.toISOString().split('T')[0],
          endDate: newChildEnd.toISOString().split('T')[0],
        });
        queue.push(child.id);
      }
    }

    for (const task of allTasks) {
      if (visited.has(task.id) || !task.dependencies || task.locked) continue;

      for (const dep of task.dependencies) {
        if (dep.taskId !== currentId) continue;

        const orig = taskById.get(task.id)!;
        const origStart = new Date(orig.startDate as string);
        const origEnd = new Date(orig.endDate as string);
        const duration = getTaskDuration(origStart, origEnd);
        const currentTask = taskById.get(currentId)!;
        const { predStart: normalizedPredStart, predEnd: normalizedPredEnd } = normalizePredecessorDates(
          {
            startDate: predStart,
            endDate: predEnd,
            type: currentTask.type,
          },
          parseCascadeDateInput
        );
        const constraintDate = calculateSuccessorDate(
          normalizedPredStart,
          normalizedPredEnd,
          dep.type,
          getDependencyLag(dep)
        );

        let newSuccStart: Date;
        let newSuccEnd: Date;

        if (dep.type === 'FS' || dep.type === 'SS') {
          ({ start: newSuccStart, end: newSuccEnd } = buildTaskRangeFromStart(constraintDate, duration));
        } else {
          ({ start: newSuccStart, end: newSuccEnd } = buildTaskRangeFromEnd(constraintDate, duration));
        }

        visited.add(task.id);
        updatedDates.set(task.id, { start: newSuccStart, end: newSuccEnd });
        result.push({
          ...task,
          startDate: newSuccStart.toISOString().split('T')[0],
          endDate: newSuccEnd.toISOString().split('T')[0],
        });
        queue.push(task.id);
        break;
      }
    }
  }

  return result;
}

/**
 * Get transitive closure of successors for cascading.
 */
export function getTransitiveCascadeChain(
  changedTaskId: string,
  allTasks: Task[],
  firstLevelLinkTypes: LinkType[]
): Task[] {
  const allTypesSuccessorMap = new Map<string, Task[]>();
  for (const task of allTasks) {
    allTypesSuccessorMap.set(task.id, []);
  }
  for (const task of allTasks) {
    if (!task.dependencies) continue;
    for (const dep of task.dependencies) {
      const list = allTypesSuccessorMap.get(dep.taskId) ?? [];
      list.push(task);
      allTypesSuccessorMap.set(dep.taskId, list);
    }
  }

  const directChildren = getChildren(changedTaskId, allTasks);
  const directSuccessors = getSuccessorChain(changedTaskId, allTasks, firstLevelLinkTypes);
  const initialChain = [...directChildren, ...directSuccessors].filter((task, index, arr) =>
    arr.findIndex(candidate => candidate.id === task.id) === index
  );

  const chain = [...initialChain];
  const visited = new Set<string>([changedTaskId, ...initialChain.map(t => t.id)]);
  const queue = [...initialChain];

  while (queue.length > 0) {
    const current = queue.shift()!;

    const children = getChildren(current.id, allTasks);
    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        chain.push(child);
        queue.push(child);
      }
    }

    const successors = allTypesSuccessorMap.get(current.id) ?? [];
    for (const successor of successors) {
      if (!visited.has(successor.id)) {
        visited.add(successor.id);
        chain.push(successor);
        queue.push(successor);
      }
    }
  }

  return chain;
}

/**
 * Arrival mode for universal cascade BFS entries.
 */
type ArrivalMode = 'direct' | 'child-delta' | 'parent-recalc' | 'dependency';

/**
 * Universal cascade engine that propagates a moved task's new position through
 * the entire dependency+hierarchy graph using BFS with change detection.
 */
export function universalCascade(
  movedTask: Task,
  newStart: Date,
  newEnd: Date,
  allTasks: Task[],
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean
): Task[] {
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  const updatedDates = new Map<string, { start: Date; end: Date }>();
  updatedDates.set(movedTask.id, { start: newStart, end: newEnd });

  const resultMap = new Map<string, Task>();
  resultMap.set(movedTask.id, {
    ...movedTask,
    startDate: newStart.toISOString().split('T')[0],
    endDate: newEnd.toISOString().split('T')[0],
  });

  const queue: Array<[string, ArrivalMode]> = [[movedTask.id, 'direct']];

  const childShifted = new Set<string>();

  let iterations = 0;
  const MAX_ITERATIONS = allTasks.length * 3;

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const [currentId, arrivalMode] = queue.shift()!;
    const { start: currStart, end: currEnd } = updatedDates.get(currentId)!;
    const currentOriginal = taskById.get(currentId)!;

    // RULE 1: Hierarchy children follow their parent
    if (arrivalMode !== 'parent-recalc') {
      const children = getChildren(currentId, allTasks);
      for (const child of children) {
        if (childShifted.has(child.id) || child.locked) continue;

        const parentOrigStart = new Date(currentOriginal.startDate as string);
        const parentOrigEnd   = new Date(currentOriginal.endDate   as string);

        const childOrigStart = new Date(child.startDate as string);
        const childOrigEnd   = new Date(child.endDate   as string);

        const startDeltaMs = currStart.getTime() - parentOrigStart.getTime();
        const endDeltaMs   = currEnd.getTime()   - parentOrigEnd.getTime();

        let childNewStart: Date;
        let childNewEnd: Date;

        if (businessDays && weekendPredicate) {
          const proposedStart = new Date(childOrigStart.getTime() + startDeltaMs);
          const snapDirection: 1 | -1 = currStart.getTime() >= parentOrigStart.getTime() ? 1 : -1;
          const movedRange = moveTaskRange(
            child.startDate,
            child.endDate,
            proposedStart,
            true,
            weekendPredicate,
            snapDirection
          );
          childNewStart = movedRange.start;
          childNewEnd = movedRange.end;
        } else {
          childNewStart = new Date(childOrigStart.getTime() + startDeltaMs);
          childNewEnd = new Date(childOrigEnd.getTime() + endDeltaMs);
        }

        const prev = updatedDates.get(child.id);
        if (prev && prev.start.getTime() === childNewStart.getTime() && prev.end.getTime() === childNewEnd.getTime()) {
          continue;
        }

        updatedDates.set(child.id, { start: childNewStart, end: childNewEnd });
        childShifted.add(child.id);
        queue.push([child.id, 'child-delta']);
        resultMap.set(child.id, {
          ...child,
          startDate: childNewStart.toISOString().split('T')[0],
          endDate:   childNewEnd.toISOString().split('T')[0],
        });
      }
    }

    // RULE 2: Parent task is recomputed from its children
    const parentId = (currentOriginal as any).parentId as string | undefined;
    if (parentId) {
      const parent = taskById.get(parentId);
      if (parent && !parent.locked) {
        const siblings = getChildren(parentId, allTasks);

        const siblingPositions = siblings.map(sib => {
          if (updatedDates.has(sib.id)) return updatedDates.get(sib.id)!;
          return { start: new Date(sib.startDate as string), end: new Date(sib.endDate as string) };
        });

        const minStart = new Date(Math.min(...siblingPositions.map(p => p.start.getTime())));
        const maxEnd   = new Date(Math.max(...siblingPositions.map(p => p.end.getTime())));

        const prev = updatedDates.get(parentId);
        if (!prev || prev.start.getTime() !== minStart.getTime() || prev.end.getTime() !== maxEnd.getTime()) {
          updatedDates.set(parentId, { start: minStart, end: maxEnd });
          queue.push([parentId, 'parent-recalc']);
          resultMap.set(parentId, {
            ...parent,
            startDate: minStart.toISOString().split('T')[0],
            endDate:   maxEnd.toISOString().split('T')[0],
          });
        }
      }
    }

    // RULE 3: Dependency successors are repositioned
    for (const task of allTasks) {
      if (task.locked || !task.dependencies) continue;

      const dep = task.dependencies.find(d => d.taskId === currentId);
      if (!dep) continue;

      const origStart  = new Date(task.startDate as string);
      const origEnd    = new Date(task.endDate   as string);
      const { predStart: normalizedPredStart, predEnd: normalizedPredEnd } = normalizePredecessorDates(
        {
          startDate: currStart,
          endDate: currEnd,
          type: currentOriginal.type,
        },
        parseCascadeDateInput
      );
      const constraintDate = calculateSuccessorDate(
        normalizedPredStart, normalizedPredEnd, dep.type, getDependencyLag(dep),
        businessDays, weekendPredicate
      );

      let succNewStart: Date;
      let succNewEnd: Date;
      const duration = getTaskDuration(origStart, origEnd, businessDays, weekendPredicate);

      if (dep.type === 'FS' || dep.type === 'SS') {
        ({ start: succNewStart, end: succNewEnd } = buildTaskRangeFromStart(
          constraintDate,
          duration,
          businessDays,
          weekendPredicate
        ));
      } else {
        ({ start: succNewStart, end: succNewEnd } = buildTaskRangeFromEnd(
          constraintDate,
          duration,
          businessDays,
          weekendPredicate
        ));
      }

      const prev = updatedDates.get(task.id);
      if (prev && prev.start.getTime() === succNewStart.getTime() && prev.end.getTime() === succNewEnd.getTime()) {
        continue;
      }

      updatedDates.set(task.id, { start: succNewStart, end: succNewEnd });
      queue.push([task.id, 'dependency']);
      resultMap.set(task.id, {
        ...task,
        startDate: succNewStart.toISOString().split('T')[0],
        endDate:   succNewEnd.toISOString().split('T')[0],
      });
    }
  }

  return Array.from(resultMap.values());
}

/**
 * Recalculate all task dates when switching between business/calendar day modes.
 */
export function reflowTasksOnModeSwitch(
  sourceTasks: Task[],
  toBusinessDays: boolean,
  weekendPredicate: (date: Date) => boolean
): Task[] {
  const fromBusinessDays = !toBusinessDays;
  let tasks: Task[] = sourceTasks.map(t => ({ ...t }));

  const toISO = (d: Date) => d.toISOString().split('T')[0];

  for (const task of tasks) {
    if (isTaskParent(task.id, tasks)) continue;

    const start = normalizeUTCDate(new Date(`${task.startDate}T00:00:00.000Z`));
    const duration = getTaskDuration(task.startDate, task.endDate, fromBusinessDays, weekendPredicate);

    let range: { start: Date; end: Date };
    if (toBusinessDays) {
      const alignedStart = alignToWorkingDay(start, 1, weekendPredicate);
      range = buildTaskRangeFromStart(alignedStart, duration, true, weekendPredicate);
    } else {
      range = buildTaskRangeFromStart(start, duration, false);
    }

    task.startDate = toISO(range.start);
    task.endDate = toISO(range.end);
  }

  for (const task of tasks) {
    if (!isTaskParent(task.id, tasks)) continue;
    const { startDate, endDate } = computeParentDates(task.id, tasks);
    task.startDate = toISO(startDate);
    task.endDate = toISO(endDate);
  }

  if (toBusinessDays) {
    const rootSeeds = tasks.filter(
      t => !(t as any).parentId && (!t.dependencies || t.dependencies.length === 0)
    );

    for (const seed of rootSeeds) {
      const current = tasks.find(t => t.id === seed.id)!;
      const start = new Date(`${current.startDate}T00:00:00.000Z`);
      const end = new Date(`${current.endDate}T00:00:00.000Z`);

      const cascaded = universalCascade(current, start, end, tasks, toBusinessDays, weekendPredicate);
      const updates = new Map(cascaded.map((t): [string, Task] => [t.id, t]));
      tasks = tasks.map(t => updates.get(t.id) ?? t);
    }
  }

  return tasks;
}
