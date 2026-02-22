# Phase 10: SF dependency - Research

**Researched:** 2026-02-22
**Domain:** SF (Start-to-Finish) drag constraint enforcement — extending Phase 9 FS+SS+FF cascade engine to include SF
**Confidence:** HIGH (all findings from direct codebase inspection; patterns established in Phases 7-9)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**SF formula:** `endB = startA + lag`, where `lag <= 0` (lag ceiling at 0).
**Derived:** `startB = endA + lag - durB` (when endB changes due to duration increase, startB shifts backward).

**Lag behavior:**
- Lag ceiling at 0 — user cannot drag B past startA (endB cannot exceed startA)
- Negative lag allowed and expected — "deliver early" means lag becomes more negative
- When violated: system forces lag = 0 (endB = startA)

**Cascade behavior matrix:**

| Action | B behavior | Lag |
|--------|------------|-----|
| **Move A** (left/right) | B moves synchronously, lag preserved | Preserved |
| **Resize-left A** (startA changes) | B moves synchronously, lag preserved | Preserved |
| **Resize-right A** (endA changes) | B stationary — startA unchanged | Preserved |
| **Move-left B** | Free movement, lag becomes more negative | **Recalculated** |
| **Move-right B** | Blocked at startA (lag = 0 ceiling) | **Clamped at 0** |
| **Resize-right B** (endB changes) | Constrained by startA — cannot push past startA | **Clamped at 0** |
| **Resize-left B** (startB changes) | Free movement — only affects startB, endB stays bound to startA | Preserved |

**Duration change (durB increase):**
- **KEY BEHAVIOR:** endB stays bound to startA — task B grows LEFT
- startB = endB - durB (calculated backward)
- This shows "order must be placed earlier" when logistics take longer

### Mode filtering (cascade chain composition)

From CONTEXT.md:
- Move mode: Include SF in activeChain (startA shift affects B)
- Resize-left (A): Include SF (startA shift affects B)
- Resize-right (A): Exclude SF (startA unchanged)
- Resize-right (B): Include SF with constraint (endB blocked by startA)
- Resize-left (B): Exclude SF (endB unaffected)

### Connection rendering

- Quick-17 already handles SF line rendering (startA → endB)
- Skip separate verification — assume correct, fix if issues found during demo

### Demo scenario

- **Example:** Elevator installation (A) + Elevator equipment delivery (B)
- **Duration:** B = 45 days (logistics time)
- **Showcase:** When A shifts left, B "pulls in" — shows order must be placed earlier
- **Constraint:** When B moves right, stops at startA (lag = 0 ceiling)

### Claude's Discretion

- Exact implementation of recalculateIncomingLags SF case (follow FF/SS pattern)
- Whether to add DEBUG logging for SF constraints (probably useful for demo verification)
- Exact visual feedback during drag (follow FF/SS preview pattern)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

---

## Summary

Phase 10 implements SF (Start-to-Finish) dependency constraints, completing the four link type coverage (FS/SS/FF/SF). The key difference from previous types is that SF constrains the successor's **end date** relative to the predecessor's **start date** with a negative-only lag: `endB = startA + lag` where `lag <= 0`. This models supply chain and preparation tasks where preparatory work (B) must be ready by the time main work (A) begins.

SF is structurally similar to SS in that both depend on `startA` for cascade (move and resize-left modes trigger cascade, resize-right does not). However, SF differs from all other types in its lag ceiling: lag cannot exceed 0 (endB cannot go past startA), but negative lag is expected and normal (B can finish well before A starts). The most distinctive SF behavior is duration increase: when `durB` grows, `endB` stays pinned to `startA` and `startB` moves left, visually showing that "preparation must start earlier."

The implementation follows the exact patterns from Phases 8-9: extend `getSuccessorChain` calls to include SF, add SF constraint clamps for move-right and resize-right of B, extend `recalculateIncomingLags` with SF formula, and add SF demo tasks. No new files or libraries needed.

