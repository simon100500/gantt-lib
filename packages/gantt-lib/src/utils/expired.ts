import type { Task } from '../types';
import { parseUTCDate } from './dateUtils';

/**
 * Checks whether a task is behind the expected progress for the current date.
 * Uses the same progress-based rule as expired task highlighting in TaskRow.
 */
export const isTaskExpired = (
  task: Task | undefined,
  referenceDate: Date = new Date(),
): boolean => {
  if (!task) return false;

  const actualProgress = task.progress ?? 0;
  if (actualProgress >= 100) return false;

  // Align the day boundary to local time, then compare using UTC-safe task dates.
  const today = new Date(Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  ));

  const taskStart = parseUTCDate(task.startDate);
  const taskEnd = parseUTCDate(task.endDate);

  const msPerDay = 1000 * 60 * 60 * 24;
  const duration = taskEnd.getTime() - taskStart.getTime() + msPerDay;
  const elapsedFromToday = today.getTime() - taskStart.getTime();
  const elapsed = Math.min(Math.max(0, elapsedFromToday), duration);
  const expectedProgress = (elapsed / duration) * 100;

  return actualProgress < expectedProgress;
};
