---
phase: 21-custom-weekend-calendar
plan: 01
subsystem: testing
tags: [vitest, tdd, utc-date-handling, weekend-calendar]

# Dependency graph
requires:
  - phase: 20-month-view
    provides: dateUtils.ts UTC pattern, vitest test framework
provides:
  - Failing tests for createDateKey utility (4 tests)
  - Failing tests for createIsWeekendPredicate utility (7 tests)
  - Test infrastructure for custom weekend calendar feature
affects: [21-02, 21-03, 21-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED phase: failing tests before implementation
    - UTC-safe date key generation for Set-based lookups
    - Predicate factory pattern for weekend logic

key-files:
  created:
    - packages/gantt-lib/src/__tests__/createDateKey.test.ts
    - packages/gantt-lib/src/__tests__/createIsWeekendPredicate.test.ts
  modified: []

key-decisions:
  - Test-first approach (TDD) for utility functions
  - Separate test files for each utility (createDateKey, createIsWeekendPredicate)
  - Using vitest pattern: describe() + it() for test structure
  - Test coverage for all requirements CAL-01 to CAL-05

patterns-established:
  - TDD RED phase: create failing tests before implementation
  - UTC-only date operations in tests (getUTC* methods)
  - Test structure: describe() for grouping, it() for individual cases
  - WeekendConfig interface for type-safe config objects

requirements-completed: []

# Metrics
duration: 1min
completed: 2026-03-17T21:48:00Z
---

# Phase 21 Plan 01: Custom Weekend Calendar Test Stubs Summary

**TDD RED phase complete: 11 failing tests for createDateKey and createIsWeekendPredicate utilities documenting expected behavior**

## Performance

- **Duration:** 1 min (52 seconds)
- **Started:** 2026-03-17T21:47:36Z
- **Completed:** 2026-03-17T21:48:26Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- **Test infrastructure ready for Wave 0 implementation:** Created comprehensive failing tests that document expected API for `createDateKey` and `createIsWeekendPredicate` utilities
- **UTC-safe test coverage:** All tests use UTC date methods (getUTCFullYear, getUTCMonth, getUTCDate) to prevent timezone bugs
- **Requirements coverage:** Tests cover all CAL-01 to CAL-05 requirements (weekends[], isWeekend predicate, precedence rules, default behavior)
- **Vitest pattern consistency:** Tests follow existing project patterns from dateUtils.test.ts (describe/it structure, expect assertions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Создать тесты для createDateKey utility** - `cf15ebf` (test)
2. **Task 2: Создать тесты для createIsWeekendPredicate utility** - `4e36c4f` (test)

**Plan metadata:** TBD (docs: complete plan)

_Note: TDD RED phase complete. Next plans will implement utilities (GREEN phase)._

## Files Created/Modified

### Created

- `packages/gantt-lib/src/__tests__/createDateKey.test.ts` - 4 tests for date key generation utility
  - Tests YYYY-M-D format generation
  - Tests UTC method usage (not local time)
  - Tests key consistency for same date
  - Tests key uniqueness for different dates

- `packages/gantt-lib/src/__tests__/createIsWeekendPredicate.test.ts` - 7 tests for weekend predicate factory
  - Tests default Saturday/Sunday behavior
  - Tests custom weekends addition (weekends[] prop)
  - Tests weekend exclusion (workdays[] prop)
  - Tests workdays precedence over weekends
  - Tests custom predicate usage (isWeekend prop - highest priority)
  - Tests empty arrays fallback to default
  - Tests multi-month boundary handling

### Modified

- None (test files only, no implementation yet)

## Decisions Made

- **Test file structure:** Separate test files for each utility (not one large file) - better organization and faster test runs
- **Test pattern:** Using `describe()` + `it()` (not `test()`) to match existing dateUtils.test.ts pattern in project
- **Import structure:** Tests import from `../utils/dateUtils` (where utilities will be implemented in next plan)
- **WeekendConfig interface:** Defined inline in test file (will be moved to dateUtils.ts during implementation)
- **Test data:** Using March 2026 dates (Saturday = 15th, Sunday = 16th) for realistic calendar scenarios

## Deviations from Plan

None - plan executed exactly as written. All tasks completed as specified in TDD RED phase.

## Issues Encountered

None - test creation proceeded smoothly. All tests failing as expected (utilities not yet implemented).

## User Setup Required

None - no external service configuration required. Tests run locally with vitest.

## Verification

All tests verified as failing (RED phase):

```bash
# createDateKey tests: 4 failed (expected - function not implemented)
npm test -- createDateKey.test.ts -- --run

# createIsWeekendPredicate tests: 7 failed (expected - function not implemented)
npm test -- createIsWeekendPredicate.test.ts -- --run

# Total: 11 failing tests ✓
```

Error message for all tests: `(0, <functionName>) is not a function` - confirms utilities not yet implemented.

## Next Phase Readiness

**Ready for Plan 21-02 (TDD GREEN phase):**
- Test infrastructure complete and verified
- Expected API fully documented through failing tests
- Clear implementation guidance from test assertions
- All CAL-01 to CAL-05 requirements covered

**No blockers or concerns.**

---
*Phase: 21-custom-weekend-calendar*
*Plan: 01*
*Completed: 2026-03-17*
*Wave: 0 (TDD RED)*
