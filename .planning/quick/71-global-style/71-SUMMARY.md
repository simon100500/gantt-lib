---
phase: quick-71
plan: 01
subsystem: styling
tags: [css-variables, theming, border-radius]
dependency_graph:
  requires: []
  provides: [--gantt-container-border-radius]
  affects: [packages/gantt-lib/src/styles.css, packages/gantt-lib/src/components/GanttChart/GanttChart.css]
tech_stack:
  added: []
  patterns: [CSS custom properties with fallback values]
key_files:
  modified:
    - packages/gantt-lib/src/styles.css
    - packages/gantt-lib/src/components/GanttChart/GanttChart.css
decisions:
  - "Placed --gantt-container-border-radius in the Dimensions section of :root, consistent with other dimensional variables"
  - "Kept fallback value 10px in var() call for resilience if consumer overrides :root without inheriting the default"
metrics:
  duration: "< 1 min"
  completed: "2026-03-09"
---

# Phase quick-71 Plan 01: Global Style - Container Border Radius Summary

**One-liner:** Exposed `--gantt-container-border-radius` CSS variable (default 10px) so consumers can override `.gantt-container` corner rounding via CSS.

## What Was Done

Two targeted CSS edits following the existing `--gantt-*` variable pattern:

1. **`packages/gantt-lib/src/styles.css`** — Added `--gantt-container-border-radius: 10px` to the `:root` block in the Dimensions section, after `--gantt-day-width`.

2. **`packages/gantt-lib/src/components/GanttChart/GanttChart.css`** — Changed `.gantt-container` `border-radius` from hardcoded `10px` to `var(--gantt-container-border-radius, 10px)`.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add --gantt-container-border-radius variable | 06deec9 | styles.css, GanttChart.css |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `packages/gantt-lib/src/styles.css` line 14: `--gantt-container-border-radius: 10px;` — FOUND
- `packages/gantt-lib/src/components/GanttChart/GanttChart.css` line 6: `border-radius: var(--gantt-container-border-radius, 10px);` — FOUND
- No hardcoded `border-radius: 10px` remains in GanttChart.css — CONFIRMED
- Commit 06deec9 — FOUND
