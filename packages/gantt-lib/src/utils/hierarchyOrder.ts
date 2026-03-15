import type { Task } from '../types';
import { computeParentDates, computeParentProgress, isTaskParent } from './dependencyUtils';
import { normalizeTaskDates } from './dateUtils';

/**
 * Build a stable depth-first task order from parentId links.
 * Sibling order follows the order in the input array.
 * Tasks with missing parents are treated as root tasks.
 */
export function flattenHierarchy<T extends Task>(tasks: T[]): T[] {
  console.log('=== FLATTEN HIERARCHY START ===');
  console.log('[INPUT]', {
    taskCount: tasks.length,
    tasks: tasks.map(t => ({ id: t.id, name: t.name, parentId: t.parentId, index: tasks.indexOf(t) }))
  });

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const byParent = new Map<string | undefined, T[]>();

  for (const task of tasks) {
    const normalizedParentId = task.parentId && byId.has(task.parentId)
      ? task.parentId
      : undefined;
    const siblings = byParent.get(normalizedParentId) ?? [];
    siblings.push(task);
    byParent.set(normalizedParentId, siblings);
  }

  console.log('[BY PARENT MAP]', Object.fromEntries(
    Array.from(byParent.entries()).map(([parentId, children]) => [
      parentId ?? 'root',
      children.map(c => ({ id: c.id, name: c.name }))
    ])
  ));

  const result: T[] = [];
  const visited = new Set<string>();

  const walk = (parentId?: string) => {
    const children = byParent.get(parentId) ?? [];
    console.log(`[WALK] parentId: ${parentId ?? 'root'}, children: ${children.length}`);
    for (const task of children) {
      if (visited.has(task.id)) continue;
      visited.add(task.id);
      result.push(task);
      console.log(`[WALK] Added: ${task.id} (${task.name}) at position ${result.length - 1}`);
      walk(task.id);
    }
  };

  walk(undefined);

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      result.push(task);
      console.log(`[WALK] Unvisited task added: ${task.id} (${task.name}) at position ${result.length - 1}`);
    }
  }

  console.log('[OUTPUT]', {
    taskCount: result.length,
    order: result.map(t => ({ id: t.id, name: t.name, parentId: t.parentId }))
  });
  console.log('=== FLATTEN HIERARCHY END ===\n');

  return result;
}

/**
 * Normalize hierarchy-aware display fields.
 * Parent task dates and progress are always recomputed from children,
 * taking precedence over any hardcoded parent values from the input.
 * Also normalizes task dates to ensure startDate is always before or equal to endDate.
 */
export function normalizeHierarchyTasks<T extends Task>(tasks: T[]): T[] {
  console.log('=== NORMALIZE HIERARCHY TASKS START ===');
  console.log('[INPUT TASKS]', {
    count: tasks.length,
    tasks: tasks.map((t, i) => ({ id: t.id, name: t.name, parentId: t.parentId, index: i }))
  });

  const orderedTasks = flattenHierarchy(tasks).map((task) => {
    // Normalize dates for all tasks (swap if endDate < startDate)
    const { startDate, endDate } = normalizeTaskDates(task.startDate, task.endDate);
    return { ...task, startDate: startDate as T['startDate'], endDate: endDate as T['endDate'] };
  }) as T[];

  console.log('[AFTER FLATTEN HIERARCHY]', {
    count: orderedTasks.length,
    tasks: orderedTasks.map((t, i) => ({ id: t.id, name: t.name, parentId: t.parentId, index: i }))
  });

  for (const task of [...orderedTasks].reverse()) {
    if (!isTaskParent(task.id, orderedTasks)) continue;

    const { startDate, endDate } = computeParentDates(task.id, orderedTasks);
    const progress = computeParentProgress(task.id, orderedTasks);
    const normalizedStartDate = startDate.toISOString().split('T')[0];
    const normalizedEndDate = endDate.toISOString().split('T')[0];
    const parentIndex = orderedTasks.findIndex((candidate) => candidate.id === task.id);

    if (parentIndex === -1) continue;

    console.log(`[NORMALIZE PARENT] ${task.id} (${task.name})`, {
      oldStart: orderedTasks[parentIndex].startDate,
      oldEnd: orderedTasks[parentIndex].endDate,
      newStart: normalizedStartDate,
      newEnd: normalizedEndDate,
      progress: progress
    });

    orderedTasks[parentIndex] = {
      ...orderedTasks[parentIndex],
      startDate: normalizedStartDate as T['startDate'],
      endDate: normalizedEndDate as T['endDate'],
      progress: progress as T['progress'],
    };
  }

  console.log('[FINAL OUTPUT]', {
    count: orderedTasks.length,
    tasks: orderedTasks.map((t, i) => ({ id: t.id, name: t.name, parentId: t.parentId, index: i }))
  });
  console.log('=== NORMALIZE HIERARCHY TASKS END ===\n');

  return orderedTasks;
}
