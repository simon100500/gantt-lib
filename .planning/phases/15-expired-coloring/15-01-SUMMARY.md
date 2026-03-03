---
phase: 15-expired-coloring
plan: 01
subsystem: task-styling
tags: [css-variables, expiration-logic, time-based-calculation]
dependency_graph:
  requires: []
  provides: [expired-task-highlighting]
  affects: [task-row-rendering]
tech_stack:
  added: []
  patterns: [time-based-progress-calculation, conditional-styling]
key_files:
  created: []
  modified:
    - path: "packages/gantt-lib/src/styles.css"
      changes: "Added CSS variable for expired color"
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      changes: "Added highlightExpiredTasks prop"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      changes: "Implemented time-based expiration logic and red progress bar"
    - path: "packages/website/src/app/page.tsx"
      changes: "Added expired task demo section"
key_decisions:
  - id: "DEC-15-01-001"
    title: "Time-based expiration calculation"
    rationale: "User requested that expiration be based on elapsed time vs expected progress, not just end date comparison"
    alternative: "Simple end date comparison (rejected - not granular enough)"
  - id: "DEC-15-01-002"
    title: "Red color for both background and progress"
    rationale: "User explicitly requested both the task background AND progress bar be red when expired"
metrics:
  duration: "checkpoint to completion"
  completed_date: "2026-03-04"
---

# Phase 15 Plan 01: Time-Based Expired Task Coloring Summary

Implement time-based expiration logic for tasks with visual red highlighting for both background and progress bar when tasks fall behind schedule.

## Implementation Overview

This plan implements a time-based expiration system for Gantt chart tasks. A task is considered "expired" (highlighted in red) when:
1. The end date has passed, OR
2. The current progress is less than the expected progress based on elapsed time
3. AND the task is either incomplete (progress < 100%) or not accepted

The expected progress formula: `expectedProgress = (daysElapsed / durationInDays) × 100`

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ----- | ------ | ----- |
| 1 | Add CSS variable for expired color | 96cf9d3 | packages/gantt-lib/src/styles.css |
| 2 | Add highlightExpiredTasks prop to GanttChart | 032ea3c | packages/gantt-lib/src/components/GanttChart/GanttChart.tsx |
| 3 | Add expiration logic and conditional styling to TaskRow | 97a0682 | packages/gantt-lib/src/components/TaskRow/TaskRow.tsx |
| 3b | Add expired task demo to website | fa3bbbb, 05e5012 | packages/website/src/app/page.tsx |
| 4 | Fix expired task coloring based on user feedback | 32ee1ee | packages/gantt-lib/src/components/TaskRow/TaskRow.tsx, packages/website/src/app/page.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [User Feedback - Logic Change] Implemented time-based expiration calculation**
- **Found during:** Task 4 (checkpoint feedback)
- **Issue:** Original logic only checked `endDate < today`, user wanted time-based expected progress
- **Fix:** Changed isExpired calculation to use `expectedProgress = (daysElapsed / durationInDays) × 100`
- **Formula:** Task is expired if `actualProgress < expectedProgress` when end date passed
- **Files modified:** packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
- **Commit:** 32ee1ee

**2. [User Feedback - Visual Change] Made progress bar red when expired**
- **Found during:** Task 4 (checkpoint feedback)
- **Issue:** Only task background was red, progress bar kept normal color
- **Fix:** Modified progressColor useMemo to return `var(--gantt-expired-color)` when `isExpired === true`
- **Files modified:** packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
- **Commit:** 32ee1ee

**3. [Demo Enhancement] Updated demo tasks with time-based examples**
- **Found during:** Task 4 (checkpoint feedback)
- **Issue:** Demo tasks didn't clearly show the time-based expiration behavior
- **Fix:** Added sample tasks with different elapsed time vs progress scenarios, updated description text
- **Files modified:** packages/website/src/app/page.tsx
- **Commit:** 32ee1ee

## Technical Details

### Time-Based Expiration Logic

```typescript
// Expected progress = (daysElapsed / durationInDays) × 100
const msPerDay = 1000 * 60 * 60 * 24;
const durationInDays = (taskEnd.getTime() - taskStart.getTime()) / msPerDay + 1;
const daysElapsed = Math.max(0, (today.getTime() - taskStart.getTime()) / msPerDay);
const expectedProgress = Math.min(100, (daysElapsed / durationInDays) * 100);

// Task is expired if actual progress < expected progress
if (endDatePassed && (actualProgress < expectedProgress || notComplete || notAccepted)) {
  return true;
}
```

### Visual Changes

1. **Task Background (barColor):** Red when `isExpired === true`
2. **Progress Bar (progressColor):** Red when `isExpired === true` (changed from darker shade of task color)
3. **CSS Variable:** `--gantt-expired-color: #ef4444` (red-500)

## Key Changes Made

### packages/gantt-lib/src/components/TaskRow/TaskRow.tsx

1. Added `task.startDate` to isExpired dependency array (time calculation needs start date)
2. Implemented time-based expected progress calculation
3. Modified progressColor to return expired color when task is expired
4. Added proper fallback logic for edge cases

### packages/website/src/app/page.tsx

1. Enhanced demo tasks with clear time-based examples:
   - 10-day task: 5 days elapsed, 30% progress (expired - expected 50%)
   - 10-day task: 5 days elapsed, 60% progress (not expired - ahead of schedule)
   - 5-day task: 3 days elapsed, 20% progress (expired - expected 60%)
   - 5-day task: 3 days elapsed, 70% progress (not expired - ahead of schedule)
2. Updated description text to explain new logic

## Examples

### Expired Task Example
```
Task duration: 10 days (March 1 - March 10)
Today: March 6 (5 days elapsed)
Expected progress: 50%
Actual progress: 30%
Result: RED (behind schedule)
```

### Not Expired Example
```
Task duration: 10 days (March 1 - March 10)
Today: March 6 (5 days elapsed)
Expected progress: 50%
Actual progress: 60%
Result: NORMAL (ahead of schedule)
```

## Testing Notes

The implementation handles edge cases:
- Tasks that haven't started yet (daysElapsed = 0)
- Single-day tasks (durationInDays = 1)
- Tasks ahead of schedule (progress > expected)
- Completed but not accepted tasks (still red if end date passed)

## Self-Check: PASSED

- [x] Commit 32ee1ee exists in git history
- [x] TaskRow.tsx modified with time-based logic
- [x] page.tsx demo updated with new examples
- [x] Progress bar color changes when expired
- [x] TypeScript compiles without errors (website)
