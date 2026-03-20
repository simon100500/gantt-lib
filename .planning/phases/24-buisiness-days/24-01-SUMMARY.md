---
phase: 24-buisiness-days
plan: 01
title: "Business days utilities"
subsystem: "dateUtils"
tags: ["tdd", "utilities", "business-days"]
wave: 1

dependency_graph:
  requires:
    - "Phase 21: custom-weekend-calendar (createCustomDayPredicate)"
  provides:
    - "getBusinessDaysCount: count business days excluding weekends"
    - "addBusinessDays: calculate end date from business days"
  affects:
    - "Phase 24 Plan 02: TaskListRow integration"

tech_stack:
  added: []
  patterns:
    - "TDD workflow (RED→GREEN)"
    - "UTC-safe date arithmetic (getUTC* methods)"
    - "Weekend predicate pattern (function returning boolean)"

key_files:
  created: []
  modified:
    - "packages/gantt-lib/src/utils/dateUtils.ts"
    - "packages/gantt-lib/src/__tests__/dateUtils.test.ts"

decisions:
  - "Fixed incorrect test dates: Mar 13 2026 = Friday (not Mar 14)"
  - "Kept simple iterative algorithm for clarity (O(n) where n = days)"
  - "Used weekend predicate pattern for flexibility (matches Phase 21 design)"

metrics:
  duration: "6 minutes"
  started_at: "2026-03-19T21:44:34Z"
  completed_at: "2026-03-19T21:50:00Z"
  tasks_completed: 2
  files_changed: 2
  tests_added: 18
  tests_passing: 18
---

# Phase 24 Plan 01: Business Days Utilities Summary

## One-Liner
UTC-безопасные утилиты для расчёта duration в рабочих днях с поддержкой кастомного календаря — 18 тестов, TDD подход.

## Tasks Completed

| Task | Name | Commit | Files | Status |
|------|------|--------|-------|--------|
| 1 | Create failing tests (TDD RED) | 9f3f945 | dateUtils.test.ts | ✓ Done |
| 2 | Implement utilities (TDD GREEN) | ee7484e | dateUtils.ts, dateUtils.test.ts | ✓ Done |

## Implementation Details

### getBusinessDaysCount
```typescript
export function getBusinessDaysCount(
  startDate: string | Date,
  endDate: string | Date,
  weekendPredicate: (date: Date) => boolean
): number
```

**Algorithm:**
1. Parse start/end dates using `parseUTCDate` (UTC-safe)
2. Iterate from start to end (inclusive)
3. Count days where `!weekendPredicate(date)`
4. Return `Math.max(1, count)` (minimum 1 day)

**Complexity:** O(n) where n = number of days in range

### addBusinessDays
```typescript
export function addBusinessDays(
  startDate: string | Date,
  businessDays: number,
  weekendPredicate: (date: Date) => boolean
): string
```

**Algorithm:**
1. Parse start date using `parseUTCDate`
2. Iterate days, counting business days
3. Move to next day after counting (unless target reached)
4. Return end date as YYYY-MM-DD string

**Complexity:** O(m) where m = businessDays + weekends in range

## Deviations from Plan

### Rule 2 - Bug: Fixed incorrect test dates

**Found during:** Task 2 (TDD GREEN phase)

**Issue:** Test plan assumed Mar 14 2026 = Friday, but real calendar has Mar 14 2026 = Saturday. This caused all tests to fail.

**Fix:** Updated all test dates to use correct calendar:
- Mar 13 2026 = Friday (day 5) ✓
- Mar 14 2026 = Saturday (day 6) ✓
- Mar 15 2026 = Sunday (day 0) ✓
- Mar 16 2026 = Monday (day 1) ✓

**Files modified:**
- `packages/gantt-lib/src/__tests__/dateUtils.test.ts` (13 test cases updated)

**Commit:** ee7484e (combined with implementation)

**Rationale:** Test correctness is critical. Tests with wrong dates would never pass, blocking progress. Fixed per Deviation Rule 2 (auto-fix bugs).

### Rule 2 - Bug: Fixed incorrect expected values

**Found during:** Task 2 (debugging test failures)

**Issue:** Three tests had incorrect expected values due to calculation errors in comments:
1. `should exclude weekends` — expected 5, actual 4 (Mar 12-17 has 4 business days)
2. `should work with custom weekend` — expected Mar 17, actual Mar 16 (Wed+Thu+Mon = Mon)
3. `should work across month boundary` — expected Mar 31, actual Apr 1 (Mon+Tue+Wed = Wed)

**Fix:** Corrected expected values to match actual business day calculations.

**Files modified:**
- `packages/gantt-lib/src/__tests__/dateUtils.test.ts` (3 test expectations updated)

**Commit:** ee7484e (combined with implementation)

**Rationale:** Tests must verify correct behavior, not incorrect assumptions. Fixed per Deviation Rule 2.

## Auth Gates

None — no authentication required for utility functions.

## Test Results

**Coverage:** 18 tests (9 per function)
- ✓ getBusinessDaysCount: 9/9 passing
- ✓ addBusinessDays: 9/9 passing

**Test scenarios:**
1. Default weekend predicate (Sat/Sun)
2. Custom weekend predicates (4-day work week, etc.)
3. Custom days (workday/weekend overrides)
4. Date string inputs
5. Month boundary transitions
6. Single day ranges
7. Long ranges with multiple weekends

**Command:** `npm test -- -t "getBusinessDaysCount|addBusinessDays"`

## Self-Check: PASSED

**Verification:**
- [x] Functions exist in dateUtils.ts
- [x] Functions are exported
- [x] All 18 tests passing
- [x] UTC-safe (uses getUTC* methods)
- [x] Works with customDays from Phase 21
- [x] Commits created: 9f3f945 (RED), ee7484e (GREEN)
- [x] No breaking changes (additive only)

## Next Steps

**Plan 02 (TaskListRow integration):**
- Add `businessDays` prop to GanttChart → TaskList → TaskListRow
- Create memoized `getDuration`/`getEndDate` functions
- Replace `getInclusiveDurationDays`/`getEndDateFromDuration` calls
- Test with sample tasks in business days mode

**Dependencies:**
- Requires Phase 21 (custom weekend calendar) ✓ Complete
- Blocks Phase 24 Plan 02 (integration)

**Risk Assessment:** Low
- Utilities are well-tested (18 tests)
- Integration is straightforward (memoized wrappers)
- Backward compatible (opt-in via `businessDays` prop)
