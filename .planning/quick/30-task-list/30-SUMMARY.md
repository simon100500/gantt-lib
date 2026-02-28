---
phase: quick-30
plan: 30
subsystem: task-list / ui
tags: [css, date-picker, alignment, click-target]
dependency_graph:
  requires: []
  provides: [centered-date-text, full-cell-click-target]
  affects: [TaskList date cells, DatePicker trigger]
tech_stack:
  added: []
  patterns: [CSS specificity override, flex centering]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/ui/ui.css
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - "Override .gantt-tl-cell padding in .gantt-tl-cell-date rather than removing it globally — targeted fix, no regression risk on other cell types"
  - "Use both text-align: center and justify-content: center on the trigger — text-align handles text node fallback, justify-content handles flex layout"
metrics:
  duration: "33 seconds"
  completed_date: "2026-02-28"
  tasks_completed: 1
  files_modified: 2
---

# Phase Quick-30 Plan 30: Date Cell Centering and Full-Cell Click Target Summary

**One-liner:** Centered date text in task list via `justify-content: center` on trigger button, full-cell clickability via `padding: 0` override on date cell.

## What Was Built

Two targeted CSS changes to improve the date cell UX in the task list:

1. `.gantt-datepicker-trigger` in `ui.css` — added `justify-content: center` and changed `text-align: left` to `text-align: center` so the date text is visually centered in the button.

2. `.gantt-tl-cell-date` in `TaskList.css` — added `padding: 0` to override the `padding: 0 0.5rem` inherited from `.gantt-tl-cell`. The trigger button already has `width: 100%; height: 100%`, but inherited padding was creating dead zones at the left and right edges where clicks would miss the button.

## Tasks Completed

| Task | Description | Commit | Files Modified |
|------|-------------|--------|----------------|
| 1 | Center date text and expand trigger to full cell | e6856fb | ui.css, TaskList.css |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `packages/gantt-lib/src/components/ui/ui.css` — modified, contains `justify-content: center`
- [x] `packages/gantt-lib/src/components/TaskList/TaskList.css` — modified, contains `padding: 0` on `.gantt-tl-cell-date`
- [x] Commit e6856fb exists
