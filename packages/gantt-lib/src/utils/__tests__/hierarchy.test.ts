import { describe, it, expect } from 'vitest';
import { Task } from '../../types';
import { getChildren, isTaskParent, computeParentDates, computeParentProgress } from '../dependencyUtils';

describe('hierarchy utilities', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      name: 'Parent Task',
      startDate: '2026-01-01',
      endDate: '2026-01-10',
    },
    {
      id: '2',
      name: 'Child 1',
      startDate: '2026-01-02',
      endDate: '2026-01-04',
      parentId: '1',
      progress: 50,
    },
    {
      id: '3',
      name: 'Child 2',
      startDate: '2026-01-05',
      endDate: '2026-01-08',
      parentId: '1',
      progress: 100,
    },
    {
      id: '4',
      name: 'Unrelated Task',
      startDate: '2026-01-01',
      endDate: '2026-01-03',
    },
    {
      id: '5',
      name: 'Empty Parent',
      startDate: '2026-01-01',
      endDate: '2026-01-05',
    },
  ];

  describe('getChildren', () => {
    it('should return all tasks with matching parentId', () => {
      const children = getChildren('1', mockTasks);
      expect(children).toHaveLength(2);
      expect(children.map(t => t.id)).toEqual(['2', '3']);
    });

    it('should return empty array when parent has no children', () => {
      const children = getChildren('4', mockTasks);
      expect(children).toHaveLength(0);
    });

    it('should return empty array for non-existent parent', () => {
      const children = getChildren('999', mockTasks);
      expect(children).toHaveLength(0);
    });
  });

  describe('isTaskParent', () => {
    it('should return true when task has children', () => {
      expect(isTaskParent('1', mockTasks)).toBe(true);
    });

    it('should return false when task has no children', () => {
      expect(isTaskParent('4', mockTasks)).toBe(false);
    });

    it('should return false for non-existent task', () => {
      expect(isTaskParent('999', mockTasks)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isTaskParent('1', [])).toBe(false);
    });
  });

  describe('computeParentDates', () => {
    it('should return min(startDate) and max(endDate) from children', () => {
      const dates = computeParentDates('1', mockTasks);
      expect(dates.startDate).toEqual(new Date('2026-01-02'));
      expect(dates.endDate).toEqual(new Date('2026-01-08'));
    });

    it('should return own dates when parent has no children', () => {
      const dates = computeParentDates('5', mockTasks);
      expect(dates.startDate).toEqual(new Date('2026-01-01'));
      expect(dates.endDate).toEqual(new Date('2026-01-05'));
    });

    it('should return own dates when parent not found', () => {
      const dates = computeParentDates('999', mockTasks);
      // Should return current date or default when parent not found
      expect(dates.startDate).toBeInstanceOf(Date);
      expect(dates.endDate).toBeInstanceOf(Date);
    });

    it('should handle single child correctly', () => {
      const singleChildTasks: Task[] = [
        {
          id: '1',
          name: 'Parent',
          startDate: '2026-01-01',
          endDate: '2026-01-10',
        },
        {
          id: '2',
          name: 'Only Child',
          startDate: '2026-01-05',
          endDate: '2026-01-07',
          parentId: '1',
        },
      ];
      const dates = computeParentDates('1', singleChildTasks);
      expect(dates.startDate).toEqual(new Date('2026-01-05'));
      expect(dates.endDate).toEqual(new Date('2026-01-07'));
    });
  });

  describe('computeParentProgress', () => {
    it('should return weighted average by duration', () => {
      // Child 1: 50% progress, 3 days (Jan 2-4 inclusive)
      // Child 2: 100% progress, 4 days (Jan 5-8 inclusive)
      // Weighted: (50*3 + 100*4) / 7 = 550/7 ≈ 78.6
      const progress = computeParentProgress('1', mockTasks);
      expect(progress).toBeCloseTo(78.6, 1);
    });

    it('should return 0 when parent has no children', () => {
      const progress = computeParentProgress('5', mockTasks);
      expect(progress).toBe(0);
    });

    it('should return 0 when parent not found', () => {
      const progress = computeParentProgress('999', mockTasks);
      expect(progress).toBe(0);
    });

    it('should handle single child progress', () => {
      const singleChildTasks: Task[] = [
        {
          id: '1',
          name: 'Parent',
          startDate: '2026-01-01',
          endDate: '2026-01-10',
        },
        {
          id: '2',
          name: 'Only Child',
          startDate: '2026-01-05',
          endDate: '2026-01-07',
          parentId: '1',
          progress: 75,
        },
      ];
      const progress = computeParentProgress('1', singleChildTasks);
      expect(progress).toBe(75);
    });

    it('should handle tasks with undefined progress', () => {
      const mixedProgressTasks: Task[] = [
        {
          id: '1',
          name: 'Parent',
          startDate: '2026-01-01',
          endDate: '2026-01-10',
        },
        {
          id: '2',
          name: 'Child with progress',
          startDate: '2026-01-02',
          endDate: '2026-01-04',
          parentId: '1',
          progress: 50,
        },
        {
          id: '3',
          name: 'Child without progress',
          startDate: '2026-01-05',
          endDate: '2026-01-08',
          parentId: '1',
          // progress undefined
        },
      ];
      // Child 1: 50% * 3 days = 150
      // Child 2: 0% * 4 days = 0
      // Total: 150 / 7 ≈ 21.4
      const progress = computeParentProgress('1', mixedProgressTasks);
      expect(progress).toBeCloseTo(21.4, 1);
    });

    it('should handle empty tasks array', () => {
      const progress = computeParentProgress('1', []);
      expect(progress).toBe(0);
    });
  });
});
