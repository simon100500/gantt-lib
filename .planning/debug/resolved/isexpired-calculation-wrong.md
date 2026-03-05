---
status: resolved
trigger: "isexpired-calculation-wrong"
created: 2026-03-05T00:00:00.000Z
updated: 2026-03-05T02:30:00.000Z
---

## Current Focus
hypothesis: The elapsed calculation uses taskEnd at midnight (start of day), but should use end of day when calculating elapsed for tasks that have ended
test: Trace through specific date calculations to verify
expecting: Confirm that elapsedCutoff should be taskEnd + msPerDay when taskEnd < today
next_action: Verify the fix and implement

## Symptoms
expected: |
  1. When task dates change (START/END), ELAPSED should recalculate correctly
  2. Task ended on 2026-03-03, today is 2026-03-05, progress 90% < 100% should be EXPIRED=YES

actual: |
  Log 1: START=2026-02-24T00:00:00.000Z END=2026-03-03T00:00:00.000Z TODAY=2026-03-05 PROGRESS=90% DURATION=8d ELAPSED=7d EXPECTED=87.5% EXPIRED=NO
  Log 2: START=2026-02-25T00:00:00.000Z END=2026-03-04T00:00:00.000Z TODAY=2026-03-05 PROGRESS=90% DURATION=8d ELAPSED=7d EXPECTED=87.5% EXPIRED=NO

  Problems:
  1. ELAPSED stays 7d even though START changed from Feb 24 to Feb 25 (should be 6d or 8d)
  2. Task ended 2 days ago but EXPIRED=NO (should be YES since task is incomplete and past end date)

errors: No error messages - silent logic error

reproduction: |
  1. Open demo app
  2. Drag a task that shows the calculation in console logs
  3. Observe ELAPSED doesn't change when dates change
  4. Observe tasks past end date not marked as expired

started: Issue discovered today (2026-03-05), previous simplification may have introduced bugs

code_location: D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx lines 353-362

current_formula: |
  ```typescript
  const duration = taskEnd.getTime() - taskStart.getTime() + msPerDay;
  const elapsedCutoff = taskEnd.getTime() < today.getTime() ? taskEnd.getTime() : today.getTime();
  const elapsed = elapsedCutoff - taskStart.getTime();
  const expectedProgress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
  const isExpired = actualProgress < expectedProgress;
  ```

user_request: Remove all edge case complexity, use simple straightforward calculation

## Eliminated

## Evidence
- timestamp: 2026-03-05T00:00:00.000Z
  checked: Current implementation in GanttChart.tsx lines 364-369
  found: Root cause identified - elapsedCutoff uses taskEnd.getTime() which is midnight (start of day), not end of day
  implication: When task ends on Mar 3, elapsed calculated as of Mar 3 00:00:00, not Mar 3 23:59:59. This causes:
    1. ELAPSED to be 7d instead of 8d (should count the full end day)
    2. expectedProgress to be 87.5% instead of 100% (should be 100% for past-due tasks)
    3. isExpired = false when should be true (90% < 100%)
## Resolution
root_cause: elapsedCutoff used taskEnd.getTime() (midnight, start of last day) instead of allowing elapsed to reach duration when past end date. This caused expectedProgress to cap at 87.5% instead of 100% for past-due tasks.

fix: Changed from min(today, end) to min(today - start, duration). Now elapsed correctly reaches duration when today is past end date, making expectedProgress = 100% for incomplete tasks.

Formula simplified to:
- duration = (end - start + msPerDay)
- elapsed = clamp(today - start, 0, duration)
- expectedProgress = (elapsed / duration) * 100
- isExpired = actualProgress < expectedProgress

verification: |
  1. All 13 existing tests pass with the new formula
  2. Manual calculation confirms fix works for the reported issue:
     - Log 1: elapsed=8d (was 7d), expectedProgress=100% (was 87.5%), isExpired=YES (was NO) ✓
     - Log 2: elapsed=8d (was 7d), expectedProgress=100% (was 87.5%), isExpired=YES (was NO) ✓
  3. Formula simplified from complex elapsedCutoff logic to straightforward min(today-start, duration)
  4. User verified in real workflow - fix confirmed working correctly

files_changed:
- D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx: lines 364-369
- D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.tsx: lines 124-132
- D:/Projects/gantt-lib/packages/gantt-lib/src/__tests__/isExpired.test.ts: lines 46-86