**Primary recommendation:** Add `linkTypes=['SF']` to cascade chains for move and resize-left modes (both change `startA`); extend constraint clamp for B being dragged right or resized-right (both blocked at `startA`); extend `recalculateIncomingLags` with SF formula `lag = endB - startA` (ceiling at 0); add SF demo tasks showing elevator equipment delivery scenario.

---

## Standard Stack

No new libraries needed. Phase 10 is pure algorithmic extension of existing Phase 7-9 infrastructure.

### Core (already in place)

| File | Purpose | Status |
|------|---------|--------|
| `src/utils/dependencyUtils.ts` | `getSuccessorChain` (FS+SS+FF), needs SF extension | Exists — extend |
| `src/hooks/useTaskDrag.ts` | Global drag singleton with cascade chains, constraint clamps, lag recalculation | Exists — extend |
| `src/types/index.ts` | `LinkType = 'FS' \| 'SS' \| 'FF' \| 'SF'` | Exists — no change needed |

### Changes required

| Change | Location | What |
|--------|----------|------|
| Extend cascade chains (move + resize-left) | `useTaskDrag.ts` | Include SF in chains where startA changes |
| Add SF constraint clamp (B move-right + resize-right) | `useTaskDrag.ts` | endB cannot go past startA (lag ceiling at 0) |
| Extend `recalculateIncomingLags` | `useTaskDrag.ts` | Add SF formula: `lag = endB - startA` (ceiling at 0) |
| Add SF demo tasks | `packages/website/src/app/page.tsx` | Demonstrate SF drag behavior (elevator scenario) |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Phase 10 Structure

All changes are additive within existing files:

```
src/
├── utils/
│   └── dependencyUtils.ts     # NO CHANGE: getSuccessorChain already parameterized
└── hooks/
    └── useTaskDrag.ts         # EXTEND: SF constraint clamp; SF lag recalculation; SF cascade
```

No new files. The `getSuccessorChain` extension from Phase 8 already supports arbitrary `linkTypes`, so SF works out-of-the-box with `getSuccessorChain(id, tasks, ['SF'])`.

---

### Pattern 1: SF Cascade — A Moves or Resizes-Left

**What:** When A (SF predecessor) is moved or its left edge is resized, `startA` changes and B must follow to preserve lag. This is structurally identical to SS cascade (both depend on `startA`).

**Mechanism:** During move or resize-left of A, `handleGlobalMouseMove` computes the delta. We need to include SF successors in the cascade chain for these modes.

**Trigger:** `mode === 'move'` OR `mode === 'resize-left'` AND the dragged task is a PREDECESSOR (has SF successors).

**Delta for B:** Same formula as SS:
- Move: `deltaDays = Math.round((newLeft - initialLeft) / dayWidth)`
- Resize-left: `deltaDays = Math.round((newLeft - initialLeft) / dayWidth)`

**Current cascade block from Phase 9:**
```typescript
const activeChain =
  mode === 'resize-right' ? globalActiveDrag.cascadeChainEnd :   // FS + FF
  mode === 'resize-left'  ? globalActiveDrag.cascadeChainSS :    // SS only
  /* move */                globalActiveDrag.cascadeChain;         // FS + SS + FF
```

**Phase 10 change:** SF belongs in the same category as SS for cascade purposes:
- Move: FS + SS + FF + SF (all cascade together)
- Resize-right: FS + FF (both depend on `endA`; SS and SF do NOT cascade)
- Resize-left: SS + SF (both depend on `startA`)

**Updated chain selection:**
```typescript
const cascadeChainAll = getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF', 'SF']);  // move
const cascadeChainEnd = getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF']);               // resize-right
const cascadeChainStart = getTransitiveCascadeChain(taskId, allTasks, ['SS', 'SF']);             // resize-left

const activeChain =
  mode === 'resize-right' ? globalActiveDrag.cascadeChainEnd :
  mode === 'resize-left'  ? globalActiveDrag.cascadeChainStart :
  /* move */                globalActiveDrag.cascadeChain;
```

**Confidence:** HIGH — derived directly from SF constraint semantics (`endB = startA + lag`) and behavior matrix from CONTEXT.md.

---

### Pattern 2: SF Constraint Clamp — Moving/Resize-Right of Successor B

