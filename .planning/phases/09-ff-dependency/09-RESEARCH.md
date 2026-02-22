# Phase 9: FF-dependency - Research

**Researched:** 2026-02-22
**Domain:** FF (Finish-to-Finish) drag constraint enforcement — extending Phase 8 FS+SS cascade engine to include FF
**Confidence:** HIGH (all findings from direct codebase inspection; patterns established in Phase 7/8)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase boundary:** FF constraint enforcement only. FS and SS constraints remain as-is. SF is deferred.

**FF formula:** `endB = endA + lag` (lag can be positive, negative, or zero — no clamping).
**Derived:** `startB = endA + lag - durB` (when endA changes, startB shifts by delta to preserve duration).

**Lag behavior:**
- No lag clamping — lag can be positive, negative, or zero
- `lag = endB - endA` — freely recalculated when user moves B
- Unlike SS (lag >= 0 floor), FF has no constraints

**Cascade modes:**
- Use existing hard/soft cascade infrastructure from Phase 7/8
- Hard mode: B moves as monolith with A when endA changes
- Soft mode: B moves freely, lag recalculated on completion

### Interaction behavior matrix

| Action | B behavior | Lag |
|--------|------------|-----|
| **Move A** (left/right) | B moves with A (same delta) | Preserved |
| **Move B** (left/right) | B moves freely | **Recalculated** |
| **Resize A** (right edge) | B moves with endA | Preserved |
| **Resize A** (left edge) | B stays put (endA unchanged) | Preserved |
| **Resize B** (right edge) | B changes duration | **Recalculated** |
| **Resize B** (left edge) | B changes duration (endB unchanged) | Preserved |

### Drag mode implications

- **Move mode**: delta affects both startA and endA → B cascades in hard mode, lag recalculated in soft
- **Resize-right on A**: only endA changes → B cascades, lag preserved
- **Resize-left on A**: only startA changes → B not affected (endA unchanged)
- **Resize-right on B**: only endB changes → lag recalculated
- **Resize-left on B**: only startB changes → lag preserved (endB unchanged)

### Chain detection

- Extend `getSuccessorChain` with `linkTypes=['FF']` to find FF successors
- FF chains behave like FS chains (both propagate through end date changes)
- Mixed chains: caller specifies which link types to include

### Visual rendering

- FF dependency lines already render correctly from Phase 8 work (type-aware connection points)
- Right edge of predecessor → right edge of successor
- No new rendering work needed

### Claude's Discretion

- Exact implementation of `recalculateIncomingLags` FF case (formula is clear, code structure is flexible)
- Unit test coverage strategy (TDD approach from Phase 8)
- Demo task selection for verification

### Deferred Ideas (OUT OF SCOPE)

None — specification is complete and focused on FF dependency only.

---

## Summary

Phase 9 implements FF (Finish-to-Finish) dependency constraints, extending the cascade engine from FS+SS (Phase 8) to also include FF links. The key difference from FS and SS is that FF constrains the successor's **end date** relative to the predecessor's **end date**: `endB = endA + lag`. Unlike SS (which floors lag at 0), FF lag has no constraints — it can be positive, negative, or zero.

The implementation follows the exact same patterns established in Phase 8: extend `getSuccessorChain` to include FF edges, add FF cases to constraint clamps and cascade emission, and extend `recalculateIncomingLags` for soft-mode lag recalculation. The critical insight is that FF behaves like FS for cascade purposes (both are triggered by `endA` changes), which simplifies the implementation significantly.

**Primary recommendation:** Add `linkTypes=['FF']` to `getSuccessorChain` calls; extend `recalculateIncomingLags` with FF formula `lag = endB - endA` (no floor); add FF to cascade emission for move and resize-right modes (both change `endA`); add FF demo tasks for verification. No new files, no new libraries.

---

## Standard Stack

No new libraries needed. Phase 9 is pure algorithmic extension of existing Phase 7/8 infrastructure.

### Core (already in place)

| File | Purpose | Status |
|------|---------|--------|
| `src/utils/dependencyUtils.ts` | `getSuccessorChain` (FS+SS), needs FF extension | Exists — extend |
| `src/hooks/useTaskDrag.ts` | Global drag singleton with cascade chain, constraint clamp, lag recalculation | Exists — extend |
| `src/types/index.ts` | `LinkType = 'FS' \| 'SS' \| 'FF' \| 'SF'` | Exists — no change needed |

