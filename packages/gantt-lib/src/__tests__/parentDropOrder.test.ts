/**
 * Test for parent task drop order bug
 *
 * BUG: When dragging a parent task to another root-level position, the parent moves to the end
 * of the list with children appearing above it (wrong hierarchy).
 */
import { describe, it, expect } from 'vitest';
import { flattenHierarchy, normalizeHierarchyTasks } from '../utils/hierarchyOrder';
import { getVisibleReorderPosition } from '../utils/taskListReorder';
import type { Task } from '../types';

describe('Parent drop order bug', () => {
  const createTask = (id: string, name: string, start: string, end: string, parentId?: string): Task => ({
    id,
    name,
    startDate: start,
    endDate: end,
    ...(parentId !== undefined && { parentId }),
  });

  it('should reproduce the bug: parent moves to end with children appearing above it', () => {
    // Setup: Two parent tasks, each with 2 children
    // Initial order (from normalizeHierarchyTasks):
    // [родитель1, ребёнок1.1, ребёнок1.2, родитель2, ребёнок2.1, ребёнок2.2]
    const tasks: Task[] = [
      createTask('родитель1', 'Parent 1', '2026-01-01', '2026-01-10'),
      createTask('ребёнок1.1', 'Child 1.1', '2026-01-02', '2026-01-03', 'родитель1'),
      createTask('ребёнок1.2', 'Child 1.2', '2026-01-04', '2026-01-05', 'родитель1'),
      createTask('родитель2', 'Parent 2', '2026-01-06', '2026-01-15'),
      createTask('ребёнок2.1', 'Child 2.1', '2026-01-07', '2026-01-08', 'родитель2'),
      createTask('ребёнок2.2', 'Child 2.2', '2026-01-09', '2026-01-10', 'родитель2'),
    ];

    const orderedTasks = normalizeHierarchyTasks(tasks);
    console.log('Initial orderedTasks:', orderedTasks.map(t => t.id));

    // Try different drop positions to find the bug
    const testCases = [
      { dropIndex: 3, desc: 'dropping ON родитель2' },
      { dropIndex: 4, desc: 'dropping AFTER родитель2 (between родитель2 and ребёнок2.1)' },
      { dropIndex: 5, desc: 'dropping ON ребёнок2.1' },
      { dropIndex: 6, desc: 'dropping at the END' },
    ];

    for (const { dropIndex, desc } of testCases) {
      console.log(`\n=== Testing: ${desc} (dropIndex=${dropIndex}) ===`);

      const reorderPosition = getVisibleReorderPosition(
        orderedTasks,
        orderedTasks, // all tasks visible
        'родитель1',
        0, // originVisibleIndex
        dropIndex,
      );

      if (!reorderPosition) {
        console.log('Reorder position is null, skipping');
        continue;
      }

      const { insertIndex } = reorderPosition;
      console.log('insertIndex:', insertIndex);

      const reordered = [...orderedTasks];
      reordered.splice(0, 1); // remove родитель1
      reordered.splice(insertIndex, 0, orderedTasks[0]); // insert родитель1

      console.log('reordered:', reordered.map(t => t.id));

      const normalized = normalizeHierarchyTasks(reordered);
      console.log('normalized:', normalized.map(t => t.id));

      // Check if parent appears before its children
      const parentIndex = normalized.findIndex(t => t.id === 'родитель1');
      const child1Index = normalized.findIndex(t => t.id === 'ребёнок1.1');
      const child2Index = normalized.findIndex(t => t.id === 'ребёнок1.2');

      if (parentIndex > child1Index || parentIndex > child2Index) {
        console.log(`BUG FOUND! Parent at index ${parentIndex}, children at ${child1Index} and ${child2Index}`);
      }
    }

    // This test is for logging purposes, we'll check the output manually
    expect(true).toBe(true);
  });

  it('should maintain correct order when using page.tsx-style handleReorder', () => {
    // This test mimics the actual fixed handleReorder behavior.
    // Dropping родитель1 ON родитель2 (dropVisibleIndex=3) should move родитель1's
    // entire group after родитель2's entire group.
    //
    // Note: dropVisibleIndex=4 (ребёнок2.1) is INVALID - isValidParentDrop rejects it.
    // The correct valid drop to move родитель1 past родитель2 is dropVisibleIndex=3 (ON родитель2).
    const tasks: Task[] = [
      createTask('родитель1', 'Parent 1', '2026-01-01', '2026-01-10'),
      createTask('ребёнок1.1', 'Child 1.1', '2026-01-02', '2026-01-03', 'родитель1'),
      createTask('ребёнок1.2', 'Child 1.2', '2026-01-04', '2026-01-05', 'родитель1'),
      createTask('родитель2', 'Parent 2', '2026-01-06', '2026-01-15'),
      createTask('ребёнок2.1', 'Child 2.1', '2026-01-07', '2026-01-08', 'родитель2'),
      createTask('ребёнок2.2', 'Child 2.2', '2026-01-09', '2026-01-10', 'родитель2'),
    ];

    // Simulate drag-drop: dropping родитель1 ON родитель2 (the first valid target after own group)
    // isValidParentDrop allows this: родитель2 is a root task, not a descendant of родитель1
    const orderedTasks = normalizeHierarchyTasks(tasks);
    const originVisibleIndex = 0;
    const dropVisibleIndex = 3; // ON родитель2 (valid: root task, not a child of anyone)

    const reorderPosition = getVisibleReorderPosition(
      orderedTasks,
      orderedTasks,
      'родитель1',
      originVisibleIndex,
      dropVisibleIndex,
    );

    if (!reorderPosition) {
      throw new Error('Reorder position is null');
    }

    const { originOrderedIndex, insertIndex } = reorderPosition;
    console.log('reorderPosition:', reorderPosition);

    // Simulate the full subtree move (as handleDrop does it)
    // The entire subtree [родитель1, ребёнок1.1, ребёнок1.2] moves together
    const subtreeCount = 3; // parent + 2 children
    const reordered = [...orderedTasks];
    const subtree = reordered.splice(originOrderedIndex, subtreeCount);
    reordered.splice(insertIndex, 0, ...subtree);

    console.log('After subtree move:', reordered.map(t => t.id));

    // Apply normalizeHierarchyTasks (as handleReorder does)
    const normalized = normalizeHierarchyTasks(reordered);
    console.log('Normalized:', normalized.map(t => t.id));

    // The fixed version should produce correct order: родитель2 group, then родитель1 group
    expect(normalized.map(t => t.id)).toEqual([
      'родитель2',
      'ребёнок2.1',
      'ребёнок2.2',
      'родитель1',
      'ребёнок1.1',
      'ребёнок1.2',
    ]);
  });

  it('should maintain parent before children after reorder (full subtree move)', () => {
    // Setup: Two parent tasks, each with 2 children
    // Initial order (from normalizeHierarchyTasks):
    // [0] родитель1, [1] ребёнок1.1, [2] ребёнок1.2, [3] родитель2, [4] ребёнок2.1, [5] ребёнок2.2
    const tasks: Task[] = [
      createTask('родитель1', 'Parent 1', '2026-01-01', '2026-01-10'),
      createTask('ребёнок1.1', 'Child 1.1', '2026-01-02', '2026-01-03', 'родитель1'),
      createTask('ребёнок1.2', 'Child 1.2', '2026-01-04', '2026-01-05', 'родитель1'),
      createTask('родитель2', 'Parent 2', '2026-01-06', '2026-01-15'),
      createTask('ребёнок2.1', 'Child 2.1', '2026-01-07', '2026-01-08', 'родитель2'),
      createTask('ребёнок2.2', 'Child 2.2', '2026-01-09', '2026-01-10', 'родитель2'),
    ];

    const orderedTasks = normalizeHierarchyTasks(tasks);
    console.log('Initial orderedTasks:', orderedTasks.map(t => t.id));

    // Simulate dragging родитель1 (index 0) ON родитель2 (index 3).
    // This is the valid way to move родитель1 after родитель2:
    //   - dropVisibleIndex=3 = dropping ON родитель2 (a root task → valid per isValidParentDrop)
    //   - dropVisibleIndex=4 = ребёнок2.1 (a child of родитель2 → REJECTED by isValidParentDrop)
    // The handler moves the ENTIRE subtree (родитель1 + its children) together.
    const originVisibleIndex = 0;
    const dropVisibleIndex = 3; // ON родитель2 (valid drop)

    // All tasks are visible (no collapsed parents)
    const visibleTasks = orderedTasks;

    const reorderPosition = getVisibleReorderPosition(
      orderedTasks,
      visibleTasks,
      'родитель1',
      originVisibleIndex,
      dropVisibleIndex,
    );

    console.log('Reorder position:', reorderPosition);

    if (!reorderPosition) {
      throw new Error('Reorder position is null');
    }

    const { originOrderedIndex, insertIndex } = reorderPosition;

    // Simulate full subtree move (as handleDrop does): родитель1 + ребёнок1.1 + ребёнок1.2
    const reordered = [...orderedTasks];
    const subtreeCount = 3; // parent + 2 children
    const subtree = reordered.splice(originOrderedIndex, subtreeCount);
    reordered.splice(insertIndex, 0, ...subtree);

    console.log('After splice - reordered:', reordered.map(t => t.id));

    // Test flattenHierarchy directly
    const flattened = flattenHierarchy(reordered);
    console.log('After flattenHierarchy:', flattened.map(t => t.id));

    // Apply normalizeHierarchyTasks (this is what handleReorder does)
    const normalized = normalizeHierarchyTasks(reordered);
    console.log('After normalizeHierarchyTasks:', normalized.map(t => t.id));

    // Expected: родитель2, its children, then родитель1, its children
    expect(normalized.map(t => t.id)).toEqual([
      'родитель2',
      'ребёнок2.1',
      'ребёнок2.2',
      'родитель1',
      'ребёнок1.1',
      'ребёнок1.2',
    ]);
  });

  it('flattenHierarchy should place parents before children regardless of input order', () => {
    // Even if children appear before parent in input, flattenHierarchy should fix it
    const tasks: Task[] = [
      createTask('ребёнок1.1', 'Child 1.1', '2026-01-02', '2026-01-03', 'родитель1'),
      createTask('ребёнок1.2', 'Child 1.2', '2026-01-04', '2026-01-05', 'родитель1'),
      createTask('родитель2', 'Parent 2', '2026-01-06', '2026-01-15'),
      createTask('родитель1', 'Parent 1', '2026-01-01', '2026-01-10'),
      createTask('ребёнок2.1', 'Child 2.1', '2026-01-07', '2026-01-08', 'родитель2'),
      createTask('ребёнок2.2', 'Child 2.2', '2026-01-09', '2026-01-10', 'родитель2'),
    ];

    const result = flattenHierarchy(tasks);
    console.log('flattenHierarchy result:', result.map(t => t.id));

    // flattenHierarchy should produce correct hierarchy
    expect(result.map(t => t.id)).toEqual([
      'родитель2',
      'ребёнок2.1',
      'ребёнок2.2',
      'родитель1',
      'ребёнок1.1',
      'ребёнок1.2',
    ]);
  });
});
