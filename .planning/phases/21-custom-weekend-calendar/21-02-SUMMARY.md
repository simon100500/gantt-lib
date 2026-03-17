---
phase: 21-custom-weekend-calendar
plan: 02
subsystem: testing
tags: [vitest, tdd, utc-date-handling, weekend-calendar, set-based-lookup]

# Dependency graph
requires:
  - phase: 21-custom-weekend-calendar
    plan: 01
    provides: Failing tests for createDateKey and createIsWeekendPredicate utilities
provides:
  - Implemented createDateKey utility with UTC-safe date key generation
  - Implemented createIsWeekendPredicate utility with precedence rules
  - Modified calculateWeekendBlocks to support custom weekend predicate
  - All 11 tests passing (TDD GREEN phase complete)
affects: [21-03, 21-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD GREEN phase: implement utilities to pass failing tests
    - Set-based lookup for O(1) date comparisons via createDateKey
    - Predicate factory pattern for flexible weekend logic
    - Optional parameter pattern for backward compatibility

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/utils/dateUtils.ts (createDateKey, createIsWeekendPredicate, WeekendConfig)
    - packages/gantt-lib/src/utils/geometry.ts (calculateWeekendBlocks with isCustomWeekend parameter)

key-decisions:
  - UTC-only date operations (getUTCFullYear, getUTCMonth, getUTCDate) to prevent timezone bugs
  - Set-based lookup for weekend/workday arrays (O(1) vs O(n) for Array.includes)
  - Precedence order: isWeekend > workdays > weekends > default (Saturday/Sunday)
  - Backward compatibility for calculateWeekendBlocks (optional isCustomWeekend parameter)
  - Predicate factory pattern over direct array passing (more flexible for future extensions)

patterns-established:
  - TDD workflow: RED (21-01) → GREEN (21-02) → REFACTOR (if needed)
  - Date key format: "YYYY-M-D" using UTC components (not "YYYY-MM-DD")
  - Predicate factory: function returning (date: Date) => boolean
  - Optional parameter pattern for extending existing functions without breaking changes

requirements-completed: [CAL-01, CAL-02, CAL-04, CAL-05]

# Metrics
duration: 1min
completed: 2026-03-17T21:54:08Z
---

# Phase 21 Plan 02: Custom Weekend Calendar Utilities Implementation Summary

**UTC-safe date key generation, Set-based weekend predicate factory with precedence rules, and backward-compatible calculateWeekendBlocks extension**

## Performance

- **Duration:** 1 min (54 seconds)
- **Started:** 2026-03-17T21:53:16Z
- **Completed:** 2026-03-17T21:54:08Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- **TDD GREEN phase complete:** All 11 failing tests from plan 21-01 now passing
- **createDateKey utility:** UTC-safe date key generation for Set-based lookups (O(1) performance)
- **createIsWeekendPredicate utility:** Flexible weekend predicate factory with 4-level precedence (isWeekend > workdays > weekends > default)
- **calculateWeekendBlocks extension:** Optional isCustomWeekend parameter with backward compatibility maintained
- **All existing tests passing:** 40 geometry tests, 256 total tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Реализовать createDateKey utility** - `dff94b1` (feat)
2. **Task 2: Реализовать createIsWeekendPredicate utility** - `a4f51da` (feat)
3. **Task 3: Модифицировать calculateWeekendBlocks для поддержки кастомных выходных** - `0558b4d` (feat)

**Plan metadata:** TBD (docs: complete plan)

_Note: Tasks 1 and 2 were already committed before this execution session. Task 3 was completed during this session._

## Files Created/Modified

### Modified

- `packages/gantt-lib/src/utils/dateUtils.ts` - Added three exports:
  - `createDateKey(date: Date): string` - Generates "YYYY-M-D" key using UTC methods
  - `WeekendConfig` interface - Configuration object with optional weekends, workdays, isWeekend
  - `createIsWeekendPredicate(config: WeekendConfig): (date: Date) => boolean` - Predicate factory with precedence rules

- `packages/gantt-lib/src/utils/geometry.ts` - Modified calculateWeekendBlocks:
  - Added optional `isCustomWeekend?: (date: Date) => boolean` parameter
  - Updated JSDoc with usage examples for custom weekends
  - Changed weekend detection logic to use custom predicate when provided
  - Maintained backward compatibility (defaults to Saturday/Sunday when not provided)

## Decisions Made

- **Date key format:** "YYYY-M-D" (not "YYYY-MM-DD") - matches UTC month indexing (0-11)
- **Set-based lookup:** Using `new Set(weekends.map(createDateKey))` for O(1) date checks instead of O(n) Array.includes
- **Precedence order:** isWeekend (highest) > workdays > weekends > default (Saturday/Sunday) - workdays override weekends for edge cases
- **UTC-only methods:** Using getUTCFullYear(), getUTCMonth(), getUTCDate() to prevent DST and timezone bugs
- **Predicate factory pattern:** Function returning (date: Date) => boolean instead of passing arrays directly - more flexible for custom logic
- **Backward compatibility:** Optional isCustomWeekend parameter with undefined check - existing code works without changes

## Deviations from Plan

None - plan executed exactly as written. All three tasks completed according to specifications:
- Task 1: createDateKey implemented with UTC methods ✓
- Task 2: createIsWeekendPredicate implemented with precedence rules ✓
- Task 3: calculateWeekendBlocks modified with isCustomWeekend parameter ✓

All 11 tests passing (4 createDateKey + 7 createIsWeekendPredicate). All existing tests passing (40 geometry tests, 256 total).

## Issues Encountered

None - implementation proceeded smoothly. All tests passing on first run after modifications.

## User Setup Required

None - no external service configuration required. Utilities are pure functions with no dependencies on external services.

## Verification

All tests verified as passing (GREEN phase):

```bash
# createDateKey tests: 4 passed ✓
npx vitest run --reporter=verbose | grep createDateKey

# createIsWeekendPredicate tests: 7 passed ✓
npx vitest run --reporter=verbose | grep createIsWeekendPredicate

# geometry tests: 40 passed ✓ (backward compatibility verified)
npx vitest run src/__tests__/geometry.test.ts

# Total: 11 plan tests + 40 geometry tests = 51 passing ✓
```

grep verification:
```bash
grep -n "isCustomWeekend" packages/gantt-lib/src/utils/geometry.ts
# Lines 160, 168, 172, 177, 186, 187 - parameter present in function signature and logic
```

## Next Phase Readiness

**Ready for Plan 21-03 (Integration):**
- All utility functions implemented and tested
- createDateKey and createIsWeekendPredicate exported from dateUtils.ts
- calculateWeekendBlocks accepts optional isCustomWeekend predicate
- Clear API for integration into GanttChart, GridBackground, TimeScaleHeader components

**No blockers or concerns.** Next plan will integrate utilities into UI components for end-to-end custom weekend calendar functionality.

---
*Phase: 21-custom-weekend-calendar*
*Plan: 02*
*Completed: 2026-03-17*
*Wave: 0 (TDD GREEN)*
