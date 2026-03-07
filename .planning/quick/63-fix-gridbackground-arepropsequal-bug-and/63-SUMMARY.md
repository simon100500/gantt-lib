---
phase: quick-63
plan: 01
subsystem: GridBackground, GanttChart
tags: [bug-fix, performance, react-memo, cascade-drag, throttle]
dependency_graph:
  requires: []
  provides: [FIX-GRID-BG-MEMO, OPT-CASCADE-DRAG]
  affects: [GridBackground, GanttChart, cascade-drag-performance]
tech_stack:
  added: []
  patterns: [react-memo-arePropsEqual, raf-frame-throttle]
key_files:
  modified:
    - packages/gantt-lib/src/components/GridBackground/GridBackground.tsx
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
decisions:
  - "arePropsEqual must return true to SKIP re-render (same as shouldComponentUpdate returning false) — !== was backward"
  - "CASCADE_THROTTLE_FRAMES=3 chosen as good balance: ~67% render reduction at imperceptible ~50ms lag at 60fps"
  - "Empty map (overrides.size===0) always flushes + resets counter to guarantee clean state after drag end"
metrics:
  duration: "3 min"
  completed: "2026-03-08"
  tasks: 2
  files: 2
---

# Phase quick-63 Plan 01: Fix GridBackground arePropsEqual Bug and Throttle Cascade Drag Summary

**One-liner:** Fixed inverted `!==` to `===` in GridBackground memo comparison and throttled cascade setState to 1 update per 3 RAF frames for 67% fewer re-renders during cascade drag.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix GridBackground.arePropsEqual inverted condition | 611343a | GridBackground.tsx |
| 2 | Throttle cascadeOverrides setState to every 3 RAF frames | 85563ec | GanttChart.tsx |

## What Was Built

### Task 1: GridBackground arePropsEqual Bug Fix

The `arePropsEqual` function had an inverted boolean bug: it used `!==` for `totalHeight` comparison, which caused React.memo to:
- Skip re-render when `totalHeight` changed (rows added/removed) — WRONG
- Force re-render when `totalHeight` was unchanged — WRONG

Fix: changed `!==` to `===` so the function returns `true` (skip) only when all three props are identical. Also updated JSDoc comment to correctly describe the behavior.

### Task 2: Cascade Drag Throttle

Added `cascadeFrameCountRef` (useRef) and `CASCADE_THROTTLE_FRAMES = 3` constant after the `cascadeOverrides` useState declaration. Updated `handleCascadeProgress` to:

- When `overrides.size === 0` (drag end): always flush via `setCascadeOverrides(new Map())` and reset counter to 0
- Otherwise: increment counter, skip `setCascadeOverrides` unless `counter % 3 === 0`

Result: ~67% fewer GanttChart re-renders during cascade drag (1 setState per 3 RAF frames instead of every frame). At 60fps this means ~50ms update lag on chain task previews, which is imperceptible.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

Build passed with no TypeScript errors:
- `CJS Build success in 84ms`
- `ESM Build success in 84ms`
- `DTS Build success in 1304ms`

## Self-Check: PASSED

- `D:/Projects/gantt-lib/packages/gantt-lib/src/components/GridBackground/GridBackground.tsx` — modified, contains `===` on line 27
- `D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — modified, contains `cascadeFrameCountRef` and throttle logic
- Commit 611343a — FOUND
- Commit 85563ec — FOUND
