import { describe, it, expect } from 'vitest';
import { computeParentDates, getChildren } from '../utils/dependencyUtils';

describe('Parent demotion - saves computed dates', () => {
  it('should save computed dates from children when parent becomes a regular task', () => {
    // Setup: parent with 2 children
    // Parent's original dates: 2026-01-01 to 2026-01-15 (from children)
    const tasks = [
      { id: 'parent', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-15' },
      { id: 'child1', name: 'Child 1', parentId: 'parent', startDate: '2026-01-02', endDate: '2026-01-05' },
      { id: 'child2', name: 'Child 2', parentId: 'parent', startDate: '2026-01-06', endDate: '2026-01-10' },
    ];

    // Verify parent has children
    const children = getChildren('parent', tasks);
    expect(children.length).toBe(2);

    // Simulate demotion: parent becomes a child of 'newParent'
    // The computed dates should be saved as the task's "own" dates
    const wasParent = children.length > 0;
    const taskDates = { startDate: tasks[0].startDate, endDate: tasks[0].endDate };

    if (wasParent) {
      const computedDates = computeParentDates('parent', tasks);
      taskDates.startDate = computedDates.startDate.toISOString().split('T')[0];
      taskDates.endDate = computedDates.endDate.toISOString().split('T')[0];
    }

    // After demotion, the task should have the computed dates as its own
    const demotedTask = {
      ...tasks[0],
      parentId: 'newParent',
      startDate: taskDates.startDate,
      endDate: taskDates.endDate
    };

    console.log('Demoted task dates:', {
      startDate: demotedTask.startDate,
      endDate: demotedTask.endDate
    });

    // Verify: dates are computed from children (min/max)
    expect(demotedTask.startDate).toBe('2026-01-02'); // min(child1.start, child2.start)
    expect(demotedTask.endDate).toBe('2026-01-10');   // max(child1.end, child2.end)
    expect(demotedTask.parentId).toBe('newParent');
  });

  it('should keep original dates when regular task is demoted (was not a parent)', () => {
    // Setup: regular task with NO children
    const tasks = [
      { id: 'task1', name: 'Task 1', startDate: '2026-01-05', endDate: '2026-01-08' },
      { id: 'newParent', name: 'New Parent', startDate: '2026-01-01', endDate: '2026-01-15' },
    ];

    // Verify task has NO children
    const children = getChildren('task1', tasks);
    expect(children.length).toBe(0);

    // Simulate demotion
    const wasParent = children.length > 0;
    const taskDates = { startDate: tasks[0].startDate, endDate: tasks[0].endDate };

    if (wasParent) {
      const computedDates = computeParentDates('task1', tasks);
      taskDates.startDate = computedDates.startDate.toISOString().split('T')[0];
      taskDates.endDate = computedDates.endDate.toISOString().split('T')[0];
    }

    // After demotion, dates should be unchanged (was not a parent)
    const demotedTask = {
      ...tasks[0],
      parentId: 'newParent',
      startDate: taskDates.startDate,
      endDate: taskDates.endDate
    };

    console.log('Demoted task dates (not a parent):', {
      startDate: demotedTask.startDate,
      endDate: demotedTask.endDate
    });

    // Verify: dates are unchanged
    expect(demotedTask.startDate).toBe('2026-01-05');
    expect(demotedTask.endDate).toBe('2026-01-08');
  });
});
