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
 * Check if date is today (local timezone comparison)
 * Uses local time to determine today's date boundary so the result matches
 * the user's timezone rather than UTC (prevents off-by-one errors at midnight).
 * @param date - Date to check
 * @returns True if date is today, false otherwise
 */
export const isToday = (date: Date): boolean => {
  const now = new Date();
  // Use local time methods so the "today" boundary reflects the user's timezone.
  // getUTCFullYear/Month/Date would shift the day for non-UTC users.
  const today = new Date(Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
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
 * Create a UTC-safe key for Set-based date lookup
 * @param date - Date object to create key from
 * @returns String key in "YYYY-M-D" format using UTC date components
 *
 * Example:
 * createDateKey(new Date(Date.UTC(2026, 2, 15))) // "2026-2-15"
 *
 * Note: Uses UTC methods to prevent DST and timezone issues.
 * Month is 0-indexed (0=January, 11=December) per JavaScript Date convention.
 */
export const createDateKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
};

/**
 * Configuration for a single custom day
 */
export interface CustomDayConfig {
  /** The date to customize */
  date: Date;
  /** Type of day: 'weekend' marks as weekend, 'workday' marks as workday */
  type: 'weekend' | 'workday';
}

/**
 * Configuration for custom day predicate
 */
export interface CustomDayPredicateConfig {
  /** Array of custom day configurations with explicit types */
  customDays?: CustomDayConfig[];
  /** Optional base weekend predicate (checked before customDays overrides) */
  isWeekend?: (date: Date) => boolean;
}

/**
 * Create a weekend predicate with unified custom day support
 *
 * Precedence order (highest to lowest):
 * 1. customDays.type='workday' - explicit workday (highest override)
 * 2. customDays.type='weekend' - explicit weekend (override)
 * 3. isWeekend (base predicate) - custom base logic
 * 4. default - Saturday (6) and Sunday (0)
 *
 * @param config - Custom day configuration with array and optional predicate
 * @returns Predicate function (date: Date) => boolean
 *
 * Example:
 * // Simple holidays + working Saturdays
 * const predicate = createCustomDayPredicate({
 *   customDays: [
 *     { date: new Date(Date.UTC(2026, 2, 15)), type: 'workday' }, // working Saturday
 *     { date: new Date(Date.UTC(2026, 0, 1)), type: 'weekend' }  // holiday Tuesday
 *   ]
 * });
 *
 * // 4-day work week + occasional overrides
 * const predicate2 = createCustomDayPredicate({
 *   isWeekend: (date) => {
 *     const day = date.getUTCDay();
 *     return day === 0 || day === 6 || day === 5; // Sun+Sat+Fri
 *   },
 *   customDays: [
 *     { date: new Date(Date.UTC(2026, 2, 10)), type: 'workday' } // working Friday
 *   ]
 * });
 */
export const createCustomDayPredicate = (
  config: CustomDayPredicateConfig
): ((date: Date) => boolean) => {
  const { customDays, isWeekend: basePredicate } = config;

  // Build Set-based lookups for O(1) performance
  const workdaySet = new Set<string>();
  const weekendSet = new Set<string>();

  if (customDays && customDays.length > 0) {
    for (const item of customDays) {
      const key = createDateKey(item.date);
      if (item.type === 'workday') {
        workdaySet.add(key);
      } else { // weekend
        weekendSet.add(key);
      }
    }
  }

  return (date: Date): boolean => {
    const key = createDateKey(date);

    // Priority 1: customDays workdays (highest override)
    if (workdaySet.has(key)) {
      return false; // Explicitly a workday
    }

    // Priority 2: customDays weekends (override)
    if (weekendSet.has(key)) {
      return true; // Explicitly a weekend
    }

    // Priority 3: base predicate (if provided)
    if (basePredicate) {
      return basePredicate(date);
    }

    // Priority 4: default Saturday/Sunday
    const dayOfWeek = date.getUTCDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };
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

/**
 * Return block boundaries for week-view, splitting on month boundaries.
 * Each block represents a column in the week-view header.
 * Blocks are typically 7 days, but split on month boundaries so
 * the first/last block of a month may be smaller.
 *
 * @param days - Array of dates from getMultiMonthDays
 * @returns Array of start dates for each block, with actual block sizes
 */
export interface WeekBlock {
  /** Start date of this block */
  startDate: Date;
  /** Number of days in this block (≤7, splits on month boundaries) */
  days: number;
}

/**
 * Split the date range into blocks, primarily 7-day weeks,
 * but splitting blocks on month boundaries for accurate month spans.
 */
export const getWeekBlocks = (days: Date[]): WeekBlock[] => {
  if (days.length === 0) return [];

  const blocks: WeekBlock[] = [];
  let blockStart = 0;

  while (blockStart < days.length) {
    // Target: 7-day block, but check for month boundary within
    const maxBlockEnd = Math.min(blockStart + 7, days.length);
    const startMonthYear = `${days[blockStart].getUTCFullYear()}-${days[blockStart].getUTCMonth()}`;

    let actualBlockEnd = blockStart + 7; // Default to full week
    if (actualBlockEnd > days.length) {
      actualBlockEnd = days.length;
    }

    // Check if month boundary falls within the 7-day window
    for (let i = blockStart + 1; i < maxBlockEnd; i++) {
      const monthYear = `${days[i].getUTCFullYear()}-${days[i].getUTCMonth()}`;
      if (monthYear !== startMonthYear) {
        // Split at month boundary
        actualBlockEnd = i;
        break;
      }
    }

    blocks.push({
      startDate: days[blockStart],
      days: actualBlockEnd - blockStart,
    });

    blockStart = actualBlockEnd;
  }

  return blocks;
};

/**
 * Represents a month span in week-view header row 1.
 * In week-view, the width is calculated from actual day counts,
 * not from a fixed column count.
 */
export interface WeekSpan {
  /** First day of the calendar month (UTC) */
  month: Date;
  /** Total number of days this month occupies across all blocks */
  days: number;
  /** Start index in the blocks array */
  startIndex: number;
}

/**
 * Calculate month spans based on week-block boundaries.
 * Groups consecutive blocks that belong to the same month.
 */
export const getWeekSpans = (days: Date[]): WeekSpan[] => {
  const blocks = getWeekBlocks(days);
  if (blocks.length === 0) return [];

  const spans: WeekSpan[] = [];
  let currentMonthYear = `${blocks[0].startDate.getUTCFullYear()}-${blocks[0].startDate.getUTCMonth()}`;
  let startIndex = 0;
  let totalDays = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const monthYear = `${block.startDate.getUTCFullYear()}-${block.startDate.getUTCMonth()}`;

    if (monthYear !== currentMonthYear) {
      // Finalize previous month span
      spans.push({
        month: new Date(Date.UTC(
          blocks[startIndex].startDate.getUTCFullYear(),
          blocks[startIndex].startDate.getUTCMonth(),
          1
        )),
        days: totalDays,
        startIndex,
      });
      currentMonthYear = monthYear;
      startIndex = i;
      totalDays = 0;
    }

    totalDays += block.days;

    if (i === blocks.length - 1) {
      spans.push({
        month: new Date(Date.UTC(
          block.startDate.getUTCFullYear(),
          block.startDate.getUTCMonth(),
          1
        )),
        days: totalDays,
        startIndex,
      });
    }
  }

  return spans;
};

export interface MonthBlock {
  /** Первый день месяца (UTC) */
  startDate: Date;
  /** Количество дней в этом месяце внутри dateRange (может быть меньше при обрезке) */
  days: number;
}

/**
 * Разбивает dateRange на блоки по месяцам.
 * Каждый блок = один месяц (колонка в строке 2 month-view шапки).
 * Блок на краях может быть неполным если dateRange начинается/заканчивается не с 1-го числа.
 */
export const getMonthBlocks = (days: Date[]): MonthBlock[] => {
  if (days.length === 0) return [];
  // Переиспользуем getMonthSpans — его структура совпадает с MonthBlock
  return getMonthSpans(days).map(span => ({
    startDate: span.month,
    days: span.days,
  }));
};

export interface YearSpan {
  /** 1 января года (UTC) */
  year: Date;
  /** Суммарное кол-во дней этого года внутри dateRange */
  days: number;
  /** Начальный индекс в массиве monthBlocks */
  startIndex: number;
}

/**
 * Группирует month-блоки по годам.
 * Используется в строке 1 month-view шапки (year label).
 */
export const getYearSpans = (days: Date[]): YearSpan[] => {
  const blocks = getMonthBlocks(days);
  if (blocks.length === 0) return [];

  const spans: YearSpan[] = [];
  let currentYear = blocks[0].startDate.getUTCFullYear();
  let startIndex = 0;
  let totalDays = 0;

  for (let i = 0; i < blocks.length; i++) {
    const blockYear = blocks[i].startDate.getUTCFullYear();
    if (blockYear !== currentYear) {
      spans.push({
        year: new Date(Date.UTC(currentYear, 0, 1)),
        days: totalDays,
        startIndex,
      });
      currentYear = blockYear;
      startIndex = i;
      totalDays = 0;
    }
    totalDays += blocks[i].days;
    if (i === blocks.length - 1) {
      spans.push({
        year: new Date(Date.UTC(currentYear, 0, 1)),
        days: totalDays,
        startIndex,
      });
    }
  }

  return spans;
};

/**
 * Normalize task dates to ensure startDate is always before or equal to endDate.
 * If dates are swapped (endDate < startDate), they are automatically swapped.
 * @param startDate - Task start date (string or Date)
 * @param endDate - Task end date (string or Date)
 * @returns Object with normalized startDate and endDate as ISO date strings (YYYY-MM-DD)
 */
export const normalizeTaskDates = (
  startDate: string | Date,
  endDate: string | Date
): { startDate: string; endDate: string } => {
  const start = parseUTCDate(startDate);
  const end = parseUTCDate(endDate);

  // If dates are swapped, return them in correct order
  if (end.getTime() < start.getTime()) {
    return {
      startDate: end.toISOString().split('T')[0],
      endDate: start.toISOString().split('T')[0],
    };
  }

  // Dates are already in correct order
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};
