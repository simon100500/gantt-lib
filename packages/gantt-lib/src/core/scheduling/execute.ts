/**
 * Command-level scheduling API.
 * High-level functions that compose low-level scheduling primitives.
 * Zero React/DOM/date-fns imports.
 */

// START_MODULE_CONTRACT
//   PURPOSE: Execute authoritative task and project schedule recalculations.
//   SCOPE: Move, resize, dependency recalculation, cascade, and full-project scheduling with optional fixed boundaries.
//   INPUTS: Immutable task snapshot and scheduling calendar.
//   OUTPUTS: Sparse changed-task result preserving bottom-up direct-child rollups and locks.
//   PROJECT_COST: Build child adjacency once; consume dependency queue by index. Parent discovery and date rollup never rescan the complete snapshot per task.
//   DEPENDS: commands, cascade, dateMath, dependencies, hierarchy, scheduling types
//   LINKS: M-SCHEDULING, fn-recalculateTaskFromDependencies, fn-recalculateProjectSchedule
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT

import type { Task, ScheduleCommandResult, ScheduleCommandOptions } from './types';
import { moveTaskRange, recalculateIncomingLags, buildTaskRangeFromEnd, buildTaskRangeFromStart, getTaskDuration } from './commands';
import { universalCascade } from './cascade';
import { parseDateOnly } from './dateMath';
import { calculateSuccessorDate, getDependencyLag, normalizePredecessorDates } from './dependencies';
import { resolveFixedDates, resolveParentFixedDates } from './fixedDates';
import { getChildDateBounds, computeParentDates } from './hierarchy';

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function createChangedResult(snapshot: Task[], nextTasks: Task[]): ScheduleCommandResult {
  const originalById = new Map(snapshot.map(task => [task.id, task]));
  const changedTasks = nextTasks.filter(task => JSON.stringify(originalById.get(task.id)) !== JSON.stringify(task));

  return {
    changedTasks,
    changedIds: changedTasks.map(task => task.id),
  };
}

/**
 * Move a task to a new start date with cascade and lag recalculation.
 * Identical to manual composition: moveTaskRange -> recalculateIncomingLags -> universalCascade.
 */
export function moveTaskWithCascade(
  taskId: string,
  newStart: Date,
  snapshot: Task[],
  options?: ScheduleCommandOptions
): ScheduleCommandResult {
  const task = snapshot.find(t => t.id === taskId);
  if (!task?.startDate || !task.endDate) {
    return { changedTasks: [], changedIds: [] };
  }

  const businessDays = options?.businessDays ?? false;
  const weekendPredicate = options?.weekendPredicate;

  // Step 1: Calculate new range preserving duration
  let newRange = moveTaskRange(
    task.startDate,
    task.endDate,
    newStart,
    businessDays,
    weekendPredicate
  );
  newRange = resolveFixedDates(task, newRange, snapshot.some(t => t.parentId === task.id), businessDays, weekendPredicate);

  // Step 2: Recalculate incoming dependency lags
  const updatedDependencies = recalculateIncomingLags(
    task,
    newRange.start,
    newRange.end,
    snapshot,
    businessDays,
    weekendPredicate
  );

  // Step 3: Create moved task with updated deps
  const movedTask: Task = {
    ...task,
    startDate: newRange.start.toISOString().split('T')[0],
    endDate: newRange.end.toISOString().split('T')[0],
    dependencies: updatedDependencies,
  };

  // Step 4: Cascade through dependency graph
  if (options?.skipCascade) {
    return {
      changedTasks: [movedTask],
      changedIds: [movedTask.id],
    };
  }

  const cascadeResult = universalCascade(
    movedTask,
    newRange.start,
    newRange.end,
    snapshot,
    businessDays,
    weekendPredicate
  );

  // Merge: movedTask + cascade results
  const resultMap = new Map<string, Task>();
  resultMap.set(movedTask.id, movedTask);
  for (const t of cascadeResult) {
    resultMap.set(t.id, t);
  }

  const changedTasks = Array.from(resultMap.values());
  return {
    changedTasks,
    changedIds: changedTasks.map(t => t.id),
  };
}

