---
phase: quick-50
plan: 50
subsystem: task-list
tags: [dep-chips, lag, ux]
dependency_graph:
  requires: []
  provides: [lag-display-in-dep-chips]
  affects: [TaskListRow]
tech_stack:
  added: []
  patterns: [lag-formatting]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
decisions:
  - "Render lag as '+N'/'-N' for non-zero values; empty string (icon-only) for zero or absent lag"
  - "Simplified chips useMemo: removed allTasks.findIndex entirely — lag comes directly from dep.lag"
metrics:
  duration: "1 min"
  completed: "2026-03-03"
  tasks: 1
  files: 1
---

# Phase quick-50 Plan 50: Dep Chips Show Lag Instead of Task ID Summary

**One-liner:** Dep chips now display lag as "+N"/"-N" (or icon-only when lag is 0/absent) instead of the predecessor task index number.

## What Was Changed

### DepChipProps interface
- Removed `taskNumber: number`
- Added `lag?: number`

### DepChip component
- Destructured `lag` instead of `taskNumber`
- Render expression changed from `{taskNumber}` to `{lag != null && lag !== 0 ? (lag > 0 ? \`+${lag}\` : \`${lag}\`) : ''}`
- Chips with lag=0 or no lag now show only the SVG icon

### chips useMemo (simplification)
- Removed `allTasks.findIndex` lookup — no longer needed
- Simplified from `{ dep, taskNumber: predecessorIndex + 1 }` to `{ dep }`
- Dependency array narrowed from `[task.dependencies, allTasks]` to `[task.dependencies]`

### Call sites
- Popover list: destructuring updated from `{ dep, taskNumber }` to `{ dep }`, prop changed to `lag={dep.lag}`
- Single chip: prop changed from `taskNumber={chips[0].taskNumber}` to `lag={chips[0].dep.lag}`

## Files Modified

| File | Change |
|------|--------|
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | DepChipProps, DepChip render, chips useMemo, both call sites |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 32a817e | feat(quick-50): replace taskNumber with lag in dep chips |

## Verification

TypeScript compiles with zero errors in TaskListRow.tsx. Pre-existing unrelated errors in test files and components/index.ts are unchanged.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- File modified: `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — FOUND
- Commit 32a817e — FOUND
- `DepChipProps.taskNumber` removed — confirmed
- `lag?: number` added — confirmed
- Both call sites updated — confirmed
