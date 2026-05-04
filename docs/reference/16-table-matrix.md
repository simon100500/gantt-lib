# Table Matrix Mode

`mode="table-matrix"` combines the standard left-side `TaskList` with a custom right-side matrix. It is useful for finance plans, cost breakdowns, periodized budgets, and other spreadsheet-like layouts where the right side is not a time bar chart.

## Import

```tsx
import {
  GanttChart,
  type Task,
  type TaskListColumn,
  type TableMatrixCellClickContext,
  type TableMatrixColumn,
  type TableMatrixColumnGroup,
} from 'gantt-lib';
```

`TableMatrix` is also exported directly, but most consumers should use `GanttChart mode="table-matrix"` because it keeps selection, hover, filtering, row heights, and the left `TaskList` integrated.

## When To Use It

- A normal `gantt` chart when the right side should render draggable bars over dates.
- `table-matrix` when the right side should render arbitrary cells such as weekly budgets, monthly fact/plan values, rates, quantities, or KPIs.

## Minimal Example

```tsx
import { useMemo, useState } from 'react';
import {
  GanttChart,
  type Task,
  type TaskListColumn,
  type TableMatrixColumn,
  type TableMatrixColumnGroup,
} from 'gantt-lib';
import 'gantt-lib/styles.css';

type FinanceTask = Task & {
  owner: string;
  budget: number;
  plannedByPeriod: Record<string, number>;
};

const initialTasks: FinanceTask[] = [
  {
    id: 'phase-1',
    name: 'Подготовительный этап',
    startDate: '2026-04-01',
    endDate: '2026-04-20',
    owner: 'Контур 0',
    budget: 2750000,
    plannedByPeriod: {
      '2026-04-w1': 950000,
      '2026-04-w2': 600000,
    },
  },
];

const matrixColumns: TableMatrixColumn<FinanceTask>[] = [
  {
    id: '2026-04-w1',
    header: '01-07',
    groupId: '2026-04',
    width: 'auto',
    minWidth: 92,
    maxWidth: 160,
    renderCell: (task) => task.plannedByPeriod['2026-04-w1'] ?? '',
  },
  {
    id: '2026-04-w2',
    header: '08-14',
    groupId: '2026-04',
    width: 'auto',
    minWidth: 92,
    maxWidth: 160,
    renderCell: (task) => task.plannedByPeriod['2026-04-w2'] ?? '',
  },
];

const matrixColumnGroups: TableMatrixColumnGroup[] = [
  { id: '2026-04', header: 'Апрель 2026' },
];

export default function FinanceMatrix() {
  const [tasks, setTasks] = useState(initialTasks);

  const additionalColumns = useMemo<TaskListColumn<FinanceTask>[]>(() => [
    {
      id: 'owner',
      header: 'Ответственный',
      width: 140,
      after: 'name',
      renderCell: ({ task }) => task.owner,
    },
    {
      id: 'budget',
      header: 'Бюджет',
      width: 120,
      align: 'right',
      after: 'owner',
      renderCell: ({ task }) => task.budget.toLocaleString('ru-RU'),
    },
  ], []);

  return (
    <GanttChart<FinanceTask>
      mode="table-matrix"
      tasks={tasks}
      showTaskList={true}
      taskListWidth={620}
      rowHeight={36}
      rowContentLines={1}
      matrixColumns={matrixColumns}
      matrixColumnGroups={matrixColumnGroups}
      additionalColumns={additionalColumns}
      hiddenTaskListColumns={['dependencies', 'progress', 'duration', 'startDate', 'endDate']}
      disableTaskDrag={true}
      hideTaskListRowActions={true}
      onMatrixCellClick={({ task, column }) => {
        console.log(task.id, column.id);
      }}
      onTasksChange={(changedTasks) => {
        setTasks((prev) => {
          const byId = new Map(prev.map((task) => [task.id, task]));
          for (const task of changedTasks) {
            byId.set(task.id, task);
          }
          return [...byId.values()];
        });
      }}
    />
  );
}
```

