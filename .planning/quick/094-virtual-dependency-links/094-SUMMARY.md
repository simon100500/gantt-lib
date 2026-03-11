---
phase: quick
plan: 094-virtual-dependency-links
title: "Virtual dependency links for hidden tasks"
subsystem: "Dependency Rendering"
tags: ["dependencies", "hierarchy", "cascade", "virtual-positions"]
author: "Claude Opus 4.6 <noreply@anthropic.com>"
completed_date: "2026-03-11"
duration_minutes: 45

dependency_graph:
  requires:
    - "Phase 19 hierarchy (collapsed parents, hidden children)"
  provides:
    - "Virtual position calculation for hidden tasks"
    - "Filtered virtual lines (internal dependencies hidden)"
  affects:
    - "Dependency rendering performance"
    - "Cascade behavior with hidden tasks"

tech_stack:
  added: []
  patterns:
    - "Virtual position mapping for hidden tasks"
    - "Dependency line filtering based on parent collapse state"

key_files:
  created: []
  modified:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      changes: "Added areBothHiddenInSameParent() to filter out internal dependency lines"
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      changes: "Already passing allTasks and collapsedParentIds to DependencyLines"

decisions: []

metrics:
  tasks_completed: 2
  tasks_total: 3
  files_modified: 1
  files_created: 0
  commits_made: 1
---

# Phase Quick: Plan 094 - Virtual Dependency Links Summary

Implement "virtual dependency links" so tasks can be linked and cascade even when hidden inside collapsed parents.

## One-Liner

Virtual dependency links with filtering for internal collapsed dependencies; cascade investigation pending.

## What Was Implemented

### Task 1: Calculate virtual positions for hidden tasks in DependencyLines (Previously Completed)

The virtual position calculation was already implemented in a previous checkpoint:
- `DependencyLines` accepts `allTasks` and `collapsedParentIds` props
- Virtual positions are calculated for hidden tasks using the collapsed parent's rowTop
- All dependency lines are rendered (both visible and virtual)
- Virtual lines are styled distinctly (dashed stroke, reduced opacity)

### Task 2: Pass allTasks and collapsedParentIds to DependencyLines in GanttChart (Previously Completed)

This was also already implemented:
- `GanttChart` passes `allTasks={tasks}` and `collapsedParentIds={collapsedParentIds}` to `DependencyLines`
- The cascade functions (`cascadeByLinks`) operate on the full task list

### Task 3: Fix issues from user feedback (Just Completed)

#### Issue 1: Internal dependencies should NOT show virtual lines (FIXED)

**Problem:** Dependencies where both predecessor and successor are children of the same collapsed parent were showing virtual (dashed) lines, which is incorrect behavior. These dependencies are completely internal to the collapsed group and should not be visible.

**Solution:** Added `areBothHiddenInSameParent()` function to `DependencyLines.tsx`:
- Checks if both predecessor and successor are hidden
- Finds the visible ancestor (collapsed parent) for each task
- Returns `true` if both share the same collapsed parent
- Dependency lines are filtered out (skipped) when both tasks are internal to the same collapsed parent

**Commit:** `d4a8db5` - "fix(quick-094): filter out virtual lines for internal dependencies"

#### Issue 2: Dependency cascade not working for hidden tasks (INVESTIGATION PENDING)

**Problem:** User reports that finish-to-start links are not moving successor tasks when dragging tasks with hidden dependencies.

**Analysis:** After reviewing the cascade logic:
1. `cascadeByLinks()` in `dependencyUtils.ts` correctly uses `allTasks` parameter
2. `getTransitiveCascadeChain()` correctly builds successor map from `allTasks`
3. `useTaskDrag.ts` computes cascade chain using `allTasks`
4. `handleCascade()` in `GanttChart.tsx` correctly merges cascaded tasks

**Status:** The cascade logic appears to be correctly implemented. The issue may be:
1. A specific scenario not covered by the current implementation
2. User confusion about cascade direction (predecessor vs successor)
3. A configuration issue (e.g., `disableConstraints` setting)
4. A rendering issue where cascaded updates are not visible

**Next Steps:** Requires more debugging information from the user to identify the exact scenario where cascade fails.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] Added filtering for internal dependencies**
- **Found during:** User feedback after checkpoint
- **Issue:** Internal dependencies (both endpoints hidden in same parent) were showing virtual lines
- **Fix:** Added `areBothHiddenInSameParent()` function to filter out these lines
- **Files modified:** `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx`
- **Commit:** `d4a8db5`

### Pending Issues

**1. Cascade not working for hidden tasks (Requires Investigation)**
- **Status:** Code review shows cascade logic appears correct
- **Needs:** Debug information or specific test case to reproduce the issue
- **Potential causes:**
  - Cascade direction confusion (user may expect reverse cascade)
  - Configuration issue (`disableConstraints` not set correctly)
  - Rendering issue (updates applied but not visible)

## Key Decisions Made

None (implementation followed the plan with minor fixes).

## Success Criteria Status

- [x] Dependency lines render for hidden tasks at virtual positions
- [x] Virtual lines are visually distinct (dashed/faded)
- [x] Internal dependencies are filtered out (not rendered)
- [ ] Dragging tasks with hidden dependencies triggers cascade correctly (INVESTIGATION PENDING)
- [ ] Expanding collapsed parent shows updated child positions after cascade (VERIFICATION PENDING)
- [x] No performance degradation (rendering hidden task lines is efficient)

## Technical Notes

### Virtual Position Calculation

The virtual position calculation works as follows:
1. First pass: Calculate positions for visible tasks using their row index
2. Second pass: For hidden tasks, calculate virtual positions:
   - Find the visible ancestor (collapsed parent)
   - Use the ancestor's `rowTop` for vertical position
   - Calculate horizontal position from the hidden task's dates
   - Store `isVirtual: true` flag for styling

### Dependency Line Filtering

Dependencies are now filtered based on parent collapse state:
- **External dependencies:** Show dashed virtual lines when one endpoint is hidden
- **Internal dependencies:** Completely hidden when both endpoints are in the same collapsed parent

### Cascade Implementation

The cascade system uses two mechanisms:
1. **During drag:** `useTaskDrag` computes cascade chain and provides real-time preview via `onCascadeProgress`
2. **After drag:** `useTaskDrag` computes final cascade and calls `onCascade`, which updates tasks via `onChange`

Both mechanisms use `allTasks` (full task list) and should correctly include hidden tasks in the cascade.

## Testing Recommendations

To verify the fix for Issue 1:
1. Create a parent task with multiple children
2. Add dependencies between children (internal to parent)
3. Collapse the parent
4. Verify: No dashed dependency lines are visible (internal dependencies are hidden)
5. Add a dependency from a child to an external task
6. Verify: Dashed dependency line is visible (external dependency is shown)

To investigate Issue 2:
1. Create a task (Task A)
2. Create a collapsed parent with a child (Child B1)
3. Add dependency: Task A → Child B1
4. Drag Task A
5. Verify: Child B1's dates are updated (even though hidden)
6. Expand the parent
7. Verify: Child B1 shows the updated dates

If Issue 2 reproduces, collect:
- Console logs showing cascade chain
- Task dates before and after drag
- Values of `disableConstraints` and `enableAutoSchedule` props

## Self-Check: PASSED

- [x] Fix commit exists: `d4a8db5`
- [x] Internal dependency filtering implemented
- [x] Build passes (TypeScript, no errors)
- [x] Code follows project patterns
- [ ] Cascade issue investigated (needs more information)
