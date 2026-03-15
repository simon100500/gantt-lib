/**
 * Regression test for parent-collapse-hierarchy-bug
 *
 * BUG: After dragging родитель1 (a parent with children) to a position after the last child
 * of родитель2, the parentId inference logic incorrectly assigns родитель2's id as the
 * parentId of родитель1. This makes родитель1 a child of родитель2 in the hierarchy, causing
 * collapse of родитель2 to also hide родитель1 and its children.
 *
 * ROOT CAUSE: In TaskList.handleDrop, the "join group" parentId inference block ran for ALL
 * root tasks (moved.parentId falsy), including parent tasks (those with hasChildren=true).
 * When родитель1 was dropped immediately after деть2.1 (a child of родитель2), the task above
 * had parentId = родитель2.id, so inferredParentId was incorrectly set to родитель2.id.
 *
 * FIX: The group-joining inference now has a !hasChildren guard — parent tasks always stay
 * at root level and their parentId is never inferred from neighbors.
 */
import { describe, it, expect } from 'vitest';
import { normalizeHierarchyTasks } from '../utils/hierarchyOrder';
import { getVisibleReorderPosition } from '../utils/taskListReorder';
import { isTaskParent } from '../utils/dependencyUtils';
import type { Task } from '../types';

/**
 * Simulate the parentId inference logic from TaskList.handleDrop.
 * This mirrors the exact logic in the component so we can unit-test it.
 */
function simulateHandleDrop(
  orderedTasks: Task[],
  visibleTasks: Task[],
  movedTaskId: string,
  originVisibleIndex: number,
  dropVisibleIndex: number,
): { reordered: Task[]; inferredParentId: string | undefined } | null {
  const reorderPosition = getVisibleReorderPosition(
    orderedTasks,
    visibleTasks,
    movedTaskId,
    originVisibleIndex,
    dropVisibleIndex,
  );

  if (!reorderPosition) return null;

  const { originOrderedIndex, insertIndex } = reorderPosition;

  // No-op detection
  if (insertIndex === originOrderedIndex) return null;

  const moved = orderedTasks[originOrderedIndex];
  const hasChildren = isTaskParent(moved.id, orderedTasks);

  // Collect subtree (parent + all descendants)
  function getDescendantIds(taskId: string, tasks: Task[]): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    function collect(id: string) {
      if (visited.has(id)) return;
      visited.add(id);
      for (const t of tasks) {
        if (t.parentId === id && !visited.has(t.id)) {
          result.push(t.id);
          collect(t.id);
        }
      }
    }
    collect(taskId);
    return result;
  }

  const descendantIds = getDescendantIds(moved.id, orderedTasks);
  const allMovedIds = new Set([moved.id, ...descendantIds]);
  const subtree = orderedTasks.filter(t => allMovedIds.has(t.id));
  const subtreeCount = subtree.length;

  const reordered = [...orderedTasks];
  reordered.splice(originOrderedIndex, subtreeCount);
  reordered.splice(insertIndex, 0, ...subtree);

  let inferredParentId: string | undefined;

  if (moved.parentId) {
    // Task is currently a child - check group range
    const parentIndex = reordered.findIndex(t => t.id === moved.parentId);
    if (parentIndex === -1) {
      inferredParentId = undefined;
    } else {
      const numSiblings = reordered.filter(t => t.parentId === moved.parentId).length;
      const groupEnd = parentIndex + numSiblings;
      if (insertIndex <= parentIndex || insertIndex > groupEnd) {
        inferredParentId = undefined;
      } else {
        inferredParentId = moved.parentId;
      }
    }
  } else if (!hasChildren) {
    // Root leaf task - can join a group from neighbors
    if (insertIndex > 0) {
      const taskAbove = reordered[insertIndex - 1];
      if (taskAbove.parentId && taskAbove.parentId !== moved.id) {
        inferredParentId = taskAbove.parentId;
      }
    }
    if (inferredParentId === undefined && insertIndex < reordered.length - 1) {
      const taskBelow = reordered[insertIndex + 1];
      if (taskBelow.parentId && taskBelow.parentId !== moved.id) {
        inferredParentId = taskBelow.parentId;
      }
    }
  }
  // else: hasChildren && !moved.parentId => parent task stays root, inferredParentId remains undefined

  return { reordered, inferredParentId };
}

