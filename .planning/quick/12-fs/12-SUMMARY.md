---
phase: quick-12-fs
plan: 12
subsystem: drag-constraints
tags: [drag, constraints, dependencies, FS, negative-lag, clamp]
dependency_graph:
  requires: []
  provides: [disableConstraints-prop, boundary-clamp-on-drag]
  affects: [useTaskDrag, GanttChart, TaskRow, page-demo]
tech_stack:
  added: []
  patterns: [constraint-clamping, prop-threading]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/hooks/useTaskDrag.ts
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
    - packages/website/src/app/page.tsx
decisions:
  - "Clamp to boundary rather than revert to initialLeft: smooth stop instead of snap-back"
  - "disableConstraints threaded as prop through GanttChart -> TaskRow -> useTaskDrag"
  - "blockConstraints state default true (constraints active by default)"
metrics:
  duration: "~8 minutes"
  completed: "2026-02-21"
  tasks: 2
  files: 4
---

# Quick Task 12: Fix FS Negative-Lag Drag Constraint Snap-Back Summary

**One-liner:** Constraint-blocked drag now clamps to the dependency boundary instead of snapping back to drag-start, plus `disableConstraints` prop wired through GanttChart with a demo page toggle.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Fix constraint clamp — stop at boundary instead of reverting | 2b9ff3b | useTaskDrag.ts |
| 2 | Add FS negative-lag test task + constraint toggle | 62e2cb2 | GanttChart.tsx, TaskRow.tsx, page.tsx |

## What Was Built

### Task 1 — Constraint Clamp Fix (useTaskDrag.ts)

**Problem:** When a child task with `FS + negative lag` was dragged leftward past the constraint boundary, the handler reverted the bar to `globalActiveDrag.initialLeft` (drag-start position), causing an abrupt visual snap-back on every blocked frame.

**Fix:** Replaced the revert-to-initialLeft approach with a clamp-to-boundary approach:
- When `!validation.allowed`, iterate `currentTask.dependencies` to compute the tightest allowed left pixel position from all constraining predecessors
- Uses `calculateSuccessorDate()` (already imported) to compute the expected date per dep type and lag
- Converts expected date to pixel offset relative to `monthStart`
- Handles both start-constrained (FS/SS) and end-constrained (FF/SF) link types
- Clamps `newLeft = Math.max(minAllowedLeft, newLeft)` — bar stops smoothly at boundary

**disableConstraints flag:**
- Added `disableConstraints?: boolean` to `ActiveDragState` interface
- Added `disableConstraints?: boolean` to `UseTaskDragOptions` interface
- Guards constraint check: `if (mode === 'move' && allTasks.length > 0 && !globalActiveDrag.disableConstraints)`
- Passed to `globalActiveDrag` in `handleMouseDown`

### Task 2 — Demo Page Toggle + Prop Threading

**GanttChart.tsx:**
- Added `disableConstraints?: boolean` to `GanttChartProps`
- Destructures `disableConstraints` in component function
- Passes `disableConstraints={disableConstraints ?? false}` to each `<TaskRow>`

**TaskRow.tsx:**
- Added `disableConstraints?: boolean` to `TaskRowProps`
- Destructures from props and passes to `useTaskDrag({ ..., disableConstraints })`

**page.tsx:**
- Added `const [blockConstraints, setBlockConstraints] = useState(true)` state
- Added `task-fs-parent` (Feb 17–20) and `task-fs-child` (Feb 18–21, FS lag=-3) test tasks
- Added checkbox toggle: "Block constraints during drag" above the dependency chart
- Passes `disableConstraints={!blockConstraints}` to dependency `<GanttChart>`
  - `blockConstraints=true` (checked) → `disableConstraints=false` → constraints active
  - `blockConstraints=false` (unchecked) → `disableConstraints=true` → free drag

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run build` succeeded with no TypeScript errors (CJS + ESM + DTS all clean)
- Full monorepo build (gantt-lib + website Next.js) passed in 11.8s
- `disableConstraints` prop flows: `GanttChartProps` → `GanttChart.tsx` → `TaskRow.tsx` → `useTaskDrag.ts`

## Self-Check: PASSED

Files exist:
- packages/gantt-lib/src/hooks/useTaskDrag.ts — modified
- packages/gantt-lib/src/components/GanttChart/GanttChart.tsx — modified
- packages/gantt-lib/src/components/TaskRow/TaskRow.tsx — modified
- packages/website/src/app/page.tsx — modified

Commits exist:
- 2b9ff3b: fix(quick-12): clamp drag to constraint boundary instead of reverting to initialLeft
- 62e2cb2: feat(quick-12): add disableConstraints prop and FS negative-lag test toggle
