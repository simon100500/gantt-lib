---
phase: quick-260316-j1w
plan: "01"
subsystem: ui/datepicker
tags: [datepicker, keyboard-input, ux, tasklistrow]
key-files:
  modified:
    - packages/gantt-lib/src/components/ui/DatePicker.tsx
    - packages/gantt-lib/src/components/ui/ui.css
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
decisions:
  - "Autofocus via setTimeout(50ms) to allow popover animation to complete before focusing input"
  - "Removed printable-key auto-edit from handleRowKeyDown entirely; F2 and double-click remain as edit triggers"
  - "stopPropagation on all handled keys in DatePicker input to prevent event bubbling to row handler"
metrics:
  duration: "15 min"
  completed: "2026-03-16"
  tasks_completed: 2
  files_modified: 3
---

# Phase quick-260316-j1w Plan 01: DatePicker keyboard input + TaskListRow key capture fix Summary

**One-liner:** Segmented keyboard date input (dd.MM.yy) added to DatePicker popover with autofocus; printable-key auto-edit removed from TaskListRow to prevent conflicts.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Add inline date input to DatePicker with autofocus | 1b13d45 | Done |
| 2 | Remove printable key capture from TaskListRow | ec42129 | Done |

## What Was Built

### Task 1: DatePicker inline date input

`DatePicker.tsx` now renders a `<input type="text">` field inside `PopoverContent`, above the `<Calendar>`. The field:
- Displays the selected date in `dd.MM.yy` format
- Receives automatic focus (via `useEffect` + `setTimeout(50ms)`) when the popover opens
- Supports segmented keyboard navigation: `ArrowLeft`/`ArrowRight` switches between day/month/year segments; `ArrowUp`/`ArrowDown` increments/decrements the current segment
- Digit input writes into the current character position with validation (e.g. month first digit > 1 rejected)
- `Escape` and `Enter` close the popover
- `stopPropagation()` called on all handled keys to prevent events bubbling to `TaskListRow.handleRowKeyDown`
- Calendar click still works and updates both the input field and the ISO value

CSS classes added to `ui.css`:
- `.gantt-datepicker-input-row` — padding + bottom border separator
- `.gantt-datepicker-date-input` — transparent borderless input with tabular numerics
- `.gantt-datepicker-date-input::selection` — blue highlight for selected segment

### Task 2: TaskListRow key capture

Removed the block from `handleRowKeyDown` that started name editing on any single printable keypress. Name editing now starts only via:
- `F2` key (keyboard)
- Double-click on the name cell (`handleNameDoubleClick`)
- Programmatic edit when a new task is created (`editingTaskId` flow — unaffected)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- packages/gantt-lib/src/components/ui/DatePicker.tsx — FOUND
- packages/gantt-lib/src/components/ui/ui.css — FOUND
- packages/gantt-lib/src/components/TaskList/TaskListRow.tsx — FOUND
- Commit 1b13d45 — FOUND
- Commit ec42129 — FOUND
