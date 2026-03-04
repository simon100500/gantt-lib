---
phase: 56-fix-overdue-calculation-edge-cases-in-ga
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
autonomous: true
requirements:
  - FIX-01: Fix overdue calculation so current day doesn't count as completed work time
must_haves:
  truths:
    - "Tasks ending today are not marked as expired on the current day (they still have today to work on)"
    - "Tasks ending yesterday with insufficient progress ARE marked as expired"
    - "Tasks ending in the future are never marked as expired regardless of progress"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Fixed isExpired calculation logic"
      contains: "const isExpired = useMemo"
    - path: "packages/gantt-lib/src/__tests__/isExpired.test.ts"
      provides: "Test suite for isExpired edge cases"
      contains: "7 tests covering all scenarios"
  key_links:
    - from: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      to: "isExpired calculation"
      via: "Fixed todayPosition formula with future and today checks"
      pattern: "today\\.getTime\\(\\) < taskEnd\\.getTime\\(\\)"
subsystem: TaskRow component
tags:
  - bug-fix
  - expired-tasks
  - isExpired
  - edge-cases
  - testing
key_files:
  created:
    - packages/gantt-lib/src/__tests__/isExpired.test.ts
  modified:
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
decisions:
  - key: "isExpired logic"
    value: "Tasks ending in the future or today are NEVER marked as expired - only tasks ending in the past with insufficient progress are marked expired"
  - key: "Test approach"
    value: "TDD with mock Date constructor for deterministic testing of date-dependent logic"
metrics:
  duration: "15 minutes"
  completed_date: "2026-03-04"
  tasks_completed: 1
  files_created: 1
  files_modified: 1
  tests_added: 7
  tests_passing: 7
---

# Phase 56 Plan 1: Fix Overdue Calculation Edge Cases Summary

**One-liner:** Fixed isExpired calculation so tasks ending today or in the future are never marked as expired, ensuring the current day doesn't count as completed work time.

## Objective

Fix the overdue calculation edge case in the Gantt chart where the current day incorrectly counted as completed work time, causing tasks ending today to be marked as expired even though they still have the full day to be completed.

## Context

The `isExpired` calculation in TaskRow.tsx had a critical flaw: it used `today` (the current day) as the cutoff for elapsed time calculation. This meant:
- Tasks ending today were marked as expired if progress was insufficient
- The current day was counted as "elapsed" even though it's still available for work

From STATE.md line 296: "Time-based expiration calculation using expectedProgress formula" - this formula needed adjustment to exclude the current day from elapsed time.

## Implementation

### TDD Approach

Following Test-Driven Development, the fix was implemented in three phases:

**RED Phase:** Created 7 failing tests that verified the expected behavior
- Test 1: Task ending TODAY with 0% progress → NOT expired (FAILS with old code)
- Test 2: Task ending YESTERDAY with 0% progress → IS expired (passes)
- Test 3: Task ending TOMORROW with 0% progress → NOT expired (FAILS with old code)
- Test 4: Task ending TODAY with 50% progress → NOT expired (FAILS with old code)
- Test 5: Task ending YESTERDAY with 10% progress → IS expired (passes)
- Test 6: Task ending TODAY with 100% progress → NOT expired (passes)
- Test 7: Single-day task ending TODAY → NOT expired (FAILS with old code)

**GREEN Phase:** Fixed the isExpired calculation with a simpler approach
1. Check if task ends in the future → NOT expired (deadline hasn't passed)
2. Check if task ends today → NOT expired (still have the full day)
3. For tasks ending in the past → check progress vs time elapsed

**Key Changes:**
- Added explicit check for tasks ending in the future using date comparison
- Added explicit check for tasks ending today using year/month/day comparison
- Only tasks ending in the past with insufficient progress are marked as expired

### Code Changes

**File:** `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx`

The fix adds two early-return checks before the time-based calculation:

```typescript
// Tasks ending in the future are NOT expired
if (today.getTime() < taskEnd.getTime()) {
  return false;
}

// Tasks ending today are NOT expired
if (today.getUTCFullYear() === taskEnd.getUTCFullYear() &&
    today.getUTCMonth() === taskEnd.getUTCMonth() &&
    today.getUTCDate() === taskEnd.getUTCDate()) {
  return false;
}
```

This ensures:
- Tasks ending tomorrow or later are never marked expired
- Tasks ending today have the full day available before expiration
- Only tasks ending yesterday or earlier with insufficient progress are marked expired

## Deviations from Plan

**Rule 3 - Auto-fix blocking issue:** The initial implementation approach using `elapsedCutoff` (yesterday) was more complex than needed. Simplified to direct date comparison checks which is clearer and more maintainable.

No other deviations. Plan executed exactly as written.

## Verification

### Automated Tests
All 7 tests pass:
- Test 1: Task ending TODAY with 0% → NOT expired ✓
- Test 2: Task ending YESTERDAY with 0% → IS expired ✓
- Test 3: Task ending TOMORROW → NOT expired ✓
- Test 4: Task ending TODAY with 50% → NOT expired ✓
- Test 5: Task ending YESTERDAY with 10% → IS expired ✓
- Test 6: Task ending TODAY with 100% → NOT expired ✓
- Test 7: Single-day task ending TODAY → NOT expired ✓

### Manual Verification Steps
1. Dev server already running on port 3005
2. Open http://localhost:3005
3. Find a task ending today (2026-03-04) → should NOT have red background
4. Find a task ending yesterday (2026-03-03) with low progress → should have red background
5. Find a task ending tomorrow (2026-03-05) → should NOT have red background

## Output

**Artifacts Created:**
1. `packages/gantt-lib/src/__tests__/isExpired.test.ts` - 176 lines, 7 tests

**Artifacts Modified:**
1. `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` - Modified isExpired calculation (lines 106-139)

## Commits

1. `0c06246` - test(56-01): add failing tests for isExpired edge case
2. `5601bc0` - feat(56-01): fix isExpired calculation to exclude current day and future tasks

## Success Criteria

- [x] Tasks ending today are NOT marked as expired (red background)
- [x] Tasks ending yesterday with insufficient progress ARE marked as expired
- [x] Tasks ending in the future are never marked as expired
- [x] Visual red highlighting behavior aligns with user expectations
- [x] All 7 automated tests pass
- [x] Library builds successfully

## Self-Check: PASSED

**Files created:**
- FOUND: packages/gantt-lib/src/__tests__/isExpired.test.ts

**Files modified:**
- FOUND: packages/gantt-lib/src/components/TaskRow/TaskRow.tsx

**Commits exist:**
- FOUND: 0c06246 - test(56-01): add failing tests for isExpired edge case
- FOUND: 5601bc0 - feat(56-01): fix isExpired calculation to exclude current day and future tasks

**Tests pass:**
- PASSED: 7/7 tests in isExpired.test.ts
