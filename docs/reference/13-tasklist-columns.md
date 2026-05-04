# TaskList Columns

`GanttChart` supports custom TaskList columns through the `additionalColumns` prop. Custom columns are resolved together with the built-in TaskList columns in one shared pipeline.

## Import

Use the package root export:

```ts
import { GanttChart, type Task, type TaskListColumn } from 'gantt-lib';
```

Do not use legacy deep imports.

## Built-In Order

The built-in TaskList columns are resolved in this base order:

1. `selection` (only when `enableTaskMultiSelect={true}`)
2. `number`
3. `name`
4. `startDate`
5. `endDate`
6. `duration`
7. `progress`
8. `dependencies`
9. `actions`

Your custom columns are inserted relative to this order with `before` / `after`.

## Column Contract

```ts
type BuiltInTaskListColumnId =
  | 'selection'
  | 'number'
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'duration'
  | 'progress'
  | 'dependencies'
  | 'actions';

type TaskListColumnAnchor =
  | { after: BuiltInTaskListColumnId | string }
  | { before: BuiltInTaskListColumnId | string }
  | {};

interface TaskListColumnContext<TTask extends Task> {
  task: TTask;
  rowIndex: number;
  isEditing: boolean;
  editStartValue?: string;
  openEditor: () => void;
  closeEditor: () => void;
  updateTask: (patch: Partial<TTask>) => void;
}

interface TaskListColumn<TTask extends Task> extends TaskListColumnAnchor {
  id: string;
  header: React.ReactNode;
  width?: number;
  minWidth?: number;
  editable?: boolean;
  renderCell: (ctx: TaskListColumnContext<TTask>) => React.ReactNode;
  renderEditor?: (ctx: TaskListColumnContext<TTask>) => React.ReactNode;
  meta?: Record<string, unknown>;
}

type TaskListColumnId = BuiltInTaskListColumnId | string;

type TaskListColumnWidthMap = Partial<Record<TaskListColumnId, number>>;
```

The `selection` column is only present when `enableTaskMultiSelect={true}`. It is placed before `number` and can still be hidden with `hiddenTaskListColumns={['selection']}`.

## Placement Rules

- `after: 'name'` inserts a column immediately after the built-in `name` column.
- `before: 'progress'` inserts a column immediately before the built-in `progress` column.
- You can also anchor relative to another custom column by its `id`.
- If no anchor is provided, the column falls back to insertion after `name`.
- If an anchor is invalid or missing, the column also falls back to after `name`.
- Multiple columns with the same anchor preserve consumer-provided order.

## Hiding Columns

Use `hiddenTaskListColumns` to hide any resolved TaskList column by id. The prop works for both built-in columns and custom `additionalColumns`.

Column placement is resolved first, then hidden columns are filtered out. This means custom columns can still anchor to a column that is hidden in a particular view without changing their relative order.

```tsx
<GanttChart
  tasks={tasks}
  showTaskList
  additionalColumns={additionalColumns}
  hiddenTaskListColumns={['duration', 'progress', 'assignee']}
/>
```

Built-in column ids:

- `number`
- `name`
- `startDate`
- `endDate`
- `duration`
- `progress`
- `dependencies`

## Example

