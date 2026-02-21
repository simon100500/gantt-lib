import { Task, TaskDependency, LinkType, ValidationResult, DependencyError } from '../types';

/**
 * Build adjacency list for dependency graph (task -> successors)
 */
export function buildAdjacencyList(tasks: Task[]): Map<string, string[]> {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const graph = new Map<string, string[]>();

  for (const task of tasks) {
    const successors: string[] = [];

    // Find all tasks that depend on this task (this task is a predecessor)
    for (const otherTask of tasks) {
      if (otherTask.dependencies) {
        for (const dep of otherTask.dependencies) {
          if (dep.taskId === task.id) {
            successors.push(otherTask.id);
            break;
          }
        }
      }
    }

    graph.set(task.id, successors);
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
      // Found cycle - current task is already in recursion stack
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
 * Calculate successor date based on predecessor dates, link type, and lag
 *
 * Link type semantics:
 * - FS: Successor start = Predecessor end + lag
 * - SS: Successor start = Predecessor start + lag
 * - FF: Successor end = Predecessor end + lag
 * - SF: Successor end = Predecessor start + lag
 */
export function calculateSuccessorDate(
  predecessorStart: Date,
  predecessorEnd: Date,
  linkType: LinkType,
  lag: number = 0
): Date {
  // Base date: predecessor end for F* types, predecessor start for S* types
  const baseDate = linkType.startsWith('F') ? predecessorEnd : predecessorStart;

  // Apply lag (in days, converted to milliseconds)
  const lagMs = lag * 24 * 60 * 60 * 1000;
  const resultDate = new Date(baseDate.getTime() + lagMs);

  return resultDate;
}

/**
 * Validate all dependencies in the task list
 */
export function validateDependencies(tasks: Task[]): ValidationResult {
  const errors: DependencyError[] = [];
  const taskIds = new Set(tasks.map(t => t.id));

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

/**
 * Get all dependency edges for rendering
 * Returns array of { predecessorId, successorId, type, lag }
 */
export function getAllDependencyEdges(tasks: Task[]): Array<{
  predecessorId: string;
  successorId: string;
  type: LinkType;
  lag: number;
}> {
  const edges: Array<{ predecessorId: string; successorId: string; type: LinkType; lag: number }> = [];

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
