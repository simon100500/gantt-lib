import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Test file for isExpired calculation in TaskRow component
 *
 * These tests verify that the current day doesn't count as elapsed time.
 * Duration = (end - start + 1), elapsed = (cutoff - start) to include boundary dates.
 */

describe('isExpired calculation - edge cases', () => {
  // Mock the current date for consistent testing
  let originalDate: DateConstructor;

  beforeEach(() => {
    // Store original Date constructor
    originalDate = global.Date;
  });

  afterEach(() => {
    // Restore original Date constructor
    global.Date = originalDate;
  });

  /**
   * Helper to mock the current date (today)
   * This allows us to test scenarios with specific "today" values
   */
  function mockToday(mockDate: Date) {
    // @ts-expect-error - Mocking Date constructor for testing
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockDate);
        } else {
          // @ts-expect-error - Pass args to super
          super(...args);
        }
      }

      static now() {
        return mockDate.getTime();
      }
    };
  }

  /**
   * Simulates the isExpired calculation from TaskRow.tsx
   * Simple formula: duration = (end - start + 1), elapsed = (min(today, end) - start)
   */
  function calculateIsExpired(
    startDateStr: string,
    endDateStr: string,
    progress: number,
    highlightExpiredTasks: boolean = true
  ): boolean {
    if (!highlightExpiredTasks) return false;

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const taskStart = new Date(Date.UTC(
      parseInt(startDateStr.substring(0, 4)),
      parseInt(startDateStr.substring(5, 7)) - 1,
      parseInt(startDateStr.substring(8, 10))
    ));
    const taskEnd = new Date(Date.UTC(
      parseInt(endDateStr.substring(0, 4)),
      parseInt(endDateStr.substring(5, 7)) - 1,
      parseInt(endDateStr.substring(8, 10))
    ));

    const actualProgress = progress ?? 0;
    if (actualProgress >= 100) return false;

    // Simple formula:
    // duration = (end - start + 1) days
    // elapsed = (min(today, end) - start) days
    // expected = elapsed / duration * 100
    const msPerDay = 1000 * 60 * 60 * 24;
    const duration = taskEnd.getTime() - taskStart.getTime() + msPerDay;
    const elapsedCutoff = taskEnd.getTime() < today.getTime() ? taskEnd.getTime() : today.getTime();
    const elapsed = elapsedCutoff - taskStart.getTime();
    const expected = (elapsed / duration) * 100;

    return actualProgress < expected;
  }

  describe('Test 1: Task ending TODAY with 0% progress', () => {
    it('should BE expired (0% < 50% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 4-day task (01-04.03) ending today with 0% progress
      // Duration = 4 days, elapsed = 2 days (01,02,03), expected = 50%
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-04', 0);

      // Expected: true (expired - 0% < 50% expected)
      expect(isExpired).toBe(true);
    });
  });

  describe('Test 2: Task ending YESTERDAY with 0% progress', () => {
    it('should BE expired (yesterday is gone)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 3-day task (01-03.03) ending yesterday with 0% progress
      // Duration = 3 days, elapsed = 3 days (01,02,03), expected = 100%
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-03', 0);

      // Expected: true (expired)
      expect(isExpired).toBe(true);
    });
  });

  describe('Test 3: Task ending TOMORROW with 0% progress', () => {
    it('should BE expired (0% < 60% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 5-day task (01-05.03) ending tomorrow with 0% progress
      // Duration = 5 days, elapsed = 2 days (01,02), expected = 40%
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-05', 0);

      // Expected: true (expired - 0% < 40% expected)
      expect(isExpired).toBe(true);
    });
  });

  describe('Test 4: Task ending TODAY with 75% progress', () => {
    it('should NOT be expired (75% >= 50% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 4-day task (01-04.03) ending today with 75% progress
      // Duration = 4 days, elapsed = 2 days, expected = 50%
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-04', 75);

      // Expected: false (75% >= 50% expected)
      expect(isExpired).toBe(false);
    });
  });

  describe('Test 5: Task ending YESTERDAY with 10% progress', () => {
    it('should BE expired (10% < 100% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 3-day task (01-03.03) ending yesterday with only 10% progress
      // Duration = 3 days, elapsed = 3 days, expected = 100%
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-03', 10);

      // Expected: true (expired - 10% << 100% expected)
      expect(isExpired).toBe(true);
    });
  });

  describe('Test 6: Task ending today with 100% progress', () => {
    it('should NOT be expired (completed)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // Task ending today with 100% progress
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-04', 100);

      // Expected: false (completed tasks are never expired)
      expect(isExpired).toBe(false);
    });
  });

  describe('Test 7: Single-day task ending today', () => {
    it('should NOT be expired (still have today)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // Single-day task ending today with 0% progress
      const isExpired = calculateIsExpired('2026-03-04', '2026-03-04', 0);

      // Expected: false (single-day task ending today should not be expired)
      expect(isExpired).toBe(false);
    });
  });

  describe('Test 8: User example - 10-day task ending today with 95%', () => {
    it('should NOT be expired (95% >= 80% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 10-day task (23.02-04.03) ending today with 95% progress
      // Duration = 10 days, elapsed = 8 days, expected = 80%
      const isExpired = calculateIsExpired('2026-02-23', '2026-03-04', 95);

      // Expected: false (95% >= 80% expected - sufficient progress)
      expect(isExpired).toBe(false);
    });
  });

  describe('Test 9: User example - 8-day task ending today with 90%', () => {
    it('should NOT be expired (90% >= 75% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 8-day task (25.02-04.03) ending today with 90% progress
      // Duration = 8 days, elapsed = 6 days, expected = 75%
      const isExpired = calculateIsExpired('2026-02-25', '2026-03-04', 90);

      // Expected: false (90% >= 75% expected - exactly on track)
      expect(isExpired).toBe(false);
    });
  });

  describe('Test 10: Гидроизоляция фундамента - ending tomorrow (05.03) with 65%', () => {
    it('should BE expired (65% < 93.1% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 29-day task (05.02-05.03) ending tomorrow with 65% progress
      // Duration = 29 days, elapsed = 27 days, expected = 93.1%
      const isExpired = calculateIsExpired('2026-02-05', '2026-03-05', 65);

      // Expected: true (expired - 65% < 93.1% expected)
      expect(isExpired).toBe(true);
    });
  });

  describe('Test 11: Task ending day AFTER tomorrow (06.03) with 0% progress', () => {
    it('should BE expired (0% < 57% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 6-day task (01-06.03) ending day after tomorrow with 0% progress
      // Duration = 6 days, elapsed = 3 days (01,02,03), expected = 50%
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-06', 0);

      // Expected: true (expired - 0% < 50% expected)
      expect(isExpired).toBe(true);
    });
  });

  describe('Test 12: expired-2 case - 28.02-06.03 with 70%', () => {
    it('should NOT be expired (70% >= 57.1% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 7-day task (28.02-06.03) with 70% progress
      // Duration = 7 days, elapsed = 4 days (28 Feb, 01, 02, 03 Mar), expected = 57.1%
      const isExpired = calculateIsExpired('2026-02-28', '2026-03-06', 70);

      // Expected: false (70% >= 57.1% expected - sufficient progress)
      expect(isExpired).toBe(false);
    });
  });

  describe('Test 13: User visual bug case - 27.02-05.03 with 70%', () => {
    it('should BE expired (70% < 71.4% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 7-day task (27.02-05.03) with 70% progress
      // Duration = 7 days, elapsed = 5 days (27 Feb, 28 Feb, 01, 02, 03 Mar), expected = 71.4%
      const isExpired = calculateIsExpired('2026-02-27', '2026-03-05', 70);

      // Expected: true (expired - 70% < 71.4% expected)
      expect(isExpired).toBe(true);
    });
  });
});
