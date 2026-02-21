# Phase 7: dependencies constraits - Research

**Researched:** 2026-02-22
**Domain:** Gantt drag constraint enforcement — cascading FS chain moves, lag recalculation, onCascade callback
**Confidence:** HIGH (all findings from direct codebase inspection)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scope: FS only.** SS/FF/SF constraint behavior is deferred.

**Two constraint modes:**
- `disableConstraints={false}` (default) = hard mode: chain moves as a monolith
- `disableConstraints={true}` = soft mode: task moves freely, lag is recalculated

**Hard mode (FS) behavior:**
- Move predecessor (parent) → all successors in chain shift together, both directions
- Move successor (child) right → child + its own successors shift; lag between parent and child grows
- Move successor (child) left → stops at `predecessor.startDate` (not endDate); task freezes silently with no visual cue

**Soft mode (FS) behavior:**
- Task moves freely in both directions
- Lag of each affected FS dependency is recalculated to match new position
- No visual violation indicator (arrow always looks the same)

**Cascade rules:**
- Unlimited depth (A→B→C→D: move A, all shift)
- Multiple predecessors (A→C, B→C): only the dragged task drives C's shift; other dependencies get lag recalculated
- Real-time visual preview during drag (all chain tasks move together)

**API callbacks:**
- `onChange(task: Task)` — unchanged, used for single-task changes (soft mode, drag with no dependencies)
- `onCascade(tasks: Task[])` — NEW, called on cascade; includes dragged task and all shifted tasks
- How changed lag is delivered in soft mode (onChange with updated dependencies[] or separate) — **Claude's Discretion**

### Claude's Discretion

- How to deliver changed lag in soft mode (via `onChange` with updated `dependencies[]` array recommended)
- Internal traversal algorithm: BFS vs DFS for cascade chain collection
- Cycle edge-case handling during cascade (cycle detection already exists from Phase 6)

### Deferred Ideas (OUT OF SCOPE)

- SS, FF, SF constraint and cascade behavior → next phase
- Visual highlighting of violated links (red arrow color) → separate visualization phase
</user_constraints>

---

## Summary

Phase 7 transforms the existing "stop-at-boundary" single-task constraint (implemented in Phase 6 + quick-12) into a full cascading constraint system for FS dependency chains. The core mechanism must be added at the `useTaskDrag` level: during drag, compute the entire successor chain starting from the dragged task, shift all chain members by the same delta, and on completion call `onCascade(tasks[])` instead of a per-task `onChange`.

The existing codebase already contains `buildAdjacencyList`, `detectCycles`, and `calculateSuccessorDate` in `dependencyUtils.ts`. The `disableConstraints` prop already flows from `GanttChartProps` → `TaskRow` → `useTaskDrag`. The global drag singleton (`globalActiveDrag`) stores `allTasks`. Phase 7 must add: (1) successor traversal to collect the cascade chain, (2) real-time multi-task position preview during drag, (3) boundary enforcement for child-moving-left (stop at predecessor.startDate), and (4) the `onCascade` callback in GanttChart and threading through to useTaskDrag.

The main architectural challenge is the real-time multi-task preview. Currently only the dragged `TaskRow` re-renders (via internal `useState`). To show all cascade members moving together during drag, GanttChart must maintain a `Map<taskId, {left, width}>` drag-override state and pass each TaskRow an optional position override that takes precedence over the task's own drag state. This avoids re-architecting the entire component tree.

**Primary recommendation:** Add a `cascadeOverrides: Map<string, {left, width}>` state to GanttChart, populate it from an `onCascadeProgress` callback during drag, and pass each TaskRow an `overridePosition` prop that replaces its computed position when set.

---

## Standard Stack

No new libraries are needed. Phase 7 is pure algorithmic logic on top of existing infrastructure.

### Core (already in place)
| File | Purpose | Status |
|------|---------|--------|
| `src/hooks/useTaskDrag.ts` | Global drag singleton, constraint clamping | Exists — extend |
| `src/utils/dependencyUtils.ts` | `buildAdjacencyList`, `detectCycles`, `calculateSuccessorDate` | Exists — reuse |
| `src/components/GanttChart/GanttChart.tsx` | Orchestrator, cascade state, `onCascade` prop | Exists — extend |
| `src/components/TaskRow/TaskRow.tsx` | Position override prop | Exists — extend |
| `src/types/index.ts` | `Task`, `TaskDependency` types | Exists — may need `onCascade` type |

