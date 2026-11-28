/**
 * Hierarchy scheduling functions.
 * Moved from dependencyUtils.ts — verbatim implementations.
 * Zero React/DOM/date-fns imports.
 */

// START_MODULE_CONTRACT
//   PURPOSE: Query task hierarchy and build parent/descendant progress updates.
//   SCOPE: Child/descendant lookup, fixed-boundary-aware parent date/progress rollups, and boundary progress batch updates.
//   INPUTS: Task hierarchy including optional fixed date-only boundaries.
//   OUTPUTS: Parent ranges and descendant progress updates.
//   DEPENDS: scheduling types
//   LINKS: M-SCHEDULE, fn-getAllDescendants, fn-cascadeTaskProgress
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT

import type { Task } from './types';
import { parseDateOnly, DAY_MS } from './dateMath';
import { resolveFixedDates, resolveParentFixedDates } from './fixedDates';

/**
 * Get all child tasks of a parent task.
 * Returns tasks where task.parentId === parentId.
 */
export function getChildren(parentId: string, tasks: Task[]): Task[] {
  return tasks.filter(t => (t as any).parentId === parentId);
}

/**
 * Check if a task is a parent (has children).
 * Returns true if any task has this task as parentId.
 */
export function isTaskParent(taskId: string, tasks: Task[]): boolean {
  return tasks.some(t => (t as any).parentId === taskId);
}

/** Bounds of recorded dates, keeping an unknown boundary open. */
export function getChildDateBounds(children: Iterable<Pick<Task, 'startDate' | 'endDate'>>) {
  let earliestStart = Infinity, latestEnd = -Infinity;
  let earliestKnown = Infinity, latestKnown = -Infinity;
  for (const child of children) {
    const start = +parseDateOnly(child.startDate);
    const end = +parseDateOnly(child.endDate);
    if (Number.isFinite(start)) {
      earliestStart = Math.min(earliestStart, start);
      earliestKnown = Math.min(earliestKnown, start);
      latestKnown = Math.max(latestKnown, start);
    }
    if (Number.isFinite(end)) {
      latestEnd = Math.max(latestEnd, end);
      earliestKnown = Math.min(earliestKnown, end);
      latestKnown = Math.max(latestKnown, end);
    }
  }
  const hasStart = Number.isFinite(earliestStart);
  const hasEnd = Number.isFinite(latestEnd);
  return {
    start: new Date(hasStart && hasEnd ? earliestKnown : earliestStart),
    end: new Date(hasStart && hasEnd ? latestKnown : latestEnd),
  };
}

/**
 * Compute parent task dates from children.
 * Returns { startDate, endDate } where:
 * - startDate = min(children.startDate) or own startDate if no children
 * - endDate = max(children.endDate) or own endDate if no children
 */
export function computeParentDates(parentId: string, tasks: Task[], businessDays = false, weekendPredicate?: (date: Date) => boolean): { startDate: Date; endDate: Date } {
  const children = getChildren(parentId, tasks);

  if (children.length === 0) {
    const parent = tasks.find(t => t.id === parentId);
    const start = parseDateOnly(parent?.startDate);
    const end = parseDateOnly(parent?.endDate);
    const range = parent ? resolveFixedDates(parent, { start, end }, false) : { start, end };
    return { startDate: range.start, endDate: range.end };
  }

  const parent = tasks.find(t => t.id === parentId);
  const range = getChildDateBounds(children);
  const resolved = parent ? resolveParentFixedDates(parent, range, id => tasks.find(task => task.id === id), businessDays, weekendPredicate) : range;
  return { startDate: resolved.start, endDate: resolved.end };
}

export function getChildDurationWeight(task: Task): number {
  if (!task.startDate || !task.endDate) return task.durationDays ?? 0;
  return (+parseDateOnly(task.endDate) - +parseDateOnly(task.startDate) + DAY_MS) / DAY_MS;
}

/**
 * Compute parent task progress from children (weighted average by duration).
 * Returns 0 if no children.
 * Progress is rounded to 1 decimal place.
 */
