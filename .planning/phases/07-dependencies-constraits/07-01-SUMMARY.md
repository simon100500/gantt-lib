---
phase: 07-dependencies-constraits
plan: 01
subsystem: ui
tags: [react, typescript, drag, gantt, dependency, cascade, BFS]

# Dependency graph
requires:
  - phase: 06-dependencies
    provides: dependencyUtils with buildAdjacencyList, detectCycles, calculateSuccessorDate; disableConstraints prop threading from GanttChart to useTaskDrag

provides:
  - getSuccessorChain(draggedTaskId, allTasks) BFS traversal in dependencyUtils.ts (FS-only, excludes dragged task)
  - ActiveDragState extended with cascadeChain and onCascadeProgress fields
  - UseTaskDragOptions extended with onCascadeProgress, onCascade, and updatedDependencies in onDragEnd result
  - Hard-mode cascade preview: emits Map<taskId,{left,width}> each RAF for all chain members
  - Hard-mode left boundary: child clamps at predecessor.startDate (not endDate)
  - Soft-mode lag recalculation: recalculateIncomingLags delivers updated dependencies[] on drag complete
  - completeDrag() clears cascade overrides before calling onComplete

affects:
  - 07-02 (GanttChart must wire onCascadeProgress, onCascade, cascadeOverrides state, and TaskRow overridePosition)
  - 07-03 (TaskRow overridePosition prop for real-time cascade preview)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BFS traversal for FS-only successor chain with visited set cycle guard
    - Cascade delta calculation: deltaDays from initialLeft difference in pixels divided by dayWidth
    - Two-mode drag completion: hard mode calls onCascade(tasks[]), soft mode calls onDragEnd with updatedDependencies
    - completeDrag() clears cascade overrides (empty Map) before completing to prevent stale preview positions

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/utils/dependencyUtils.ts
    - packages/gantt-lib/src/hooks/useTaskDrag.ts

key-decisions:
  - "getSuccessorChain returns only FS successors, excluding dragged task — dragged task seeded in visited set to prevent it appearing in chain"
  - "Hard mode left boundary uses predecessor.startDate not endDate — allows negative lag (child can start before predecessor ends)"
  - "Soft mode delivers updated lag via updatedDependencies field in onDragEnd result — reuses existing callback without new API surface"
  - "onCascade and onDragEnd are mutually exclusive on completion — hard mode with chain calls onCascade and returns, soft mode calls onDragEnd"
  - "completeDrag() emits onCascadeProgress(new Map()) before nulling globalActiveDrag — clears stale preview positions before state updates"

patterns-established:
  - "Pattern: Store cascadeChain once on drag start in globalActiveDrag, reuse each RAF — avoids O(n) traversal on every frame"
  - "Pattern: Cascade delta = Math.round((newLeft - initialLeft) / dayWidth) — integer days, not floating point"

requirements-completed: [PHASE7-CORE]

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 7 Plan 01: Cascade Chain Engine Summary

**BFS FS-successor chain traversal in dependencyUtils, plus hard-mode cascade preview emission and soft-mode lag recalculation in useTaskDrag**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T21:31:38Z
- **Completed:** 2026-02-22T21:35:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `getSuccessorChain(draggedTaskId, allTasks): Task[]` added to dependencyUtils.ts — BFS on FS-only edges, excludes dragged task, cycle-safe via visited set
- `ActiveDragState` extended with `cascadeChain: Task[]` and `onCascadeProgress?` — enables real-time cascade preview from global drag singleton
- Hard-mode mouse-move handler: replaces old constraint block with Phase 7 predecessor.startDate boundary, then emits `Map<taskId,{left,width}>` overrides each RAF for all chain members
- Soft-mode completion: `recalculateIncomingLags` computes new FS lag values; delivered via `updatedDependencies` in `onDragEnd` result
- `completeDrag()` emits empty Map to `onCascadeProgress` before completing — prevents stale preview positions after mouseup

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getSuccessorChain to dependencyUtils.ts** - `c8d60de` (feat)
2. **Task 2: Extend useTaskDrag with cascade engine** - `0faea67` (feat)

**Plan metadata:** (to be committed with SUMMARY.md)

## Files Created/Modified

- `packages/gantt-lib/src/utils/dependencyUtils.ts` - Added `getSuccessorChain` BFS function (53 lines)
- `packages/gantt-lib/src/hooks/useTaskDrag.ts` - Cascade engine: ActiveDragState extension, recalculateIncomingLags, hard-mode boundary and preview emission, soft-mode lag delivery, handleMouseDown/handleComplete updates

## Decisions Made

- **Soft mode lag delivery via updatedDependencies in onDragEnd result:** Extends existing callback without adding new API surface. GanttChart/TaskRow consumers can check for `updatedDependencies` and spread them into the updated task.
- **Hard mode left boundary at predecessor.startDate:** Per CONTEXT.md spec — child can have negative lag (start before predecessor ends) but cannot start before predecessor starts. Replaces the old `calculateSuccessorDate`-based boundary check.
- **onCascade and onDragEnd mutually exclusive:** When chain.length > 0 in hard mode, `handleComplete` calls `onCascade` and returns immediately; `onDragEnd` is not called. Backward compatible when no `onCascade` prop is provided (falls through to `onDragEnd`).
- **Chain pre-computed on drag start:** Stored in `globalActiveDrag.cascadeChain` — avoids repeated BFS traversal every RAF frame.

## Deviations from Plan

None - plan executed exactly as written. The plan provided two implementations for `recalculateIncomingLags` (initial and "simplified"); used the simplified version as instructed.

## Issues Encountered

None. Baseline build and all 117 tests passed before and after both tasks.

## Next Phase Readiness

The cascade engine core (BFS traversal + delta emission + lag recalculation) is complete. Next plans must wire the consumer side:
- **Plan 02 (GanttChart):** Add `cascadeOverrides: Map` state, `handleCascadeProgress` callback, thread `onCascadeProgress` and `onCascade` down through `TaskRow` to `useTaskDrag`
- **Plan 03 (TaskRow):** Add `overridePosition?: {left, width}` prop; update `arePropsEqual` to compare `overridePosition` (critical for React.memo — see RESEARCH.md Pitfall 3)

---
*Phase: 07-dependencies-constraits*
*Completed: 2026-02-22*
