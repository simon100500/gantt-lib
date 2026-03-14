/**
 * Test for parent task moving children cascade bug
 *
 * BUG: When a parent task is moved, its children should move with it by the same delta,
 * but they are not being included in the batch sent to onTasksChange.
 */
import { describe, it, expect } from 'vitest';
import { cascadeByLinks } from '../utils/dependencyUtils';
import { Task } from '../types';

describe('Parent move children cascade bug', () => {
  const createTask = (id: string, name: string, start: string, end: string, parentId?: string): Task => ({
    id,
    name,
    startDate: start,
    endDate: end,
    ...(parentId !== undefined && { parentId }),
  });

  it('should cascade parent movement to its children', () => {
    // Setup: Parent with 2 children
    // Parent: 2026-01-01 to 2026-01-10
    // Child 1: 2026-01-02 to 2026-01-04 (inside parent)
    // Child 2: 2026-01-05 to 2026-01-08 (inside parent)
    const tasks: Task[] = [
      createTask('parent', 'Parent Task', '2026-01-01', '2026-01-10'),
      createTask('child1', 'Child 1', '2026-01-02', '2026-01-04', 'parent'),
      createTask('child2', 'Child 2', '2026-01-05', '2026-01-08', 'parent'),
    ];

    // User drags parent 5 days forward
    // Parent should move to: 2026-01-06 to 2026-01-15
    // Child 1 should move to: 2026-01-07 to 2026-01-09
    // Child 2 should move to: 2026-01-10 to 2026-01-13
    const newStart = new Date(Date.UTC(2026, 0, 6)); // 2026-01-06
    const newEnd = new Date(Date.UTC(2026, 0, 15));  // 2026-01-15

    const result = cascadeByLinks('parent', newStart, newEnd, tasks);

    console.log('Test result:', result.map(t => ({
      id: t.id,
      name: t.name,
      start: t.startDate,
      end: t.endDate,
    })));

    // EXPECTED: Both children should be in the result
    expect(result.length).toBe(2); // child1 and child2

    const child1Result = result.find(t => t.id === 'child1');
    const child2Result = result.find(t => t.id === 'child2');

    expect(child1Result).toBeDefined();
    expect(child2Result).toBeDefined();

    // Children should have moved by the same delta (5 days)
    expect(child1Result!.startDate).toBe('2026-01-07');
    expect(child1Result!.endDate).toBe('2026-01-09');

    expect(child2Result!.startDate).toBe('2026-01-10');
    expect(child2Result!.endDate).toBe('2026-01-13');
  });

  it('should cascade parent movement to nested children (grandchildren)', () => {
    // Setup: Parent -> Child -> Grandchild
    const tasks: Task[] = [
      createTask('parent', 'Parent', '2026-01-01', '2026-01-20'),
      createTask('child', 'Child', '2026-01-02', '2026-01-10', 'parent'),
      createTask('grandchild', 'Grandchild', '2026-01-03', '2026-01-05', 'child'),
    ];

    // Move parent 3 days forward
    const newStart = new Date(Date.UTC(2026, 0, 4)); // 2026-01-04
    const newEnd = new Date(Date.UTC(2026, 0, 23));  // 2026-01-23

    const result = cascadeByLinks('parent', newStart, newEnd, tasks);

    console.log('Nested test result:', result.map(t => ({
      id: t.id,
      start: t.startDate,
      end: t.endDate,
    })));

    // EXPECTED: Child and grandchild should both be in result
    expect(result.length).toBe(2);

    const childResult = result.find(t => t.id === 'child');
    const grandchildResult = result.find(t => t.id === 'grandchild');

    expect(childResult).toBeDefined();
    expect(grandchildResult).toBeDefined();

    // Both should have moved 3 days
    expect(childResult!.startDate).toBe('2026-01-05');
    expect(childResult!.endDate).toBe('2026-01-13');

    expect(grandchildResult!.startDate).toBe('2026-01-06');
    expect(grandchildResult!.endDate).toBe('2026-01-08');
  });
});
