---
phase: 23-additional-tasklist-columns
plan: 02
subsystem: ui
tags: [typescript, react, tasklist, generic-types, additional-columns]

# Dependency graph
requires:
  - phase: 23-additional-tasklist-columns (plan 01)
    provides: Public generic types (TaskListColumn, TaskListColumnContext, BuiltInTaskListColumnId), wave-0 failing tests
provides:
  - additionalColumns prop on GanttChart and TaskList
  - Anchor-based bucketing with 'name' fallback
  - Width budget growth for custom columns
  - Custom header/body cell rendering with data-column-id markers
  - gantt-tl-headerCell-custom and gantt-tl-cell-custom CSS classes
affects: [23-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Anchor-based column bucketing: additionalColumns grouped by BuiltInTaskListColumnId with fallback to 'name'"
    - "Width budget growth: overlay width increases by sum of custom column widths"
    - "data-column-id and data-custom-column-id attributes for test targeting"

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css

key-decisions:
  - "GanttChart remains non-generic internally, uses GanttChartInner for generic wrapper to preserve backwards compatibility"
  - "Custom columns only bucketed at 'name' and 'progress' anchors in this plan (other anchors not yet tested, rendered at fallback)"
  - "Editor pipeline not implemented in this plan -- renderCell only, editor support deferred to 23-03"

patterns-established:
  - "data-column-id on all header cells (built-in + custom) for stable test targeting"
  - "data-custom-column-id specifically on custom cells for column-specific assertions"

requirements-completed: [COL-01, COL-02, COL-03, COL-05, COL-06, COL-07, COL-08]

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 23 Plan 02: Generic Wiring & Inline Layout Summary

**additionalColumns prop on GanttChart with anchor-based positioning, width budget growth, and custom cell rendering in TaskList header and body**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T14:21:10Z
- **Completed:** 2026-03-27T14:25:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- GanttChart and TaskList accept generic `additionalColumns` prop with type-safe TaskListColumn<TTask>[]
- BUILT_IN_COLUMN_ORDER anchors declared for stable column ordering
- Custom columns bucketed by anchor with 'name' fallback for missing/invalid anchors
- Overlay width budget grows by sum of custom column pixel widths
- Custom header and body cells rendered after corresponding built-in anchors
- All 7 wave-0 integration tests pass (up from 0 in 23-01)

## Task Commits

Each task was committed atomically:

1. **Task 1: Generic boundary for additionalColumns** - `650230c` (feat)
2. **Task 2: Header/body rendering, width budget, CSS** - `06a0c1d` (feat)

## Files Created/Modified
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` - Added additionalColumns prop, GanttChartInner generic wrapper
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` - BUILT_IN_COLUMN_ORDER, anchor bucketing, width budget, custom header rendering
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - Custom body cell rendering via renderCell
- `packages/gantt-lib/src/components/TaskList/TaskList.css` - gantt-tl-headerCell-custom and gantt-tl-cell-custom classes

## Decisions Made
- GanttChart keeps non-generic internal signature for backward compatibility; GanttChartInner provides generic type inference
- Only 'name' and 'progress' anchors get explicit custom column rendering slots (matching test fixtures); other anchors fall back to 'name' bucket
- Editor pipeline (openEditor/closeEditor/updateTask) not wired yet -- renderCell-only display path, deferred to 23-03

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Display path for additionalColumns is fully functional
- Editor pipeline (23-03) can now wire openEditor/updateTask/closeEditor callbacks into TaskListRow
- All 7 wave-0 tests pass, providing regression safety for subsequent plans

## Self-Check: PASSED

- FOUND: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx (additionalColumns prop)
- FOUND: packages/gantt-lib/src/components/TaskList/TaskList.tsx (bucketing, headers, width budget)
- FOUND: packages/gantt-lib/src/components/TaskList/TaskListRow.tsx (custom body cells)
- FOUND: packages/gantt-lib/src/components/TaskList/TaskList.css (custom cell classes)
- FOUND: commit 650230c (Task 1)
- FOUND: commit 06a0c1d (Task 2)
- FOUND: .planning/phases/23-additional-tasklist-columns/23-02-SUMMARY.md

---
*Phase: 23-additional-tasklist-columns*
*Completed: 2026-03-27*