/**
 * Resize a task by changing one boundary while keeping the opposite boundary fixed.
 *
 * The public scheduling-intent contract names the boundary that stays fixed:
 * anchor='start' keeps the start date and derives the end date.
 * anchor='end' keeps the end date and derives the start date.
 */
export function resizeTaskWithCascade(
  taskId: string,
  anchor: 'start' | 'end',
  newDate: Date,
  snapshot: Task[],
  options?: ScheduleCommandOptions
): ScheduleCommandResult {
  const task = snapshot.find(t => t.id === taskId);
  if (!task?.startDate || !task.endDate) {
    return { changedTasks: [], changedIds: [] };
  }

  const businessDays = options?.businessDays ?? false;
  const weekendPredicate = options?.weekendPredicate;

  const originalStart = parseDateOnly(task.startDate);
  const originalEnd = parseDateOnly(task.endDate);
  let newRange: { start: Date; end: Date };

  if (anchor === 'start') {
    // anchor='start': start stays fixed, newDate is the requested end.
    newRange = { start: originalStart, end: newDate };
  } else {
    // anchor='end': end stays fixed, newDate is the requested start.
    newRange = { start: newDate, end: originalEnd };
  }
  newRange = resolveFixedDates(task, newRange, snapshot.some(t => t.parentId === task.id), businessDays, weekendPredicate, false);

  // Recalculate lags
  const updatedDependencies = recalculateIncomingLags(
    task,
    newRange.start,
    newRange.end,
    snapshot,
    businessDays,
    weekendPredicate
  );

  // Create resized task
  const resizedTask: Task = {
    ...task,
    startDate: newRange.start.toISOString().split('T')[0],
    endDate: newRange.end.toISOString().split('T')[0],
    dependencies: updatedDependencies,
  };

  if (options?.skipCascade) {
    return {
      changedTasks: [resizedTask],
      changedIds: [resizedTask.id],
    };
  }

  // Cascade through dependency graph
  const cascadeResult = universalCascade(
    resizedTask,
    newRange.start,
    newRange.end,
    snapshot,
    businessDays,
    weekendPredicate
  );

  const resultMap = new Map<string, Task>();
  resultMap.set(resizedTask.id, resizedTask);
  for (const t of cascadeResult) {
    resultMap.set(t.id, t);
  }

  const changedTasks = Array.from(resultMap.values());
  return {
    changedTasks,
    changedIds: changedTasks.map(t => t.id),
  };
}

/**
 * Recalculate a task's dates based on its dependency constraints.
 * Finds all predecessors and computes the most constrained date.
 */
