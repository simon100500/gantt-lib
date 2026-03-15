---
phase: quick-099
plan: 99
subsystem: TaskList
tags: [ux, keyboard, selection, deselection, escape, outside-click]
dependency_graph:
  requires: []
  provides: [task-row-deselection-on-escape, task-row-deselection-on-outside-click]
  affects: [TaskList]
tech_stack:
  added: []
  patterns: [useEffect event listener with guard condition]
key_files:
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
decisions:
  - "Reused existing Escape/outside-click useEffect rather than creating a separate one to avoid duplicate event listener registration"
  - "Outside-click guard (overlayRef.contains + .gantt-popover check) already provides correct scope — clicking inside task list rows does not trigger deselection"
metrics:
  duration: "33s"
  completed: "2026-03-15"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase Quick-099 Plan 99: Escape/Outside-Click Task Deselection Summary

Extended the existing Escape and outside-click handler in TaskList to also clear the selected task row highlight via `onTaskSelect(null)`.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend Escape/outside-click handler to clear selectedTaskId | fc4a451 | TaskList.tsx |

## Changes Made

### TaskList.tsx (packages/gantt-lib/src/components/TaskList/TaskList.tsx)

The existing `useEffect` at line 230 already handled Escape and outside-click for `selectingPredecessorFor` and `selectedChip`. Extended it with four minimal changes:

1. **Early-return guard** — Added `&& !selectedTaskId` so the effect registers listeners when a task row is highlighted.
2. **handleKeyDown** — Added `onTaskSelect?.(null)` call on Escape.
3. **handleMouseDown** — Added `onTaskSelect?.(null)` call on outside-click (the existing `overlayRef.contains` and `.gantt-popover` guards ensure clicks inside the task list do NOT clear the selection).
4. **Dependency array** — Added `selectedTaskId` and `onTaskSelect` to the `useEffect` deps.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript build passes: CJS + ESM + DTS all succeed with no errors.
- Manual verification criteria (Escape clears highlight, outside click clears highlight, inside click does not clear) are covered by the logic: `overlayRef.current?.contains(target)` returns early when the click is inside the task list overlay.

## Self-Check

- [x] `packages/gantt-lib/src/components/TaskList/TaskList.tsx` — modified and committed
- [x] Commit fc4a451 exists
- [x] Build passed (CJS + ESM + DTS success)
