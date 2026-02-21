---
phase: quick-015
plan: 01
subsystem: dependency-lines
tags: [real-time, drag, dependency-lines, animation, react-state]
dependency_graph:
  requires: [GanttChart.cascadeOverrides, useTaskDrag.onDragStateChange]
  provides: [DependencyLines.dragOverrides, real-time-line-redraw]
  affects: [GanttChart.tsx, DependencyLines.tsx]
tech_stack:
  added: []
  patterns: [per-task-inline-callback, merged-override-map, useMemo-dependency-chain]
key_files:
  modified:
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
decisions:
  - "Per-task inline onDragStateChange callbacks in tasks.map (safe: excluded from arePropsEqual comparison)"
  - "dependencyOverrides useMemo merges cascadeOverrides + draggedTaskOverride — new Map instance per change triggers React.memo re-render"
  - "dragOverrides optional prop — DependencyLines remains backward-compatible; absent = date-computed positions only"
  - "Override lookup in taskPositions useMemo, not lines useMemo — dependency chain is dragOverrides -> taskPositions -> lines"
metrics:
  duration: 85s
  completed_date: 2026-02-22
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 015: Redraw Dependency Lines on Drag Summary

**One-liner:** Real-time dependency line redraw during drag via merged pixel-override Map passed from GanttChart to DependencyLines each RAF.

## Objective

Make dependency lines redraw in real-time during drag, matching the task bar positions each animation frame. Previously, lines only updated after drag committed to state (mouseup).

## Tasks Completed

### Task 1: Track dragged task ID + pixel position in GanttChart and expose merged overrides

**File:** `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`

Changes:
- Added `draggedTaskOverride` state: `{ taskId: string; left: number; width: number } | null`
- Removed stable `handleDragStateChange` useCallback; replaced with per-task inline callbacks in `tasks.map` (safe because `onDragStateChange` is excluded from `arePropsEqual` comparison in TaskRow)
- Each inline callback sets both `dragGuideLines` (for guide lines) and `draggedTaskOverride` (for dependency lines) when dragging
- Added `dependencyOverrides` useMemo that merges `cascadeOverrides` + `draggedTaskOverride` into a single new Map per change
- Passed `dragOverrides={dependencyOverrides}` to `DependencyLines`

**Commit:** f530164

### Task 2: Use dragOverrides in DependencyLines for real-time line positions

**File:** `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx`

Changes:
- Added `dragOverrides?: Map<string, { left: number; width: number }>` to `DependencyLinesProps` interface
- Accepted `dragOverrides` in component destructuring
- Updated `taskPositions` useMemo: after computing `{ left, width }` from dates, checks `dragOverrides?.get(task.id)` and uses override when present
- Added `dragOverrides` to `taskPositions` useMemo dependency array
- React.memo re-renders correctly because `dependencyOverrides` produces a new Map reference each time it changes (shallow comparison detects reference change)

**Commit:** f530164

## Architecture

```
useTaskDrag.onProgress (each RAF)
  -> TaskRow.onDragStateChange callback (per-task inline)
    -> GanttChart: setDragGuideLines + setDraggedTaskOverride
      -> dependencyOverrides useMemo (new Map merge)
        -> DependencyLines dragOverrides prop (reference change -> memo re-render)
          -> taskPositions useMemo (override lookup -> new Map)
            -> lines useMemo (recomputes paths)
              -> SVG paths update
```

For cascade chain members:
```
useTaskDrag.onCascadeProgress (each RAF)
  -> GanttChart: setCascadeOverrides (new Map)
    -> dependencyOverrides useMemo merges cascadeOverrides + draggedTaskOverride
      -> DependencyLines dragOverrides (all chain members updated together)
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` modified
- [x] `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx` modified
- [x] Commit f530164 exists
- [x] TypeScript: only pre-existing errors remain (test file + DragGuideLines index export — both present before this task)

## Self-Check: PASSED
