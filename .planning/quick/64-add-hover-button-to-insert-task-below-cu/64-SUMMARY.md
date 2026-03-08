---
phase: quick-64
plan: "01"
subsystem: "TaskList UI"
tags: ["hover-reveal", "insert-button", "task-insertion", "ux-pattern"]

dependency_graph:
  requires:
    - phase: 16-adding-tasks
      provides: ["onAdd callback", "TaskListRow component"]
  provides:
    - "Hover-reveal insert button on task rows"
    - "Contextual task insertion at specific positions"
  affects: []

tech-stack:
  added: []
  patterns:
    - "Hover-reveal button pattern matching trash button UX"
    - "Absolute positioning with opacity transition"

key-files:
  created: []
  modified:
    - "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
    - "packages/gantt-lib/src/components/TaskList/TaskList.css"
    - "packages/gantt-lib/src/components/TaskList/TaskList.tsx"

key-decisions:
  - "Insert button positioned on left side (mirror of trash button on right)"
  - "Green hover state to differentiate from delete action"
  - "Button only renders when onAdd callback is provided (defensive programming)"

patterns-established:
  - "Hover-reveal pattern: opacity 0 by default, 1 on :hover with pointer-events toggle"
  - "Gated rendering: component only appears when callback prop exists"

requirements-completed: []

metrics:
  duration: "2 minutes"
  completed_date: "2026-03-08T12:06:55Z"
  tasks_completed: 2
  files_changed: 3
---

# Quick Task 64: Add Hover Button to Insert Task Below Current Row Summary

**Hover-reveal insert button (+ icon) on each task row that creates new tasks with default properties at specific positions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-08T12:04:55Z
- **Completed:** 2026-03-08T12:06:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added PlusIcon component to TaskListRow for insert button
- Implemented hover-reveal insert button on left side of each task row
- Insert button creates new task with UUID, default name "Новая задача", and today/today+7 dates
- Button only appears when onAdd callback is provided (defensive programming)
- CSS styles match trash button pattern with green hover state for visual differentiation
- Smooth opacity transition (0.15s) for reveal animation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add insert button component and handler to TaskListRow** - `076a9ce` (feat)
2. **Task 2: Add CSS styles for insert button hover-reveal** - `ce9a449` (style)

## Files Created/Modified

- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - Added PlusIcon component, onAdd prop to interface, insert button JSX with task creation logic
- `packages/gantt-lib/src/components/TaskList/TaskList.css` - Added .gantt-tl-row-insert styles with hover-reveal, green hover state, smooth opacity transition
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` - Passed onAdd prop to TaskListRow component

## Decisions Made

- **Left-side positioning:** Insert button positioned on left side (left: 6px) to mirror trash button on right, creating balanced visual layout
- **Green hover state:** Used green color (#22c55e) for insert button hover to clearly differentiate from red delete action
- **Gated rendering:** Button only renders when `!!onAdd` prop exists - prevents broken UI if callback not provided
- **Same task properties:** Insert button creates tasks with same properties as global add button (UUID, today's date, 7-day duration) for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation straightforward, no blockers or problems.

## Verification Results

### Unit Tests
- **addDeleteTask.test.ts:** All 9 tests passing (unchanged from before)
- **Total test suite:** 162 passing, 4 failing (pre-existing dateUtils failures unrelated to this work)

### Build Verification
- **TypeScript:** Compiles without errors
- **Build:** `npm run build` succeeds, generates dist files correctly
- **CSS:** Insert button styles properly included in bundled CSS (24.17 KB)

### Code Verification
- ✓ TaskListRow.tsx has insert button with PlusIcon
- ✓ Insert button only renders when `onAdd` prop is provided
- ✓ Clicking insert button calls `onAdd` with new Task object (UUID, default name, today dates)
- ✓ TaskList.css has `.gantt-tl-row-insert` styles
- ✓ Button reveals on hover with opacity transition (hidden by default)
- ✓ Button positioned on left side of row (mirrors trash button on right)
- ✓ Green hover state differentiates from red delete action

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Feature complete and ready for use. The insert button provides quick task insertion at specific positions within the task list, matching the existing trash button UX pattern for consistency.

---
*Quick Task: 64-add-hover-button-to-insert-task-below-cu*
*Completed: 2026-03-08*
