/**
 * Dependency validation and cycle detection.
 * Moved from dependencyUtils.ts — verbatim implementations.
 * Zero React/DOM/date-fns imports.
 */

import type { Task, DependencyError, ValidationResult } from './types';

/**
 * Build adjacency list for dependency graph (task -> successors)
 */
export function buildAdjacencyList(tasks: Task[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const task of tasks) {
    graph.set(task.id, []);
  }

  for (const task of tasks) {
    for (const dep of task.dependencies ?? []) {
      graph.get(dep.taskId)?.push(task.id);
    }
  }

  return graph;
}

/**
 * Detect circular dependencies using depth-first search
 */
export function detectCycles(tasks: Task[]): { hasCycle: boolean; cyclePath?: string[] } {
  const graph = buildAdjacencyList(tasks);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(taskId: string): boolean {
    if (visiting.has(taskId)) {
      return true;
    }
    if (visited.has(taskId)) {
      return false;
    }

    visiting.add(taskId);
    path.push(taskId);

    const successors = graph.get(taskId) || [];
    for (const successor of successors) {
      if (dfs(successor)) {
        return true;
      }
    }

    visiting.delete(taskId);
    path.pop();
    visited.add(taskId);
    return false;
  }

  for (const task of tasks) {
    if (dfs(task.id)) {
      return { hasCycle: true, cyclePath: [...path] };
    }
  }

  return { hasCycle: false };
}

/**
 * Validate all dependencies in the task list
 */
export function validateDependencies(tasks: Task[]): ValidationResult {
  const errors: DependencyError[] = [];
  const taskIds = new Set(tasks.map(t => t.id));
  const parentByTaskId = new Map(tasks.map(task => [task.id, task.parentId]));

  function isAncestor(ancestorId: string, taskId: string): boolean {
    const visited = new Set<string>();
    let currentParentId = parentByTaskId.get(taskId);

    while (currentParentId) {
      if (currentParentId === ancestorId) {
        return true;
      }

      if (visited.has(currentParentId)) {
        return false;
      }

      visited.add(currentParentId);
      currentParentId = parentByTaskId.get(currentParentId);
    }

    return false;
  }

  function areHierarchicallyRelated(taskId1: string, taskId2: string): boolean {
    return taskId1 === taskId2 || isAncestor(taskId1, taskId2) || isAncestor(taskId2, taskId1);
  }

  // Check for missing predecessor references
  for (const task of tasks) {
    if (task.dependencies) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep.taskId)) {
          errors.push({
            type: 'missing-task',
            taskId: task.id,
            message: `Dependency references non-existent task: ${dep.taskId}`,
            relatedTaskIds: [dep.taskId],
          });
        }
      }
    }
  }

  // Check for invalid hierarchy links (ancestor <-> descendant)
  for (const task of tasks) {
    if (!task.dependencies) continue;

    for (const dep of task.dependencies) {
      if (!taskIds.has(dep.taskId)) {
        continue;
      }

      if (areHierarchicallyRelated(task.id, dep.taskId)) {
        errors.push({
          type: 'constraint',
          taskId: task.id,
          message: `Dependencies between parent and child tasks are not allowed: ${dep.taskId} -> ${task.id}`,
          relatedTaskIds: [dep.taskId, task.id],
        });
      }
    }
  }

  // Check for cycles
  const cycleResult = detectCycles(tasks);
  if (cycleResult.hasCycle && cycleResult.cyclePath) {
    errors.push({
      type: 'cycle',
      taskId: cycleResult.cyclePath[0],
      message: 'Circular dependency detected',
      relatedTaskIds: cycleResult.cyclePath,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