### New additions required
| Addition | Location | Why |
|----------|----------|-----|
| `getSuccessorChain(taskId, allTasks)` | `dependencyUtils.ts` | BFS/DFS traversal to collect cascade |
| `onCascade?: (tasks: Task[]) => void` prop | `GanttChartProps` | New public API callback |
| `onCascadeProgress` internal callback | `useTaskDrag` → GanttChart | Real-time drag preview for non-dragged tasks |
| `overridePosition?: {left: number; width: number}` | `TaskRowProps` | Let GanttChart drive preview position |
| `cascadeOverrides: Map<string, {left, width}>` | GanttChart state | Stores live override positions during drag |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Phase 7 Structure

The change is additive — no existing files are deleted or restructured.

```
src/
├── utils/
│   └── dependencyUtils.ts     # ADD: getSuccessorChain(), recalculateLag()
├── hooks/
│   └── useTaskDrag.ts         # EXTEND: cascade delta emit, boundary for child-left
├── components/
│   ├── GanttChart/
│   │   └── GanttChart.tsx     # EXTEND: cascadeOverrides state, onCascade prop
│   └── TaskRow/
│       └── TaskRow.tsx        # EXTEND: overridePosition prop
└── types/
    └── index.ts               # No changes needed (onCascade lives on GanttChartProps)
```

---

### Pattern 1: Successor Chain Traversal (BFS)

**What:** Given a dragged task ID, return all FS successor tasks in topological order (BFS from the dragged node through the `buildAdjacencyList` graph, FS edges only).

**When to use:** Called once when drag starts to build the cascade chain; also re-evaluated at drag completion.

**Why BFS over DFS:** BFS gives natural level-order (breadth-first), which is intuitive for cascade — direct successors shift first, then their successors. DFS is equally valid for correctness but BFS ordering maps better to the user mental model. Either works; pick BFS for clarity.

```typescript
// Source: codebase analysis — dependencyUtils.ts pattern
export function getSuccessorChain(
  draggedTaskId: string,
  allTasks: Task[]
): Task[] {
  // Build successor map (FS only for Phase 7)
  const successorMap = new Map<string, string[]>();
  for (const task of allTasks) {
    successorMap.set(task.id, []);
  }
  for (const task of allTasks) {
    if (!task.dependencies) continue;
    for (const dep of task.dependencies) {
      if (dep.type === 'FS') {
        const list = successorMap.get(dep.taskId) ?? [];
        list.push(task.id);
        successorMap.set(dep.taskId, list);
      }
    }
  }

  // BFS from draggedTaskId
  const taskById = new Map(allTasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const queue = [draggedTaskId];
  const chain: Task[] = [];
  visited.add(draggedTaskId);

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

  return chain; // excludes the dragged task itself
}
```

**Confidence:** HIGH — pattern directly mirrors existing `buildAdjacencyList` in the codebase.

---

### Pattern 2: Hard Mode — Real-Time Cascade Preview

**What:** During drag in hard mode (`disableConstraints=false`), all chain members must visually follow the dragged task with the same pixel delta.

**When to use:** Every `requestAnimationFrame` in `handleGlobalMouseMove` when a cascade chain exists.

**How it works:**
1. On drag start, compute `cascadeChain: Task[]` from dragged task.
2. On each RAF, compute `deltaDays = Math.round((newLeft - initialLeft) / dayWidth)`.
3. Call `onCascadeProgress(Map<taskId, {left, width}>)` with adjusted positions for each chain member.
4. GanttChart stores this map in `cascadeOverrides` state.
5. Each TaskRow reads `overridePosition` prop — if set, uses it for `displayLeft/displayWidth`.

**Key detail:** The dragged TaskRow already updates its own position via internal `useState`. Only non-dragged chain members need the override.

