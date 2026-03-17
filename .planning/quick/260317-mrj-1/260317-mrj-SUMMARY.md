# Quick Task 260317-mrj: Summary

**Task:** изменить логику повышения/понижения иерархии - кнопки всегда изменяют уровень на 1
**Completed:** 2026-03-17

## Objective

Change hierarchy promotion/demotion buttons to always change level by exactly 1 (simplify and unify hierarchy scheme).

## Changes Made

### Task 1: Update promote handler to single-level logic
**Commit:** `c0f88e2`
**File:** `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`

Modified `handlePromoteTask` to use explicit depth calculation via `getTaskDepth()` helper. Promote now always moves task up by exactly 1 level (depth N → N-1).

Key changes:
- Added `getTaskDepth()` helper function to calculate task depth
- Replaced grandparent lookup with depth-based logic
- If depth > 1: move to grandparent (1 level up)
- If depth <= 1: move to root
- Removed type assertions, used proper Task.parentId property

### Task 2: Update demote handler to single-level logic
**Commit:** `eb7f6e8`
**File:** `packages/gantt-lib/src/components/TaskList/TaskList.tsx`

Updated `handleDemoteWrapper` to validate that the previous task is at the correct depth (currentDepth - 1). Only uses previous task as parent if it creates a single-level change (depth N → N+1), preventing hierarchy gaps.

Key changes:
- Added depth validation before accepting previous task as parent
- Only uses previous task if `previousDepth === currentDepth - 1`
- Prevents creating gaps in hierarchy levels
- Preserved "Новый раздел" creation for first task demotion

## Commits

| Hash | Message |
|------|---------|
| c0f88e2 | feat(quick-260317-mrj): update promote handler to use explicit depth calculation |
| eb7f6e8 | feat(quick-260317-mrj): update demote handler to validate single-level depth change |

## Status

Code changes complete. **Manual testing pending** - user should verify the behavior in the running application.

### Verification Steps
1. Create a multi-level hierarchy (Task 1 → 1.1 → 1.1.1 → 1.1.1.1)
2. Test promote on deepest task: should move up 1 level per press
3. Test demote on root task: should move down 1 level per press
4. Verify no hierarchy gaps occur

## Notes

The checkpoint for manual verification (Task 3) is pending. The implementation is complete but requires user testing to confirm the expected behavior in the application.
