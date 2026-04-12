import { describe, it, expect } from 'vitest';
import {
  getDependencyLag,
  normalizeDependencyLag,
  calculateSuccessorDate,
  computeLagFromDates,
  normalizePredecessorDates,
} from '../dependencies';
import type { Task, LinkType } from '../../types';

const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

function makeDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

describe('dependencies', () => {
  describe('getDependencyLag', () => {
    it('returns lag value or 0 for undefined', () => {
      expect(getDependencyLag({ lag: 5 })).toBe(5);
      expect(getDependencyLag({ lag: 0 })).toBe(0);
      expect(getDependencyLag({ lag: undefined as any })).toBe(0);
      expect(getDependencyLag({ lag: NaN })).toBe(0);
    });
  });

  describe('normalizeDependencyLag', () => {
    it('clamps FS lag to >= -predecessorDuration', () => {
      const predStart = makeDate(2025, 0, 6); // Mon
      const predEnd = makeDate(2025, 0, 10);  // Fri
      // Duration = 5 days, so lag >= -5
      const result = normalizeDependencyLag('FS', -10, predStart, predEnd);
      expect(result).toBe(-5);
    });

    it('does not clamp non-FS link types', () => {
      const predStart = makeDate(2025, 0, 6);
      const predEnd = makeDate(2025, 0, 10);
      const result = normalizeDependencyLag('SS', -10, predStart, predEnd);
      expect(result).toBe(-10);
    });
  });

  describe('calculateSuccessorDate', () => {
    it('computes correct date for FS with lag=0', () => {
      const predStart = makeDate(2025, 0, 6);  // Mon
      const predEnd = makeDate(2025, 0, 10);   // Fri
      const result = calculateSuccessorDate(predStart, predEnd, 'FS', 0);
      // FS lag=0: successor starts day after pred ends = Sat Jan 11
      expect(result.getUTCDate()).toBe(11);
    });

    it('computes correct date for SS with lag=0', () => {
      const predStart = makeDate(2025, 0, 6);
      const predEnd = makeDate(2025, 0, 10);
      const result = calculateSuccessorDate(predStart, predEnd, 'SS', 0);
      // SS lag=0: successor starts at pred start
      expect(result.getUTCDate()).toBe(6);
    });

    it('computes correct date for FF with lag=0', () => {
      const predStart = makeDate(2025, 0, 6);
      const predEnd = makeDate(2025, 0, 10);
      const result = calculateSuccessorDate(predStart, predEnd, 'FF', 0);
      // FF lag=0: successor ends at pred end
      expect(result.getUTCDate()).toBe(10);
    });

    it('computes correct date for SF with lag=0', () => {
      const predStart = makeDate(2025, 0, 6);
      const predEnd = makeDate(2025, 0, 10);
      const result = calculateSuccessorDate(predStart, predEnd, 'SF', 0);
      // SF lag=0: successor ends day before pred start = Sun Jan 5
      expect(result.getUTCDate()).toBe(5);
    });

    it('computes FS with lag=2', () => {
      const predStart = makeDate(2025, 0, 6);
      const predEnd = makeDate(2025, 0, 10);
      const result = calculateSuccessorDate(predStart, predEnd, 'FS', 2);
      // FS lag=2: successor starts predEnd + 3 days = Mon Jan 13
      expect(result.getUTCDate()).toBe(13);
    });

    it('computes milestone FS with lag=0 on the same day', () => {
      const { predStart, predEnd } = normalizePredecessorDates(
        {
          startDate: '2025-01-10',
          endDate: '2025-01-10',
          type: 'milestone',
        },
        (value) => new Date(`${String(value).split('T')[0]}T00:00:00.000Z`)
      );

      const result = calculateSuccessorDate(predStart, predEnd, 'FS', 0);

      expect(result.toISOString()).toBe('2025-01-10T00:00:00.000Z');
    });
  });

  describe('computeLagFromDates', () => {
    it('computes FS lag from adjacent dates (should be 0)', () => {
      const predStart = makeDate(2025, 0, 6);
      const predEnd = makeDate(2025, 0, 10);
      const succStart = makeDate(2025, 0, 11); // day after predEnd
      const succEnd = makeDate(2025, 0, 15);
      const result = computeLagFromDates('FS', predStart, predEnd, succStart, succEnd);
      expect(result).toBe(0);
    });

    it('computes positive FS lag for gap', () => {
      const predStart = makeDate(2025, 0, 6);
      const predEnd = makeDate(2025, 0, 10);
      const succStart = makeDate(2025, 0, 14); // 3 days gap after predEnd
      const succEnd = makeDate(2025, 0, 16);
      const result = computeLagFromDates('FS', predStart, predEnd, succStart, succEnd);
      // FS: lag = (succStart - predEnd) / DAY_MS - 1 = (14-10)/1 - 1 = 3
      expect(result).toBe(3);
    });

    it('computes milestone FS lag=0 when successor starts the same day', () => {
      const { predStart, predEnd } = normalizePredecessorDates(
        {
          startDate: '2025-01-10',
          endDate: '2025-01-10',
          type: 'milestone',
        },
        (value) => new Date(`${String(value).split('T')[0]}T00:00:00.000Z`)
      );
      const succStart = makeDate(2025, 0, 10);
      const succEnd = makeDate(2025, 0, 12);

      const result = computeLagFromDates('FS', predStart, predEnd, succStart, succEnd);

      expect(result).toBe(0);
    });
  });
});
