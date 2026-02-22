# Phase 8: SS dependency - Research

**Researched:** 2026-02-22
**Domain:** SS (Start-to-Start) drag constraint enforcement — extending Phase 7 cascade engine from FS-only to FS+SS
**Confidence:** HIGH (all findings from direct codebase inspection; no new libraries required)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase boundary:** SS constraint enforcement only. FS constraints remain as-is. FF and SF are deferred.

**SS formula:** `startB = startA + lag`, where `lag >= 0` (never negative).

**Moving predecessor A:**
- A moves right: `startB += delta`, lag constant — B follows.
- A moves left: `startB -= delta`, lag constant — B follows. When `lag → 0` (i.e., `startB = startA`), they continue moving together as a unit; lag stays 0 (does not go negative).

**Moving successor B:**
- B moves right: lag increases freely, no upper bound.
- B moves left: constrained at `lag = 0`. `startB = max(startA, startB - delta)`. B cannot go left of A's start.

**Resizing predecessor A:**
- Right edge of A moves (expand or shrink): `startA` unchanged → lag unchanged → B does not move.
- Left edge of A moves left (expand): `startA -= delta` → `startB -= delta` — B moves with A to preserve lag.
- Left edge of A moves right (shrink): `startA += delta` → `startB += delta` — B moves with A to preserve lag.

**Resizing successor B:**
- Right edge of B: `startB` unchanged → lag unchanged → no SS effect.
- Left edge of B moves left (expand): lag decreases. Constrained at `lag = 0`: `startB = max(startA, startB - delta)`.
- Left edge of B moves right (shrink): lag increases freely, no upper bound.

**Hard/soft mode:** Same architecture as FS (Phase 7).
- Hard mode (`disableConstraints=false`): cascade chain moves as monolith, B is dragged with A.
- Soft mode (`disableConstraints=true`): free movement, lag recalculated on completion.

**Cascade chain extension:** Extend existing `getSuccessorChain` BFS engine to follow SS links in addition to FS links. `delta_B = delta_A` (same shift, lag preserved).

### Claude's Discretion

- How to recalculate SS lag in soft mode (analogous to FS `recalculateIncomingLags` — recommended: extend same function to also recalc SS deps).
- Whether to factor SS cascade into resize-right (per spec: resize-right of A does NOT change startA, so no SS cascade needed for resize-right of A).
- Test coverage granularity (unit tests for new SS branches recommended).

### Deferred Ideas (OUT OF SCOPE)

- FF (Finish-to-Finish) constraint enforcement — separate phase.
- SF (Start-to-Finish) constraint enforcement — separate phase.
- Mixed FS+SS cascade chains (A→(FS)→B→(SS)→C) — deferred until all constraint types implemented.
</user_constraints>

---

## Summary

Phase 8 extends the Phase 7 FS constraint system to also handle SS (Start-to-Start) links. The core semantics differ from FS in two key ways: (1) the constraint anchor is `startA` rather than `endA`, and (2) SS lag is always non-negative (successor cannot start before its predecessor). The implementation touches exactly the same files as Phase 7 — `dependencyUtils.ts`, `useTaskDrag.ts`, and optionally the demo page — without introducing new components or libraries.

The largest structural change is extending `getSuccessorChain` to traverse both FS and SS edges. Currently it only follows `dep.type === 'FS'` links, so SS successors are invisible to the cascade engine. Once extended, the hard-mode cascade preview (`onCascadeProgress`) and completion handler (`onCascade`) will automatically move SS successors alongside FS successors because the delta math is identical (`delta_B = delta_A`).

The second structural change is the constraint clamp in `handleGlobalMouseMove`. The existing block clamps `newLeft` against `predecessor.startDate` only for `dep.type === 'FS'`. An analogous block must be added for SS: when moving or resize-left dragging B, `newLeft` cannot go below `predecessor.startDate` in pixels (same formula as the FS boundary — because for SS, `startB >= startA` by definition, matching the FS soft-constraint of `startB >= predStartDate`). Similarly, `recalculateIncomingLags` currently only recalcs FS links; it must be extended to recalc SS links using the `startA → startB` formula instead of `endA → startB`.

**Primary recommendation:** Extend `getSuccessorChain` to follow FS+SS edges; extend the constraint clamp in `handleGlobalMouseMove` for SS; extend `recalculateIncomingLags` for SS; add `getSuccessorChainSS` or a unified function. No new files, no new libraries.

---

## Standard Stack

No new libraries needed. Phase 8 is pure algorithmic extension of existing Phase 7 infrastructure.

