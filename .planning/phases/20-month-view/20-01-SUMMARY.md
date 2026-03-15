---
phase: 20-month-view
plan: 01
subsystem: testing
tags: [vitest, dateUtils, week-view, typescript]

# Dependency graph
requires: []
provides:
  - "getWeekStartDays(days): returns first day of each 7-day block (days[0], days[7], days[14]...)"
  - "getWeekSpans(days): groups 7-day blocks by calendar month, returns WeekSpan[]"
  - "WeekSpan interface: { month: Date, weeks: number, startIndex: number }"
affects: [20-02, 20-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green cycle for utility functions]

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/utils/dateUtils.ts
    - packages/gantt-lib/src/__tests__/dateUtils.test.ts

key-decisions:
  - "getWeekStartDays uses days[0]-based blocks (not Monday-aligned) to match day-view grid columns"
  - "getWeekSpans groups by month of weekStart day, not by majority days in block"
  - "WeekSpan interface placed in dateUtils.ts alongside the function (not in types/index.ts)"

patterns-established:
  - "Week-view grouping: always based on 7-day fixed blocks starting from days[0]"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 20 Plan 01: Week-view Date Utilities Summary

**getWeekStartDays and getWeekSpans added to dateUtils.ts via TDD — 10 new tests all green**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-15T22:03:53Z
- **Completed:** 2026-03-15T22:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `getWeekStartDays(days)` implemented: returns days[0], days[7], days[14]... with partial last block included
- `getWeekSpans(days)` implemented: groups week-columns by calendar month, handles year boundary correctly
- `WeekSpan` interface exported from dateUtils.ts
- 10 new tests written (5 per function), all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: getWeekStartDays (TDD red+green)** - `d18b4a5` (test)
2. **Task 2: getWeekSpans + WeekSpan interface (TDD green)** - `df11830` (feat)

_Note: Task 1 RED and GREEN were committed together; Task 2 RED tests were included in Task 2 commit._

## Files Created/Modified
- `packages/gantt-lib/src/utils/dateUtils.ts` - Added getWeekStartDays, WeekSpan interface, getWeekSpans
- `packages/gantt-lib/src/__tests__/dateUtils.test.ts` - Added 10 tests for both new functions

## Decisions Made
- `getWeekStartDays` uses absolute index-based blocks (days[0], days[7]...) rather than calendar-week alignment, matching the existing day-view grid column pattern
- `WeekSpan` interface lives in `dateUtils.ts` next to the function it describes (not in `types/index.ts`) since it's tightly coupled to getWeekSpans
- Month assignment for each week-column uses the start day of the block (days[i]), not the majority or end day

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures (out of scope, logged to deferred-items.md):
- 3 `isToday` tests fail due to timezone mismatch between test environment and UTC
- 4 `getMultiMonthDays` tests fail because implementation adds 2 months padding but tests expect no padding
These failures existed before this plan and were not introduced by any changes in 20-01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `getWeekStartDays` and `getWeekSpans` are ready for use in Plan 20-02 (TimeScaleHeader week-view)
- `getWeekSpans` follows the same pattern as `getMonthSpans` — Plan 02 can use it directly
- No blockers

---
*Phase: 20-month-view*
*Completed: 2026-03-15*
