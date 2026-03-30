import { describe, it, expect } from 'vitest';
import {
  getTaskDuration,
  buildTaskRangeFromStart,
  buildTaskRangeFromEnd,
  moveTaskRange,
  clampTaskRangeForIncomingFS,
  recalculateIncomingLags,
  alignToWorkingDay,
} from '../commands';
import type { Task } from '../../types';

const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

function makeDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

describe('commands', () => {
  describe('getTaskDuration', () => {
    it('returns correct duration in calendar days', () => {
      expect(getTaskDuration('2025-01-06', '2025-01-10')).toBe(5);
    });

    it('returns correct duration in business days', () => {
      // Mon Jan 6 to Fri Jan 10 = 5 business days
      expect(getTaskDuration('2025-01-06', '2025-01-10', true, isWeekend)).toBe(5);
    });

    it('returns minimum 1 day', () => {
      expect(getTaskDuration('2025-01-06', '2025-01-06')).toBe(1);
    });
  });

  describe('buildTaskRangeFromStart', () => {
    it('creates range from start date + duration', () => {
      const result = buildTaskRangeFromStart(makeDate(2025, 0, 6), 5);
      expect(result.start.getUTCDate()).toBe(6);
      expect(result.end.getUTCDate()).toBe(10);
    });
  });

  describe('buildTaskRangeFromEnd', () => {
    it('creates range from end date + duration', () => {
      const result = buildTaskRangeFromEnd(makeDate(2025, 0, 10), 5);
      expect(result.start.getUTCDate()).toBe(6);
      expect(result.end.getUTCDate()).toBe(10);
    });
  });

  describe('moveTaskRange', () => {
    it('preserves duration when moving to new start date', () => {
      const result = moveTaskRange('2025-01-06', '2025-01-10', makeDate(2025, 0, 13));
      expect(result.start.getUTCDate()).toBe(13);
      expect(result.end.getUTCDate()).toBe(17);
    });
  });

  describe('alignToWorkingDay', () => {
    it('snaps Saturday to Monday (forward)', () => {
      // Sat Jan 11 -> Mon Jan 13
      const result = alignToWorkingDay(makeDate(2025, 0, 11), 1, isWeekend);
      expect(result.getUTCDay()).toBe(1); // Monday
      expect(result.getUTCDate()).toBe(13);
    });

    it('snaps Sunday to Friday (backward)', () => {
      // Sun Jan 12 -> Fri Jan 10
      const result = alignToWorkingDay(makeDate(2025, 0, 12), -1, isWeekend);
      expect(result.getUTCDay()).toBe(5); // Friday
      expect(result.getUTCDate()).toBe(10);
    });
  });

  describe('clampTaskRangeForIncomingFS', () => {
    it('does not clamp when proposed start is after predecessor allows', () => {
      const predecessor: Task = {
        id: 'pred',
        name: 'Pred',
        startDate: '2025-01-06',
        endDate: '2025-01-10',
      };
      const task: Task = {
        id: 'succ',
        name: 'Succ',
        startDate: '2025-01-11',
        endDate: '2025-01-15',
        dependencies: [{ taskId: 'pred', type: 'FS', lag: 0 }],
      };
      // clamp uses lag=-predecessorDuration=-5, so minStart=Jan 6
      // proposedStart Jan 8 >= Jan 6, so no clamp
      const proposedStart = makeDate(2025, 0, 8);
      const proposedEnd = makeDate(2025, 0, 12);
      const result = clampTaskRangeForIncomingFS(task, proposedStart, proposedEnd, [predecessor, task]);
      expect(result.start.getUTCDate()).toBe(8);
    });

    it('clamps when proposed start is before minimum allowed', () => {
      const predecessor: Task = {
        id: 'pred',
        name: 'Pred',
        startDate: '2025-01-06',
        endDate: '2025-01-10',
      };
      const task: Task = {
        id: 'succ',
        name: 'Succ',
        startDate: '2025-01-11',
        endDate: '2025-01-15',
        dependencies: [{ taskId: 'pred', type: 'FS', lag: 0 }],
      };
      // clamp uses lag=-5, minStart = Jan 6
      // proposedStart Jan 3 < Jan 6, so clamped to Jan 6
      const proposedStart = makeDate(2025, 0, 3);
      const proposedEnd = makeDate(2025, 0, 7);
      const result = clampTaskRangeForIncomingFS(task, proposedStart, proposedEnd, [predecessor, task]);
      expect(result.start.getUTCDate()).toBe(6);
    });

    it('returns unchanged when no FS dependencies', () => {
      const task: Task = {
        id: 'succ',
        name: 'Succ',
        startDate: '2025-01-11',
        endDate: '2025-01-15',
      };
      const result = clampTaskRangeForIncomingFS(
        task,
        makeDate(2025, 0, 3),
        makeDate(2025, 0, 7),
        [task]
      );
      expect(result.start.getUTCDate()).toBe(3);
    });
  });

  describe('recalculateIncomingLags', () => {
    it('recomputes lag values after date change', () => {
      const predecessor: Task = {
        id: 'pred',
        name: 'Pred',
        startDate: '2025-01-06',
        endDate: '2025-01-10',
      };
      const task: Task = {
        id: 'succ',
        name: 'Succ',
        startDate: '2025-01-11',
        endDate: '2025-01-15',
        dependencies: [{ taskId: 'pred', type: 'FS', lag: 0 }],
      };
      const newDeps = recalculateIncomingLags(
        task,
        makeDate(2025, 0, 14),
        makeDate(2025, 0, 18),
        [predecessor, task]
      );
      expect(newDeps).toHaveLength(1);
      // FS lag = (succStart - predEnd) / DAY_MS - 1 = (14-10) - 1 = 3
      expect(newDeps[0].lag).toBe(3);
    });
  });
});
