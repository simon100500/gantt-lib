---
phase: quick-021
plan: 01
subsystem: dependency-visualization
tags: [lag-display, svg-labels, dependency-lines]
dependency_graph:
  requires: []
  provides: [lag-value-visualization]
  affects: [dependency-lines-rendering]
tech_stack:
  added: []
  patterns: [conditional-svg-rendering, css-variable-inheritance]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
decisions: []
metrics:
  duration: 3 minutes
  completed_date: 2026-02-22
---

# Quick Task 021-01: Add lag number display to dependency connection lines

**One-liner:** Lag number labels rendered as SVG text elements below dependency arrows, hidden when lag=0 to avoid visual clutter

## Summary

Added lag number display to dependency connection lines in the Gantt chart. Lag values are now visible directly on the diagram as small text labels positioned below the horizontal segment of each dependency line, eliminating the need to inspect task properties to see lag values.

### Implementation Details

**Task 1: Lag label SVG rendering**
- Extended the `lines` array type to include `lag`, `fromX`, `toX`, and `fromY` properties
- Modified the `lines` useMemo to capture lag value from `edge.lag` (already available from `getAllDependencyEdges`)
- Added conditional SVG `<text>` element rendering: only when `lag !== 0`
- Positioned labels at horizontal midpoint: `(fromX + toX) / 2`
- Y position: `fromY + 4` (4px below the horizontal line)
- Text format: `lag > 0 ? "+${lag}" : "${lag}"` (shows "+" prefix for positive values)
- Inherited dependency line color: gray for normal, red for cycle dependencies (via CSS variable)

**Task 2: Lag label CSS styling**
- Added `.gantt-dependency-lag-label` class with:
  - `font-size: 10px` - small, unobtrusive text
  - `font-weight: 500` - medium weight for readability
  - `pointer-events: none` - clicks pass through to task bars
  - `user-select: none` - text not selectable
  - `opacity: 0.85` - slightly subtle, not distracting

### Deviations from Plan

None - plan executed exactly as written.

### Verification

- Build completed without errors
- Lag labels render only when lag !== 0
- Labels positioned at horizontal segment midpoint, 4px below the line
- Positive lag shows "+" prefix, negative lag shows "-" sign
- Labels inherit dependency line color (gray/red based on cycle status)
- Human verification approved

### Files Modified

1. `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx`
   - Extended `lines` type to include `lag`, `fromX`, `toX`, `fromY`
   - Added conditional SVG text element for lag labels
   - Used `React.Fragment` to render path and text together

2. `packages/gantt-lib/src/components/DependencyLines/DependencyLines.css`
   - Added `.gantt-dependency-lag-label` class with 10px font, 500 weight
   - Set `pointer-events: none` and `user-select: none`
   - Set `opacity: 0.85` for subtle appearance

### Commits

- `f9cf439`: feat(quick-021): add lag label SVG rendering in DependencyLines
- `66f488d`: style(quick-021): add lag label CSS styling