export function computeParentProgress(parentId: string, tasks: Task[]): number {
  const children = getChildren(parentId, tasks);

  if (children.length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const child of children) {
    const duration = getChildDurationWeight(child);
    const progress = (child.progress ?? 0);

    totalWeight += duration;
    weightedSum += duration * progress;
  }

  if (totalWeight === 0) {
    return 0;
  }

  // Round to 1 decimal place
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

/**
 * Get all descendant tasks of a parent task (transitive closure of children).
 * Returns all tasks where task.parentId is in the hierarchy of the parent.
 */
export function getAllDescendants(parentId: string, tasks: Task[]): Task[] {
  const descendants: Task[] = [];
  const visited = new Set<string>();

  function collectChildren(taskId: string) {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const children = getChildren(taskId, tasks);
    for (const child of children) {
      descendants.push(child);
      collectChildren(child.id);
    }
  }

  collectChildren(parentId);
  return descendants;
}

/**
 * Propagate an explicit boundary progress value through a task subtree.
 *
 * Fractional parent progress is intentionally left untouched: without
 * knowing which child work was completed, there is no reliable distribution.
 * Returns the changed parent and descendants as one sparse update batch.
 */
export function cascadeTaskProgress(task: Task, tasks: Task[]): Task[] {
  const progress = task.progress;
  if (progress !== 0 && progress !== 100) {
    return [task];
  }

  const descendants = getAllDescendants(task.id, tasks);
  if (descendants.length === 0) {
    return [task];
  }

  return [
    { ...task, progress },
    ...descendants.map((descendant) => ({ ...descendant, progress })),
  ];
}

/**
 * Get all dependency edges for rendering.
 * Returns array of { predecessorId, successorId, type, lag }
 */
export function getAllDependencyEdges(tasks: Task[]): Array<{
  predecessorId: string;
  successorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag: number;
}> {
  const edges: Array<{ predecessorId: string; successorId: string; type: 'FS' | 'SS' | 'FF' | 'SF'; lag: number }> = [];

  for (const task of tasks) {
    if (task.dependencies) {
      for (const dep of task.dependencies) {
        edges.push({
          predecessorId: dep.taskId,
          successorId: task.id,
          type: dep.type,
          lag: dep.lag ?? 0,
        });
      }
    }
  }

  return edges;
}

/**
 * Remove dependencies between two tasks in both directions.
 */
export function removeDependenciesBetweenTasks(
  taskId1: string,
  taskId2: string,
  tasks: Task[]
): Task[] {
  return tasks.map(task => {
    if (task.id === taskId1 || task.id === taskId2) {
      if (!task.dependencies) return task;
      const otherTaskId = task.id === taskId1 ? taskId2 : taskId1;
      const filteredDependencies = task.dependencies.filter(dep => dep.taskId !== otherTaskId);
      if (filteredDependencies.length === task.dependencies.length) {
        return task;
      }
      return {
        ...task,
        dependencies: filteredDependencies.length > 0 ? filteredDependencies : undefined,
      };
    }
    return task;
  });
}

/**
 * Find the parent ID of a task.
 */
export function findParentId(taskId: string, tasks: Task[]): string | undefined {
  const task = tasks.find(t => t.id === taskId);
  return task?.parentId;
}

/**
 * Returns true when ancestorId is an ancestor of taskId in the current hierarchy.
 */
export function isAncestorTask(ancestorId: string, taskId: string, tasks: Task[]): boolean {
  const taskById = new Map(tasks.map(task => [task.id, task]));
  const visited = new Set<string>();
  let current = taskById.get(taskId);

  while (current?.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }

    if (visited.has(current.parentId)) {
      return false;
    }

    visited.add(current.parentId);
    current = taskById.get(current.parentId);
  }

  return false;
}

/**
 * Returns true when tasks are in the same ancestry chain.
 */
export function areTasksHierarchicallyRelated(taskId1: string, taskId2: string, tasks: Task[]): boolean {
  if (taskId1 === taskId2) {
    return true;
  }

  return isAncestorTask(taskId1, taskId2, tasks) || isAncestorTask(taskId2, taskId1, tasks);
}
