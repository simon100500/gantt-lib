# Quick Task 51 Summary

**Task:** Fix FS lag off-by-one: stored lag and calculateSuccessorDate both need +1 day offset
**Date:** 2026-03-03
**Commit:** 6aaf1ba

## What was done

### Root cause
For FS (Finish-to-Start), "ends today, starts tomorrow" was being stored as `lag=1` and displayed as `+1` in dep chips. The user expectation: adjacent days = `lag=0`.

### Files changed

**`packages/gantt-lib/src/utils/dependencyUtils.ts`**
- `calculateSuccessorDate` FS: returns `predEnd + (lag + 1) days` — lag=0 now positions successor the day after predecessor ends
- `calculateSuccessorDate` SF: symmetric fix — returns `predStart + (lag - 1) days` (lag=0 → day before pred starts)
- `recalculateIncomingLags` FS: stores `diff - 1` instead of `diff` — natural adjacent-day gap = lag 0

**`packages/gantt-lib/src/components/TaskList/TaskList.tsx`**
- Removed manual `+ DAY_MS` for FS and `- DAY_MS` for SF in auto-snap — these were workarounds for the off-by-one, now handled in utils

**`packages/gantt-lib/src/__tests__/dependencyUtils.test.ts`**
- Updated FS tests: lag=0 → jan6 (was jan5), lag=2 → jan8, lag=-2 → jan4
- Updated SF tests: lag=0 → dec31 (was jan1), lag=4 → jan4

All 36 dependency utils tests pass.
