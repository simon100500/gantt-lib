import { describe, it, expect } from 'vitest';
import {
  getChildren,
  isTaskParent,
  computeParentDates,
  computeParentProgress,
} from '../utils/dependencyUtils';
import { Task } from '../types';

describe('hierarchy utilities', () => {
  const createTask = (id: string, start: string, end: string, parentId?: string, progress?: number): Task => ({
    id,
    name: `Task ${id}`,
    startDate: start,
    endDate: end,
    parentId,
    progress,
  });

  const mockTasks: Task[] = [
    { id: '1', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-10', progress: 0 },
    { id: '2', name: 'Child 1', startDate: '2026-01-02', endDate: '2026-01-04', parentId: '1', progress: 50 },
    { id: '3', name: 'Child 2', startDate: '2026-01-05', endDate: '2026-01-08', parentId: '1', progress: 100 },
    { id: '4', name: 'Unrelated', startDate: '2026-01-01', endDate: '2026-01-03', progress: 25 },
  ];

  describe('getChildren', () => {
    it('should return all tasks with matching parentId', () => {
      const result = getChildren('1', mockTasks);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['2', '3']);
    });

    it('should return empty array when no children exist', () => {
      const result = getChildren('4', mockTasks);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty tasks array', () => {
      const result = getChildren('1', []);
      expect(result).toEqual([]);
    });
  });

  describe('isTaskParent', () => {
    it('should return true when task has children', () => {
      const result = isTaskParent('1', mockTasks);
      expect(result).toBe(true);
    });

    it('should return false when task has no children', () => {
      const result = isTaskParent('4', mockTasks);
      expect(result).toBe(false);
    });

    it('should return false for empty tasks array', () => {
      const result = isTaskParent('1', []);
      expect(result).toBe(false);
    });
  });

  describe('computeParentDates', () => {
    it('should return min startDate and max endDate from children', () => {
      const result = computeParentDates('1', mockTasks);
      expect(result.startDate).toEqual(new Date('2026-01-02'));
      expect(result.endDate).toEqual(new Date('2026-01-08'));
    });

    it('should return own dates when no children exist', () => {
      const result = computeParentDates('4', mockTasks);
      expect(result.startDate).toEqual(new Date('2026-01-01'));
      expect(result.endDate).toEqual(new Date('2026-01-03'));
    });

    it('should handle single child', () => {
      const singleChildTasks: Task[] = [
        { id: '1', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-10' },
        { id: '2', name: 'Child', startDate: '2026-01-05', endDate: '2026-01-07', parentId: '1' },
      ];
      const result = computeParentDates('1', singleChildTasks);
      expect(result.startDate).toEqual(new Date('2026-01-05'));
      expect(result.endDate).toEqual(new Date('2026-01-07'));
    });

    it('should handle multiple children with different date ranges', () => {
      const multiChildTasks: Task[] = [
        { id: '1', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-20' },
        { id: '2', name: 'Child 1', startDate: '2026-01-02', endDate: '2026-01-05', parentId: '1' },
        { id: '3', name: 'Child 2', startDate: '2026-01-01', endDate: '2026-01-03', parentId: '1' },
        { id: '4', name: 'Child 3', startDate: '2026-01-10', endDate: '2026-01-15', parentId: '1' },
      ];
      const result = computeParentDates('1', multiChildTasks);
      expect(result.startDate).toEqual(new Date('2026-01-01')); // min from Child 2
      expect(result.endDate).toEqual(new Date('2026-01-15')); // max from Child 3
    });
  });

  describe('computeParentProgress', () => {
    it('should return weighted average by duration', () => {
      // Child 1: 50% progress, 3 days duration (01-02 to 01-04 inclusive = 3 days)
      // Child 2: 100% progress, 4 days duration (01-05 to 01-08 inclusive = 4 days)
      // Weighted: (50*3 + 100*4) / (3+4) = (150 + 400) / 7 = 550/7 ≈ 78.6
      const result = computeParentProgress('1', mockTasks);
      expect(result).toBeCloseTo(78.6, 1);
    });

    it('should return 0 when no children exist', () => {
      const result = computeParentProgress('4', mockTasks);
      expect(result).toBe(0);
    });

    it('should handle single child progress', () => {
      const singleChildTasks: Task[] = [
        { id: '1', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-10' },
        { id: '2', name: 'Child', startDate: '2026-01-05', endDate: '2026-01-07', parentId: '1', progress: 75 },
      ];
      const result = computeParentProgress('1', singleChildTasks);
      expect(result).toBe(75);
    });

    it('should handle mixed progress values including zero', () => {
      const mixedTasks: Task[] = [
        { id: '1', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-20' },
        { id: '2', name: 'Child 1', startDate: '2026-01-01', endDate: '2026-01-05', parentId: '1', progress: 0 },
        { id: '3', name: 'Child 2', startDate: '2026-01-06', endDate: '2026-01-10', parentId: '1', progress: 50 },
        { id: '4', name: 'Child 3', startDate: '2026-01-11', endDate: '2026-01-15', parentId: '1', progress: 100 },
      ];
      // Child 1: 0% * 5 days = 0
      // Child 2: 50% * 5 days = 250
      // Child 3: 100% * 5 days = 500
      // Total: (0 + 250 + 500) / 15 = 750/15 = 50
      const result = computeParentProgress('1', mixedTasks);
      expect(result).toBe(50);
    });
  });
});