export function recalculateTaskFromDependencies(
  taskId: string,
  snapshot: Task[],
  options?: ScheduleCommandOptions
): ScheduleCommandResult {
  const task = snapshot.find(t => t.id === taskId);
  if (!task) {
    return { changedTasks: [], changedIds: [] };
  }

  const businessDays = options?.businessDays ?? false;
  const weekendPredicate = options?.weekendPredicate;

  if (!task.startDate || !task.endDate || !task.dependencies?.length) {
    // No dependencies — return the task as-is
    return {
      changedTasks: [task],
      changedIds: [task.id],
    };
  }

  // Find the most constrained start/end based on all predecessors
  let constrainedStart: Date | null = null;
  let constrainedEnd: Date | null = null;

  for (const dep of task.dependencies) {
    const predecessor = snapshot.find(t => t.id === dep.taskId);
    if (!predecessor) continue;

    const { predStart, predEnd } = normalizePredecessorDates(predecessor, parseDateOnly);
    const constraintDate = calculateSuccessorDate(
      predStart,
      predEnd,
      dep.type,
      getDependencyLag(dep),
      businessDays,
      weekendPredicate,
      task.type
    );

    if (!Number.isFinite(+constraintDate)) continue;
    const duration = getTaskDuration(
      parseDateOnly(task.startDate),
      parseDateOnly(task.endDate),
      businessDays,
      weekendPredicate
    );

    let range: { start: Date; end: Date };
    if (dep.type === 'FS' || dep.type === 'SS') {
      range = buildTaskRangeFromStart(constraintDate, duration, businessDays, weekendPredicate);
    } else {
      range = buildTaskRangeFromEnd(constraintDate, duration, businessDays, weekendPredicate);
    }

    // Take the latest start as the effective constraint
    if (!constrainedStart || range.start.getTime() > constrainedStart.getTime()) {
      constrainedStart = range.start;
      constrainedEnd = range.end;
    }
  }

  if (!constrainedStart || !constrainedEnd) {
    return {
      changedTasks: [task],
      changedIds: [task.id],
    };
  }

  const fixedParent = !!(task.fixedStartDate || task.fixedEndDate) && snapshot.some(t => t.parentId === task.id);
  if (fixedParent) {
    const rollup = computeParentDates(task.id, snapshot, businessDays, weekendPredicate);
    constrainedStart = rollup.startDate;
    constrainedEnd = rollup.endDate;
  } else {
    ({ start: constrainedStart, end: constrainedEnd } = resolveFixedDates(task, { start: constrainedStart, end: constrainedEnd }, false, businessDays, weekendPredicate));
  }

  // Recalculate lags for the new position
  const updatedDependencies = recalculateIncomingLags(
    task,
    constrainedStart,
    constrainedEnd,
    snapshot,
    businessDays,
    weekendPredicate
  );

  const recalculatedTask: Task = {
    ...task,
    startDate: Number.isFinite(+constrainedStart) ? toIsoDate(constrainedStart) : undefined,
    endDate: Number.isFinite(+constrainedEnd) ? toIsoDate(constrainedEnd) : undefined,
    dependencies: updatedDependencies,
  };

  if (options?.skipCascade) {
    return {
      changedTasks: [recalculatedTask],
      changedIds: [recalculatedTask.id],
    };
  }

  // Cascade through dependency graph
  const cascadeResult = universalCascade(
    recalculatedTask,
    constrainedStart,
    constrainedEnd,
    snapshot,
    businessDays,
    weekendPredicate,
    undefined,
    fixedParent
  );

  const resultMap = new Map<string, Task>();
  resultMap.set(recalculatedTask.id, recalculatedTask);
  for (const t of cascadeResult) {
    resultMap.set(t.id, t);
  }

  const changedTasks = Array.from(resultMap.values());
  return {
    changedTasks,
    changedIds: changedTasks.map(t => t.id),
  };
}

/**
 * Full project schedule recalculation.
 * Recomputes the project against a continuously updated working snapshot.
 * Returns only tasks whose normalized state changed.
 */
export function recalculateProjectSchedule(
  snapshot: Task[],
  options?: ScheduleCommandOptions
): ScheduleCommandResult {
  if (snapshot.some(task => task.fixedStartDate || task.fixedEndDate)) {
    return recalculateFixedComponents(snapshot, options);
  }
  return recalculateProjectScheduleLegacy(snapshot, options);
}

