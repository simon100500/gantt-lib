import { describe, it, expect } from 'vitest';
import {
  getChildren,
  isTaskParent,
  computeParentDates,
  computeParentProgress,
  getAllDescendants,
} from '../hierarchy';
import type { Task } from '../../types';

function makeTask(id: string, parentId?: string, start?: string, end?: string, progress?: number): Task {
  return {
    id,
    name: id,
    startDate: start ?? '2025-01-06',
    endDate: end ?? '2025-01-10',
    ...(parentId && { parentId }),
    ...(progress !== undefined && { progress }),
  };
}

describe('hierarchy', () => {
  const tasks: Task[] = [
    makeTask('parent'),
    makeTask('child1', 'parent', '2025-01-06', '2025-01-10'),
    makeTask('child2', 'parent', '2025-01-08', '2025-01-15'),
    makeTask('grandchild', 'child1', '2025-01-07', '2025-01-09'),
    makeTask('orphan'),
  ];

  describe('getChildren', () => {
    it('returns direct children of a parent', () => {
      const children = getChildren('parent', tasks);
      expect(children.map(c => c.id)).toEqual(['child1', 'child2']);
    });

    it('returns empty array for leaf task', () => {
      expect(getChildren('orphan', tasks)).toHaveLength(0);
    });
  });

  describe('isTaskParent', () => {
    it('returns true for tasks with children', () => {
      expect(isTaskParent('parent', tasks)).toBe(true);
      expect(isTaskParent('child1', tasks)).toBe(true);
    });

    it('returns false for leaf tasks', () => {
      expect(isTaskParent('orphan', tasks)).toBe(false);
    });
  });

  describe('computeParentDates', () => {
    it('aggregates children date ranges', () => {
      const { startDate, endDate } = computeParentDates('parent', tasks);
      expect(startDate.toISOString().split('T')[0]).toBe('2025-01-06');
      expect(endDate.toISOString().split('T')[0]).toBe('2025-01-15');
    });
  });

  describe('computeParentProgress', () => {
    it('averages children progress', () => {
      const tasksWithProgress: Task[] = [
        makeTask('p'),
        { ...makeTask('c1', 'p', '2025-01-06', '2025-01-10'), progress: 50 },
        { ...makeTask('c2', 'p', '2025-01-06', '2025-01-10'), progress: 100 },
      ];
      const result = computeParentProgress('p', tasksWithProgress);
      expect(result).toBe(75);
    });

    it('returns 0 for parent with no children', () => {
      expect(computeParentProgress('parent', [makeTask('parent')])).toBe(0);
    });
  });

  describe('getAllDescendants', () => {
    it('returns recursive descendants', () => {
      const descendants = getAllDescendants('parent', tasks);
      const ids = descendants.map(d => d.id);
      expect(ids).toContain('child1');
      expect(ids).toContain('child2');
      expect(ids).toContain('grandchild');
    });
  });
});
