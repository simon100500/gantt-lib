---
status: verifying
trigger: "drag-state-not-saving"
created: 2026-02-19T00:00:00.000Z
updated: 2026-02-19T00:00:00.000Z
---

## Current Focus
hypothesis: The page.tsx sample doesn't handle onChange callback, so updated tasks are never persisted to state
test: Trace data flow from useTaskDrag -> TaskRow.handleDragEnd -> GanttChart.onChange -> page.tsx
expecting: Find that page.tsx doesn't have state management or onChange handler
next_action: Verify page.tsx has no onChange handler and no state to persist changes

## Symptoms
expected: After dragging a task bar to a new position or resizing it, the task should remain in the new position when mouse is released
actual: The task reverts to its original position after releasing the mouse; changes during move/resize are not persisted
errors: None (console is clean)
reproduction: |
  1. Start dev server: npm run dev
  2. Open http://localhost:3000
  3. Drag a task bar to a new position
  4. Release mouse
  5. Task returns to original position instead of staying in new position
started: Issue appeared after implementing plan 02-02 (Move and Resize Interaction Handlers). Visual feedback works (tooltip, cursor, shadow) but state doesn't persist.

## Eliminated

## Evidence
- timestamp: 2026-02-19T00:00:00.000Z
  checked: useTaskDrag.ts (lines 186-232)
  found: Hook correctly calls onDragEnd callback with updated dates on mouseUp
  implication: Hook is working correctly - it notifies parent component

- timestamp: 2026-02-19T00:00:00.000Z
  checked: TaskRow.tsx (lines 62-70)
  found: handleDragEnd creates updatedTask and calls onChange?.(updatedTask)
  implication: TaskRow correctly notifies parent component via onChange prop

- timestamp: 2026-02-19T00:00:00.000Z
  checked: GanttChart.tsx (lines 103-109)
  found: GanttChart receives onChange from props, passes to TaskRow, creates updatedTasks array
  implication: GanttChart correctly propagates onChange callback to parent

- timestamp: 2026-02-19T00:00:00.000Z
  checked: page.tsx (lines 96-101)
  found: GanttChart is rendered WITHOUT onChange prop; tasks are defined as const
  implication: ROOT CAUSE - page.tsx doesn't handle onChange, so updates are lost. Tasks need to be stateful.

## Resolution
root_cause: The demo page (page.tsx) renders GanttChart without an onChange handler. The tasks are defined as a const array, not state. When useTaskDrag fires the onDragEnd callback, the change propagates up through TaskRow -> GanttChart, but since page.tsx doesn't provide an onChange handler and doesn't store tasks in state, the updates are lost and the component re-renders with the original static tasks array.
fix: Convert sampleTasks from const to useState, add onChange handler to GanttChart that updates the state
verification: |
  1. TypeScript compilation passes (npx tsc --noEmit)
  2. Dev server starts successfully on port 3001
  3. Fix converts sampleTasks from const to useState
  4. Added handleTasksChange callback that updates state
  5. Passed onChange prop to GanttChart component

  The fix ensures that when a user drags/resizes a task:
  - useTaskDrag fires onDragEnd with new dates
  - TaskRow.handleDragEnd calls onChange with updated task
  - GanttChart creates updatedTasks array and calls parent's onChange
  - page.tsx handleTasksChange updates the tasks state
  - Component re-renders with new task positions
files_changed:
  - src/app/page.tsx:
    * Added useState import from 'react'
    * Converted sampleTasks from const to useState initialization
    * Added handleTasksChange callback function
    * Passed onChange={handleTasksChange} to GanttChart
root_cause:
fix:
verification:
files_changed: []
