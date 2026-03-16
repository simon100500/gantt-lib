---
phase: 260316-m0r
plan: 01
subsystem: gantt-lib/view-modes
tags: [month-view, header, grid, demo]
dependency_graph:
  requires: []
  provides: [month-view-mode]
  affects: [TimeScaleHeader, GridBackground, GanttChart, page.tsx]
tech_stack:
  added: []
  patterns: [useMemo for view-mode branches, view-mode conditional rendering]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/utils/dateUtils.ts
    - packages/gantt-lib/src/utils/geometry.ts
    - packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx
    - packages/gantt-lib/src/components/GridBackground/GridBackground.tsx
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/website/src/app/page.tsx
decisions:
  - "getMonthBlocks delegates to existing getMonthSpans to avoid duplication"
  - "Year boundary (1 Jan) renders as thick line (gantt-gb-monthSeparator), month boundary as thin (gantt-gb-weekSeparator)"
  - "Month labels suppressed for blocks < 15 days (cropped edge months)"
metrics:
  duration: ~10 min
  completed: 2026-03-16
  tasks_completed: 3
  files_modified: 6
---

# Phase 260316-m0r Plan 01: Month View Mode Summary

**One-liner:** Month view mode with two-row header (year / abbreviated month) and month/year grid lines, no weekend blocks, dayWidth=4 on demo.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Утилиты dateUtils + geometry | 27d6621 | dateUtils.ts, geometry.ts |
| 2 | TimeScaleHeader + GridBackground + GanttChart | c26518f | TimeScaleHeader.tsx, GridBackground.tsx, GanttChart.tsx |
| 3 | Демо-кнопка "По месяцам" | f947d01 | page.tsx |

## What Was Built

### dateUtils.ts
- `MonthBlock` interface: `{ startDate: Date; days: number }`
- `getMonthBlocks(days)` — delegates to `getMonthSpans`, maps to `MonthBlock` format
- `YearSpan` interface: `{ year: Date; days: number; startIndex: number }`
- `getYearSpans(days)` — groups `MonthBlock` array by UTC year

### geometry.ts
- `calculateMonthGridLines(dateRange, dayWidth)` — returns lines only on 1st of each month; `isMonthStart=true` for 1 January (year boundary → thick CSS class)

### TimeScaleHeader.tsx
- `viewMode` extended to `'day' | 'week' | 'month'`
- Row 1 in month mode: year labels (`yearSpans`) using `gantt-tsh-monthCell`
- Row 2 in month mode: abbreviated month names (`block.startDate.toLocaleString('en', { month: 'short' })`), hidden if block < 15 days
- `monthGridTemplate` useMemo for variable-width columns

### GridBackground.tsx
- `viewMode` extended to `'day' | 'week' | 'month'`
- `monthGridLines` useMemo active only in month mode
- Weekend blocks disabled in month mode (same as week mode)
- Month grid lines: `gantt-gb-monthSeparator` for year boundaries, `gantt-gb-weekSeparator` for month boundaries

### GanttChart.tsx
- `viewMode` prop type extended to `'day' | 'week' | 'month'` (JSDoc updated)

### page.tsx (website)
- `viewMode` state type extended to `'day' | 'week' | 'month'`
- Button "По месяцам" added after "По неделям" with identical styling pattern
- `dayWidth` logic: `month=4, week=8, day=24`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript: no new errors (pre-existing errors in test files unchanged)
- Build: `npm run build --workspace=packages/gantt-lib` — success (ESM + CJS + DTS)
- All `viewMode` prop types updated across the component chain

## Self-Check: PASSED

Files exist:
- packages/gantt-lib/src/utils/dateUtils.ts — modified
- packages/gantt-lib/src/utils/geometry.ts — modified
- packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx — modified
- packages/gantt-lib/src/components/GridBackground/GridBackground.tsx — modified
- packages/gantt-lib/src/components/GanttChart/GanttChart.tsx — modified
- packages/website/src/app/page.tsx — modified

Commits: 27d6621, c26518f, f947d01 — all present in git log.