### Changes required

| Change | Location | What |
|--------|----------|------|
| Extend `getSuccessorChain` | `dependencyUtils.ts` | Follow `dep.type === 'FF'` edges (already parameterized) |
| Add FF constraint clamp (move + resize-left) | `useTaskDrag.ts` | FF successor cannot be dragged past endA (but lag can be negative) |
| Extend cascade block (move + resize-right) | `useTaskDrag.ts` | FF cascade uses same delta as FS (both use endA) |
| Extend `recalculateIncomingLags` | `useTaskDrag.ts` | Add FF lag formula: `newLag = daysBetween(endA, newSuccessorEndDate)` |
| Add FF demo tasks | `packages/website/src/app/page.tsx` | Demonstrate FF drag behavior |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Phase 9 Structure

All changes are additive within existing files:

```
src/
├── utils/
│   └── dependencyUtils.ts     # NO CHANGE: getSuccessorChain already parameterized
└── hooks/
    └── useTaskDrag.ts         # EXTEND: FF constraint clamp; FF lag recalculation; FF cascade
```

No new files. The `getSuccessorChain` extension from Phase 8 already supports arbitrary `linkTypes`, so FF works out-of-the-box with `getSuccessorChain(id, tasks, ['FF'])`.

---

### Pattern 1: getSuccessorChain Already Supports FF

**What:** Phase 8 added `linkTypes` parameter to `getSuccessorChain`. No extension needed.

**When to use:** Called in `handleMouseDown` to populate `globalActiveDrag.cascadeChainFF`.

**Current code (dependencyUtils.ts lines 152-156):**
```typescript
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
      if (linkTypes.includes(dep.type)) {  // <-- Phase 8: parameterized
        const list = successorMap.get(dep.taskId) ?? [];
        list.push(task.id);
        successorMap.set(dep.taskId, list);
      }
    }
  }
  // ... BFS traversal unchanged ...
```

**Confidence:** HIGH — direct read of `dependencyUtils.ts`. The `linkTypes.includes(dep.type)` filter already supports FF. Simply call `getSuccessorChain(taskId, allTasks, ['FF'])` to get FF successors.

**Key insight:** No changes to `dependencyUtils.ts` needed. Phase 8's parameterization was forward-looking and already enables Phase 9.

---

### Pattern 2: FF Constraint Clamp — Moving/Resize-Left of Successor B

**What:** When B (FF successor) is dragged left (move or resize-left in hard mode), it is constrained by A's `endDate`. Unlike SS (which floors at `startA`), FF lag can be negative, so B can visually overlap A. The clamp is: B's `endDate` cannot go past A's `endDate` minus lag... but since lag is `endB - endA`, this is circular.

**Re-reading the spec from CONTEXT.md:**
- "Move B (left/right): B moves freely, lag recalculated" — soft mode
- Hard mode: "B moves as monolith with A when endA changes"
- But when B itself is dragged (hard mode), what's the constraint?

**Clarification from behavior matrix:**
- "Move B (left/right): B moves freely" → no constraint in hard mode either? Or is there a floor?

**Re-examining Phase 8 SS constraint:**
```typescript
// SS clamp: startB >= startA
if (dep.type !== 'FS' && dep.type !== 'SS') continue;
const predStart = new Date(predecessor.startDate as string);
const predStartLeft = Math.round(predStartOffset * globalActiveDrag.dayWidth);
minAllowedLeft = Math.max(minAllowedLeft, predStartLeft);
```

For FF, the constraint would be on `endDate`, not `startDate`. But since `lag = endB - endA` can be negative, there's no natural floor. The only constraint is that the user cannot drag B into an impossible state (e.g., B's `startDate` after its `endDate` due to duration constraints).

**Actually:** Per CONTEXT.md, FF has "no clamping" and lag can be negative. This suggests NO constraint clamp is needed for FF in hard mode. The only "constraint" is lag recalculation in soft mode.

**Confidence:** MEDIUM — interpretation of "no clamping" vs. "constraint enforcement". Recommend: skip FF constraint clamp in `handleGlobalMouseMove`. Let B move freely regardless of mode. Only enforce lag recalculation on completion.

**Wait — re-reading CONTEXT.md more carefully:**
- "Hard mode: B moves as monolith with A when endA changes" — this is about A being dragged, not B
- "Move B (left/right): B moves freely" — B has no constraint when IT is dragged

