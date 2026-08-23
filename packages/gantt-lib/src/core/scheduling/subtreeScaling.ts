/**
 * Subtree duration scaling — proportional compress/stretch of a parent's subtree.
 * Zero React/DOM/date-fns imports.
 *
 * Semantics (PRD: 2026-08-23-parent-subtree-duration-scaling):
 * - Parent tasks stay computed wrappers; only leaf durations change.
 * - One common factor k scales mutable ordinary leaf durations; explicit positive
 *   lags are preserved while the target is reachable via durations alone.
 * - Further compression reduces positive internal lags down to getMinLag, then
 *   virtual offsets of independent components down to the anchor.
 * - Immutable tasks (locked by default) are pinned to their original dates and
 *   never change any scheduling field.
 * - Milestones keep startDate === endDate and only move in time.
 * - Exact overall range wins over local proportion: a correction pass adjusts
 *   one project day at a time with a provable iteration bound derived from the
 *   adjustable slack (never a wall-clock timeout).
 * - Unreachable compression applies the proven minimum span and returns a
 *   TARGET_CLAMPED_TO_MINIMUM warning instead of a hard error.
 *
 * The solver runs in a "solve space" of project-day indices where index 0 is the
 * fixed anchor boundary (original parent start for anchor:'start', the mirrored
 * original parent end for anchor:'end'). Dependency math stays in Date space
 * using the existing calculateSuccessorDate/buildTaskRange primitives, so both
 * calendar and business-day modes reuse one scheduling code path.
 */

// START_MODULE_CONTRACT
//   PURPOSE: Proportionally scale a parent task subtree to an exact target duration.
//   SCOPE: Input validation, working-context indexing, pure layout evaluator,
//          duration and flexible-gap solving, date materialization with bottom-up
//          parent rollup, external dependency policies, sparse atomic result.
//   DEPENDS: scheduling types, dateMath, dependencies, commands, cascade, validation
//   LINKS: M-SCHEDULE, fn-scaleTaskSubtreeDuration, PRD-2026-08-23-parent-subtree-duration-scaling
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT

import type { LinkType, Task, TaskDependency } from './types';
import {
  DAY_MS,
  getBusinessDayOffset,
  getTaskDuration,
  parseDateOnly,
  shiftBusinessDayOffset,
} from './dateMath';
import {
  calculateSuccessorDate,
  computeLagFromDates,
  normalizePredecessorDates,
} from './dependencies';
import { buildTaskRangeFromEnd, buildTaskRangeFromStart } from './commands';
import { universalCascade } from './cascade';
import { validateDependencies } from './validation';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Which boundary of the selected parent stays fixed during scaling. */
export type ScaleTaskSubtreeAnchor = 'start' | 'end';

/** How dependencies leaving the subtree are handled. */
export type ScaleTaskSubtreeExternalPolicy = 'subtree-only' | 'cascade-successors';

export interface ScaleTaskSubtreeOptions {
  /** Fixed boundary of the parent range. Default: 'start'. */
  anchor?: ScaleTaskSubtreeAnchor;
  /** Count durations in business days via weekendPredicate. Default: false. */
  businessDays?: boolean;
  /** Weekend predicate used in business-day mode. */
  weekendPredicate?: (date: Date) => boolean;
  /**
   * External dependency policy. 'subtree-only' keeps every external task fixed
   * and fails with EXTERNAL_DEPENDENCY_CONFLICT on outgoing violations;
   * 'cascade-successors' shifts transitive external successors with preserved
   * durations. Default: 'subtree-only'.
   */
  externalDependencyPolicy?: ScaleTaskSubtreeExternalPolicy;
  /** Minimum duration override for a leaf task. Default: 1 (0 for milestones). */
  getMinDuration?: (task: Task) => number;
  /**
   * Minimum lag override for an internal positive dependency lag.
   * Default: 0. Called once per edge with the original task objects.
   */
  getMinLag?: (dependency: TaskDependency, ownerTask: Task) => number;
  /** Immutability override. Default: task.locked === true. */
  isImmutable?: (task: Task) => boolean;
}

/** Machine-readable warning attached to a successful scaling result. */
export type ScaleTaskSubtreeWarning =
  | {
      code: 'TARGET_CLAMPED_TO_MINIMUM';
      requestedDuration: number;
      minimumDuration: number;
    };

export type ScaleTaskSubtreeErrorCode =
  | 'INVALID_TARGET_DURATION'
  | 'TASK_NOT_FOUND'
  | 'NOT_A_PARENT'
  | 'INVALID_HIERARCHY'
  | 'INVALID_DEPENDENCIES'
  | 'INVALID_DATES'
  | 'INVALID_MINIMUM'
  | 'EXTERNAL_DEPENDENCY_CONFLICT';

export type ScaleTaskSubtreeResult =
  | {
      ok: true;
      changedTasks: Task[];
      changedIds: string[];
      requestedDuration: number;
      appliedDuration: number;
      clamped: boolean;
      warnings: ScaleTaskSubtreeWarning[];
    }
  | {
      ok: false;
      code: ScaleTaskSubtreeErrorCode;
      changedTasks: [];
      changedIds: [];
      details?: string[];
    };

// ---------------------------------------------------------------------------
// Internal model
// ---------------------------------------------------------------------------

interface ScalingLeaf {
  id: string;
  task: Task;
  snapshotIndex: number;
  depth: number;
  isMilestone: boolean;
  immutable: boolean;
  /** Solve-space index of the original start date. */
  startIdx: number;
  /** Solve-space index of the original end date. */
  endIdx: number;
  /** Inclusive duration in project days; a milestone always occupies 1 cell. */
  duration: number;
  minDuration: number;
  componentId: number;
  isRoot: boolean;
}

interface ScalingEdge {
  /** `${ownerTaskId}#${dependencyIndex}` — maps 1:1 onto the owner's dep entry. */
  key: string;
  predLeafId: string;
  succLeafId: string;
  type: LinkType;
  originalLag: number;
  minLag: number;
  /** Lags owned by parent tasks, immutable owners, or non-positive lags never change. */
  adjustable: boolean;
}

interface IncomingBound {
  leafId: string;
  type: LinkType;
  lag: number;
  /** External predecessor task (never changes). */
  predTask: Task;
}

interface OutgoingRef {
  /** Internal task id (leaf, nested parent, or the selected parent). */
  fromId: string;
  /** External successor task (owns the dependency entry). */
  succTask: Task;
  type: LinkType;
  lag: number;
}

interface ScalingContext {
  businessDays: boolean;
  weekendPredicate?: (date: Date) => boolean;
  mirrored: boolean;
  parentTask: Task;
  snapshot: Task[];
  /** Descendant ids of the selected parent (parent excluded). */
  subtreeIds: Set<string>;
  /** Children by parent id over the whole snapshot. */
  childrenByParentId: Map<string, Task[]>;
  leaves: ScalingLeaf[];
  leafById: Map<string, ScalingLeaf>;
  /** Nested parents inside the subtree, deepest first (selected parent excluded). */
  nestedParents: Array<{ task: Task; depth: number; snapshotIndex: number }>;
  edges: ScalingEdge[];
  inEdges: Map<string, ScalingEdge[]>;
  outEdges: Map<string, ScalingEdge[]>;
  boundsByLeaf: Map<string, IncomingBound[]>;
  outgoingRefs: OutgoingRef[];
  /** Per-component floor for root offsets from parent-level FS/SS incoming deps. */
  componentFloor: Map<number, number>;
  originalSpan: number;
  /** Solver iteration budget derived from adjustable slack, not wall-clock. */
  maxCorrectionSteps: number;
  /** Resolved immutability predicate for external successor checks. */
  isImmutable: (task: Task) => boolean;
}

interface SolverState {
  durations: Map<string, number>;
  lags: Map<string, number>;
  offsets: Map<string, number>;
}

interface LeafRange {
  start: Date;
  end: Date;
}

