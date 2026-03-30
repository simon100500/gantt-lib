/**
 * Pure date math utilities for the core scheduling module.
 * Zero React/DOM/date-fns dependencies.
 *
 * Functions moved from:
 *   - dependencyUtils.ts: normalizeUTCDate, parseDateOnly, getBusinessDayOffset, shiftBusinessDayOffset, DAY_MS
 *   - dateUtils.ts: getBusinessDaysCount, addBusinessDays, subtractBusinessDays
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Normalize a Date to UTC midnight (hours/minutes/seconds zeroed).
 */
export function normalizeUTCDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Parse a date string or Date object to a UTC midnight Date.
 * Handles ISO strings like "2025-01-15" by appending T00:00:00.000Z.
 */
export function parseDateOnly(date: string | Date): Date {
  const parsed = typeof date === 'string'
    ? new Date(`${date.split('T')[0]}T00:00:00.000Z`)
    : normalizeUTCDate(date);
  return normalizeUTCDate(parsed);
}

/**
 * Compute the business-day offset between two dates.
 * Steps through each calendar day, counting only non-weekend days.
 * Returns a positive number if toDate > fromDate, negative if toDate < fromDate.
 */
export function getBusinessDayOffset(
  fromDate: Date,
  toDate: Date,
  weekendPredicate: (date: Date) => boolean
): number {
  const from = normalizeUTCDate(fromDate);
  const to = normalizeUTCDate(toDate);

  if (from.getTime() === to.getTime()) {
    return 0;
  }

  const step = to.getTime() > from.getTime() ? 1 : -1;
  const current = new Date(from);
  let offset = 0;

  while (current.getTime() !== to.getTime()) {
    current.setUTCDate(current.getUTCDate() + step);
    if (!weekendPredicate(current)) {
      offset += step;
    }
  }

  return offset;
}

/**
 * Shift a date by a business-day offset, skipping weekends.
 */
export function shiftBusinessDayOffset(
  date: Date,
  offset: number,
  weekendPredicate: (date: Date) => boolean
): Date {
  const current = normalizeUTCDate(date);

  if (offset === 0) {
    return current;
  }

  const step = offset > 0 ? 1 : -1;
  let remaining = Math.abs(offset);

  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() + step);
    if (!weekendPredicate(current)) {
      remaining--;
    }
  }

  return current;
}

/**
 * Count business days between two dates (inclusive), excluding weekends.
 * Returns minimum 1.
 */
export function getBusinessDaysCount(
  startDate: string | Date,
  endDate: string | Date,
  weekendPredicate: (date: Date) => boolean
): number {
  const start = typeof startDate === 'string'
    ? new Date(`${startDate.split('T')[0]}T00:00:00.000Z`)
    : normalizeUTCDate(startDate);
  const end = typeof endDate === 'string'
    ? new Date(`${endDate.split('T')[0]}T00:00:00.000Z`)
    : normalizeUTCDate(endDate);

  let count = 0;
  const current = new Date(start);

  while (current.getTime() <= end.getTime()) {
    if (!weekendPredicate(current)) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return Math.max(1, count);
}

/**
 * Calculate end date by adding N business days to start date.
 * Returns a Date object.
 */
export function addBusinessDays(
  startDate: string | Date,
  businessDays: number,
  weekendPredicate: (date: Date) => boolean
): Date {
  const start = typeof startDate === 'string'
    ? new Date(`${startDate.split('T')[0]}T00:00:00.000Z`)
    : normalizeUTCDate(startDate);
  const current = new Date(start);
  let targetDays = Math.max(1, businessDays);
  let businessDaysCounted = 0;

  while (businessDaysCounted < targetDays) {
    if (!weekendPredicate(current)) {
      businessDaysCounted++;
    }
    if (businessDaysCounted < targetDays) {
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return current;
}

/**
 * Calculate start date by subtracting N business days from end date.
 * Returns a Date object.
 */
export function subtractBusinessDays(
  endDate: string | Date,
  businessDays: number,
  weekendPredicate: (date: Date) => boolean
): Date {
  const end = typeof endDate === 'string'
    ? new Date(`${endDate.split('T')[0]}T00:00:00.000Z`)
    : normalizeUTCDate(endDate);
  const current = new Date(end);
  let targetDays = Math.max(1, businessDays);
  let businessDaysCounted = 0;

  while (businessDaysCounted < targetDays) {
    if (!weekendPredicate(current)) {
      businessDaysCounted++;
    }
    if (businessDaysCounted < targetDays) {
      current.setUTCDate(current.getUTCDate() - 1);
    }
  }

  return current;
}
