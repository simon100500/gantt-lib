---
phase: quick-054
plan: 01
subsystem: task-list
tags: [dep-chip, tooltip, ux, task-list]
dependency_graph:
  requires: []
  provides: [predecessor-name-tooltip-on-dep-chips]
  affects: [TaskListRow]
tech_stack:
  added: []
  patterns: [native-html-title-tooltip]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
decisions:
  - "Use native HTML title attribute on chip span for zero-dependency tooltip — no library needed, works in all browsers, consistent with existing title usage in the codebase"
  - "Fall back to dep.taskId when predecessor not found in allTasks map — ensures tooltip always shows something meaningful"
metrics:
  duration: "3 min"
  completed: "2026-03-03"
---

# Phase quick-054 Plan 01: Native Tooltip on Dep Chips Summary

**One-liner:** Native HTML title tooltip on dep chips showing predecessor task name via `taskById` lookup with `dep.taskId` fallback.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add predecessorName prop to DepChip and wire from TaskListRow chips | 2b74d38 | TaskListRow.tsx |

## What Was Built

Added a native browser tooltip to each dependency chip in the task list. When a user hovers over a dep chip, the browser displays the predecessor task's name as a tooltip.

**Changes made to `TaskListRow.tsx`:**

1. `DepChipProps` extended with `predecessorName?: string`
2. `DepChip` component destructures `predecessorName` from props
3. Inner chip `<span>` receives `title={predecessorName}` — triggers browser native tooltip
4. `chips` useMemo now returns `{ dep, lag, predecessorName: pred?.name ?? dep.taskId }` using existing `taskById` map
5. Both `<DepChip>` call sites updated:
   - Single-chip render: `predecessorName={chips[0].predecessorName}`
   - Popover list map: destructures `predecessorName` from chip object and passes it

## Verification

- TypeScript compiles with no errors in modified files (`TaskListRow.tsx` — zero TS errors)
- Pre-existing unrelated test errors in `useTaskDrag.test.ts` are out of scope
- Tooltip works for both single inline chip (1 dep) and chips inside the overflow popover (2+ deps)
- Fallback to `dep.taskId` ensures tooltip is always non-empty

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — modified and committed
- [x] Commit `2b74d38` exists: `feat(quick-054): add native tooltip to dep chips showing predecessor task name`
- [x] All success criteria met:
  - `DepChipProps` has `predecessorName?: string`
  - Chip `<span>` has `title={predecessorName}`
  - `chips` useMemo returns `predecessorName: pred?.name ?? dep.taskId`
  - Both DepChip call sites pass `predecessorName`
  - TypeScript compiles cleanly (no errors in modified file)