**What:** When B (SF successor) is dragged right (move) or its right edge is resized-right, it cannot go past A's `startDate` because SF lag has a ceiling at 0. The constraint is: `endB <= startA`.

**Current constraint clamp code (Phase 8-9, for FS + SS):**
```typescript
if ((mode === 'move' || mode === 'resize-left') && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
  const currentTask = allTasks.find(t => t.id === globalActiveDrag?.taskId);
  if (currentTask && currentTask.dependencies && currentTask.dependencies.length > 0) {
    let minAllowedLeft = 0;
    for (const dep of currentTask.dependencies) {
      if (dep.type !== 'FS' && dep.type !== 'SS') continue;  // Phase 8-9: FS + SS only
      const predecessor = globalActiveDrag.allTasks.find(t => t.id === dep.taskId);
      if (!predecessor) continue;
      const predStart = new Date(predecessor.startDate as string);
      // ... pixel boundary calculation ...
      const predStartLeft = Math.round(predStartOffset * globalActiveDrag.dayWidth);
      minAllowedLeft = Math.max(minAllowedLeft, predStartLeft);
    }
    newLeft = Math.max(minAllowedLeft, newLeft);
  }
}
```

**Phase 10 change:** For SF, the constraint is on `endDate`, not `startDate`. When B is dragged right (move) or resized-right, we need to clamp `endB` at `startA`. This requires a separate clamp block for SF because it affects `width`, not `left`.

```typescript
// SF constraint: endB <= startA (lag ceiling at 0)
// Applies when B is moved right or resized-right
if ((mode === 'move' || mode === 'resize-right') && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
  const currentTask = allTasks.find(t => t.id === globalActiveDrag?.taskId);
  if (currentTask && currentTask.dependencies && currentTask.dependencies.length > 0) {
    for (const dep of currentTask.dependencies) {
      if (dep.type !== 'SF') continue;
      const predecessor = globalActiveDrag.allTasks.find(t => t.id === dep.taskId);
      if (!predecessor) continue;
      const predStart = new Date(predecessor.startDate as string);
      const predStartOffset = Math.round(
        (Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate()) -
          Date.UTC(globalActiveDrag.monthStart.getUTCFullYear(), globalActiveDrag.monthStart.getUTCMonth(), globalActiveDrag.monthStart.getUTCDate()))
        / (24 * 60 * 60 * 1000)
      );
      const predStartLeft = Math.round(predStartOffset * globalActiveDrag.dayWidth);
      const currentEndRight = newLeft + newWidth;
      const maxAllowedEndRight = predStartLeft;  // endB cannot exceed startA
      if (currentEndRight > maxAllowedEndRight) {
        // Clamp width so endB = startA
        newWidth = Math.max(globalActiveDrag.dayWidth, maxAllowedEndRight - newLeft);
      }
    }
  }
}
```

**Confidence:** HIGH for the constraint, MEDIUM for exact implementation placement (discretion area for exact location in `handleGlobalMouseMove`).

---

### Pattern 3: SF Lag Recalculation in Soft Mode

**What:** In soft mode (`disableConstraints=true`), when B (SF successor) is dragged (move-left, resize-right, or resize-left), the SF lag must be recalculated on completion because `endB` changed.

**Current `recalculateIncomingLags` (Phase 9) — FS + SS + FF:**
```typescript
function recalculateIncomingLags(
  task: Task,
  newStartDate: Date,
  newEndDate: Date,  // Phase 9: added parameter
  allTasks: Task[]
): NonNullable<Task['dependencies']> {
  if (!task.dependencies) return [];
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  return task.dependencies.map(dep => {
    if (dep.type === 'FS') {
      // FS: lag = startB - endA (can be negative)
      // ... existing FS code ...
    }
    if (dep.type === 'SS') {
      // SS: lag = startB - startA (always >= 0)
      // ... existing SS code ...
    }
    if (dep.type === 'FF') {
      // FF: lag = endB - endA (can be negative)
      // ... existing FF code ...
    }
    return dep; // SF: unchanged
  });
}
```

