---
phase: quick-58
plan: 01
subsystem: demo-shell, library-css
tags: [design, css, polish, demo]
dependency_graph:
  requires: []
  provides: [polished-demo-shell, refined-library-css]
  affects: [packages/website, packages/gantt-lib]
tech_stack:
  added: []
  patterns: [css-custom-properties, bem-like-css-classes, css-hover-states]
key_files:
  created: []
  modified:
    - packages/website/src/app/page.tsx
    - packages/website/src/app/globals.css
    - packages/gantt-lib/src/components/GanttChart/GanttChart.css
    - packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.css
    - packages/gantt-lib/src/components/TaskList/TaskList.css
    - packages/gantt-lib/src/components/TaskRow/TaskRow.css
decisions:
  - "Used CSS :hover pseudo-classes instead of onMouseEnter/onMouseLeave JS handlers for button hover states"
  - "Added :root { --gantt-task-bar-border-radius: 6px } in TaskRow.css so bars are rounded by default without breaking consumer overrides"
  - "demo-chart-card has overflow:hidden and no padding so GanttChart fills edge-to-edge inside the card border-radius"
metrics:
  duration: 12m
  completed: 2026-03-07
  tasks_completed: 2
  files_modified: 6
---

# Quick Task 58: Web Design Guidelines — Summary

**One-liner:** Demo page shell extracted to CSS class system with design tokens; library CSS refined for brand-blue consistency, rounded task bars, and polished table headers.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Redesign demo page shell | d0134a7 | globals.css design system, page.tsx inline styles -> CSS classes, hover JS removed |
| 2 | Polish library CSS | 571596b | blue today pill, soft weekends, uppercase headers, rounded bars, brand-blue hover, divider variable |

## What Was Built

### Task 1: Demo Page Shell

globals.css received a complete demo shell design system:
- CSS custom properties: `--demo-bg`, `--demo-max-width`, `--demo-section-gap`, `--demo-text-muted`, `--demo-border`
- `.demo-page`: max-width 1200px, centered, gray background
- `.demo-hero`: large bold heading, tagline, monospace install snippet in a styled `<code>` block
- `.demo-section`, `.demo-section-title`, `.demo-section-desc`: consistent section structure
- `.demo-controls`: flex toolbar for grouped buttons
- `.demo-chart-card`: border-radius 10px card wrapper with overflow hidden
- `.demo-btn` + variants: primary (blue), neutral (gray), danger (red), active (green), purple, muted
- `.demo-checkbox-label`, `.demo-hint`: form element helpers

page.tsx was refactored to use all new classes. All inline `style={{...}}` attributes removed from structural elements. All `onMouseEnter`/`onMouseLeave` hover JS handlers removed.

### Task 2: Library CSS Polish

- **GanttChart.css**: `.gantt-container` gains `border-radius: 10px; overflow: hidden;`
- **TimeScaleHeader.css**: Today cell changed from solid red `#dc2626` to blue pill `#3b82f6 border-radius:4px`. Weekend fallback softened from `#fee2e2` to `#fef3f2`. Weekend day label `#dc2626` -> `#ef4444`. Month cells get `text-transform: uppercase; letter-spacing: 0.04em;`
- **TaskList.css**: Header cells `color: #1f2937` -> `#6b7280` + `text-transform: uppercase; letter-spacing: 0.05em;`. Row hover `rgba(0,0,0,0.05)` -> `rgba(59,130,246,0.04)`. Dep chip and summary chip `border-radius: 4px` -> `6px`.
- **TaskRow.css**: Added `:root { --gantt-task-bar-border-radius: 6px }` default. Row hover updated to brand-blue tint. `externalTaskName` color `#00389f` -> `#2563eb`. `dateLabel` and `externalProgress` color `#666666` -> `#6b7280`. Divider `border-top: 1px solid #999` -> `var(--gantt-grid-line-color, #d1d5db)`. TaskBar hover `box-shadow` and `transition` uncommented.

## Verification

- `npm run build --workspace=packages/gantt-lib`: PASSED
- `npm run build --workspace=packages/website`: PASSED
- No inline style attributes remain on structural elements in page.tsx
- `--gantt-task-bar-border-radius` defaults to 6px via `:root`
- Today cell uses `#3b82f6` (blue), not `#dc2626` (red)
- TaskList header cells: uppercase + `#6b7280`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added .gantt-tr-externalProgress color update**
- **Found during:** Task 2
- **Issue:** Audit noted `dateLabel color #666666 → #6b7280` (both instances). The second instance was `.gantt-tr-externalProgress` which also uses `#666666`.
- **Fix:** Changed `.gantt-tr-externalProgress` color from `#666666` to `#6b7280` alongside `.gantt-tr-dateLabel`.
- **Files modified:** packages/gantt-lib/src/components/TaskRow/TaskRow.css
- **Commit:** 571596b

**2. [Rule 2 - Missing] Added .demo-btn-purple and .demo-btn-muted variants**
- **Found during:** Task 1
- **Issue:** page.tsx has a purple "Today" button (8b5cf6) and a muted gray button state for toggled-off states — neither mapped to the four variants specified in the plan (primary/neutral/danger/active).
- **Fix:** Added `.demo-btn-purple` and `.demo-btn-muted` variants to globals.css to cover all actual button states in the demo.
- **Files modified:** packages/website/src/app/globals.css
- **Commit:** d0134a7

## Self-Check: PASSED

All 6 modified files exist and both builds pass.