### Core (already in place)

| File | Purpose | Status |
|------|---------|--------|
| `src/utils/dependencyUtils.ts` | `getSuccessorChain` (FS-only BFS), `calculateSuccessorDate` (SS already handled), `recalculateIncomingLags` (FS-only) | Exists — extend |
| `src/hooks/useTaskDrag.ts` | Global drag singleton with cascade chain, constraint clamp, lag recalculation | Exists — extend |
| `src/components/GanttChart/GanttChart.tsx` | `cascadeOverrides` state, `handleCascade`, `onCascade` prop | Exists — no change needed |
| `src/components/TaskRow/TaskRow.tsx` | `overridePosition` prop, cascade wiring | Exists — no change needed |
| `src/types/index.ts` | `TaskDependency`, `LinkType = 'FS' | 'SS' | 'FF' | 'SF'` | Exists — no change needed |

### Changes required

| Change | Location | What |
|--------|----------|------|
| Extend `getSuccessorChain` | `dependencyUtils.ts` | Follow `dep.type === 'FS' \|\| dep.type === 'SS'` edges |
| Extend constraint clamp (move + resize-left) | `useTaskDrag.ts` `handleGlobalMouseMove` | Add SS case alongside existing FS case (same boundary formula: `startB >= startA`) |
| Extend cascade block (move only) | `useTaskDrag.ts` `handleGlobalMouseMove` | SS cascade uses same delta as FS; already works once chain includes SS |
| Extend `recalculateIncomingLags` | `useTaskDrag.ts` | Add SS lag formula: `newLag = daysBetween(predecessor.startDate, newSuccessorStartDate)` |
| A moves left with SS: lag floor at 0 | `useTaskDrag.ts` | When A drags left, B follows but lag cannot go below 0 (currently no floor for FS) |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Phase 8 Structure

All changes are additive within existing files:

```
src/
├── utils/
│   └── dependencyUtils.ts     # EXTEND: getSuccessorChain follows SS edges; recalculateIncomingLags adds SS case
└── hooks/
    └── useTaskDrag.ts         # EXTEND: SS constraint clamp; SS lag recalculation; SS-aware cascade
```

No new files. GanttChart.tsx and TaskRow.tsx require zero changes — the cascade mechanism is already generic (Map of overrides flows through regardless of link type).

---

### Pattern 1: Extend getSuccessorChain to FS+SS

**What:** Replace `dep.type === 'FS'` filter with `dep.type === 'FS' || dep.type === 'SS'`.

**When to use:** Called once on drag start in `handleMouseDown` to populate `globalActiveDrag.cascadeChain`.

**Current code (dependencyUtils.ts lines 153-166):**
```typescript
for (const task of allTasks) {
  if (!task.dependencies) continue;
  for (const dep of task.dependencies) {
    if (dep.type === 'FS') {                    // <-- Phase 7: FS only
      const list = successorMap.get(dep.taskId) ?? [];
      list.push(task.id);
      successorMap.set(dep.taskId, list);
    }
  }
}
```

**Phase 8 change:**
```typescript
    if (dep.type === 'FS' || dep.type === 'SS') {   // Phase 8: FS + SS
```

**Confidence:** HIGH — direct read of `dependencyUtils.ts` lines 148-190. The rest of `getSuccessorChain` (BFS loop, visited set, chain building) is unchanged.

**Key insight:** The delta math for SS cascade is `delta_B = delta_A` (same as FS), so once the SS successor is in the chain, the existing cascade preview emission loop in `handleGlobalMouseMove` (lines 238-267) works without modification.

---

### Pattern 2: SS Constraint Clamp — Moving/Resize-Left of Successor B

**What:** When B (SS successor) is dragged left (move or resize-left in hard mode), it cannot go past A's startDate. This is structurally identical to the existing FS constraint.

**Current FS clamp code (useTaskDrag.ts ~lines 206-235):**
```typescript
if ((mode === 'move' || mode === 'resize-left') && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
  const currentTask = allTasks.find(t => t.id === globalActiveDrag?.taskId);
  if (currentTask && currentTask.dependencies && currentTask.dependencies.length > 0) {
    let minAllowedLeft = 0;
    for (const dep of currentTask.dependencies) {
      if (dep.type !== 'FS') continue;           // <-- Phase 7: FS only
      const predecessor = globalActiveDrag.allTasks.find(t => t.id === dep.taskId);
      if (!predecessor) continue;
      const predStart = new Date(predecessor.startDate as string);
      const predStartOffset = Math.round(
        (Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate()) -
          Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate())
        ) / (24 * 60 * 60 * 1000)
      );
      const predStartLeft = Math.round(predStartOffset * globalActiveDrag.dayWidth);
      minAllowedLeft = Math.max(minAllowedLeft, predStartLeft);
    }
    newLeft = Math.max(minAllowedLeft, newLeft);
  }
  ...
}
```