interface Layout {
  dates: Map<string, LeafRange>;
  /** Anchor-side boundary of the content extent in solve space. */
  lo: number;
  /** Far-side boundary of the content extent in solve space. */
  hi: number;
  span: number;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isoOfTaskDate(date: string | Date): string {
  return toIsoDate(parseDateOnly(date));
}

function scaleFailure(
  code: ScaleTaskSubtreeErrorCode,
  details?: string[]
): ScaleTaskSubtreeResult {
  return details && details.length > 0
    ? { ok: false, code, changedTasks: [], changedIds: [], details }
    : { ok: false, code, changedTasks: [], changedIds: [] };
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

function dependencyLag(dep: TaskDependency): number {
  return Number.isFinite(dep.lag) ? dep.lag : 0;
}

// ---------------------------------------------------------------------------
// Solve-space conversion (index <-> date)
// ---------------------------------------------------------------------------

interface SolveSpace {
  mirrored: boolean;
  anchorDate: Date;
  businessDays: boolean;
  weekendPredicate?: (date: Date) => boolean;
  idxCache: Map<string, number>;
  idxOf(date: Date): number;
  dateOf(idx: number): Date;
}

function createSolveSpace(
  mirrored: boolean,
  anchorDate: Date,
  businessDays: boolean,
  weekendPredicate?: (date: Date) => boolean
): SolveSpace {
  const space: SolveSpace = {
    mirrored,
    anchorDate,
    businessDays,
    weekendPredicate,
    idxCache: new Map(),
    idxOf(date: Date): number {
      const key = toIsoDate(date);
      const cached = space.idxCache.get(key);
      if (cached !== undefined) {
        return cached;
      }
      let idx: number;
      if (businessDays && weekendPredicate) {
        idx = mirrored
          ? getBusinessDayOffset(date, anchorDate, weekendPredicate)
          : getBusinessDayOffset(anchorDate, date, weekendPredicate);
      } else {
        const deltaMs = date.getTime() - anchorDate.getTime();
        idx = mirrored ? -Math.round(deltaMs / DAY_MS) : Math.round(deltaMs / DAY_MS);
      }
      space.idxCache.set(key, idx);
      return idx;
    },
    dateOf(idx: number): Date {
      if (businessDays && weekendPredicate) {
        return shiftBusinessDayOffset(anchorDate, mirrored ? -idx : idx, weekendPredicate);
      }
      const delta = mirrored ? -idx : idx;
      return new Date(anchorDate.getTime() + delta * DAY_MS);
    },
  };
  return space;
}

// ---------------------------------------------------------------------------
// Phase 1: validation
// ---------------------------------------------------------------------------

// START_BLOCK_VALIDATE_SCALE_INPUT

function validateScaleInput(
  parentId: string,
  targetDuration: number,
  snapshot: Task[],
  businessDays: boolean,
  weekendPredicate?: (date: Date) => boolean
): { ok: true; parentTask: Task } | { ok: false; code: ScaleTaskSubtreeErrorCode; details: string[] } {
  // 10.1 Target: finite integer >= 1.
  if (!isFiniteInteger(targetDuration) || targetDuration < 1) {
    return { ok: false, code: 'INVALID_TARGET_DURATION', details: [`targetDuration=${String(targetDuration)}`] };
  }

  // 10.2 Hierarchy: unique ids, resolvable parentId refs, no self-parent, no cycles.
  const taskById = new Map<string, Task>();
  const duplicateIds: string[] = [];
  for (const task of snapshot) {
    if (taskById.has(task.id)) duplicateIds.push(task.id);
    taskById.set(task.id, task);
  }
  if (duplicateIds.length > 0) {
    return { ok: false, code: 'INVALID_HIERARCHY', details: [`duplicate task ids: ${duplicateIds.slice(0, 5).join(', ')}`] };
  }

  const parentTask = taskById.get(parentId);
  if (!parentTask) {
    return { ok: false, code: 'TASK_NOT_FOUND', details: [`parentId=${parentId}`] };
  }

  const hasChild = snapshot.some((task) => task.parentId === parentId);
  if (!hasChild) {
    return { ok: false, code: 'NOT_A_PARENT', details: [`task ${parentId} has no children`] };
  }

  const childrenByParentId = new Map<string, Task[]>();
  const hierarchyErrors: string[] = [];
  for (const task of snapshot) {
    if (!task.parentId) continue;
    if (task.parentId === task.id) {
      hierarchyErrors.push(`self-parent: ${task.id}`);
      continue;
    }
    if (!taskById.has(task.parentId)) {
      hierarchyErrors.push(`missing parent ${task.parentId} for ${task.id}`);
      continue;
    }
    const children = childrenByParentId.get(task.parentId) ?? [];
    children.push(task);
    childrenByParentId.set(task.parentId, children);
  }
  if (hierarchyErrors.length === 0) {
    // Cycle detection: iterative walk up the parent chain with a visited guard.
    const globallyVisited = new Set<string>();
    for (const task of snapshot) {
      if (globallyVisited.has(task.id)) continue;
      const chain = new Set<string>();
      let current: Task | undefined = task;
      while (current?.parentId) {
        if (chain.has(current.id)) {
          hierarchyErrors.push(`hierarchy cycle at ${current.id}`);
          break;
        }
        chain.add(current.id);
        globallyVisited.add(current.id);
        current = taskById.get(current.parentId);
      }
    }
  }
  if (hierarchyErrors.length > 0) {
    return { ok: false, code: 'INVALID_HIERARCHY', details: hierarchyErrors.slice(0, 5) };
  }

  // 10.3 Dates of participating tasks: parseable, end >= start, business alignment.
  const subtreeIds = collectSubtreeIds(parentId, childrenByParentId);
  const participating = new Set<string>(subtreeIds);
  participating.add(parentId);
  // External dependency neighbours participate through bounds and outgoing checks.
  for (const task of snapshot) {
    const isInternal = subtreeIds.has(task.id) || task.id === parentId;
    for (const dep of task.dependencies ?? []) {
      if (isInternal) participating.add(dep.taskId);
      if (subtreeIds.has(dep.taskId) || dep.taskId === parentId) participating.add(task.id);
    }
  }

  const dateErrors: string[] = [];
  for (const id of participating) {
    const task = taskById.get(id);
    if (!task) continue;
    const start = parseDateOnly(task.startDate);
    const end = parseDateOnly(task.endDate);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      dateErrors.push(`unparseable dates on ${id}`);
      continue;
    }
    if (end.getTime() < start.getTime()) {
      dateErrors.push(`endDate before startDate on ${id}`);
      continue;
    }
    if (!subtreeIds.has(id)) continue;
    if (task.type === 'milestone' && start.getTime() !== end.getTime()) {
      dateErrors.push(`milestone ${id} must have equal start and end dates`);
      continue;
    }
    if (businessDays && weekendPredicate && !childrenByParentId.has(task.id)) {
      // Leaf boundaries must align to working days in business-day mode.
      if (weekendPredicate(start) || weekendPredicate(end)) {
        dateErrors.push(`leaf ${id} boundary falls on a weekend in business-day mode`);
      }
    }
  }
  if (dateErrors.length > 0) {
    return { ok: false, code: 'INVALID_DATES', details: dateErrors.slice(0, 5) };
  }

  // 10.4 Dependencies: existing validator covers missing endpoints, hierarchy
  // links between ancestors/descendants, and cycles.
  const depValidation = validateDependencies(snapshot);
  if (!depValidation.isValid) {
    return {
      ok: false,
      code: 'INVALID_DEPENDENCIES',
      details: depValidation.errors.slice(0, 5).map((error) => `${error.type}: ${error.taskId}`),
    };
  }

  return { ok: true, parentTask };
}

// END_BLOCK_VALIDATE_SCALE_INPUT

function collectSubtreeIds(
  parentId: string,
  childrenByParentId: Map<string, Task[]>
): Set<string> {
  const subtreeIds = new Set<string>();
  const queue = [parentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenByParentId.get(current) ?? []) {
      if (subtreeIds.has(child.id)) continue;
      subtreeIds.add(child.id);
      queue.push(child.id);
    }
  }
  return subtreeIds;
}

// ---------------------------------------------------------------------------
// Phase 2: working context
// ---------------------------------------------------------------------------

// START_BLOCK_BUILD_SCALE_CONTEXT

type ContextBuildResult =
  | { ok: true; context: ScalingContext; space: SolveSpace }
  | { ok: false; code: ScaleTaskSubtreeErrorCode; details: string[] };

/** Sentinel leaf id for parent-level incoming FS/SS bounds. */
const PARENT_BOUND_KEY = '__parent_bound__';

