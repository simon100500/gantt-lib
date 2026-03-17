---
phase: quick-260317-lge
plan: "01"
subsystem: TaskList/Hierarchy
tags: [hierarchy, visual, bug-fix]
dependency_graph:
  requires: []
  provides: [HIERARCHY-LINES]
  affects: [TaskList]
tech_stack:
  added: []
  patterns: [ancestorContinuesMap traversal]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
decisions:
  - Keep slice(0,-1) as per plan analysis — task's own continuation is handled by HierarchyConnectorIcon
metrics:
  duration: "~5 min"
  completed: "2026-03-17T12:32:26Z"
  tasks_completed: 1
  files_changed: 1
---

# Phase quick-260317-lge Plan 01: Hierarchy Lines Fix Summary

**One-liner:** Fixed `ancestorContinuesMap` to check `current.id` instead of `current.parentId`, making vertical continuation lines render correctly at all nesting depths.

## What Was Done

The `ancestorContinuesMap` in `TaskList.tsx` was computing wrong continuation data for deep nesting (2+ levels). The walk up the ancestor chain used `current.parentId` to look up in `lastChildIds`, but it should check `current.id` — because the question at each step is "does THIS ancestor continue (is it not the last child of its parent)?", not "does this ancestor's parent continue?".

**The bug:** `continues.unshift(!lastChildIds.has(current.parentId))` — wrong ID.

**The fix:** `continues.unshift(!lastChildIds.has(current.id))` — correct ID.

The `.slice(0, -1)` was kept as-is. After the fix, the array contains one entry per ancestor from outermost to innermost, plus one for the task itself. Slicing off the last entry (task's own status) leaves exactly the ancestors' continuation data, which drives the vertical lines in `TaskListRow.tsx`. The task's own connector is rendered by `HierarchyConnectorIcon` via the `isLastChild` prop.

**Why `isChild` check covers parent-children:** `isChild = task.parentId !== undefined`, so mid-level tasks (both parent and child) already have `isChild = true` and their ancestor continuation lines were already rendered. Only the wrong data was the problem.

## Changes

| File | Change |
|------|--------|
| `packages/gantt-lib/src/components/TaskList/TaskList.tsx` | Change `current.parentId` to `current.id` in `ancestorContinuesMap` loop; update comment |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Fix ancestorContinuesMap | `79b3893` | fix(quick-260317-lge): fix ancestorContinuesMap to check current.id not current.parentId |

## Deviations from Plan

None - plan executed exactly as written. The plan's detailed analysis was correct: only the single line change in `ancestorContinuesMap` was needed, `.slice(0, -1)` was kept, and no changes to `TaskListRow.tsx` or `TaskList.css` were required.

## Self-Check: PASSED

- [x] `packages/gantt-lib/src/components/TaskList/TaskList.tsx` modified correctly
- [x] Build succeeds (CJS + ESM + DTS all clean)
- [x] Commit `79b3893` exists