**Conclusion:** FF constraint clamp is NOT needed. Only cascade (when A moves) and lag recalculation (when B moves in soft mode).

---

### Pattern 3: FF Cascade — A Moves or Resizes-Right

**What:** When A (FF predecessor) is moved or its right edge is resized, `endA` changes and B must follow to preserve lag. This is structurally identical to FS cascade (both use `endA` as anchor).

**Mechanism:** During move or resize-right of A, `handleGlobalMouseMove` computes the delta. We need to include FF successors in the cascade chain for these modes.

**Trigger:** `mode === 'move'` OR `mode === 'resize-right'` AND the dragged task is a PREDECESSOR (has FF successors).

**Delta for B:** Same formula as FS:
- Move: `deltaDays = Math.round((newLeft - initialLeft) / dayWidth)`
- Resize-right: `deltaDays = Math.round((newWidth - initialWidth) / dayWidth)`

**Current cascade block from Phase 8:**
```typescript
const activeChain =
  mode === 'resize-right' ? globalActiveDrag.cascadeChainFS :
  mode === 'resize-left'  ? globalActiveDrag.cascadeChainSS :
  /* move */                globalActiveDrag.cascadeChain;
```

**Phase 9 change:** FF belongs in the same category as FS for cascade purposes:
- Move: FS + SS + FF (all cascade together)
- Resize-right: FS + FF (both depend on `endA`; SS does NOT cascade)
- Resize-left: SS only (only SS depends on `startA`)

**Updated chain selection:**
```typescript
const cascadeChainAll = getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF']);  // move
const cascadeChainEnd = getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF']);       // resize-right
const cascadeChainStart = getTransitiveCascadeChain(taskId, allTasks, ['SS']);           // resize-left

const activeChain =
  mode === 'resize-right' ? globalActiveDrag.cascadeChainEnd :
  mode === 'resize-left'  ? globalActiveDrag.cascadeChainStart :
  /* move */                globalActiveDrag.cascadeChainAll;
```

**Confidence:** HIGH — derived directly from FF constraint semantics (`endB = endA + lag`) and behavior matrix.

---

### Pattern 4: FF Lag Recalculation in Soft Mode

**What:** In soft mode (`disableConstraints=true`), when B (FF successor) is dragged (move or resize-right), the FF lag must be recalculated on completion because `endB` changed.

**Current `recalculateIncomingLags` (Phase 8) — FS + SS:**
```typescript
return task.dependencies.map(dep => {
  if (dep.type === 'FS') {
    // FS: lag = newSuccessorStart - predecessorEnd (can be negative)
    const predEnd = new Date(predecessor.endDate as string);
    const lagMs = Date.UTC(newStartDate...) - Date.UTC(predEnd...);
    const lagDays = Math.round(lagMs / (24 * 60 * 60 * 1000));
    return { ...dep, lag: lagDays };
  }
  if (dep.type === 'SS') {
    // SS: lag = newSuccessorStart - predecessorStart (always >= 0)
    const predStart = new Date(predecessor.startDate as string);
    const lagMs = Date.UTC(newStartDate...) - Date.UTC(predStart...);
    const lagDays = Math.max(0, Math.round(lagMs / (24 * 60 * 60 * 1000)));
    return { ...dep, lag: lagDays };
  }
  return dep; // FF, SF: unchanged
});
```

**Phase 9 extension:**
```typescript
  if (dep.type === 'FF') {
    // FF: lag = newSuccessorEnd - predecessorEnd (can be negative, no floor)
    const predecessor = taskById.get(dep.taskId);
    if (!predecessor) return dep;
    const predEnd = new Date(predecessor.endDate as string);
    const newEndDate = new Date(Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      monthStart.getUTCDate() + dayOffset + durationDays
    ));
    const lagMs = Date.UTC(newEndDate.getUTCFullYear(), newEndDate.getUTCMonth(), newEndDate.getUTCDate())
                - Date.UTC(predEnd.getUTCFullYear(), predEnd.getUTCMonth(), predEnd.getUTCDate());
    const lagDays = Math.round(lagMs / (24 * 60 * 60 * 1000)); // FF: no floor
    return { ...dep, lag: lagDays };
  }
```