function buildScaleContext(
  parentTask: Task,
  snapshot: Task[],
  options: ScaleTaskSubtreeOptions
): ContextBuildResult {
  const businessDays = options.businessDays ?? false;
  const weekendPredicate = options.weekendPredicate;
  const isImmutable = options.isImmutable ?? ((task: Task) => task.locked === true);

  const indexedSnapshot = snapshot.map((task, index) => ({ task, index }));
  const taskById = new Map(indexedSnapshot.map(({ task }) => [task.id, task]));
  const childrenByParentId = new Map<string, Task[]>();
  for (const task of snapshot) {
    if (!task.parentId) continue;
    const children = childrenByParentId.get(task.parentId) ?? [];
    children.push(task);
    childrenByParentId.set(task.parentId, children);
  }

  const subtreeIds = collectSubtreeIds(parentTask.id, childrenByParentId);

  // Depths inside the subtree (selected parent = 0).
  const depthById = new Map<string, number>([[parentTask.id, 0]]);
  const depthQueue = [parentTask.id];
  while (depthQueue.length > 0) {
    const current = depthQueue.shift()!;
    const depth = depthById.get(current) ?? 0;
    for (const child of childrenByParentId.get(current) ?? []) {
      depthById.set(child.id, depth + 1);
      depthQueue.push(child.id);
    }
  }

  const subtreeTasks = indexedSnapshot.filter(({ task }) => subtreeIds.has(task.id));
  const leavesRaw = subtreeTasks.filter(({ task }) => !childrenByParentId.has(task.id));
  const nestedParentsRaw = subtreeTasks.filter(
    ({ task }) => childrenByParentId.has(task.id) && task.id !== parentTask.id
  );

  // The original parent range is derived from leaves bottom-up, never from the
  // stored parent dates (10.3).
  const leafEntries = leavesRaw.map(({ task, index }) => {
    const start = parseDateOnly(task.startDate);
    const end = parseDateOnly(task.endDate);
    return { task, index, start, end };
  });
  const computedStart = new Date(Math.min(...leafEntries.map((entry) => entry.start.getTime())));
  const computedEnd = new Date(Math.max(...leafEntries.map((entry) => entry.end.getTime())));
  const mirrored = (options.anchor ?? 'start') === 'end';
  const anchorDate = mirrored ? computedEnd : computedStart;
  const space = createSolveSpace(mirrored, anchorDate, businessDays, weekendPredicate);

  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const entry of leafEntries) {
    lo = Math.min(lo, space.idxOf(entry.start), space.idxOf(entry.end));
    hi = Math.max(hi, space.idxOf(entry.start), space.idxOf(entry.end));
  }
  const originalSpan = Number.isFinite(lo) ? hi - lo + 1 : 1;

  // Cache immutability once; user callbacks always receive original objects.
  const immutableById = new Map<string, boolean>();
  for (const { task } of subtreeTasks) {
    immutableById.set(task.id, isImmutable(task) === true);
  }

  // Cache and validate duration minima once (10.5).
  const getMinDuration = options.getMinDuration;
  const minDurationErrors: string[] = [];
  const minDurationById = new Map<string, number>();
  for (const { task } of subtreeTasks) {
    if (childrenByParentId.has(task.id)) continue; // leaves only
    if (task.type === 'milestone') {
      minDurationById.set(task.id, 0);
      continue;
    }
    let min = 1;
    if (getMinDuration) {
      const requested = getMinDuration(task);
      if (!isFiniteInteger(requested) || requested < 0) {
        minDurationErrors.push(`getMinDuration(${task.id}) = ${String(requested)}`);
        continue;
      }
      min = Math.max(1, requested);
    }
    minDurationById.set(task.id, min);
  }
  if (minDurationErrors.length > 0) {
    return { ok: false, code: 'INVALID_MINIMUM', details: minDurationErrors.slice(0, 5) };
  }

  const leaves: ScalingLeaf[] = leafEntries.map(({ task, index, start, end }) => ({
    id: task.id,
    task,
    snapshotIndex: index,
    depth: depthById.get(task.id) ?? 1,
    isMilestone: task.type === 'milestone',
    immutable: immutableById.get(task.id) === true,
    startIdx: space.idxOf(start),
    endIdx: space.idxOf(end),
    duration: getTaskDuration(start, end, businessDays, weekendPredicate),
    minDuration: minDurationById.get(task.id) ?? 1,
    componentId: -1,
    isRoot: false,
  }));
  const leafById = new Map(leaves.map((leaf) => [leaf.id, leaf]));

  // Anchor leaves of each nested parent (for dependency endpoint expansion).
  const anchorLeafByParent = new Map<string, { earliestStartId: string; latestEndId: string }>();
  const nestedParents: ScalingContext['nestedParents'] = nestedParentsRaw
    .map(({ task, index }) => ({ task, snapshotIndex: index, depth: depthById.get(task.id) ?? 1 }))
    .sort((left, right) => right.depth - left.depth || left.snapshotIndex - right.snapshotIndex);
  for (const { task } of nestedParents) {
    let earliestStart: ScalingLeaf | null = null;
    let latestEnd: ScalingLeaf | null = null;
    for (const leaf of leaves) {
      if (!isDescendantOf(leaf.task, task.id, taskById)) continue;
      if (!earliestStart || leaf.startIdx < earliestStart.startIdx) earliestStart = leaf;
      if (!latestEnd || leaf.endIdx > latestEnd.endIdx) latestEnd = leaf;
    }
    if (earliestStart && latestEnd) {
      anchorLeafByParent.set(task.id, { earliestStartId: earliestStart.id, latestEndId: latestEnd.id });
    }
  }

  // Internal edges (leaf <-> leaf after parent expansion), incoming bounds and
  // outgoing refs. Lags and minima are snapshotted exactly once.
  const getMinLag = options.getMinLag;
  const edges: ScalingEdge[] = [];
  const boundsByLeaf = new Map<string, IncomingBound[]>();
  const outgoingRefs: OutgoingRef[] = [];
  const lagErrors: string[] = [];

  const pushEdge = (
    ownerTask: Task,
    dep: TaskDependency,
    depIndex: number,
    predLeafId: string,
    succLeafId: string
  ) => {
    const originalLag = dependencyLag(dep);
    const succLeaf = leafById.get(succLeafId);
    const adjustable =
      originalLag > 0 &&
      !!succLeaf &&
      !succLeaf.immutable &&
      !immutableById.get(ownerTask.id);
    let minLag = originalLag;
    if (adjustable) {
      // Default minimum for a positive lag is 0 (10.5).
      minLag = 0;
      if (getMinLag) {
        const requested = getMinLag(dep, ownerTask);
        if (!isFiniteInteger(requested) || requested < 0 || requested > originalLag) {
          lagErrors.push(`getMinLag(${ownerTask.id}#${depIndex}) = ${String(requested)}`);
        } else {
          minLag = requested;
        }
      }
    }
    edges.push({
      key: `${ownerTask.id}#${depIndex}`,
      predLeafId,
      succLeafId,
      type: dep.type,
      originalLag,
      minLag,
      adjustable,
    });
  };

  for (const { task } of subtreeTasks) {
    if (!task.dependencies) continue;
    task.dependencies.forEach((dep, depIndex) => {
      const predTask = taskById.get(dep.taskId);
      if (!predTask) return; // missing endpoints already failed validation
      const predInside = subtreeIds.has(predTask.id);
      const isOwnerLeaf = leafById.has(task.id);

      if (!predInside) {
        // External incoming dependency.
        if (isOwnerLeaf) {
          const bounds = boundsByLeaf.get(task.id) ?? [];
          bounds.push({ leafId: task.id, type: dep.type, lag: dependencyLag(dep), predTask });
          boundsByLeaf.set(task.id, bounds);
        } else if (task.id === parentTask.id) {
          // Parent-level incoming FS/SS deps become component floors (10.4);
          // FF/SF parent-level deps are validated after materialization.
          if (dep.type === 'FS' || dep.type === 'SS') {
            const bounds = boundsByLeaf.get(PARENT_BOUND_KEY) ?? [];
            bounds.push({ leafId: PARENT_BOUND_KEY, type: dep.type, lag: dependencyLag(dep), predTask });
            boundsByLeaf.set(PARENT_BOUND_KEY, bounds);
          }
        } else {
          // Nested-parent incoming deps constrain the parent's boundary leaves.
          const anchors = anchorLeafByParent.get(task.id);
          if (anchors) {
            const targetLeafId =
              dep.type === 'FS' || dep.type === 'SS' ? anchors.earliestStartId : anchors.latestEndId;
            const bounds = boundsByLeaf.get(targetLeafId) ?? [];
            bounds.push({ leafId: targetLeafId, type: dep.type, lag: dependencyLag(dep), predTask });
            boundsByLeaf.set(targetLeafId, bounds);
          }
        }
        return;
      }

      // Internal edge: expand parent endpoints to anchor leaves.
      let predLeafId: string | undefined;
      if (leafById.has(predTask.id)) {
        predLeafId = predTask.id;
      } else {
        const anchors = anchorLeafByParent.get(predTask.id);
        if (anchors) {
          predLeafId = dep.type === 'FS' || dep.type === 'FF' ? anchors.latestEndId : anchors.earliestStartId;
        }
      }
      let succLeafId: string | undefined;
      if (isOwnerLeaf) {
        succLeafId = task.id;
      } else {
        const anchors = anchorLeafByParent.get(task.id);
        if (anchors) {
          succLeafId = dep.type === 'FS' || dep.type === 'SS' ? anchors.earliestStartId : anchors.latestEndId;
        }
      }
      if (predLeafId && succLeafId && predLeafId !== succLeafId) {
        pushEdge(task, dep, depIndex, predLeafId, succLeafId);
      }
    });
  }

  if (lagErrors.length > 0) {
    return { ok: false, code: 'INVALID_MINIMUM', details: lagErrors.slice(0, 5) };
  }

  // Outgoing refs: external successors that depend on internal tasks.
  for (const task of snapshot) {
    if (subtreeIds.has(task.id) || task.id === parentTask.id) continue;
    if (!task.dependencies) continue;
    for (const dep of task.dependencies) {
      if (!subtreeIds.has(dep.taskId) && dep.taskId !== parentTask.id) continue;
      outgoingRefs.push({ fromId: dep.taskId, succTask: task, type: dep.type, lag: dependencyLag(dep) });
    }
  }

  const inEdges = new Map<string, ScalingEdge[]>();
  const outEdges = new Map<string, ScalingEdge[]>();
  for (const edge of edges) {
    const inList = inEdges.get(edge.succLeafId) ?? [];
    inList.push(edge);
    inEdges.set(edge.succLeafId, inList);
    const outList = outEdges.get(edge.predLeafId) ?? [];
    outList.push(edge);
    outEdges.set(edge.predLeafId, outList);
  }
  for (const leaf of leaves) {
    leaf.isRoot = (inEdges.get(leaf.id)?.length ?? 0) === 0;
  }

  // Connected components over internal edges (union-find, snapshot order).
  const componentRoot = new Map<string, string>(leaves.map((leaf) => [leaf.id, leaf.id]));
  const find = (id: string): string => {
    let root = componentRoot.get(id) ?? id;
    if (root === id) return root;
    root = find(root);
    componentRoot.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) componentRoot.set(ra, rb);
  };
  for (const edge of edges) union(edge.predLeafId, edge.succLeafId);
  const componentIdByRoot = new Map<string, number>();
  let componentCount = 0;
  for (const leaf of leaves) {
    const root = find(leaf.id);
    if (!componentIdByRoot.has(root)) {
      componentIdByRoot.set(root, componentCount);
      componentCount++;
    }
    leaf.componentId = componentIdByRoot.get(root)!;
  }

  // Component floors from parent-level incoming FS/SS bounds.
  const componentFloor = new Map<number, number>();
  const parentBounds = boundsByLeaf.get(PARENT_BOUND_KEY) ?? [];
  for (const bound of parentBounds) {
    const { predStart, predEnd } = normalizePredecessorDates(bound.predTask, parseDateOnly);
    const boundDate = calculateSuccessorDate(
      predStart,
      predEnd,
      bound.type,
      bound.lag,
      businessDays,
      weekendPredicate
    );
    const boundIdx = space.idxOf(boundDate);
    for (const leaf of leaves) {
      if (!leaf.isRoot || leaf.immutable) continue;
      componentFloor.set(leaf.componentId, Math.max(componentFloor.get(leaf.componentId) ?? 0, boundIdx));
    }
  }
  boundsByLeaf.delete(PARENT_BOUND_KEY);

  // Iteration budget: total adjustable days (durations + lags + offsets) plus
  // the maximum possible growth — never a wall-clock timeout.
  let adjustableTotal = 0;
  for (const leaf of leaves) {
    if (leaf.immutable || leaf.isMilestone) continue;
    adjustableTotal += Math.max(0, leaf.duration - leaf.minDuration);
  }
  for (const edge of edges) {
    if (edge.adjustable && edge.originalLag > edge.minLag) {
      adjustableTotal += edge.originalLag - edge.minLag;
    }
  }
  for (const leaf of leaves) {
    if (leaf.isRoot && !leaf.immutable) adjustableTotal += Math.max(0, leaf.startIdx);
  }
  const maxCorrectionSteps = 2 * (adjustableTotal + originalSpan) + targetBudgetGuard(originalSpan) + 64;

  const context: ScalingContext = {
    businessDays,
    weekendPredicate,
    mirrored,
    parentTask,
    snapshot,
    subtreeIds,
    childrenByParentId,
    leaves,
    leafById,
    nestedParents,
    edges,
    inEdges,
    outEdges,
    boundsByLeaf,
    outgoingRefs,
    componentFloor,
    originalSpan,
    maxCorrectionSteps,
    isImmutable,
  };

  return { ok: true, context, space };
}

