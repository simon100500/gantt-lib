---
phase: 20-month-view
plan: 03
subsystem: ui
tags: [week-view, GanttChart, viewMode, demo, switcher]

# Dependency graph
requires:
  - "20-02: TimeScaleHeader and GridBackground with viewMode prop support"
  - "20-01: WeekSpan, getWeekSpans, getWeekStartDays from dateUtils.ts"
provides:
  - "GanttChartProps.viewMode?: 'day' | 'week' — top-level prop connecting week-view system"
  - "GanttChart passes viewMode to TimeScaleHeader and GridBackground"
  - "Demo page day/week toggle with adaptive dayWidth"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "viewMode defaults to 'day' at the GanttChart boundary — single point of truth for mode selection"
    - "Adaptive dayWidth: 8px/day (week-view) vs original (day-view) for consistent visual density"

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/website/src/app/page.tsx

key-decisions:
  - "viewMode prop with default 'day' in GanttChartProps — fully backward-compatible, no breaking changes"
  - "dayWidth=8 in week-view on demo (8px/day = 56px/week), 24 in day-view — preserves visual proportions"
  - "TodayIndicator and useTaskDrag NOT modified — both operate in pixel/day space, viewMode has no effect on them"
  - "gridWidth formula (dateRange.length * dayWidth) unchanged — correct in both modes per RESEARCH.md Pitfall 3"

patterns-established:
  - "viewMode flows top-down: GanttChart -> TimeScaleHeader + GridBackground (no siblings or siblings below)"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 20 Plan 03: GanttChart viewMode Integration Summary

**viewMode prop wired through GanttChart to TimeScaleHeader and GridBackground, with day/week toggle on demo page using adaptive dayWidth**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-15T22:13:45Z
- **Completed:** 2026-03-15T22:16:13Z
- **Tasks:** 2 auto + 1 checkpoint (pending human verify)
- **Files modified:** 2

## Accomplishments

- `GanttChartProps` extended with `viewMode?: 'day' | 'week'` (default `'day'`) — zero breaking changes
- `viewMode` destructured with default and passed down to both `TimeScaleHeader` and `GridBackground`
- Demo page "Construction Project" section gets "По дням" / "По неделям" toggle buttons
- `dayWidth` adapts automatically: 8px/day in week-view, 24px/day in day-view
- WeekSpan is already exported via `export * from './utils'` — no index.ts changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: GanttChart viewMode prop + проброс в компоненты** - `616e8ee` (feat)
2. **Task 2: Демо-страница переключатель day/week** - `3751d5a` (feat)
3. **Task 3: Human verify** - pending checkpoint

## Files Created/Modified

- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — viewMode in interface, destructuring, TimeScaleHeader prop, GridBackground prop
- `packages/website/src/app/page.tsx` — viewMode state, toggle buttons, adaptive dayWidth, viewMode prop on first GanttChart

## Decisions Made

- Default `'day'` value set at GanttChart level (not in child components) — single source of truth
- `dayWidth=8` chosen for week-view demo: 8px/day × 7 = 56px/week column, gives ~7x compression vs day-view at 24px
- `WeekSpan` type already exported via `export * from './utils'` barrel — no additional export needed in `src/index.ts`
- TodayIndicator and useTaskDrag left unchanged per RESEARCH.md guidance (operate purely in pixel/day space)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures in `dateUtils.test.ts` (7 failures: isToday timezone mismatch + getMultiMonthDays padding mismatch). These are out-of-scope pre-existing issues documented in 20-01-SUMMARY.md and 20-02-SUMMARY.md. Not introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full week-view pipeline complete: dateUtils → geometry → TimeScaleHeader → GridBackground → GanttChart → demo page
- Pending: human visual verification of week-view rendering (Task 3 checkpoint)
- After approval: Phase 20 is complete

---
*Phase: 20-month-view*
*Completed: 2026-03-16*
