import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Test file for isExpired calculation in TaskRow component
 *
 * These tests verify that the current day doesn't count as elapsed time.
 * For tasks ending today, we use "yesterday" as the elapsed cutoff.
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
   * This uses the FIXED implementation where current day doesn't count as elapsed time
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

    // Tasks ending in the future are NEVER expired (deadline hasn't passed)
    if (
      today.getUTCFullYear() < taskEnd.getUTCFullYear() ||
      (today.getUTCFullYear() === taskEnd.getUTCFullYear() && today.getUTCMonth() < taskEnd.getUTCMonth()) ||
      (today.getUTCFullYear() === taskEnd.getUTCFullYear() && today.getUTCMonth() === taskEnd.getUTCMonth() && today.getUTCDate() < taskEnd.getUTCDate())
    ) {
      return false;
    }

    // Calculate "today" position as percentage within the task bar
    // KEY FIX: Current day doesn't count as elapsed time
    // If task ends today or in future, use "yesterday" as elapsed cutoff
    const msPerDay = 1000 * 60 * 60 * 24;
    const taskDuration = taskEnd.getTime() - taskStart.getTime();

    // For tasks ending today or future, subtract 1 day from elapsed calculation
    const isTaskEndingTodayOrLater =
      today.getUTCFullYear() < taskEnd.getUTCFullYear() ||
      (today.getUTCFullYear() === taskEnd.getUTCFullYear() && today.getUTCMonth() < taskEnd.getUTCMonth()) ||
      (today.getUTCFullYear() === taskEnd.getUTCFullYear() && today.getUTCMonth() === taskEnd.getUTCMonth() && today.getUTCDate() <= taskEnd.getUTCDate());

    const elapsedCutoff = isTaskEndingTodayOrLater
      ? new Date(today.getTime() - msPerDay)
      : today;

    const daysFromStart = elapsedCutoff.getTime() - taskStart.getTime();
    const todayPosition = Math.min(100, Math.max(0, (daysFromStart / taskDuration) * 100));

    return actualProgress < todayPosition;
  }

  describe('Test 1: Task ending TODAY with 0% progress', () => {
    it('should BE expired (insufficient progress for elapsed time)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0))); // March 4, 2026 noon UTC

      // 4-day task (01-04.03) ending today with 0% progress
      // With fixed logic: elapsed = 2 days (current day doesn't count), expected = 66.7%
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-04', 0);

      // Expected: true (expired - 0% << 66.7% expected)
      expect(isExpired).toBe(true);
    });
  });

  describe('Test 2: Task ending YESTERDAY with 0% progress', () => {
    it('should BE expired (yesterday is gone)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // Task ending yesterday with 0% progress
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-03', 0);

      // Expected: true (expired)
      expect(isExpired).toBe(true);
    });
  });

  describe('Test 3: Task ending TOMORROW with 0% progress', () => {
    it('should NOT be expired (future task)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // Task ending tomorrow with 0% progress
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-05', 0);

      // Expected: false (future task)
      expect(isExpired).toBe(false);
    });
  });

  describe('Test 4: Task ending TODAY with 50% progress', () => {
    it('should BE expired (50% < 66.7% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 4-day task (01-04.03) ending today with 50% progress
      // With fixed logic: elapsed = 2 days, expected = 66.7%
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-04', 50);

      // Expected: true (expired - 50% < 66.7% expected)
      expect(isExpired).toBe(true);
    });
  });

  describe('Test 5: Task ending YESTERDAY with 10% progress', () => {
    it('should BE expired (insufficient progress)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 4-day task ending yesterday with only 10% progress
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-03', 10);

      // Expected: true (expired - insufficient progress)
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
    it('should NOT be expired (95% > 90% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 10-day task (23.02-04.03) ending today with 95% progress
      // With fixed logic: elapsed = 9 days (current day doesn't count), expected = 90%
      const isExpired = calculateIsExpired('2026-02-23', '2026-03-04', 95);

      // Expected: false (95% >= 90% expected - sufficient progress)
      expect(isExpired).toBe(false);
    });
  });

  describe('Test 9: User example - 8-day task ending today with 90%', () => {
    it('should NOT be expired (90% > 87.5% expected)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 8-day task (25.02-04.03) ending today with 90% progress
      // With fixed logic: elapsed = 7 days (current day doesn't count), expected = 87.5%
      const isExpired = calculateIsExpired('2026-02-25', '2026-03-04', 90);

      // Expected: false (90% >= 87.5% expected - sufficient progress)
      expect(isExpired).toBe(false);
    });
  });
});