**Phase 10 extension:**
```typescript
    if (dep.type === 'SF') {
      // Phase 10: lag = endB - startA (ceiling at 0)
      const predecessor = taskById.get(dep.taskId);
      if (!predecessor) return dep;
      const predStart = new Date(predecessor.startDate as string);
      const lagMs = Date.UTC(newEndDate.getUTCFullYear(), newEndDate.getUTCMonth(), newEndDate.getUTCDate())
                  - Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate());
      const lagDays = Math.min(0, Math.round(lagMs / (24 * 60 * 60 * 1000))); // SF: ceiling at 0
      return { ...dep, lag: lagDays };
    }
```

**Key difference:** SF lag is calculated from `endDate` (like FF) but anchored to `startDate` of predecessor (like SS). The ceiling at 0 uses `Math.min(0, ...)` to ensure lag never exceeds 0.

**Confidence:** HIGH for formula, HIGH for ceiling implementation (directly specified in CONTEXT.md).

---

### Pattern 4: SF Cascade Completion — Hard Mode

**What:** On drag completion in hard mode, `handleComplete` calls `onCascade(cascadedTasks)`. The delta used to shift SF successors is the same as SS: computed from `startDate` change.

**Current code (Phase 9) — handles move and resize-left with SS:**
```typescript
// Dual-delta approach
const deltaFromStart = Math.round((newStartMs - origStartMs) / (24 * 60 * 60 * 1000));
const deltaFromEnd = Math.round((newEndMs - origEndMs) / (24 * 60 * 60 * 1000));

const deltaDays = deltaFromStart === 0 ? deltaFromEnd : deltaFromStart;

const isResizeLeft = deltaFromStart !== 0 && deltaFromEnd === 0;
const chainForCompletion = deltaFromStart === 0
  ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])     // resize-right: FS + FF
  : isResizeLeft
    ? getTransitiveCascadeChain(taskId, allTasks, ['SS'])         // resize-left: SS only
    : getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF']); // move: all types
```

**Phase 10 change:**
```typescript
const chainForCompletion = deltaFromStart === 0
  ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])               // resize-right: FS + FF (SS and SF unaffected)
  : isResizeLeft
    ? getTransitiveCascadeChain(taskId, allTasks, ['SS', 'SF'])             // resize-left: SS + SF
    : getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF', 'SF']); // move: all types
```

**Confidence:** HIGH — follows directly from SF constraint semantics (`endB = startA + lag`) and behavior matrix.

---

### Pattern 5: SF Duration Increase — Task Grows LEFT

**What:** When B's duration increases (resize-right of B in soft mode, or programmatic duration change), `endB` stays pinned to `startA` and `startB` moves left. This is the most distinctive SF behavior and must be handled in the drag preview.

**Current behavior:** When resizing B's right edge, the task expands to the right (startB fixed, endB moves right).

**SF requirement:** When B's right edge is resized-right, `endB` is constrained at `startA`. The task cannot expand to the right. Instead, if the user tries to increase duration beyond the constraint, the task grows LEFT: `startB = endB - durB`.

**Implementation:** In the resize-right drag handler, if B has an SF dependency:
1. Calculate unconstrained `newWidth`
2. Calculate unconstrained `endRight = newLeft + newWidth`
3. If `endRight > predStartLeft` (violates SF constraint), clamp: `endRight = predStartLeft`
4. Recalculate `startB = endRight - newWidth` — this moves the task LEFT

**Confidence:** MEDIUM — this is a novel behavior not present in FS/SS/FF. Discretion area for exact UI/UX of "growing left" during resize-right drag.

---

### Anti-Patterns to Avoid

