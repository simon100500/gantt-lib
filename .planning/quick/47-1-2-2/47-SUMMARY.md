---
phase: quick-047
plan: 01
subsystem: TaskList
tags: [deps-chips, popover, ux-simplification]
key-files:
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - "Controlled Popover (open/onOpenChange) keeps popover open after chip deletion"
  - "Direct onRemoveDependency call in popover trash button avoids stale selectedChip dependency"
  - "linkWord computed once outside JSX for Russian plural correctness (2-4 → связи, 5+ → связей)"
metrics:
  duration: "79 seconds"
  completed: "2026-03-03"
  tasks: 1
  files: 2
---

# Quick 47: Simplify Deps Chips — N-связей Summary Chip Summary

**One-liner:** Replaced visibleChips/hiddenChips split with 1-chip-inline vs 2+-chip-summary-popover pattern, with direct-delete trash buttons inside popover.

## What Was Done

Simplified the dependency chips display in `TaskListRow`:

- **1 dep:** Single chip shown directly in the deps cell. Click selects it (highlight), trash icon appears on selection and deletes via `handleDeleteSelected`.
- **2+ deps:** Only a gray "N связей" summary chip shown. Clicking opens a controlled Popover listing all deps. Each row in the popover has a direct trash button that calls `onRemoveDependency` immediately — no chip pre-selection required.

## Changes

### TaskListRow.tsx
- Removed `visibleChips`/`hiddenChips` split logic (was `chips.length >= 3 ? slice(0,1) : slice(0,2)`)
- Added `overflowOpen` state (`useState(false)`) for controlled Popover that stays open after deletions
- Added `linkWord` computed variable for correct Russian plural (≤4 → "связи", >4 → "связей")
- Replaced old overflow Popover JSX with new three-branch logic: `chips.length >= 2` → summary chip + popover, `chips.length === 1` → single chip with select/trash, `null` for zero chips
- Popover trash buttons call `onRemoveDependency?.(task.id, dep.taskId, dep.type)` and `onChipSelect?.(null)` directly

### TaskList.css
- Added `.gantt-tl-dep-summary-chip` class: gray background (`rgba(107,114,128,0.12)`), 1px border, 4px border-radius, blue hover state
- Existing `.gantt-tl-dep-overflow-trigger` retained (unused now but kept for safety)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` exists and updated
- [x] `packages/gantt-lib/src/components/TaskList/TaskList.css` exists and updated
- [x] Commit `24541e7` exists
- [x] TypeScript errors from modified files: none (pre-existing errors in unrelated test files and DragGuideLines component are out of scope)