```typescript
// In handleGlobalMouseMove (useTaskDrag.ts)
// After computing newLeft for dragged task:

if (cascadeChain.length > 0 && !disableConstraints) {
  const deltaDays = Math.round((newLeft - initialLeft) / dayWidth);
  const overrides = new Map<string, { left: number; width: number }>();
  for (const chainTask of cascadeChain) {
    const chainStartDate = new Date(chainTask.startDate);
    const chainEndDate = new Date(chainTask.endDate);
    // Compute original pixel position
    const origStartOffset = daysBetween(monthStart, chainStartDate);
    const origDuration = daysBetween(chainStartDate, chainEndDate);
    const chainLeft = Math.round((origStartOffset + deltaDays) * dayWidth);
    const chainWidth = Math.round((origDuration + 1) * dayWidth);
    overrides.set(chainTask.id, { left: chainLeft, width: chainWidth });
  }
  onCascadeProgress(overrides);
}
```

**Confidence:** HIGH — pattern is consistent with existing drag architecture.

---

### Pattern 3: Hard Mode — Child Moving Left Boundary

**What:** When dragging a child (successor) left, it must stop when its `newStartDate` reaches its predecessor's `startDate` (not `endDate`).

**Decision from CONTEXT.md:** The boundary is `predecessor.startDate`, allowing negative lag (child can start before predecessor ends but not before predecessor starts). No visual feedback — task simply stops.

**Current implementation gap:** The existing `canMoveTask` computes the constraint from `calculateSuccessorDate` with the current lag. This is the "lag-preserving" check. But for hard mode the boundary is `predecessor.startDate` specifically.

**Implementation:** Replace or supplement the existing `canMoveTask` check for hard mode:

```typescript
// Boundary for child dragging left (hard mode)
// Successor's startDate must be >= predecessor.startDate
function computeHardModeLeftBoundary(
  task: Task,
  allTasks: Task[],
  dayWidth: number,
  monthStart: Date
): number {
  let minLeft = 0;
  if (!task.dependencies) return minLeft;

  const taskById = new Map(allTasks.map(t => [t.id, t]));
  for (const dep of task.dependencies) {
    if (dep.type !== 'FS') continue;
    const predecessor = taskById.get(dep.taskId);
    if (!predecessor) continue;

    const predStart = new Date(predecessor.startDate);
    const predStartOffset = daysBetween(monthStart, predStart);
    const predStartLeft = Math.round(predStartOffset * dayWidth);
    minLeft = Math.max(minLeft, predStartLeft);
  }
  return minLeft;
}
```

**Confidence:** HIGH — directly derived from CONTEXT.md specification.

---

### Pattern 4: Soft Mode — Lag Recalculation on Completion

**What:** When `disableConstraints=true`, task moves freely. On `onComplete`, recalculate the lag for each FS dependency linking this task to its predecessors and successors.

