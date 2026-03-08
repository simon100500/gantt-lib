---
phase: quick-65
plan: 01
subsystem: task-list
tags: [task-list, insert-button, onInsertAfter, callback, deps-cell]

# Dependency graph
requires:
  - phase: quick-64
    provides: hover-reveal insert button with onAdd callback
provides:
  - onInsertAfter(taskId, newTask) callback from GanttChart → TaskList → TaskListRow
  - Insert button positioned inline in deps cell with green styling
  - Proper task insertion after specified task instead of appending to end
affects: [task-list, insert-after, task-operations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline-flex button layout in deps cell alongside chips"
    - "Functional updater pattern for array insertion (splice at index + 1)"
    - "Green color differentiation for insert vs blue add dependency button"

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
    - packages/website/src/app/page.tsx

key-decisions:
  - "Use onInsertAfter(taskId, newTask) instead of onAdd for positional insertion"
  - "Position insert button inline in deps cell (not left row edge) for contextual UX"
  - "Green styling (#22c55e) to differentiate insert action from blue add dependency"
  - "Hover-reveal with opacity transition: 0.6 default, 1.0 on cell hover"

patterns-established:
  - "Inline-flex button pattern for secondary actions in cells"
  - "Callback flow: GanttChartProps → TaskListProps → TaskListRowProps"
  - "Functional updater with splice for correct array insertion"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-08
---

# Phase quick-65: Fix Insert Button Position and Insert After Summary

**Insert button moved to deps cell with onInsertAfter callback for proper task insertion after current task**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-08T13:22:00Z
- **Completed:** 2026-03-08T13:30:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `onInsertAfter?(taskId: string, newTask: Task)` callback throughout component hierarchy
- Moved insert button from left row edge to inline position in deps cell alongside chips
- Implemented proper insertion logic that places new task after specified task (not at end)
- Green styling differentiation for insert button vs blue add dependency button
- Hover-reveal behavior with smooth opacity transition

## Task Commits

Each task was committed atomically:

1. **Task 1: Add onInsertAfter callback to GanttChart and TaskList** - `0c1aa3f` (feat)
2. **Task 2: Move insert button to deps cell and implement onInsertAfter** - `7c38e98` (feat)
3. **Task 3: Implement consumer-side onInsertAfter handler in demo page** - `8a2bae1` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` - Added onInsertAfter to GanttChartProps and component
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` - Added onInsertAfter to TaskListProps and passed through
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - Removed old left-side button, added inline button in deps cell
- `packages/gantt-lib/src/components/TaskList/TaskList.css` - Removed .gantt-tl-row-insert, added .gantt-tl-dep-insert styles
- `packages/website/src/app/page.tsx` - Implemented handleInsertAfter with splice insertion logic

## Decisions Made

- **onInsertAfter signature:** Used `(taskId: string, newTask: Task)` instead of `(newTask, index)` to avoid stale index references
- **Button positioning:** Chose inline placement in deps cell over left row edge for contextual UX
- **Color differentiation:** Green (#22c55e) for insert vs blue (#3b82f6) for add dependency to prevent confusion
- **Hover behavior:** Opacity 0.6 by default, 1.0 on hover - consistent with existing chip pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed smoothly without blocking issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Insert button fully functional with proper insertion logic
- Callback flow complete from consumer to component
- Ready for testing and verification in browser
- No blockers or concerns

---
*Phase: quick-65*
*Completed: 2026-03-08*
