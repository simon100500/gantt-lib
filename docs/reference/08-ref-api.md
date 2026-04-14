# Ref API

The `GanttChart` component supports an imperative handle via `ref` for programmatic control.

```typescript
interface GanttChartHandle {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
  scrollToRow: (taskId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  exportToSvg: (options?: GanttSvgExportOptions) => string;
  downloadSvg: (options?: DownloadGanttSvgOptions) => void;
  exportToPdf: (options?: ExportToPdfOptions) => Promise<void>;
}

interface DownloadGanttSvgOptions extends GanttSvgExportOptions {
  fileName?: string;
}

interface GanttSvgExportOptions {
  width?: number;
  dayWidth?: number;
  rowHeight?: number;
  headerHeight?: number;
  taskListWidth?: number;
  includeTaskList?: boolean;
  includeChart?: boolean;
  padding?: number;
  title?: string;
  subtitle?: string;
  header?: ExportToPdfHeaderOptions;
  viewMode?: 'day' | 'week' | 'month';
  businessDays?: boolean;
  collapsedParentIds?: Set<string>;
  highlightedTaskIds?: Set<string>;
  highlightExpiredTasks?: boolean;
  showTodayIndicator?: boolean;
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
| `exportToSvg(options?)` | `string` | Returns a standalone SVG string for vector export. The SVG contains the task list, chart grid, bars, milestones, dependency lines, text labels, collapsed state, and current view mode. |
| `downloadSvg(options?)` | `void` | Immediately downloads the generated SVG file in the browser without opening the print dialog. |
| `exportToPdf(options?)` | `Promise<void>` | Opens the browser print dialog with the chart rendered for PDF export. Accepts optional [`ExportToPdfOptions`](#exporttopdfoptions). |

## GanttSvgExportOptions

| Option | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | natural content width | Total SVG width. When set together with chart export, the timeline scales to fit. |
| `dayWidth` | `number` | current chart config | Width of each day column in pixels. |
| `rowHeight` | `number` | current chart config | Height of each row in pixels. |
| `headerHeight` | `number` | current chart config | Height of the timeline header in pixels. |
| `taskListWidth` | `number` | current chart config | Width of the task-list area in pixels. |
| `includeTaskList` | `boolean` | mirrors current config | Whether to include the task list area. |
| `includeChart` | `boolean` | mirrors current config | Whether to include the timeline/chart area. |
| `padding` | `number` | `24` | Outer padding around the exported document. |
| `title` | `string` | `undefined` | Main export title rendered in the SVG header block. |
| `subtitle` | `string` | `undefined` | Secondary line rendered under the title. |
| `header` | `ExportToPdfHeaderOptions` | `undefined` | Shared branding/header block data for SVG and PDF export. |
| `viewMode` | `'day' \| 'week' \| 'month'` | current chart config | Timeline header mode used in the exported SVG. |
| `businessDays` | `boolean` | current chart config | Whether durations are rendered in business days. |
| `collapsedParentIds` | `Set<string>` | current chart state | Collapsed hierarchy state used to determine visible rows and virtual dependency routing. |
| `highlightedTaskIds` | `Set<string>` | current chart state | Highlighted rows included in the export. |
| `highlightExpiredTasks` | `boolean` | current chart config | Whether overdue tasks use expired styling in the export. |
| `showTodayIndicator` | `boolean` | `true` | Whether to draw the vertical today line when today is inside the visible range. |

## DownloadGanttSvgOptions

All [`GanttSvgExportOptions`](#ganttsvgexportoptions) plus:

| Option | Type | Default | Description |
|---|---|---|---|
| `fileName` | `string` | `'gantt-chart.svg'` | Downloaded SVG file name. `.svg` is added automatically when missing. |

## ExportToPdfOptions

| Option | Type | Default | Description |
|---|---|---|---|
| `header` | `ExportToPdfHeaderOptions` | `undefined` | Structured header block rendered above the chart in the exported document. |
| `fileName` | `string` | `undefined` | Suggested file name used as the browser print/PDF document title. |
| `title` | `string` | `undefined` | Human-readable document title rendered above the exported chart. |
| `orientation` | `'portrait' \| 'landscape'` | `'landscape'` | PDF page orientation used for the browser print layout. |
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
