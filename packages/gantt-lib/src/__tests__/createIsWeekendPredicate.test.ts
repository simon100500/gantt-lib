import { describe, it, expect } from 'vitest';
import { createIsWeekendPredicate, createDateKey } from '../utils/dateUtils';

describe('createIsWeekendPredicate', () => {
  it('returns Saturday/Sunday predicate when no props provided', () => {
    const predicate = createIsWeekendPredicate({});
    const saturday = new Date(Date.UTC(2026, 2, 14)); // Saturday
    const sunday = new Date(Date.UTC(2026, 2, 15)); // Sunday
    const monday = new Date(Date.UTC(2026, 2, 16)); // Monday
    expect(predicate(saturday)).toBe(true);
    expect(predicate(sunday)).toBe(true);
    expect(predicate(monday)).toBe(false);
  });

  it('adds custom weekends to default Saturday/Sunday', () => {
    const march9 = new Date(Date.UTC(2026, 2, 9)); // Monday (holiday)
    const predicate = createIsWeekendPredicate({
      weekends: [march9]
    });
    expect(predicate(march9)).toBe(true); // Monday is now weekend
    const regularMonday = new Date(Date.UTC(2026, 2, 16));
    expect(predicate(regularMonday)).toBe(false); // Regular Monday still workday
    const saturday = new Date(Date.UTC(2026, 2, 14));
    expect(predicate(saturday)).toBe(true); // Default Saturday still weekend
  });

  it('excludes dates from default weekends when workdays provided', () => {
    const march14 = new Date(Date.UTC(2026, 2, 14)); // Saturday
    const predicate = createIsWeekendPredicate({
      workdays: [march14]
    });
    expect(predicate(march14)).toBe(false); // Saturday is now workday
    const regularSaturday = new Date(Date.UTC(2026, 2, 21));
    expect(predicate(regularSaturday)).toBe(true); // Regular Saturday still weekend
  });

  it('workdays takes precedence over weekends when date in both arrays', () => {
    const march14 = new Date(Date.UTC(2026, 2, 14)); // Saturday
    const predicate = createIsWeekendPredicate({
      weekends: [march14],
      workdays: [march14] // Same date in both arrays
    });
    expect(predicate(march14)).toBe(false); // workdays wins
  });

  it('uses custom predicate when isWeekend provided (highest priority)', () => {
    const customPredicate = (date: Date) => date.getUTCDay() === 0; // Sunday only
    const predicate = createIsWeekendPredicate({
      isWeekend: customPredicate,
      weekends: [new Date(Date.UTC(2026, 2, 14))], // Ignored
      workdays: [new Date(Date.UTC(2026, 2, 9))]   // Ignored
    });
    const saturday = new Date(Date.UTC(2026, 2, 14));
    const sunday = new Date(Date.UTC(2026, 2, 15));
    expect(predicate(saturday)).toBe(false); // Not Sunday
    expect(predicate(sunday)).toBe(true);    // Sunday
  });

  it('empty arrays fallback to default behavior', () => {
    const predicate = createIsWeekendPredicate({
      weekends: [],
      workdays: []
    });
    const saturday = new Date(Date.UTC(2026, 2, 14));
    const sunday = new Date(Date.UTC(2026, 2, 15));
    const monday = new Date(Date.UTC(2026, 2, 16));
    expect(predicate(saturday)).toBe(true);
    expect(predicate(sunday)).toBe(true);
    expect(predicate(monday)).toBe(false);
  });

  it('works correctly across month boundaries', () => {
    const feb28 = new Date(Date.UTC(2026, 1, 28)); // Saturday
    const mar1 = new Date(Date.UTC(2026, 2, 1));  // Sunday
    const mar9 = new Date(Date.UTC(2026, 2, 9));  // Monday (holiday)
    const predicate = createIsWeekendPredicate({
      weekends: [mar9]
    });
    expect(predicate(feb28)).toBe(true); // Default Saturday
    expect(predicate(mar1)).toBe(true);  // Default Sunday
    expect(predicate(mar9)).toBe(true);  // Custom holiday Monday
  });
});