**Phase 8 change:** The boundary for SS is also `predecessor.startDate` (because `startB >= startA` per spec). So the clamp formula is identical. Change the filter:

```typescript
      if (dep.type !== 'FS' && dep.type !== 'SS') continue;   // Phase 8: FS + SS
```

**Confidence:** HIGH — the SS constraint formula `startB >= startA` produces the same pixel floor as the FS `startB >= startA` formula already in use. This is not coincidental: both FS and SS constrain the successor's start date relative to the predecessor's start date.

---

### Pattern 3: SS Predecessor Left-Edge Resize — B Follows A

**What:** When A's left edge is resized (expand or shrink), `startA` changes and B must follow to preserve lag. This is a new behavior not in Phase 7 (FS resize-left of predecessor does nothing to B because FS only cares about endA).

**Mechanism:** During resize-left of A, `handleGlobalMouseMove` computes `newLeft` for A. We need to check: does the dragged task (A) have any SS successors? If so, emit their new positions via `onCascadeProgress` with the same delta.

**Trigger:** `mode === 'resize-left'` AND the dragged task is a PREDECESSOR (has SS successors in its chain).

**Delta for B:** `deltaDays = Math.round((newLeft - initialLeft) / dayWidth)` — same formula as move cascade.

**Current cascade block (lines 238-267) only fires for `mode === 'move' || mode === 'resize-right'`:**
```typescript
if ((mode === 'move' || mode === 'resize-right') && !globalActiveDrag.disableConstraints &&
    globalActiveDrag.cascadeChain.length > 0 && globalActiveDrag.onCascadeProgress) {
```

**Phase 8 change:** Add `mode === 'resize-left'` to cascade emission when chain has SS successors.

**BUT:** This only applies when A has SS successors. For FS successors, resize-left of A does NOT cascade (FS depends on endA, not startA). So a nuanced change is needed: the cascade chain stored in `globalActiveDrag.cascadeChain` should only include SS successors when the drag mode is `resize-left`. For `move` and `resize-right`, the cascade chain includes FS+SS successors (as extended in Pattern 1).

**Implementation option:** Store separate `cascadeChainFS` and `cascadeChainSS` in `globalActiveDrag`, or filter at emission time:
- Simplest: Keep one `cascadeChain` (FS+SS), but at emission time filter based on mode:
  - `move`: emit for all chain members (FS+SS).
  - `resize-right`: emit for FS chain only (endA changed → FS successors follow; SS not affected by endA).
  - `resize-left`: emit for SS chain only (startA changed → SS successors follow; FS not affected by startA).

**Recommended approach:** Store the full FS+SS chain in `cascadeChain`, but tag each entry with which dependency type caused its inclusion, OR use separate chain fields:

```typescript
interface ActiveDragState {
  // ...existing fields...
  cascadeChain: Task[];        // FS+SS successors (Phase 8: extended from FS-only)
  cascadeChainFSOnly: Task[];  // FS-only successors (for resize-right mode)
  cascadeChainSSOnly: Task[];  // SS-only successors (for resize-left mode)
}
```

Then emit based on mode:
- `move`: use `cascadeChain` (all FS+SS successors)
- `resize-right`: use `cascadeChainFSOnly`
- `resize-left`: use `cascadeChainSSOnly`

**Confidence:** HIGH for the analysis, MEDIUM for the exact implementation structure (discretion area for the planner to finalize the split-chain vs. filter approach).

---

### Pattern 4: SS Lag Recalculation in Soft Mode

**What:** In soft mode (`disableConstraints=true`), when B (SS successor) is dragged, the SS lag must be recalculated on completion. Similarly, when A (SS predecessor) is dragged, B's SS lag to A recalculates.

**Current `recalculateIncomingLags` (useTaskDrag.ts lines 140-165) — FS only:**
```typescript
function recalculateIncomingLags(
  task: Task,
  newStartDate: Date,
  allTasks: Task[]
): NonNullable<Task['dependencies']> {
  if (!task.dependencies) return [];
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  return task.dependencies.map(dep => {
    if (dep.type !== 'FS') return dep;          // <-- Phase 7: FS only
    const predecessor = taskById.get(dep.taskId);
    if (!predecessor) return dep;
    const predEnd = new Date(predecessor.endDate as string);
    const lagMs = Date.UTC(newStartDate.getUTCFullYear(), ...)
                - Date.UTC(predEnd.getUTCFullYear(), ...);
    const lagDays = Math.round(lagMs / (24 * 60 * 60 * 1000));
    return { ...dep, lag: lagDays };
  });
}
```

