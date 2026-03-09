---
phase: quick-70
plan: "01"
subsystem: TaskList
tags: [keyboard-shortcuts, inline-edit, UX]
dependency_graph:
  requires: []
  provides: [F2-edit-shortcut]
  affects: [TaskListRow]
tech_stack:
  added: []
  patterns: [useCallback-dependency-array]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
decisions:
  - "Reuse 'keypress' editTriggerRef value for F2 to get cursor-at-end behavior without new code paths"
metrics:
  duration: "39s"
  completed: "2026-03-09"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Quick Task 70: F2 Edit Shortcut Summary

**One-liner:** F2 keyboard shortcut to enter inline task name edit with cursor at end, reusing existing keypress trigger path.

## What Was Built

Added an F2 branch to `handleRowKeyDown` in `TaskListRow.tsx` that enters task name edit mode while preserving the full existing task name and positioning the cursor at the end of the text.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add F2 key handler to TaskListRow handleRowKeyDown | e5de47b | TaskListRow.tsx |

## Implementation Details

The F2 branch was inserted BEFORE the printable-key branch in `handleRowKeyDown`:

- Sets `editTriggerRef.current = 'keypress'` — this reuses the existing `useEffect` logic that places cursor at end (`setSelectionRange(len, len)`) rather than selecting all text
- Sets `nameValue = task.name` to preserve the full existing task name (unlike the printable-key branch which replaces with the typed character)
- Returns early to prevent falling through to the printable-key branch
- Guards: `!editingName` (no-op if already editing) and `!disableTaskNameEditing` (respects editing lock)
- Added `task.name` to the `useCallback` dependency array since it's now read in the F2 branch

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] File modified: `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`
- [x] Commit exists: e5de47b
- [x] `e.key === 'F2'` present in file
- [x] `task.name` in dependency array
