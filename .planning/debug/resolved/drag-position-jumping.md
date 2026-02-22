---
status: verifying
trigger: "drag-position-jumping: Drag operations became unstable after React.memo optimization — position jumps during drag, and dragging a second task causes the previous task to revert"
created: 2026-02-19T00:00:00.000Z
updated: 2026-02-19T00:00:00.000Z
---

## Current Focus
hypothesis: CONFIRMED: The `handleTaskChange` callback in GanttChart has a STALE CLOSURE bug. It depends on `tasks` in its dependency array, which causes it to be recreated every time tasks change. However, if a second drag operation happens before the first state update fully processes, the old callback (with stale tasks array) is still active, causing the first task to revert.

Scenario:
1. Initial: tasks = [A(1), B(5)], handleTaskChange_v1 created with closure over [A(1), B(5)]
2. Drag Task A → handleTaskChange_v1([A(3), B(5)]) → setTasks called
3. BEFORE re-render completes, drag Task B
4. handleTaskChange_v1 is STILL active (component hasn't re-rendered yet)
5. Drag Task B → handleTaskChange_v1 maps over [A(1), B(5)] (STALE!) → produces [A(1), B(7)]
6. Task A REVERTS to day 1!

test: Confirm by examining handleTaskChange implementation - it uses tasks.map which closes over the tasks array from when the callback was created
expecting: Will find tasks.map in handleTaskChange that uses stale closure
next_action: Fix handleTaskChange to NOT depend on tasks in its closure (use functional setState pattern in parent, OR pass setState directly)

## Symptoms
expected: Dragging a task should smoothly move it to new position, and subsequent drags should work independently without affecting other tasks
actual: |
  1. Position jumps/oscillates during drag operation
  2. When dragging a second task, the previously dragged task reverts to its original position
errors: None visible in console (assumed)
reproduction: |
  1. Load page with multiple tasks
  2. Drag Task A to new position — it may jump during drag
  3. Release Task A
  4. Drag Task B to new position
  5. Task A reverts to original position
started: Issue appeared after plan 02-03 (Performance Optimization). The React.memo optimization with useCallback likely introduced a state mutation bug where tasks are being mutated in place instead of being copied.

## Eliminated

## Evidence
- timestamp: 2026-02-19T00:00:00.000Z
  checked: GanttChart.tsx lines 93-99 (handleTaskChange callback)
  found: useCallback depends on [tasks, onChange]. Every time tasks state changes, handleTaskChange gets a new reference.
  implication: Parent creates new callback reference on every task update

- timestamp: 2026-02-19T00:00:00.000Z
  checked: GanttChart.tsx lines 95-97 (tasks.map operation)
  found: `const updatedTasks = tasks.map((t) => t.id === updatedTask.id ? updatedTask : t)` - This uses `tasks` from the closure
  implication: STALE CLOSURE BUG - When callback runs, it uses the tasks array from when the callback was created

- timestamp: 2026-02-19T00:00:00.000Z
  checked: page.tsx lines 134-136 (handleTasksChange function)
  found: `const handleTasksChange = (updatedTasks: Task[]) => { setTasks(updatedTasks); };` is NOT wrapped in useCallback. This function gets a NEW REFERENCE on EVERY Home component render.
  implication: Every time Home re-renders (which happens when tasks state updates), handleTasksChange gets a new reference, which means GanttChart's handleTaskChange also gets a new reference (depends on onChange).

- timestamp: 2026-02-19T00:00:00.000Z
  checked: Race condition scenario
  found: If two drags happen in quick succession before state updates process, the first handleTaskChange callback (with stale tasks array) may be called for the second drag
  implication: The second drag would map over the OLD tasks array, losing the first drag's changes

## Resolution
root_cause: The handleTaskChange callback in GanttChart.tsx (lines 93-99) has a stale closure bug. It depends on `tasks` in its dependency array and uses `tasks.map()` to create the updated array. When the callback is executed, it uses the `tasks` array from when the callback was created, not necessarily the latest state. If multiple drag operations happen in quick succession, the first callback (with stale tasks) can overwrite the changes from a later drag.

fix: Modified onChange to accept functional updater pattern (Task[] | ((currentTasks: Task[]) => Task[])). GanttChart now passes a functional updater to onChange, which ensures it always operates on the latest state. handleTaskChange no longer depends on `tasks`, only on `onChange`, making it truly stable.

files_changed:
- src/app/page.tsx: Added useCallback import, wrapped handleTasksChange in useCallback, made it handle functional updaters
- src/components/GanttChart/GanttChart.tsx: Changed handleTaskChange to pass functional updater to onChange, removed `tasks` from dependency array, updated onChange type to support functional updaters

verification:
- All 59 tests pass
- TypeScript compilation succeeds with no errors
- Production build completes successfully
- The fix ensures handleTaskChange always operates on the latest tasks state by using functional updater pattern
root_cause:
fix:
verification:
files_changed: []