**Recommendation (Claude's Discretion):** Deliver changed lag via `onChange(updatedTask)` where `updatedTask.dependencies` contains the recalculated lag values. This reuses the existing callback signature without adding a new API surface.

**Lag recalculation formula for FS:**
- `newLag = daysBetween(predecessor.endDate, newTask.startDate)`
- Positive lag = gap, Negative lag = overlap

```typescript
// On drag complete in soft mode
function recalculateIncomingLags(
  task: Task,
  newStartDate: Date,
  newEndDate: Date,
  allTasks: Task[]
): TaskDependency[] {
  if (!task.dependencies) return [];
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  return task.dependencies.map(dep => {
    if (dep.type !== 'FS') return dep; // Only recalc FS in Phase 7
    const predecessor = taskById.get(dep.taskId);
    if (!predecessor) return dep;
    const predEnd = new Date(predecessor.endDate);
    const lagDays = daysBetween(predEnd, newStartDate); // can be negative
    return { ...dep, lag: lagDays };
  });
}
```

**Confidence:** HIGH — formula is standard PM lag calculation.

---

### Pattern 5: ActiveDragState Extension

**What:** The global drag singleton `globalActiveDrag` must carry cascade chain info to support real-time preview.

**Additions needed to `ActiveDragState`:**

```typescript
interface ActiveDragState {
  // ... existing fields ...
  cascadeChain: Task[];       // FS successors of dragged task (Phase 7)
  onCascadeProgress?: (overrides: Map<string, { left: number; width: number }>) => void;
}
```

**Threading:** GanttChart passes `onCascadeProgress` down through `TaskRow` to `useTaskDrag`. The hook stores it in `globalActiveDrag`. On each RAF, it calls it to update `cascadeOverrides` in GanttChart state.

**Confidence:** HIGH — consistent with existing `onProgress`/`onComplete` callback pattern.

---

### Pattern 6: React.memo Implication for Cascade Preview

**What:** `TaskRow` uses `React.memo` with `arePropsEqual` that intentionally excludes `onChange`. But `overridePosition` IS a rendering prop — it must be included in the memo comparison.

**Risk:** If `overridePosition` is not added to `arePropsEqual`, chain tasks won't re-render during drag even though their override position changed.

**Fix:** Add `overridePosition` to the `arePropsEqual` check:

```typescript
const arePropsEqual = (prevProps: TaskRowProps, nextProps: TaskRowProps) => {
  return (
    // ... existing checks ...
    prevProps.overridePosition?.left === nextProps.overridePosition?.left &&
    prevProps.overridePosition?.width === nextProps.overridePosition?.width
  );
};
```

**Confidence:** HIGH — direct consequence of existing memo implementation.

---

### Anti-Patterns to Avoid

- **Traversing the chain on every RAF frame from scratch:** Expensive for deep chains. Pre-compute `cascadeChain` once on drag start and store in `globalActiveDrag`.
- **Passing the entire `allTasks` array as a prop that changes during drag:** This would cause all TaskRows to re-render. The existing architecture deliberately avoids this — do not change it.
- **Calling `setState` directly inside `requestAnimationFrame` on multiple TaskRows individually:** Use a single `cascadeOverrides: Map` in GanttChart state so only one `setState` fires per RAF.
- **Using lag recalculation in hard mode:** In hard mode, lag does NOT change (chain shifts as monolith). Only in soft mode does lag recalculate.
- **Ignoring the cycle guard:** Cycle detection is already in `detectCycles`. Since cycles would make BFS infinite, add the `visited` set guard (shown in Pattern 1) to `getSuccessorChain`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cycle detection during cascade | Custom loop check | `detectCycles()` from `dependencyUtils.ts` | Already tested, DFS-based |
| Successor graph | Manual O(n²) search | `buildAdjacencyList()` from `dependencyUtils.ts` | Already O(n) correct |
| Date-to-pixel conversion | Ad-hoc math | Existing pattern in `handleGlobalMouseMove` (lines 172-188) | UTC-safe, tested |
| Lag calculation | Hand-rolled days math | `calculateSuccessorDate()` in `dependencyUtils.ts` | All 4 link types, lag included |

**Key insight:** Phase 6 built a complete graph traversal and date arithmetic toolkit. Phase 7 is a consumer of that toolkit, not a builder.

---

## Common Pitfalls

### Pitfall 1: Cascade Chain Includes the Dragged Task
**What goes wrong:** `getSuccessorChain` accidentally includes the dragged task in the returned array. GanttChart then passes an override position to the dragged TaskRow, which conflicts with the TaskRow's own internal drag state.
**Why it happens:** Off-by-one in BFS initialization — starting the chain at `draggedTaskId` instead of its successors.
**How to avoid:** `getSuccessorChain` returns ONLY successors, not the dragged task itself (see Pattern 1 — dragged task is seeded in `visited` but not added to `chain`).
**Warning signs:** Dragged task bar "teleports" or shows double-update glitch.

### Pitfall 2: `cascadeOverrides` Not Cleared on Drag End
**What goes wrong:** After drag completes, `cascadeOverrides` map still holds stale pixel positions. Chain tasks render at their dragged-preview position instead of their state-computed position.
**Why it happens:** `onCascadeProgress` is called during drag but no cleanup call when drag ends.
**How to avoid:** In `handleComplete`/`handleCancel`, call `onCascadeProgress(new Map())` (empty map) to clear overrides before `onChange`/`onCascade` fires.
**Warning signs:** After releasing mouse, some chain tasks visually "jump" to a different position than their stored dates.

### Pitfall 3: `arePropsEqual` Misses `overridePosition`
**What goes wrong:** Chain tasks don't re-render during drag even though GanttChart updated `cascadeOverrides`.
**Why it happens:** `React.memo`'s `arePropsEqual` returns `true` (equal) even when `overridePosition` changed, because it wasn't included in the comparison.
**How to avoid:** See Pattern 6 — explicitly compare `overridePosition.left` and `overridePosition.width`.
**Warning signs:** Only the dragged task moves; chain tasks stay frozen during drag.

### Pitfall 4: Moving a Child Right — Chain Cascades Indefinitely
**What goes wrong:** Moving child right triggers cascade on child's successors, which is correct. But if the implementation also re-evaluates the parent-child relationship, it may unexpectedly shift the predecessor (parent).
**Why it happens:** Confusing "predecessor chain" with "successor chain". Moving a child should only affect ITS successors, not its predecessors.
**How to avoid:** `getSuccessorChain` only follows successor edges (child → grandchild, etc.), never predecessor edges (child → parent).
**Warning signs:** Moving a child causes its parent to shift unexpectedly.

### Pitfall 5: Multiple Predecessors — Wrong Tasks Shifted
**What goes wrong:** Task C has predecessors A and B. User drags A. C gets shifted. B's lag to C is now wrong.
**What SHOULD happen (per CONTEXT.md):** Only A drives C's shift. B's lag to C is recalculated automatically.
**Why it happens:** Implementation resets ALL predecessors to zero-lag instead of only recalculating non-dragged-chain predecessors.
**How to avoid:** When computing cascade shifts, only adjust the `lag` for dependencies where the predecessor is NOT in the cascade chain. For chain-predecessors, keep lag as-is (the relationship holds because both predecessor and successor shifted by the same delta).
**Warning signs:** After cascade drag, dependency arrows have wrong visual positions.

### Pitfall 6: Left Boundary Uses `endDate` Instead of `startDate`
**What goes wrong:** Child task can be dragged to the left until it reaches `predecessor.endDate` (the standard FS boundary), not `predecessor.startDate`. This is stricter than the spec requires.
**Per CONTEXT.md:** The boundary is `predecessor.startDate` — negative lag is allowed (child can start before predecessor ends).
**How to avoid:** In hard-mode left boundary calculation, use `predecessor.startDate` as the pixel floor (Pattern 3).
**Warning signs:** Child task cannot be dragged into the "negative lag zone" (between predecessor start and end).

---

## Code Examples

### Utility: daysBetween (helper needed in dependencyUtils.ts)
```typescript
// Source: existing pattern in useTaskDrag.ts (lines 173-188)
// Reusable UTC-safe day difference
function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) -
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) /
      (24 * 60 * 60 * 1000)
  );
}
```

### GanttChart: onCascade prop and cascadeOverrides state
```typescript
// Source: codebase analysis — GanttChart.tsx extension pattern
export interface GanttChartProps {
  // ... existing ...
  /** Called when a cascade drag completes; receives all shifted tasks including dragged task */
  onCascade?: (tasks: Task[]) => void;
}

// Inside GanttChart component:
const [cascadeOverrides, setCascadeOverrides] = useState<Map<string, { left: number; width: number }>>(new Map());

const handleCascadeProgress = useCallback((overrides: Map<string, { left: number; width: number }>) => {
  setCascadeOverrides(new Map(overrides)); // new Map to trigger re-render
}, []);
```

### TaskRow: overridePosition prop usage
```typescript
// Source: codebase analysis — TaskRow.tsx extension pattern
export interface TaskRowProps {
  // ... existing ...
  overridePosition?: { left: number; width: number };
}

// Inside TaskRow render:
const displayLeft = overridePosition?.left ?? (isDragging ? currentLeft : left);
const displayWidth = overridePosition?.width ?? (isDragging ? currentWidth : width);
```

### onCascade callback — build updated task list on complete
```typescript
// Source: codebase analysis — useTaskDrag.ts completion pattern
// On drag complete (hard mode), reconstruct tasks with new dates:
function buildCascadedTasks(
  draggedTask: Task,
  draggedNewStart: Date,
  draggedNewEnd: Date,
  cascadeChain: Task[],
  deltaDays: number
): Task[] {
  const result: Task[] = [{
    ...draggedTask,
    startDate: draggedNewStart.toISOString(),
    endDate: draggedNewEnd.toISOString(),
  }];

  for (const chainTask of cascadeChain) {
    const origStart = new Date(chainTask.startDate);
    const origEnd = new Date(chainTask.endDate);
    const newStart = new Date(Date.UTC(
      origStart.getUTCFullYear(),
      origStart.getUTCMonth(),
      origStart.getUTCDate() + deltaDays
    ));
    const newEnd = new Date(Date.UTC(
      origEnd.getUTCFullYear(),
      origEnd.getUTCMonth(),
      origEnd.getUTCDate() + deltaDays
    ));
    result.push({
      ...chainTask,
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString(),
    });
  }
  return result;
}
```

---

## State of the Art

| Old Approach (Phase 6) | New Approach (Phase 7) | Impact |
|------------------------|------------------------|--------|
| Block single task move at constraint boundary | Cascade entire FS chain on predecessor drag | Chain moves as monolith |
| `onChange(task)` for each drag completion | `onCascade(tasks[])` for cascade drags | Consumer gets full picture |
| No real-time preview for non-dragged tasks | `cascadeOverrides` Map drives preview for chain | UX: chain moves in real time |
| `disableConstraints` skips constraint check | `disableConstraints` enables soft mode (lag recalc) | Semantics refined |

**Existing (valid) patterns that stay:**
- Global drag singleton for HMR safety — keep as-is
- `requestAnimationFrame` throttle — keep as-is
- `React.memo` with `arePropsEqual` — extend, don't replace
- UTC-only date arithmetic — keep using `Date.UTC()`

---

## Open Questions

1. **Where does `getSuccessorChain` live?**
   - What we know: `dependencyUtils.ts` already has `buildAdjacencyList` and graph traversal code
   - Recommendation: Add `getSuccessorChain` to `dependencyUtils.ts` alongside the existing graph utilities

2. **How does `onCascadeProgress` thread from useTaskDrag to GanttChart?**
   - What we know: `onDragEnd` already threads from GanttChart → TaskRow → useTaskDrag via props
   - Recommendation: Add `onCascadeProgress` to `UseTaskDragOptions` and thread through the same path; GanttChart passes it from `handleCascadeProgress` callback

3. **What happens when `onChange` vs `onCascade` is called in GanttChart?**
   - Recommendation: When `onCascade` fires, do NOT also call `onChange` for the dragged task (it's already in the cascade array). When `onCascade` is absent, fall back to calling `onChange` for just the dragged task (backward-compatible behavior).

4. **Should `onCascade` be called in soft mode?**
   - Per CONTEXT.md: Soft mode changes lag of dragged task's dependencies. This is a single-task update.
   - Recommendation: Soft mode calls `onChange(updatedTask)` with recalculated `dependencies[]`. Hard mode calls `onCascade(tasks[])`. No cross-contamination.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `packages/gantt-lib/src/hooks/useTaskDrag.ts` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/utils/dependencyUtils.ts` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/types/index.ts` (full file read)
- `.planning/phases/07-dependencies-constraits/07-CONTEXT.md` — locked user decisions
- `.planning/phases/06-dependencies/06-03-SUMMARY.md` — Phase 6 constraint integration summary
- `.planning/quick/12-fs/12-SUMMARY.md` — Quick-12 clamp-to-boundary fix details

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — project decisions and technology choices
- `.planning/REQUIREMENTS.md` — v1 requirements (no new requirements for Phase 7)
- `.planning/phases/06-dependencies/06-04-PLAN.md` — Phase 6 test and demo plan

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing codebase
- Architecture: HIGH — patterns derived directly from existing code and CONTEXT.md
- Pitfalls: HIGH — identified from code inspection, not speculation
- Cascade algorithm: HIGH — BFS is standard, existing `buildAdjacencyList` confirms graph structure
- React.memo implications: HIGH — `arePropsEqual` implementation read directly

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable codebase, no fast-moving dependencies)