- **Treating SF the same as FF:** Both constrain `endB`, but SF anchors to `startA` (not `endA`) and has a lag ceiling at 0 (not free lag).
- **Including SF in resize-right cascade:** A's right edge resizing changes `endA`, not `startA`. SF depends on `startA`, so SF successors should NOT move.
- **Forgetting SF lag ceiling at 0:** Unlike FS/FF (free negative lag) and SS (floor at 0), SF has a ceiling at 0. Use `Math.min(0, ...)` not `Math.max(0, ...)`.
- **Using startDate for SF lag calculation:** SF lag uses `endB - startA`. Do not reuse the FF formula (`endB - endA`) or SS formula (`startB - startA`).
- **Missing SF in move/resize-left cascade:** Both move and resize-left change `startA`, so SF successors MUST be included in these cascade chains.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SF successor traversal | New BFS | Call `getSuccessorChain(id, tasks, ['SF'])` | Phase 8 already parameterized |
| SF boundary calculation | New formula | Clamp `endB <= startA` (width constraint, not left constraint) | SF constraint is on endDate, not startDate |
| SF lag recalculation | New function | Extend `recalculateIncomingLags` with SF case | Same structure, uses `endDate` and `startA` |
| SF cascade emission | New emission loop | Same `Map<taskId, {left, width}>` pattern | `delta_B = delta_A` for SF, identical to SS |

**Key insight:** Phase 8's `linkTypes` parameterization and Phase 9's `newEndDate` parameter make Phase 10 mostly about using the existing infrastructure with SF included, rather than building new mechanisms.

---

## Common Pitfalls

### Pitfall 1: Resize-Right of A Incorrectly Cascades SF Successors

**What goes wrong:** When A's right edge is resized, SF successor B is incorrectly moved.
**Why it happens:** After adding SF to cascade chains, the resize-right path might include SF. But resize-right changes `endA`, not `startA`, so SF is unaffected.
**How to avoid:** Use mode-aware chain selection. Resize-right should only cascade FS and FF successors.
**Warning signs:** Dragging A's right edge causes SF-linked B to move.

### Pitfall 2: SF Lag Incorrectly Calculated from EndA

**What goes wrong:** After dragging B, the recorded SF lag is wrong (uses `endA` instead of `startA`).
**Why it happens:** Reusing the FF formula (`endB - endA`) for SF.
**How to avoid:** Use the correct SF formula: `lag = endB - startA`. SF anchors to predecessor's start date, not end date.
**Warning signs:** After soft-mode drag of SF successor, the dependency lag doesn't match the visual gap between `endB` and `startA`.

### Pitfall 3: SF Lag Exceeds 0 (Ceiling Violation)

**What goes wrong:** After dragging B right in soft mode, the recorded SF lag is positive (e.g., `3`). This violates the SF constraint.
**Why it happens:** `recalculateIncomingLags` for SF doesn't apply the ceiling at 0.
**How to avoid:** Apply `Math.min(0, lagDays)` for SF type in `recalculateIncomingLags`.
**Warning signs:** After soft-mode drag of SF successor rightward, `task.dependencies[n].lag` becomes positive.

### Pitfall 4: Forgetting SF in Move Mode Cascade

**What goes wrong:** When A is moved, SF successor B doesn't follow.
**Why it happens:** The move-mode cascade chain only includes FS + SS + FF.
**How to avoid:** Move-mode cascade should include all types: `['FS', 'SS', 'FF', 'SF']`.
**Warning signs:** Dragging A left/right doesn't move SF-linked B.

### Pitfall 5: Missing SF in Resize-Left Cascade

**What goes wrong:** When A's left edge is resized, SF successor B stays put.
**Why it happens:** The resize-left cascade chain only includes SS successors.
**How to avoid:** Resize-left cascade should include SS + SF (both depend on `startA`).
**Warning signs:** Dragging A's left edge doesn't move SF-linked B.

### Pitfall 6: SF Constraint Clamp Applied to Wrong Edge

**What goes wrong:** Attempt to clamp SF by constraining `left` instead of `width`.
**Why it happens:** Following the FS/SS pattern which constrain the start date.
**How to avoid:** SF constrains the end date, so the clamp affects `width` (which determines `endB = left + width`), not `left`.
**Warning signs:** SF successor B can be dragged past `startA` of predecessor.

---

## Code Examples

### Extension 1: ActiveDragState — rename cascadeChainStart to include SF

