---
phase: quick-38
plan: "01"
subsystem: TaskList
tags: [dependency, snap, auto-position, task-list]
dependency_graph:
  requires:
    - calculateSuccessorDate (dependencyUtils.ts)
    - GanttChart.handleTaskChange cascade trigger
  provides:
    - handleAddDependency with auto-snap logic
  affects:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
tech_stack:
  added: []
  patterns:
    - calculateSuccessorDate called with lag=0 for exact adjacency snap
    - Single onTaskChange call emitting both new dependency and snapped dates
    - GanttChart cascade triggered by detected date change
key_files:
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
decisions:
  - Import calculateSuccessorDate alongside validateDependencies from dependencyUtils (no new utility needed)
  - Graceful fallback: if predecessor not found, emit without snap (preserves prior behavior)
  - Use toISOString().split('T')[0] for date string output consistent with project convention
  - calculateSuccessorDate omitted from useCallback deps (stable module-level import, not reactive)
metrics:
  duration: "39 seconds"
  completed_date: "2026-03-03"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 38: Auto-snap successor dates on dependency add — Summary

**One-liner:** Added lag=0 date snapping to `handleAddDependency` so successor bars immediately reposition adjacent to the predecessor when a dependency link is created via the TaskList.

## What Was Built

Modified `handleAddDependency` in `TaskList.tsx` to compute the successor task's new dates using `calculateSuccessorDate` (lag=0) immediately after cycle validation passes. The snapped dates are emitted together with the new dependency in a single `onTaskChange` call, which triggers `GanttChart.handleTaskChange` to detect the date change and cascade further downstream successors via `cascadeByLinks`.

### Link type snap behavior

| Link Type | constraintDate anchors | newStart | newEnd |
|-----------|----------------------|----------|--------|
| FS | predecessor.endDate | = constraintDate | = start + duration |
| SS | predecessor.startDate | = constraintDate | = start + duration |
| FF | predecessor.endDate | = end - duration | = constraintDate |
| SF | predecessor.startDate | = end - duration | = constraintDate |

Successor duration is always preserved. Locked tasks are not repositioned (handled by existing `cascadeByLinks` filter).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Auto-snap successor dates on dependency add | 1a554a0 | TaskList.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `packages/gantt-lib/src/components/TaskList/TaskList.tsx` modified
- [x] Build passes: `CJS Build success in 92ms`, `ESM Build success in 93ms`, `DTS Build success in 1691ms`
- [x] Commit 1a554a0 exists
- [x] `calculateSuccessorDate` imported and called in `handleAddDependency`
- [x] All 4 link types (FS, SS, FF, SF) handled with correct start/end snap logic
- [x] Duration preserved via `durationMs` calculation from original successor dates

## Self-Check: PASSED
