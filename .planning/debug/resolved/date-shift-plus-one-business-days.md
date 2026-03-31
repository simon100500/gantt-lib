---
status: investigating
trigger: "Investigate issue: date-shift-plus-one-business-days"
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T01:05:00Z
---

## Current Focus

hypothesis: the isolated DatePicker and TaskListRow logic is correct, but the end-to-end GanttChart edit path still misapplies popup date edits under real chart/task-list conditions; reproduce with an integration test around GanttChart to identify whether the wrong task is emitted or only rendered as changed
test: mount GanttChart with two tasks and exercise the task-list date-picker change path through the chart-level `handleTaskChange` callback chain
expecting: the failing integration test will distinguish between a wrong task id being emitted and a correct update being rendered/applied incorrectly downstream
next_action: add a targeted integration test that goes through GanttChart and the task-list picker path

## Symptoms

expected: Opening the date-setting popup and pressing `+1` should shift the task date by one business day consistently everywhere: chart bars, task list fields, and date picker state.
actual: Pressing `+1` just drops input focus and the date does not shift. Dates appear out of sync between the gantt graph, task list, and date picker.
errors: No explicit error reported by user.
reproduction: Open the date assignment/edit popup, focus the input, click `+1`, observe focus loss and no date change. Then verify chart/tasklist/datepicker values diverge when using the new business-days logic.
started: Started after introducing the new "business days" system / recent business-day calculation changes.

## Eliminated

## Evidence

- timestamp: 2026-03-20T00:50:00Z
  checked: checkpoint response after real UI verification
  found: the previous fix addressed the no-op shift, but in the real workflow shifting through the calendar/popup now moves the next task instead of the current task
  implication: there is a second bug in the popup-targeting/update path beyond the already fixed business-day arithmetic and focus issues

- timestamp: 2026-03-20T01:05:00Z
  checked: DatePicker, TaskListRow, universalCascade, website/demo `onTasksChange` consumers
  found: the row-level callbacks still build updates from `task.id`, `universalCascade` keeps the edited task in its result set, and the in-repo task consumers merge updates by id rather than by array position
  implication: the wrong-target symptom is not explained by the already-tested row helpers or the basic consumer merge path; a more integrated chart/task-list reproduction is needed

- timestamp: 2026-03-20T00:10:00Z
  checked: codebase search for date shift controls and business-day logic
  found: the popup shift buttons live in packages/gantt-lib/src/components/ui/DatePicker.tsx and business-days task-date synchronization logic lives in packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  implication: the bug is likely within the DatePicker -> TaskListRow state handoff rather than a missing control wiring

- timestamp: 2026-03-20T00:18:00Z
  checked: packages/gantt-lib/src/components/ui/DatePicker.tsx and packages/gantt-lib/src/utils/dateUtils.ts
  found: DatePicker.handleDayShift uses `addBusinessDays(base, 1, ...)` for `+1`, while `addBusinessDays` counts the start day inclusively and therefore returns the same date for `1`
  implication: in business-days mode the popup `+1` action becomes a no-op, which matches the user-visible failure

- timestamp: 2026-03-20T00:24:00Z
  checked: packages/gantt-lib/src/components/TaskList/TaskListRow.tsx date-change callbacks
  found: `handleStartDateChange` and `handleEndDateChange` preserve task span using raw millisecond difference, while business-days mode elsewhere computes duration with `getBusinessDaysCount` and end dates with `addBusinessDays`
  implication: changing dates from the task-list picker can preserve a different duration model than the chart/drag system, causing start/end/task-list/chart/date-picker desynchronization

- timestamp: 2026-03-20T00:36:00Z
  checked: patched DatePicker and TaskListRow behavior with focused vitest coverage
  found: targeted tests now pass for popup `+1` business-day shift, focus retention on shift-button mouse down, and task-list start/end picker updates that preserve business-day duration
  implication: the identified root cause is fixed in the code path covered by the regression tests

## Resolution

root_cause: the popup used inclusive business-day duration helpers as if they were exclusive shift helpers, so `+1` in business-days mode returned the same date; at the same time the shift buttons stole focus on mouse down, and TaskListRow preserved paired dates by raw calendar milliseconds instead of business-day duration, causing task-list/chart/date-picker desynchronization
fix: added exclusive business-day shifting plus mouse-down focus preservation in DatePicker, and updated TaskListRow start/end picker handlers to preserve business-day duration with the same model used by drag logic
verification: `npm.cmd run test -- --run src/__tests__/datePicker.test.tsx src/__tests__/taskListDuration.test.tsx` passes with 5/5 tests green
files_changed: ["packages/gantt-lib/src/components/ui/DatePicker.tsx", "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx", "packages/gantt-lib/src/__tests__/datePicker.test.tsx", "packages/gantt-lib/src/__tests__/taskListDuration.test.tsx"]
