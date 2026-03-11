---
phase: quick
plan: 096-duration-column
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
  - packages/gantt-lib/src/__tests__/taskListDuration.test.tsx
autonomous: true
requirements:
  - DUR-001
  - DUR-002
---

<objective>
Add an inline editable duration column "Дн." after the date columns in TaskList. The editor should match the existing percent input pattern and changing duration must recalculate the task end date while keeping the start date fixed.
</objective>

<tasks>

<task>
  <name>Add duration column to TaskList header and row layout</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx, packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>Add a new fixed-width column labeled "Дн." between end date and percent, and style it consistently with other numeric inline-edit cells.</action>
  <verify>Header renders the new column in the expected position and layout stays aligned.</verify>
  <done>Task list shows a dedicated duration column after the date columns.</done>
</task>

<task>
  <name>Implement inline duration editing with end-date recalculation</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>Mirror the percent editor UX for duration, clamp duration to positive integers, and on save update only endDate based on startDate + duration - 1 day.</action>
  <verify>Changing duration from the row emits onTaskChange with unchanged startDate and recalculated endDate.</verify>
  <done>Duration edits update the task end date correctly.</done>
</task>

<task>
  <name>Add targeted test coverage</name>
  <files>packages/gantt-lib/src/__tests__/taskListDuration.test.tsx</files>
  <action>Add a focused RTL test that edits the duration cell and asserts the emitted task update.</action>
  <verify>Relevant vitest test file passes.</verify>
  <done>Duration editing behavior is covered by an automated test.</done>
</task>

</tasks>
