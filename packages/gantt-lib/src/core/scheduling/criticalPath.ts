/**
 * Critical path (CPM) calculation over dependency links.
 * Zero React/DOM/date-fns imports.
 *
 * Semantics:
 * - Only leaf tasks (no task references them as parentId) participate in the graph.
 * - All link types are edges — FS, SS, FF, SF — with calendar lags, mirroring
 *   calculateSuccessorDate:
 *     FS: succStart >= predEnd + lag          SS: succStart >= predStart + lag
 *     FF: succEnd   >= predEnd   + lag        SF: succEnd   >= predStart + lag
 * - A dependency on a parent task (a task that has children) is expanded to its
 *   leaf descendants with the same link type and lag. For finish-anchored links
 *   (FS/FF) the group is bounded by its latest-finishing leaf; for start-anchored
 *   links (SS/SF) by its latest-starting leaf — a conservative approximation of
 *   the group's span.
 * - Task weight = business-day duration (getTaskDuration); edge weight = lag in the
 *   active scheduling unit.
 * - The scheduled task dates are used as the current starts. The project finish is
 *   the latest scheduled leaf finish, so a late short branch can be critical even
 *   when a longer branch started earlier.
 * - Task is critical when its total float (late start - scheduled start) is <= 0.
 *   A standalone task can therefore be critical when it determines the project
 *   finish; dependency membership is not a prerequisite for criticality.
 * - Cycles are skipped by topological ordering (Kahn) — cyclic tasks are not critical.
 */

import type { ScheduleTask, LinkType } from './types';
import { DAY_MS, getBusinessDayOffset, getTaskDuration, parseDateOnly } from './dateMath';
import { getDependencyLag } from './dependencies';

export interface CriticalPathOptions {
  businessDays?: boolean;
  weekendPredicate?: (date: Date) => boolean;
}

interface Edge {
  succId: string;
  lag: number;
  type: LinkType;
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

  const projectStartDate = leafTasks.reduce((earliest, task) => {
    const taskStart = parseDateOnly(task.startDate);
    return taskStart.getTime() < earliest.getTime() ? taskStart : earliest;
  }, parseDateOnly(leafTasks[0]?.startDate ?? new Date()));

  const offsetFromProjectStart = (date: string | Date): number => {
    const targetDate = parseDateOnly(date);
    if (businessDays && weekendPredicate) {
      return getBusinessDayOffset(projectStartDate, targetDate, weekendPredicate);
    }
    return Math.round((targetDate.getTime() - projectStartDate.getTime()) / DAY_MS);
  };

  // The current schedule is the forward pass. Do not reset every root task to
  // day zero: its actual start date is what gives it (or removes) total float.
  const scheduledStart = new Map<string, number>();
  for (const leaf of leafTasks) {
    scheduledStart.set(leaf.id, offsetFromProjectStart(leaf.startDate));
  }

  // Adjacency over all link types: predecessor -> successors, successor -> predecessors.
  const succByPred = new Map<string, Edge[]>();
  const predBySucc = new Map<string, Array<{ predId: string; lag: number; type: LinkType }>>();
  const seenEdges = new Set<string>();

  const addEdge = (predecessorId: string, succId: string, lag: number, type: LinkType) => {
    const edgeKey = `${predecessorId}|${succId}|${type}`;
    if (seenEdges.has(edgeKey)) return;
    seenEdges.add(edgeKey);

    const outEdges = succByPred.get(predecessorId) ?? [];
    outEdges.push({ succId, lag, type });
    succByPred.set(predecessorId, outEdges);

    const inEdges = predBySucc.get(succId) ?? [];
    inEdges.push({ predId: predecessorId, lag, type });
    predBySucc.set(succId, inEdges);
  };

  for (const succ of leafTasks) {
    for (const dep of succ.dependencies ?? []) {
      const lag = getDependencyLag(dep);

      // Predecessor is a leaf: direct edge.
      if (leafIds.has(dep.taskId)) {
        addEdge(dep.taskId, succ.id, lag, dep.type);
        continue;
      }

      // Predecessor is a parent/group: expand to every leaf descendant.
      // The successor's own leaf (self-loop) is skipped.
      const descendants = leafIdsByAncestor.get(dep.taskId);
      if (!descendants || descendants.size === 0) continue;
      for (const leafId of descendants) {
        if (leafId === succ.id) continue;
        addEdge(leafId, succ.id, lag, dep.type);
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

  const projectFinish = Math.max(
    0,
    ...leafTasks.map((leaf) => (scheduledStart.get(leaf.id) ?? 0) + durationOf(leaf))
  );

  // Backward pass: late finish / late start.
  const LF = new Map<string, number>();
  const LS = new Map<string, number>();
  for (const leaf of leafTasks) LF.set(leaf.id, projectFinish);

  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const task = taskById.get(id)!;
    const durPred = durationOf(task);
    const outEdges = succByPred.get(id) ?? [];
    let lf = projectFinish;
    if (outEdges.length > 0) {
      const candidates = outEdges.map(({ succId, lag, type }) => {
        const succLs = LS.get(succId) ?? projectFinish;
        const durSucc = durationOf(taskById.get(succId)!);
        switch (type) {
          case 'FS': return succLs - lag;
          case 'SS': return succLs - lag + durPred;
          case 'FF': return succLs + durSucc - lag;
          case 'SF': return succLs + durSucc - lag + durPred;
          default: return projectFinish;
        }
      });
      lf = Math.min(projectFinish, ...candidates);
    }
    LF.set(id, lf);
    LS.set(id, lf - durPred);
  }

  const critical = new Set<string>();
  const ordered = new Set(order);
  for (const leaf of leafTasks) {
    // Vertices trapped in cycles never entered the topological order and are
    // never critical.
    if (!ordered.has(leaf.id)) continue;
    const hasGraphEdge =
      (succByPred.get(leaf.id)?.length ?? 0) > 0 ||
      (predBySucc.get(leaf.id)?.length ?? 0) > 0;
    // A task with no declared dependencies is a legitimate standalone
    // project task and may determine the project finish. If it declares
    // dependencies but none resolved to a valid graph edge (for example a
    // self-reference through its own parent), it is not a schedulable path.
    if (!hasGraphEdge && (leaf.dependencies?.length ?? 0) > 0) continue;
    const es = scheduledStart.get(leaf.id) ?? 0;
    const ls = LS.get(leaf.id) ?? 0;
    if (ls - es <= 0) critical.add(leaf.id);
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
