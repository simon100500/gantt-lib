import { Task, TaskDependency, LinkType, ValidationResult, DependencyError } from '../types';
import { getBusinessDaysCount, addBusinessDays, subtractBusinessDays } from './dateUtils';

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
 * Compute lag (in days) from actual predecessor/successor dates.
 * This is the single source of truth for lag semantics across chips, arrows, and drag.
 *
 * Semantics (lag=0 = natural, gap-free connection):
 * - FS: lag = succStart - predEnd - 1  (adjacent days = 0)
 * - SS: lag = succStart - predStart
 * - FF: lag = succEnd   - predEnd
 * - SF: lag = succEnd   - predStart + 1  (symmetric to FS)
 */
export function computeLagFromDates(
  linkType: LinkType,
  predStart: Date,
  predEnd: Date,
  succStart: Date,
  succEnd: Date,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean
): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const pS = Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate());
  const pE = Date.UTC(predEnd.getUTCFullYear(),   predEnd.getUTCMonth(),   predEnd.getUTCDate());
  const sS = Date.UTC(succStart.getUTCFullYear(), succStart.getUTCMonth(), succStart.getUTCDate());
  const sE = Date.UTC(succEnd.getUTCFullYear(),   succEnd.getUTCMonth(),   succEnd.getUTCDate());

  // Calendar days (original logic)
  if (!businessDays || !weekendPredicate) {
    switch (linkType) {
      case 'FS': return Math.round((sS - pE) / DAY_MS) - 1;
      case 'SS': return Math.round((sS - pS) / DAY_MS);
      case 'FF': return Math.round((sE - pE) / DAY_MS);
      case 'SF': return Math.round((sE - pS) / DAY_MS) + 1;
    }
  }

  // Business days: count business days between dates
  // Lag = (business days between dates) - expected for link type
  const predDays = linkType === 'SS' || linkType === 'SF' ? predStart : predEnd;
  const succDays = linkType === 'FS' || linkType === 'SS' ? succStart : succEnd;
  const businessLag = getBusinessDaysCount(predDays, succDays, weekendPredicate) - 1;

  switch (linkType) {
    case 'FS': return businessLag; // FS: adjacent = 0 business days
    case 'SS': return businessLag;
    case 'FF': return businessLag;
    case 'SF': return businessLag;
  }
}

/**
 * Calculate successor date based on predecessor dates, link type, and lag
 *
 * Link type semantics:
 * - FS: Successor start = Predecessor end + lag + 1 day  (lag=0 → next day)
 * - SS: Successor start = Predecessor start + lag
 * - FF: Successor end   = Predecessor end + lag
 * - SF: Successor end   = Predecessor start + lag - 1 day  (lag=0 → day before)
 */
