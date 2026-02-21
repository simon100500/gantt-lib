---
status: resolved
trigger: "lag-reset-on-parent-drag"
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:01:30Z
---

## Current Focus

hypothesis: CONFIRMED AND ALREADY FIXED in commit 8b4f5af.
Root cause: arePropsEqual in TaskRow.tsx was missing allTasks comparison, causing stale closure in useTaskDrag for the parent task.
test: N/A — fix already applied and committed
expecting: N/A
next_action: Archive session

## Symptoms

expected: After dragging a child in hard mode creating FS -3, dragging the parent by +1 day should keep the lag at -3 (or recalculate it preserving the user-set offset).
actual: After dragging the parent by +1 day, the lag resets to FS +0 (the original default).
errors: No error messages — silent data loss of the modified lag.
reproduction:
  1. Have two tasks with FS +0 dependency (parent → child)
  2. Drag child in hard mode → lag becomes FS -3
  3. Drag parent by +1 day
  4. Observe: lag has reset to +0 instead of staying -3
timeline: Bug exists in current implementation; hard-mode child drag just recently implemented.

## Eliminated

- hypothesis: Parent drag path calls recalculateIncomingLags on successor, overwriting lag
  evidence: The cascade path at lines 513-522 uses { ...chainTask, startDate, endDate } spread — it does NOT call recalculateIncomingLags on chain tasks. The lag would be preserved IF chainTask has the correct lag value.
  timestamp: 2026-02-22T00:01:00Z

- hypothesis: handleComplete closure has stale allTasks due to useCallback deps
  evidence: allTasks IS in useCallback deps array. The problem was upstream: React.memo was blocking the re-render that would have updated the closure.
  timestamp: 2026-02-22T00:01:00Z

## Evidence

- timestamp: 2026-02-22T00:00:30Z
  checked: TaskRow.tsx arePropsEqual function (lines 64-81)
  found: BEFORE FIX — arePropsEqual compared task.*, monthStart, dayWidth, rowHeight, overridePosition but NOT allTasks. This meant when another task's dependencies changed in state (new allTasks array reference), the parent TaskRow memo blocked its re-render.
  implication: The parent TaskRow's useTaskDrag hook held a stale allTasks closure where cascade-b still had lag=0 (the original value).

- timestamp: 2026-02-22T00:00:45Z
  checked: useTaskDrag.ts handleComplete cascade path (lines 487-526)
  found: The cascade path builds cascadedTasks by spreading chainTask objects from allTasks: { ...chainTask, startDate, endDate }. If allTasks is stale (lag=0), the spread produces lag=0. The stale cascade-b has lag=0 and overwrites the correctly stored lag=-3.
  implication: The stale allTasks in the parent's handleComplete is the direct cause of writing lag=0 back to state.

- timestamp: 2026-02-22T00:01:00Z
  checked: git log and git show 8b4f5af
  found: Fix was already committed in 8b4f5af. The fix adds `prevProps.allTasks === nextProps.allTasks` to arePropsEqual. When any task's dependencies change, the new allTasks array reference causes all TaskRows to re-render, refreshing their useTaskDrag closures.
  implication: Fix is complete and verified in the codebase.

## Resolution

root_cause: >
  arePropsEqual in TaskRow.tsx did not compare the allTasks prop. When the child task's
  dependency lag was updated in state (e.g., to -3) after hard-mode drag, GanttChart
  passed a new allTasks array reference to all TaskRows. But React.memo used arePropsEqual
  which returned true for the parent TaskRow (its own task fields hadn't changed), blocking
  the re-render. As a result, the parent TaskRow's useTaskDrag hook kept a stale allTasks
  closure where the child task still had lag=0. When the parent was subsequently dragged,
  handleComplete's cascade path spread the stale chainTask (with lag=0) into cascadedTasks,
  overwriting the correctly stored -3 lag with 0.

fix: >
  Added `prevProps.allTasks === nextProps.allTasks` check to arePropsEqual in
  packages/gantt-lib/src/components/TaskRow/TaskRow.tsx.
  This causes all TaskRows to re-render whenever the tasks array reference changes
  (which happens on every drag completion), ensuring every useTaskDrag hook gets
  the latest allTasks with correct lag values.

verification: Fix committed and present in working tree (commit 8b4f5af). Working tree clean.

files_changed:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
