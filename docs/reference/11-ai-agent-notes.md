# AI Agent Usage Notes

When generating `Task` arrays for this library, follow these rules to avoid common errors:

**ID format**
- `id` must be a unique string. Use `'1'`, `'2'`, `'3'` or UUIDs. Do not use numbers — the type is `string`.

**Dependency direction**
- Dependencies are defined on the **successor** (the task that depends on something), not on the predecessor.
- `taskId` inside a dependency points to the **predecessor**.

```typescript
// CORRECT: task B depends on task A finishing first (FS)
const tasks: Task[] = [
  { id: 'A', name: 'Task A', startDate: '2026-02-01', endDate: '2026-02-05' },
  {
    id: 'B',
    name: 'Task B',
    startDate: '2026-02-06',
    endDate: '2026-02-10',
    dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }], // B has the dependency
  },
];
```

**Date format**
- Always use `'YYYY-MM-DD'` ISO strings.
- Do not construct `new Date('2026-02-01')` in environments where local timezone matters — use strings.

**Lag**
- Do not calculate or set `lag` manually after drag events — the library recalculates it on every drag completion.
- When constructing initial tasks, `lag: 0` is the standard neutral value. Omitting `lag` is equivalent (defaults to 0).

**onTasksChange vs onCascade**
- When `enableAutoSchedule={true}` and `onCascade` is provided, update your state from `onCascade`, not from `onTasksChange`. They are mutually exclusive per drag event.

**Locked tasks**
- Use `locked: true` to prevent drag, resize, and editing of a task. This is independent from progress and accepted properties.
- When a task is locked, both the task bar and task list cells become non-interactive.

**Task List**
- Enable with `showTaskList={true}` prop. Shows a table on the left with №, Name, Start Date, End Date, Dependencies columns.
- Task list scrolls horizontally in sync with the chart. Row selection highlights both the list row and the task bar.
- **View modes:** Use `showTaskList` and `showChart` props independently:
  - `showTaskList={true} showChart={true}` — Both task list and calendar visible (default)
  - `showTaskList={true} showChart={false}` — Only task list (calendar hidden)
  - `showTaskList={false} showChart={true}` — Only calendar (task list hidden)
- When `showChart={false}`, the task list occupies full width without horizontal scroll sync.
- Inline editing: click to edit, Enter to save, Esc to cancel. Press F2 to enter edit mode for the selected task name.
- **Action Panel:** Hover over any row to reveal "+" (insert) and trash (delete) buttons in the name cell.
  - Click "+" to insert a new task below that row (triggers `onAdd` callback with the task ID).
  - Click trash to delete the task (triggers `onDelete` callback with the task ID).
  - Implement `onAdd` and `onDelete` handlers to manage your tasks array.
- Dependencies column displays chips with SVG icons for link types (FS/SS/FF/SF) and lag values.
- Click on a dependency chip to highlight the corresponding arrow on the chart and scroll to the predecessor task.
- Click the same chip again to toggle off the selection.
- When a dependency chip is selected, the "add link" button is hidden to avoid UI clutter.
- During link creation mode, click the source cell again to cancel (cursor shows pointer, not blocked).
- Click the task number to scroll the chart to that task and highlight the row.
- Use `taskListWidth` to request the panel width (default: 660px). The effective width grows automatically if built-in plus custom columns need more space.
- Use `disableTaskNameEditing={true}` to globally disable name editing.
- Use `disableDependencyEditing={true}` to globally disable dependency editing. Date editing is automatically disabled for locked tasks.

**Scroll to Today / Scroll to Task**
- Use `ref` to access `scrollToToday()`, `scrollToTask(taskId)`, and `scrollToRow(taskId)` methods for programmatic scroll.
- `scrollToToday()` centers the current date in the viewport.
- `scrollToTask(taskId)` scrolls the chart grid to the specified task bar.
- `scrollToRow(taskId)` scrolls the task list to the specified row.
- Example: `ganttRef.current?.scrollToToday()`, `ganttRef.current?.scrollToTask('task-1')`, or `ganttRef.current?.scrollToRow('task-1')`
- **Calendar Navigation Buttons:** The task list header includes quick-jump buttons (-7, -1, Today, +1, +7) for fast navigation. Click to shift the chart view by the specified number of days.

**Collapse/Expand All**
- Use `ref` to access `collapseAll()` and `expandAll()` methods for bulk hierarchy operations.
- `collapseAll()` collapses all parent tasks, hiding their children.
- `expandAll()` expands all parent tasks, showing their children.
- Example: `ganttRef.current?.collapseAll()` or `ganttRef.current?.expandAll()`

**View Mode (Day/Week)**
- Use `viewMode` prop to switch between day and week display modes.
- `viewMode='day'` (default): Shows daily columns with weekend highlighting.
- `viewMode='week'`: Shows weekly columns with weekends skipped. Month separators render at week boundaries for visual clarity.
- Week mode is useful for long-term project views where daily granularity is not required.

