import { buildTaskRangeFromStart } from '../../core/scheduling';
import { parseUTCDate } from '../../utils/dateUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_TASK_DURATION_DAYS = 5;

export interface DefaultTaskDateRangeOptions {
  businessDays?: boolean;
  defaultTaskDurationDays?: number;
  weekendPredicate?: (date: Date) => boolean;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getTodayISODate(): string {
  const now = new Date();
  return toISODate(new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )));
}

export function buildDefaultTaskDateRange(
  startDate: string | Date,
  {
    businessDays,
    defaultTaskDurationDays = DEFAULT_TASK_DURATION_DAYS,
    weekendPredicate,
  }: DefaultTaskDateRangeOptions = {},
): { startDate: string; endDate: string } {
  const durationDays = Math.max(1, Math.round(defaultTaskDurationDays));
  const start = parseUTCDate(startDate);

  if (businessDays && weekendPredicate) {
    const range = buildTaskRangeFromStart(start, durationDays, true, weekendPredicate);
    return {
      startDate: toISODate(range.start),
      endDate: toISODate(range.end),
    };
  }

  return {
    startDate: toISODate(start),
    endDate: toISODate(new Date(start.getTime() + (durationDays - 1) * DAY_MS)),
  };
}
