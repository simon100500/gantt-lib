/**
 * Hierarchy scheduling functions.
 * Moved from dependencyUtils.ts — verbatim implementations.
 * Zero React/DOM/date-fns imports.
 */

import type { Task } from './types';

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

/**
 * Compute parent task dates from children.
 * Returns { startDate, endDate } where:
 * - startDate = min(children.startDate) or own startDate if no children
 * - endDate = max(children.endDate) or own endDate if no children
 */
export function computeParentDates(parentId: string, tasks: Task[]): { startDate: Date; endDate: Date } {
  const children = getChildren(parentId, tasks);

  if (children.length === 0) {
    const parent = tasks.find(t => t.id === parentId);
    const start = parent ? new Date(parent.startDate) : new Date();
    const end = parent ? new Date(parent.endDate) : new Date();
    return { startDate: start, endDate: end };
  }

  const startDates = children.map(c => new Date(c.startDate));
  const endDates = children.map(c => new Date(c.endDate));

  const minTime = Math.min(...startDates.map(d => d.getTime()));
  const maxTime = Math.max(...endDates.map(d => d.getTime()));

  return {
    startDate: new Date(minTime),
    endDate: new Date(maxTime),
  };
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

  const DAY_MS = 24 * 60 * 60 * 1000;
  let totalWeight = 0;
  let weightedSum = 0;

  for (const child of children) {
    const start = new Date(child.startDate).getTime();
    const end = new Date(child.endDate).getTime();
    // Inclusive duration: (end - start + 1 day) / DAY_MS
    const duration = (end - start + DAY_MS) / DAY_MS;
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