function targetBudgetGuard(originalSpan: number): number {
  return Math.max(1, originalSpan) * 2;
}

function isDescendantOf(task: Task, ancestorId: string, taskById: Map<string, Task>): boolean {
  const visited = new Set<string>();
  let currentId = task.parentId;
  while (currentId) {
    if (currentId === ancestorId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    currentId = taskById.get(currentId)?.parentId;
  }
  return false;
}

// END_BLOCK_BUILD_SCALE_CONTEXT

// ---------------------------------------------------------------------------
// Phase 3: layout evaluator (pure)
// ---------------------------------------------------------------------------

function topoOrderLeaves(ctx: ScalingContext, componentLeaves: ScalingLeaf[]): ScalingLeaf[] {
  const byId = new Map(componentLeaves.map((leaf) => [leaf.id, leaf]));
  const indegree = new Map<string, number>(
    componentLeaves.map((leaf) => [leaf.id, 0])
  );
  for (const leaf of componentLeaves) {
    for (const edge of ctx.inEdges.get(leaf.id) ?? []) {
      if (byId.has(edge.predLeafId)) {
        indegree.set(leaf.id, (indegree.get(leaf.id) ?? 0) + 1);
      }
    }
  }
  const ready = componentLeaves
    .filter((leaf) => (indegree.get(leaf.id) ?? 0) === 0)
    .sort((left, right) => left.snapshotIndex - right.snapshotIndex);
  const ordered: ScalingLeaf[] = [];
  const emitted = new Set<string>();
  while (ready.length > 0) {
    const current = ready.shift()!;
    ordered.push(current);
    emitted.add(current.id);
    for (const edge of ctx.outEdges.get(current.id) ?? []) {
      if (!byId.has(edge.succLeafId) || emitted.has(edge.succLeafId)) continue;
      const next = (indegree.get(edge.succLeafId) ?? 0) - 1;
      indegree.set(edge.succLeafId, next);
      if (next === 0) {
        ready.push(byId.get(edge.succLeafId)!);
        ready.sort((left, right) => left.snapshotIndex - right.snapshotIndex);
      }
    }
  }
  // Cycle-free input is validated upfront; append leftovers defensively.
  for (const leaf of componentLeaves) {
    if (!emitted.has(leaf.id)) ordered.push(leaf);
  }
  return ordered;
}

function evaluateLayout(ctx: ScalingContext, space: SolveSpace, state: SolverState): Layout {
  const { businessDays, weekendPredicate } = ctx;
  const dates = new Map<string, LeafRange>();

  // Immutable leaves are pinned to their original dates.
  for (const leaf of ctx.leaves) {
    if (leaf.immutable) {
      dates.set(leaf.id, {
        start: parseDateOnly(leaf.task.startDate),
        end: parseDateOnly(leaf.task.endDate),
      });
    }
  }

  // Components in deterministic order (first member snapshot index).
  const componentOrder: number[] = [];
  const componentLeaves = new Map<number, ScalingLeaf[]>();
  for (const leaf of ctx.leaves) {
    const list = componentLeaves.get(leaf.componentId) ?? [];
    list.push(leaf);
    componentLeaves.set(leaf.componentId, list);
    if (list.length === 1) componentOrder.push(leaf.componentId);
  }

  for (const componentId of componentOrder) {
    const members = componentLeaves.get(componentId) ?? [];
    const order = topoOrderLeaves(ctx, members);
    for (const leaf of order) {
      if (dates.has(leaf.id)) continue; // pinned
      const duration = state.durations.get(leaf.id) ?? leaf.duration;
      let range: LeafRange | null = null;

      const incoming = ctx.inEdges.get(leaf.id) ?? [];
      if (incoming.length === 0) {
        const floor = ctx.componentFloor.get(leaf.componentId) ?? 0;
        const offset = Math.max(floor, state.offsets.get(leaf.id) ?? leaf.startIdx);
        range = buildTaskRangeFromStart(space.dateOf(offset), duration, businessDays, weekendPredicate);
      } else {
        for (const edge of incoming) {
          const predDates = dates.get(edge.predLeafId);
          if (!predDates) continue;
          const predLeaf = ctx.leafById.get(edge.predLeafId);
          const { predStart, predEnd } = normalizePredecessorDates(
            {
              startDate: predDates.start,
              endDate: predDates.end,
              type: predLeaf?.isMilestone ? ('milestone' as const) : ('task' as const),
            },
            parseDateOnly
          );
          const lag = state.lags.get(edge.key) ?? edge.originalLag;
          const constraint = calculateSuccessorDate(
            predStart,
            predEnd,
            edge.type,
            lag,
            businessDays,
            weekendPredicate,
            leaf.isMilestone ? 'milestone' : undefined
          );
          const candidate =
            edge.type === 'FS' || edge.type === 'SS'
              ? buildTaskRangeFromStart(constraint, duration, businessDays, weekendPredicate)
              : buildTaskRangeFromEnd(constraint, duration, businessDays, weekendPredicate);
          if (
            !range ||
            candidate.start.getTime() > range.start.getTime() ||
            (candidate.start.getTime() === range.start.getTime() &&
              candidate.end.getTime() > range.end.getTime())
          ) {
            range = candidate;
          }
        }
      }
      if (!range) {
        range = buildTaskRangeFromStart(space.dateOf(leaf.startIdx), duration, businessDays, weekendPredicate);
      }

      // Incoming external bounds: immovable lower constraints in time.
      for (const bound of ctx.boundsByLeaf.get(leaf.id) ?? []) {
        const { predStart, predEnd } = normalizePredecessorDates(bound.predTask, parseDateOnly);
        const boundDate = calculateSuccessorDate(
          predStart,
          predEnd,
          bound.type,
          bound.lag,
          businessDays,
          weekendPredicate,
          leaf.isMilestone ? 'milestone' : undefined
        );
        if ((bound.type === 'FS' || bound.type === 'SS') && range.start.getTime() < boundDate.getTime()) {
          range = buildTaskRangeFromStart(boundDate, duration, businessDays, weekendPredicate);
        } else if ((bound.type === 'FF' || bound.type === 'SF') && range.end.getTime() < boundDate.getTime()) {
          range = buildTaskRangeFromEnd(boundDate, duration, businessDays, weekendPredicate);
        }
      }

      // Reverse bounds: mutable predecessors must not overlap pinned successors.
      for (const edge of ctx.outEdges.get(leaf.id) ?? []) {
        const succLeaf = ctx.leafById.get(edge.succLeafId);
        if (!succLeaf || !succLeaf.immutable) continue;
        const succDates = dates.get(succLeaf.id);
        if (!succDates) continue;
        const lag = state.lags.get(edge.key) ?? edge.originalLag;
        range = applyReverseBound(
          range,
          edge.type,
          lag,
          succDates,
          succLeaf.isMilestone,
          duration,
          businessDays,
          weekendPredicate
        );
      }

      // Anchor-side clamp: content never crosses the fixed boundary.
      range = clampToAnchor(range, space, duration, businessDays, weekendPredicate);

      dates.set(leaf.id, range);
    }
  }

  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const leaf of ctx.leaves) {
    const range = dates.get(leaf.id);
    if (!range) continue;
    const startIdx = space.idxOf(range.start);
    const endIdx = space.idxOf(range.end);
    lo = Math.min(lo, startIdx, endIdx);
    hi = Math.max(hi, startIdx, endIdx);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return { dates, lo: 0, hi: 0, span: 1 };
  }
  return { dates, lo, hi, span: hi - lo + 1 };
}

