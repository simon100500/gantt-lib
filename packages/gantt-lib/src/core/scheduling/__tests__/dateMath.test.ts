import { describe, it, expect } from 'vitest';
import {
  normalizeUTCDate,
  parseDateOnly,
  getBusinessDaysCount,
  addBusinessDays,
  subtractBusinessDays,
  getBusinessDayOffset,
  shiftBusinessDayOffset,
  DAY_MS,
} from '../dateMath';

const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

describe('dateMath', () => {
  describe('normalizeUTCDate', () => {
    it('creates correct UTC midnight date from input', () => {
      const input = new Date(Date.UTC(2025, 0, 15, 14, 30, 0));
      const result = normalizeUTCDate(input);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
    });
  });

  describe('parseDateOnly', () => {
    it('parses ISO string "2025-01-15" to UTC Date', () => {
      const result = parseDateOnly('2025-01-15');
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(0);
    });

    it('parses Date object to UTC midnight', () => {
      const input = new Date(Date.UTC(2025, 5, 10, 12, 0, 0));
      const result = parseDateOnly(input);
      expect(result.getUTCDate()).toBe(10);
      expect(result.getUTCHours()).toBe(0);
    });
  });

  describe('getBusinessDaysCount', () => {
    it('counts weekdays between Mon-Fri = 5', () => {
      // Monday Jan 6 to Friday Jan 10, 2025
      const count = getBusinessDaysCount(
        new Date(Date.UTC(2025, 0, 6)),
        new Date(Date.UTC(2025, 0, 10)),
        isWeekend
      );
      expect(count).toBe(5);
    });

    it('skips weekends with default predicate', () => {
      // Friday Jan 10 to Monday Jan 13, 2025 (Fri, Sat, Sun, Mon)
      const count = getBusinessDaysCount(
        new Date(Date.UTC(2025, 0, 10)),
        new Date(Date.UTC(2025, 0, 13)),
        isWeekend
      );
      expect(count).toBe(2); // Fri(1), Sat(skip), Sun(skip), Mon(1)
    });

    it('respects custom weekendPredicate', () => {
      // Custom: also treat Wednesday as weekend
      const customPredicate = (d: Date) => isWeekend(d) || d.getUTCDay() === 3;
      // Mon Jan 6 to Fri Jan 10, 2025 — Wed is also a "weekend"
      const count = getBusinessDaysCount(
        new Date(Date.UTC(2025, 0, 6)),
        new Date(Date.UTC(2025, 0, 10)),
        customPredicate
      );
      expect(count).toBe(4); // Mon, Tue, Wed(skip), Thu, Fri
    });
  });

  describe('addBusinessDays', () => {
    it('adds N business days skipping weekends', () => {
      // Monday Jan 6, 2025 + 5 business days = Friday Jan 10
      // Mon(1), Tue(2), Wed(3), Thu(4), Fri(5)
      const result = addBusinessDays(
        new Date(Date.UTC(2025, 0, 6)),
        5,
        isWeekend
      );
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCDate()).toBe(10); // Fri Jan 10
    });
  });

  describe('subtractBusinessDays', () => {
    it('subtracts N business days skipping weekends', () => {
      // Friday Jan 10, 2025 - 5 business days = Monday Jan 6
      // Fri(1), Thu(2), Wed(3), Tue(4), Mon(5)
      const result = subtractBusinessDays(
        new Date(Date.UTC(2025, 0, 10)),
        5,
        isWeekend
      );
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCDate()).toBe(6); // Mon Jan 6
    });
  });

  describe('getBusinessDayOffset', () => {
    it('computes offset between two dates', () => {
      // Mon Jan 6 to Wed Jan 8 = 2 business days
      const offset = getBusinessDayOffset(
        new Date(Date.UTC(2025, 0, 6)),
        new Date(Date.UTC(2025, 0, 8)),
        isWeekend
      );
      expect(offset).toBe(2);
    });

    it('returns 0 for same date', () => {
      const offset = getBusinessDayOffset(
        new Date(Date.UTC(2025, 0, 6)),
        new Date(Date.UTC(2025, 0, 6)),
        isWeekend
      );
      expect(offset).toBe(0);
    });
  });

  describe('shiftBusinessDayOffset', () => {
    it('shifts a date by business-day offset', () => {
      // Mon Jan 6 + offset 3 = Thu Jan 9
      const result = shiftBusinessDayOffset(
        new Date(Date.UTC(2025, 0, 6)),
        3,
        isWeekend
      );
      expect(result.getUTCDate()).toBe(9);
    });

    it('shifts a date by negative offset', () => {
      // Fri Jan 10 - offset 3 = Tue Jan 7
      const result = shiftBusinessDayOffset(
        new Date(Date.UTC(2025, 0, 10)),
        -3,
        isWeekend
      );
      expect(result.getUTCDate()).toBe(7);
    });
  });

  describe('DAY_MS', () => {
    it('equals 86400000', () => {
      expect(DAY_MS).toBe(86400000);
    });
  });
});
