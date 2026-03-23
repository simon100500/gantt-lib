# Ref API

The `GanttChart` component supports an imperative handle via `ref` for programmatic control.

```typescript
interface GanttChartRef {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
  scrollToRow: (taskId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
}
```

Usage example:

```tsx
import { useRef } from 'react';
import { GanttChart } from 'gantt-lib';

function App() {
  const ganttRef = useRef<{ scrollToToday: () => void; scrollToTask: (taskId: string) => void; scrollToRow: (taskId: string) => void; collapseAll: () => void; expandAll: () => void }>(null);

  const handleTodayClick = () => {
    ganttRef.current?.scrollToToday();
  };

  const handleScrollToTask = (taskId: string) => {
    ganttRef.current?.scrollToTask(taskId);
  };

  const handleScrollToRow = (taskId: string) => {
    ganttRef.current?.scrollToRow(taskId);
  };

  const handleCollapseAll = () => {
    ganttRef.current?.collapseAll();
  };

  const handleExpandAll = () => {
    ganttRef.current?.expandAll();
  };

  return (
    <>
      <button onClick={handleTodayClick}>Today</button>
      <button onClick={() => handleScrollToRow('task-1')}>Row</button>
      <button onClick={handleCollapseAll}>Collapse All</button>
      <button onClick={handleExpandAll}>Expand All</button>
      <GanttChart ref={ganttRef} tasks={tasks} />
    </>
  );
}
```

| Method | Return Type | Description |
|---|---|---|
| `scrollToToday()` | `void` | Scrolls the chart horizontally so that today's date is centered in the viewport. If today is not within the visible date range, no action is taken. |
| `scrollToTask(taskId)` | `void` | Scrolls the chart horizontally so that the task bar with the given `taskId` is visible in the grid. If the task ID is not found, no action is taken. |
| `scrollToRow(taskId)` | `void` | Scrolls the task list vertically to the row for the given `taskId` using the current visible row order. If the task ID is not visible, no action is taken. |
| `collapseAll()` | `void` | Collapses all parent tasks in the chart. Hides all child tasks from both the task list and the chart. |
| `expandAll()` | `void` | Expands all parent tasks in the chart. Shows all child tasks in both the task list and the chart. |

---

[← Back to API Reference](./INDEX.md)