function applyReverseBound(
  range: LeafRange,
  type: LinkType,
  lag: number,
  succDates: LeafRange,
  succIsMilestone: boolean,
  duration: number,
  businessDays: boolean,
  weekendPredicate?: (date: Date) => boolean
): LeafRange {
  const shiftBack = (date: Date, days: number): Date =>
    businessDays && weekendPredicate
      ? shiftBusinessDayOffset(date, -days, weekendPredicate)
      : new Date(date.getTime() - days * DAY_MS);

  switch (type) {
    case 'FS': {
      const allowedEnd = shiftBack(succDates.start, lag + (succIsMilestone ? 0 : 1));
      return range.end.getTime() > allowedEnd.getTime()
        ? buildTaskRangeFromEnd(allowedEnd, duration, businessDays, weekendPredicate)
        : range;
    }
    case 'SS': {
      const allowedStart = shiftBack(succDates.start, lag);
      return range.start.getTime() > allowedStart.getTime()
        ? buildTaskRangeFromStart(allowedStart, duration, businessDays, weekendPredicate)
        : range;
    }
    case 'FF': {
      const allowedEnd = shiftBack(succDates.end, lag);
      return range.end.getTime() > allowedEnd.getTime()
        ? buildTaskRangeFromEnd(allowedEnd, duration, businessDays, weekendPredicate)
        : range;
    }
    case 'SF': {
      const allowedStart = shiftBack(succDates.end, lag - 1);
      return range.start.getTime() > allowedStart.getTime()
        ? buildTaskRangeFromStart(allowedStart, duration, businessDays, weekendPredicate)
        : range;
    }
  }
}

function clampToAnchor(
  range: LeafRange,
  space: SolveSpace,
  duration: number,
  businessDays: boolean,
  weekendPredicate?: (date: Date) => boolean
): LeafRange {
  if (!space.mirrored) {
    // Start-anchored: content never starts before the original parent start.
    if (space.idxOf(range.start) < 0) {
      return buildTaskRangeFromStart(space.anchorDate, duration, businessDays, weekendPredicate);
    }
  } else if (space.idxOf(range.end) < 0) {
    // End-anchored: content never ends after the original parent end.
    return buildTaskRangeFromEnd(space.anchorDate, duration, businessDays, weekendPredicate);
  }
  return range;
}

// ---------------------------------------------------------------------------
// Phase 4: solving (stage A durations, correction, stage B flexible gaps)
// ---------------------------------------------------------------------------

// START_BLOCK_SOLVE_DURATIONS

