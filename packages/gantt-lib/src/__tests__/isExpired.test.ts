import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Test file for isExpired calculation in TaskRow component
 *
 * These tests verify that tasks ending today are NOT marked as expired
 * because the current day is still available for work.
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
   * This is the CURRENT implementation (before fix)
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
    if (today.getTime() < taskStart.getTime()) return false;

    const msPerDay = 1000 * 60 * 60 * 24;
    const taskDuration = taskEnd.getTime() - taskStart.getTime();
    const daysFromStart = today.getTime() - taskStart.getTime();
    const todayPosition = Math.min(100, Math.max(0, (daysFromStart / taskDuration) * 100));

    return actualProgress < todayPosition;
  }

  describe('Test 1: Task ending TODAY with 0% progress', () => {
    it('should NOT be expired (today is still available for work)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0))); // March 4, 2026 noon UTC

      // Task ending today with 0% progress
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-04', 0);

      // This WILL FAIL with current implementation (bug)
      // Expected: false (NOT expired)
      // Actual: true (incorrectly marked as expired)
      expect(isExpired).toBe(false);
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
    it('should NOT be expired (sufficient progress)', () => {
      // Mock today as 2026-03-04
      mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

      // 4-day task ending today with 50% progress
      const isExpired = calculateIsExpired('2026-03-01', '2026-03-04', 50);

      // Expected: false (50% progress for 4-day task that started 3 days ago)
      expect(isExpired).toBe(false);
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
});
