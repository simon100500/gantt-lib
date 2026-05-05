import { describe, expect, it } from 'vitest';
import { getVisibleReorderPlan } from '../utils/taskListReorder';

type TaskLike = { id: string; parentId?: string };

const T = (id: string, parentId?: string): TaskLike => ({ id, ...(parentId ? { parentId } : {}) });

describe('getVisibleReorderPlan', () => {
  it('moves a child into another group when dropped inside one of its children', () => {
    const orderedTasks = [
      T('g1'),
      T('g1-1', 'g1'),
      T('g1-2', 'g1'),
      T('g2'),
      T('g2-1', 'g2'),
      T('g2-2', 'g2'),
    ];

    const plan = getVisibleReorderPlan(
      orderedTasks,
      orderedTasks,
      'g1-2',
      { index: 4, placement: 'inside' },
    );

    expect(plan).toEqual({
      originOrderedIndex: 2,
      insertIndex: 4,
      inferredParentId: 'g2',
    });
  });

  it('makes a root task a child of the target parent when dropped inside the parent row', () => {
    const orderedTasks = [
      T('task'),
      T('g1'),
      T('g1-1', 'g1'),
      T('g2'),
      T('g2-1', 'g2'),
    ];

    const plan = getVisibleReorderPlan(
      orderedTasks,
      orderedTasks,
      'task',
      { index: 3, placement: 'inside' },
    );

    expect(plan).toEqual({
      originOrderedIndex: 0,
      insertIndex: 4,
      inferredParentId: 'g2',
    });
  });

  it('drops after a collapsed parent group as a root-level task', () => {
    const orderedTasks = [
      T('task'),
      T('g1'),
      T('g1-1', 'g1'),
      T('g2'),
      T('g2-1', 'g2'),
    ];
    const visibleTasks = [T('task'), T('g1'), T('g2')];

    const plan = getVisibleReorderPlan(
      orderedTasks,
      visibleTasks,
      'task',
      { index: 1, placement: 'after' },
    );

    expect(plan).toEqual({
      originOrderedIndex: 0,
      insertIndex: 2,
      inferredParentId: undefined,
    });
  });

  it('rejects dropping a parent inside its own descendant subtree', () => {
    const orderedTasks = [
      T('g1'),
      T('g1-1', 'g1'),
      T('g1-1-1', 'g1-1'),
      T('g2'),
    ];

    const plan = getVisibleReorderPlan(
      orderedTasks,
      orderedTasks,
      'g1',
      { index: 1, placement: 'inside' },
    );

    expect(plan).toBeNull();
  });
});