function allocateDurations(ctx: ScalingContext, target: number): Map<string, number> {
  const durations = new Map<string, number>();
  const ratio = target / Math.max(1, ctx.originalSpan);

  for (const leaf of ctx.leaves) {
    if (leaf.immutable || leaf.isMilestone) {
      durations.set(leaf.id, leaf.duration);
    }
  }

  const ideals: Array<{ leaf: ScalingLeaf; ideal: number }> = ctx.leaves
    .filter((leaf) => !leaf.immutable && !leaf.isMilestone)
    .map((leaf) => ({ leaf, ideal: Math.max(leaf.minDuration, leaf.duration * ratio) }));

  const minTotal = ideals.reduce((sum, { leaf }) => sum + leaf.minDuration, 0);
  const idealTotal = ideals.reduce((sum, { ideal }) => sum + ideal, 0);
  const total = Math.max(minTotal, Math.round(idealTotal));

  const floors = new Map<string, number>();
  let floorTotal = 0;
  for (const { leaf, ideal } of ideals) {
    const floor = Math.max(leaf.minDuration, Math.floor(ideal));
    floors.set(leaf.id, floor);
    floorTotal += floor;
  }

  // Largest remainder with deterministic tie-break: larger fraction first,
  // then earlier original start, then id.
  let remaining = Math.max(0, total - floorTotal);
  const byFraction = [...ideals].sort((left, right) => {
    const fracLeft = left.ideal - (floors.get(left.leaf.id) ?? 0);
    const fracRight = right.ideal - (floors.get(right.leaf.id) ?? 0);
    if (fracLeft !== fracRight) return fracRight - fracLeft;
    const timeLeft = isoOfTaskDate(left.leaf.task.startDate);
    const timeRight = isoOfTaskDate(right.leaf.task.startDate);
    if (timeLeft !== timeRight) return timeLeft < timeRight ? -1 : 1;
    return left.leaf.id < right.leaf.id ? -1 : 1;
  });
  for (const { leaf } of byFraction) {
    if (remaining <= 0) break;
    floors.set(leaf.id, (floors.get(leaf.id) ?? 0) + 1);
    remaining -= 1;
  }

  for (const { leaf } of ideals) {
    durations.set(leaf.id, floors.get(leaf.id) ?? leaf.duration);
  }
  return durations;
}

// END_BLOCK_SOLVE_DURATIONS

// START_BLOCK_SOLVE_FLEXIBLE_GAPS

interface SolveOutcome {
  state: SolverState;
  layout: Layout;
  appliedSpan: number;
  clamped: boolean;
}

function solveScale(ctx: ScalingContext, space: SolveSpace, target: number): SolveOutcome {
  const state: SolverState = {
    durations: allocateDurations(ctx, target),
    lags: new Map(ctx.edges.map((edge) => [edge.key, edge.originalLag])),
    offsets: new Map(
      ctx.leaves
        .filter((leaf) => leaf.isRoot && !leaf.immutable)
        .map((leaf) => {
          const floor = ctx.componentFloor.get(leaf.componentId) ?? 0;
          const scaled = Math.round((leaf.startIdx * target) / Math.max(1, ctx.originalSpan));
          return [leaf.id, Math.max(floor, scaled)] as const;
        })
    ),
  };

  let layout = evaluateLayout(ctx, space, state);
  let exhausted = false;
  let steps = 0;

  while (layout.span !== target && steps < ctx.maxCorrectionSteps) {
    steps++;
    if (layout.span > target) {
      if (tryFirstImprovementReduce(ctx, space, state, layout)) {
        layout = evaluateLayout(ctx, space, state);
        continue;
      }
      if (exhausted) break;
      // Stage B exhaustion: durations to minima, positive lags to minima,
      // virtual offsets to their floors — the proven minimum layout.
      exhausted = true;
      exhaustFlexibleGaps(ctx, state);
      layout = evaluateLayout(ctx, space, state);
      continue;
    }
    if (tryGrow(ctx, space, state, layout, target)) {
      layout = evaluateLayout(ctx, space, state);
      continue;
    }
    break;
  }

  // Align the anchor-side boundary (index 0) when the layout allows it.
  layout = alignAnchorBoundary(ctx, space, state, layout);

  return {
    state,
    layout,
    appliedSpan: layout.span,
    clamped: layout.span > target,
  };
}

function farBoundaryKey(
  leaf: ScalingLeaf,
  dates: Map<string, LeafRange>,
  space: SolveSpace
): number {
  const range = dates.get(leaf.id);
  if (!range) return Math.max(leaf.startIdx, leaf.endIdx);
  return Math.max(space.idxOf(range.start), space.idxOf(range.end));
}

function tryFirstImprovementReduce(
  ctx: ScalingContext,
  space: SolveSpace,
  state: SolverState,
  layout: Layout
): boolean {
  // 1. Durations of boundary-defining mutable ordinary leaves.
  const durationCandidates = ctx.leaves
    .filter(
      (leaf) =>
        !leaf.immutable &&
        !leaf.isMilestone &&
        (state.durations.get(leaf.id) ?? leaf.duration) > leaf.minDuration
    )
    .sort(
      (left, right) =>
        farBoundaryKey(right, layout.dates, space) - farBoundaryKey(left, layout.dates, space) ||
        left.snapshotIndex - right.snapshotIndex
    );
  for (const leaf of durationCandidates) {
    const current = state.durations.get(leaf.id) ?? leaf.duration;
    state.durations.set(leaf.id, current - 1);
    const next = evaluateLayout(ctx, space, state);
    if (next.span < layout.span) return true;
    state.durations.set(leaf.id, current);
  }

  // 2. Positive internal explicit lags (durations are exhausted at this point).
  const lagCandidates = ctx.edges
    .filter((edge) => edge.adjustable && (state.lags.get(edge.key) ?? edge.originalLag) > edge.minLag)
    .sort((left, right) => {
      const succLeft = ctx.leafById.get(left.succLeafId)?.snapshotIndex ?? 0;
      const succRight = ctx.leafById.get(right.succLeafId)?.snapshotIndex ?? 0;
      if (succLeft !== succRight) return succLeft - succRight;
      return left.key < right.key ? -1 : 1;
    });
  for (const edge of lagCandidates) {
    const current = state.lags.get(edge.key) ?? edge.originalLag;
    state.lags.set(edge.key, current - 1);
    const next = evaluateLayout(ctx, space, state);
    if (next.span < layout.span) return true;
    state.lags.set(edge.key, current);
  }

  // 3. Virtual offsets of independent component roots.
  const offsetCandidates = ctx.leaves
    .filter((leaf) => leaf.isRoot && !leaf.immutable)
    .map((leaf) => ({ leaf, offset: state.offsets.get(leaf.id) ?? leaf.startIdx }))
    .filter(({ leaf, offset }) => offset > (ctx.componentFloor.get(leaf.componentId) ?? 0))
    .sort(
      (left, right) =>
        right.offset - left.offset || left.leaf.snapshotIndex - right.leaf.snapshotIndex
    );
  for (const { leaf, offset } of offsetCandidates) {
    state.offsets.set(leaf.id, offset - 1);
    const next = evaluateLayout(ctx, space, state);
    if (next.span < layout.span) return true;
    state.offsets.set(leaf.id, offset);
  }

  return false;
}

function exhaustFlexibleGaps(ctx: ScalingContext, state: SolverState): void {
  for (const leaf of ctx.leaves) {
    if (leaf.immutable || leaf.isMilestone) continue;
    state.durations.set(leaf.id, leaf.minDuration);
  }
  for (const edge of ctx.edges) {
    if (edge.adjustable) {
      state.lags.set(edge.key, edge.minLag);
    }
  }
  for (const leaf of ctx.leaves) {
    if (!leaf.isRoot || leaf.immutable) continue;
    state.offsets.set(leaf.id, ctx.componentFloor.get(leaf.componentId) ?? 0);
  }
}

function tryGrow(
  ctx: ScalingContext,
  space: SolveSpace,
  state: SolverState,
  layout: Layout,
  target: number
): boolean {
  const growthCandidates = ctx.leaves
    .filter((leaf) => !leaf.immutable && !leaf.isMilestone)
    .sort(
      (left, right) =>
        farBoundaryKey(right, layout.dates, space) - farBoundaryKey(left, layout.dates, space) ||
        left.snapshotIndex - right.snapshotIndex
    );
  for (const leaf of growthCandidates) {
    const current = state.durations.get(leaf.id) ?? leaf.duration;
    state.durations.set(leaf.id, current + 1);
    const next = evaluateLayout(ctx, space, state);
    if (next.span > layout.span && next.span <= target) return true;
    state.durations.set(leaf.id, current);
  }

  // Grow offsets of the farthest independent roots (e.g. milestone-only subtrees).
  const offsetCandidates = ctx.leaves
    .filter((leaf) => leaf.isRoot && !leaf.immutable)
    .map((leaf) => ({ leaf, offset: state.offsets.get(leaf.id) ?? leaf.startIdx }))
    .sort(
      (left, right) =>
        right.offset - left.offset || left.leaf.snapshotIndex - right.leaf.snapshotIndex
    );
  for (const { leaf, offset } of offsetCandidates) {
    state.offsets.set(leaf.id, offset + 1);
    const next = evaluateLayout(ctx, space, state);
    if (next.span > layout.span && next.span <= target) return true;
    state.offsets.set(leaf.id, offset);
  }
  return false;
}

