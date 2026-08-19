/**
 * Dependency calculation functions.
 * Moved from dependencyUtils.ts — verbatim implementations.
 * Zero React/DOM/date-fns imports.
 */

// START_MODULE_CONTRACT
//   PURPOSE: Calculate dependency dates and lags using inclusive task dates and explicit milestone semantics.
//   SCOPE: Normalize dependency inputs, calculate successor anchors, and derive lag values from task ranges.
//   DEPENDS: dateMath, scheduling types
//   LINKS: M-SCHEDULING, fn-calculateSuccessorDate, fn-computeLagFromDates
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT

import type { LinkType, TaskDependency, Task } from './types';
import {
  getBusinessDayOffset,
  shiftBusinessDayOffset,
  DAY_MS,
  getTaskDuration,
} from './dateMath';

/**
 * Normalize predecessor dates for scheduling calculations.
 * Milestones have a real zero-duration finish anchor at startDate. The
 * successor type, rather than a fabricated predecessor date, determines
 * whether FS lag=0 lands on the same day (milestone successor) or the next
 * day (regular successor).
 */
export function normalizePredecessorDates(
  predecessor: Pick<Task, 'startDate' | 'endDate' | 'type'>,
  parseDateFn: (d: string | Date) => Date
): { predStart: Date; predEnd: Date } {
  const predStart = parseDateFn(predecessor.startDate);
  const predEnd = predecessor.type === 'milestone'
    ? predStart
    : parseDateFn(predecessor.endDate);
  return { predStart, predEnd };
}

/**
 * Get lag value from dependency, defaulting to 0.
 */
export function getDependencyLag(dep: Pick<TaskDependency, 'lag'>): number {
  return Number.isFinite(dep.lag) ? dep.lag : 0;
}

/**
 * Return a copy of a task with dependency lag values normalized.
 *
 * FS lag normalization depends on predecessor duration, so this helper
 * intentionally leaves dependencies unchanged.
 */
export function normalizeTaskDependencyLags<TTask extends Pick<Task, 'dependencies'>>(task: TTask): TTask {
  return task;
}

/**
 * Normalize lag for FS links. Regular successors clamp to
 * `-predecessorDuration`; milestone successors use one fewer day because
 * their zero-duration FS anchor is the predecessor finish date itself.
 */
export function normalizeDependencyLag(
  linkType: LinkType,
  lag: number,
  predecessorStart: Date,
  predecessorEnd: Date,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean,
  successorType?: Task['type']
): number {
  if (linkType !== 'FS') {
    return lag;
  }

  const predecessorDuration = getTaskDuration(
    predecessorStart,
    predecessorEnd,
    businessDays,
    weekendPredicate
  );

  const minimumLag = successorType === 'milestone'
    ? -(Math.max(0, predecessorDuration - 1))
    : -predecessorDuration;

  return Math.max(minimumLag, lag);
}

/**
 * Compute lag (in days) from actual predecessor/successor dates.
 * This is the single source of truth for lag semantics.
 *
 * Semantics (lag=0 = natural, gap-free connection):
 * - FS: lag = succStart - predEnd - 1  (adjacent regular-task days = 0)
 *       milestone successor uses succStart - predEnd (same-day = 0)
 * - SS: lag = succStart - predStart
 * - FF: lag = succEnd   - predEnd
 * - SF: lag = succEnd   - predStart + 1  (symmetric to FS)
 */
export function computeLagFromDates(
  linkType: LinkType,
  predStart: Date,
  predEnd: Date,
  succStart: Date,
  succEnd: Date,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean,
  successorType?: Task['type']
): number {
  const pS = Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate());
  const pE = Date.UTC(predEnd.getUTCFullYear(),   predEnd.getUTCMonth(),   predEnd.getUTCDate());
  const sS = Date.UTC(succStart.getUTCFullYear(), succStart.getUTCMonth(), succStart.getUTCDate());
  const sE = Date.UTC(succEnd.getUTCFullYear(),   succEnd.getUTCMonth(),   succEnd.getUTCDate());

  // Calendar days (original logic)
  if (!businessDays || !weekendPredicate) {
    switch (linkType) {
      case 'FS':
        return normalizeDependencyLag(
          linkType,
          Math.round((sS - pE) / DAY_MS) - (successorType === 'milestone' ? 0 : 1),
          predStart,
          predEnd,
          businessDays,
          weekendPredicate,
          successorType
        );
      case 'SS': return Math.round((sS - pS) / DAY_MS);
      case 'FF': return Math.round((sE - pE) / DAY_MS);
      case 'SF': return Math.round((sE - pS) / DAY_MS) + 1;
    }
  }

  const anchorDate = linkType === 'SS' || linkType === 'SF' ? predStart : predEnd;
  const targetDate = linkType === 'FS' || linkType === 'SS' ? succStart : succEnd;
  const businessOffset = getBusinessDayOffset(anchorDate, targetDate, weekendPredicate);

  switch (linkType) {
    case 'FS':
      return normalizeDependencyLag(
        linkType,
        businessOffset - (successorType === 'milestone' ? 0 : 1),
        predStart,
        predEnd,
        businessDays,
        weekendPredicate,
        successorType
      );
    case 'SS': return businessOffset;
    case 'FF': return businessOffset;
    case 'SF': return businessOffset + 1;
  }
}

/**
 * Calculate successor date based on predecessor dates, link type, and lag.
 *
 * Link type semantics:
 * - FS: Successor start = Predecessor end + lag + 1 day for regular tasks
 *       and Predecessor end + lag for milestone successors
 * - SS: Successor start = Predecessor start + lag
 * - FF: Successor end   = Predecessor end + lag
 * - SF: Successor end   = Predecessor start + lag - 1 day  (lag=0 -> day before)
 */
export function calculateSuccessorDate(
  predecessorStart: Date,
  predecessorEnd: Date,
  linkType: LinkType,
  lag: number = 0,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean,
  successorType?: Task['type']
): Date {
  const normalizedLag = normalizeDependencyLag(
    linkType,
    lag,
    predecessorStart,
    predecessorEnd,
    businessDays,
    weekendPredicate,
    successorType
  );

  // Calendar days (original logic)
  if (!businessDays || !weekendPredicate) {
    switch (linkType) {
      case 'FS':
        return new Date(predecessorEnd.getTime() + (
          normalizedLag + (successorType === 'milestone' ? 0 : 1)
        ) * DAY_MS);
      case 'SS':
        return new Date(predecessorStart.getTime() + normalizedLag * DAY_MS);
      case 'FF':
        return new Date(predecessorEnd.getTime() + normalizedLag * DAY_MS);
      case 'SF':
        return new Date(predecessorStart.getTime() + (normalizedLag - 1) * DAY_MS);
    }
  }

  const anchorDate = (linkType === 'FS' || linkType === 'FF') ? predecessorEnd : predecessorStart;
  let offset: number;
  switch (linkType) {
    case 'FS':
      offset = normalizedLag + (successorType === 'milestone' ? 0 : 1);
      break;
    case 'SS':
      offset = normalizedLag;
      break;
    case 'FF':
      offset = normalizedLag;
      break;
    case 'SF':
      offset = normalizedLag - 1;
      break;
  }
  return shiftBusinessDayOffset(anchorDate, offset, weekendPredicate);
}