```tsx
import { useState } from 'react';
import { GanttChart, type Task, type TaskListColumn } from 'gantt-lib';

type MyTask = Task & {
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
};

export function MyChart() {
  const [tasks, setTasks] = useState<MyTask[]>([
    {
      id: 't1',
      name: 'Design API',
      startDate: '2026-03-27',
      endDate: '2026-04-03',
      assignee: 'Alice',
      priority: 'high',
    },
  ]);

  const additionalColumns: TaskListColumn<MyTask>[] = [
    {
      id: 'assignee',
      header: 'Assignee',
      width: 120,
      after: 'name',
      renderCell: ({ task }) => task.assignee ?? '—',
      renderEditor: ({ task, updateTask, closeEditor }) => (
        <input
          autoFocus
          defaultValue={task.assignee ?? ''}
          onBlur={(e) => {
            updateTask({ assignee: e.target.value || undefined });
            closeEditor();
          }}
        />
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      width: 90,
      after: 'assignee',
      renderCell: ({ task }) => task.priority ?? 'low',
      renderEditor: ({ task, updateTask, closeEditor }) => (
        <select
          autoFocus
          defaultValue={task.priority ?? 'low'}
          onChange={(e) => {
            updateTask({
              priority: e.target.value as MyTask['priority'],
            });
            closeEditor();
          }}
        >
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
      ),
    },
  ];

  return (
    <GanttChart<MyTask>
      tasks={tasks}
      showTaskList
      additionalColumns={additionalColumns}
      onTasksChange={(changed) =>
        setTasks((prev) => {
          const byId = new Map(prev.map((task) => [task.id, task]));
          for (const task of changed) {
            byId.set(task.id, task);
          }
          return [...byId.values()];
        })
      }
    />
  );
}
```

## Editing Model

- Custom editors use `renderEditor`.
- Only one editor is open per row at a time.
- Only one custom cell is active globally at a time. Arrow keys move the active cell across custom columns and rows.
- `openEditor()` and `closeEditor()` are provided in the column context.
- `updateTask(patch)` emits a merged task object through `onTasksChange`.
- `patch` is typed as `Partial<TTask>`, so extended task fields stay typed.

## Active Custom Cell Management

The TaskList now keeps a global "active custom cell" state for custom columns. This is internal behavior, but it affects how keyboard editing works.

- Click a custom editable cell to make it active.
- Double-click, `Enter`, or `F2` opens its editor.
- `Backspace` or `Delete` opens the editor with an empty starting value.
- Typing a printable character opens the editor and seeds it through `editStartValue`.
- Arrow keys move focus between custom cells in the custom-column grid.
- Clicking outside custom cells clears the active-cell state.

This makes custom TaskList columns behave more like spreadsheet cells without exposing extra controlled props in the public API.

### `editStartValue`

`TaskListColumnContext` now includes `editStartValue?: string`. Use it when your editor should start with the typed key or with an explicit empty value after `Delete` / `Backspace`.

```tsx
renderEditor: ({ task, editStartValue, updateTask, closeEditor }) => (
  <input
    autoFocus
    defaultValue={editStartValue ?? task.assignee ?? ''}
    onBlur={(e) => {
      updateTask({ assignee: e.target.value || undefined });
      closeEditor();
    }}
  />
)
```

## Width Model

- `width` is numeric and interpreted as pixels.
- String widths such as `'120px'` are not part of the supported API.
- The task list width grows automatically when the sum of resolved columns exceeds the requested `taskListWidth`.
- Built-in and custom widths can be overridden with `taskListColumnWidths`.
- Each header cell has a drag handle for interactive resize; persist that state through `onTaskListColumnWidthsChange`.

```tsx
const [taskListColumnWidths, setTaskListColumnWidths] = useState({
  name: 280,
  assignee: 180,
});

<GanttChart
  tasks={tasks}
  showTaskList
  additionalColumns={additionalColumns}
  taskListColumnWidths={taskListColumnWidths}
  onTaskListColumnWidthsChange={setTaskListColumnWidths}
/>
```

## Migration Note

The old editor field is no longer supported.

Old:

```ts
{
  id: 'assignee',
  header: 'Assignee',
  renderCell: ...,
  editor: ...
}
```

New:

```ts
{
  id: 'assignee',
  header: 'Assignee',
  renderCell: ...,
  renderEditor: ...
}
```

If you are migrating old code:

- rename `editor` to `renderEditor`
- keep using `before` / `after`
- convert string widths to numeric widths
- import `TaskListColumn` from `gantt-lib`

---

[← Back to API Reference](./INDEX.md)
