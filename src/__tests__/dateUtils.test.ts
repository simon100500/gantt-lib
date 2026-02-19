import { describe, it, expect } from 'vitest';
import { parseUTCDate, getMonthDays, getDayOffset, isToday, isWeekend, getMultiMonthDays, getMonthSpans } from '../utils/dateUtils';

describe('parseUTCDate', () => {
  it('should parse ISO date string as UTC', () => {
    const result = parseUTCDate('2024-03-10');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toContain('2024-03-10');
  });

  it('should handle Date object input', () => {
    const input = new Date('2024-03-10T00:00:00Z');
    const result = parseUTCDate(input);
    expect(result).toEqual(input);
  });

  it('should throw error for invalid date string', () => {
    expect(() => parseUTCDate('invalid-date')).toThrow();
  });

  it('should handle DST transition date (March 10, US spring forward)', () => {
    const result = parseUTCDate('2024-03-10');
    // Should not be affected by local timezone
    expect(result.getUTCHours()).toBe(0);
  });

  it('should handle DST transition date (November 5, US fall back)', () => {
    const result = parseUTCDate('2024-11-05');
    expect(result.getUTCHours()).toBe(0);
  });
});

describe('getMonthDays', () => {
  it('should return all days for a 31-day month', () => {
    const result = getMonthDays('2024-01-15');
    expect(result).toHaveLength(31);
    expect(result[0].getUTCDate()).toBe(1);
    expect(result[30].getUTCDate()).toBe(31);
  });

  it('should return all days for February in non-leap year', () => {
    const result = getMonthDays('2024-02-15');
    expect(result).toHaveLength(29); // 2024 is a leap year
  });

  it('should return all days for February in leap year', () => {
    const result = getMonthDays('2023-02-15');
    expect(result).toHaveLength(28); // 2023 is not a leap year
  });

  it('should return all days for a 30-day month', () => {
    const result = getMonthDays('2024-04-15');
    expect(result).toHaveLength(30);
  });

  it('should handle Date object input', () => {
    const result = getMonthDays(new Date('2024-06-15'));
    expect(result).toHaveLength(30);
  });

  it('should return dates at UTC midnight', () => {
    const result = getMonthDays('2024-03-10');
    result.forEach(date => {
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
    });
  });

  it('should handle month boundary (Feb 28 -> Mar 1)', () => {
    const febResult = getMonthDays('2024-02-28');
    const marResult = getMonthDays('2024-03-01');

    expect(febResult.length).toBe(29);
    expect(marResult.length).toBe(31);
  });
});

describe('getDayOffset', () => {
  it('should return 0 for same day', () => {
    const date = new Date('2024-03-01T00:00:00Z');
    const monthStart = new Date('2024-03-01T00:00:00Z');
    expect(getDayOffset(date, monthStart)).toBe(0);
  });

  it('should return correct offset for day in middle of month', () => {
    const date = new Date('2024-03-15T00:00:00Z');
    const monthStart = new Date('2024-03-01T00:00:00Z');
    expect(getDayOffset(date, monthStart)).toBe(14);
  });

  it('should return correct offset for last day of month', () => {
    const date = new Date('2024-03-31T00:00:00Z');
    const monthStart = new Date('2024-03-01T00:00:00Z');
    expect(getDayOffset(date, monthStart)).toBe(30);
  });

  it('should handle negative offset for dates before month start', () => {
    const date = new Date('2024-02-28T00:00:00Z');
    const monthStart = new Date('2024-03-01T00:00:00Z');
    expect(getDayOffset(date, monthStart)).toBe(-2);
  });

  it('should handle DST transition dates correctly', () => {
    // March 10, 2024 is DST transition day in US
    const date = new Date('2024-03-10T00:00:00Z');
    const monthStart = new Date('2024-03-01T00:00:00Z');
    expect(getDayOffset(date, monthStart)).toBe(9);
  });
});

describe('isToday', () => {
  it('should return true for today', () => {
    const today = new Date();
    expect(isToday(today)).toBe(true);
  });

  it('should return false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  it('should return false for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow)).toBe(false);
  });

  it('should use UTC comparison for date equality', () => {
    const utcToday = new Date();
    // Create a date at different local time but same UTC day
    const testDate = new Date(utcToday.toISOString().split('T')[0]);
    expect(isToday(testDate)).toBe(true);
  });
});

describe('isWeekend', () => {
  it('should return true for Sunday (day 0)', () => {
    const sunday = new Date('2024-03-10T00:00:00Z'); // March 10, 2024 is a Sunday
    expect(isWeekend(sunday)).toBe(true);
  });

  it('should return true for Saturday (day 6)', () => {
    const saturday = new Date('2024-03-09T00:00:00Z'); // March 9, 2024 is a Saturday
    expect(isWeekend(saturday)).toBe(true);
  });

  it('should return false for weekday', () => {
    const monday = new Date('2024-03-11T00:00:00Z'); // March 11, 2024 is a Monday
    expect(isWeekend(monday)).toBe(false);
  });

  it('should return false for Friday', () => {
    const friday = new Date('2024-03-08T00:00:00Z'); // March 8, 2024 is a Friday
    expect(isWeekend(friday)).toBe(false);
  });

  it('should use UTC day for weekend detection', () => {
    const date = new Date('2024-03-10T00:00:00Z'); // Sunday in UTC
    expect(date.getUTCDay()).toBe(0);
    expect(isWeekend(date)).toBe(true);
  });
});

