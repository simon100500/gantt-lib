/**
 * Regression tests for parent-delete-cascade-hierarchy-audit
 *
 * BUG 1 (cascade delete):
 * Deleting a parent task only removed the parent itself. Children remained in the
 * task list as orphaned tasks because onDelete was only called once with the
 * original taskId, not for each descendant.
 *
 * FIX: GanttChart.handleDelete now calls onDelete for each task in the toDelete set
 * (original + all descendants via collectDescendants).
 *
 * BUG 2 (multi-level collapse):
 * Collapsing a grandparent only hid its direct children. Grandchildren remained
 * visible because the visibility filter only checked task.parentId against
 * collapsedParentIds — one level deep.
 *
 * FIX: Both GanttChart.filteredTasks and TaskList.visibleTasks now walk the full
 * ancestor chain to determine visibility.
 */

import { describe, it, expect } from 'vitest';
import { getChildren } from '../utils/dependencyUtils';
import type { Task } from '../types';

// ─── Simulate GanttChart.handleDelete ────────────────────────────────────────

/**
 * Mirrors the logic in GanttChart.handleDelete.
 * Returns the set of all task IDs that should be deleted (original + all descendants).
 */
function collectDeleteSet(taskId: string, tasks: Task[]): Set<string> {
  const toDelete = new Set<string>([taskId]);

  function collectDescendants(parentId: string) {
    const children = getChildren(parentId, tasks);
    children.forEach(child => {
      toDelete.add(child.id);
      collectDescendants(child.id);
    });
  }

  collectDescendants(taskId);
  return toDelete;
}

// ─── Simulate multi-level collapse visibility filter ─────────────────────────

/**
 * Mirrors the NEW filteredTasks / visibleTasks logic (ancestor-chain check).
 */
function filterVisibleTasksWithAncestorCheck(
  orderedTasks: Task[],
  collapsedParentIds: Set<string>,
): Task[] {
  const parentMap = new Map(orderedTasks.map(t => [t.id, t.parentId]));

  function isAnyAncestorCollapsed(parentId: string | undefined): boolean {
    let current = parentId;
    while (current) {
      if (collapsedParentIds.has(current)) return true;
      current = parentMap.get(current);
    }
    return false;
  }

  return orderedTasks.filter(task => !isAnyAncestorCollapsed(task.parentId));
}

/**
 * Mirrors the OLD (buggy) filteredTasks / visibleTasks logic (single-level check).
 * Kept here to prove the bug existed.
 */
