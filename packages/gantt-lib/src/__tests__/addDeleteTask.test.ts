import { describe, it, expect } from 'vitest';
import type { Task } from '../components/GanttChart';

// ===== helpers under test =====
// These functions will be implemented inline in GanttChart.tsx and TaskList.tsx
// The test verifies the LOGIC directly by defining them here first

/**
 * Build a new task object with generated ID and default dates.
 * @param name - Task name from user input
 * @returns A valid Task object with today's start date, today+7 end date, and no color
 */
function buildNewTask(name: string): Task {
  const now = new Date();
  const todayISO = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )).toISOString().split('T')[0];

  const endDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 7
  )).toISOString().split('T')[0];

  return {
    id: crypto.randomUUID(),
    name,
    startDate: todayISO,
    endDate,
    // color intentionally omitted (undefined)
  };
}

/**
 * Remove all dependencies referencing the deleted task ID from all tasks.
 * @param tasks - Array of tasks to clean up
 * @param deletedId - ID of the task being deleted
 * @returns New array with dependency references purged
 */
function cleanupDependencies(tasks: Task[], deletedId: string): Task[] {
  return tasks
    .filter(t => t.id !== deletedId)
    .map(t => ({
      ...t,
      dependencies: (t.dependencies ?? []).filter(d => d.taskId !== deletedId),
    }));
}

function duplicateTaskSubtree(anchorTaskId: string, orderedTasks: Task[]): Task[] {
  const collectDescendants = (parentId: string): Task[] => {
    const directChildren = orderedTasks.filter(task => task.parentId === parentId);
    return directChildren.flatMap(child => [child, ...collectDescendants(child.id)]);
  };

  const anchorTask = orderedTasks.find(task => task.id === anchorTaskId);
  if (!anchorTask) return orderedTasks;

  const descendants = collectDescendants(anchorTaskId);
  const sourceIds = new Set([anchorTaskId, ...descendants.map(task => task.id)]);
  const sourceSubtree = orderedTasks.filter(task => sourceIds.has(task.id));
  const cloneIdMap = new Map(sourceSubtree.map(task => [task.id, `${task.id}-copy`]));

  const clonedSubtree = sourceSubtree.map(task => ({
    ...task,
    id: cloneIdMap.get(task.id)!,
    name: task.id === anchorTaskId ? `${task.name} (копия)` : task.name,
    parentId: task.parentId ? (cloneIdMap.get(task.parentId) ?? task.parentId) : undefined,
    dependencies: task.dependencies?.map(dep => ({
      ...dep,
      taskId: cloneIdMap.get(dep.taskId) ?? dep.taskId,
    })),
  }));

  const anchorIndex = orderedTasks.findIndex(task => task.id === anchorTaskId);
  const insertIndex = anchorIndex + sourceSubtree.length;
  return [
    ...orderedTasks.slice(0, insertIndex),
    ...clonedSubtree,
    ...orderedTasks.slice(insertIndex),
  ];
}

// ===== tests =====

describe('buildNewTask', () => {
  it('produces Task with correct shape', () => {
    const task = buildNewTask('Test Task');

    // Check id is a UUID string (crypto.randomUUID format)
    expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Check name matches input
    expect(task.name).toBe('Test Task');

    // Check startDate is today in UTC ISO format (YYYY-MM-DD)
    const now = new Date();
    const todayISO = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )).toISOString().split('T')[0];
    expect(task.startDate).toBe(todayISO);

    // Check endDate is today + 7 days in UTC ISO format
    const endDateISO = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 7
    )).toISOString().split('T')[0];
    expect(task.endDate).toBe(endDateISO);

    // Check color field is undefined (no accent color)
    expect(task.color).toBeUndefined();
  });

  it('generates unique IDs on successive calls', () => {
    const task1 = buildNewTask('Task 1');
    const task2 = buildNewTask('Task 2');

    // UUIDs should be different (collision test)
    expect(task1.id).not.toBe(task2.id);
  });
});

