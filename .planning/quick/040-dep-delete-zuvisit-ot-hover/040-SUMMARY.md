---
phase: quick-040
plan: 01
subsystem: TaskList
tags: [dependency-editing, UX, CSS, hover]
key-files:
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - "CSS hover text swap via two child spans (default + hover) with :hover parent selector — no JS state needed"
  - "Full-replacement branch uses ternary in JSX deps cell — keeps single conditional for the cell, easy to reason about"
  - "Removed dead .gantt-tl-dep-delete-selected CSS rules (old red button class no longer rendered)"
metrics:
  duration: "3 min"
  completed: "2026-03-03"
  tasks: 1
  files: 2
---

# Phase quick-040 Plan 01: Predecessor Deps Cell Full-Replacement with Hover Text Swap Summary

**One-liner:** Predecessor row Связи cell replaced by full-width "Зависит от [name]" button when chip selected, hover swaps text to red "Удалить" via CSS span toggle.

## What Was Built

When a chip is selected on a successor row, the predecessor row's Связи cell now shows a single full-width button instead of that row's own chips and + button. The button displays "Зависит от [successor name]" by default. On hover, CSS hides the default span and shows a red "Удалить" span. Clicking deletes the dependency (same `handleDeleteSelected` handler as before) and clears `selectedChip`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace predecessor deps cell content + CSS hover text swap | 93e8377 | TaskListRow.tsx, TaskList.css |

## Implementation Details

### TaskListRow.tsx

Added `successorTaskName` useMemo that looks up the successor task's `name` from `allTasks` using `selectedChip.successorId`. Returns empty string when `selectedChip` is null.

The deps cell JSX was restructured as a ternary:
- `isSelectedPredecessor && !disableDependencyEditing` → render `<button className="gantt-tl-dep-delete-label">` with two child spans
- else → render the existing chips/overflow/+ button content in a fragment

The old separate `{isSelectedPredecessor && !disableDependencyEditing && (<button ... Удалить</button>)}` block was removed — superseded by the new branch.

### TaskList.css

Removed `.gantt-tl-dep-delete-selected` and `.gantt-tl-dep-delete-selected:hover` rules (dead CSS from old red button).

Added four new rules:
- `.gantt-tl-dep-delete-label` — full-width button, transparent background, pointer cursor
- `.gantt-tl-dep-delete-label-hover` — hidden by default, red color, bold
- `.gantt-tl-dep-delete-label:hover .gantt-tl-dep-delete-label-default` — hides default text on hover
- `.gantt-tl-dep-delete-label:hover .gantt-tl-dep-delete-label-hover` — shows "Удалить" on hover

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files exist:
- packages/gantt-lib/src/components/TaskList/TaskListRow.tsx: FOUND
- packages/gantt-lib/src/components/TaskList/TaskList.css: FOUND

Commits exist:
- 93e8377: FOUND

TypeScript: Pre-existing errors in `useTaskDrag.test.ts` and `components/index.ts` unchanged. No new errors introduced by this change.

## Self-Check: PASSED