**Expired tasks highlight**
- Enable with `highlightExpiredTasks={true}` prop.
- An expired task is one where today is within the task's date range AND progress is less than the elapsed percentage.
- Expired tasks render with the `--gantt-expired-color` background (default: red #ef4444).
- The progress bar for expired tasks displays in a darker red color.

**Progress bar states summary**

| `progress` | `accepted` | Visual Result |
|---|---|---|
| `undefined` or `0` | any | No progress bar rendered |
| 1–99 | any | Partial progress bar in `--gantt-progress-color` |
| `100` | `false` or `undefined` | Full bar in `--gantt-progress-completed` (yellow) |
| `100` | `true` | Full bar in `--gantt-progress-accepted` (green) |

**Task Hierarchy (Parent-Child Relationships)**
- Set `parentId` on a task to make it a child of another task.
- **Parent task bar styling:** Displays with MS Project-style bracket appearance — rounded top bar with trapezoid "ear" extensions on left and right sides. The color is controlled by `--gantt-parent-bar-color` (default: purple #782fc4).
- **Parent row background:** Task list rows for parents display with subtle indigo tint (`--gantt-parent-row-bg`). This helps visually distinguish parent tasks from root and child tasks.
- **Collapse/expand:** Parent tasks show a collapse/expand button (-/+) in the task list. When collapsed, children are hidden from both the task list and the chart.
- **Virtual dependency links:** When a parent is collapsed, dependency lines from hidden children connect to/from the parent's bar edges, maintaining visual continuity of the project network.
- **Child tasks:** Indented in the task list with "⬆" button to promote (remove parentId).
- **Root tasks:** Show "⬇" button to demote (become child of previous task).
- **Drag-and-drop parent inference:** When dragging a task between child tasks, it automatically inherits their parent. If neither task above nor below has a parent, the task becomes root-level.
- **Promote behavior:** Clicking "⬆" moves the task after the last sibling of its current parent and removes `parentId`.
- **Demote behavior:** Clicking "⬇" makes the task a child of the previous task. If the previous task is already a child, the task becomes a sibling (same parent).
- **Implement `onReorder`:** The callback receives `(reorderedTasks, movedTaskId, inferredParentId)`. Update `parentId` of `movedTaskId` to `inferredParentId` (or remove `parentId` if `inferredParentId` is undefined).
- **Implement `onPromoteTask` (optional):** If provided, this callback is called when the user clicks the "⬆" button. Remove `parentId` and optionally reposition the task after its last sibling. If not provided, the library uses internal default logic (calls `onTasksChange` with the updated task).
- **Implement `onDemoteTask` (optional):** If provided, this callback is called when the user clicks the "⬇" button. Set `parentId` to the specified parent task ID. The library automatically removes dependencies between the two tasks to prevent circular references. If not provided, the library uses internal default logic (calls `onTasksChange` with the updated task and parent).
- **Parent date computation:** Parent task dates are automatically computed as the min/max of all child dates. When children are added/removed/moved, parent dates update automatically.
- **Parent progress calculation:** Computed as a weighted average based on child task durations (longer children have more influence on parent progress).
- **Cascade delete:** Deleting a parent task also deletes all its descendants (children and their children). The library also cleans up dependencies pointing to any deleted tasks.
- **Controlled collapse mode:** Pass `collapsedParentIds` Set and `onToggleCollapse` callback to control collapse state from parent component. Omit these props for uncontrolled mode (internal state).

---

## Public Exports

```typescript
// Named exports from 'gantt-lib'
export { GanttChart };              // Main component
export type { Task };               // Task data interface
export type { TaskDependency };     // Dependency link interface
export type { ValidationResult };   // Dependency validation result
export type { DependencyError };    // Individual validation error
```

Import pattern:
```typescript
import { GanttChart, type Task, type TaskDependency, type ValidationResult } from 'gantt-lib';
import 'gantt-lib/styles.css';
```

---

## Performance Notes

- `onTasksChange` fires once on mouseup — not on every drag frame. Safe with 100+ tasks.
- `TaskRow` uses `React.memo` with a custom comparator. Only the dragged row re-renders during drag.
- During cascade drag, chain member rows re-render from CSS transform overrides, not React state updates.
- For very large task lists (500+), consider virtualizing the row container — the library does not virtualize internally.

---

## Known Constraints and Edge Cases

| Scenario | Behavior |
|---|---|
| `tasks` array is empty | Chart renders with no rows. Calendar defaults to the current month. |
| Task with `startDate > endDate` | Undefined visual behavior — the task bar may render with zero or negative width. Always ensure `startDate <= endDate`. |
| Circular dependency (A → B → A) | Reported as `'cycle'` error in `ValidationResult`. Chart still renders but drag constraints may behave unexpectedly. |
| `taskId` in dependency not found | Reported as `'missing-task'` error. The dependency line for that link is not rendered. |
| `disableConstraints={true}` | Drag freely ignores all FS/SS/FF/SF constraints. Validation still runs and reports via `onValidateDependencies`. |
| Two tasks with the same `id` | Undefined behavior — cascade and validation operate on the first match. Always use unique IDs. |
| `dayWidth` below 20 | Day labels in the header become illegible but no error is thrown. Layout still functions. |
| Circular hierarchy (A is parent of B, B is parent of A) | Prevented by `onDemoteTask` — the library detects circular dependencies and blocks the operation. The task remains unchanged. |
| Deleting a parent task | All descendants (children and their children) are also deleted. This is cascade delete behavior. |
| Parent task with no children | Parent displays with its manually set dates (or defaults to current date). Progress is 0 if no children exist. |
| Moving a collapsed parent | All hidden children move with the parent by the same delta. Dependency successors of collapsed children also cascade appropriately. |
| Virtual dependency links | When a parent is collapsed, dependency lines from hidden children connect to/from the parent's edges for visual continuity. |

---

[← Back to API Reference](./INDEX.md)
