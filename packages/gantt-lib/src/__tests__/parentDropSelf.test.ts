/**
 * Test for parent task dropped on itself (below its position)
 *
 * TEST: When dropping a parent task below itself (after its children),
 * nothing should happen - it should be a no-op.
 */
import { describe, it, expect } from 'vitest';
import { normalizeHierarchyTasks } from '../utils/hierarchyOrder';
import { getVisibleReorderPosition } from '../utils/taskListReorder';
import type { Task } from '../types';

describe('Parent dropped on itself (below position)', () => {
  const createTask = (id: string, name: string, start: string, end: string, parentId?: string): Task => ({
    id,
    name,
    startDate: start,
    endDate: end,
    ...(parentId !== undefined && { parentId }),
  });

  it('should be a no-op when dropping parent below its own group', () => {
    // Setup: Parent with 2 children
    // Initial order (from normalizeHierarchyTasks):
    // [родитель1, ребёнок1.1, ребёнок1.2]
    const tasks: Task[] = [
      createTask('родитель1', 'Parent 1', '2026-01-01', '2026-01-10'),
      createTask('ребёнок1.1', 'Child 1.1', '2026-01-02', '2026-01-03', 'родитель1'),
      createTask('ребёнок1.2', 'Child 1.2', '2026-01-04', '2026-01-05', 'родитель1'),
    ];

    const orderedTasks = normalizeHierarchyTasks(tasks);
    console.log('Initial orderedTasks:', orderedTasks.map(t => t.id));

    // All tasks are visible (no collapsed parents)
    const visibleTasks = orderedTasks;

    // Simulate dragging родитель1 (index 0) and dropping below its entire group
    // The group occupies indices 0, 1, 2 (parent + 2 children)
    // Dropping below the group means dropVisibleIndex = 3 (or greater)
    const originVisibleIndex = 0;
    const dropVisibleIndex = 3; // Below the entire group

    console.log('Test case: Parent dropped below its own group');
    console.log('originVisibleIndex:', originVisibleIndex);
    console.log('dropVisibleIndex:', dropVisibleIndex);

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

    console.log('originOrderedIndex:', originOrderedIndex);
    console.log('insertIndex:', insertIndex);

    // Create reordered array
    const reordered = [...orderedTasks];
    const moved = reordered[originOrderedIndex];

    // Remove parent + children (subtree)
    const subtreeCount = 3; // parent + 2 children
    reordered.splice(originOrderedIndex, subtreeCount);

    console.log('After removing subtree:', reordered.map(t => t.id));

    // Insert at insertIndex
    reordered.splice(insertIndex, 0,
      moved,
      orderedTasks[1], // ребёнок1.1
      orderedTasks[2], // ребёнок1.2
    );

    console.log('After reinserting subtree:', reordered.map(t => t.id));

    // Apply normalizeHierarchyTasks
    const normalized = normalizeHierarchyTasks(reordered);
    console.log('After normalizeHierarchyTasks:', normalized.map(t => t.id));

    // Expected: Same as original order - no change
    expect(normalized.map(t => t.id)).toEqual([
      'родитель1',
      'ребёнок1.1',
      'ребёнок1.2',
    ]);
  });

  it('should be a no-op when dropping parent on the last row of its own group', () => {
    // Setup: Parent with 2 children
    const tasks: Task[] = [
      createTask('родитель1', 'Parent 1', '2026-01-01', '2026-01-10'),
      createTask('ребёнок1.1', 'Child 1.1', '2026-01-02', '2026-01-03', 'родитель1'),
      createTask('ребёнок1.2', 'Child 1.2', '2026-01-04', '2026-01-05', 'родитель1'),
    ];

    const orderedTasks = normalizeHierarchyTasks(tasks);
    const visibleTasks = orderedTasks;

    // Simulate dragging родитель1 (index 0) and dropping on its last child (index 2)
    const originVisibleIndex = 0;
    const dropVisibleIndex = 2; // On the last child

    console.log('Test case: Parent dropped on its last child');
    console.log('originVisibleIndex:', originVisibleIndex);
    console.log('dropVisibleIndex:', dropVisibleIndex);

    const reorderPosition = getVisibleReorderPosition(
      orderedTasks,
      visibleTasks,
      'родитель1',
      originVisibleIndex,
      dropVisibleIndex,
    );

    // This should either be null (rejected) or result in no change
    if (!reorderPosition) {
      console.log('Reorder position is null - rejected (expected)');
      return;
    }

    const { originOrderedIndex, insertIndex } = reorderPosition;

    console.log('originOrderedIndex:', originOrderedIndex);
    console.log('insertIndex:', insertIndex);

    // Create reordered array
    const reordered = [...orderedTasks];
    const moved = reordered[originOrderedIndex];

    // Remove parent + children (subtree)
    const subtreeCount = 3; // parent + 2 children
    reordered.splice(originOrderedIndex, subtreeCount);

    // Insert at insertIndex
    reordered.splice(insertIndex, 0,
      moved,
      orderedTasks[1],
      orderedTasks[2],
    );

    const normalized = normalizeHierarchyTasks(reordered);
    console.log('After normalizeHierarchyTasks:', normalized.map(t => t.id));

    // Expected: Same as original order - no change
    expect(normalized.map(t => t.id)).toEqual([
      'родитель1',
      'ребёнок1.1',
      'ребёнок1.2',
    ]);
  });

  it('should correctly handle parent dropped at the end of list with multiple parents', () => {
    // Setup: Two parents, each with children
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
    const visibleTasks = orderedTasks;

    // Test 1: Drop родитель2 at the very end (below everything)
    // родитель2 is at index 3, its group occupies indices 3, 4, 5
    // Dropping at index 6 (end of list) should be a no-op
    console.log('\n=== Test 1: Drop родитель2 at end of list ===');
    const reorderPosition1 = getVisibleReorderPosition(
      orderedTasks,
      visibleTasks,
      'родитель2',
      3, // originVisibleIndex
      6, // dropVisibleIndex (end of list)
    );

    if (!reorderPosition1) {
      throw new Error('Reorder position 1 is null');
    }

    const { originOrderedIndex: o1, insertIndex: i1 } = reorderPosition1;
    console.log('originOrderedIndex:', o1, 'insertIndex:', i1);

    const reordered1 = [...orderedTasks];
    reordered1.splice(o1, 3); // Remove родитель2 group
    reordered1.splice(i1, 0,
      orderedTasks[3], // родитель2
      orderedTasks[4], // ребёнок2.1
      orderedTasks[5], // ребёнок2.2
    );

    const normalized1 = normalizeHierarchyTasks(reordered1);
    console.log('Result:', normalized1.map(t => t.id));

    // Should be same as original - no change
    expect(normalized1.map(t => t.id)).toEqual([
      'родитель1',
      'ребёнок1.1',
      'ребёнок1.2',
      'родитель2',
      'ребёнок2.1',
      'ребёнок2.2',
    ]);

    // Test 2: Drop родитель1 below родитель2 group (actual reorder)
    console.log('\n=== Test 2: Drop родитель1 below родитель2 group ===');
    const reorderPosition2 = getVisibleReorderPosition(
      orderedTasks,
      visibleTasks,
      'родитель1',
      0, // originVisibleIndex
      6, // dropVisibleIndex (end of list)
    );

    if (!reorderPosition2) {
      throw new Error('Reorder position 2 is null');
    }

    const { originOrderedIndex: o2, insertIndex: i2 } = reorderPosition2;
    console.log('originOrderedIndex:', o2, 'insertIndex:', i2);

    const reordered2 = [...orderedTasks];
    reordered2.splice(o2, 3); // Remove родитель1 group
    reordered2.splice(i2, 0,
      orderedTasks[0], // родитель1
      orderedTasks[1], // ребёнок1.1
      orderedTasks[2], // ребёнок1.2
    );

    const normalized2 = normalizeHierarchyTasks(reordered2);
    console.log('Result:', normalized2.map(t => t.id));

    // Should have родитель2 group, then родитель1 group
    expect(normalized2.map(t => t.id)).toEqual([
      'родитель2',
      'ребёнок2.1',
      'ребёнок2.2',
      'родитель1',
      'ребёнок1.1',
      'ребёнок1.2',
    ]);
  });

  it('should be a no-op when dropping родитель1 at top border of родитель2 (drop indicator above родитель2)', () => {
    // Regression test for the drop indicator semantics:
    // The drag indicator visualizes the TOP BORDER of the drop position.
    // Dropping at index 3 (top of родитель2) means "insert ABOVE родитель2".
    // Since родитель1 is already above родитель2 (its group occupies 0,1,2),
    // dropping at 3 must be a NO-OP.
    //
    // The previous isMovingDown group-skipping logic was inserting родитель1 AFTER
    // родитель2's entire group (insertIndex=3 in reorderedWithoutMoved=[p2,c2.1,c2.2]),
    // which caused родитель1 to move below родитель2 instead of staying in place.
    //
    // To actually move родитель1 AFTER родитель2's group, the user must drag past
    // родитель2's children to the end of the list (dropVisibleIndex >= 6).
    const tasks: Task[] = [
      createTask('родитель1', 'Parent 1', '2026-01-01', '2026-01-10'),
      createTask('ребёнок1.1', 'Child 1.1', '2026-01-02', '2026-01-03', 'родитель1'),
      createTask('ребёнок1.2', 'Child 1.2', '2026-01-04', '2026-01-05', 'родитель1'),
      createTask('родитель2', 'Parent 2', '2026-01-06', '2026-01-15'),
      createTask('ребёнок2.1', 'Child 2.1', '2026-01-07', '2026-01-08', 'родитель2'),
      createTask('ребёнок2.2', 'Child 2.2', '2026-01-09', '2026-01-10', 'родитель2'),
    ];

    const orderedTasks = normalizeHierarchyTasks(tasks);
    const visibleTasks = orderedTasks;

    // Drag родитель1 (index 0) DOWN and drop at the top border of родитель2 (index 3)
    // The drop indicator appears at top of родитель2 = "insert ABOVE родитель2"
    const originVisibleIndex = 0;
    const dropVisibleIndex = 3; // top border of родитель2

    console.log('\n=== Test: Drop родитель1 at top border of родитель2 (index 3) ===');

    const reorderPosition = getVisibleReorderPosition(
      orderedTasks,
      visibleTasks,
      'родитель1',
      originVisibleIndex,
      dropVisibleIndex,
    );

    if (!reorderPosition) {
      throw new Error('Reorder position is null');
    }

    const { originOrderedIndex, insertIndex } = reorderPosition;
    console.log('originOrderedIndex:', originOrderedIndex, 'insertIndex:', insertIndex);

    // Expected: insertIndex = 0 (before родитель2 in reorderedWithoutMoved=[p2,c2.1,c2.2])
    // This is a NO-OP: inserting p1 subtree before p2 restores the original order.
    expect(insertIndex).toBe(0);

    // Apply full subtree move (as handleDrop does)
    const reordered = [...orderedTasks];
    const subtree = reordered.splice(originOrderedIndex, 3); // remove родитель1 + 2 children
    reordered.splice(insertIndex, 0, ...subtree); // insert at position 0 = before p2

    console.log('After subtree move:', reordered.map(t => t.id));

    const normalized = normalizeHierarchyTasks(reordered);
    console.log('Normalized:', normalized.map(t => t.id));

    // Expected: same as original order - родитель1 group, then родитель2 group (NO-OP)
    expect(normalized.map(t => t.id)).toEqual([
      'родитель1',
      'ребёнок1.1',
      'ребёнок1.2',
      'родитель2',
      'ребёнок2.1',
      'ребёнок2.2',
    ]);
  });
});
