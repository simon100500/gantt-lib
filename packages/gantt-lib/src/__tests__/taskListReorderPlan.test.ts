import { describe, expect, it } from 'vitest';
import { getVisibleReorderPlan } from '../utils/taskListReorder';

type TaskLike = { id: string; parentId?: string };

const T = (id: string, parentId?: string): TaskLike => ({ id, ...(parentId ? { parentId } : {}) });

describe('getVisibleReorderPlan', () => {
  it('makes the target task the direct parent when dropped inside its row', () => {
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
      inferredParentId: 'g2-1',
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

  it('drops after an expanded parent row as the first child of that parent', () => {
    const orderedTasks = [
      T('g1'),
      T('g1-1', 'g1'),
      T('g1-2', 'g1'),
      T('task'),
    ];

    const plan = getVisibleReorderPlan(
      orderedTasks,
      orderedTasks,
      'task',
      { index: 0, placement: 'after' },
    );

    expect(plan).toEqual({
      originOrderedIndex: 3,
      insertIndex: 1,
      inferredParentId: 'g1',
    });
  });

  it('does not attach a free task when dropped before itself', () => {
    const orderedTasks = [
      T('g1'),
      T('g1-1', 'g1'),
      T('g1-2', 'g1'),
      T('task'),
    ];

    const plan = getVisibleReorderPlan(
      orderedTasks,
      orderedTasks,
      'task',
      { index: 3, placement: 'before' },
    );

    expect(plan).toBeNull();
  });

  it('attaches a free task when dropped on the lower zone of the last child', () => {
    const orderedTasks = [
      T('g1'),
      T('g1-1', 'g1'),
      T('g1-2', 'g1'),
      T('task'),
    ];

    const plan = getVisibleReorderPlan(
      orderedTasks,
      orderedTasks,
      'task',
      { index: 2, placement: 'after' },
    );

    expect(plan).toEqual({
      originOrderedIndex: 3,
      insertIndex: 3,
      inferredParentId: 'g1',
    });
  });

  it('does not attach a free task when dropped before the next root task', () => {
    const orderedTasks = [
      T('g1'),
      T('g1-1', 'g1'),
      T('g1-2', 'g1'),
      T('task'),
      T('g2'),
      T('g2-1', 'g2'),
    ];

    const plan = getVisibleReorderPlan(
      orderedTasks,
      orderedTasks,
      'task',
      { index: 4, placement: 'before' },
    );

    expect(plan).toEqual({
      originOrderedIndex: 3,
      insertIndex: 3,
      inferredParentId: undefined,
    });
  });

  it('detaches the last child when dropped before the next root task', () => {
    const orderedTasks = [
      T('g1'),
      T('g1-1', 'g1'),
      T('g1-2', 'g1'),
      T('g2'),
      T('g2-1', 'g2'),
    ];

    const plan = getVisibleReorderPlan(
      orderedTasks,
      orderedTasks,
      'g1-2',
      { index: 3, placement: 'before' },
    );

    expect(plan).toEqual({
      originOrderedIndex: 2,
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