**Phase 8 extension:**
```typescript
  return task.dependencies.map(dep => {
    if (dep.type === 'FS') {
      // Existing FS: lag = newSuccessorStart - predecessorEnd
      const predecessor = taskById.get(dep.taskId);
      if (!predecessor) return dep;
      const predEnd = new Date(predecessor.endDate as string);
      const lagMs = Date.UTC(newStartDate.getUTCFullYear(), newStartDate.getUTCMonth(), newStartDate.getUTCDate())
                  - Date.UTC(predEnd.getUTCFullYear(), predEnd.getUTCMonth(), predEnd.getUTCDate());
      const lagDays = Math.round(lagMs / (24 * 60 * 60 * 1000));
      return { ...dep, lag: lagDays };
    }
    if (dep.type === 'SS') {
      // Phase 8: lag = newSuccessorStart - predecessorStart (clamped to 0 minimum)
      const predecessor = taskById.get(dep.taskId);
      if (!predecessor) return dep;
      const predStart = new Date(predecessor.startDate as string);
      const lagMs = Date.UTC(newStartDate.getUTCFullYear(), newStartDate.getUTCMonth(), newStartDate.getUTCDate())
                  - Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate());
      const lagDays = Math.max(0, Math.round(lagMs / (24 * 60 * 60 * 1000))); // SS lag >= 0
      return { ...dep, lag: lagDays };
    }
    return dep; // FF, SF: unchanged
  });
```

**Confidence:** HIGH — formula directly derived from SS constraint spec: `lag = startB - startA`. The `Math.max(0, ...)` floor enforces the CONTEXT.md constraint that SS lag is never negative.

---

### Pattern 5: A Moves Left with SS — Lag Floor at Zero

**What:** When A (predecessor) drags left, B follows to preserve lag. However, if A has moved so far left that `startA` would go past `startB`, the lag would go negative — which violates SS semantics. In this case, A and B continue moving together as a unit (lag stays 0, `startB = startA`).

**Current FS behavior:** For FS, when A moves left, B follows with the same delta (lag constant). There is no floor because FS lag CAN go negative (child can start before predecessor ends). For SS, however, lag >= 0 is required.

**Implementation:** In the cascade emission loop (`handleGlobalMouseMove`, the cascade block), when emitting SS successors during A's move-left:

For each SS successor B in the cascade chain, compute:
```
chainLeft = max(chainLeft + deltaDays * dayWidth, originalChainLeft)  // but also:
```

More precisely, the floor is: `chainStartDate + deltaDays >= chainStartDate - lag` → which is always true if we clamp `chainLeft` so it doesn't go below `predecessorNewLeft`.

Actually, per spec: when A moves left far enough that `lag → 0`, `startB = startA` and they continue moving together. The cascade delta already achieves this: `chainLeft = (chainStartOffset + deltaDays) * dayWidth`. The issue arises only if the cascade would result in `chainLeft < predecessorNewLeft`. In that case, clamp: `chainLeft = max(chainLeft, newLeft)` where `newLeft` is the dragged A's new left.

**Confidence:** MEDIUM — the logic is derivable from spec but requires careful pixel-level implementation. The cascade loop iterates chain tasks without knowing which is the "dragged A" vs. chain members. The planner should add the `newLeft` floor to SS-type chain entries.

---

### Pattern 6: Cascade Completion — SS Hard Mode

**What:** On drag completion in hard mode, `handleComplete` in useTaskDrag calls `onCascade(cascadedTasks)`. Currently, the delta used to shift chain tasks is computed from `endDate` change (for FS, where the end moves). For SS cascade during move of A, the delta comes from `startDate` change of A.

**Current code (useTaskDrag.ts lines 498-513):**
```typescript
const origEndMs = Date.UTC(initialEndDate.getUTCFullYear(), ...);
const newEndMs = Date.UTC(newEndDate.getUTCFullYear(), ...);
const deltaDays = Math.round((newEndMs - origEndMs) / (24 * 60 * 60 * 1000));
```

**Issue:** For SS, when A is moved (not resized), `endDate` and `startDate` both shift by the same delta, so this formula still works. For resize-left of A (SS only), `endDate` is unchanged but `startDate` changes — the delta must come from start, not end.

