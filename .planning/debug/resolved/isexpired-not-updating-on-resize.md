---
status: investigating
trigger: "isexpired-not-updating-on-resize"
created: 2026-03-04T00:00:00.000Z
updated: 2026-03-04T00:00:06.000Z
---

## Current Focus
hypothesis: Need to manually test to observe actual behavior - code review shows everything should work
test: Added comprehensive logging, will ask user to test and provide console output
expecting: Logs will show if task prop is actually updating and if useMemo is recalculating
next_action: User will test and report console logs

## Symptoms
expected: Краснота обновляется после завершения перетаскивания
actual: После resize-left краснота не меняется, хотя полоса прогресса визуально ушла за линию "сегодня"
errors: None (silent failure)
reproduction: |-
  1. Take a task that ends after today (e.g., 05.03 or later)
  2. Resize-left (move left edge to the left) - this makes startDate earlier
  3. Task duration increases, expectedProgress decreases
  4. Progress bar moves left relative to today line
  5. BUG: Red highlighting doesn't update
started: Started working on this today (04.03.2026), just discovered this issue

## Eliminated

## Evidence
- timestamp: 2026-03-04T00:00:01.000Z
  checked: TaskRow.tsx isExpired useMemo (line 107-162)
  found: useMemo dependencies: [task.startDate, task.endDate, task.progress, highlightExpiredTasks] - includes startDate
  implication: isExpired SHOULD recalculate when task.startDate changes

- timestamp: 2026-03-04T00:00:01.000Z
  checked: TaskRow.tsx React.memo arePropsEqual (line 68-89)
  found: Compares prevProps.task.startDate === nextProps.task.startDate - uses primitive string comparison
  implication: React.memo WILL detect task.startDate string changes, so component should re-render

- timestamp: 2026-03-04T00:00:01.000Z
  checked: useTaskDrag.ts handleDragEnd (line 580-710)
  found: Calls onDragEnd with newStartDate/newEndDate as Date objects, which TaskRow converts to ISO strings
  implication: Parent receives Date objects, must convert and update task state

- timestamp: 2026-03-04T00:00:02.000Z
  checked: TaskRow handleDragEnd (line 198-206)
  found: Creates updatedTask with spread: {...task, startDate: result.startDate.toISOString()}
  implication: New task object is created, parent receives new reference

- timestamp: 2026-03-04T00:00:02.000Z
  checked: GanttChart handleTaskChange (line 311-341)
  found: Calls onChange with functional updater that maps tasks array
  implication: Parent should create new tasks array with updated task

- timestamp: 2026-03-04T00:00:02.000Z
  checked: Website handleChange (line 587-591)
  found: setTasks(typeof updated === "function" ? updated : () => updated)
  implication: Uses functional updater correctly

- timestamp: 2026-03-04T00:00:02.000Z
  hypothesis: The isExpired calculation depends on TODAY's date, but when does it recalculate?
  question: Does the useMemo recalculate on every render, or only when dependencies change?
  found: useMemo only recalculates when dependencies change. Dependencies include task.startDate.
  implication: If task.startDate changes from "2026-03-05" to "2026-03-03", useMemo SHOULD recalculate

- timestamp: 2026-03-04T00:00:03.000Z
  hypothesis: Maybe the issue is that during resize, the visual position changes (displayLeft) but the isExpired calculation uses the original task.startDate, and after drag completes, something doesn't trigger the re-render
  test: Check if onDragEnd actually triggers a parent state update

- timestamp: 2026-03-04T00:00:04.000Z
  action: Added console.log to isExpired useMemo to observe actual values during drag
  next: Build and run app to see console output

- timestamp: 2026-03-04T00:00:05.000Z
  checked: Date format handling in parseUTCDate (line 9-21 of dateUtils.ts)
  found: Original tasks use "YYYY-MM-DD" format (no 'T'), toISOString() returns "YYYY-MM-DDTHH:mm:ss.sssZ"
  implication: Date string changes after first drag ("2026-03-05" → "2026-03-05T00:00:00.000Z")
  hypothesis: The first resize changes date format, subsequent resizes keep same format, React.memo comparison works

- timestamp: 2026-03-04T00:00:06.000Z
  conclusion: Code review shows all the right pieces in place. Added comprehensive logging at key points:
    - arePropsEqual: logs when props change and component will re-render
    - isExpired useMemo: logs calculation with actual values
    - handleDragEnd: logs when drag completes and new dates
    - handleTaskChange: logs when GanttChart receives updated task
    - handleExpiredTasksChange: logs when parent updates state
  next_action: Need user to test and provide console output to see where the chain breaks

## Resolution
root_cause:
fix:
verification:
files_changed:
- packages/gantt-lib/src/components/TaskRow/TaskRow.tsx (logging)
- packages/gantt-lib/src/components/GanttChart/GanttChart.tsx (logging)
- packages/website/src/app/page.tsx (logging)
