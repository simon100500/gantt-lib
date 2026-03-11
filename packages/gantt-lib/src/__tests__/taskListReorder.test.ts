import { describe, expect, it } from 'vitest';
import { getVisibleReorderPosition } from '../utils/taskListReorder';

describe('getVisibleReorderPosition', () => {
  it('drops below a collapsed parent after its hidden children', () => {
    const orderedTasks = [
      { id: 'parent' },
      { id: 'child-1' },
      { id: 'child-2' },
      { id: 'task-a' },
      { id: 'task-b' },
    ];
    const visibleTasks = [
      { id: 'parent' },
      { id: 'task-a' },
      { id: 'task-b' },
    ];

    expect(
      getVisibleReorderPosition(orderedTasks, visibleTasks, 'task-b', 2, 1),
    ).toEqual({
      originOrderedIndex: 4,
      insertIndex: 3,
    });
  });

  it('moves to end after collapsed descendants instead of before them', () => {
    const orderedTasks = [
      { id: 'task-a' },
      { id: 'parent' },
      { id: 'child-1' },
      { id: 'child-2' },
      { id: 'task-b' },
    ];
    const visibleTasks = [
      { id: 'task-a' },
      { id: 'parent' },
      { id: 'task-b' },
    ];

    expect(
      getVisibleReorderPosition(orderedTasks, visibleTasks, 'task-a', 0, 3),
    ).toEqual({
      originOrderedIndex: 0,
      insertIndex: 4,
    });
  });
});