**Key difference:** FF lag is calculated from `endDate`, not `startDate`. The function currently receives `newStartDate` and implicitly computes `newEndDate` from duration. We need to pass `newEndDate` as well OR compute it inside the function.

**Refactoring option:** Add `newEndDate` parameter to `recalculateIncomingLags`:
```typescript
function recalculateIncomingLags(
  task: Task,
  newStartDate: Date,
  newEndDate: Date,
  allTasks: Task[]
): NonNullable<Task['dependencies']> {
```

Then FF case can use `newEndDate` directly.

**Confidence:** HIGH for formula, MEDIUM for refactoring approach (discretion area).

---

### Pattern 5: FF Cascade Completion — Hard Mode

**What:** On drag completion in hard mode, `handleComplete` calls `onCascade(cascadedTasks)`. The delta used to shift FF successors is the same as FS: computed from `endDate` change.

**Current code (Phase 8) — handles move and resize-right:**
```typescript
// Dual-delta approach
const deltaFromStart = Math.round((newStartMs - origStartMs) / (24 * 60 * 60 * 1000));
const deltaFromEnd = Math.round((newEndMs - origEndMs) / (24 * 60 * 60 * 1000));

const deltaDays = deltaFromStart === 0 ? deltaFromEnd : deltaFromStart;
```

For FF:
- Move: `deltaFromStart !== 0 && deltaFromEnd !== 0` → use `deltaFromEnd` (FF depends on endA)
- Resize-right: `deltaFromStart === 0 && deltaFromEnd !== 0` → use `deltaFromEnd`
- Resize-left: `deltaFromStart !== 0 && deltaFromEnd === 0` → no FF cascade (endA unchanged)

**Chain selection for completion (from Phase 8):**
```typescript
const isResizeLeft = deltaFromStart !== 0 && deltaFromEnd === 0;
const chainForCompletion = deltaFromStart === 0
  ? getTransitiveCascadeChain(taskId, allTasks, ['FS'])          // resize-right: FS only
  : isResizeLeft
    ? getTransitiveCascadeChain(taskId, allTasks, ['SS'])         // resize-left: SS only
    : getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS']); // move: FS + SS
```

**Phase 9 change:**
```typescript
const chainForCompletion = deltaFromStart === 0
  ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])     // resize-right: FS + FF (both use endA)
  : isResizeLeft
    ? getTransitiveCascadeChain(taskId, allTasks, ['SS'])         // resize-left: SS only (FF unaffected)
    : getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF']); // move: all types
```

**Confidence:** HIGH — follows directly from FF constraint semantics.

---

### Anti-Patterns to Avoid

- **Adding FF constraint clamp for B being dragged:** Per CONTEXT.md, "Move B (left/right): B moves freely" — no constraint needed. Unlike SS (lag >= 0 floor), FF has no constraints.
- **Including FF successors in resize-left cascade:** A's left edge resizing changes `startA` but NOT `endA`. FF depends on `endA`, so FF successors should NOT move.
- **Using startDate for FF lag calculation:** FF lag uses `endA → endB`. Do not reuse the SS formula (`startA → startB`) or FS formula (`endA → startB`).
- **Forgetting to pass newEndDate to recalculateIncomingLags:** FF lag depends on successor's end date, not start date. The function needs `newEndDate` parameter OR must compute it internally.
- **Treating FF lag as having a floor:** FF lag can be negative (B can finish before A). No `Math.max(0, ...)` for FF.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FF successor traversal | New BFS | Call `getSuccessorChain(id, tasks, ['FF'])` | Phase 8 already parameterized |
| FF boundary calculation | New formula | No constraint clamp needed (FF has no floor) | Spec: "B moves freely" |
| FF lag recalculation | New function | Extend `recalculateIncomingLags` with FF case | Same structure, uses `endDate` |
| FF cascade emission | New emission loop | Same `Map<taskId, {left, width}>` pattern | `delta_B = delta_A` for FF, identical to FS |

**Key insight:** Phase 8's `linkTypes` parameterization makes Phase 9 mostly about using the existing infrastructure with FF included, rather than building new mechanisms.

---

## Common Pitfalls

### Pitfall 1: Resize-Left of A Incorrectly Cascades FF Successors

**What goes wrong:** When A's left edge is resized, FF successor B is incorrectly moved.
**Why it happens:** After adding FF to cascade chains, the resize-left path might include FF. But resize-left changes `startA`, not `endA`, so FF is unaffected.
**How to avoid:** Use mode-aware chain selection. Resize-left should only cascade SS successors. FF belongs with FS in resize-right and move modes.
**Warning signs:** Dragging A's left edge causes FF-linked B to move.