describe('parent-collapse-hierarchy-bug regression', () => {
  const createTask = (id: string, name: string, parentId?: string): Task => ({
    id,
    name,
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    ...(parentId !== undefined && { parentId }),
  });

  it('parent task dropped after last child of another parent must retain parentId=undefined', () => {
    // Scenario from the bug report:
    // Initial: [родитель1, деть1, деть2, родитель2, деть2.1]
    // User drags родитель1 to position after деть2.1 (the last item, dropVisibleIndex=5)
    // Expected: родитель1.parentId stays undefined (root level)
    const tasks: Task[] = [
      createTask('родитель1', 'Parent 1'),
      createTask('деть1', 'Child 1', 'родитель1'),
      createTask('деть2', 'Child 2', 'родитель1'),
      createTask('родитель2', 'Parent 2'),
      createTask('деть2.1', 'Child 2.1', 'родитель2'),
    ];

    const orderedTasks = normalizeHierarchyTasks(tasks);

    // Verify initial order: [родитель1, деть1, деть2, родитель2, деть2.1]
    expect(orderedTasks.map(t => t.id)).toEqual([
      'родитель1', 'деть1', 'деть2', 'родитель2', 'деть2.1',
    ]);

    // All tasks visible (no collapsed parents)
    const visibleTasks = orderedTasks;

    // Drag родитель1 (visible index 0) to after деть2.1 (visible index 5, which is beyond end)
    const result = simulateHandleDrop(orderedTasks, visibleTasks, 'родитель1', 0, 5);

    expect(result).not.toBeNull();
    expect(result!.inferredParentId).toBeUndefined();

    // Verify the reordered array has correct structure
    const normalized = normalizeHierarchyTasks(result!.reordered);
    const parent1 = normalized.find(t => t.id === 'родитель1');
    expect(parent1?.parentId).toBeUndefined();

    // родитель2 should come first, родитель1 after
    const p2Index = normalized.findIndex(t => t.id === 'родитель2');
    const p1Index = normalized.findIndex(t => t.id === 'родитель1');
    expect(p2Index).toBeLessThan(p1Index);

    // родитель1's children should still have родитель1 as parent
    const деть1 = normalized.find(t => t.id === 'деть1');
    const деть2 = normalized.find(t => t.id === 'деть2');
    expect(деть1?.parentId).toBe('родитель1');
    expect(деть2?.parentId).toBe('родитель1');
  });

  it('parent task dropped at various positions near another parent always keeps parentId=undefined', () => {
    const tasks: Task[] = [
      createTask('родитель1', 'Parent 1'),
      createTask('деть1', 'Child 1', 'родитель1'),
      createTask('деть2', 'Child 2', 'родитель1'),
      createTask('родитель2', 'Parent 2'),
      createTask('деть2.1', 'Child 2.1', 'родитель2'),
      createTask('деть2.2', 'Child 2.2', 'родитель2'),
    ];

    const orderedTasks = normalizeHierarchyTasks(tasks);
    const visibleTasks = orderedTasks;

    // Test all meaningful drop positions when dragging родитель1 down
    const dropPositions = [3, 4, 5, 6, 7]; // at/after родитель2 and its children

    for (const dropIndex of dropPositions) {
      const result = simulateHandleDrop(orderedTasks, visibleTasks, 'родитель1', 0, dropIndex);

      if (result === null) {
        // No-op is acceptable (e.g. if insertIndex === originOrderedIndex)
        continue;
      }

      expect(result.inferredParentId).toBeUndefined();

      const normalized = normalizeHierarchyTasks(result.reordered);
      const parent1 = normalized.find(t => t.id === 'родитель1');
      expect(parent1?.parentId).toBeUndefined();
    }
  });

  it('leaf (non-parent) root task CAN still join a group when dropped between children', () => {
    // This ensures we did not break the existing behavior for non-parent root tasks
    const tasks: Task[] = [
      createTask('rootLeaf', 'Root Leaf'),   // no parentId, no children
      createTask('родитель1', 'Parent 1'),
      createTask('деть1', 'Child 1', 'родитель1'),
      createTask('деть2', 'Child 2', 'родитель1'),
    ];

    const orderedTasks = normalizeHierarchyTasks(tasks);
    // orderedTasks: [rootLeaf, родитель1, деть1, деть2]
    expect(orderedTasks.map(t => t.id)).toEqual(['rootLeaf', 'родитель1', 'деть1', 'деть2']);

    const visibleTasks = orderedTasks;

    // Drag rootLeaf (index 0) to after деть1 (index 3) - between деть1 and деть2
    const result = simulateHandleDrop(orderedTasks, visibleTasks, 'rootLeaf', 0, 3);

    // A non-parent root task CAN join a group
    // After drop, rootLeaf lands between деть1 and деть2, so taskAbove = деть1 (parentId=родитель1)
    // inferredParentId should be 'родитель1'
    expect(result).not.toBeNull();
    expect(result!.inferredParentId).toBe('родитель1');
  });

  it('collapse of родитель2 must not hide родитель1 after it has been moved below родитель2', () => {
    // This tests the full collapse visibility filtering after a correct drag-drop
    const tasks: Task[] = [
      createTask('родитель1', 'Parent 1'),
      createTask('деть1', 'Child 1', 'родитель1'),
      createTask('деть2', 'Child 2', 'родитель1'),
      createTask('родитель2', 'Parent 2'),
      createTask('деть2.1', 'Child 2.1', 'родитель2'),
    ];

    const orderedTasks = normalizeHierarchyTasks(tasks);
    const visibleTasks = orderedTasks;

    // Drag родитель1 to after деть2.1 (beyond end of visible list = index 5)
    const result = simulateHandleDrop(orderedTasks, visibleTasks, 'родитель1', 0, 5);
    expect(result).not.toBeNull();

    // Apply the parentId update (as GanttChart.handleReorder does)
    const updatedTasks = result!.reordered.map(t => {
      if (t.id === 'родитель1') {
        return { ...t, parentId: result!.inferredParentId };
      }
      return t;
    });

    const normalized = normalizeHierarchyTasks(updatedTasks);

    // Simulate collapse of родитель2
    const collapsedParentIds = new Set(['родитель2']);
    const visibleAfterCollapse = normalized.filter(task => {
      if (!task.parentId) return true; // root tasks always visible
      return !collapsedParentIds.has(task.parentId);
    });

    // родитель1 is root (parentId=undefined) so it must remain visible when родитель2 is collapsed
    const parent1Visible = visibleAfterCollapse.some(t => t.id === 'родитель1');
    expect(parent1Visible).toBe(true);

    // деть1 and деть2 are children of родитель1 (not родитель2) - they must remain visible
    const деть1Visible = visibleAfterCollapse.some(t => t.id === 'деть1');
    const деть2Visible = visibleAfterCollapse.some(t => t.id === 'деть2');
    expect(деть1Visible).toBe(true);
    expect(деть2Visible).toBe(true);

    // деть2.1 is a child of родитель2 (collapsed), must be hidden
    const деть21Visible = visibleAfterCollapse.some(t => t.id === 'деть2.1');
    expect(деть21Visible).toBe(false);
  });
});
