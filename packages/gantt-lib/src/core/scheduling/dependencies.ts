/**
 * Dependency calculation functions.
 * Moved from dependencyUtils.ts — verbatim implementations.
 * Zero React/DOM/date-fns imports.
 */

import type { LinkType, TaskDependency, Task } from './types';
import {
  getBusinessDayOffset,
  shiftBusinessDayOffset,
  DAY_MS,
  getTaskDuration,
} from './dateMath';

/**
 * Normalize predecessor dates for scheduling calculations.
 * For milestone tasks, endDate is treated as equal to startDate (zero duration).
 * This ensures FS links from milestones place successors on the same day (not +1).
 */
export function normalizePredecessorDates(
  predecessor: Pick<Task, 'startDate' | 'endDate' | 'type'>,
  parseDateFn: (d: string | Date) => Date
): { predStart: Date; predEnd: Date } {
  const predStart = parseDateFn(predecessor.startDate);
  const isMilestone = predecessor.type === 'milestone';
  const predEnd = isMilestone ? predStart : parseDateFn(predecessor.endDate);
  return { predStart, predEnd };
}

/**
 * Get lag value from dependency, defaulting to 0.
 */
export function getDependencyLag(dep: Pick<TaskDependency, 'lag'>): number {
  return Number.isFinite(dep.lag) ? dep.lag : 0;
}

/**
 * Normalize lag for FS links — clamp to >= -predecessorDuration.
 */
export function normalizeDependencyLag(
  linkType: LinkType,
  lag: number,
  predecessorStart: Date,
  predecessorEnd: Date,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean
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

  return Math.max(-predecessorDuration, lag);
}

/**
 * Compute lag (in days) from actual predecessor/successor dates.
 * This is the single source of truth for lag semantics.
 *
 * Semantics (lag=0 = natural, gap-free connection):
 * - FS: lag = succStart - predEnd - 1  (adjacent days = 0)
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
  weekendPredicate?: (date: Date) => boolean
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
          Math.round((sS - pE) / DAY_MS) - 1,
          predStart,
          predEnd,
          businessDays,
          weekendPredicate
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
        businessOffset - 1,
        predStart,
        predEnd,
        businessDays,
        weekendPredicate
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
 * - FS: Successor start = Predecessor end + lag + 1 day  (lag=0 -> next day)
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
  weekendPredicate?: (date: Date) => boolean
): Date {
  const normalizedLag = normalizeDependencyLag(
    linkType,
    lag,
    predecessorStart,
    predecessorEnd,
    businessDays,
    weekendPredicate
  );

  // Calendar days (original logic)
  if (!businessDays || !weekendPredicate) {
    switch (linkType) {
      case 'FS':
        return new Date(predecessorEnd.getTime() + (normalizedLag + 1) * DAY_MS);
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
      offset = normalizedLag + 1;
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
