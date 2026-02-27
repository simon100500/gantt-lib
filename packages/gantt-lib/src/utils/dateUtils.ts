import { parseISO, isValid } from 'date-fns';

/**
 * Parse date string as UTC to prevent DST issues
 * @param date - Date string or Date object
 * @returns Date object representing UTC midnight
 * @throws Error if date string is invalid
 */
export const parseUTCDate = (date: string | Date): Date => {
  if (typeof date === 'string') {
    // If already an ISO string (contains 'T'), parse directly
    // Otherwise, append UTC time for simple date strings (YYYY-MM-DD)
    const dateStr = date.includes('T') ? date : `${date}T00:00:00Z`;
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string: ${date}`);
    }
    return parsed;
  }
  return date;
};

/**
 * Get all days in the month of given date (UTC)
 * @param date - Reference date (any day in the target month)
 * @returns Array of Date objects for each day in the month
 */
export const getMonthDays = (date: Date | string): Date[] => {
  const utcDate = parseUTCDate(date);
  const year = utcDate.getUTCFullYear();
  const month = utcDate.getUTCMonth();

  // Get days in month (handles leap years)
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const days: Date[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(Date.UTC(year, month, day)));
  }

  return days;
};

/**
 * Calculate day offset from month start (0-based)
 * @param date - The date to calculate offset for
 * @param monthStart - The start of the month as reference
 * @returns Number of days from month start (negative if date is before month start)
 */
export const getDayOffset = (date: Date, monthStart: Date): number => {
  const dateMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const startMs = Date.UTC(
    monthStart.getUTCFullYear(),
    monthStart.getUTCMonth(),
    monthStart.getUTCDate()
  );
  return Math.round((dateMs - startMs) / (1000 * 60 * 60 * 24));
};

/**
 * Check if date is today (UTC comparison)
 * @param date - Date to check
 * @returns True if date is today, false otherwise
 */
export const isToday = (date: Date): boolean => {
  const now = new Date();
  const today = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  const compareDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  return today.getTime() === compareDate.getTime();
};

/**
 * Check if date is a weekend day (Saturday or Sunday)
 * @param date - Date to check
 * @returns True if date is Saturday (6) or Sunday (0), false otherwise
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday (0) or Saturday (6)
};

/**
 * Calculate multi-month date range from task dates
 * Expands range to include full months with padding on both ends for drag flexibility
 * Adds 1 month before and 2 months after the task range
 * @param tasks - Array of tasks with startDate and endDate
 * @returns Array of Date objects for all days in the expanded range
 */
export const getMultiMonthDays = (tasks: Array<{ startDate: string | Date; endDate: string | Date }>): Date[] => {
  // Handle empty task array by returning current month
  if (!tasks || tasks.length === 0) {
    return getMonthDays(new Date());
  }

  // Find min and max dates from all tasks
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const task of tasks) {
    const start = parseUTCDate(task.startDate);
    const end = parseUTCDate(task.endDate);

    if (!minDate || start.getTime() < minDate.getTime()) {
      minDate = start;
    }
    if (!maxDate || end.getTime() > maxDate.getTime()) {
      maxDate = end;
    }
  }

  if (!minDate || !maxDate) {
    return getMonthDays(new Date());
  }

  // Extend to full months: 1st of first month to last day of last month
  // Add padding: 2 months after for drag flexibility
  const startOfMonth = new Date(Date.UTC(
    minDate.getUTCFullYear(),
    minDate.getUTCMonth(),
    1
  ));

  const endOfMonth = new Date(Date.UTC(
    maxDate.getUTCFullYear(),
    maxDate.getUTCMonth() + 1 + 2, // Original + 2 months padding after
    0
  ));

  // Generate all dates in range
  const days: Date[] = [];
  const current = new Date(startOfMonth);

  while (current.getTime() <= endOfMonth.getTime()) {
    days.push(new Date(Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate()
    )));
    // Move to next day
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
};

/**
 * Calculate month spans within a date range
 * @param dateRange - Array of Date objects representing the full range
 * @returns Array of month span objects with month, days count, and start index
 */
export const getMonthSpans = (
  dateRange: Date[]
): Array<{ month: Date; days: number; startIndex: number }> => {
  if (dateRange.length === 0) {
    return [];
  }

  const spans: Array<{ month: Date; days: number; startIndex: number }> = [];
  let currentMonthYear = `${dateRange[0].getUTCFullYear()}-${dateRange[0].getUTCMonth()}`;
  let startOfMonthIndex = 0;

  for (let i = 0; i < dateRange.length; i++) {
    const date = dateRange[i];
    const monthYear = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;

    // When month changes, finalize the previous span and start a new one
    if (monthYear !== currentMonthYear) {
      spans.push({
        month: new Date(Date.UTC(
          dateRange[startOfMonthIndex].getUTCFullYear(),
          dateRange[startOfMonthIndex].getUTCMonth(),
          1
        )),
        days: i - startOfMonthIndex,
        startIndex: startOfMonthIndex
      });
      currentMonthYear = monthYear;
      startOfMonthIndex = i;
    }

    // Last date - finalize the last span
    if (i === dateRange.length - 1) {
      spans.push({
        month: new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          1
        )),
        days: i - startOfMonthIndex + 1,
        startIndex: startOfMonthIndex
      });
    }
  }

  return spans;
};

/**
 * Format date as DD.MM (e.g., 25.03 for March 25th)
 * @param date - Date to format
 * @returns Formatted date string in DD.MM format
 */
export const formatDateLabel = (date: Date | string): string => {
  const parsed = parseUTCDate(date);
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
};
