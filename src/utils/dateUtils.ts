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
