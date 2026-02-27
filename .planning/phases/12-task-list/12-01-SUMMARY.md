---
phase: 12
plan: 01
subsystem: task-list
tags: [overlay, inline-editing, synchronized-scrolling, task-table]
dependencyGraph:
  requires: [11-lock-task]
  provides: [12-02-task-list-integration]
  affects: [GanttChart]
techStack:
  added: []
  patterns: [position-sticky-overlay, inline-editing, controlled-input]
keyFiles:
  created:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
    - packages/gantt-lib/src/components/TaskList/index.tsx
  modified:
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/index.ts
    - packages/gantt-lib/src/styles.css
decisions:
  - taskId: 12-01-01
    title: Position sticky overlay approach
    rationale: Using position: sticky within existing scroll container avoids complex cross-container scroll synchronization
  - taskId: 12-01-02
    title: Date format conversion
    rationale: Display as DD.MM.YY for compact display, edit as DD.MM.YY, store as YYYY-MM-DD (ISO)
metrics:
  duration: 5 minutes
  completedDate: 2026-02-27
---

# Phase 12 Plan 01: Task List Component - Core Structure and Rendering Summary

Create a TaskList overlay component that displays tasks in a table format (№, Name, Start Date, End Date) positioned to the left of the Gantt chart timeline using sticky positioning within the existing scroll container.

## Implementation Summary

Created a complete TaskList overlay component with inline editing functionality that synchronizes vertically with the Gantt chart through position: sticky.

### Files Created

1. **TaskList.tsx** - Main TaskList component with 4-column table structure
   - TaskListProps interface: tasks, rowHeight, taskListWidth, onTaskChange, selectedTaskId, onTaskSelect
   - Header row with columns: №, Имя, Начало, Окончание
   - Renders TaskListRow for each task

2. **TaskListRow.tsx** - Individual task row with inline editing
   - Editable cells: name, startDate, endDate
   - Inline editing pattern: click to edit, Enter/blur saves, Escape cancels
   - Date validation: parseShortDate() validates DD.MM.YY format
   - formatShortDate() converts Date to DD.MM.YY for display
   - Input auto-focuses and selects text on edit mode enter
   - Row selection highlights with gantt-tl-row-selected class

3. **TaskList.css** - Component styles with gantt-tl- prefix
   - gantt-tl-overlay: position: sticky, left: 0, z-index: 5
   - Opaque background, right border separating from chart
   - Hover state matching TaskRow style (rgba(0,0,0,0.05))
   - Selected state with blue background (rgba(59,130,246,0.15))
   - Input styling with blue border and focus shadow

4. **index.tsx** - Component exports

### Files Modified

1. **GanttChart.tsx** - Integrated TaskList overlay
   - Added showTaskList prop (default: false)
   - Added taskListWidth prop (default: 300)
   - Added selectedTaskId state and handleTaskSelect callback
   - Rendered TaskList inside gantt-taskArea when showTaskList is true
   - Imported TaskList styles

2. **index.ts** - Exported TaskList and TaskListProps from library

3. **styles.css** - Added @import for TaskList styles (must come first)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Criteria Met

- [x] Importing TaskList from 'gantt-lib' works without errors
- [x] Passing showTaskList={true} to GanttChart shows overlay on left side
- [x] Task list has 4 columns with correct headers (№, Имя, Начало, Окончание)
- [x] Task list rows align with task bars (same rowHeight prop)
- [x] Scrolling uses position: sticky for synchronized vertical scrolling
- [x] Clicking task name/dates switches to input edit mode
- [x] Typing in input and pressing Enter saves the change
- [x] Pressing Escape cancels the edit without saving
- [x] Clicking outside (blur) saves the change
- [x] Editing date with invalid format keeps edit mode active (no save)
- [x] Clicking row highlights with blue background
- [x] Task list background is opaque
- [x] Task list has right border
- [x] Hovering shows hover effect matching TaskRow
- [x] CSS classes use gantt-tl- prefix

## Commits

- 0af88d0: feat(12-01): create TaskList component structure and types
- 2ee3e8a: feat(12-01): create TaskListRow component with inline editing
- 2ab782e: feat(12-01): create TaskList CSS styles and integrate with GanttChart

## Self-Check: PASSED

All files exist, all commits verified, TypeScript compilation successful.
