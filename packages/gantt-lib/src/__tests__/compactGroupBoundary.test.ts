import { describe, expect, it } from 'vitest';
import { compactGroupBoundaryClasses } from '../utils/hierarchyOrder';

describe('compact group boundaries', () => {
  it('uses full order for single rows, adjacent groups, last rows and virtual windows', () => {
    const tasks = [{ id: 'p1' }, { parentId: 'p1' }, { id: 'p2' }, { parentId: 'p2' }, { parentId: 'p2' }, { id: 'p3' }, { parentId: 'p3' }];
    const parents = new Set(['p1', 'p2', 'p3']);
    expect(compactGroupBoundaryClasses(tasks, 1, parents)).toBe('gantt-compact-group-start gantt-compact-group-end');
    expect(compactGroupBoundaryClasses(tasks, 3, parents)).toBe('gantt-compact-group-start');
    expect(compactGroupBoundaryClasses(tasks, 4, parents)).toBe('gantt-compact-group-end');
    expect(compactGroupBoundaryClasses(tasks, 6, parents)).toBe('gantt-compact-group-start gantt-compact-group-end');
    expect(compactGroupBoundaryClasses(tasks, 2, parents)).toBeUndefined();
    const longGroup = [{ id: 'p' }, ...Array.from({ length: 30 }, () => ({ parentId: 'p' }))];
    expect(compactGroupBoundaryClasses(longGroup, 12, new Set(['p']))).toBeUndefined();
    expect(compactGroupBoundaryClasses(longGroup, 30, new Set(['p']))).toBe('gantt-compact-group-end');
  });
});