function recalculateFixedComponents(snapshot: Task[], options?: ScheduleCommandOptions): ScheduleCommandResult {
  const businessDays = options?.businessDays ?? false;
  const weekendPredicate = options?.weekendPredicate;
  const initial = new Map(snapshot.map(task => [task.id, task]));
  const next = new Map(snapshot.map(task => [task.id, task]));
  const children = new Map<string, string[]>();
  const outgoing = new Map(snapshot.map(task => [task.id, new Set<string>()]));
  const neighbours = new Map(snapshot.map(task => [task.id, new Set<string>()]));
  const connect = (from: string, to: string, ordered = true) => {
    if (!initial.has(from) || !initial.has(to)) return;
    if (ordered) outgoing.get(from)!.add(to);
    neighbours.get(from)!.add(to);
    neighbours.get(to)!.add(from);
  };
  for (const task of snapshot) {
    if (task.parentId && initial.has(task.parentId)) {
      const list = children.get(task.parentId) ?? [];
      list.push(task.id);
      children.set(task.parentId, list);
      connect(task.id, task.parentId);
    }
  }
  for (const task of snapshot) {
    for (const dependency of task.dependencies ?? []) {
      const predecessor = initial.get(dependency.taskId);
      const fixedSource = predecessor?.type === 'milestone'
        ? predecessor.fixedStartDate ?? predecessor.fixedEndDate
        : dependency.type === 'FS' || dependency.type === 'FF'
          ? predecessor?.fixedEndDate : predecessor?.fixedStartDate;
      const targetFixed = dependency.type === 'FS' || dependency.type === 'SS' ? task.fixedStartDate : task.fixedEndDate;
      const derivedParent = children.has(task.id) && !task.fixedStartDate && !task.fixedEndDate;
      connect(dependency.taskId, task.id, !fixedSource && !targetFixed && !derivedParent);
    }
  }
  const affected = new Set(snapshot.filter(task => task.fixedStartDate || task.fixedEndDate).map(task => task.id));
  const pending = [...affected];
  for (let i = 0; i < pending.length; i++) {
    for (const id of neighbours.get(pending[i])!) if (!affected.has(id)) {
      affected.add(id);
      pending.push(id);
    }
  }
  const indegree = new Map([...affected].map(id => [id, 0]));
  for (const id of affected) for (const successor of outgoing.get(id)!) {
    indegree.set(successor, indegree.get(successor)! + 1);
  }
  const queue = [...affected].filter(id => indegree.get(id) === 0);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    const task = next.get(id)!;
    const childIds = children.get(id);
    if (!task.locked) {
      let range = { start: parseDateOnly(task.startDate), end: parseDateOnly(task.endDate) };
      if (childIds?.length) {
        range = getChildDateBounds(childIds.map(child => next.get(child)!));
        range = resolveParentFixedDates(task, range, key => next.get(key), businessDays, weekendPredicate);
      } else if (task.startDate && task.endDate && task.dependencies?.length) {
        const duration = getTaskDuration(task.startDate, task.endDate, businessDays, weekendPredicate);
        let selected: { start: Date; end: Date } | undefined;
        for (const dependency of task.dependencies) {
          const predecessor = next.get(dependency.taskId);
          if (!predecessor) continue;
          const milestoneAnchor = predecessor.type === 'milestone' ? predecessor.fixedStartDate ?? predecessor.fixedEndDate : undefined;
          const { predStart, predEnd } = normalizePredecessorDates({
            ...predecessor,
            startDate: milestoneAnchor ?? predecessor.fixedStartDate ?? predecessor.startDate,
            endDate: milestoneAnchor ?? predecessor.fixedEndDate ?? predecessor.endDate,
          }, parseDateOnly);
          const date = calculateSuccessorDate(predStart, predEnd, dependency.type, getDependencyLag(dependency), businessDays, weekendPredicate, task.type);
          if (!Number.isFinite(+date)) continue;
          const candidate = dependency.type === 'FS' || dependency.type === 'SS'
            ? buildTaskRangeFromStart(date, duration, businessDays, weekendPredicate)
            : buildTaskRangeFromEnd(date, duration, businessDays, weekendPredicate);
          if (!selected || candidate.start > selected.start || (+candidate.start === +selected.start && candidate.end > selected.end)) selected = candidate;
        }
        if (selected) range = selected;
      }
      range = resolveFixedDates(task, range, !!childIds?.length, businessDays, weekendPredicate);
      next.set(id, { ...task, startDate: Number.isFinite(+range.start) ? toIsoDate(range.start) : undefined, endDate: Number.isFinite(+range.end) ? toIsoDate(range.end) : undefined });
    }
    for (const successor of outgoing.get(id)!) {
      indegree.set(successor, indegree.get(successor)! - 1);
      if (indegree.get(successor) === 0) queue.push(successor);
    }
  }
  if (queue.length !== affected.size) throw new Error('Fixed date schedule contains a hierarchy/dependency cycle');
  for (const task of recalculateProjectScheduleLegacy(snapshot, options).changedTasks) {
    if (!affected.has(task.id)) next.set(task.id, task);
  }
  return createChangedResult(snapshot, [...next.values()]);
}