export function calculateSuccessorDate(
  predecessorStart: Date,
  predecessorEnd: Date,
  linkType: LinkType,
  lag: number = 0,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean
): Date {
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Calendar days (original logic)
  if (!businessDays || !weekendPredicate) {
    switch (linkType) {
      case 'FS':
        // lag=0 → successor starts the day after predecessor ends (inclusive dates)
        return new Date(predecessorEnd.getTime() + (lag + 1) * DAY_MS);
      case 'SS':
        return new Date(predecessorStart.getTime() + lag * DAY_MS);
      case 'FF':
        return new Date(predecessorEnd.getTime() + lag * DAY_MS);
      case 'SF':
        // lag=0 → successor ends the day before predecessor starts (inclusive dates)
        return new Date(predecessorStart.getTime() + (lag - 1) * DAY_MS);
    }
  }

  // Business days: use addBusinessDays
  const anchorDate = (linkType === 'FS' || linkType === 'FF') ? predecessorEnd : predecessorStart;
  // Convert anchorDate to YYYY-MM-DD for addBusinessDays
  const anchorDateStr = anchorDate.toISOString().split('T')[0];

  // For FS: lag=0 means next business day (addBusinessDays(1))
  // For SS/FF: lag=0 means same day (addBusinessDays(0) + 1 for anchor day itself)
  // For SF: lag=0 means day before (negative logic)
  let daysToAdd: number;
  switch (linkType) {
    case 'FS':
      daysToAdd = lag + 1; // lag=0 → 1 business day after
      break;
    case 'SS':
      daysToAdd = lag; // lag=0 → same day (0 days added)
      break;
    case 'FF':
      daysToAdd = lag; // lag=0 → same day
      break;
    case 'SF':
      daysToAdd = lag - 1; // lag=0 → -1 (day before)
      break;
  }

  // Minimum 1 business day for FS/SS/FF when lag >= 0
  const adjustedDays = (linkType !== 'SF' && lag >= 0) ? Math.max(1, daysToAdd) : daysToAdd;
  const resultDateStr = addBusinessDays(anchorDateStr, adjustedDays, weekendPredicate);
  return new Date(resultDateStr + 'T00:00:00.000Z');
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
 * Cascade successors by actual link constraints (BFS, constraint-based).
 *
 * Each successor in the chain is positioned using calculateSuccessorDate
 * with the predecessor's NEW dates and the actual lag — not a flat delta.
 *
 * - FS/SS: constraintDate = new start of successor (duration preserved)
 * - FF/SF: constraintDate = new end of successor (duration preserved)
 *
 * Locked tasks break the chain.
 * Also cascades hierarchy children when a parent moves (when parent moves by
 * dependency link, children must move with it to maintain parent-child relationship).
 * Returns only the cascaded successors (not the moved task itself).
 */
export function cascadeByLinks(
  movedTaskId: string,
  newStart: Date,
  newEnd: Date,
  allTasks: Task[],
  skipChildCascade: boolean = false
): Task[] {
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  // Track each task's updated dates
  const updatedDates = new Map<string, { start: Date; end: Date }>();
  updatedDates.set(movedTaskId, { start: newStart, end: newEnd });

  const result: Task[] = [];
  const queue: string[] = [movedTaskId];
  const visited = new Set<string>([movedTaskId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const { start: predStart, end: predEnd } = updatedDates.get(currentId)!;

    // First, cascade hierarchy children of the current task if it's a parent
    // Skip if skipChildCascade is true (for parent task editing via task list)
    if (!skipChildCascade) {
      const children = getChildren(currentId, allTasks);
      for (const child of children) {
        if (visited.has(child.id) || child.locked) continue;

        // When a parent moves, its children move by the same delta
        const origStart = new Date(child.startDate as string);
        const origEnd = new Date(child.endDate as string);
        const durationMs = origEnd.getTime() - origStart.getTime();

        const parentOrig = taskById.get(currentId)!;
        const parentOrigStart = new Date(parentOrig.startDate as string);
        const parentOrigEnd = new Date(parentOrig.endDate as string);

        // Calculate delta from parent's original to new position
        const parentStartDelta = predStart.getTime() - parentOrigStart.getTime();
        const parentEndDelta = predEnd.getTime() - parentOrigEnd.getTime();

        const newChildStart = new Date(origStart.getTime() + parentStartDelta);
        const newChildEnd = new Date(origEnd.getTime() + parentEndDelta);

        visited.add(child.id);
        updatedDates.set(child.id, { start: newChildStart, end: newChildEnd });
        result.push({
          ...child,
          startDate: newChildStart.toISOString().split('T')[0],
          endDate: newChildEnd.toISOString().split('T')[0],
        });
        queue.push(child.id);
      }
    }

    // Then, cascade dependency successors
    for (const task of allTasks) {
      if (visited.has(task.id) || !task.dependencies || task.locked) continue;

      for (const dep of task.dependencies) {
        if (dep.taskId !== currentId) continue;

        const orig = taskById.get(task.id)!;
        const origStart = new Date(orig.startDate as string);
        const origEnd = new Date(orig.endDate as string);
        const durationMs = origEnd.getTime() - origStart.getTime();

        // Use effective lag from dates, not stored dep.lag
        const predOrig = taskById.get(currentId)!;
        const predOrigStart = new Date(predOrig.startDate as string);
        const predOrigEnd   = new Date(predOrig.endDate   as string);
        const effectiveLag  = computeLagFromDates(dep.type, predOrigStart, predOrigEnd, origStart, origEnd);

        const constraintDate = calculateSuccessorDate(predStart, predEnd, dep.type, effectiveLag);

        let newSuccStart: Date;
        let newSuccEnd: Date;

        if (dep.type === 'FS' || dep.type === 'SS') {
          newSuccStart = constraintDate;
          newSuccEnd = new Date(constraintDate.getTime() + durationMs);
        } else {
          // FF or SF: constraintDate is the end date
          newSuccEnd = constraintDate;
          newSuccStart = new Date(constraintDate.getTime() - durationMs);
        }

        visited.add(task.id);
        updatedDates.set(task.id, { start: newSuccStart, end: newSuccEnd });
        result.push({
          ...task,
          startDate: newSuccStart.toISOString().split('T')[0],
          endDate: newSuccEnd.toISOString().split('T')[0],
        });
        queue.push(task.id);
        break; // one predecessor per cascade step
      }
    }
  }

  return result;
}

/**
 * Get transitive closure of successors for cascading.
 *
 * Direct successors of the changed task are filtered by firstLevelLinkTypes.
 * Their successors (and so on) are included regardless of link type.
 *
 * Also includes hierarchy children of any parent task in the chain - when a parent
 * moves via dependency cascade, its children must move with it.
 */
export function getTransitiveCascadeChain(
  changedTaskId: string,
  allTasks: Task[],
  firstLevelLinkTypes: LinkType[]
): Task[] {
  const allTypesSuccessorMap = new Map<string, Task[]>();
  for (const task of allTasks) {
    allTypesSuccessorMap.set(task.id, []);
  }
  for (const task of allTasks) {
    if (!task.dependencies) continue;
    for (const dep of task.dependencies) {
      const list = allTypesSuccessorMap.get(dep.taskId) ?? [];
      list.push(task);
      allTypesSuccessorMap.set(dep.taskId, list);
    }
  }

  const directChildren = getChildren(changedTaskId, allTasks);
  const directSuccessors = getSuccessorChain(changedTaskId, allTasks, firstLevelLinkTypes);
  const initialChain = [...directChildren, ...directSuccessors].filter((task, index, arr) =>
    arr.findIndex(candidate => candidate.id === task.id) === index
  );

  const chain = [...initialChain];
  const visited = new Set<string>([changedTaskId, ...initialChain.map(t => t.id)]);
  const queue = [...initialChain];

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Add hierarchy children of the current task if it's a parent
    const children = getChildren(current.id, allTasks);
    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        chain.push(child);
        queue.push(child);
      }
    }

    const successors = allTypesSuccessorMap.get(current.id) ?? [];
    for (const successor of successors) {
      if (!visited.has(successor.id)) {
        visited.add(successor.id);
        chain.push(successor);
        queue.push(successor);
      }
    }
  }

  return chain;
}

