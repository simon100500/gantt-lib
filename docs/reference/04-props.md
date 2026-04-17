# GanttChart Props

```typescript
interface GanttChartProps<TTask extends Task = Task> {
  tasks: TTask[];
  dayWidth?: number;
  rowHeight?: number;
  headerHeight?: number;
  containerHeight?: number | string;
  viewMode?: 'day' | 'week' | 'month';
  onTasksChange?: (tasks: TTask[]) => void;
  onAdd?: (task: TTask) => void;
  onDelete?: (taskId: string) => void;
  onInsertAfter?: (taskId: string, newTask: TTask) => void;
  onReorder?: (tasks: TTask[], movedTaskId?: string, inferredParentId?: string) => void;
  onPromoteTask?: (taskId: string) => void;
  onDemoteTask?: (taskId: string, newParentId: string) => void;
  onValidateDependencies?: (result: ValidationResult) => void;
  enableAutoSchedule?: boolean;
  disableConstraints?: boolean;
  onCascade?: (tasks: Task[]) => void;
  showTaskList?: boolean;
  showChart?: boolean;
  taskListWidth?: number;
  disableTaskNameEditing?: boolean;
  disableDependencyEditing?: boolean;
  disableTaskDrag?: boolean;
  highlightExpiredTasks?: boolean;
  collapsedParentIds?: Set<string>;
  onToggleCollapse?: (parentId: string) => void;
  enableAddTask?: boolean;
  taskFilter?: TaskPredicate;
  highlightedTaskIds?: Set<string>;
  customDays?: CustomDayConfig[];
  isWeekend?: (date: Date) => boolean;
  businessDays?: boolean;
  additionalColumns?: TaskListColumn<TTask>[];
  taskListMenuCommands?: TaskListMenuCommand<TTask>[];
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `tasks` | `Task[]` | required | Array of tasks to display. Row order in the chart matches array order (index 0 is the top row). |
| `dayWidth` | `number` | `40` | Width of each day column in pixels. In `'week'` view mode, this represents the width of a week column. Minimum effective value is approximately 20px — below that, day labels become illegible. |
| `viewMode` | `'day' \| 'week' \| 'month'` | `'day'` | View mode for the time scale. `'day'` = daily columns (default), `'week'` = weekly columns with weekends skipped, `'month'` = one column per calendar month. See Section 7.1 for implementation details. |
| `rowHeight` | `number` | `40` | Height of each task row in pixels. Also controls the task bar vertical position within the row. |
| `headerHeight` | `number` | `40` | Height of the time-scale header (month + day rows) in pixels. |
| `containerHeight` | `number \| string` | `undefined` | Container height. Can be pixels (`600`), string (`"90vh"`, `"100%"`, `"500px"`), or `undefined` for auto height (adapts to content). |
| `onTasksChange` | `(tasks: Task[]) => void` | `undefined` | Called when tasks are modified. **Receives ONLY the changed tasks** (never the full array unless all actually changed). Single task = array of 1 element. Consumer must merge changed tasks into state. See Section 13 for usage patterns. |
| `onAdd` | `(task: Task) => void` | `undefined` | Called when user adds a new task. The library creates a task with auto-generated ID and default dates. Consumer adds the task to the array. |
| `onDelete` | `(taskId: string) => void` | `undefined` | Called when user clicks the trash icon in the task list action panel. Receives the `taskId` of the task to delete. The library automatically cleans up dependencies pointing to this task. |
| `onInsertAfter` | `(taskId: string, newTask: Task) => void` | `undefined` | Called when user clicks the "+" insert button in the action panel. Receives the `taskId` to insert after and the `newTask` object. After insertion, the new task automatically enters edit mode (managed internally by the component). |
| `onReorder` | `(tasks: Task[], movedTaskId?: string, inferredParentId?: string) => void` | `undefined` | Called when tasks are reordered via drag-and-drop in the task list. `movedTaskId` is the ID of the dragged task. `inferredParentId` is the parent ID inferred from the drop position (undefined if dropped at root level). **Implementation:** update `parentId` of `movedTaskId` to `inferredParentId` (or remove `parentId` if `inferredParentId` is undefined). |
| `onPromoteTask` | `(taskId: string) => void` | `undefined` | Called when user clicks the "⬆" button to promote a child task to root level. **Optional** — if not provided, the library uses internal default logic (calls `onTasksChange` with the promoted task and reorders the task array). |
| `onDemoteTask` | `(taskId: string, newParentId: string) => void` | `undefined` | Called when user clicks the "⬇" button to make a task a child of the previous task. `newParentId` is the ID of the parent task. **Optional** — if not provided, the library uses internal default logic (calls `onTasksChange` with the demoted task and updated parent, removes dependencies between tasks to prevent circular references). |
| `onValidateDependencies` | `(result: ValidationResult) => void` | `undefined` | Called every time the tasks array changes. Receives a `ValidationResult` with all dependency errors (cycles, constraint violations, missing task references). |
| `enableAutoSchedule` | `boolean` | `false` | When `true` (hard mode): dragging a predecessor cascades all successor tasks to maintain their constraints. Dependency lines redraw in real-time during drag. |
| `disableConstraints` | `boolean` | `false` | When `true`: all drag constraint checks are skipped. Tasks can be placed freely, ignoring all dependency rules. Useful for debugging layouts or building unconstrained editors. |
| `onCascade` | `(tasks: Task[]) => void` | `undefined` | Called when a cascade drag completes in hard mode (`enableAutoSchedule={true}`). Receives all affected tasks including the dragged task. **When `onCascade` fires, `onTasksChange` does NOT fire for that drag.** Use `onCascade` to update state in hard mode. |
| `showTaskList` | `boolean` | `false` | When `true`, displays the TaskList panel on the left side of the chart. Built-in columns are resolved through the same pipeline as `additionalColumns`. The task list supports inline editing, hierarchy actions, and synchronized scrolling. |
| `showChart` | `boolean` | `true` | When `false`, hides the calendar chart area (timeline grid, task bars, dependencies). Useful for displaying only the task list. Combine with `showTaskList={false}` to show only the calendar. |
| `taskListWidth` | `number` | `660` | Requested width of the task list panel in pixels. Only effective when `showTaskList={true}`. Actual width grows automatically when resolved built-in + custom columns require more space. |
| `disableTaskNameEditing` | `boolean` | `false` | When `true`, task names cannot be edited in the task list. Date editing is also disabled for locked tasks (see `task.locked` property). |
| `disableDependencyEditing` | `boolean` | `false` | When `true`, dependency editing is disabled in the task list. Users cannot add, remove, or modify dependencies via the UI. |
| `disableTaskDrag` | `boolean` | `false` | When `true`, all drag and resize operations on the calendar grid are disabled. Useful for preventing accidental task movement during panning. Cursor shows `grab` instead of `not-allowed` to allow panning. |
| `highlightExpiredTasks` | `boolean` | `false` | When `true`, tasks that are behind schedule are visually highlighted. An expired task is one where today's date is within the task's date range and the current progress is less than the elapsed percentage. Expired tasks render with the `--gantt-expired-color` background. |
| `collapsedParentIds` | `Set<string>` | `undefined` | Set of parent task IDs that are collapsed (children hidden). Pass `undefined` for uncontrolled mode (internal state). |
| `onToggleCollapse` | `(parentId: string) => void` | `undefined` | Called when user clicks collapse/expand button on a parent task. Receives the `parentId` of the parent being toggled. Required for controlled mode when providing `collapsedParentIds`. |
| `enableAddTask` | `boolean` | `true` | When `true`, shows the "+ Добавить задачу" button at the bottom of the task list for adding new tasks. |
| `taskFilter` | `TaskPredicate` | `undefined` | Predicate function to filter tasks. Receives a `Task | undefined`, returns `true` to show the task, `false` to hide it. **Import:** `import { type TaskPredicate } from 'gantt-lib'`. See Section 7.3 for usage and ready-made filters. |
| `highlightedTaskIds` | `Set<string>` | `undefined` | Task IDs to highlight in the task list. Useful for external search results or navigation state without hiding other rows. Used with `filterMode='highlight'`. |
| `filterMode` | `'highlight' \| 'hide'` | `'highlight'` | Filter display mode. `'highlight'` shows yellow highlight on matching tasks (default). `'hide'` hides non-matching tasks from view. Use with `filteredTaskIds` and `isFilterActive`. |
| `filteredTaskIds` | `Set<string>` | `undefined` | Task IDs that match the filter. In `'hide'` mode with `isFilterActive={true}`, only these tasks are visible. In `'highlight'` mode, these tasks are highlighted with yellow background. |
| `isFilterActive` | `boolean` | `false` | Whether filter is currently active. Needed to distinguish "no filter" from "filter with no matches". When `true` and `filterMode='hide'`, non-matching tasks are hidden. |
| `customDays` | `CustomDayConfig[]` | `undefined` | Array of custom day configurations with explicit types. Each entry: `{ date: Date, type: 'weekend' | 'workday' }`. **IMPORTANT:** Use UTC dates: `{ date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' }` for March 8, 2026. See Section 7.2 for details. |
| `isWeekend` | `(date: Date) => boolean` | `undefined` | Optional base weekend predicate for flexible logic (e.g., Sunday-only weekends, 4-day work week). **Checked BEFORE customDays overrides** — use for base patterns, then override specific dates with `customDays`. Receives a UTC `Date` object, return `true` for weekends, `false` for workdays. |
| `businessDays` | `boolean` | `true` | Когда `true` (default), длительность задачи (duration) считается в рабочих днях, исключая выходные. Когда `false`, длительность считается в календарных днях. Влияет на расчёт зависимостей, перетаскивание задач и отображение длительности. См. раздел 7.5. |
| `additionalColumns` | `TaskListColumn<TTask>[]` | `undefined` | Additional TaskList columns resolved together with the built-in columns. Use `renderCell` / `renderEditor` and place them with `before` / `after`. See [TaskList Columns](./13-tasklist-columns.md). |
| `taskListMenuCommands` | `TaskListMenuCommand<TTask>[]` | `undefined` | Additional commands for the TaskList three-dots menu. Each command receives the current row in `onSelect(row)`, can render an `icon`, and may be restricted by `scope`: `'group'`, `'linear'`, `'milestone'`, or `'all'`. When `scope` is omitted, the command is shown for all task types. |

**Important — calendar range:** The visible date range is calculated automatically from the earliest `startDate` to the latest `endDate` across all tasks. The chart always shows complete calendar months. For example, if tasks span March 25 to May 5, the chart renders March 1 through May 31. There is no `month` prop.

**Milestone note:** If a task uses `type: 'milestone'`, the chart renders it as a single-date diamond (14px) and TaskList editing keeps `startDate` and `endDate` synchronized. Milestone drag is move-only (resize disabled). Dependency lines attach to diamond edges. With `enableAutoSchedule`, milestone predecessors with `lag: 0` schedule successors on the same day. Duration column shows `0`; editing duration to `>0` converts milestone to task and vice versa. See [Task Interface — Milestones](./02-task-interface.md#milestones-v0700).

## TaskList Menu Commands

Use `taskListMenuCommands` to add custom actions to the standard TaskList row menu (`...`).

```typescript
type TaskListMenuCommand<TTask extends Task = Task> = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: (row: TTask) => void;
  isVisible?: (row: TTask) => boolean;
  isDisabled?: (row: TTask) => boolean;
  scope?: 'all' | 'group' | 'linear' | 'milestone';
  danger?: boolean;
  closeOnSelect?: boolean;
};
```

- `scope` is optional. Omit it to show the command for all rows.
- `scope: 'group'` shows the command only for parent/group rows.
- `scope: 'linear'` shows the command only for regular non-parent, non-milestone rows.
- `scope: 'milestone'` shows the command only for tasks with `type: 'milestone'`.
- `isVisible` and `isDisabled` run per row and can be combined with `scope`.

Example:

```tsx
<GanttChart
  tasks={tasks}
  showTaskList={true}
  taskListMenuCommands={[
    {
      id: 'expand-with-ai',
      label: 'Expand with AI',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
        </svg>
      ),
      scope: 'group',
      onSelect: (row) => openPromptModal(row),
    },
    {
      id: 'rename-milestone',
      label: 'Rename milestone',
      scope: 'milestone',
      onSelect: (row) => openRenameDialog(row),
    },
  ]}
/>
```

## TaskList Columns

Use `additionalColumns` when you need custom fields in the task list.

- Import `TaskListColumn` from the package root: `import { type TaskListColumn } from 'gantt-lib'`.
- The canonical editor property is `renderEditor`.
- The old `editor` property is not supported anymore.
- `width` should be a number in pixels.
- Columns are resolved in one pipeline with built-in columns and may be positioned with `before` / `after`.

See the full guide in [TaskList Columns](./13-tasklist-columns.md).

---

## View Modes — Implementation Guide

The Gantt chart supports three time-scale view modes via the `viewMode` prop:

| Mode | Column Width | Header Row 1 | Header Row 2 | Use Case |
|------|--------------|--------------|--------------|----------|
| `day` | 1 day (default 40px) | Month names | Day numbers | Detailed daily planning |
| `week` | 7 days | Month names (spanning weeks) | Week start dates | Weekly sprint planning |
| `month` | 1 calendar month | Year names | Month names | High-level roadmap view |

**Architecture Overview:**

View modes are implemented across three components with a shared date array (`days`) generated by `getMultiMonthDays()`:

1. **TimeScaleHeader** — renders the two-row header
2. **GridBackground** — renders vertical grid lines
3. **TaskRow** — positions task bars and renders dependencies

**Adding a New View Mode:**

To add a new view mode (e.g., `'quarter'`, `'year'`), follow these steps:

**Step 1: Update type definitions**

```typescript
// src/types.ts
export type ViewMode = 'day' | 'week' | 'month' | 'quarter'; // Add your mode

// src/components/TimeScaleHeader/TimeScaleHeader.tsx
export interface TimeScaleHeaderProps {
  viewMode?: ViewMode; // Use the shared type
}
```

**Step 2: Add date utility functions**

Create block/span calculation functions in `src/utils/dateUtils.ts`:

```typescript
// Example: Quarter mode
export interface QuarterBlock {
  year: number;
  quarter: number; // 1-4
  startMonth: number; // 0-11
  months: number[]; // Month indices in this quarter
}

export const getQuarterBlocks = (days: Date[]): QuarterBlock[] => {
  const quarters = new Map<string, QuarterBlock>();

  days.forEach(day => {
    const year = day.getFullYear();
    const month = day.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const key = `${year}-Q${quarter}`;

    if (!quarters.has(key)) {
      quarters.set(key, {
        year,
        quarter,
        startMonth: (quarter - 1) * 3,
        months: []
      });
    }

    const block = quarters.get(key)!;
    if (!block.months.includes(month)) {
      block.months.push(month);
    }
  });

  return Array.from(quarters.values());
};

export const getQuarterSpans = (days: Date[]): Span[] => {
  // Group quarters by year for row 1 header
  // Return: [{ start, end, label: '2025' }, ...]
};
```

**Step 3: Update TimeScaleHeader component**

```typescript
// src/components/TimeScaleHeader/TimeScaleHeader.tsx
const TimeScaleHeader: React.FC<TimeScaleHeaderProps> = ({
  days,
  dayWidth,
  headerHeight,
  viewMode = 'day',
}) => {
  // Add your mode calculation
  const quarterBlocks = useMemo(
    () => (viewMode === 'quarter' ? getQuarterBlocks(days) : []),
    [days, viewMode]
  );

  // Calculate column widths for grid template
  const quarterColumnWidths = useMemo(
    () => quarterBlocks.map(b => b.months.length * 30 * dayWidth), // ~30 days/month
    [quarterBlocks, dayWidth]
  );

  // In JSX: render your mode-specific header
  return (
    <div className="gantt-tsh-header">
      {/* Row 1: Years */}
      {/* Row 2: Quarters */}
    </div>
  );
};
```

**Step 4: Update GridBackground component**

```typescript
// src/components/GridBackground/GridBackground.tsx
// Add similar logic to render vertical lines at your mode's boundaries
```

**Step 5: Update TaskRow component**

```typescript
// src/components/TaskRow/TaskRow.tsx
// Adjust task bar width calculation based on viewMode
// For quarter mode: bar width = (days in quarter) * dayWidth
```

**Step 6: Add CSS styling (if needed)**

```css
/* src/components/TimeScaleHeader/TimeScaleHeader.css */
.gantt-tsh-quarter-block {
  /* Custom styles for quarter columns */
}
```

**Key Implementation Notes:**

1. **Date Array**: All modes use the same `days` array from `getMultiMonthDays()` — each element is one calendar day. Your mode groups these days into larger blocks.

2. **Grid Template**: Use CSS Grid with variable column widths:
   ```css
   grid-template-columns: 120px 90px 60px 91px ...;
   ```

3. **dayWidth Interpretation**:
   - `day` mode: each column = `dayWidth` pixels
   - `week` mode: each column = `7 * dayWidth` pixels (approximately)
   - `month` mode: each column = `(days in month) * dayWidth` pixels
   - Your mode: define your own calculation

4. **Span Calculation**: Row 1 spans over row 2 columns. Use the `*Blocks` functions for row 2, then group them for row 1.

**Example: Adding Month Mode (Reference Implementation)**

The month view mode was added following this pattern:

1. `getMonthBlocks()` — returns one block per calendar month
2. `getYearSpans()` — groups month blocks by year
3. TimeScaleHeader renders year names (row 1) spanning month columns (row 2)
4. GridBackground renders year boundary lines (thick) and month separators
5. TaskRow adjusts bar width to cover full month width

**Related Files:**
- `src/utils/dateUtils.ts` — Date calculation utilities
- `src/components/TimeScaleHeader/TimeScaleHeader.tsx` — Header rendering
- `src/components/GridBackground/GridBackground.tsx` — Grid lines
- `src/components/TaskRow/TaskRow.tsx` — Task bar positioning
- `src/components/GanttChart/GanttChart.tsx` — View mode prop propagation

---

[← Back to API Reference](./INDEX.md)