### Pitfall 2: FF Lag Incorrectly Calculated from StartDate

**What goes wrong:** After dragging B, the recorded FF lag is wrong (uses startDate instead of endDate).
**Why it happens:** `recalculateIncomingLags` only receives `newStartDate`. Using it for FF would be incorrect.
**How to avoid:** Pass `newEndDate` to `recalculateIncomingLags` OR compute it internally from `newStartDate` and duration. FF case uses `newEndDate`, not `newStartDate`.
**Warning signs:** After soft-mode drag of FF successor, the dependency lag doesn't match the visual end-date gap.

### Pitfall 3: FF Cascade Not Emitted During Resize-Right

**What goes wrong:** When A's right edge is resized, FF successor B stays put.
**Why it happens:** The cascade emission condition for resize-right only includes FS successors.
**How to avoid:** Include FF in the resize-right cascade chain (`['FS', 'FF']`).
**Warning signs:** Dragging A's right edge doesn't move FF-linked B.

### Pitfall 4: Forgetting FF in Move Mode Cascade

**What goes wrong:** When A is moved, FF successor B doesn't follow.
**Why it happens:** The move-mode cascade chain only includes FS + SS.
**How to avoid:** Move-mode cascade should include all types: `['FS', 'SS', 'FF']`.
**Warning signs:** Dragging A left/right doesn't move FF-linked B.

### Pitfall 5: Adding FF Constraint Clamp (Unnecessary)

**What goes wrong:** Attempt to add a constraint clamp for FF successors being dragged.
**Why it happens:** Following the SS pattern (which has a floor at `startA`).
**How to avoid:** Don't add FF to the constraint clamp block in `handleGlobalMouseMove`. FF has no constraints.
**Warning signs:** FF successor B feels "stuck" when dragged.

---

## Code Examples

### Extension 1: ActiveDragState — add cascadeChainFF

```typescript
// Source: useTaskDrag.ts ActiveDragState interface — extend
interface ActiveDragState {
  // ... existing fields ...
  cascadeChain: Task[];           // FS+SS+FF successors (all modes)
  cascadeChainEnd: Task[];        // FS+FF successors (resize-right cascade)
  cascadeChainStart: Task[];      // SS successors (resize-left cascade)
  onCascadeProgress?: (overrides: Map<string, { left: number; width: number }>) => void;
}
```

### Extension 2: handleMouseDown — populate FF chains

```typescript
// Source: useTaskDrag.ts handleMouseDown — extend
globalActiveDrag = {
  taskId,
  mode,
  // ... existing fields ...
  cascadeChain: !disableConstraints
    ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF'])   // all, used for move
    : [],
  cascadeChainEnd: !disableConstraints
    ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])          // FS+FF, used for resize-right
    : [],
  cascadeChainStart: !disableConstraints
    ? getTransitiveCascadeChain(taskId, allTasks, ['SS'])               // SS, used for resize-left
    : [],
  onCascadeProgress,
};
```

### Extension 3: Cascade emission — mode-aware with FF

```typescript
// Source: useTaskDrag.ts handleGlobalMouseMove — extend
const activeChain =
  mode === 'resize-right' ? globalActiveDrag.cascadeChainEnd :    // FS + FF
  mode === 'resize-left'  ? globalActiveDrag.cascadeChainStart :  // SS only
  /* move */                globalActiveDrag.cascadeChain;         // FS + SS + FF

if ((mode === 'move' || mode === 'resize-right' ||
     (mode === 'resize-left' && globalActiveDrag.cascadeChainStart.length > 0))
    && !globalActiveDrag.disableConstraints
    && activeChain.length > 0
    && globalActiveDrag.onCascadeProgress) {
  const deltaDays = mode === 'resize-right'
    ? Math.round((newWidth - globalActiveDrag.initialWidth) / globalActiveDrag.dayWidth)
    : Math.round((newLeft - globalActiveDrag.initialLeft) / globalActiveDrag.dayWidth);

  const overrides = new Map<string, { left: number; width: number }>();
  for (const chainTask of activeChain) {
    // ... existing position computation unchanged ...
    overrides.set(chainTask.id, { left: chainLeft, width: chainWidth });
  }
  globalActiveDrag.onCascadeProgress(overrides);
}
```

