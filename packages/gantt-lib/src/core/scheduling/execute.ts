/**
 * Command-level scheduling API.
 * High-level functions that compose low-level scheduling primitives.
 * Zero React/DOM/date-fns imports.
 */

import type { Task, ScheduleCommandResult, ScheduleCommandOptions } from './types';
import { moveTaskRange, recalculateIncomingLags, buildTaskRangeFromEnd, buildTaskRangeFromStart, getTaskDuration } from './commands';
import { universalCascade } from './cascade';
import { parseDateOnly } from './dateMath';
import { calculateSuccessorDate, getDependencyLag } from './dependencies';

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
 * anchor='start': new start date, end recalculated to preserve duration.
 * anchor='end': new end date, start recalculated to preserve duration.
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
  const duration = getTaskDuration(originalStart, originalEnd, businessDays, weekendPredicate);

  let newRange: { start: Date; end: Date };

  if (anchor === 'end') {
    // anchor='end': new end date, start recalculated to preserve duration
    newRange = buildTaskRangeFromEnd(newDate, duration, businessDays, weekendPredicate);
  } else {
    // anchor='start': new start date, end stays fixed
    // Use buildTaskRangeFromEnd with original end as anchor to recalculate start
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

    const predStart = parseDateOnly(predecessor.startDate);
    const predEnd = parseDateOnly(predecessor.endDate);
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
 * For each root task (no predecessors), runs universalCascade.
 * Returns all tasks with updated positions.
 */
export function recalculateProjectSchedule(
  snapshot: Task[],
  options?: ScheduleCommandOptions
): ScheduleCommandResult {
  const businessDays = options?.businessDays ?? false;
  const weekendPredicate = options?.weekendPredicate;

  // Find root tasks: no dependencies or empty dependencies
  const rootTasks = snapshot.filter(
    t => !t.dependencies || t.dependencies.length === 0
  );

  const resultMap = new Map<string, Task>();

  for (const rootTask of rootTasks) {
    const start = parseDateOnly(rootTask.startDate);
    const end = parseDateOnly(rootTask.endDate);

    const cascadeResult = universalCascade(
      rootTask,
      start,
      end,
      snapshot,
      businessDays,
      weekendPredicate
    );

    for (const t of cascadeResult) {
      resultMap.set(t.id, t);
    }
  }

  // Also include unchanged tasks
  for (const task of snapshot) {
    if (!resultMap.has(task.id)) {
      resultMap.set(task.id, task);
    }
  }

  const changedTasks = Array.from(resultMap.values());
  return {
    changedTasks,
    changedIds: changedTasks.map(t => t.id),
  };
}
