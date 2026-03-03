---
phase: quick-041
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements: [QUICK-041]
must_haves:
  truths:
    - "Calling scrollToTask(taskId) on the GanttChart ref scrolls the calendar grid so the task bar is centered horizontally"
    - "Clicking the row number (№ cell) in the task list scrolls the grid to that task"
    - "scrollToTask is a method on the existing ref handle alongside scrollToToday"
  artifacts:
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "scrollToTask method on useImperativeHandle handle, GanttChartHandle type export"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "onScrollToTask prop passed to TaskListRow"
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "№ cell click fires onScrollToTask(task.id)"
  key_links:
    - from: "TaskListRow number cell click"
      to: "GanttChart.scrollToTask"
      via: "onScrollToTask prop callback chain: TaskListRow → TaskList → GanttChart"
---

<objective>
Add a `scrollToTask(taskId)` method to the GanttChart ref handle that horizontally scrolls the calendar grid to center the task bar for the given task. Wire this method to a click on the № (row number) cell in the TaskList so users can click a row number to jump to that task in the grid.

Purpose: Navigation shortcut — when many tasks are visible in the task list, clicking the row number teleports the grid view to that task's position.
Output: `scrollToTask` method on GanttChart ref + № cell click handler in TaskListRow.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Key existing contracts the executor needs. -->

From GanttChart.tsx (current ref handle type, line 127):
```typescript
export const GanttChart = forwardRef<{ scrollToToday: () => void }, GanttChartProps>(...)
```

The handle currently exposes:
```typescript
useImperativeHandle(ref, () => ({ scrollToToday }), [scrollToToday]);
```

Scroll formula (from scrollToToday — same pattern for scrollToTask):
```typescript
const taskIndex = dateRange.findIndex(day => day.getTime() === taskStartUTC.getTime());
const taskOffset = taskIndex * dayWidth;
const containerWidth = container.clientWidth;
const scrollLeft = Math.round(taskOffset - (containerWidth / 2) + (dayWidth / 2));
container.scrollLeft = Math.max(0, scrollLeft);
```

TaskList passes row callbacks to TaskListRow:
```typescript
// TaskList.tsx — existing prop pattern
onRowClick={handleRowClick}   // (taskId: string) => void
```

TaskListRow number cell (current, line 207-210):
```tsx
<div className="gantt-tl-cell gantt-tl-cell-number">
  {rowIndex + 1}
</div>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add scrollToTask to GanttChart ref handle and export GanttChartHandle type</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx, packages/gantt-lib/src/index.ts</files>
  <action>
In GanttChart.tsx:

1. Extract the handle type into a named exported interface above the component:
```typescript
export interface GanttChartHandle {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
}
```

2. Change `forwardRef<{ scrollToToday: () => void }, GanttChartProps>` to `forwardRef<GanttChartHandle, GanttChartProps>`.

3. Add `scrollToTask` callback using `useCallback`, placed right after `scrollToToday`:
```typescript
const scrollToTask = useCallback((taskId: string) => {
  const container = scrollContainerRef.current;
  if (!container || dateRange.length === 0) return;

  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const taskStart = new Date(task.startDate as string);
  const taskStartUTC = new Date(Date.UTC(
    taskStart.getUTCFullYear(),
    taskStart.getUTCMonth(),
    taskStart.getUTCDate()
  ));
  const taskIndex = dateRange.findIndex(day => day.getTime() === taskStartUTC.getTime());
  if (taskIndex === -1) return;

  const taskOffset = taskIndex * dayWidth;
  const containerWidth = container.clientWidth;
  const scrollLeft = Math.round(taskOffset - (containerWidth / 2) + (dayWidth / 2));
  container.scrollLeft = Math.max(0, scrollLeft);
}, [tasks, dateRange, dayWidth]);
```

4. Update `useImperativeHandle` to include both methods:
```typescript
useImperativeHandle(ref, () => ({ scrollToToday, scrollToTask }), [scrollToToday, scrollToTask]);
```

In index.ts: add `GanttChartHandle` to the GanttChart export line:
```typescript
export { GanttChart, type GanttChartHandle, type Task, type TaskDependency, type GanttChartProps } from './components/GanttChart';
```

Also update the component's re-export via `index.tsx` in the GanttChart folder if needed (check whether GanttChart/index.tsx re-exports the type).
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>GanttChartHandle interface exported, scrollToTask method on ref handle, TypeScript compiles without errors</done>
</task>

<task type="auto">
  <name>Task 2: Wire scrollToTask through TaskList to TaskListRow № cell click</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx, packages/gantt-lib/src/components/TaskList/TaskListRow.tsx, packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
In TaskListRow.tsx:

1. Add `onScrollToTask?: (taskId: string) => void` to `TaskListRowProps`.

2. Accept it in the destructured props.

3. Add a click handler for the № cell that calls `onScrollToTask` and stops propagation (to avoid triggering row selection):
```typescript
const handleNumberClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  onScrollToTask?.(task.id);
}, [task.id, onScrollToTask]);
```

4. Update the № cell to use this handler and give it a button-like cursor style so users understand it's clickable:
```tsx
<div
  className="gantt-tl-cell gantt-tl-cell-number"
  onClick={handleNumberClick}
  style={{ cursor: 'pointer' }}
  title="Перейти к работе"
>
  {rowIndex + 1}
</div>
```

In TaskList.tsx:

1. Add `onScrollToTask?: (taskId: string) => void` to `TaskListProps`.

2. Accept it in the destructured props.

3. Pass it down to each TaskListRow:
```tsx
<TaskListRow
  ...existing props...
  onScrollToTask={onScrollToTask}
/>
```

In GanttChart.tsx:

1. Pass `scrollToTask` down to `TaskList` — add `onScrollToTask={scrollToTask}` prop to the `<TaskList>` JSX element.

Note: TaskListProps already accepts optional props cleanly. No structural changes needed — just pipe the callback through the prop chain.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>Clicking the № cell in the task list scrolls the calendar grid to center the corresponding task bar. TypeScript compiles without errors. scrollToTask can also be called programmatically via `ganttRef.current?.scrollToTask(taskId)`.</done>
</task>

</tasks>

<verification>
After both tasks:
1. TypeScript compiles: `npx tsc --noEmit -p packages/gantt-lib/tsconfig.json` exits 0
2. In the demo app — show task list, click any row number → grid scrolls to center that task bar
3. Via browser console: `ganttRef.current.scrollToTask('some-task-id')` scrolls correctly
4. `scrollToToday` still works (not broken by the handle type change)
</verification>

<success_criteria>
- `GanttChartHandle` interface exported from `gantt-lib` with both `scrollToToday` and `scrollToTask`
- `forwardRef<GanttChartHandle, GanttChartProps>` type-checks correctly
- Clicking № cell scrolls the grid to center that task (horizontally)
- `onScrollToTask` prop chain: GanttChart → TaskList → TaskListRow
- No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/041-scroll-grid-to-task/041-SUMMARY.md`
</output>