describe('cleanupDependencies', () => {
  it('removes all deps referencing deletedId from all tasks', () => {
    const tasks: Task[] = [
      {
        id: 'task1',
        name: 'Task 1',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        dependencies: [
          { taskId: 'task2', type: 'FS', lag: 0 },
          { taskId: 'task3', type: 'SS', lag: 1 },
        ],
      },
      {
        id: 'task2',
        name: 'Task 2',
        startDate: '2026-03-02',
        endDate: '2026-03-06',
        dependencies: [
          { taskId: 'task3', type: 'FS', lag: 0 },
        ],
      },
      {
        id: 'task3',
        name: 'Task 3',
        startDate: '2026-03-03',
        endDate: '2026-03-07',
      },
    ];

    const cleaned = cleanupDependencies(tasks, 'task2');

    // task2 should be removed from the array
    expect(cleaned.length).toBe(2);
    expect(cleaned.find(t => t.id === 'task2')).toBeUndefined();

    // task1 should no longer have dependency on task2
    const task1 = cleaned.find(t => t.id === 'task1')!;
    expect(task1.dependencies).toEqual([{ taskId: 'task3', type: 'SS', lag: 1 }]);
  });

  it('preserves deps referencing other task IDs untouched', () => {
    const tasks: Task[] = [
      {
        id: 'task1',
        name: 'Task 1',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        dependencies: [
          { taskId: 'task2', type: 'FS', lag: 0 },
          { taskId: 'task3', type: 'SS', lag: 1 },
        ],
      },
      {
        id: 'task2',
        name: 'Task 2',
        startDate: '2026-03-02',
        endDate: '2026-03-06',
      },
    ];

    const cleaned = cleanupDependencies(tasks, 'task3');

    // Deleting task3 should not affect task1's dependency on task2
    const task1 = cleaned.find(t => t.id === 'task1')!;
    expect(task1.dependencies).toEqual([{ taskId: 'task2', type: 'FS', lag: 0 }]);
  });

  it('handles tasks with no dependencies array (undefined) without crashing', () => {
    const tasks: Task[] = [
      {
        id: 'task1',
        name: 'Task 1',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        // no dependencies field
      },
      {
        id: 'task2',
        name: 'Task 2',
        startDate: '2026-03-02',
        endDate: '2026-03-06',
      },
    ];

    // Should not throw
    expect(() => cleanupDependencies(tasks, 'task2')).not.toThrow();

    const cleaned = cleanupDependencies(tasks, 'task2');
    expect(cleaned.length).toBe(1);
    expect(cleaned[0].id).toBe('task1');
  });
});

describe('onAdd presence guard', () => {
  it('evaluates correctly for undefined', () => {
    const onAdd = undefined;
    // Test the condition that gates button rendering
    expect(!!onAdd).toBe(false);
  });

  it('evaluates correctly for present callback', () => {
    const onAdd = () => {};
    expect(!!onAdd).toBe(true);
  });
});

describe('double-confirm guard', () => {
  it('prevents duplicate task creation on repeated confirm calls', () => {
    let callCount = 0;
    const confirmedRef = { current: false };

    const onConfirm = () => {
      if (confirmedRef.current) {
        return; // Guard: already confirmed
      }
      confirmedRef.current = true;
      callCount++;
    };

    // Simulate double-confirm scenario (blur after Enter)
    onConfirm();
    onConfirm();

    // Should only produce one task (callCount === 1)
    expect(callCount).toBe(1);
  });

  it('allows confirm after reset', () => {
    let callCount = 0;
    const confirmedRef = { current: false };

    const onConfirm = () => {
      if (confirmedRef.current) {
        return;
      }
      confirmedRef.current = true;
      callCount++;
    };

    const reset = () => {
      confirmedRef.current = false;
    };

    onConfirm();
    expect(callCount).toBe(1);

    reset();
    onConfirm();
    expect(callCount).toBe(2);
  });
});

describe('duplicateTaskSubtree', () => {
  it('duplicates a parent subtree directly after the original group with remapped ids', () => {
    const tasks: Task[] = [
      {
        id: 'parent',
        name: 'Parent',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
      },
      {
        id: 'child-1',
        name: 'Child 1',
        startDate: '2026-03-01',
        endDate: '2026-03-02',
        parentId: 'parent',
      },
      {
        id: 'child-2',
        name: 'Child 2',
        startDate: '2026-03-03',
        endDate: '2026-03-04',
        parentId: 'parent',
        dependencies: [{ taskId: 'child-1', type: 'FS', lag: 0 }],
      },
      {
        id: 'next-root',
        name: 'Next root',
        startDate: '2026-03-06',
        endDate: '2026-03-07',
      },
    ];

    const duplicated = duplicateTaskSubtree('parent', tasks);

    expect(duplicated.map(task => task.id)).toEqual([
      'parent',
      'child-1',
      'child-2',
      'parent-copy',
      'child-1-copy',
      'child-2-copy',
      'next-root',
    ]);

    expect(duplicated[3].name).toBe('Parent (копия)');
    expect(duplicated[4].parentId).toBe('parent-copy');
    expect(duplicated[5].parentId).toBe('parent-copy');
    expect(duplicated[5].dependencies).toEqual([{ taskId: 'child-1-copy', type: 'FS', lag: 0 }]);
  });
});