```typescript
// Source: useTaskDrag.ts ActiveDragState interface — extend
interface ActiveDragState {
  // ... existing fields ...
  cascadeChain: Task[];           // FS+SS+FF+SF successors (all modes)
  cascadeChainEnd: Task[];        // FS+FF successors (resize-right cascade)
  cascadeChainStart: Task[];      // SS+SF successors (resize-left cascade) — Phase 10: add SF
  onCascadeProgress?: (overrides: Map<string, { left: number; width: number }>) => void;
}
```

### Extension 2: handleMouseDown — populate SF chains

```typescript
// Source: useTaskDrag.ts handleMouseDown — extend
globalActiveDrag = {
  taskId,
  mode,
  // ... existing fields ...
  cascadeChain: !disableConstraints
    ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF', 'SF'])  // all, used for move
    : [],
  cascadeChainEnd: !disableConstraints
    ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])             // FS+FF, used for resize-right
    : [],
  cascadeChainStart: !disableConstraints
    ? getTransitiveCascadeChain(taskId, allTasks, ['SS', 'SF'])             // SS+SF, used for resize-left — Phase 10: add SF
    : [],
  onCascadeProgress,
};
```

### Extension 3: Cascade emission — mode-aware with SF

```typescript
// Source: useTaskDrag.ts handleGlobalMouseMove — extend
const activeChain =
  mode === 'resize-right' ? globalActiveDrag.cascadeChainEnd :    // FS + FF
  mode === 'resize-left'  ? globalActiveDrag.cascadeChainStart :  // SS + SF — Phase 10: add SF
  /* move */                globalActiveDrag.cascadeChain;         // FS + SS + FF + SF — Phase 10: add SF

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

### Extension 4: SF constraint clamp — B move-right / resize-right

```typescript
// Source: useTaskDrag.ts handleGlobalMouseMove — add new block
// SF constraint: endB <= startA (lag ceiling at 0)
// Applies when B is moved right or resized-right
if ((mode === 'move' || mode === 'resize-right') && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
  const currentTask = allTasks.find(t => t.id === globalActiveDrag?.taskId);
  if (currentTask && currentTask.dependencies && currentTask.dependencies.length > 0) {
    for (const dep of currentTask.dependencies) {
      if (dep.type !== 'SF') continue;
      const predecessor = globalActiveDrag.allTasks.find(t => t.id === dep.taskId);
      if (!predecessor) continue;
      const predStart = new Date(predecessor.startDate as string);
      const predStartOffset = Math.round(
        (Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate()) -
          Date.UTC(globalActiveDrag.monthStart.getUTCFullYear(), globalActiveDrag.monthStart.getUTCMonth(), globalActiveDrag.monthStart.getUTCDate()))
        / (24 * 60 * 60 * 1000)
      );
      const predStartLeft = Math.round(predStartOffset * globalActiveDrag.dayWidth);
      const currentEndRight = newLeft + newWidth;
      const maxAllowedEndRight = predStartLeft;  // endB cannot exceed startA
      if (currentEndRight > maxAllowedEndRight) {
        // Clamp width so endB = startA
        newWidth = Math.max(globalActiveDrag.dayWidth, maxAllowedEndRight - newLeft);
      }
    }
  }
}
```

### Extension 5: recalculateIncomingLags — SF case

```typescript
// Source: useTaskDrag.ts — extend
return task.dependencies.map(dep => {
  if (dep.type === 'FS') {
    // ... existing FS code (endA → startB) ...
  }
  if (dep.type === 'SS') {
    // ... existing SS code (startA → startB, floor at 0) ...
  }
  if (dep.type === 'FF') {
    // ... existing FF code (endA → endB, no floor) ...
  }
  if (dep.type === 'SF') {
    // Phase 10: lag = endB - startA (ceiling at 0)
    const predecessor = taskById.get(dep.taskId);
    if (!predecessor) return dep;
    const predStart = new Date(predecessor.startDate as string);
    const lagMs = Date.UTC(newEndDate.getUTCFullYear(), newEndDate.getUTCMonth(), newEndDate.getUTCDate())
                - Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate());
    const lagDays = Math.min(0, Math.round(lagMs / (24 * 60 * 60 * 1000))); // SF: ceiling at 0
    return { ...dep, lag: lagDays };
  }
  return dep;
});
```

### Extension 6: handleComplete — chain selection with SF

```typescript
// Source: useTaskDrag.ts handleComplete — extend chain selection
// Phase 10: chain selection with SF
const isResizeLeft = deltaFromStart !== 0 && deltaFromEnd === 0;
const chainForCompletion = deltaFromStart === 0
  ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])               // resize-right: FS + FF
  : isResizeLeft
    ? getTransitiveCascadeChain(taskId, allTasks, ['SS', 'SF'])             // resize-left: SS + SF — Phase 10: add SF
    : getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF', 'SF']); // move: all types — Phase 10: add SF
