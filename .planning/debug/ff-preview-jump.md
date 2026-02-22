---
slug: ff-preview-jump
status: investigating
created: 2025-02-22
phase: 09-ff-dependency
related_plans:
  - 09-03
---

# FF Preview Jump Bug

## Description
When dragging parent task (A) with FF successor (B), the child visually jumps to the parent's start position during live drag preview, but returns to correct position on mouse release.

## Observed Behavior
- **Broken**: Live preview (handleGlobalMouseMove cascade) — B jumps to A's start
- **Working**: Completion (handleComplete) — B positioned correctly

## Hypothesis
The cascade preview uses `overridePosition` computed from FS/SS logic (start-based), but FF needs end-based positioning. The preview likely:
1. Computes cascade positions based on task start dates
2. FF should shift based on end dates, not start dates
3. Need to check `handleGlobalMouseMove` cascade block and how `overridePosition` is applied

## Investigation Points
1. `handleGlobalMouseMove` cascade block (~line 327-400)
2. `cascadeChainEnd` usage in preview
3. `overridePosition` calculation for cascade tasks
4. Difference between preview positioning and completion positioning

## Status
Investigating...
