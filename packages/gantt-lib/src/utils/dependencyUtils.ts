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
 * Get successor tasks of a dragged task using BFS, filtered by link type(s).
 *
 * Returns tasks in breadth-first order (direct successors first, then their successors).
 * The dragged task itself is NOT included in the returned array.
 *
 * The visited set prevents infinite loops in case of cycles (cycle detection already
 * prevents cycles in valid data, but the guard adds safety during cascade computation).
 *
 * @param draggedTaskId - ID of the task being dragged
 * @param allTasks - All tasks in the chart
 * @param linkTypes - Dependency types to follow (default: ['FS'] preserves Phase 7 behavior)
 */
export function getSuccessorChain(
  draggedTaskId: string,
  allTasks: Task[],
  linkTypes: LinkType[] = ['FS']
): Task[] {
  // Build successor map filtered by requested link types: predecessor -> [successors]
  const successorMap = new Map<string, string[]>();
  for (const task of allTasks) {
    successorMap.set(task.id, []);
  }
  for (const task of allTasks) {
    if (!task.dependencies) continue;
    for (const dep of task.dependencies) {
      if (linkTypes.includes(dep.type)) {
        const list = successorMap.get(dep.taskId) ?? [];
        list.push(task.id);
        successorMap.set(dep.taskId, list);
      }
    }
  }

  const taskById = new Map(allTasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const queue: string[] = [draggedTaskId];
  const chain: Task[] = [];
  visited.add(draggedTaskId); // seed — not added to chain

  while (queue.length > 0) {
    const current = queue.shift()!;
    const successors = successorMap.get(current) ?? [];
    for (const sid of successors) {
      if (!visited.has(sid)) {
        visited.add(sid);
        const t = taskById.get(sid);
        if (t) {
          chain.push(t);
          queue.push(sid);
        }
      }
    }
  }

  return chain; // excludes dragged task
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
