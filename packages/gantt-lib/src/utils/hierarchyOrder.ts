import type { Task } from '../types';

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
