---
phase: quick-46
plan: "01"
subsystem: TaskList
tags: [deps-cell, overflow, chips, task-list-row]
dependency_graph:
  requires: []
  provides: [compact-deps-overflow-threshold]
  affects: [TaskListRow]
tech_stack:
  added: []
  patterns: [conditional-slice-overflow]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
decisions:
  - "Overflow threshold set to chips.length >= 3 so that rows with 3+ deps show only 1 chip inline and the rest in '+N ещё' popover"
metrics:
  duration: "19s"
  completed: "2026-03-03"
  tasks: 1
  files: 1
---

# Phase quick-46 Plan 01: Deps Cell Overflow Threshold Summary

**One-liner:** Changed visibleChips/hiddenChips slice logic so that 3+ deps shows 1 chip inline with "+N ещё" overflow instead of 2 chips.

## What Was Built

Updated the overflow threshold in `TaskListRow.tsx` so the deps cell stays compact:

- **Before:** `visibleChips = chips.slice(0, 2)` — showed 2 chips before overflow button appeared
- **After:** when `chips.length >= 3`, only `chips.slice(0, 1)` is visible inline; `chips.slice(1)` goes into the overflow popover

**Behavior by dep count:**

| Deps | visibleChips | hiddenChips | Result |
|------|-------------|-------------|--------|
| 1    | [0]         | []          | single chip, no overflow button |
| 2    | [0, 1]      | []          | two chips, no overflow button |
| 3    | [0]         | [1, 2]      | one chip + "+2 ещё" button |
| 4    | [0]         | [1, 2, 3]   | one chip + "+3 ещё" button |

The overflow Popover trigger text and Popover content (showing all chips) required no changes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Change overflow threshold from 2 to 1 visible chip when 3+ deps exist | 1cb7500 | TaskListRow.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - FOUND (modified)
- Commit `1cb7500` - FOUND
- Build: CJS + ESM + DTS all succeeded with no TypeScript errors