## Core Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `mode` | `'table-matrix'` | required | Enables matrix mode. |
| `matrixColumns` | `TableMatrixColumn<TTask>[]` | required | Defines every visible matrix column. |
| `matrixColumnGroups` | `TableMatrixColumnGroup[]` | `undefined` | Optional top header row for grouped columns. |
| `onMatrixCellClick` | `(context) => void` | `undefined` | Makes matrix cells clickable and gives row/column context. |
| `rowContentLines` | `number` | `1` | Controls auto row-height expansion for multi-line content. |
| `disableTaskDrag` | `boolean` | `false` | Often set to `true` in matrix presentations. |
| `hideTaskListRowActions` | `boolean` | `false` | Hides insert/delete/hierarchy buttons in the left panel. |

All common task-mode props such as `tasks`, `showTaskList`, `taskListWidth`, `additionalColumns`, `hiddenTaskListColumns`, `taskFilter`, `highlightedTaskIds`, and `onTasksChange` still apply.

## Matrix Column Widths

Matrix columns support fixed pixel widths and content-sized widths:

```tsx
const matrixColumns: TableMatrixColumn<FinanceTask>[] = [
  {
    id: '2026-04',
    header: 'Апрель',
    width: 'auto',
    minWidth: 104,
    maxWidth: 220,
    renderCell: (task) => task.plannedByPeriod['2026-04']?.toLocaleString('ru-RU') ?? '',
  },
  {
    id: '2026-05',
    header: 'Май',
    width: 140,
    renderCell: (task) => task.plannedByPeriod['2026-05']?.toLocaleString('ru-RU') ?? '',
  },
];
```

- `width: number` keeps the historical fixed-width behavior.
- `width: 'auto'` sizes the column from its header and visible cell content.
- `minWidth` prevents tiny columns for mostly-empty periods.
- `maxWidth` caps unusually large values so one cell does not expand the whole matrix indefinitely.

Matrix cell padding can be tuned with CSS variables:

```css
.finance-matrix {
  --gantt-matrix-cell-horizontal-padding: 8px;
  --gantt-matrix-cell-vertical-padding: 0;
}
```

## Clickable Cells

Matrix cells become interactive when you pass `onMatrixCellClick`.

```tsx
onMatrixCellClick={({ task, column, rowIndex, columnIndex, event }) => {
  openCellDrawer({
    taskId: task.id,
    periodId: column.id,
    rowIndex,
    columnIndex,
    x: event.clientX,
    y: event.clientY,
  });
}}
```

The click context includes:

- `task`: the clicked row object
- `column`: the clicked `TableMatrixColumn`
- `rowIndex`: visible row index
- `columnIndex`: visible matrix column index
- `event`: original `React.MouseEvent`

## Auto Row Height Sync

`rowContentLines` was added for table-like layouts where row content can span multiple lines.

- `rowHeight` remains the minimum requested row height.
- The component also computes an effective minimum based on `rowContentLines`.
- The left `TaskList` and right matrix/chart both use the same effective row height.

Practical pattern:

- `rowContentLines={1}` for one-line numbers or labels
- `rowContentLines={2}` when a cell can show a value plus a secondary line such as `% бюджета`

```tsx
<GanttChart
  mode="table-matrix"
  rowHeight={36}
  rowContentLines={showSecondaryLine ? 2 : 1}
  matrixColumns={matrixColumns}
/>
```

## FinancePlanMatrixDemo

The website demo [`FinancePlanMatrixDemo`](../../packages/website/src/components/FinancePlanMatrixDemo.tsx) shows the intended composition pattern for finance planning:

- left-side hierarchy in `TaskList`
- custom `additionalColumns` such as owner, budget, paid
- grouped weekly or monthly matrix columns
- `rowContentLines` toggled between `1` and `2`
- `disableTaskDrag={true}` to avoid accidental drag while working with cells
- `hideTaskListRowActions={true}` for a spreadsheet-like presentation
- `onMatrixCellClick` used to open a modal with cell details

## MoneyValue Helper

`MoneyValue` is used in `FinancePlanMatrixDemo`, but it is not an exported library component. It is a demo-local rendering helper for formatted money values.

Use the same pattern in your app:

```tsx
function MoneyValue({ value }: { value: number }) {
  return <span>{value.toLocaleString('ru-RU')}</span>;
}
```

This keeps the library API focused while still giving a concrete finance-oriented example.

## Related Docs

- [GanttChart Props](./04-props.md)
- [TaskList Columns](./13-tasklist-columns.md)

---

[← Back to API Reference](./INDEX.md)