### Extension 4: recalculateIncomingLags — FF case

```typescript
// Source: useTaskDrag.ts — extend signature and FF case
function recalculateIncomingLags(
  task: Task,
  newStartDate: Date,
  newEndDate: Date,  // Phase 9: add parameter
  allTasks: Task[]
): NonNullable<Task['dependencies']> {
  if (!task.dependencies) return [];
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  return task.dependencies.map(dep => {
    if (dep.type === 'FS') {
      // ... existing FS code (endA → startB) ...
    }
    if (dep.type === 'SS') {
      // ... existing SS code (startA → startB, floor at 0) ...
    }
    if (dep.type === 'FF') {
      // Phase 9: lag = newSuccessorEnd - predecessorEnd (no floor)
      const predecessor = taskById.get(dep.taskId);
      if (!predecessor) return dep;
      const predEnd = new Date(predecessor.endDate as string);
      const lagMs = Date.UTC(newEndDate.getUTCFullYear(), newEndDate.getUTCMonth(), newEndDate.getUTCDate())
                  - Date.UTC(predEnd.getUTCFullYear(), predEnd.getUTCMonth(), predEnd.getUTCDate());
      const lagDays = Math.round(lagMs / (24 * 60 * 60 * 1000)); // FF: no floor
      return { ...dep, lag: lagDays };
    }
    return dep; // SF: unchanged
  });
}
```

### Extension 5: handleComplete — chain selection with FF

```typescript
// Source: useTaskDrag.ts handleComplete — extend chain selection
// Phase 9: chain selection with FF
const isResizeLeft = deltaFromStart !== 0 && deltaFromEnd === 0;
const chainForCompletion = deltaFromStart === 0
  ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])           // resize-right: FS + FF
  : isResizeLeft
    ? getTransitiveCascadeChain(taskId, allTasks, ['SS'])               // resize-left: SS only
    : getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF']); // move: all types

// Note: handleComplete calls recalculateIncomingLags for the dragged task
// Must pass newEndDate as new parameter
const updatedDependencies = currentTaskData?.dependencies
  ? recalculateIncomingLags(draggedTaskData, newStartDate, newEndDate, allTasks)
  : undefined;
```

### Extension 6: FF Demo Tasks

```typescript
// Source: packages/website/src/app/page.tsx — add FF demo
const createFFDemoTasks = (): Task[] => {
  const baseDate = '2026-02-01';
  const addDays = (date: string, days: number) => { /* ... */ };

  return [
    {
      id: 'ff-predecessor',
      name: 'Foundation (FF predecessor)',
      startDate: baseDate,
      endDate: addDays(baseDate, 5),
      color: '#3b82f6',
    },
    {
      id: 'ff-successor',
      name: 'Superstructure (FF successor)',
      startDate: addDays(baseDate, 3),
      endDate: addDays(baseDate, 8),
      color: '#10b981',
      dependencies: [{ taskId: 'ff-predecessor', type: 'FF', lag: 3 }],
    },
    {
      id: 'ff-independent',
      name: 'Independent Task',
      startDate: addDays(baseDate, 6),
      endDate: addDays(baseDate, 10),
      color: '#f59e0b',
    },
  ];
};
```

---

## State of the Art (Phase 8 → Phase 9)

| Phase 8 (FS+SS) | Phase 9 (FS+SS+FF) | Impact |
|-----------------|--------------------|--------|
| `getSuccessorChain` with `linkTypes=['FS', 'SS']` | Call with `['FF']` for FF-only, `['FS', 'FF']` for resize-right, `['FS', 'SS', 'FF']` for move | FF successors participate in cascade |
| Constraint clamp filters `dep.type !== 'FS' && dep.type !== 'SS'` | No change needed — FF has no constraint clamp | FF successors move freely when dragged |
| `recalculateIncomingLags` handles FS + SS | Extend for FF: `endA → endB`, no floor | FF lag correctly persisted in soft mode |
| Cascade fires for `move` (FS+SS), `resize-right` (FS), `resize-left` (SS) | Cascade also fires for `resize-right` with FF, `move` with FF | A end-date changes cascade FF successors |
| `cascadeChainFS`, `cascadeChainSS` | Add `cascadeChainEnd` (FS+FF) | Enables mode-aware chain selection for resize-right |

