# Plan-Fact Mode

`mode="plan-fact"` renders the standard left-side `TaskList` with a daily input matrix on the right. Each task row is split visually into two right-side subrows:

- top: planned quantity
- bottom: actual quantity

The left task list still has one row per task. Use `additionalColumns` for unit, owner, contractor, or other domain fields.

## Data Shape

Plan-fact values live on the task object:

```tsx
type WorkTask = Task & {
  unit: string;
  planByDate?: Record<string, number>;
  factByDate?: Record<string, number>;
};
```

Date keys use `YYYY-MM-DD`.

## Example

```tsx
<GanttChart<WorkTask>
  mode="plan-fact"
  tasks={tasks}
  showTaskList={true}
  taskListWidth={560}
  rowHeight={46}
  dayWidth={42}
  additionalColumns={[
    {
      id: 'unit',
      header: 'Ед.',
      width: 72,
      after: 'name',
      renderCell: ({ task }) => task.unit,
    },
  ]}
  hiddenTaskListColumns={['dependencies', 'progress', 'duration', 'startDate', 'endDate']}
  onTasksChange={(changedTasks) => {
    setTasks((current) => current.map((task) => {
      const changedTask = changedTasks.find((candidate) => candidate.id === task.id);
      return changedTask ? { ...task, ...changedTask } : task;
    }));
  }}
/>
```

## Behavior

- Planned days are highlighted from `task.startDate` through `task.endDate`.
- Both plan and fact can be entered on any visible date, including dates outside the task range.
- Parent rows are readonly and do not display numeric totals because child rows may use different units.
- Empty input removes the date key from `planByDate` or `factByDate`.
- Values must be non-negative numbers; comma and dot decimals are accepted.

## Keyboard

- Click focuses a cell.
- Double-click, `Enter`, or `F2` starts editing.
- Typing a number starts editing from that character.
- `Backspace` or `Delete` clears the cell.
- Arrow keys move between dates, plan/fact subrows, and task rows.

## Related Docs

- [GanttChart Props](./04-props.md)
- [TaskList Columns](./13-tasklist-columns.md)
- [Table Matrix Mode](./16-table-matrix.md)

---

[← Back to API Reference](./INDEX.md)
