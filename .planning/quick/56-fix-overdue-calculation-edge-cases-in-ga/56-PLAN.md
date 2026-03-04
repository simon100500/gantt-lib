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
  key_links:
    - from: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      to: "isExpired calculation"
      via: "Fixed todayPosition formula"
      pattern: "todayPosition.*daysFromStart.*taskDuration"
---

## Objective

Fix the overdue calculation edge case in the Gantt chart where the current day incorrectly counts as completed work time.

**Purpose:** Tasks should only be marked as expired when they have truly run out of time - not on the current day itself.

**Output:** Tasks ending today are NOT marked expired (still have today to work on), tasks ending yesterday with insufficient progress ARE marked expired.

## Context

@.planning/STATE.md
@.planning/PROJECT.md
@packages/gantt-lib/src/components/TaskRow/TaskRow.tsx

### Current Issue

The `isExpired` calculation in TaskRow.tsx (lines 106-138) has an edge case:

```typescript
const todayPosition = Math.min(100, Math.max(0, (daysFromStart / taskDuration) * 100));
return actualProgress < todayPosition;
```

**Problem:** On the current day (today == task.endDate), the calculation treats today as "elapsed time" even though the entire day is still available for work. This means:
- Task ending today with 0% progress → todayPosition ≈ 100% → marked as expired ❌ (wrong)
- Task ending tomorrow with 0% progress → todayPosition < 100% → NOT expired ✓ (correct)

**Expected behavior:** Current day should NOT count as completed work time. Only yesterday and earlier should count as "elapsed".

### Decision from Phase 15

From STATE.md line 296-297:
> Time-based expiration calculation using expectedProgress formula

This formula calculates the expected progress based on time elapsed, but it incorrectly counts the current day as fully elapsed.

## Tasks

<task type="auto" tdd="true">
  <name>Task 1: Fix isExpired calculation to exclude current day from elapsed time</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.tsx</files>
  <behavior>
    Test 1: Task ending today (2026-03-04) with 0% progress → NOT expired (today is still available)
    Test 2: Task ending yesterday (2026-03-03) with 0% progress → IS expired (yesterday is gone)
    Test 3: Task ending tomorrow (2026-03-05) with 0% progress → NOT expired (future)
    Test 4: Task ending today with 50% progress → NOT expired (sufficient progress for time elapsed)
    Test 5: Task ending yesterday with 10% progress → IS expired (insufficient progress)
  </behavior>
  <action>
    Modify the isExpired calculation in TaskRow.tsx (line 106-138):

    1. Change the "today" reference to use "yesterday" as the cutoff for elapsed time calculation
    2. Update the formula: Use `(today - 1 day)` instead of `today` when calculating elapsed time
    3. This ensures that tasks ending today are NOT marked expired (they still have the full day to work)

    Implementation approach:
    - Create `elapsedCutoff` variable: `new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1))`
    - Use `elapsedCutoff` instead of `today` in the `daysFromStart` calculation
    - This shifts the "elapsed" cutoff back by one day, excluding the current day

    The fix ensures:
    - Tasks ending today have one less day counted as "elapsed"
    - Tasks ending yesterday have the full duration counted as "elapsed"
    - The visual red highlighting only appears when work time is truly exhausted
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib/packages/website && npm run dev</automated>
  </verify>
  <done>
    - Tasks ending today are NOT marked expired regardless of progress (still have today)
    - Tasks ending yesterday with insufficient progress ARE marked expired
    - Tasks ending in the future are never marked expired
  </done>
</task>

## Verification

### Manual Verification Steps

1. Start the dev server: `cd D:/Projects/gantt-lib/packages/website && npm run dev`
2. Open http://localhost:3000
3. Find a task ending today (2026-03-04) with 0% progress → should NOT have red background
4. Find a task ending yesterday (2026-03-03) with 0% progress → should have red background
5. Find a task ending tomorrow (2026-03-05) → should NOT have red background

## Success Criteria

- [ ] Tasks ending today are NOT marked as expired (red background)
- [ ] Tasks ending yesterday with insufficient progress ARE marked as expired
- [ ] Tasks ending in the future are never marked as expired
- [ ] Visual red highlighting behavior aligns with user expectations

## Output

After completion, create `.planning/quick/56-fix-overdue-calculation-edge-cases-in-ga/56-SUMMARY.md`