```

### Extension 7: SF Demo Tasks

```typescript
// Source: packages/website/src/app/page.tsx — add SF demo
const createSFDemoTasks = (): Task[] => {
  const baseDate = '2026-02-01';
  const addDays = (date: string, days: number) => { /* ... */ };

  return [
    {
      id: 'sf-predecessor',
      name: 'Elevator Installation (SF predecessor)',
      startDate: addDays(baseDate, 60),
      endDate: addDays(baseDate, 75),
      color: '#3b82f6',
    },
    {
      id: 'sf-successor',
      name: 'Elevator Equipment Delivery (SF successor)',
      startDate: addDays(baseDate, 15),
      endDate: addDays(baseDate, 60),  // 45 days logistics
      color: '#10b981',
      dependencies: [{ taskId: 'sf-predecessor', type: 'SF', lag: 0 }],
    },
    {
      id: 'sf-independent',
      name: 'Independent Task',
      startDate: addDays(baseDate, 50),
      endDate: addDays(baseDate, 65),
      color: '#f59e0b',
    },
  ];
};
```

---

## State of the Art (Phase 9 → Phase 10)

| Phase 9 (FS+SS+FF) | Phase 10 (FS+SS+FF+SF) | Impact |
|--------------------|-----------------------|--------|
| `getSuccessorChain` with `['FS', 'SS', 'FF']` | Call with `['SF']` for SF-only, `['SS', 'SF']` for resize-left, `['FS', 'SS', 'FF', 'SF']` for move | SF successors participate in cascade |
| Constraint clamp filters `dep.type !== 'FS' && dep.type !== 'SS'` | Add SF constraint clamp for move-right and resize-right of B | SF successors blocked from moving past startA |
| `recalculateIncomingLags` handles FS + SS + FF | Extend for SF: `endB - startA`, ceiling at 0 | SF lag correctly persisted in soft mode |
| Cascade fires for `move` (FS+SS+FF), `resize-right` (FS+FF), `resize-left` (SS) | Cascade also fires for `resize-left` with SF, `move` with SF | A start-date changes cascade SF successors |
| `cascadeChainEnd` (FS+FF), `cascadeChainStart` (SS) | Rename `cascadeChainStart` to include SF (SS+SF) | Enables mode-aware chain selection for resize-left |

**Existing valid patterns unchanged:**
- Global drag singleton (`globalActiveDrag`) for HMR safety — keep.
- `requestAnimationFrame` throttle — keep.
- `React.memo` with `arePropsEqual` — unchanged.
- UTC-only date arithmetic (`Date.UTC()`) — keep.
- `onCascade(tasks[])` callback — unchanged (SF cascade uses same callback path).
- `completeDrag()` clears cascade overrides before completing — unchanged.
- `getSuccessorChain` with `linkTypes` parameter — unchanged (already supports SF).
- `recalculateIncomingLags` with `newEndDate` parameter — unchanged (already added in Phase 9).

---

## Open Questions

1. **How to handle SF duration increase (resize-right of B) in the drag preview?**
   - What we know: When B's duration increases, `endB` stays pinned to `startA` and the task grows LEFT (`startB` moves left). This is a novel behavior.
   - Options: (a) Block resize-right beyond `startA` (simple but restrictive); (b) Allow resize-right but shift `startB` left to maintain duration (matches spec); (c) Visual feedback showing "task will grow left" preview.
   - Recommendation: Implement option (b) — allow resize-right but calculate `newLeft` backward from constrained `endB = startA` and `newWidth`. This demonstrates the key SF behavior: "preparation must start earlier" when logistics take longer.

2. **Should SF constraint clamp use a different mechanism than FS/SS?**
   - What we know: FS/SS clamp `left` (start date). SF must clamp `width` (which determines end date).
   - Options: (a) Add a separate SF constraint clamp block affecting `width`; (b) Integrate SF clamp into existing block by calculating max `width` from `startA` constraint.
   - Recommendation: Add a separate SF constraint clamp block after the existing FS/SS clamp. This keeps concerns separate and makes the SF logic clear.

3. **Exact placement of SF constraint clamp in `handleGlobalMouseMove`?**
   - What we know: The clamp must execute after `newLeft` and `newWidth` are calculated, but before the cascade emission loop.
   - Recommendation: Place the SF clamp block immediately after the existing FS/SS clamp block (around line 278 in current code). This keeps all constraint clamps together.

---

## Files to Modify

1. **`packages/gantt-lib/src/hooks/useTaskDrag.ts`**
   - Extend `ActiveDragState` with `cascadeChainStart` including SF (SS+SF for resize-left).
   - Extend `handleMouseDown` to populate `cascadeChainStart` using `getTransitiveCascadeChain(id, tasks, ['SS', 'SF'])`.
   - Extend `cascadeChain` in `handleMouseDown` to include SF: `['FS', 'SS', 'FF', 'SF']`.
   - Add SF constraint clamp block for move-right and resize-right of B (clamps `width` so `endB <= startA`).
   - Extend cascade emission block to use `cascadeChainStart` for resize-left mode.
   - Extend `recalculateIncomingLags` to handle SF type: `lag = endB - startA` (ceiling at 0).
   - Extend `handleComplete` to use SF-aware chain selection (SS+SF for resize-left, all types for move).

2. **`packages/gantt-lib/src/__tests__/dependencyUtils.test.ts`** (optional but recommended)
   - Add tests for `getSuccessorChain` with `['SF']` link type (though it's already tested via parameterization).
   - Consider adding integration-style tests for SF drag behavior.

3. **`packages/website/src/app/page.tsx`** (recommended)
   - Add SF demo section showing A→(SF)→B chain drag behavior.
   - Demonstrate: move A, resize-left A, move B (blocked at startA), resize-right B (blocked at startA).

**No changes needed:**
- `packages/gantt-lib/src/utils/dependencyUtils.ts` — `getSuccessorChain` already parameterized.
- `GanttChart.tsx` — cascade state and override mechanism already generic.
- `TaskRow.tsx` — override prop already generic.
- `types/index.ts` — `LinkType` already includes 'SF'.
- `DependencyLines.tsx` — already renders SF connections correctly (type-aware connection points from Quick-17).

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `packages/gantt-lib/src/hooks/useTaskDrag.ts` (full file read)
- Direct codebase inspection — `packages/gantt-lib/src/utils/dependencyUtils.ts` (full file read)
- `.planning/phases/10-sf-dependency/10-CONTEXT.md` — locked user decisions, complete behavior matrix
- `.planning/phases/09-ff-dependency/09-RESEARCH.md` — Phase 9 architecture reference
- `.planning/phases/08-ss-dependency/08-RESEARCH.md` — Phase 8 architecture reference
- `.planning/phases/07-dependencies-constraits/07-RESEARCH.md` — Phase 7 cascade engine reference

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — project architecture decisions
- `.planning/REQUIREMENTS.md` — project requirements

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing codebase
- Architecture (core changes): HIGH — derived directly from code inspection and CONTEXT.md
- SF constraint clamp: HIGH for constraint, MEDIUM for exact implementation placement
- recalculateIncomingLags SF case: HIGH — formula directly specified in CONTEXT.md
- Cascade chain selection: HIGH — directly derived from SF semantics (`endB = startA + lag`)
- SF duration increase handling: MEDIUM — novel behavior, discretion area for UX

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable codebase, no fast-moving dependencies)
