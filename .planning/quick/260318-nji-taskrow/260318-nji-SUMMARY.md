---
phase: quick
plan: 260318-nji
subsystem: TaskRow
tags: [css, layout, flexbox, external-labels]
dependency_graph:
  requires: []
  provides: [consistent-external-label-offset]
  affects: [TaskRow]
tech_stack:
  added: []
  patterns: [flex gap for inter-item spacing]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskRow/TaskRow.css
decisions:
  - "Use container gap: 4px exclusively for inter-item spacing; margin-left: 8px on container for bar-edge offset"
metrics:
  duration: "5m"
  completed: "2026-03-18"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 260318-nji: Fix rightLabels margin inconsistency

**One-liner:** Removed redundant per-child margins from rightLabels flex children so external duration label offset from bar edge is consistent regardless of which labels are rendered.

## What Was Done

Fixed a 4px offset inconsistency in the external duration label positioning. The `.gantt-tr-rightLabels` flex container already had `gap: 4px` for spacing between children, but individual child elements also had their own `margin-left`/`margin-right` values causing double-spacing for the first item.

### Changes Made

| Selector | Before | After |
|---|---|---|
| `.gantt-tr-rightLabels` | `margin-left: 24px` | `margin-left: 8px` |
| `.gantt-tr-externalTaskName` | `margin-left: 4px` | _(removed)_ |
| `.gantt-tr-externalProgress` | `margin-right: 4px; margin-left: 4px` | _(both removed)_ |
| `.gantt-tr-externalDuration` | `margin-right: 4px` | _(removed)_ |

The `margin-left: 8px` on the container matches the bar's internal padding (`0.5rem = 8px`), creating a visually proportional offset from the bar's right edge. Inter-item spacing is now exclusively controlled by `gap: 4px`.

## Commits

| Task | Description | Commit |
|---|---|---|
| 1 | Clean up rightLabels flex child margins | 08be4e8 |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `packages/gantt-lib/src/components/TaskRow/TaskRow.css` modified
- [x] Commit 08be4e8 exists
- [x] TypeScript errors are pre-existing (TDD RED phase tests), unrelated to CSS changes