**Existing valid patterns unchanged:**
- Global drag singleton (`globalActiveDrag`) for HMR safety — keep.
- `requestAnimationFrame` throttle — keep.
- `React.memo` with `arePropsEqual` — unchanged.
- UTC-only date arithmetic (`Date.UTC()`) — keep.
- `onCascade(tasks[])` callback — unchanged (FF cascade uses same callback path).
- `completeDrag()` clears cascade overrides before completing — unchanged.
- `getSuccessorChain` with `linkTypes` parameter — unchanged (already supports FF).

---

## Open Questions

1. **Should `recalculateIncomingLags` signature change to include `newEndDate`?**
   - What we know: FF lag depends on `endDate`. Current function only receives `newStartDate`.
   - Options: (a) Add `newEndDate` parameter; (b) Compute `newEndDate` internally from `newStartDate` and task duration.
   - Recommendation: Add `newEndDate` parameter (cleaner, explicit). Update all callers (two call sites in `handleComplete`).

2. **Is an FF constraint clamp needed?**
   - What we know: CONTEXT.md says "no clamping" and "B moves freely".
   - Recommendation: No FF constraint clamp. Unlike SS (lag >= 0), FF has no floor. Let B move freely in both hard and soft modes.

3. **How does FF cascade interact with existing `onCascadeProgress`?**
   - What we know: The existing `Map<taskId, {left, width}>` mechanism works for any cascade type.
   - Recommendation: No change to `onCascadeProgress`. Just ensure FF successors are included in the correct chain.

---

## Files to Modify

1. **`packages/gantt-lib/src/hooks/useTaskDrag.ts`**
   - Extend `ActiveDragState` with `cascadeChainEnd` (FS+FF for resize-right).
   - Extend `handleMouseDown` to populate `cascadeChainEnd` using `getTransitiveCascadeChain(id, tasks, ['FS', 'FF'])`.
   - Extend cascade emission block to use `cascadeChainEnd` for resize-right mode.
   - Extend `recalculateIncomingLags` signature to accept `newEndDate` parameter.
   - Extend `recalculateIncomingLags` to handle FF type: `lag = endB - endA` (no floor).
   - Extend `handleComplete` to pass `newEndDate` to `recalculateIncomingLags` and use FF-aware chain selection.

2. **`packages/gantt-lib/src/__tests__/dependencyUtils.test.ts`** (optional but recommended)
   - Add tests for `getSuccessorChain` with `['FF']` link type (though it's already tested via parameterization).
   - Consider adding integration-style tests for FF drag behavior.

3. **`packages/website/src/app/page.tsx`** (recommended)
   - Add FF demo section showing A→(FF)→B chain drag behavior.
   - Demonstrate: move A, resize-right A, move B, resize-right B.

**No changes needed:**
- `packages/gantt-lib/src/utils/dependencyUtils.ts` — `getSuccessorChain` already parameterized.
- `GanttChart.tsx` — cascade state and override mechanism already generic.
- `TaskRow.tsx` — override prop already generic.
- `types/index.ts` — `LinkType` already includes 'FF'.
- `DependencyLines.tsx` — already renders FF connections correctly (type-aware connection points from Phase 8).

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `packages/gantt-lib/src/hooks/useTaskDrag.ts` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/utils/dependencyUtils.ts` (full file read)
- `.planning/phases/09-ff-dependency/09-CONTEXT.md` — locked user decisions, complete behavior matrix
- `.planning/phases/08-ss-dependency/08-RESEARCH.md` — Phase 8 architecture reference
- `.planning/phases/08-ss-dependency/08-01-PLAN.md` — Phase 8 planning patterns

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — project architecture decisions
- `.planning/phases/07-dependencies-constraits/07-RESEARCH.md` — Phase 7 cascade engine reference
- `.planning/phases/07-dependencies-constraits/07-02-PLAN.md` — Phase 7 task patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing codebase
- Architecture (core changes): HIGH — derived directly from code inspection and CONTEXT.md
- FF constraint clamp decision: MEDIUM — interpretation of "no clamping" vs. soft/hard mode enforcement
- recalculateIncomingLags signature change: MEDIUM — multiple valid approaches (parameter vs. internal computation)
- Cascade chain selection: HIGH — directly derived from FF semantics (`endB = endA + lag`)

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable codebase, no fast-moving dependencies)
