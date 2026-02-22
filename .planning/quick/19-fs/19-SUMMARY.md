---
phase: quick-19
plan: 01
subsystem: drag-interaction
tags: [constraint, resize, FS, useTaskDrag]
dependency_graph:
  requires: []
  provides: [FS left-edge resize constraint]
  affects: [useTaskDrag.ts]
tech_stack:
  added: []
  patterns: [clamp-then-recompute width for resize-left]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/hooks/useTaskDrag.ts
decisions:
  - "Recompute newWidth inside the same if-block after clamping newLeft so right edge stays fixed during resize-left"
  - "Condition broadened from mode==='move' to (mode==='move'||mode==='resize-left') — single-line change covers both interactions symmetrically"
metrics:
  duration: "~5 min"
  completed: "2026-02-22"
  tasks: 1
  files: 1
---

# Quick Task 19: FS Left-Edge Resize Constraint Summary

## One-liner

Applied FS predecessor start-date boundary clamp to resize-left drag mode, keeping bar width consistent after clamping.

## What Was Done

Extended the hard-mode FS constraint in `handleGlobalMouseMove` (in `useTaskDrag.ts`) so that dragging the left edge of an FS child task leftward is blocked at the predecessor's start date, consistent with the existing move-mode constraint.

### Change Detail

**Before (line 205):**
```ts
if (mode === 'move' && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
```

**After:**
```ts
if ((mode === 'move' || mode === 'resize-left') && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
```

Immediately after the clamp (`newLeft = Math.max(minAllowedLeft, newLeft)`), a `newWidth` recomputation was added for the `resize-left` branch:

```ts
if (mode === 'resize-left') {
  const rightEdge = globalActiveDrag.initialLeft + globalActiveDrag.initialWidth;
  newWidth = Math.max(globalActiveDrag.dayWidth, rightEdge - newLeft);
}
```

This ensures the right edge stays fixed while the left edge is clamped, producing a correct bar width.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript build (`npm run build` in `packages/gantt-lib`) passes with no errors.
- ESM and CJS bundles rebuilt successfully.
- DTS declarations generated without type errors.

## Self-Check: PASSED

- Modified file: `packages/gantt-lib/src/hooks/useTaskDrag.ts` — confirmed present.
- Commit `af6261e` — confirmed in git log.
