---
phase: quick-260316-wyw
plan: "01"
subsystem: TaskList / DepChip
tags: [dependency, popover, lag-editing, ux]
dependency_graph:
  requires: []
  provides: [dep-chip-popover-lag-edit]
  affects: [TaskListRow, TaskList.css]
tech_stack:
  added: []
  patterns: [Radix Popover, calculateSuccessorDate date-shift]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - "Keep existing chip selection state (selectedChip) alongside new popoverOpen state so dependency line highlight still works"
  - "Use onTasksChange directly without universalCascade — GanttChart cascade engine propagates downstream automatically"
  - "Delete button inside popover only shown when disableDependencyEditing=false (consistent with existing behavior)"
metrics:
  duration: "~5 min"
  completed: "2026-03-16"
  tasks_completed: 1
  files_modified: 2
---

# Phase quick-260316-wyw Plan 01: Dependency Edit Popup Summary

**One-liner:** Interactive Radix Popover on dep chips with lag counter (+/- buttons) that shift successor task dates and delete button inside popover.

## What Was Built

Replaced the native `title` tooltip on dependency chips with a Radix Popover that shows:
- Action verb + lag counter row: "Начать [сразу] после окончания" (lag=0) or "Начать через [-][N][+] дн. после окончания" (lag>0)
- Predecessor task name
- "Удалить связь" button (moved from external chip wrapper into popover)

Clicking +/- calls `handleLagChange` which uses `calculateSuccessorDate` to compute new dates and calls `onTasksChange` with the shifted task. The existing cascade engine in GanttChart then propagates downstream changes automatically.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Convert DepChip to Popover with lag counter | 8984f1e | TaskListRow.tsx, TaskList.css |

## Checkpoint Pending

Task 2 is a human-verify checkpoint — awaiting visual verification of the popover in the demo app.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — modified (DepChip uses Popover)
- `packages/gantt-lib/src/components/TaskList/TaskList.css` — modified (dep-edit-popover CSS added)
- Commit 8984f1e exists in git log
