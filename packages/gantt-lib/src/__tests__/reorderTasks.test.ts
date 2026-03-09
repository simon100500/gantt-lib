import { describe, it, expect } from 'vitest';
import type { Task } from '../components/GanttChart';

// ===== GREEN phase: Function implementation =====

/**
 * Pure function to reorder tasks array by moving an item from fromIndex to toIndex.
 * Does NOT mutate the original array.
 * @param tasks - Array of tasks to reorder
 * @param fromIndex - Index of task to move
 * @param toIndex - Target index where task should be inserted
 * @returns New array with tasks reordered
 */
function reorderTasks(tasks: Task[], fromIndex: number, toIndex: number): Task[] {
  if (fromIndex === toIndex) return tasks;
  const result = [...tasks];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

// ===== Tests =====

describe('reorderTasks', () => {
  // REORDER-01: move first to last
  it('REORDER-01: reorderTasks([A,B,C], 0, 2) returns [B,C,A]', () => {
    const tasks: Task[] = [
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
      { id: 'C', name: 'Task C', startDate: '2026-03-03', endDate: '2026-03-07' },
    ];

    // This will fail because reorderTasks is not yet defined
    const result = reorderTasks(tasks, 0, 2);

    expect(result).toEqual([
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
      { id: 'C', name: 'Task C', startDate: '2026-03-03', endDate: '2026-03-07' },
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
    ]);
  });

  // REORDER-01b: move last to first
  it('REORDER-01b: reorderTasks([A,B,C], 2, 0) returns [C,A,B]', () => {
    const tasks: Task[] = [
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
      { id: 'C', name: 'Task C', startDate: '2026-03-03', endDate: '2026-03-07' },
    ];

    const result = reorderTasks(tasks, 2, 0);

    expect(result).toEqual([
      { id: 'C', name: 'Task C', startDate: '2026-03-03', endDate: '2026-03-07' },
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
    ]);
  });

  // REORDER-02: no-op when from===to
  it('REORDER-02: reorderTasks([A,B,C], 1, 1) returns [A,B,C] unchanged', () => {
    const tasks: Task[] = [
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
      { id: 'C', name: 'Task C', startDate: '2026-03-03', endDate: '2026-03-07' },
    ];

    const result = reorderTasks(tasks, 1, 1);

    expect(result).toEqual(tasks);
  });

  // REORDER-02b: original array is NOT mutated
  it('REORDER-02b: original array is NOT mutated after any call', () => {
    const tasks: Task[] = [
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
      { id: 'C', name: 'Task C', startDate: '2026-03-03', endDate: '2026-03-07' },
    ];

    const originalOrder = [...tasks];
    reorderTasks(tasks, 0, 2);

    expect(tasks).toEqual(originalOrder);
  });

  // REORDER-03: boundary - first→last with 2 tasks
  it('REORDER-03: reorderTasks([A,B], 0, 1) returns [B,A]', () => {
    const tasks: Task[] = [
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
    ];

    const result = reorderTasks(tasks, 0, 1);

    expect(result).toEqual([
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
    ]);
  });

  // REORDER-03b: boundary - last→first
  it('REORDER-03b: reorderTasks([A,B,C,D], 3, 0) returns [D,A,B,C]', () => {
    const tasks: Task[] = [
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
      { id: 'C', name: 'Task C', startDate: '2026-03-03', endDate: '2026-03-07' },
      { id: 'D', name: 'Task D', startDate: '2026-03-04', endDate: '2026-03-08' },
    ];

    const result = reorderTasks(tasks, 3, 0);

    expect(result).toEqual([
      { id: 'D', name: 'Task D', startDate: '2026-03-04', endDate: '2026-03-08' },
      { id: 'A', name: 'Task A', startDate: '2026-03-01', endDate: '2026-03-05' },
      { id: 'B', name: 'Task B', startDate: '2026-03-02', endDate: '2026-03-06' },
      { id: 'C', name: 'Task C', startDate: '2026-03-03', endDate: '2026-03-07' },
    ]);
  });
});