function alignAnchorBoundary(
  ctx: ScalingContext,
  space: SolveSpace,
  state: SolverState,
  layout: Layout
): Layout {
  if (layout.lo === 0) return layout;
  if (ctx.leaves.some((leaf) => leaf.immutable)) return layout;
  if (ctx.boundsByLeaf.size > 0) return layout;
  if (ctx.componentFloor.size > 0) return layout;

  const roots = ctx.leaves.filter((leaf) => leaf.isRoot && !leaf.immutable);
  if (roots.length === 0) return layout;
  const minOffset = Math.min(
    ...roots.map((leaf) => state.offsets.get(leaf.id) ?? leaf.startIdx)
  );
  if (minOffset <= 0) return layout;
  const shift = Math.min(layout.lo, minOffset);
  if (shift <= 0) return layout;

  const backup = new Map(state.offsets);
  for (const leaf of roots) {
    state.offsets.set(leaf.id, (state.offsets.get(leaf.id) ?? leaf.startIdx) - shift);
  }
  const next = evaluateLayout(ctx, space, state);
  if (next.span === layout.span && next.lo < layout.lo) {
    return next;
  }
  state.offsets.clear();
  for (const [key, value] of backup) state.offsets.set(key, value);
  return layout;
}

// END_BLOCK_SOLVE_FLEXIBLE_GAPS

// ---------------------------------------------------------------------------
// Phase 5: materialization + external policies + sparse result
// ---------------------------------------------------------------------------

// START_BLOCK_MATERIALIZE_SCALE_RESULT

/**
 * Build the leaf's next dependency list: internal lags take the solved values,
 * external incoming lags are recalculated from the final dates. Returns null
 * when nothing changed.
 */
function buildLeafDependencies(
  leaf: ScalingLeaf,
  range: LeafRange,
  finalDates: Map<string, LeafRange>,
  taskById: Map<string, Task>,
  state: SolverState,
  ctx: ScalingContext,
  space: SolveSpace
): TaskDependency[] | null {
  const deps = leaf.task.dependencies;
  if (!deps || deps.length === 0) return null;
  let changed = false;
  const nextDeps = deps.map((dep, depIndex) => {
    const key = `${leaf.id}#${depIndex}`;
    const solvedLag = state.lags.get(key);
    if (solvedLag !== undefined && solvedLag !== dependencyLag(dep)) {
      changed = true;
      return { ...dep, lag: solvedLag };
    }
    const predTask = taskById.get(dep.taskId);
    if (!predTask) return { ...dep, lag: dependencyLag(dep) };
    if (ctx.subtreeIds.has(predTask.id)) {
      // Internal edge without a solver entry (e.g. collapsed expansion): keep it.
      return { ...dep, lag: dependencyLag(dep) };
    }
    // External predecessor: reflect the actual final gap.
    const predRange = finalDates.get(predTask.id);
    const { predStart, predEnd } = normalizePredecessorDates(
      {
        startDate: predRange ? predRange.start : parseDateOnly(predTask.startDate),
        endDate: predRange ? predRange.end : parseDateOnly(predTask.endDate),
        type: predTask.type,
      },
      parseDateOnly
    );
    const lag = computeLagFromDates(
      dep.type,
      predStart,
      predEnd,
      range.start,
      range.end,
      ctx.businessDays,
      ctx.weekendPredicate,
      leaf.isMilestone ? 'milestone' : undefined
    );
    if (lag !== dependencyLag(dep)) changed = true;
    return { ...dep, lag };
  });
  void space;
  return changed ? nextDeps : null;
}

function buildFinalTasks(
  ctx: ScalingContext,
  state: SolverState,
  layout: Layout,
  space: SolveSpace
): Map<string, Task> {
  const taskById = new Map(ctx.snapshot.map((task) => [task.id, task]));
  const finalTasks = new Map<string, Task>();

  // Leaves: new dates + updated dependency lags for mutable leaves.
  for (const leaf of ctx.leaves) {
    if (leaf.immutable) continue;
    const range = layout.dates.get(leaf.id);
    if (!range) continue;
    const newStart = toIsoDate(range.start);
    const newEnd = toIsoDate(range.end);
    const startChanged = newStart !== isoOfTaskDate(leaf.task.startDate);
    const endChanged = newEnd !== isoOfTaskDate(leaf.task.endDate);
    const nextDeps = buildLeafDependencies(leaf, range, layout.dates, taskById, state, ctx, space);
    if (!startChanged && !endChanged && !nextDeps) continue;
    finalTasks.set(leaf.id, {
      ...leaf.task,
      startDate: newStart,
      endDate: newEnd,
      ...(nextDeps ? { dependencies: nextDeps } : {}),
    });
  }

  // Nested parents, deepest first: roll up from direct children.
  for (const { task } of ctx.nestedParents) {
    const children = ctx.childrenByParentId.get(task.id) ?? [];
    let minStart: Date | null = null;
    let maxEnd: Date | null = null;
    for (const child of children) {
      const childFinal = finalTasks.get(child.id);
      const start = parseDateOnly(childFinal ? childFinal.startDate : child.startDate);
      const end = parseDateOnly(childFinal ? childFinal.endDate : child.endDate);
      if (!minStart || start.getTime() < minStart.getTime()) minStart = start;
      if (!maxEnd || end.getTime() > maxEnd.getTime()) maxEnd = end;
    }
    if (!minStart || !maxEnd) continue;
    const newStart = toIsoDate(minStart);
    const newEnd = toIsoDate(maxEnd);
    if (newStart === isoOfTaskDate(task.startDate) && newEnd === isoOfTaskDate(task.endDate)) {
      continue;
    }
    finalTasks.set(task.id, { ...task, startDate: newStart, endDate: newEnd });
  }

  // Selected parent: roll up from its direct children; dependencies untouched.
  const parentChildren = ctx.childrenByParentId.get(ctx.parentTask.id) ?? [];
  let parentStart: Date | null = null;
  let parentEnd: Date | null = null;
  for (const child of parentChildren) {
    const childFinal = finalTasks.get(child.id);
    const start = parseDateOnly(childFinal ? childFinal.startDate : child.startDate);
    const end = parseDateOnly(childFinal ? childFinal.endDate : child.endDate);
    if (!parentStart || start.getTime() < parentStart.getTime()) parentStart = start;
    if (!parentEnd || end.getTime() > parentEnd.getTime()) parentEnd = end;
  }
  if (parentStart && parentEnd) {
    const newStart = toIsoDate(parentStart);
    const newEnd = toIsoDate(parentEnd);
    if (
      newStart !== isoOfTaskDate(ctx.parentTask.startDate) ||
      newEnd !== isoOfTaskDate(ctx.parentTask.endDate)
    ) {
      finalTasks.set(ctx.parentTask.id, {
        ...ctx.parentTask,
        startDate: newStart,
        endDate: newEnd,
      });
    }
  }

  return finalTasks;
}

function findOutgoingViolations(
  ctx: ScalingContext,
  finalTasks: Map<string, Task>
): string[] {
  const violations: string[] = [];
  const originalById = new Map(ctx.snapshot.map((task) => [task.id, task]));
  for (const ref of ctx.outgoingRefs) {
    const fromTask = finalTasks.get(ref.fromId) ?? originalById.get(ref.fromId);
    if (!fromTask) continue;
    const { predStart, predEnd } = normalizePredecessorDates(fromTask, parseDateOnly);
    const required = calculateSuccessorDate(
      predStart,
      predEnd,
      ref.type,
      ref.lag,
      ctx.businessDays,
      ctx.weekendPredicate,
      ref.succTask.type === 'milestone' ? 'milestone' : undefined
    );
    const succStart = parseDateOnly(ref.succTask.startDate);
    const succEnd =
      ref.succTask.type === 'milestone' ? succStart : parseDateOnly(ref.succTask.endDate);
    if (ref.type === 'FS' || ref.type === 'SS') {
      if (succStart.getTime() < required.getTime()) {
        violations.push(`${ref.type} ${ref.fromId} -> ${ref.succTask.id}`);
      }
    } else if (succEnd.getTime() < required.getTime()) {
      violations.push(`${ref.type} ${ref.fromId} -> ${ref.succTask.id}`);
    }
  }
  return violations;
}

