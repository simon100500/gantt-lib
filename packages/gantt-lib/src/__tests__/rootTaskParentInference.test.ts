/**
 * Tests for root task parentId inference during drag & drop.
 *
 * Rule: A root leaf task should join a group ONLY when dropped:
 *   1. Between a parent and its first child (parent → [task] → child)
 *   2. Between two children of the same parent (child → [task] → child)
 *
 * Dropping after the last child of a collapsed/expanded group must NOT
 * change the task's hierarchy level.
 */
import { describe, expect, it } from 'vitest';
import { getVisibleReorderPosition } from '../utils/taskListReorder';

type TaskLike = { id: string; parentId?: string };

const T = (id: string, parentId?: string): TaskLike => ({ id, ...(parentId ? { parentId } : {}) });

/**
 * Simulates the root-leaf-task path of handleDrop in TaskList.tsx.
 * Returns the inferredParentId that would be passed to onReorder.
 */
function simulateRootLeafDrop(
  orderedTasks: TaskLike[],
  visibleTasks: TaskLike[],
  movedId: string,
  originVisibleIndex: number,
  dropVisibleIndex: number,
): string | undefined {
  const position = getVisibleReorderPosition(
    orderedTasks,
    visibleTasks,
    movedId,
    originVisibleIndex,
    dropVisibleIndex,
  );
  if (!position) throw new Error('No reorder position');

  const { originOrderedIndex, insertIndex } = position;
  const moved = orderedTasks[originOrderedIndex];

  // Mirrors handleDrop: remove subtree (1 task for leaf), then re-insert
  const reordered = [...orderedTasks];
  reordered.splice(originOrderedIndex, 1);
  const adjustedInsertIndex = insertIndex;
  reordered.splice(adjustedInsertIndex, 0, moved);

  // Mirrors the updated parentId inference logic in handleDrop (lines 642+)
  const taskAbove = adjustedInsertIndex > 0 ? reordered[adjustedInsertIndex - 1] : null;
  const taskBelow =
    adjustedInsertIndex < reordered.length - 1 ? reordered[adjustedInsertIndex + 1] : null;

  if (taskAbove && taskBelow && taskBelow.parentId === taskAbove.id) {
    return taskAbove.id; // between parent and its first child
  }
  if (taskAbove && taskBelow && taskAbove.parentId && taskAbove.parentId === taskBelow.parentId) {
    return taskAbove.parentId; // between two siblings
  }
  if (!taskAbove && taskBelow && taskBelow.parentId) {
    return taskBelow.parentId; // at very top, above a child
  }
  return undefined; // stays root
}

describe('Root task parentId inference during drop', () => {
  it('stays root when dropped between two collapsed parents (main bug)', () => {
    // Visible: [parent1] [parent2] task
    // User drags task to the gap between the two collapsed parents
    const orderedTasks = [
      T('parent1'),
      T('child1', 'parent1'),
      T('parent2'),
      T('child2', 'parent2'),
      T('task'),
    ];
    const visibleTasks = [T('parent1'), T('parent2'), T('task')]; // both collapsed

    const parentId = simulateRootLeafDrop(orderedTasks, visibleTasks, 'task', 2, 1);
    expect(parentId).toBeUndefined();
  });

  it('joins group when dropped between parent and its first child', () => {
    // [parent1, child1, child2, task] — drop task before child1
    const orderedTasks = [T('parent1'), T('child1', 'parent1'), T('child2', 'parent1'), T('task')];
    const visibleTasks = orderedTasks;

    const parentId = simulateRootLeafDrop(orderedTasks, visibleTasks, 'task', 3, 1);
    expect(parentId).toBe('parent1');
  });

  it('joins group when dropped between two siblings', () => {
    // [parent1, child1, child2, task] — drop task between child1 and child2
    const orderedTasks = [T('parent1'), T('child1', 'parent1'), T('child2', 'parent1'), T('task')];
    const visibleTasks = orderedTasks;

    const parentId = simulateRootLeafDrop(orderedTasks, visibleTasks, 'task', 3, 2);
    expect(parentId).toBe('parent1');
  });

  it('stays root when dropped after the last child of a group', () => {
    // [task, parent1, child1, child2] — drop task after child2 (append at end)
    const orderedTasks = [T('task'), T('parent1'), T('child1', 'parent1'), T('child2', 'parent1')];
    const visibleTasks = orderedTasks;

    // dropVisibleIndex=4 means "append at end", past child2
    const parentId = simulateRootLeafDrop(orderedTasks, visibleTasks, 'task', 0, 4);
    expect(parentId).toBeUndefined();
  });

  it('stays root when dropped after a collapsed group (collapsed children hidden)', () => {
    // Visible: [task, parent1] — parent1 is collapsed (child1 hidden)
    // User drops task after parent1 (which visually means after the whole group)
    const orderedTasks = [T('task'), T('parent1'), T('child1', 'parent1')];
    const visibleTasks = [T('task'), T('parent1')]; // parent1 collapsed

    // dropVisibleIndex=2 is beyond visible list → append at end
    const parentId = simulateRootLeafDrop(orderedTasks, visibleTasks, 'task', 0, 2);
    expect(parentId).toBeUndefined();
  });
});
