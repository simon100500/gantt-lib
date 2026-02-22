---
phase: 09-ff-dependency
plan: 02
title: "FF Constraint Enforcement in useTaskDrag"
subsystem: "Dependency Cascade Engine"
tags: ["ff-dependency", "cascade", "drag-modes", "constraint-enforcement"]
status: "COMPLETE"
completion_date: "2026-02-22"
start_time: "2026-02-22T14:06:40Z"
end_time: "2026-02-22T14:07:56Z"
duration_seconds: 76
tasks_completed: 2
files_created: 0
files_modified: 1
deviations: "None - plan executed exactly as written"

# Phase 09 Plan 02: FF Constraint Enforcement in useTaskDrag Summary

**One-liner:** FF cascade enforcement using cascadeChainEnd (FS+FF) for resize-right and full FS+SS+FF chain for move mode.

## Overview

Extended the drag cascade engine to support FF (Finish-to-Finish) constraint enforcement. This plan added `cascadeChainEnd` to the global drag state and wired FF into cascade emission and completion handlers across all drag modes.

**Key Achievement:** FF successors now cascade correctly when predecessor moves or resizes-right, but NOT when predecessor resizes-left (endA unchanged).

## Changes Made

### Task 1: Extend ActiveDragState and handleMouseDown with cascadeChainEnd

**File:** `packages/gantt-lib/src/hooks/useTaskDrag.ts`

- Added `cascadeChainEnd: Task[]` field to `ActiveDragState` interface (line 98)
- Updated `handleMouseDown` to populate `cascadeChainEnd` with `['FS', 'FF']` chain (line 819)
- Updated `cascadeChain` to include FF (FS+SS+FF) for move mode (line 810)
- Updated JSDoc comments to reflect Phase 9 changes

**Commit:** `841774b` feat(09-02): extend ActiveDragState and handleMouseDown with cascadeChainEnd

### Task 2: Extend cascade emission and handleComplete for FF

**File:** `packages/gantt-lib/src/hooks/useTaskDrag.ts`

- Updated cascade emission block to use `cascadeChainEnd` for resize-right mode (line 347-348)
- Updated `handleComplete` `chainForCompletion` to include FF for resize-right and move modes (line 667-671)
- FF successors now cascade in:
  - **Move mode:** FS+SS+FF chain (all link types follow startA shift)
  - **Resize-right mode:** FS+FF chain (endA changes, SS unaffected)
  - **Resize-left mode:** SS-only chain (endA unchanged, FF unaffected)

**Commit:** `082c66f` feat(09-02): implement FF cascade emission and completion chain selection

## Deviations from Plan

None - plan executed exactly as written.

## Key Technical Decisions

1. **No SS lag floor change for FF:** The existing SS lag floor (`Math.max(chainLeft, newLeft)`) remains in place. FF tasks can have negative lag, but applying the floor to all tasks in the activeChain is acceptable because:
   - The visual position is just a preview
   - Real lag is recalculated correctly on completion
   - FF tasks with negative lag will appear "behind" predecessor in preview, which is acceptable

2. **Mode-based chain selection:** Using `cascadeChainEnd` (FS+FF) for resize-right instead of just `cascadeChainFS` (FS-only) ensures FF successors follow endA changes correctly.

3. **Transitive cascade:** Using `getTransitiveCascadeChain` for all chains ensures mixed link type dependencies cascade properly (e.g., A--FF-->B--FS-->C).

## Files Modified

| File | Changes |
|------|---------|
| `packages/gantt-lib/src/hooks/useTaskDrag.ts` | Added cascadeChainEnd field, updated handleMouseDown and cascade emission |

## Test Results

All tests pass:
- 4 test files passed
- 135 tests passed
- Build clean (no TypeScript errors)

## Behavior Matrix

| Drag Operation | Chain Used | FF Behavior |
|----------------|------------|-------------|
| Predecessor moves | FS+SS+FF | B follows with same delta (endA changes) |
| Predecessor resize-right | FS+FF | B follows with same delta (endA changes) |
| Predecessor resize-left | SS-only | B stays (endA unchanged, FF unaffected) |
| Successor moves freely | N/A | Lag recalculated (no constraint clamp) |
| Successor resize-right | N/A | Lag recalculated (endB changes) |
| Successor resize-left | N/A | Lag preserved (endB unchanged) |

## Next Steps

Plan 09-03 will add FF demo tasks to the Construction Project and verify all FF interaction scenarios end-to-end.

## Performance

| Metric | Value |
|--------|-------|
| Duration | 1 min 16 sec |
| Tasks | 2 |
| Files Modified | 1 |
| Commits | 2 |
| Lines Changed | ~20 |

## Self-Check: PASSED

- [x] All tasks executed (2/2)
- [x] Each task committed individually
- [x] Build clean (no TypeScript errors)
- [x] All tests pass (135/135)
- [x] SUMMARY.md created
- [x] STATE.md and ROADMAP.md pending update
