/**
 * High-level schedule command functions.
 * Moved from dependencyUtils.ts — verbatim implementations.
 * Zero React/DOM/date-fns imports.
 */

import type { Task } from './types';
import {
  normalizeUTCDate,
  parseDateOnly,
  addBusinessDays,
  subtractBusinessDays,
  alignToWorkingDay,
  getTaskDuration,
} from './dateMath';
import {
  calculateSuccessorDate,
  getDependencyLag,
  normalizeDependencyLag,
  computeLagFromDates,
} from './dependencies';

// Re-export for backward compat — these live in dateMath now
export { alignToWorkingDay, getTaskDuration };

/**
 * Build a task range (start/end dates) from a start date and duration.
 */
export function buildTaskRangeFromStart(
  startDate: Date,
  duration: number,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean,
  snapDirection: 1 | -1 = 1
): { start: Date; end: Date } {
  const normalizedStart = businessDays && weekendPredicate
    ? alignToWorkingDay(startDate, snapDirection, weekendPredicate)
    : normalizeUTCDate(startDate);

  if (businessDays && weekendPredicate) {
    return {
      start: normalizedStart,
      end: parseDateOnly(addBusinessDays(normalizedStart, duration, weekendPredicate)),
    };
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  return {
    start: normalizedStart,
    end: new Date(normalizedStart.getTime() + (Math.max(1, duration) - 1) * DAY_MS),
  };
}

/**
 * Build a task range (start/end dates) from an end date and duration.
 */
export function buildTaskRangeFromEnd(
  endDate: Date,
  duration: number,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean,
  snapDirection: 1 | -1 = -1
): { start: Date; end: Date } {
  const normalizedEnd = businessDays && weekendPredicate
    ? alignToWorkingDay(endDate, snapDirection, weekendPredicate)
    : normalizeUTCDate(endDate);

  if (businessDays && weekendPredicate) {
    return {
      start: parseDateOnly(subtractBusinessDays(normalizedEnd, duration, weekendPredicate)),
      end: normalizedEnd,
    };
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  return {
    start: new Date(normalizedEnd.getTime() - (Math.max(1, duration) - 1) * DAY_MS),
    end: normalizedEnd,
  };
}

/**
 * Move a task range to a new start date, preserving duration.
 */
export function moveTaskRange(
  originalStart: string | Date,
  originalEnd: string | Date,
  proposedStart: Date,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean,
  snapDirection: 1 | -1 = 1
): { start: Date; end: Date } {
  return buildTaskRangeFromStart(
    proposedStart,
    getTaskDuration(originalStart, originalEnd, businessDays, weekendPredicate),
    businessDays,
    weekendPredicate,
    snapDirection
  );
}

/**
 * Clamp task range start date based on incoming FS dependencies.
 */
export function clampTaskRangeForIncomingFS(
  task: Pick<Task, 'dependencies'>,
  proposedStart: Date,
  proposedEnd: Date,
  allTasks: Task[],
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean
): { start: Date; end: Date } {
  if (!task.dependencies?.length) {
    return { start: proposedStart, end: proposedEnd };
  }

  let minAllowedStart: Date | null = null;

  for (const dep of task.dependencies) {
    if (dep.type !== 'FS') {
      continue;
    }

    const predecessor = allTasks.find(candidate => candidate.id === dep.taskId);
    if (!predecessor) {
      continue;
    }

    const predecessorStart = parseDateOnly(predecessor.startDate);
    const predecessorEnd = parseDateOnly(predecessor.endDate);
    const predecessorDuration = getTaskDuration(
      predecessorStart,
      predecessorEnd,
      businessDays,
      weekendPredicate
    );
    const candidateMinStart = calculateSuccessorDate(
      predecessorStart,
      predecessorEnd,
      'FS',
      -predecessorDuration,
      businessDays,
      weekendPredicate
    );

    if (!minAllowedStart || candidateMinStart.getTime() > minAllowedStart.getTime()) {
      minAllowedStart = candidateMinStart;
    }
  }

  if (!minAllowedStart || proposedStart.getTime() >= minAllowedStart.getTime()) {
    return { start: proposedStart, end: proposedEnd };
  }

  return buildTaskRangeFromStart(
    minAllowedStart,
    getTaskDuration(proposedStart, proposedEnd, businessDays, weekendPredicate),
    businessDays,
    weekendPredicate
  );
}

/**
 * Recalculate incoming dependency lags after a task's dates change.
 */
export function recalculateIncomingLags(
  task: Task,
  newStartDate: Date,
  newEndDate: Date,
  allTasks: Task[],
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean
): NonNullable<Task['dependencies']> {
  if (!task.dependencies) return [];
  return task.dependencies.map(dep => {
    const predecessor = allTasks.find(candidate => candidate.id === dep.taskId);
    if (!predecessor) {
      return { ...dep, lag: getDependencyLag(dep) };
    }

    const predecessorStart = new Date(predecessor.startDate as string);
    const predecessorEnd = new Date(predecessor.endDate as string);
    const nextLag = computeLagFromDates(
      dep.type,
      predecessorStart,
      predecessorEnd,
      newStartDate,
      newEndDate,
      businessDays,
      weekendPredicate
    );

    return { ...dep, lag: nextLag };
  });
}
