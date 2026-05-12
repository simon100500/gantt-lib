import type { Task } from '../types';
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

  const taskIndexById = new Map<string, number>();
  const childrenByParentId = new Map<string, T[]>();

  orderedTasks.forEach((task, index) => {
    taskIndexById.set(task.id, index);
    if (!task.parentId) return;

    const children = childrenByParentId.get(task.parentId) ?? [];
    children.push(task);
    childrenByParentId.set(task.parentId, children);
  });

  for (const task of [...orderedTasks].reverse()) {
    const children = childrenByParentId.get(task.id);
    if (!children?.length) continue;

    let minStartMs = Number.POSITIVE_INFINITY;
    let maxEndMs = Number.NEGATIVE_INFINITY;
    let totalWeight = 0;
    let weightedProgress = 0;

    for (const child of children) {
      const childIndex = taskIndexById.get(child.id);
      const normalizedChild = childIndex !== undefined ? orderedTasks[childIndex] : child;
      const childStartMs = new Date(normalizedChild.startDate).getTime();
      const childEndMs = new Date(normalizedChild.endDate).getTime();
      const durationDays = Math.max(1, Math.round((childEndMs - childStartMs) / (24 * 60 * 60 * 1000)) + 1);

      minStartMs = Math.min(minStartMs, childStartMs);
      maxEndMs = Math.max(maxEndMs, childEndMs);
      totalWeight += durationDays;
      weightedProgress += durationDays * (normalizedChild.progress ?? 0);
    }

    const normalizedStartDate = new Date(minStartMs).toISOString().split('T')[0];
    const normalizedEndDate = new Date(maxEndMs).toISOString().split('T')[0];
    const progress = totalWeight > 0
      ? Math.round((weightedProgress / totalWeight) * 10) / 10
      : 0;
    const parentIndex = taskIndexById.get(task.id);

    if (parentIndex === undefined) continue;

    orderedTasks[parentIndex] = {
      ...orderedTasks[parentIndex],
      startDate: normalizedStartDate as T['startDate'],
      endDate: normalizedEndDate as T['endDate'],
      progress: progress as T['progress'],
    };
  }

  return orderedTasks;
}
