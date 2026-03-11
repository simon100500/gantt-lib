---
status: awaiting_human_verify
trigger: "svg-connector-lines-not-recalculating"
created: 2026-03-11T00:00:00.000Z
updated: 2026-03-11T00:00:03.000Z
---

## Current Focus
hypothesis: Fix applied and build successful
test: User needs to test collapsing/expanding parent tasks with child dependencies in the demo
expecting: Lines should hide when tasks are collapsed and recalculate to correct positions when expanded
next_action: Wait for user verification

## Symptoms
expected: Lines should update to new positions and hide if fully collapsed when child tasks are collapsed/expanded
actual: Both issues - lines don't move at all and stay visible incorrectly when collapsing a parent task with child dependencies
errors: No error messages reported
reproduction: Collapse a parent task with child dependencies that have connector lines between tasks
started: Never worked correctly - this is a feature that has had this bug from the start

## Eliminated

## Evidence
- timestamp: 2026-03-11T00:00:01.000Z
  checked: DependencyLines.tsx (lines 64-87)
  found: Task positions are calculated using `tasks.forEach((task, index))` where index is used for rowTop calculation: `rowTop: index * rowHeight`
  implication: Row indices are based on the ALL tasks array, not the visible (filtered) tasks

- timestamp: 2026-03-11T00:00:01.000Z
  checked: GanttChart.tsx (lines 207-216)
  found: `filteredTasks` is created to hide children of collapsed parents, but DependencyLines still receives `tasks` prop (line 806)
  implication: DependencyLines renders lines for ALL tasks, not just visible ones

- timestamp: 2026-03-11T00:00:01.000Z
  checked: GanttChart.tsx (lines 825-851)
  found: TaskRow components render `filteredTasks.map((task, index))` where index is based on filtered array
  implication: Visual rows use filtered indices, but DependencyLines uses full tasks array indices

- timestamp: 2026-03-11T00:00:03.000Z
  checked: Build completed successfully
  found: No compilation errors, build passed
  implication: Fix is syntactically correct and ready for testing

## Resolution
root_cause: DependencyLines receives `tasks` prop (all tasks) instead of `filteredTasks` (only visible tasks). This causes row position calculations to use indices from the full array rather than the visible layout. When a parent is collapsed, child task rows disappear from the UI but DependencyLines still renders lines for them at their old positions (based on full array indices).
fix: Changed DependencyLines prop from `tasks` to `filteredTasks` in GanttChart.tsx line 806. Now only visible tasks are rendered and row indices match the visual layout.
verification: Build successful. Added test dependency to hierarchy demo for testing. User needs to verify by collapsing/expanding parent tasks with child dependencies.
files_changed: ["GanttChart.tsx", "page.tsx"]

## Symptoms
expected: Lines should update to new positions and hide if fully collapsed when child tasks are collapsed/expanded
actual: Both issues - lines don't move at all and stay visible incorrectly when collapsing a parent task with child dependencies
errors: No error messages reported
reproduction: Collapse a parent task with child dependencies that have connector lines between tasks
started: Never worked correctly - this is a feature that has had this bug from the start

## Eliminated

## Evidence
- timestamp: 2026-03-11T00:00:01.000Z
  checked: DependencyLines.tsx (lines 64-87)
  found: Task positions are calculated using `tasks.forEach((task, index))` where index is used for rowTop calculation: `rowTop: index * rowHeight`
  implication: Row indices are based on the ALL tasks array, not the visible (filtered) tasks

- timestamp: 2026-03-11T00:00:01.000Z
  checked: GanttChart.tsx (lines 207-216)
  found: `filteredTasks` is created to hide children of collapsed parents, but DependencyLines still receives `tasks` prop (line 806)
  implication: DependencyLines renders lines for ALL tasks, not just visible ones

- timestamp: 2026-03-11T00:00:01.000Z
  checked: GanttChart.tsx (lines 825-851)
  found: TaskRow components render `filteredTasks.map((task, index))` where index is based on filtered array
  implication: Visual rows use filtered indices, but DependencyLines uses full tasks array indices

## Resolution
root_cause: DependencyLines receives `tasks` prop (all tasks) instead of `filteredTasks` (only visible tasks). This causes row position calculations to use indices from the full array rather than the visible layout. When a parent is collapsed, child task rows disappear from the UI but DependencyLines still renders lines for them at their old positions (based on full array indices).
fix: Change DependencyLines prop from `tasks` to `filteredTasks` so only visible tasks are rendered and row indices match the visual layout.
verification: Test collapsing/expanding parent tasks with child dependencies - lines should hide when tasks are hidden and recalculate positions correctly when visible.
files_changed: ["GanttChart.tsx"]

## Symptoms
expected: Lines should update to new positions and hide if fully collapsed when child tasks are collapsed/expanded
actual: Both issues - lines don't move at all and stay visible incorrectly when collapsing a parent task with child dependencies
errors: No error messages reported
reproduction: Collapse a parent task with child dependencies that have connector lines between tasks
started: Never worked correctly - this is a feature that has had this bug from the start

## Eliminated

## Evidence

## Resolution
root_cause: []
fix: []
verification: []
files_changed: []
