/**
 * High-level schedule command functions.
 * Moved from dependencyUtils.ts — verbatim implementations.
 * Zero React/DOM/date-fns imports.
 */

// START_MODULE_CONTRACT
//   PURPOSE: Build task ranges and update dependency lags for interactive scheduling commands.
//   SCOPE: Range construction, incoming FS clamping, and lag recalculation without rewriting links into fixed boundaries.
//   INPUTS: Task ranges, links and scheduling calendar.
//   OUTPUTS: Date ranges and dependency lags.
//   DEPENDS: dateMath, dependencies, scheduling types
//   LINKS: M-SCHEDULING, fn-clampTaskRangeForIncomingFS, fn-recalculateIncomingLags
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT

import type { LinkType, Task } from './types';
import {
  normalizeUTCDate,
  parseDateOnly,
  addBusinessDays,
  subtractBusinessDays,
  alignToWorkingDay,
  getTaskDuration,
  getBusinessDaysCount,
} from './dateMath';
import {
  calculateSuccessorDate,
  getDependencyLag,
  computeLagFromDates,
  normalizePredecessorDates,
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

/** Place the linked boundary and preserve the available dates of the successor. */
export function buildDependencyRange(
  task: Pick<Task, 'startDate' | 'endDate'>,
  type: LinkType,
  date: Date,
  businessDays: boolean,
  weekendPredicate?: (date: Date) => boolean
): { start: Date; end: Date } | undefined {
  const targetsStart = type[1] === 'S';
  if (!Number.isFinite(+date) || !(targetsStart ? task.startDate : task.endDate)) return;

  if (task.startDate && task.endDate) {
    const duration = getTaskDuration(task.startDate, task.endDate, businessDays, weekendPredicate);
    return targetsStart
      ? buildTaskRangeFromStart(date, duration, businessDays, weekendPredicate)
      : buildTaskRangeFromEnd(date, duration, businessDays, weekendPredicate);
  }

  const boundary = businessDays && weekendPredicate
    ? alignToWorkingDay(date, targetsStart ? 1 : -1, weekendPredicate)
    : normalizeUTCDate(date);
  const missing = parseDateOnly(undefined);
  return targetsStart ? { start: boundary, end: missing } : { start: missing, end: boundary };
}

/**
 * Clamp task range start date based on incoming FS dependencies.
 */
export function clampTaskRangeForIncomingFS(
  task: Pick<Task, 'dependencies' | 'type'>,
  proposedStart: Date,
  proposedEnd: Date,
  allTasks: Task[],
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean,
  taskById?: Map<string, Task>
): { start: Date; end: Date } {
  if (!task.dependencies?.length) {
    return { start: proposedStart, end: proposedEnd };
  }

  let minAllowedStart: Date | null = null;

  for (const dep of task.dependencies) {
    if (dep.type !== 'FS') {
      continue;
    }

    const predecessor = taskById?.get(dep.taskId) ?? allTasks.find(candidate => candidate.id === dep.taskId);
    if (!predecessor) {
      continue;
    }

    const { predStart: predecessorStart, predEnd: predecessorEnd } = normalizePredecessorDates(predecessor, parseDateOnly);
    if (!Number.isFinite(+predecessorStart) || !Number.isFinite(+predecessorEnd)) continue;
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
      weekendPredicate,
      task.type
    );

    if (!minAllowedStart || candidateMinStart.getTime() > minAllowedStart.getTime()) {
      minAllowedStart = candidateMinStart;
    }
  }

  if (!Number.isFinite(+proposedStart) || !minAllowedStart || proposedStart >= minAllowedStart) {
    return { start: proposedStart, end: proposedEnd };
  }

  if (!Number.isFinite(+proposedEnd)) return { start: minAllowedStart, end: proposedEnd };

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
  weekendPredicate?: (date: Date) => boolean,
  taskById?: Map<string, Task>
): NonNullable<Task['dependencies']> {
  if (!task.dependencies) return [];
  if (task.fixedStartDate || task.fixedEndDate) return task.dependencies;
  return task.dependencies.map(dep => {
    const predecessor = taskById?.get(dep.taskId) ?? allTasks.find(candidate => candidate.id === dep.taskId);
    if (!predecessor) {
      return { ...dep, lag: getDependencyLag(dep) };
    }

    const { predStart: predecessorStart, predEnd: predecessorEnd } = normalizePredecessorDates(
      predecessor,
      (d) => new Date(d instanceof Date ? d.getTime() : `${String(d).split('T')[0]}T00:00:00.000Z`)
    );
    const source = dep.type[0] === 'S' ? predecessorStart : predecessorEnd;
    const target = dep.type[1] === 'S' ? newStartDate : newEndDate;
    if (!Number.isFinite(+source) || !Number.isFinite(+target)) return dep;
    const nextLag = computeLagFromDates(
      dep.type,
      predecessorStart,
      predecessorEnd,
      newStartDate,
      newEndDate,
      businessDays,
      weekendPredicate,
      task.type
    );

    return { ...dep, lag: nextLag };
  });
}

