/**
 * Critical path (CPM) calculation over FS dependency links.
 * Zero React/DOM/date-fns imports.
 *
 * Semantics:
 * - Only leaf tasks (no task references them as parentId) participate in the graph.
 * - Only FS links with calendar lags are edges; SS/FF/SF are ignored.
 * - A dependency on a parent task (a task that has children) is expanded to its
 *   leaf descendants: the successor is constrained by every descendant leaf, so
 *   only the longest-finishing leaf of the group ends up on the critical path.
 * - Task weight = business-day duration (getTaskDuration); edge weight = calendar lag.
 * - Task is critical when its float (LS - ES) is exactly 0 AND it has at least one
 *   FS edge (incoming or outgoing). Isolated tasks are never critical.
 * - Cycles are skipped by topological ordering (Kahn) — cyclic tasks are not critical.
 */

import type { ScheduleTask } from './types';
import { getTaskDuration } from './dateMath';
import { getDependencyLag } from './dependencies';

export interface CriticalPathOptions {
  businessDays?: boolean;
  weekendPredicate?: (date: Date) => boolean;
}

export function computeCriticalPath(
  tasks: ScheduleTask[],
  options: CriticalPathOptions = {}
): Set<string> {
  const { businessDays = false, weekendPredicate } = options;

  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const childIds = new Set<string>();
  for (const task of tasks) {
    if (task.parentId) childIds.add(task.parentId);
  }
  const leafTasks = tasks.filter((task) => !childIds.has(task.id));
  const leafIds = new Set(leafTasks.map((task) => task.id));

  // Map any task id (parent or not) to ALL of its leaf descendants (transitive).
  const leafIdsByAncestor = new Map<string, Set<string>>();
  for (const leaf of leafTasks) {
    let ancestor: string | undefined = leaf.parentId;
    while (ancestor) {
      const set = leafIdsByAncestor.get(ancestor) ?? new Set<string>();
      set.add(leaf.id);
      leafIdsByAncestor.set(ancestor, set);
      ancestor = taskById.get(ancestor)?.parentId;
    }
  }

  const durationOf = (task: ScheduleTask): number =>
    getTaskDuration(task.startDate, task.endDate, businessDays, weekendPredicate);

  // FS-only adjacency: predecessor -> successors, successor -> predecessors.
  const succByPred = new Map<string, Array<{ succId: string; lag: number }>>();
  const predBySucc = new Map<string, Array<{ predId: string; lag: number }>>();
  const seenEdges = new Set<string>();

  const addEdge = (predecessorId: string, succId: string, lag: number) => {
    const edgeKey = `${predecessorId}|${succId}`;
    if (seenEdges.has(edgeKey)) return;
    seenEdges.add(edgeKey);

    const outEdges = succByPred.get(predecessorId) ?? [];
    outEdges.push({ succId, lag });
    succByPred.set(predecessorId, outEdges);

    const inEdges = predBySucc.get(succId) ?? [];
    inEdges.push({ predId: predecessorId, lag });
    predBySucc.set(succId, inEdges);
  };

  for (const succ of leafTasks) {
    for (const dep of succ.dependencies ?? []) {
      if (dep.type !== 'FS') continue;
      const lag = getDependencyLag(dep);

      // Predecessor is a leaf: direct edge.
      if (leafIds.has(dep.taskId)) {
        addEdge(dep.taskId, succ.id, lag);
        continue;
      }

      // Predecessor is a parent/group: expand to every leaf descendant.
      // The successor's own leaf (self-loop) is skipped.
      const descendants = leafIdsByAncestor.get(dep.taskId);
      if (!descendants || descendants.size === 0) continue;
      for (const leafId of descendants) {
        if (leafId === succ.id) continue;
        addEdge(leafId, succ.id, lag);
      }
    }
  }

  // Topological order (Kahn). Vertices trapped in cycles never enter the order
  // (indegree never drops to 0) and are therefore excluded from criticality.
  const indegree = new Map<string, number>();
  for (const leaf of leafTasks) indegree.set(leaf.id, 0);
  for (const edges of succByPred.values()) {
    for (const { succId } of edges) {
      indegree.set(succId, (indegree.get(succId) ?? 0) + 1);
    }
  }

  const order: string[] = [];
  const enqueued = new Set<string>();
  const queue = leafTasks
    .filter((leaf) => (indegree.get(leaf.id) ?? 0) === 0)
    .map((leaf) => leaf.id);
  for (const id of queue) enqueued.add(id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const { succId } of succByPred.get(current) ?? []) {
      const next = (indegree.get(succId) ?? 0) - 1;
      indegree.set(succId, next);
      if (next === 0 && !enqueued.has(succId)) {
        enqueued.add(succId);
        queue.push(succId);
      }
    }
  }

  // Forward pass: early start / early finish on the abstract day scale.
  const ES = new Map<string, number>();
  const EF = new Map<string, number>();
  for (const leaf of leafTasks) ES.set(leaf.id, 0);

  for (const id of order) {
    const task = taskById.get(id)!;
    let es = 0;
    for (const { predId, lag } of predBySucc.get(id) ?? []) {
      const candidate = (ES.get(predId) ?? 0) + durationOf(taskById.get(predId)!) + lag;
      if (candidate > es) es = candidate;
    }
    ES.set(id, es);
    EF.set(id, es + durationOf(task));
  }

  const projectFinish = Math.max(0, ...leafTasks.map((leaf) => EF.get(leaf.id) ?? 0));

  // Backward pass: late finish / late start.
  const LF = new Map<string, number>();
  const LS = new Map<string, number>();
  for (const leaf of leafTasks) LF.set(leaf.id, projectFinish);

  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const task = taskById.get(id)!;
    const outEdges = succByPred.get(id) ?? [];
    let lf = projectFinish;
    if (outEdges.length > 0) {
      lf = Math.min(...outEdges.map(({ succId, lag }) => (LS.get(succId) ?? projectFinish) - lag));
    }
    LF.set(id, lf);
    LS.set(id, lf - durationOf(task));
  }

  const critical = new Set<string>();
  const ordered = new Set(order);
  for (const leaf of leafTasks) {
    // Vertices trapped in cycles never entered the topological order and are
    // never critical.
    if (!ordered.has(leaf.id)) continue;
    const hasEdge =
      (succByPred.get(leaf.id)?.length ?? 0) > 0 ||
      (predBySucc.get(leaf.id)?.length ?? 0) > 0;
    if (!hasEdge) continue;
    const es = ES.get(leaf.id) ?? 0;
    const ls = LS.get(leaf.id) ?? 0;
    if (ls - es === 0) critical.add(leaf.id);
  }

  return critical;
}

/**
 * Extend criticality from leaf ids upward through the parent chain.
 * A parent is critical when any of its descendants is critical.
 */
export function extendCriticalIdsToParents(
  criticalLeafIds: Set<string>,
  tasks: ScheduleTask[]
): Set<string> {
  const result = new Set(criticalLeafIds);
  const parentByChild = new Map<string, string>();
  for (const task of tasks) {
    if (task.parentId) parentByChild.set(task.id, task.parentId);
  }

  const stack = Array.from(criticalLeafIds);
  while (stack.length > 0) {
    const id = stack.pop()!;
    const parentId = parentByChild.get(id);
    if (parentId && !result.has(parentId)) {
      result.add(parentId);
      stack.push(parentId);
    }
  }

  return result;
}