**Phase 8 change for resize-left cascade completion:**
```typescript
// For resize-left mode: delta is startDate change (endDate fixed)
const origStartMs = Date.UTC(initialStartDate.getUTCFullYear(), ...);
const newStartMs = Date.UTC(newStartDate.getUTCFullYear(), ...);
const deltaDays = Math.round((newStartMs - origStartMs) / (24 * 60 * 60 * 1000));
```

The chain shift logic (`origStart + deltaDays → newStart`) is unchanged.

**Confidence:** HIGH — derived from code inspection of `handleComplete` and the cascade delta formula.

---

### Anti-Patterns to Avoid

- **Treating SS the same as FS in all respects:** FS lag can be negative (child starts before predecessor ends); SS lag is always >= 0. The soft-mode lag recalculation must apply `Math.max(0, ...)` for SS but NOT for FS.
- **Including SS successors in resize-right cascade:** A's right edge expanding does NOT change `startA`, so SS successors should NOT be moved. Only FS successors are affected by resize-right.
- **Forgetting resize-left cascade for SS:** A's left edge shrinking/expanding DOES change `startA`, so SS successors MUST be moved. This is the key difference between Phase 7 (FS: resize-left has no cascade) and Phase 8 (SS: resize-left causes cascade).
- **Using endDate for SS lag calculation:** FS lag uses `endA → startB`; SS lag uses `startA → startB`. Do not reuse the FS formula for SS.
- **Not flooring SS lag at 0 in cascade boundary:** When A moves left and the cascade would produce lag < 0, clamp to lag = 0 and have B move with A.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SS successor traversal | New separate BFS | Extend `getSuccessorChain` with `dep.type === 'SS'` | Same BFS, same visited-set cycle guard |
| SS boundary pixel calculation | New formula | Same as existing FS: `predStartLeft = predStartOffset * dayWidth` | For both FS and SS, the floor is predecessor's `startDate` pixel offset |
| SS lag recalculation | New function | Extend `recalculateIncomingLags` with SS case | Same structure, different base date (`startA` vs `endA`) |
| Cascade emission for SS | New emission loop | Same `Map<taskId, {left, width}>` pattern | `delta_B = delta_A` for SS, identical to FS |
| UTC date arithmetic | Local date math | Existing `Date.UTC()` pattern | Already UTC-safe, tested |

**Key insight:** Phase 7 designed the cascade engine generically enough that Phase 8 is 90% extension of existing branches, not new code.

---

## Common Pitfalls

### Pitfall 1: Resize-Right of A Incorrectly Cascades SS Successors

**What goes wrong:** When A's right edge is resized, SS successor B is incorrectly moved.
**Why it happens:** After extending `getSuccessorChain` to include SS, the cascade block fires for resize-right because `globalActiveDrag.cascadeChain.length > 0`. But resize-right changes `endA`, not `startA`, so SS (Start-to-Start) is unaffected.
**How to avoid:** Use mode-aware chain selection. The cascade emission block must only emit SS successors for `mode === 'move'` and `mode === 'resize-left'`. For `mode === 'resize-right'`, only emit FS successors.
**Warning signs:** Dragging A's right edge causes B to move.

### Pitfall 2: SS Lag Goes Negative in Soft Mode

**What goes wrong:** After dragging B left in soft mode, the recorded SS lag is negative (e.g., `-2`). This violates the SS constraint and corrupts the dependency data.
**Why it happens:** `recalculateIncomingLags` computes `lagDays = startB - startA`, which can be negative if B ends up before A.
**How to avoid:** Apply `Math.max(0, lagDays)` for SS type in `recalculateIncomingLags`. FS lag does NOT get this floor (FS can be negative).
**Warning signs:** After soft-mode drag of SS successor leftward, `task.dependencies[n].lag` becomes negative.

### Pitfall 3: A Moving Left Causes B to Overshoot (Lag Becomes Negative)

