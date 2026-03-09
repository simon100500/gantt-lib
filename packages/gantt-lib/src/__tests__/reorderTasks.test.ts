import { describe, it, expect } from 'vitest';
import type { Task } from '../components/GanttChart';

function reorderTasks(tasks: Task[], fromIndex: number, toIndex: number): Task[] {
  if (fromIndex === toIndex) return tasks;
  const result = [...tasks];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

describe('reorderTasks', () => {
  // REORDER-01: Move first to last
  it('moves task from index 0 to index 2', () => {
    const tasks: Task[] = [
      { id: '1', name: 'A', startDate: '2026-01-01', endDate: '2026-01-03' },
      { id: '2', name: 'B', startDate: '2026-01-04', endDate: '2026-01-06' },
      { id: '3', name: 'C', startDate: '2026-01-07', endDate: '2026-01-09' },
    ];
    const result = reorderTasks(tasks, 0, 2);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');
    expect(result[2].id).toBe('1');
  });

  // REORDER-01b: Move last to first
  it('moves task from index 2 to index 0', () => {
    const tasks: Task[] = [
      { id: '1', name: 'A', startDate: '2026-01-01', endDate: '2026-01-03' },
      { id: '2', name: 'B', startDate: '2026-01-04', endDate: '2026-01-06' },
      { id: '3', name: 'C', startDate: '2026-01-07', endDate: '2026-01-09' },
    ];
    const result = reorderTasks(tasks, 2, 0);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('3');
    expect(result[1].id).toBe('1');
    expect(result[2].id).toBe('2');
  });

  // REORDER-02: No-op when from === to
  it('returns unchanged array when fromIndex === toIndex', () => {
    const tasks: Task[] = [
      { id: '1', name: 'A', startDate: '2026-01-01', endDate: '2026-01-03' },
      { id: '2', name: 'B', startDate: '2026-01-04', endDate: '2026-01-06' },
      { id: '3', name: 'C', startDate: '2026-01-07', endDate: '2026-01-09' },
    ];
    const result = reorderTasks(tasks, 1, 1);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
    expect(result[2].id).toBe('3');
  });

  // REORDER-02b: Original array is NOT mutated
  it('does not mutate the original array', () => {
    const tasks: Task[] = [
      { id: '1', name: 'A', startDate: '2026-01-01', endDate: '2026-01-03' },
      { id: '2', name: 'B', startDate: '2026-01-04', endDate: '2026-01-06' },
      { id: '3', name: 'C', startDate: '2026-01-07', endDate: '2026-01-09' },
    ];
    const originalOrder = tasks.map(t => t.id);
    reorderTasks(tasks, 0, 2);
    expect(tasks.map(t => t.id)).toEqual(originalOrder);
  });

  // REORDER-03: Boundary - first to last with 2 tasks
  it('handles boundary: moves first to last with 2 tasks', () => {
    const tasks: Task[] = [
      { id: '1', name: 'A', startDate: '2026-01-01', endDate: '2026-01-03' },
      { id: '2', name: 'B', startDate: '2026-01-04', endDate: '2026-01-06' },
    ];
    const result = reorderTasks(tasks, 0, 1);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('1');
  });

  // REORDER-03b: Boundary - last to first with 4 tasks
  it('handles boundary: moves last to first with 4 tasks', () => {
    const tasks: Task[] = [
      { id: '1', name: 'A', startDate: '2026-01-01', endDate: '2026-01-03' },
      { id: '2', name: 'B', startDate: '2026-01-04', endDate: '2026-01-06' },
      { id: '3', name: 'C', startDate: '2026-01-07', endDate: '2026-01-09' },
      { id: '4', name: 'D', startDate: '2026-01-10', endDate: '2026-01-12' },
    ];
    const result = reorderTasks(tasks, 3, 0);
    expect(result).toHaveLength(4);
    expect(result[0].id).toBe('4');
    expect(result[1].id).toBe('1');
    expect(result[2].id).toBe('2');
    expect(result[3].id).toBe('3');
  });

  // Additional test: middle to middle
  it('moves task from middle index to another middle index', () => {
    const tasks: Task[] = [
      { id: '1', name: 'A', startDate: '2026-01-01', endDate: '2026-01-03' },
      { id: '2', name: 'B', startDate: '2026-01-04', endDate: '2026-01-06' },
      { id: '3', name: 'C', startDate: '2026-01-07', endDate: '2026-01-09' },
      { id: '4', name: 'D', startDate: '2026-01-10', endDate: '2026-01-12' },
      { id: '5', name: 'E', startDate: '2026-01-13', endDate: '2026-01-15' },
    ];
    const result = reorderTasks(tasks, 1, 3);
    expect(result).toHaveLength(5);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
    expect(result[2].id).toBe('4');
    expect(result[3].id).toBe('2');
    expect(result[4].id).toBe('5');
  });
});