/**
 * Recalculate incoming dependency lags after a task's dates change.
 * Used when completing a drag or applying a manual date change.
 */
export function recalculateIncomingLags(
  task: Task,
  newStartDate: Date,
  newEndDate: Date,
  allTasks: Task[]
): NonNullable<Task['dependencies']> {
  if (!task.dependencies) return [];
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  return task.dependencies.map(dep => {
    const predecessor = taskById.get(dep.taskId);
    if (!predecessor) return dep;

    const predStart = new Date(predecessor.startDate as string);
    const predEnd   = new Date(predecessor.endDate   as string);
    const lagDays   = computeLagFromDates(dep.type, predStart, predEnd, newStartDate, newEndDate);
    return { ...dep, lag: lagDays };
  });
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

// ============================================================================
// Hierarchy Utilities (Phase 19)
// ============================================================================

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
    // Empty parent - use own dates or default
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
 * Remove dependencies between two tasks in both directions.
 * When tasks become parent-child, their dependency link becomes meaningless.
 *
 * @param taskId1 - First task ID
 * @param taskId2 - Second task ID
 * @param tasks - All tasks array
 * @returns New tasks array with dependencies between the two tasks removed
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
      // Only create new object if dependencies actually changed
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
 * Returns the parentId of the task if found, undefined otherwise.
 *
 * @param taskId - ID of the task to find parent for
 * @param tasks - All tasks array
 * @returns Parent task ID or undefined if task is root or not found
 */
export function findParentId(taskId: string, tasks: Task[]): string | undefined {
  const task = tasks.find(t => t.id === taskId);
  return task?.parentId;
}

/**
 * Get all descendant tasks of a parent task (transitive closure of children).
 * Returns all tasks where task.parentId is in the hierarchy of the parent.
 *
 * @param parentId - ID of the parent task
 * @param tasks - All tasks array
 * @returns Array of descendant tasks (not including the parent itself)
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

// ============================================================================
// Universal Cascade Engine (Phase 19 fix)
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How a task arrived in the BFS queue — controls which rules apply when
 * processing it.
 *
 *  'direct'       — The explicitly moved task (seed).
 *  'child-delta'  — Added by RULE 1: parent dragged, child inherits delta.
 *                   Children of THIS task also inherit the same delta (RULE 1 applies).
 *  'parent-recalc'— Added by RULE 2: a child moved, parent recomputed from children.
 *                   Children of THIS task must NOT be shifted again (RULE 1 skipped).
 *  'dependency'   — Added by RULE 3: predecessor moved, successor repositioned.
 *                   Children of THIS task inherit the delta (RULE 1 applies).
 */
type ArrivalMode = 'direct' | 'child-delta' | 'parent-recalc' | 'dependency';

/**
 * Universal cascade engine that propagates a moved task's new position through
 * the entire dependency+hierarchy graph using BFS with change detection.
 *
 * Three rules applied in BFS order:
 *
 *   RULE 1 — Hierarchy children of a parent task shift by the parent's delta.
 *            Applied only when the parent arrived as 'direct', 'child-delta', or 'dependency'.
 *            Skipped for 'parent-recalc' (parent was computed FROM children).
 *
 *   RULE 2 — Parent task is recomputed as min(children.start)..max(children.end).
 *            Re-queued every time a child changes (no visited guard — uses change detection).
 *            This ensures the parent reflects ALL cascaded children, not just the first one.
 *
 *   RULE 3 — Dependency successors are repositioned via calculateSuccessorDate.
 *            Effective lag is computed from original dates (not stored dep.lag).
 *            Re-queued if predecessor's dates changed (change detection).
 *
 * Change detection prevents infinite loops: a task is only re-queued if its
 * computed dates differ from what's already in updatedDates.
 *
 * @param movedTask  - The task that was directly moved/resized (already has new dates).
 * @param newStart   - New start date of the moved task.
 * @param newEnd     - New end date of the moved task.
 * @param allTasks   - All tasks in the chart (original, unmodified dates).
 * @param businessDays - If true, dependency calculations skip weekends.
 * @param weekendPredicate - Function that returns true for weekends.
 */
export function universalCascade(
  movedTask: Task,
  newStart: Date,
  newEnd: Date,
  allTasks: Task[],
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean
): Task[] {
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  // updatedDates: authoritative new position for every affected task
  const updatedDates = new Map<string, { start: Date; end: Date }>();
  updatedDates.set(movedTask.id, { start: newStart, end: newEnd });

  // resultMap: deduplicated results keyed by task ID (updated in place on re-visits)
  const resultMap = new Map<string, Task>();
  resultMap.set(movedTask.id, {
    ...movedTask,
    startDate: newStart.toISOString().split('T')[0],
    endDate: newEnd.toISOString().split('T')[0],
  });

  // Queue entries: [taskId, arrivalMode]
  const queue: Array<[string, ArrivalMode]> = [[movedTask.id, 'direct']];

  // Guard: track which children have been shifted by RULE 1 to prevent double-shift
  const childShifted = new Set<string>();

  // Safety: max iterations to prevent runaway loops
  let iterations = 0;
  const MAX_ITERATIONS = allTasks.length * 3;

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const [currentId, arrivalMode] = queue.shift()!;
    const { start: currStart, end: currEnd } = updatedDates.get(currentId)!;
    const currentOriginal = taskById.get(currentId)!;

    // ── RULE 1: Hierarchy children follow their parent ──────────────────────
    if (arrivalMode !== 'parent-recalc') {
      const children = getChildren(currentId, allTasks);
      for (const child of children) {
        if (childShifted.has(child.id) || child.locked) continue;

        const parentOrigStart = new Date(currentOriginal.startDate as string);
        const parentOrigEnd   = new Date(currentOriginal.endDate   as string);

        const childOrigStart = new Date(child.startDate as string);
        const childOrigEnd   = new Date(child.endDate   as string);

        const startDeltaMs = currStart.getTime() - parentOrigStart.getTime();
        const endDeltaMs   = currEnd.getTime()   - parentOrigEnd.getTime();

        const childNewStart = new Date(childOrigStart.getTime() + startDeltaMs);
        const childNewEnd   = new Date(childOrigEnd.getTime()   + endDeltaMs);

        // Change detection: skip if already at this position
        const prev = updatedDates.get(child.id);
        if (prev && prev.start.getTime() === childNewStart.getTime() && prev.end.getTime() === childNewEnd.getTime()) {
          continue;
        }

        updatedDates.set(child.id, { start: childNewStart, end: childNewEnd });
        childShifted.add(child.id);
        queue.push([child.id, 'child-delta']);
        resultMap.set(child.id, {
          ...child,
          startDate: childNewStart.toISOString().split('T')[0],
          endDate:   childNewEnd.toISOString().split('T')[0],
        });
      }
    }

    // ── RULE 2: Parent task is recomputed from its children ─────────────────
    // No visited guard — always recalculate, re-queue only if dates changed.
    // This ensures parent reflects ALL cascaded children (not just the first).
    const parentId = (currentOriginal as any).parentId as string | undefined;
    if (parentId) {
      const parent = taskById.get(parentId);
      if (parent && !parent.locked) {
        const siblings = getChildren(parentId, allTasks);

        const siblingPositions = siblings.map(sib => {
          if (updatedDates.has(sib.id)) return updatedDates.get(sib.id)!;
          return { start: new Date(sib.startDate as string), end: new Date(sib.endDate as string) };
        });

        const minStart = new Date(Math.min(...siblingPositions.map(p => p.start.getTime())));
        const maxEnd   = new Date(Math.max(...siblingPositions.map(p => p.end.getTime())));

        // Change detection: only re-queue if parent dates actually changed
        const prev = updatedDates.get(parentId);
        if (!prev || prev.start.getTime() !== minStart.getTime() || prev.end.getTime() !== maxEnd.getTime()) {
          updatedDates.set(parentId, { start: minStart, end: maxEnd });
          queue.push([parentId, 'parent-recalc']);
          resultMap.set(parentId, {
            ...parent,
            startDate: minStart.toISOString().split('T')[0],
            endDate:   maxEnd.toISOString().split('T')[0],
          });
        }
      }
    }

    // ── RULE 3: Dependency successors are repositioned ──────────────────────
    // No visited guard — uses change detection to allow re-cascading when
    // predecessor dates change (e.g., parent recalculated after more children cascade).
    for (const task of allTasks) {
      if (task.locked || !task.dependencies) continue;

      const dep = task.dependencies.find(d => d.taskId === currentId);
      if (!dep) continue;

      const origStart  = new Date(task.startDate as string);
      const origEnd    = new Date(task.endDate   as string);

      // Effective lag from original dates (source of truth)
      const predOrigStart = new Date(currentOriginal.startDate as string);
      const predOrigEnd   = new Date(currentOriginal.endDate   as string);
      const effectiveLag  = computeLagFromDates(
        dep.type, predOrigStart, predOrigEnd, origStart, origEnd,
        businessDays, weekendPredicate
      );

      const constraintDate = calculateSuccessorDate(
        currStart, currEnd, dep.type, effectiveLag,
        businessDays, weekendPredicate
      );

      let succNewStart: Date;
      let succNewEnd: Date;

      if (dep.type === 'FS' || dep.type === 'SS') {
        succNewStart = constraintDate;
        // Business days: preserve business days count, not calendar duration
        if (businessDays && weekendPredicate) {
          const businessDaysCount = getBusinessDaysCount(origStart, origEnd, weekendPredicate);
          const endDateStr = addBusinessDays(constraintDate, businessDaysCount, weekendPredicate);
          succNewEnd = new Date(endDateStr + 'T00:00:00.000Z');
        } else {
          const durationMs = origEnd.getTime() - origStart.getTime();
          succNewEnd = new Date(constraintDate.getTime() + durationMs);
        }
      } else {
        succNewEnd = constraintDate;
        // Business days: preserve business days count, not calendar duration
        if (businessDays && weekendPredicate) {
          const businessDaysCount = getBusinessDaysCount(origStart, origEnd, weekendPredicate);
          // For FF/SF: constraintDate is the new end date, calculate start backwards
          const startDateStr = subtractBusinessDays(constraintDate, businessDaysCount, weekendPredicate);
          succNewStart = new Date(startDateStr + 'T00:00:00.000Z');
        } else {
          const durationMs = origEnd.getTime() - origStart.getTime();
          succNewStart = new Date(constraintDate.getTime() - durationMs);
        }
      }

      // Change detection: skip if already at this position
      const prev = updatedDates.get(task.id);
      if (prev && prev.start.getTime() === succNewStart.getTime() && prev.end.getTime() === succNewEnd.getTime()) {
        continue;
      }

      updatedDates.set(task.id, { start: succNewStart, end: succNewEnd });
      queue.push([task.id, 'dependency']);
      resultMap.set(task.id, {
        ...task,
        startDate: succNewStart.toISOString().split('T')[0],
        endDate:   succNewEnd.toISOString().split('T')[0],
      });
    }
  }

  return Array.from(resultMap.values());
}