function recalculateProjectScheduleLegacy(
  snapshot: Task[],
  options?: ScheduleCommandOptions
): ScheduleCommandResult {
  const businessDays = options?.businessDays ?? false;
  const weekendPredicate = options?.weekendPredicate;
  const workingMap = new Map(snapshot.map(task => [task.id, { ...task }]));
  const indegree = new Map<string, number>();
  const successorIdsByTask = new Map<string, string[]>();

  for (const task of snapshot) {
    indegree.set(task.id, 0);
    successorIdsByTask.set(task.id, []);
  }

  for (const task of snapshot) {
    for (const dep of task.dependencies ?? []) {
      if (!workingMap.has(dep.taskId)) {
        continue;
      }

      indegree.set(task.id, (indegree.get(task.id) ?? 0) + 1);
      successorIdsByTask.get(dep.taskId)?.push(task.id);
    }
  }

  const queue = snapshot
    .filter(task => (indegree.get(task.id) ?? 0) === 0)
    .map(task => task.id);

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
    const currentId = queue[queueIndex];

    for (const successorId of successorIdsByTask.get(currentId) ?? []) {
      const nextIndegree = (indegree.get(successorId) ?? 0) - 1;
      indegree.set(successorId, nextIndegree);

      if (nextIndegree !== 0) {
        continue;
      }

      const currentTask = workingMap.get(successorId);
      if (!currentTask || currentTask.locked || !currentTask.startDate || !currentTask.endDate || !currentTask.dependencies?.length) {
        queue.push(successorId);
        continue;
      }

      const duration = getTaskDuration(
        parseDateOnly(currentTask.startDate),
        parseDateOnly(currentTask.endDate),
        businessDays,
        weekendPredicate
      );

      let constrainedRange: { start: Date; end: Date } | null = null;

      for (const dep of currentTask.dependencies) {
        const predecessor = workingMap.get(dep.taskId);
        if (!predecessor) {
          continue;
        }

        const { predStart: predecessorStart, predEnd: predecessorEnd } = normalizePredecessorDates(predecessor, parseDateOnly);
        const constraintDate = calculateSuccessorDate(
          predecessorStart,
          predecessorEnd,
          dep.type,
          getDependencyLag(dep),
          businessDays,
          weekendPredicate,
          currentTask.type
        );

        if (!Number.isFinite(+constraintDate)) continue;
        const candidateRange = dep.type === 'FS' || dep.type === 'SS'
          ? buildTaskRangeFromStart(constraintDate, duration, businessDays, weekendPredicate)
          : buildTaskRangeFromEnd(constraintDate, duration, businessDays, weekendPredicate);

        if (
          !constrainedRange ||
          candidateRange.start.getTime() > constrainedRange.start.getTime() ||
          (
            candidateRange.start.getTime() === constrainedRange.start.getTime() &&
            candidateRange.end.getTime() > constrainedRange.end.getTime()
          )
        ) {
          constrainedRange = candidateRange;
        }
      }

      if (!constrainedRange) {
        queue.push(successorId);
        continue;
      }

      workingMap.set(successorId, {
        ...currentTask,
        startDate: toIsoDate(constrainedRange.start),
        endDate: toIsoDate(constrainedRange.end),
      });
      queue.push(successorId);
    }
  }

  // START_BLOCK_PROJECT_PARENT_INDEX
  const childrenByParent = new Map<string, string[]>();
  for (const task of snapshot) if (task.parentId) {
    const children = childrenByParent.get(task.parentId) ?? [];
    children.push(task.id);
    childrenByParent.set(task.parentId, children);
  }
  const parentsByDepth = snapshot
    .filter(task => childrenByParent.has(task.id))
    .map(task => {
      let depth = 0;
      let current = task.parentId ? workingMap.get(task.parentId) : undefined;
      while (current) {
        depth++;
        current = current.parentId ? workingMap.get(current.parentId) : undefined;
      }
      return { taskId: task.id, depth };
    })
    .sort((left, right) => right.depth - left.depth);

  for (const { taskId } of parentsByDepth) {
    const parent = workingMap.get(taskId);
    if (!parent || parent.locked) {
      continue;
    }

    const { start, end } = getChildDateBounds(childrenByParent.get(taskId)!.map(child => workingMap.get(child)!));
    workingMap.set(taskId, {
      ...parent,
      startDate: Number.isFinite(+start) ? toIsoDate(start) : undefined,
      endDate: Number.isFinite(+end) ? toIsoDate(end) : undefined,
    });
  }
  // END_BLOCK_PROJECT_PARENT_INDEX

  return createChangedResult(snapshot, Array.from(workingMap.values()));
}
