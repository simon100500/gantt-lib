---
phase: 14-dependencies-edit-task-list
plan: "02"
subsystem: task-list-dependencies
tags: [dependencies, task-list, chips, picker-mode, popover, react-memo]
dependency_graph:
  requires:
    - phase: 14-01
      provides: "gantt-tl-dep-* CSS classes, activeLinkType state, selectingPredecessorFor state, handleAddDependency, handleRemoveDependency, TaskListRow props interface"
  provides:
    - "TaskListRow «Связи» cell with dependency chips"
    - "Chip format «ОН(N)» (type abbreviation + predecessor row number, 1-based)"
    - "Max 2 chips inline, overflow Popover with +N ещё trigger"
    - "Hover-revealed × button per chip; click removes dependency immediately"
    - "+ button activates predecessor picker mode for that row"
    - "Picker mode: crosshair cursor and row highlight via CSS classes on outer div"
    - "Source row disabled in picker mode (opacity 0.4 via gantt-tl-row-picking-self class)"
    - "disableDependencyEditing guard hides + and × buttons (chips remain visible)"
  affects:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
tech_stack:
  added: []
  patterns:
    - "useMemo for chip computation from task.dependencies"
    - "CSS class cascade pattern: gantt-tl-row-picking / gantt-tl-row-picking-self on outer div cascades to cell"
    - "handlePredecessorPick: task.id is successor, selectingPredecessorFor is predecessor"
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
key_decisions:
  - "onAddDependency arg order: (task.id, selectingPredecessorFor, linkType) — clicked row is successor, source row (+) is predecessor"
  - "picker mode CSS classes go on outer row div (not the deps cell) — cascade selectors handle cell styling via .gantt-tl-row-picking .gantt-tl-cell-deps"
  - "Chip × calls onRemoveDependency(task.id, dep.taskId, dep.type) — removes dependency where this task is the successor"
metrics:
  duration: "~20 min (implementation + checkpoint verification + direction bug fix)"
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 1
---

# Phase 14 Plan 02: TaskListRow Связи Cell Summary

**«Связи» dependency cell in TaskListRow: dependency chips with overflow Popover, two-click picker flow, and a post-checkpoint direction bug fix for the onAddDependency argument order.**

## Performance

- **Duration:** ~20 min (implementation + human verification + direction fix)
- **Started:** 2026-03-03
- **Completed:** 2026-03-03
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 1

## Accomplishments

- Complete «Связи» cell rendering in TaskListRow: dependency chips, overflow Popover, picker mode interaction
- Chips display format «ОН(N)» — type abbreviation + predecessor row number (1-based index in allTasks)
- Max 2 chips visible inline; additional deps hidden behind «+N ещё» Popover listing all with × delete buttons
- «+» button activates predecessor picker mode (row sets selectingPredecessorFor); other rows get crosshair cursor on «Связи» cell
- Source row in picker mode is visually disabled (opacity 0.4) via gantt-tl-row-picking-self CSS class
- Human verification revealed a bug in the picker add flow; argument order was corrected post-checkpoint

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | Extend TaskListRowProps and add «Связи» cell to TaskListRow | cb2ec28 |
| 2 | Visual verification checkpoint | approved (human) |
| — | Post-checkpoint direction fix: swap onAddDependency args | 3b81bdd |

## Files Created/Modified

- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — Added complete «Связи» cell: chips (max 2 visible), overflow Popover (+N ещё), «+» add button, picker mode row CSS class, handlers (handleAddClick, handlePredecessorPick, handleRemoveChip). Post-checkpoint fix corrected onAddDependency argument order.

## Decisions Made

- **onAddDependency arg order:** `onAddDependency(task.id, selectingPredecessorFor, linkType)` — the clicked row (`task.id`) is the successor; the source row (`selectingPredecessorFor`) where «+» was pressed is the predecessor. This means pressing «+» on A and clicking B creates B→A dependency (B depends on A; A is predecessor).
- **Picker mode CSS on outer div:** `gantt-tl-row-picking` and `gantt-tl-row-picking-self` classes go on the outer row `<div>`, not the deps cell. CSS cascade `.gantt-tl-row-picking .gantt-tl-cell-deps` handles cell-level cursor and highlight styling.
- **Chip × arg order:** `onRemoveDependency(task.id, dep.taskId, dep.type)` — removes the dependency from this task (successor), where dep.taskId is the predecessor being disconnected.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as specified.

### Human-Discovered Bug (Fixed Post-Checkpoint)

**[Post-checkpoint fix] onAddDependency argument order was swapped**
- **Found during:** Task 2 visual verification (human review)
- **Issue:** `handlePredecessorPick` called `onAddDependency(selectingPredecessorFor, task.id, activeLinkType)` — pressing «+» on A and clicking B would make A depend on B, but the expected UX is B depends on A («+» means "I am the predecessor, pick who comes after me").
- **Fix:** Swapped arguments to `onAddDependency(task.id, selectingPredecessorFor, activeLinkType)` — clicked row is successor, source row is predecessor.
- **Files modified:** `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` (line 162)
- **Commit:** 3b81bdd

---

**Total deviations:** 1 (post-checkpoint direction fix — discovered during human verification)
**Impact on plan:** Correctness fix for UX semantics. No scope creep.

## Issues Encountered

- Initial picker implementation had arguments to `onAddDependency` in wrong order. Visual verification revealed the dependency direction was inverted. Fixed by swapping `selectingPredecessorFor` and `task.id` in the callback call.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 14 is now complete — both plans executed. The full «Связи» dependency column is working:
- Plan 01: CSS classes, state management, Popover header with type switcher
- Plan 02: TaskListRow chip rendering, picker mode, overflow Popover, correct dependency direction

No blockers. The library is ready for further features or release preparation.

## Self-Check: PASSED

- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` exists with «Связи» cell implementation
- Commits cb2ec28 (initial implementation), 3b81bdd (direction fix) exist in git log
- STATE.md updated: Phase 14 COMPLETE, Plan 2 of 2 complete
- TypeScript compilation clean (pre-existing test file errors out of scope)

---
*Phase: 14-dependencies-edit-task-list*
*Completed: 2026-03-03*
