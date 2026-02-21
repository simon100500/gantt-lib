---
phase: quick-11
plan: 01
subsystem: dependency-lines
tags: [svg, geometry, dependency-lines, arrowhead, orthogonal-path]
key-files:
  modified:
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
    - packages/gantt-lib/src/utils/geometry.ts
decisions:
  - "markerUnits=userSpaceOnUse with 8x6px dimensions gives consistent arrowhead size independent of stroke width"
  - "Inline fill attribute on polygon is more reliable cross-browser than CSS class cascade into SVG defs"
  - "Two-case path logic (S-curve vs detour) covers all predecessor/successor spatial relationships cleanly"
metrics:
  duration: "~5 min"
  completed: "2026-02-21"
  tasks: 2
  files: 2
---

# Quick Task 11: Fix DependencyLines Component — Huge Arrow Summary

Fixed DependencyLines SVG arrowheads (reduced from ~20px+ to 8x6px via markerUnits=userSpaceOnUse) and rewrote calculateOrthogonalPath so lines start exactly at the right edge of predecessor bars (not shifted leftward).

## What Was Built

### Task 1: Fix arrowhead marker size in DependencyLines.tsx

**File:** `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx`

**Problem:** The marker used default `markerUnits="strokeWidth"` with `markerWidth="10" markerHeight="7"`. Since stroke width is 2px, the rendered arrowhead was 10 * 2 = 20px wide — visually enormous.

**Fix:**
- Added `markerUnits="userSpaceOnUse"` so dimensions are in pixels, not multiples of stroke width
- Set `markerWidth="8" markerHeight="6"` for a small, proportional arrowhead
- Set `refX="7" refY="3"` so the arrowhead tip aligns with the path endpoint
- Added inline `fill` attribute on `<polygon>` elements for cross-browser color reliability
- Removed `className` props from `<marker>` elements (CSS cascade into SVG defs is unreliable)
- Updated `calculateOrthogonalPath` call site to use `curve=6, padding=14`

**Commit:** c4bf404

### Task 2: Rewrite calculateOrthogonalPath with correct geometry

**File:** `packages/gantt-lib/src/utils/geometry.ts`

**Problem:** The old implementation adapted frappe/gantt's `arrow.js` incorrectly. Frappe starts from the bar midpoint and shifts left to find a clean exit. We already pass the right edge as `from.x`, so the `while (toX < startX + padding) { startX -= 10 }` loop plus `startX -= 10` was incorrectly shifting the start point 10-60px to the LEFT of the right edge. Additionally, Case 2 (successor to the right) produced a diagonal `L` command instead of a proper orthogonal path.

**Fix:** Complete rewrite with two clean cases:

- **Case A** (`tx >= fx + padding * 2`): Simple S-curve — horizontal right to midpoint, arc, vertical to target row, arc, horizontal right to destination. Same-row straight line optimization.
- **Case B** (successor to the left or overlapping): Detour right by padding, vertical travel using midpoint between rows, horizontal left to near successor, then arrive. Same-row backward case loops above both tasks.

Key changes:
- Start is exactly `from.x` (no leftward shifting)
- End is exactly `to.x`
- All arcs use proper direction flags based on `goingDown` boolean
- Reduced default `curve` from 12px to 6px, `padding` from 20px to 14px

**Commit:** dd1b160

## Verification

- `npm run build` in `packages/gantt-lib` passes with no TypeScript errors (CJS + ESM + DTS all succeeded)
- Both marker definitions use `markerUnits="userSpaceOnUse"` with 8x6px dimensions
- Path function starts at `from.x` with no leftward adjustment

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx: modified and committed (c4bf404)
- packages/gantt-lib/src/utils/geometry.ts: modified and committed (dd1b160)
- TypeScript build: PASSED (no errors)
