import { describe, it, expect } from 'vitest';
import { parseUTCDate, getMonthDays, getDayOffset, isToday } from '../utils/dateUtils';

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
