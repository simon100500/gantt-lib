---
phase: 20-month-view
plan: 02
subsystem: components
tags: [week-view, TimeScaleHeader, GridBackground, geometry, viewMode]

# Dependency graph
requires:
  - "20-01: getWeekStartDays, getWeekSpans, WeekSpan from dateUtils.ts"
provides:
  - "TimeScaleHeaderProps.viewMode?: 'day' | 'week' — conditional rendering of week columns"
  - "GridBackgroundProps.viewMode?: 'day' | 'week' — conditional weekly lines, no weekend blocks"
  - "calculateWeekGridLines(dateRange, dayWidth) in geometry.ts — lines every 7 days with isMonthStart flag"
affects: [20-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional branch pattern: viewMode prop gates useMemo + JSX branches"
    - "arePropsEqual extended with new prop for React.memo correctness"

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/utils/geometry.ts
    - packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx
    - packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.css
    - packages/gantt-lib/src/components/GridBackground/GridBackground.tsx

key-decisions:
  - "calculateWeekGridLines skips x=0 (left border) and adds final right-edge line for correct SVG rendering"
  - "weekColumnWidth = dayWidth * 7 used consistently in both TimeScaleHeader and calculateWeekGridLines"
  - "arePropsEqual in GridBackground extended with viewMode comparison to prevent stale renders on mode switch"
  - "weekendBlocks returns [] in week-view (locked decision from RESEARCH.md — no weekend highlighting)"
  - "gantt-tsh-today and gantt-tsh-weekendDay classes applied only in day-view branch of TimeScaleHeader"

patterns-established:
  - "viewMode prop defaults to 'day' in both components — fully backward compatible"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 20 Plan 02: TimeScaleHeader + GridBackground Week-View Summary

**viewMode prop added to TimeScaleHeader and GridBackground — week-view renders 7-day columns with month/week lines only, day-view behavior unchanged**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-15T22:08:40Z
- **Completed:** 2026-03-16T
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `calculateWeekGridLines` exported from `geometry.ts`: produces one grid line per 7-day block boundary with `isMonthStart` flag for stronger month separator styling
- `TimeScaleHeader` extended with `viewMode?: 'day' | 'week'`:
  - Row 1 (week-view): month names span `weekSpans.weeks * weekColumnWidth` px
  - Row 2 (week-view): week-start day numbers (padded to 2 digits) in 7-day columns, with month boundary class but no `gantt-tsh-today` or `gantt-tsh-weekendDay`
  - Day-view: existing rendering unchanged
- `GridBackground` extended with `viewMode?: 'day' | 'week'`:
  - Week-view: renders `weekGridLines` using `gantt-gb-weekSeparator` / `gantt-gb-monthSeparator`; weekend blocks skipped
  - Day-view: existing rendering unchanged
  - `arePropsEqual` updated to compare `viewMode` preventing stale renders on mode switch
- `.gantt-tsh-weekCell` CSS class added for week-view bottom-row cells

## Task Commits

Each task was committed atomically:

1. **Task 1: calculateWeekGridLines + TimeScaleHeader week-view** - `3c977fe`
2. **Task 2: GridBackground week-view** - `2b5163b`

## Files Created/Modified

- `packages/gantt-lib/src/utils/geometry.ts` — Added `calculateWeekGridLines`
- `packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx` — Added `viewMode` prop, week-view conditional JSX
- `packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.css` — Added `.gantt-tsh-weekCell`
- `packages/gantt-lib/src/components/GridBackground/GridBackground.tsx` — Added `viewMode` prop, week-view grid lines, updated `arePropsEqual`

## Decisions Made

- `calculateWeekGridLines` skips the first line (x=0, left border) and appends a final right-edge line — consistent with `calculateGridLines` pattern
- `weekColumnWidth = dayWidth * 7` is derived at call sites (not stored in state) — keeps geometry pure
- `arePropsEqual` extended immediately when `viewMode` was added — prevents the React.memo stale-render bug documented in RESEARCH.md Pitfall 4
- Weekend blocks return `[]` in week-view — locked decision (RESEARCH.md): Gantt week-view does not highlight weekends

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures (out of scope, documented in 20-01-SUMMARY.md):
- 3 `isToday` tests fail due to timezone mismatch between test environment and UTC
- 4 `getMultiMonthDays` tests fail because implementation adds 2 months padding but tests expect no padding
These failures existed before this plan and were not introduced or changed by any changes in 20-02.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both components accept `viewMode` and are ready to be consumed by the parent `GanttChart` / `GanttBody` in Plan 20-03
- No blockers
