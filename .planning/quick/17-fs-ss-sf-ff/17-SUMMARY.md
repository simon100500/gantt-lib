---
phase: quick-17
plan: 01
subsystem: dependency-lines
tags: [svg, dependency-lines, link-types, geometry, SS, FF, SF, FS]
dependency_graph:
  requires: []
  provides: [type-aware-dependency-path-routing]
  affects: [DependencyLines, geometry]
tech_stack:
  added: []
  patterns: [type-aware-connection-points, arrivesFromRight-flag]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/utils/geometry.ts
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
decisions:
  - "calculateDependencyPath uses an arrivesFromRight boolean flag to branch path logic rather than four separate functions — keeps the routing logic unified and the call site clean"
  - "Existing calculateOrthogonalPath kept untouched — may be used elsewhere or in tests; new function is additive"
  - "orient=auto on SVG marker handles arrowhead rotation automatically — no need for a second reversed marker for FF/SF types"
  - "Line key includes edge.type (predecessorId-successorId-type) to ensure uniqueness and prevent stale React keys when link type changes"
metrics:
  duration: "~79 seconds"
  completed: "2026-02-22"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 17: SS/FF/SF Dependency Line Rendering Summary

**One-liner:** Type-aware SVG dependency path routing using `arrivesFromRight` flag so SS/FF/SF links connect from the correct bar edges with correct arrowhead orientation.

## What Was Done

Added visual rendering of all 4 dependency link types (SS, FF, SF, FS) in the `DependencyLines` SVG component. Previously all types incorrectly used the same `predecessor.right -> successor.left` connection points (FS-only behavior).

## Tasks Completed

### Task 1: Add `calculateDependencyPath` to geometry.ts (commit: 0181a1e)

Added a new exported function `calculateDependencyPath(from, to, arrivesFromRight)` at the bottom of `geometry.ts`:

- When `arrivesFromRight = false` (FS, SS): path exits horizontally, chamfers toward `to.x - dirX * C`, then descends/ascends vertically to arrive at the **left edge** of the successor — identical logic to the existing `calculateOrthogonalPath`
- When `arrivesFromRight = true` (FF, SF): path exits horizontally, chamfers toward `to.x + dirX * C` (overshoot), then descends/ascends vertically to arrive at the **right edge** of the successor — mirrored chamfer geometry

Both branches fall back to a sharp `H V` path when segments are too short for the chamfer.

The existing `calculateOrthogonalPath` is left intact (backward compatibility).

### Task 2: Update DependencyLines.tsx (commit: 133d8cc)

- Replaced the dual import `calculateTaskBar` + `calculateOrthogonalPath` with a single combined import including `calculateDependencyPath`
- Replaced fixed `predecessor.right / successor.left` connection points with type-aware selection:
  - `fromX`: `predecessor.left` for SS/SF, `predecessor.right` for FS/FF
  - `toX`: `successor.right` for FF/SF, `successor.left` for FS/SS
  - `arrivesFromRight`: `true` for FF/SF, `false` for FS/SS
- Line `id` now includes `edge.type` to prevent stale React keys: `${predecessorId}-${successorId}-${edge.type}`

## Verification

- `npx tsc --noEmit --project packages/gantt-lib/tsconfig.json` — only pre-existing errors in test files and unrelated DragGuideLines component; **zero new errors** in geometry.ts or DependencyLines.tsx
- `npm run build --workspace=packages/gantt-lib` — **build success** (ESM + CJS + DTS, 977ms)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/gantt-lib/src/utils/geometry.ts` — modified, `calculateDependencyPath` export present
- `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx` — modified, imports and type-aware logic in place
- Commit 0181a1e — exists
- Commit 133d8cc — exists
