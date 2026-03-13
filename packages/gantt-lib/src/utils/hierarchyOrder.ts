import type { Task } from '../types';
import { computeParentDates, computeParentProgress, isTaskParent } from './dependencyUtils';
import { normalizeTaskDates } from './dateUtils';

/**
 * Build a stable depth-first task order from parentId links.
 * Sibling order follows the order in the input array.
 * Tasks with missing parents are treated as root tasks.
 */
export function flattenHierarchy<T extends Task>(tasks: T[]): T[] {
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

  const result: T[] = [];
  const visited = new Set<string>();

  const walk = (parentId?: string) => {
    const children = byParent.get(parentId) ?? [];
    for (const task of children) {
      if (visited.has(task.id)) continue;
      visited.add(task.id);
      result.push(task);
      walk(task.id);
    }
  };

  walk(undefined);

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      result.push(task);
    }
  }

  return result;
}

/**
 * Normalize hierarchy-aware display fields.
 * Parent task dates and progress are always recomputed from children,
 * taking precedence over any hardcoded parent values from the input.
 * Also normalizes task dates to ensure startDate is always before or equal to endDate.
 */
export function normalizeHierarchyTasks<T extends Task>(tasks: T[]): T[] {
  const orderedTasks = flattenHierarchy(tasks).map((task) => {
    // Normalize dates for all tasks (swap if endDate < startDate)
    const { startDate, endDate } = normalizeTaskDates(task.startDate, task.endDate);
    return { ...task, startDate: startDate as T['startDate'], endDate: endDate as T['endDate'] };
  }) as T[];

  for (const task of [...orderedTasks].reverse()) {
    if (!isTaskParent(task.id, orderedTasks)) continue;

    const { startDate, endDate } = computeParentDates(task.id, orderedTasks);
    const progress = computeParentProgress(task.id, orderedTasks);
    const normalizedStartDate = startDate.toISOString().split('T')[0];
    const normalizedEndDate = endDate.toISOString().split('T')[0];
    const parentIndex = orderedTasks.findIndex((candidate) => candidate.id === task.id);

    if (parentIndex === -1) continue;

    orderedTasks[parentIndex] = {
      ...orderedTasks[parentIndex],
      startDate: normalizedStartDate as T['startDate'],
      endDate: normalizedEndDate as T['endDate'],
      progress: progress as T['progress'],
    };
  }

  return orderedTasks;
}