function cascadeExternalSuccessors(
  ctx: ScalingContext,
  finalTasks: Map<string, Task>
): { ok: true; changedExternal: Task[] } | { ok: false; details: string[] } {
  // Immutable external successors cancel the whole operation.
  const immutableExternal = new Set<string>();
  const seeds: string[] = [];
  for (const ref of ctx.outgoingRefs) {
    if (ctx.isImmutable(ref.succTask) || ref.succTask.locked === true) {
      immutableExternal.add(ref.succTask.id);
    }
    if (finalTasks.has(ref.fromId) && !seeds.includes(ref.fromId)) {
      seeds.push(ref.fromId);
    }
  }
  if (immutableExternal.size > 0) {
    return {
      ok: false,
      details: [`immutable external successor(s): ${[...immutableExternal].slice(0, 5).join(', ')}`],
    };
  }
  if (seeds.length === 0) return { ok: true, changedExternal: [] };

  // Working snapshot with all subtree changes applied; externals copied.
  const working = ctx.snapshot.map((task) => {
    const final = finalTasks.get(task.id);
    return final ?? { ...task };
  });

  const externalChanged = new Map<string, Task>();
  for (const seedId of seeds) {
    const seedTask = working.find((task) => task.id === seedId);
    if (!seedTask) continue;
    const cascade = universalCascade(
      seedTask,
      parseDateOnly(seedTask.startDate),
      parseDateOnly(seedTask.endDate),
      working,
      ctx.businessDays,
      ctx.weekendPredicate
    );
    for (const updated of cascade) {
      if (ctx.subtreeIds.has(updated.id) || updated.id === ctx.parentTask.id) continue;
      const beforeIndex = working.findIndex((task) => task.id === updated.id);
      if (beforeIndex < 0) continue;
      const before = working[beforeIndex];
      if (JSON.stringify(before) !== JSON.stringify(updated)) {
        externalChanged.set(updated.id, updated);
      }
      working.splice(beforeIndex, 1, updated);
    }
  }

  // Deterministic topological order over the changed external set.
  const changedSet = new Set(externalChanged.keys());
  const indegree = new Map<string, number>([...changedSet].map((id) => [id, 0]));
  for (const task of externalChanged.values()) {
    for (const dep of task.dependencies ?? []) {
      if (changedSet.has(dep.taskId)) {
        indegree.set(task.id, (indegree.get(task.id) ?? 0) + 1);
      }
    }
  }
  const snapshotIndexById = new Map(ctx.snapshot.map((task, index) => [task.id, index]));
  const ready = [...changedSet]
    .filter((id) => (indegree.get(id) ?? 0) === 0)
    .sort((left, right) => (snapshotIndexById.get(left) ?? 0) - (snapshotIndexById.get(right) ?? 0));
  const ordered: Task[] = [];
  const emitted = new Set<string>();
  while (ready.length > 0) {
    const currentId = ready.shift()!;
    const current = externalChanged.get(currentId)!;
    ordered.push(current);
    emitted.add(currentId);
    for (const [otherId, other] of externalChanged) {
      if (emitted.has(otherId)) continue;
      if (!(other.dependencies ?? []).some((dep) => dep.taskId === currentId)) continue;
      const next = (indegree.get(otherId) ?? 0) - 1;
      indegree.set(otherId, next);
      if (next === 0) {
        ready.push(otherId);
        ready.sort((left, right) => (snapshotIndexById.get(left) ?? 0) - (snapshotIndexById.get(right) ?? 0));
      }
    }
  }
  for (const id of changedSet) {
    if (!emitted.has(id)) ordered.push(externalChanged.get(id)!);
  }

  return { ok: true, changedExternal: ordered };
}

// END_BLOCK_MATERIALIZE_SCALE_RESULT

// START_BLOCK_VALIDATE_SCALE_RESULT

function validateFinalGraph(
  ctx: ScalingContext,
  finalTasks: Map<string, Task>,
  external: Task[]
): string[] {
  if (finalTasks.size === 0 && external.length === 0) return [];
  const updates = new Map<string, Task>();
  for (const task of finalTasks.values()) updates.set(task.id, task);
  for (const task of external) updates.set(task.id, task);
  const finalSnapshot = ctx.snapshot.map((task) => updates.get(task.id) ?? task);
  const validation = validateDependencies(finalSnapshot);
  return validation.isValid
    ? []
    : validation.errors.slice(0, 5).map((error) => `${error.type}: ${error.taskId}`);
}

// END_BLOCK_VALIDATE_SCALE_RESULT

// ---------------------------------------------------------------------------
// Public operation
// ---------------------------------------------------------------------------

/**
 * Proportionally scale a parent task's subtree to an exact target duration.
 *
 * The input snapshot is never mutated; the operation returns one atomic batch
 * of changed tasks. Unreachable compression targets apply the proven minimum
 * span and report a TARGET_CLAMPED_TO_MINIMUM warning instead of failing.
 */
export function scaleTaskSubtreeDuration(
  parentId: string,
  targetDuration: number,
  snapshot: Task[],
  options?: ScaleTaskSubtreeOptions
): ScaleTaskSubtreeResult {
  const resolvedOptions = options ?? {};
  const businessDays = resolvedOptions.businessDays ?? false;

  // Phase 1: validate before any computation.
  const validation = validateScaleInput(
    parentId,
    targetDuration,
    snapshot,
    businessDays,
    resolvedOptions.weekendPredicate
  );
  if (!validation.ok) {
    return scaleFailure(validation.code, validation.details);
  }

  // Phase 2: build the indexed working context.
  const built = buildScaleContext(validation.parentTask, snapshot, resolvedOptions);
  if (!built.ok) {
    return scaleFailure(built.code, built.details);
  }
  const { context: ctx, space } = built;

  // Phases 3-4: solve durations, then flexible gaps, with exact-range correction.
  const solved = solveScale(ctx, space, targetDuration);

  // Phase 5: materialize dates, roll up parents, apply external policy.
  const finalTasks = buildFinalTasks(ctx, solved.state, solved.layout, space);

  const externalPolicy = resolvedOptions.externalDependencyPolicy ?? 'subtree-only';
  let externalChanged: Task[] = [];
  if (externalPolicy === 'subtree-only') {
    const violations = findOutgoingViolations(ctx, finalTasks);
    if (violations.length > 0) {
      return scaleFailure('EXTERNAL_DEPENDENCY_CONFLICT', violations);
    }
  } else {
    const cascaded = cascadeExternalSuccessors(ctx, finalTasks);
    if (!cascaded.ok) {
      return scaleFailure('EXTERNAL_DEPENDENCY_CONFLICT', cascaded.details);
    }
    externalChanged = cascaded.changedExternal;
  }

  // Final validation of the produced graph.
  const finalErrors = validateFinalGraph(ctx, finalTasks, externalChanged);
  if (finalErrors.length > 0) {
    return scaleFailure('INVALID_DEPENDENCIES', finalErrors);
  }

  // Sparse result in canonical order:
  // 1. changed leaves in snapshot order,
  // 2. changed nested parents from deepest to the selected parent,
  // 3. external cascaded successors in topological order.
  const changedLeaves = ctx.leaves
    .filter((leaf) => finalTasks.has(leaf.id))
    .map((leaf) => finalTasks.get(leaf.id)!);
  const changedParents = [...ctx.nestedParents.map(({ task }) => task), ctx.parentTask]
    .filter((task) => finalTasks.has(task.id))
    .map((task) => finalTasks.get(task.id)!);

  const changedTasks = [...changedLeaves, ...changedParents, ...externalChanged];
  const seen = new Set<string>();
  const uniqueChanged = changedTasks.filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });

  const warnings: ScaleTaskSubtreeWarning[] = solved.clamped
    ? [
        {
          code: 'TARGET_CLAMPED_TO_MINIMUM' as const,
          requestedDuration: targetDuration,
          minimumDuration: solved.appliedSpan,
        },
      ]
    : [];

  return {
    ok: true,
    changedTasks: uniqueChanged,
    changedIds: uniqueChanged.map((task) => task.id),
    requestedDuration: targetDuration,
    appliedDuration: solved.appliedSpan,
    clamped: solved.clamped,
    warnings,
  };
}
