import { describe, test, expect } from 'vitest';
import { createDateKey } from '../utils/dateUtils';

describe('createDateKey', () => {
  test('generates key in YYYY-M-D format', () => {
    const date = new Date(Date.UTC(2026, 2, 15)); // March 15, 2026
    const key = createDateKey(date);
    expect(key).toBe('2026-2-15');
  });

  test('uses UTC methods', () => {
    // Создаем дату в локальном часовом поясе, которая отличается от UTC
    const date = new Date('2026-03-15T00:00:00-05:00'); // UTC: 2026-03-15T05:00:00Z
    const key = createDateKey(date);
    // Должен использовать UTC дату (15 марта), не локальную (14 марта или 15 марта в зависимости от TZ)
    const utcDate = new Date(Date.UTC(2026, 2, 15));
    expect(key).toBe(createDateKey(utcDate));
  });

  test('returns same key for same date', () => {
    const date1 = new Date(Date.UTC(2026, 2, 15));
    const date2 = new Date(Date.UTC(2026, 2, 15));
    expect(createDateKey(date1)).toBe(createDateKey(date2));
  });

  test('returns different keys for different dates', () => {
    const date1 = new Date(Date.UTC(2026, 2, 15));
    const date2 = new Date(Date.UTC(2026, 2, 16));
    expect(createDateKey(date1)).not.toBe(createDateKey(date2));
  });
});
