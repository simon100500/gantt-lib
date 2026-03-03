---
phase: 14-dependencies-edit-task-list
plan: "01"
subsystem: task-list-dependencies
tags: [dependencies, task-list, css, state-management, popover]
dependency_graph:
  requires: []
  provides:
    - gantt-tl-dep-* CSS classes
    - LINK_TYPE_LABELS constant
    - activeLinkType state
    - selectingPredecessorFor state
    - handleAddDependency with cycle detection
    - handleRemoveDependency
    - disableDependencyEditing prop on GanttChart and TaskList
  affects:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
tech_stack:
  added: []
  patterns:
    - Radix Popover for type switcher dropdown
    - useCallback/useState for dependency state management
    - validateDependencies for cycle detection before adding links
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.css
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
decisions:
  - Import TaskDependency from GanttChart (same import as Task) and LinkType from types/index.ts
  - Use &#9662; HTML entity for the down-triangle in the type switcher button (avoids raw special chars)
  - Extend TaskListRow props interface now to accept all new dependency props (Plan 02 builds the cell rendering)
  - Pre-existing TypeScript errors in useTaskDrag.test.ts and components/index.ts are out of scope
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-03"
  tasks_completed: 3
  files_modified: 4
---

# Phase 14 Plan 01: Dependencies Column Infrastructure Summary

Added the «Связи» column infrastructure: CSS classes, TaskList state, type switcher Popover in the column header, dependency add/remove callbacks with cycle detection, and the GanttChart prop that gates read-only mode.

## What Was Built

**CSS (TaskList.css):** 20 gantt-tl-dep-* class selectors covering all column UI: header cell (.gantt-tl-cell-deps), type trigger button, dropdown menu and options, dependency chips with hover-revealed remove button, overflow trigger and list, add (+) button, picker mode cursor states (gantt-tl-row-picking, gantt-tl-row-picking-self), and cycle error banner.

**GanttChart.tsx:** Added `disableDependencyEditing?: boolean` prop (default false) to GanttChartProps interface, destructured it, and forwarded it to TaskList. Follows the exact same pattern as `disableTaskNameEditing`.

**TaskList.tsx:** Full dependency state management layer:
- `LINK_TYPE_LABELS` (exported) and `LINK_TYPE_ORDER` constants mapping LinkType codes to Russian labels (ОН/НН/ОО/НО)
- `activeLinkType` state (default 'FS'), `selectingPredecessorFor`, `typeMenuOpen`, `cycleError` state
- `overlayRef` for outside-click cancel
- `useEffect` attaching Escape keydown and outside-click mousedown listeners when picker mode active
- `handleAddDependency`: self-link guard, duplicate guard, hypothetical validation via `validateDependencies`, 3-second cycleError flash on cycle detection, then `onTaskChange` call
- `handleRemoveDependency`: filters dependency out and calls `onTaskChange`
- Dependencies column header with Radix Popover type switcher showing active link type label
- All new props forwarded to TaskListRow

**TaskListRow.tsx:** Extended props interface with 8 new dependency-related props (disableDependencyEditing, allTasks, activeLinkType, selectingPredecessorFor, onSetSelectingPredecessorFor, onAddDependency, onRemoveDependency, linkTypeLabels). All destructured but not yet rendered — Plan 02 builds the dependency cell content.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: CSS classes | 9ec37fa | feat(14-01): add gantt-tl-dep-* CSS classes to TaskList.css |
| Task 2: GanttChart prop | 87c345f | feat(14-01): extend GanttChart with disableDependencyEditing prop |
| Task 3: TaskList state + header | 0e06ee4 | feat(14-01): extend TaskList with dependency state, callbacks, and column header |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Extended TaskListRow props interface**
- **Found during:** Task 3
- **Issue:** TaskList.tsx forwards 8 new props to TaskListRow but TaskListRow interface had no knowledge of them — TypeScript would error on the JSX call
- **Fix:** Extended TaskListRow props interface with all 8 new dependency props and updated component destructuring. Plan 02 builds the actual cell rendering.
- **Files modified:** packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
- **Commit:** 0e06ee4

### Out-of-scope Pre-existing Issues (Deferred)

Pre-existing TypeScript errors in `useTaskDrag.test.ts` (lines 716, 1070) and `components/index.ts` (named export issue) were present before this plan and are not caused by these changes. Logged but not fixed per scope rules.

## Self-Check: PASSED

- packages/gantt-lib/src/components/TaskList/TaskList.css exists with 20 gantt-tl-dep-* occurrences
- packages/gantt-lib/src/components/GanttChart/GanttChart.tsx has disableDependencyEditing in 3 locations
- packages/gantt-lib/src/components/TaskList/TaskList.tsx has all required state, callbacks, and header JSX
- packages/gantt-lib/src/components/TaskList/TaskListRow.tsx accepts all new props
- Commits 9ec37fa, 87c345f, 0e06ee4 all exist
- TypeScript compilation: no errors in modified files (pre-existing test errors out of scope)