describe('getMultiMonthDays', () => {
  it('should return current month for empty task array', () => {
    const result = getMultiMonthDays([]);
    // Should return current month's days (28-31 depending on month)
    expect(result.length).toBeGreaterThanOrEqual(28);
    expect(result.length).toBeLessThanOrEqual(31);
  });

  it('should expand single month task to full month', () => {
    const tasks = [
      { startDate: '2024-03-15', endDate: '2024-03-20' }
    ];
    const result = getMultiMonthDays(tasks);
    expect(result.length).toBe(31); // March has 31 days
    expect(result[0].getUTCDate()).toBe(1);
    expect(result[0].getUTCMonth()).toBe(2); // March (0-indexed)
    expect(result[30].getUTCDate()).toBe(31);
  });

  it('should expand multi-month task to full months', () => {
    const tasks = [
      { startDate: '2024-03-25', endDate: '2024-05-05' }
    ];
    const result = getMultiMonthDays(tasks);
    // Should include full March (31) + April (30) + full May (31) = 92 days
    expect(result.length).toBe(92);
    expect(result[0].getUTCDate()).toBe(1); // March 1
    expect(result[0].getUTCMonth()).toBe(2); // March
    expect(result[91].getUTCDate()).toBe(31); // May 31
    expect(result[91].getUTCMonth()).toBe(4); // May
  });

  it('should handle multiple tasks across different months', () => {
    const tasks = [
      { startDate: '2024-02-10', endDate: '2024-02-15' },
      { startDate: '2024-04-20', endDate: '2024-04-25' }
    ];
    const result = getMultiMonthDays(tasks);
    // Should include Feb (29 in 2024) + March (31) + April (30) = 90 days
    expect(result.length).toBe(90);
    expect(result[0].getUTCMonth()).toBe(1); // February
    expect(result[result.length - 1].getUTCMonth()).toBe(3); // April
  });

  it('should handle tasks across year boundary', () => {
    const tasks = [
      { startDate: '2024-12-25', endDate: '2025-01-05' }
    ];
    const result = getMultiMonthDays(tasks);
    // Should include full Dec 2024 (31) + full Jan 2025 (31) = 62 days
    expect(result.length).toBe(62);
    expect(result[0].getUTCFullYear()).toBe(2024);
    expect(result[0].getUTCMonth()).toBe(11); // December
    expect(result[61].getUTCFullYear()).toBe(2025);
    expect(result[61].getUTCMonth()).toBe(0); // January
  });

  it('should use UTC-only date arithmetic', () => {
    const tasks = [
      { startDate: '2024-03-10', endDate: '2024-03-10' } // DST transition day
    ];
    const result = getMultiMonthDays(tasks);
    result.forEach(date => {
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
    });
  });
});

describe('getMonthSpans', () => {
  it('should return empty array for empty date range', () => {
    const result = getMonthSpans([]);
    expect(result).toEqual([]);
  });

  it('should calculate single month span', () => {
    const dateRange = [
      new Date('2024-03-01T00:00:00Z'),
      new Date('2024-03-15T00:00:00Z'),
      new Date('2024-03-31T00:00:00Z')
    ];
    const result = getMonthSpans(dateRange);
    expect(result).toHaveLength(1);
    expect(result[0].days).toBe(3);
    expect(result[0].startIndex).toBe(0);
    expect(result[0].month.getUTCMonth()).toBe(2); // March
    expect(result[0].month.getUTCDate()).toBe(1);
  });

  it('should calculate multiple month spans', () => {
    // March 31, April 1-2
    const dateRange = [
      new Date('2024-03-31T00:00:00Z'),
      new Date('2024-04-01T00:00:00Z'),
      new Date('2024-04-02T00:00:00Z')
    ];
    const result = getMonthSpans(dateRange);
    expect(result).toHaveLength(2);
    expect(result[0].days).toBe(1);
    expect(result[0].startIndex).toBe(0);
    expect(result[0].month.getUTCMonth()).toBe(2); // March
    expect(result[1].days).toBe(2);
    expect(result[1].startIndex).toBe(1);
    expect(result[1].month.getUTCMonth()).toBe(3); // April
  });

  it('should calculate three month spans', () => {
    const dateRange = [
      new Date('2024-02-28T00:00:00Z'),
      new Date('2024-02-29T00:00:00Z'),
      new Date('2024-03-01T00:00:00Z'),
      new Date('2024-03-02T00:00:00Z'),
      new Date('2024-04-01T00:00:00Z'),
      new Date('2024-04-02T00:00:00Z')
    ];
    const result = getMonthSpans(dateRange);
    expect(result).toHaveLength(3);
    expect(result[0].days).toBe(2);
    expect(result[0].month.getUTCMonth()).toBe(1); // February
    expect(result[1].days).toBe(2);
    expect(result[1].month.getUTCMonth()).toBe(2); // March
    expect(result[2].days).toBe(2);
    expect(result[2].month.getUTCMonth()).toBe(3); // April
  });

  it('should handle year boundary', () => {
    const dateRange = [
      new Date('2024-12-31T00:00:00Z'),
      new Date('2025-01-01T00:00:00Z'),
      new Date('2025-01-02T00:00:00Z')
    ];
    const result = getMonthSpans(dateRange);
    expect(result).toHaveLength(2);
    expect(result[0].days).toBe(1);
    expect(result[0].month.getUTCFullYear()).toBe(2024);
    expect(result[0].month.getUTCMonth()).toBe(11); // December
    expect(result[1].days).toBe(2);
    expect(result[1].month.getUTCFullYear()).toBe(2025);
    expect(result[1].month.getUTCMonth()).toBe(0); // January
  });
});
