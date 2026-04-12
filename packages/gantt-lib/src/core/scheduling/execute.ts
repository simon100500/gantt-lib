/**
 * Command-level scheduling API.
 * High-level functions that compose low-level scheduling primitives.
 * Zero React/DOM/date-fns imports.
 */

import type { Task, ScheduleCommandResult, ScheduleCommandOptions } from './types';
import { moveTaskRange, recalculateIncomingLags, buildTaskRangeFromEnd, buildTaskRangeFromStart, getTaskDuration } from './commands';
import { universalCascade } from './cascade';
import { parseDateOnly } from './dateMath';
import { calculateSuccessorDate, getDependencyLag, normalizePredecessorDates } from './dependencies';
import { computeParentDates, isTaskParent } from './hierarchy';

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
  if (!task) {
    return { changedTasks: [], changedIds: [] };
  }

  const businessDays = options?.businessDays ?? false;
  const weekendPredicate = options?.weekendPredicate;

  // Step 1: Calculate new range preserving duration
  const newRange = moveTaskRange(
    task.startDate,
    task.endDate,
    newStart,
    businessDays,
    weekendPredicate
  );

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
 * Resize a task by changing its start or end date.
 * anchor='end': new end date, start stays fixed.
 * anchor='start': new start date, end stays fixed.
 */
export function resizeTaskWithCascade(
  taskId: string,
  anchor: 'start' | 'end',
  newDate: Date,
  snapshot: Task[],
  options?: ScheduleCommandOptions
): ScheduleCommandResult {
  const task = snapshot.find(t => t.id === taskId);
  if (!task) {
    return { changedTasks: [], changedIds: [] };
  }

  const businessDays = options?.businessDays ?? false;
  const weekendPredicate = options?.weekendPredicate;

  const originalStart = parseDateOnly(task.startDate);
  const originalEnd = parseDateOnly(task.endDate);
  let newRange: { start: Date; end: Date };

  if (anchor === 'end') {
    // anchor='end': new end date, start stays fixed
    newRange = { start: originalStart, end: newDate };
  } else {
    // anchor='start': new start date, end stays fixed
    newRange = { start: newDate, end: originalEnd };
  }

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

  if (!task.dependencies || task.dependencies.length === 0) {
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
      weekendPredicate
    );

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
    startDate: constrainedStart.toISOString().split('T')[0],
    endDate: constrainedEnd.toISOString().split('T')[0],
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
    weekendPredicate
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

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    for (const successorId of successorIdsByTask.get(currentId) ?? []) {
      const nextIndegree = (indegree.get(successorId) ?? 0) - 1;
      indegree.set(successorId, nextIndegree);

      if (nextIndegree !== 0) {
        continue;
      }

      const currentTask = workingMap.get(successorId);
      if (!currentTask || currentTask.locked || !currentTask.dependencies?.length) {
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
          weekendPredicate
        );

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

  const parentsByDepth = snapshot
    .filter(task => isTaskParent(task.id, snapshot))
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

  const workingTasks = () => Array.from(workingMap.values());

  for (const { taskId } of parentsByDepth) {
    const parent = workingMap.get(taskId);
    if (!parent || parent.locked) {
      continue;
    }

    const { startDate, endDate } = computeParentDates(taskId, workingTasks());
    workingMap.set(taskId, {
      ...parent,
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
    });
  }

  return createChangedResult(snapshot, Array.from(workingMap.values()));
}
