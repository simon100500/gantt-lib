---
phase: quick-055
plan: 01
subsystem: DependencyLines
tags: [popover, click-interaction, dependency-lines, russian-text, svg]
dependency_graph:
  requires: []
  provides: [dep-line-click-popover]
  affects: [DependencyLines]
tech_stack:
  added: []
  patterns: [useState-popover, svg-hit-area, document-mousedown-close]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
decisions:
  - "Invisible hit-area path (strokeWidth=12, transparent stroke) on same SVG path data for large click target"
  - "pointerEvents:none on visual paths/text, SVG root receives events, hit areas use pointerEvents:stroke"
  - "Fixed-position popover (not absolute) anchored to clientX/clientY from mouse event"
  - "useEffect document mousedown listener closes popover on click-outside; cleaned up when popover closes"
  - "IIFE pattern in JSX for popover to compute pred/succ names and description inline"
metrics:
  duration: ~5min
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-055 Plan 01: Dep Link Click Popover Summary

**One-liner:** Clickable SVG dependency lines with fixed-position popover showing lag-aware Russian description (e.g. "Сразу после окончания «Название»") via invisible 12px hit-area paths and document mousedown dismiss.

## What Was Built

Added click-to-popover functionality on Gantt dependency line arrows. Clicking any dependency line on the chart opens a floating popover showing:
- The successor task name (bold)
- A human-readable Russian description of the relationship with lag-aware wording

## Files Changed

### packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx

- Added `useState` for `clickedEdge` and `popoverPos`
- Added `pluralDays()` helper for correct Russian plural forms (день/дня/дней)
- Added `formatDepDescription()` for lag-aware Russian text for all 4 link types (FS/SS/FF/SF)
- Extended `lines` array items with `predecessorId`, `successorId`, `type` fields
- Added invisible hit-area `<path>` per line (strokeWidth=12, transparent, `pointerEvents: stroke`, cursor: pointer)
- Visual `<path>` and `<text>` elements now have `pointerEvents: none` inline
- Wrapped return in React Fragment to support sibling popover div
- Added popover `<div>` rendered outside SVG with fixed position at `clientX/clientY`
- Added `useEffect` with document `mousedown` listener for click-outside dismiss

### packages/gantt-lib/src/components/DependencyLines/DependencyLines.css

- Removed `pointer-events: none` from `.gantt-dependencies-svg` (SVG root now receives events)
- Added `.gantt-dep-popover`: fixed position, z-index 1000, white background, border, shadow, border-radius 6px, transform translate(12px, -50%)
- Added `.gantt-dep-popover-title`: bold, dark color, text ellipsis
- Added `.gantt-dep-popover-desc`: muted color for description
- Added `.gantt-dependency-hitarea`: cursor pointer class

## Russian Text Format

| Link Type | lag=0 | lag>0 | lag<0 |
|-----------|-------|-------|-------|
| FS | Сразу после окончания «X» | Через N дн после окончания «X» | За N дн до окончания «X» |
| SS | Одновременно с началом «X» | Через N дн после начала «X» | За N дн до начала «X» |
| FF | Одновременно с окончанием «X» | Через N дн после окончания «X» | За N дн до окончания «X» |
| SF | Одновременно с началом «X» | Через N дн после начала «X» | За N дн до начала «X» |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 47fda11 | feat(quick-055): add clickable hit-area paths and popover state to DependencyLines |
| Task 2 | 8c51913 | feat(quick-055): add popover CSS styles and remove SVG pointer-events:none |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] DependencyLines.tsx modified with hit-area paths and popover (47fda11)
- [x] DependencyLines.css modified with popover styles (8c51913)
- [x] Build passes with no TypeScript errors (CJS + ESM + DTS)
- [x] .gantt-dep-popover, .gantt-dep-popover-title, .gantt-dep-popover-desc all present in CSS
