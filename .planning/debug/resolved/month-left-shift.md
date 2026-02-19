---
status: resolved
trigger: "month-left-shift: При добавлении месяца слева (в начале сетки) не перестраиваются все другие полосы графика"
created: 2026-02-19T00:00:00.000Z
updated: 2026-02-19T00:25:00.000Z
---

## Current Focus
hypothesis: The React.memo comparison function in TaskRow doesn't include monthStart prop, so when monthStart changes (due to grid expansion), other TaskRows don't re-render
test: Add monthStart to the arePropsEqual function in TaskRow.tsx
expecting: All TaskRows will re-render when monthStart changes, and their positions will update correctly
next_action: Fix verified - ready to commit

## Symptoms
expected: Grid expands, tasks stay in place (they should remain in their absolute positions, not shift)
actual: Tasks don't move at all (they remain in their original positions which is now wrong relative to the expanded grid)
errors: None reported
reproduction: User drags a task bar left beyond the month boundary, and a new month is automatically added to the left side of the grid
started: Never worked - this is a new feature or has always been broken

## Eliminated
- hypothesis: Task positions are stored as fixed values rather than calculated from dates
  evidence: Task positions ARE calculated dynamically using calculateTaskBar(taskStartDate, taskEndDate, monthStart, dayWidth)
  timestamp: 2026-02-19T00:15:00.000Z

- hypothesis: The dateRange doesn't expand when dragging beyond boundaries
  evidence: getMultiMonthDays recalculates based on all task dates, so it does expand
  timestamp: 2026-02-19T00:15:00.000Z

## Evidence
- timestamp: 2026-02-19T00:15:00.000Z
  checked: Code flow for date range calculation and task positioning
  found:
    1. GanttChart.tsx: Uses getMultiMonthDays(tasks) to calculate dateRange from tasks
    2. GanttChart.tsx: monthStart is calculated from dateRange[0] as first day of first month
    3. TaskRow.tsx: Uses calculateTaskBar(taskStartDate, taskEndDate, monthStart, dayWidth)
    4. geometry.ts: calculateTaskBar calculates left = startOffset * dayWidth where startOffset = getUTCDayDifference(taskStartDate, monthStart)
  implication: Task positions ARE dynamically calculated from monthStart, NOT stored. When monthStart changes, all task positions should recalculate.

- timestamp: 2026-02-19T00:18:00.000Z
  checked: React.memo comparison function in TaskRow.tsx (lines 43-54)
  found: arePropsEqual does NOT include monthStart in the comparison! It only checks: task.id, task.name, task.startDate, task.endDate, task.color, dayWidth, rowHeight
  implication: When monthStart changes due to grid expansion, React.memo returns true (props are "equal") and prevents re-render of other TaskRows

- timestamp: 2026-02-19T00:18:00.000Z
  checked: How monthStart is used in TaskRow
  found: monthStart is passed to calculateTaskBar() (line 70) and pixelsToDate() (lines 111, 114)
  implication: When monthStart changes but TaskRow doesn't re-render, it uses the old monthStart value for position calculations

- timestamp: 2026-02-19T00:25:00.000Z
  checked: Test verification
  found: Added new test "should recalculate position when monthStart changes (grid expansion)" that verifies position correctly updates from 360px to 1600px when monthStart moves from Feb 1 to Jan 1
  implication: Fix is verified at unit test level

## Resolution
root_cause: React.memo comparison function in TaskRow doesn't include monthStart prop. When a task is dragged beyond the left grid boundary:
1. Task dates update
2. getMultiMonthDays recalculates dateRange (expanding it)
3. monthStart changes to point to new earlier date
4. Other TaskRows should re-render with new monthStart value
5. BUT React.memo sees monthStart wasn't in comparison, returns true, prevents re-render
6. Other tasks display at old pixel positions

fix: Added `prevProps.monthStart.getTime() === nextProps.monthStart.getTime()` to the arePropsEqual comparison function in TaskRow.tsx

verification:
- All existing tests pass (92 tests)
- New test added specifically for monthStart recalculation scenario
- Test verifies position updates correctly when monthStart changes from Feb 1 (360px) to Jan 1 (1600px)

files_changed: ["src/components/TaskRow/TaskRow.tsx", "src/__tests__/useTaskDrag.test.ts"]
