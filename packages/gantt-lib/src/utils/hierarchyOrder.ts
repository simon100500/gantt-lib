// START_MODULE_CONTRACT
// PURPOSE: Order task hierarchies and roll parent dates/progress from direct children.
// SCOPE: Stable depth-first ordering and one indexed bottom-up normalization pass.
// DEPENDS: scheduling types, dateUtils
// LINKS: M-SCHEDULE, fn-normalizeHierarchyTasks
// ROLE: RUNTIME
// MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
import type { Task } from '../types';
import { normalizeTaskDates } from './dateUtils';

type HierarchyTask = Task & {
  sortOrder?: number;
};

/**
 * Build a stable depth-first task order from parentId links.
 * Sibling order follows the order in the input array.
 * Tasks with missing parents are treated as root tasks.
 */
export function flattenHierarchy<T extends HierarchyTask>(tasks: T[]): T[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const byParent = new Map<string | undefined, T[]>();
  const originalIndexById = new Map(tasks.map((task, index) => [task.id, index]));

  for (const task of tasks) {
    const normalizedParentId = task.parentId && byId.has(task.parentId)
      ? task.parentId
      : undefined;
    const siblings = byParent.get(normalizedParentId) ?? [];
    siblings.push(task);
    byParent.set(normalizedParentId, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => {
      const leftSortOrder = left.sortOrder;
      const rightSortOrder = right.sortOrder;

      if (leftSortOrder !== undefined || rightSortOrder !== undefined) {
        const normalizedLeftSortOrder = leftSortOrder ?? Number.MAX_SAFE_INTEGER;
        const normalizedRightSortOrder = rightSortOrder ?? Number.MAX_SAFE_INTEGER;
        if (normalizedLeftSortOrder !== normalizedRightSortOrder) {
          return normalizedLeftSortOrder - normalizedRightSortOrder;
        }
      }

      return (originalIndexById.get(left.id) ?? 0) - (originalIndexById.get(right.id) ?? 0);
    });
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
export function normalizeHierarchyTasks<T extends HierarchyTask>(tasks: T[]): T[] {
  const orderedTasks = flattenHierarchy(tasks).map((task) => {
    // Normalize dates for all tasks (swap if endDate < startDate)
    const { startDate, endDate } = normalizeTaskDates(task.startDate, task.endDate);
    return { ...task, startDate: startDate as T['startDate'], endDate: endDate as T['endDate'] };
  }) as T[];

  const childrenByParent = new Map<string, number[]>();
  for (let index = 0; index < orderedTasks.length; index++) {
    const parentId = orderedTasks[index].parentId;
    if (!parentId) continue;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(index);
    childrenByParent.set(parentId, children);
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  for (let index = orderedTasks.length - 1; index >= 0; index--) {
    const children = childrenByParent.get(orderedTasks[index].id);
    if (!children?.length) continue;
    let minStart = Infinity;
    let maxEnd = -Infinity;
    let totalWeight = 0;
    let weightedProgress = 0;
    for (const childIndex of children) {
      const child = orderedTasks[childIndex];
      const start = new Date(child.startDate).getTime();
      const end = new Date(child.endDate).getTime();
      minStart = Math.min(minStart, start);
      maxEnd = Math.max(maxEnd, end);
      const duration = (end - start + DAY_MS) / DAY_MS;
      totalWeight += duration;
      weightedProgress += duration * (child.progress ?? 0);
    }
    orderedTasks[index] = {
      ...orderedTasks[index],
      startDate: new Date(minStart).toISOString().split('T')[0] as T['startDate'],
      endDate: new Date(maxEnd).toISOString().split('T')[0] as T['endDate'],
      progress: (totalWeight === 0 ? 0 : Math.round((weightedProgress / totalWeight) * 10) / 10) as T['progress'],
    };
  }

  return orderedTasks;
}
