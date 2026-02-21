---
phase: 06-dependencies
plan: 02
title: "Dependency Lines Visualization Component"
subsystem: "dependency-rendering"
one-liner: "SVG-based dependency lines rendering with Bezier curve arrows and cycle detection visualization"
tags: ["dependencies", "svg", "bezier", "visualization", "rendering"]

requires:
  - REND-08

provides:
  - DependencyLines React component with SVG overlay rendering
  - Bezier curve path generation for dependency connections
  - Arrow markers for line endpoints (normal and cycle variants)
  - Circular dependency highlighting (red color)
  - CSS variables for line color customization
  - React.memo optimization to prevent unnecessary re-renders

affects:
  - Components directory extended with DependencyLines component
  - Main component exports updated
  - Global CSS variables added for dependency theming

tech-stack:
  added:
    - "SVG-based rendering for dependency lines"
    - "Cubic Bezier curves for smooth multi-row connections"
    - "Quadratic Bezier arcs for same-row connections"
    - "SVG marker definitions for arrow endpoints"
  patterns:
    - "'use client' directive for client-side component"
    - "React.memo for performance optimization"
    - "useMemo for expensive calculations"
    - "CSS Variables for theming"
    - "Absolute positioning overlay pattern (z-index: 5)"
    - "pointer-events: none for non-blocking overlay"

key-files:
  created:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      lines: 150
      exports: ["DependencyLines", "DependencyLinesProps"]
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.css"
      lines: 32
      contains: "gantt-dependencies-svg, gantt-dependency-path, gantt-dependency-cycle"
    - path: "packages/gantt-lib/src/components/DependencyLines/index.tsx"
      lines: 2
      exports: ["DependencyLines", "DependencyLinesProps"]
  modified:
    - path: "packages/gantt-lib/src/components/index.ts"
      added: ["DependencyLines export"]
      total_lines: 8
    - path: "packages/gantt-lib/src/styles.css"
      added: ["--gantt-dependency-line-color", "--gantt-dependency-cycle-color"]
      total_lines: 40

decisions: []

metrics:
  duration: "7 minutes"
  completed_date: "2026-02-21"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
  total_lines_added: 189
---

# Phase 06-dependencies Plan 02: Dependency Lines Visualization Component Summary

## Overview

Created SVG-based DependencyLines component that renders Bezier curve arrows between dependent tasks. The component provides visual representation of task dependencies with curved connector lines, arrow markers at endpoints, and special red highlighting for circular dependencies. The implementation follows existing component patterns including React.memo optimization, CSS variables for theming, and absolute positioning overlay pattern.

## Implementation Summary

### 1. DependencyLines Component (DependencyLines.tsx)

Created React functional component with the following features:

- **SVG Overlay Rendering**: Absolute-positioned SVG element (z-index: 5) that overlays the task grid
- **Task Position Calculation**: Uses useMemo to build a lookup map of task bar positions (left, right, centerY)
- **Dependency Edge Processing**: Leverages getAllDependencyEdges() utility to extract all predecessor-successor relationships
- **Bezier Curve Paths**: Uses calculateBezierPath() from geometry.ts for smooth curve generation
- **Cycle Detection**: Integrates detectCycles() utility to identify circular dependencies for red highlighting
- **Performance Optimization**: React.memo wrapper with useMemo for expensive calculations
- **Arrow Markers**: Dual SVG marker definitions (standard gray, cycle red) using marker-end attribute

Key implementation patterns:
- Client-side component with 'use client' directive
- Three separate useMemo hooks for positions, cycles, and lines (no unnecessary re-calculations)
- From right edge of predecessor (predecessor.right) to left edge of successor (successor.left)
- Graceful handling of missing task positions (continue on skip)
- displayName set for better React DevTools debugging

### 2. CSS Styling (DependencyLines.css)

Implemented SVG overlay styling with:

- **Absolute Positioning**: top: 0, left: 0, z-index: 5 for layering above grid but below UI elements
- **Pointer Events**: pointer-events: none allows clicks to pass through to task bars
- **CSS Variables**: var(--gantt-dependency-line-color) for neutral gray (#666666) default
- **Cycle Highlighting**: .gantt-dependency-cycle class uses var(--gantt-dependency-cycle-color) for red (#ef4444)
- **Stroke Styling**: stroke-width: 2, stroke-linecap: round, stroke-linejoin: round for clean appearance
- **Arrow Marker Styling**: Separate polygon fill colors for normal and cycle variants

### 3. Component Export (index.tsx)

Created barrel export following existing component pattern:
- Default export for DependencyLines component
- Named export for DependencyLinesProps interface

### 4. Main Export Integration

Updated two integration points:

**components/index.ts**: Added DependencyLines export in alphabetical position

**styles.css**: Added CSS variables to :root:
- --gantt-dependency-line-color: #666666 (neutral gray for standard lines)
- --gantt-dependency-cycle-color: #ef4444 (red for circular dependencies)

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- [x] DependencyLines component renders SVG overlay with Bezier curve paths
- [x] Arrow markers appear at line endpoints (standard and cycle variants)
- [x] Circular dependencies are highlighted in red color (#ef4444)
- [x] SVG layer has pointer-events: none to avoid blocking interactions
- [x] React.memo prevents unnecessary re-renders (default comparison sufficient for primitive props)
- [x] CSS variables allow customization of line colors (--gantt-dependency-line-color, --gantt-dependency-cycle-color)
- [x] Component is exported from gantt-lib package (via components/index.ts)
- [x] Zero breaking changes to existing API (new component only)

## Self-Check: PASSED

### Files Created
- FOUND: packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx (150 lines)
- FOUND: packages/gantt-lib/src/components/DependencyLines/DependencyLines.css (32 lines)
- FOUND: packages/gantt-lib/src/components/DependencyLines/index.tsx (2 lines)

### Files Modified
- FOUND: packages/gantt-lib/src/components/index.ts (added DependencyLines export)
- FOUND: packages/gantt-lib/src/styles.css (added dependency CSS variables)

### Commits
- FOUND: 455ee41 - feat(06-02): add DependencyLines SVG component with Bezier curves
- FOUND: b34fe15 - feat(06-02): export DependencyLines and add CSS variables

### Verification
- TypeScript compiles without errors in new files (pre-existing DragGuideLines export issue is out of scope)
- All existing tests pass (92 tests, 3 test files)
- Package builds successfully (dist/index.js, dist/index.mjs, dist/index.css generated)

---

*Execution time: 7 minutes*
*Phase: 06-dependencies, Plan: 02*
*Date: 2026-02-21*