function filterVisibleTasksOldBuggy(
  orderedTasks: Task[],
  collapsedParentIds: Set<string>,
): Task[] {
  return orderedTasks.filter(task => {
    if (!task.parentId) return true;
    return !collapsedParentIds.has(task.parentId);
  });
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

const makeTask = (id: string, parentId?: string): Task => ({
  id,
  name: id,
  startDate: '2026-03-01',
  endDate: '2026-03-10',
  ...(parentId !== undefined ? { parentId } : {}),
});

// ─── BUG 1: Cascade delete ────────────────────────────────────────────────────

describe('cascade delete: collectDeleteSet', () => {
  it('deletes only the task itself when it has no children', () => {
    const tasks: Task[] = [
      makeTask('parent'),
      makeTask('child1', 'parent'),
      makeTask('standalone'),
    ];

    const toDelete = collectDeleteSet('standalone', tasks);
    expect([...toDelete]).toEqual(['standalone']);
  });

  it('deletes parent and all direct children', () => {
    const tasks: Task[] = [
      makeTask('parent'),
      makeTask('child1', 'parent'),
      makeTask('child2', 'parent'),
    ];

    const toDelete = collectDeleteSet('parent', tasks);
    expect(toDelete.has('parent')).toBe(true);
    expect(toDelete.has('child1')).toBe(true);
    expect(toDelete.has('child2')).toBe(true);
    expect(toDelete.size).toBe(3);
  });

  it('deletes parent, children, and grandchildren (3-level deep)', () => {
    const tasks: Task[] = [
      makeTask('grandparent'),
      makeTask('parent1', 'grandparent'),
      makeTask('parent2', 'grandparent'),
      makeTask('child1', 'parent1'),
      makeTask('child2', 'parent1'),
      makeTask('child3', 'parent2'),
    ];

    const toDelete = collectDeleteSet('grandparent', tasks);
    expect(toDelete.has('grandparent')).toBe(true);
    expect(toDelete.has('parent1')).toBe(true);
    expect(toDelete.has('parent2')).toBe(true);
    expect(toDelete.has('child1')).toBe(true);
    expect(toDelete.has('child2')).toBe(true);
    expect(toDelete.has('child3')).toBe(true);
    expect(toDelete.size).toBe(6);
  });

  it('leaves unrelated tasks untouched', () => {
    const tasks: Task[] = [
      makeTask('parent'),
      makeTask('child1', 'parent'),
      makeTask('otherParent'),
      makeTask('otherChild', 'otherParent'),
    ];

    const toDelete = collectDeleteSet('parent', tasks);
    expect(toDelete.has('otherParent')).toBe(false);
    expect(toDelete.has('otherChild')).toBe(false);
  });

  it('consumer filtering with all IDs removes orphans (simulates fixed page.tsx handleDelete)', () => {
    const tasks: Task[] = [
      makeTask('родитель1'),
      makeTask('деть1', 'родитель1'),
      makeTask('деть2', 'родитель1'),
      makeTask('standalone'),
    ];

    const toDelete = collectDeleteSet('родитель1', tasks);

    // Consumer filters ALL IDs in toDelete (the fixed behavior)
    const remaining = tasks.filter(t => !toDelete.has(t.id));

    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('standalone');
  });

  it('old single-ID filter leaves orphans (proves the bug existed)', () => {
    const tasks: Task[] = [
      makeTask('родитель1'),
      makeTask('деть1', 'родитель1'),
      makeTask('деть2', 'родитель1'),
    ];

    // OLD (buggy) behavior: filter only by the one taskId passed to onDelete
    const remaining = tasks.filter(t => t.id !== 'родитель1');

    // Orphaned children remain
    expect(remaining.length).toBe(2);
    expect(remaining.some(t => t.id === 'деть1')).toBe(true);
    expect(remaining.some(t => t.id === 'деть2')).toBe(true);
  });
});

// ─── BUG 2: Multi-level collapse ─────────────────────────────────────────────

describe('multi-level collapse visibility', () => {
  const orderedTasks: Task[] = [
    makeTask('grandparent'),
    makeTask('parent1', 'grandparent'),
    makeTask('parent2', 'grandparent'),
    makeTask('child1', 'parent1'),
    makeTask('child2', 'parent1'),
    makeTask('child3', 'parent2'),
    makeTask('root'),
  ];

  it('collapsing grandparent hides direct children AND grandchildren (new behavior)', () => {
    const collapsed = new Set(['grandparent']);
    const visible = filterVisibleTasksWithAncestorCheck(orderedTasks, collapsed);

    const visibleIds = visible.map(t => t.id);

    // grandparent itself is visible (root task — no parentId)
    expect(visibleIds).toContain('grandparent');
    // root task is unaffected
    expect(visibleIds).toContain('root');
    // direct children are hidden
    expect(visibleIds).not.toContain('parent1');
    expect(visibleIds).not.toContain('parent2');
    // grandchildren are also hidden
    expect(visibleIds).not.toContain('child1');
    expect(visibleIds).not.toContain('child2');
    expect(visibleIds).not.toContain('child3');
  });

  it('collapsing grandparent with old logic FAILS to hide grandchildren (proves the bug)', () => {
    const collapsed = new Set(['grandparent']);
    const visible = filterVisibleTasksOldBuggy(orderedTasks, collapsed);

    const visibleIds = visible.map(t => t.id);

    // Old logic hides parent1, parent2 correctly (direct children)
    expect(visibleIds).not.toContain('parent1');
    expect(visibleIds).not.toContain('parent2');

    // BUT old logic fails to hide grandchildren because their parentId is parent1/parent2,
    // NOT grandparent — and those are not in collapsedParentIds
    // This is the bug: grandchildren are still visible
    expect(visibleIds).toContain('child1'); // BUG: should be hidden
    expect(visibleIds).toContain('child2'); // BUG: should be hidden
    expect(visibleIds).toContain('child3'); // BUG: should be hidden
  });

  it('collapsing only a mid-level parent hides its children but not grandparent siblings', () => {
    const collapsed = new Set(['parent1']);
    const visible = filterVisibleTasksWithAncestorCheck(orderedTasks, collapsed);

    const visibleIds = visible.map(t => t.id);

    // grandparent is visible
    expect(visibleIds).toContain('grandparent');
    // parent1 is visible (it has no parentId pointing to collapsed, it's a direct child of grandparent which is NOT collapsed)
    expect(visibleIds).toContain('parent1');
    // parent2 is visible (sibling of parent1, not collapsed)
    expect(visibleIds).toContain('parent2');
    // child3 under parent2 is visible
    expect(visibleIds).toContain('child3');
    // child1, child2 under parent1 are hidden
    expect(visibleIds).not.toContain('child1');
    expect(visibleIds).not.toContain('child2');
  });

  it('collapsing nothing shows all tasks', () => {
    const collapsed = new Set<string>();
    const visible = filterVisibleTasksWithAncestorCheck(orderedTasks, collapsed);
    expect(visible.length).toBe(orderedTasks.length);
  });

  it('collapsing a leaf task (no children) has no effect on visibility', () => {
    const collapsed = new Set(['child1']); // child1 has no children in orderedTasks
    const visible = filterVisibleTasksWithAncestorCheck(orderedTasks, collapsed);
    // child1 itself is visible (its parentId is parent1, not child1)
    // No tasks have child1 as parentId, so no tasks are hidden
    expect(visible.length).toBe(orderedTasks.length);
  });

  it('3-level nesting: collapsing root hides all descendants at all levels', () => {
    const threeLevelTasks: Task[] = [
      makeTask('level0'),          // root
      makeTask('level1', 'level0'),
      makeTask('level2', 'level1'),
      makeTask('level3', 'level2'),
    ];

    const collapsed = new Set(['level0']);
    const visible = filterVisibleTasksWithAncestorCheck(threeLevelTasks, collapsed);

    const visibleIds = visible.map(t => t.id);
    expect(visibleIds).toContain('level0');  // root always visible
    expect(visibleIds).not.toContain('level1');
    expect(visibleIds).not.toContain('level2');
    expect(visibleIds).not.toContain('level3');
  });
});