**What goes wrong:** When A moves far left, the cascade brings B with it. If the cascade result would place `startB < startA`, the visual shows B starting before A — violating SS.
**Why it happens:** The cascade delta is applied uniformly: `chainLeft = originalChainLeft + deltaDays * dayWidth`. If `deltaDays` is large and negative, `chainLeft` could go below `newLeft` (A's new position).
**How to avoid:** After computing `chainLeft` for an SS successor, clamp: `chainLeft = Math.max(chainLeft, newLeft_of_A)`.
**Warning signs:** During drag of A leftward, B's bar visually appears to the left of A.

### Pitfall 4: `recalculateIncomingLags` Called with Wrong "newStartDate" for Resize-Left of B

**What goes wrong:** When B's left edge is resize-left dragged, `recalculateIncomingLags` is called. For SS, the lag should be `newStartDate_B - startDate_A`. But if the function is called with `initialStartDate` instead of the actual new start date, the lag is wrong.
**Why it happens:** `handleComplete` computes `newStartDate` from `finalLeft / dayWidth`. This is correct. But ensure the soft-mode lag recalculation path uses the `newStartDate` from the drag completion, not a stale reference.
**How to avoid:** Confirm that the same `newStartDate` variable fed to FS lag recalculation is used for SS lag recalculation.
**Warning signs:** After resize-left of B in soft mode, the dependency lag in state does not match the visual gap.

### Pitfall 5: `getSuccessorChain` Called on Drag Start Stores SS Successors for ALL Modes

**What goes wrong:** `getSuccessorChain` now returns FS+SS successors. But `globalActiveDrag.cascadeChain` is used for all modes. For resize-right (where only FS cascade applies), SS successors are incorrectly moved.
**Why it happens:** `handleMouseDown` calls `getSuccessorChain` once and stores the full list.
**How to avoid:** Either (a) store separate `cascadeChainFS` and `cascadeChainSS` fields in `ActiveDragState`, or (b) add link-type metadata to each chain member. The emission block then filters based on mode.
**Warning signs:** See Pitfall 1 for the symptom.

### Pitfall 6: Resize-Left of A (SS predecessor) Does Not Cascade

**What goes wrong:** When A's left edge is moved, B (SS successor) stays put despite the spec requiring B to follow.
**Why it happens:** Phase 7 left the cascade block condition as `mode === 'move' || mode === 'resize-right'`, deliberately excluding `resize-left` (correct for FS: FS cares about endA, not startA). For SS, resize-left of A MUST cascade.
**How to avoid:** Add `|| (mode === 'resize-left' && cascadeChainSS.length > 0)` to the cascade block condition. Only emit SS successors in this case.
**Warning signs:** Dragging A's left edge does not move B.

---

## Code Examples

### Extension 1: getSuccessorChain — FS+SS

```typescript
// Source: dependencyUtils.ts lines 153-167 — extend filter
for (const task of allTasks) {
  if (!task.dependencies) continue;
  for (const dep of task.dependencies) {
    if (dep.type === 'FS' || dep.type === 'SS') {  // Phase 8: add SS
      const list = successorMap.get(dep.taskId) ?? [];
      list.push(task.id);
      successorMap.set(dep.taskId, list);
    }
  }
}
```

### Extension 2: ActiveDragState — split cascade chains

```typescript
// Source: useTaskDrag.ts ActiveDragState interface — extend
interface ActiveDragState {
  // ... existing fields ...
  cascadeChain: Task[];           // FS+SS successors (all modes)
  cascadeChainFS: Task[];         // FS-only successors (resize-right cascade)
  cascadeChainSS: Task[];         // SS-only successors (resize-left cascade)
  onCascadeProgress?: (overrides: Map<string, { left: number; width: number }>) => void;
}
```

### Extension 3: Constraint clamp — add SS

```typescript
// Source: useTaskDrag.ts handleGlobalMouseMove ~line 208
for (const dep of currentTask.dependencies) {
  if (dep.type !== 'FS' && dep.type !== 'SS') continue;  // Phase 8: add SS
  // ... rest of boundary calculation unchanged ...
}
```

### Extension 4: recalculateIncomingLags — SS case

```typescript
// Source: useTaskDrag.ts lines 140-165 — extend
return task.dependencies.map(dep => {
  if (dep.type === 'FS') {
    // ... existing FS lag formula (endA → startB) ...
    const predEnd = new Date(predecessor.endDate as string);
    const lagMs = Date.UTC(newStartDate.getUTCFullYear(), newStartDate.getUTCMonth(), newStartDate.getUTCDate())
                - Date.UTC(predEnd.getUTCFullYear(), predEnd.getUTCMonth(), predEnd.getUTCDate());
    const lagDays = Math.round(lagMs / (24 * 60 * 60 * 1000));
    return { ...dep, lag: lagDays };
  }
  if (dep.type === 'SS') {
    // Phase 8: SS lag = startB - startA, clamped to >= 0
    const predecessor = taskById.get(dep.taskId);
    if (!predecessor) return dep;
    const predStart = new Date(predecessor.startDate as string);
    const lagMs = Date.UTC(newStartDate.getUTCFullYear(), newStartDate.getUTCMonth(), newStartDate.getUTCDate())
                - Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate());
    const lagDays = Math.max(0, Math.round(lagMs / (24 * 60 * 60 * 1000)));
    return { ...dep, lag: lagDays };
  }
  return dep;
});
```

### Extension 5: Cascade emission — mode-aware chain selection

```typescript
// Source: useTaskDrag.ts handleGlobalMouseMove ~line 238
// Phase 8: select correct chain based on mode
const activeChain =
  mode === 'resize-right'  ? globalActiveDrag.cascadeChainFS :
  mode === 'resize-left'   ? globalActiveDrag.cascadeChainSS :
  /* move */                 globalActiveDrag.cascadeChain;     // FS+SS

if ((mode === 'move' || mode === 'resize-right' || (mode === 'resize-left' && globalActiveDrag.cascadeChainSS.length > 0))
    && !globalActiveDrag.disableConstraints
    && activeChain.length > 0
    && globalActiveDrag.onCascadeProgress) {
  const deltaDays = mode === 'resize-right'
    ? Math.round((newWidth - globalActiveDrag.initialWidth) / globalActiveDrag.dayWidth)
    : Math.round((newLeft - globalActiveDrag.initialLeft) / globalActiveDrag.dayWidth);

  const overrides = new Map<string, { left: number; width: number }>();
  for (const chainTask of activeChain) {
    // ... existing position computation ...
    // For SS chain during move-left: clamp chainLeft >= newLeft (predecessor's new position)
    if (mode !== 'resize-right' && /* chainTask is SS successor */ ) {
      chainLeft = Math.max(chainLeft, newLeft);
    }
    overrides.set(chainTask.id, { left: chainLeft, width: chainWidth });
  }
  globalActiveDrag.onCascadeProgress(overrides);
}
```

### Extension 6: handleMouseDown — populate split chain fields

```typescript
// Source: useTaskDrag.ts handleMouseDown ~line 651
const fullChain = getSuccessorChain(taskId, allTasks);  // now returns FS+SS
const fsChain = fullChain.filter(t => {
  // Check if t is connected via FS from taskId
  return allTasks.find(a => a.id === t.id)?.dependencies?.some(d => d.type === 'FS' && /* in chain */);
  // Simpler: build a separate FS-only chain
});
// Alternative: call getSuccessorChain twice with different type filters,
// or add a linkType parameter to getSuccessorChain.
```

**Simpler alternative for getSuccessorChain extension:** Add a `linkTypes` parameter:
```typescript
export function getSuccessorChain(
  draggedTaskId: string,
  allTasks: Task[],
  linkTypes: LinkType[] = ['FS']   // Phase 7 default; Phase 8 callers pass ['FS', 'SS']
): Task[]
```

This keeps backward compatibility and allows the caller to request FS-only, SS-only, or FS+SS chains as needed.

---

## State of the Art (Phase 7 → Phase 8)

| Phase 7 (FS only) | Phase 8 (FS+SS) | Impact |
|-------------------|-----------------|--------|
| `getSuccessorChain` follows FS edges only | Extended to follow FS+SS edges | SS successors participate in cascade |
| Constraint clamp filters `dep.type !== 'FS'` | Extended to `dep.type !== 'FS' && dep.type !== 'SS'` | SS successors blocked from moving before startA |
| `recalculateIncomingLags` recalcs FS only | Extended for SS: `startA → startB`, floor at 0 | SS lag correctly persisted in soft mode |
| Cascade fires for `move` and `resize-right` | Cascade also fires for `resize-left` (SS successors only) | A left-edge resize cascades SS successors |
| `cascadeChain` is a flat list | Split into `cascadeChainFS`, `cascadeChainSS` (or parameterized) | Enables mode-aware chain selection |

**Existing valid patterns unchanged:**
- Global drag singleton (`globalActiveDrag`) for HMR safety — keep.
- `requestAnimationFrame` throttle — keep.
- `React.memo` with `arePropsEqual` — unchanged (GanttChart and TaskRow need no changes).
- UTC-only date arithmetic (`Date.UTC()`) — keep.
- `onCascade(tasks[])` callback — unchanged (SS cascade uses same callback path).
- `completeDrag()` clears cascade overrides before completing — unchanged.

---

## Open Questions

1. **How to split FS vs. SS chains in `getSuccessorChain`?**
   - What we know: The function currently has one output. We need mode-aware chains.
   - Options: (a) Add `linkTypes` parameter, call twice; (b) Return two parallel arrays; (c) Return one array with link-type metadata per entry.
   - Recommendation: Add `linkTypes: LinkType[]` parameter (simplest, backward-compatible). Call `getSuccessorChain(id, tasks, ['FS'])`, `getSuccessorChain(id, tasks, ['SS'])`, and `getSuccessorChain(id, tasks, ['FS', 'SS'])` from `handleMouseDown`.

2. **Does resize-right of A need SS cascade at completion (`handleComplete`)?**
   - What we know: Per CONTEXT.md spec: "Right edge of A moves right or left: `startA` unchanged → lag unchanged → B does not move." So resize-right of A does NOT cascade SS.
   - Recommendation: No change to resize-right path. Confirm at completion that `cascadeChainSS` is empty (or ignored) for resize-right.

3. **How does the `handleComplete` cascade deal with resize-left of A's delta?**
   - What we know: Current code computes delta from `endDate` change. For resize-left of A, `endDate` is fixed and `startDate` changes.
   - Recommendation: Branch in `handleComplete` based on `dragMode`: for resize-left, compute delta from `startDate` change. For move and resize-right, use existing `endDate` delta.

4. **Is `canMoveTask` relevant for SS?**
   - What we know: `canMoveTask` (lines 90-133) checks constraint via `calculateSuccessorDate`. It filters non-FS types: `if (dep.type.endsWith('S'))` selects FS and SS correctly (both end in 'S' for checking `targetIsStart`). However, `canMoveTask` is only called for pre-move validation, not the live boundary clamp. It may not need changes for Phase 8 since the live clamp (Pattern 2) handles SS correctly and `canMoveTask` uses `calculateSuccessorDate` which already handles SS.
   - Recommendation: Review `canMoveTask` — the `targetIsStart = dep.type.endsWith('S')` check already handles SS. The `expectedDate = calculateSuccessorDate(...)` for SS returns `predecessorStart + lag`. The comparison `targetDate >= expectedDate` uses `newStartDate` for SS (since `targetIsStart = true`). This seems correct. Verify no change needed.

---

## Files to Modify

1. **`packages/gantt-lib/src/utils/dependencyUtils.ts`**
   - Extend `getSuccessorChain` to accept `linkTypes` parameter (or add separate function for SS).

2. **`packages/gantt-lib/src/hooks/useTaskDrag.ts`**
   - Extend `ActiveDragState` with `cascadeChainFS` and `cascadeChainSS`.
   - Extend constraint clamp block to handle SS deps.
   - Extend cascade emission to handle `resize-left` (SS) and use mode-aware chains.
   - Extend `recalculateIncomingLags` with SS case.
   - Extend `handleComplete` to compute correct delta for resize-left mode.
   - Extend `handleMouseDown` to populate split chain fields.

3. **`packages/gantt-lib/src/__tests__/dependencyUtils.test.ts`** (recommended)
   - Add tests for `getSuccessorChain` with SS edges.

4. **`packages/website/src/app/page.tsx`** (optional)
   - Add SS demo section showing A→(SS)→B chain drag behavior.

**No changes needed:**
- `GanttChart.tsx` — cascade state and override mechanism already generic.
- `TaskRow.tsx` — override prop already generic.
- `types/index.ts` — `LinkType` already includes 'SS'.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `packages/gantt-lib/src/hooks/useTaskDrag.ts` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/utils/dependencyUtils.ts` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/types/index.ts` (full file read)
- `.planning/phases/08-ss-dependency/08-CONTEXT.md` — locked user decisions, complete behavior matrix
- `.planning/phases/07-dependencies-constraits/07-RESEARCH.md` — Phase 7 architecture reference
- `.planning/phases/07-dependencies-constraits/07-01-SUMMARY.md` — Phase 7 implementation decisions
- `.planning/phases/07-dependencies-constraits/07-02-SUMMARY.md` — Phase 7 wiring decisions
- `.planning/quick/19-fs/19-PLAN.md` — resize-left FS constraint implementation

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — project architecture decisions
- `.planning/phases/07-dependencies-constraits/07-02-PLAN.md` — Phase 7 task patterns (reused for Phase 8)
- `packages/gantt-lib/src/__tests__/dependencyUtils.test.ts` — existing test patterns to extend

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing codebase
- Architecture (core changes): HIGH — derived directly from code inspection and CONTEXT.md
- Mode-aware chain split: MEDIUM — multiple valid implementation options; discretion area for planner
- Cascade completion delta for resize-left: HIGH — derivable from existing code structure
- SS lag floor at 0: HIGH — directly specified in CONTEXT.md

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable codebase, no fast-moving dependencies)
