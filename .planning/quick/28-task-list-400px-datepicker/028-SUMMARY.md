---
phase: quick-028
plan: 28
subsystem: TaskList
tags: [task-list, datepicker, css, ux]
dependency_graph:
  requires: []
  provides: [TaskList 400px default width, native date picker cells, text-wrapping name column]
  affects: [TaskList.tsx, TaskListRow.tsx, TaskList.css]
tech_stack:
  added: []
  patterns: [native input[type=date] with ISO round-trip, minHeight for expandable rows, CSS text-wrap for name column]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - Native input[type=date] value is ISO YYYY-MM-DD matching task.startDate/endDate directly — no conversion needed
  - minHeight replaces height on rows so wrapped name text is not clipped
  - gantt-tl-input-date CSS class added for smaller font date inputs distinct from text inputs
  - string | Date union handled inline with instanceof check before setEditValue
metrics:
  duration: 102 seconds
  completed_date: "2026-02-27"
  tasks_completed: 1
  files_modified: 3
---

# Quick Task 028: TaskList 400px + Date Picker Summary

**One-liner:** TaskList default width widened to 400px, name cells now wrap long text, date cells use native input[type=date] with ISO YYYY-MM-DD round-trip.

## What Was Built

Three coordinated improvements to the TaskList overlay component:

1. **Wider default (400px):** Changed `taskListWidth` default from 300 to 400 in both the JSDoc comment and the destructured prop default in `TaskList.tsx`.

2. **Text wrapping for task names:** In `TaskList.css`, removed `text-overflow: ellipsis` and `white-space: nowrap` from the `.gantt-tl-cell` base rule (kept only `overflow: hidden`). Added `white-space: normal` and `word-break: break-word` to `.gantt-tl-cell-name`. Row changed from `height` to `minHeight` in `TaskListRow.tsx` so the row expands when names wrap. Cell base changed to `align-items: flex-start` with `padding-top: 6px` so all cells align to top.

3. **Native date picker:** In `TaskListRow.tsx`, replaced `<input type="text">` with `<input type="date">` for start/end date edit fields. `handleCellClick` now sets `editValue` to the ISO date string directly (no `formatShortDate` conversion). `handleSave` uses `editValue` directly as the ISO date (no `parseShortDate` needed). Added `autoFocus` and `className="gantt-tl-input-date"`. Added `.gantt-tl-input-date` and `.gantt-tl-input-date:focus` CSS rules for styled picker. Date column width increased from 70px to 90px to accommodate the native picker.

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Widen default, enable text wrap, add datepicker | Complete | 9c4ff04 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed string | Date union type for date edit value**
- **Found during:** Task 1 TypeScript DTS build
- **Issue:** `task.startDate` and `task.endDate` are typed as `string | Date`. Directly calling `setEditValue(task.startDate)` produced TS2345 error: "Argument of type 'string | Date' is not assignable to SetStateAction<string>".
- **Fix:** Added `instanceof Date` check in `handleCellClick` to normalize Date objects to ISO string via `.toISOString().split('T')[0]` before setting edit value.
- **Files modified:** `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`
- **Commit:** 9c4ff04 (included in same commit)

## Self-Check: PASSED

All modified files confirmed present. Commit 9c4ff04 verified in git log. TypeScript build succeeds with no errors.
