# Ref API

The `GanttChart` component supports an imperative handle via `ref` for programmatic control.

```typescript
interface GanttChartHandle {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
  scrollToRow: (taskId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  exportToPdf: (options?: ExportToPdfOptions) => Promise<void>;
}

interface ExportToPdfOptions {
  header?: ExportToPdfHeaderOptions;
  fileName?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  includeTaskList?: boolean;
  includeChart?: boolean;
}

interface ExportToPdfHeaderOptions {
  logoUrl?: string;
  logoHref?: string;
  serviceName?: string;
  serviceHref?: string;
  projectName?: string;
  exportDate?: string | Date;
}
```

Usage example:

```tsx
import { useRef } from 'react';
import { GanttChart, type GanttChartHandle } from 'gantt-lib';

function App() {
  const ganttRef = useRef<GanttChartHandle>(null);

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
| `exportToPdf(options?)` | `Promise<void>` | Opens the browser print dialog with the chart rendered for PDF export. Accepts optional [`ExportToPdfOptions`](#exporttopdfoptions). |

## ExportToPdfOptions

| Option | Type | Default | Description |
|---|---|---|---|
| `header` | `ExportToPdfHeaderOptions` | `undefined` | Structured header block rendered above the chart in the exported document. |
| `fileName` | `string` | `undefined` | Suggested file name used as the browser print/PDF document title. |
| `title` | `string` | `undefined` | Human-readable document title rendered above the exported chart. |
| `orientation` | `'portrait' \| 'landscape'` | `undefined` | Optional PDF page orientation hint for the browser print layout. If omitted, the browser print dialog keeps orientation under user control. |
| `includeTaskList` | `boolean` | mirrors current config | Whether to include the task list area in the exported document. |
| `includeChart` | `boolean` | mirrors current config | Whether to include the timeline/chart area in the exported document. |

## ExportToPdfHeaderOptions

| Option | Type | Description |
|---|---|---|
| `logoUrl` | `string` | Logo image URL or data URI displayed on the left of the header. |
| `logoHref` | `string` | Optional link for the logo. |
| `serviceName` | `string` | Service/product name displayed in the header. |
| `serviceHref` | `string` | Optional link for the service name. |
| `projectName` | `string` | Project/document name displayed in the header. |
| `exportDate` | `string \| Date` | Export date shown on the right; a `Date` is formatted automatically, a `string` is rendered as-is. |

---

[← Back to API Reference](./INDEX.md)
