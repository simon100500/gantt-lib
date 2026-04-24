# Phase 30: resource-mode - Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 19 new/modified files
**Analogs found:** 19 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` | component/facade | request-response | `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` | exact existing boundary |
| `packages/gantt-lib/src/components/GanttChart/index.tsx` | route/export | transform | `packages/gantt-lib/src/components/GanttChart/index.tsx` | exact |
| `packages/gantt-lib/src/components/ResourceTimelineChart/ResourceTimelineChart.tsx` | component | request-response | `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`, `TaskRow.tsx`, `GridBackground.tsx`, `TimeScaleHeader.tsx` | role-match |
| `packages/gantt-lib/src/components/ResourceTimelineChart/index.tsx` | route/export | transform | `packages/gantt-lib/src/components/TaskRow/index.tsx`, `GanttChart/index.tsx` | exact export pattern |
| `packages/gantt-lib/src/components/ResourceTimelineChart/ResourceTimelineChart.css` | config/style | transform | `packages/gantt-lib/src/components/GanttChart/GanttChart.css`, `TaskRow.css` | role-match |
| `packages/gantt-lib/src/hooks/useResourceItemDrag.ts` | hook | event-driven | `packages/gantt-lib/src/hooks/useTaskDrag.ts` | role-match |
| `packages/gantt-lib/src/utils/resourceTimelineLayout.ts` | utility | transform | `packages/gantt-lib/src/utils/geometry.ts`, `dateUtils.ts` | role-match |
| `packages/gantt-lib/src/index.ts` | route/export | transform | `packages/gantt-lib/src/index.ts` | exact |
| `packages/gantt-lib/src/types/index.ts` | model | transform | `packages/gantt-lib/src/types/index.ts` | exact |
| `packages/gantt-lib/src/styles.css` | config/style | transform | `packages/gantt-lib/src/styles.css` | exact |
| `packages/gantt-lib/src/__tests__/resourceTimelineLayout.test.ts` | test | transform | `packages/gantt-lib/src/__tests__/geometry.test.ts` | exact utility test pattern |
| `packages/gantt-lib/src/__tests__/resourceTimelineChart.test.tsx` | test | request-response | `packages/gantt-lib/src/__tests__/ganttChartDatePickerTarget.test.tsx` | role-match |
| `packages/gantt-lib/src/__tests__/resourceTimelineDrag.test.tsx` | test | event-driven | `packages/gantt-lib/src/__tests__/useTaskDrag.test.ts` | role-match |
| `packages/gantt-lib/src/__tests__/resourceModeRegression.test.tsx` | test | request-response | `packages/gantt-lib/src/__tests__/dependencyLines.test.tsx` | role-match |
| `packages/gantt-lib/src/__tests__/export-contract.test.ts` | test | transform | `packages/gantt-lib/src/__tests__/export-contract.test.ts` | exact |
| `packages/gantt-lib/README.md` | docs | transform | `packages/gantt-lib/README.md` | exact |
| `docs/reference/04-props.md` | docs | transform | `docs/reference/04-props.md` | exact |
| `docs/reference/09-styling.md` | docs | transform | `docs/reference/09-styling.md` | exact |
| `docs/reference/10-drag-interactions.md` | docs | event-driven | `docs/reference/10-drag-interactions.md` | exact |

## Pattern Assignments

### `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` (component/facade, request-response)

**Analog:** `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`

**Imports pattern** (lines 1-19):
```typescript
'use client';

import React, { useMemo, useCallback, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { getMultiMonthDays, createCustomDayPredicate, type CustomDayConfig, type CustomDayPredicateConfig } from '../../utils/dateUtils';
import { calculateGridWidth } from '../../utils/geometry';
import TimeScaleHeader from '../TimeScaleHeader';
import TaskRow from '../TaskRow';
import TodayIndicator from '../TodayIndicator';
import GridBackground from '../GridBackground';
import './GanttChart.css';
```

**Public prop/type pattern** (lines 117-196):
```typescript
export interface GanttChartProps<TTask extends Task = Task> {
  tasks: TTask[];
  dayWidth?: number;
  rowHeight?: number;
  headerHeight?: number;
  containerHeight?: number | string;
  onTasksChange?: (tasks: TTask[]) => void;
  viewMode?: 'day' | 'week' | 'month';
  disableTaskDrag?: boolean;
  showChart?: boolean;
}
```

**Facade branch rule:** add `mode?: 'gantt'` to current task props and create a discriminated union with `ResourcePlannerChartProps<TItem>`. Route `props.mode === 'resource-planner'` before lines 270-338 destructure `tasks`, normalize hierarchy, and calculate task-mode date range. This prevents resource mode from needing dummy `tasks`.

**Task-only surface to keep out of resource mode** (lines 1042-1168):
```tsx
<TaskList ... />
<DependencyLines ... />
{visibleTasks.map((task, index) => (
  <TaskRow
    key={task.id}
    task={task}
    allTasks={normalizedTasks}
    enableAutoSchedule={enableAutoSchedule ?? false}
  />
))}
```

### `packages/gantt-lib/src/components/ResourceTimelineChart/ResourceTimelineChart.tsx` (component, request-response)

**Analogs:** `GanttChart.tsx`, `TaskRow.tsx`, `GridBackground.tsx`, `TimeScaleHeader.tsx`

**Timeline shell pattern** from `GanttChart.tsx` (lines 1031-1110):
```tsx
<div ref={containerRef} className="gantt-container">
  <div ref={scrollContainerRef} className="gantt-scrollContainer" style={{ height: containerHeight ?? 'auto' }}>
    <div ref={scrollContentRef} className="gantt-scrollContent">
      <div className="gantt-chartSurface" style={{ minWidth: `${gridWidth}px`, flex: 1 }}>
        <div className="gantt-stickyHeader" style={{ width: `${gridWidth}px` }}>
          <TimeScaleHeader days={dateRange} dayWidth={dayWidth} headerHeight={headerHeight} />
        </div>
        <div className="gantt-taskArea" style={{ position: 'relative', width: `${gridWidth}px` }}>
          <GridBackground dateRange={dateRange} dayWidth={dayWidth} totalHeight={totalGridHeight} />
          {todayInRange && <TodayIndicator monthStart={monthStart} dayWidth={dayWidth} />}
        </div>
      </div>
    </div>
  </div>
</div>
```

**Bar rendering pattern** from `TaskRow.tsx` (lines 160-181, 297-310, 361-380):
```tsx
const { left, width } = useMemo(
  () => calculateTaskBar(taskStartDate, taskEndDate, monthStart, dayWidth),
  [taskStartDate, taskEndDate, monthStart, dayWidth]
);

const dateRangeLabel = formatDateRangeLabel(currentStartDate, currentEndDate);

<div
  data-taskbar
  className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''} ${task.locked ? 'gantt-tr-locked' : ''}`}
  style={{
    left: `${visualLeft}px`,
    width: `${visualWidth}px`,
    height: 'var(--gantt-task-bar-height)',
    cursor: dragHandleProps.style.cursor,
    userSelect: dragHandleProps.style.userSelect,
  }}
  onMouseDown={dragHandleProps.onMouseDown}
/>
```

**Resource-specific adjustment:** use `.gantt-resourceTimeline*` classes instead of `.gantt-taskArea`/`.gantt-tr-*`; render a left resource header column and absolute resource item bars inside resource row lanes. `renderItem` should replace only the inner bar content, not the fixed shell geometry.

**Grid/header reuse pattern** from `GridBackground.tsx` and `TimeScaleHeader.tsx` (Grid lines 53-84; Header lines 33-50):
```tsx
const GridBackground: React.FC<GridBackgroundProps> = React.memo(
  ({ dateRange, dayWidth, totalHeight, viewMode = 'day', isCustomWeekend }) => {
    const gridWidth = useMemo(() => Math.round(dateRange.length * dayWidth), [dateRange.length, dayWidth]);
    return <div className="gantt-gb-gridBackground" style={{ width: `${gridWidth}px`, height: `${totalHeight}px` }} />;
  }
);

const TimeScaleHeader: React.FC<TimeScaleHeaderProps> = ({ days, dayWidth, headerHeight, viewMode = 'day' }) => {
  const monthSpans = useMemo(() => getMonthSpans(days), [days]);
  const dayGridTemplate = useMemo(() => `repeat(${days.length}, ${dayWidth}px)`, [days.length, dayWidth]);
};
```

### `packages/gantt-lib/src/hooks/useResourceItemDrag.ts` (hook, event-driven)

**Analog:** `packages/gantt-lib/src/hooks/useTaskDrag.ts`

**Imports and module-level state pattern** (lines 1-4, 83-84, 410-421):
```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

let globalActiveDrag: ActiveDragState | null = null;
let globalRafId: number | null = null;

function ensureGlobalListeners() {
  if (!globalListenersAttached) {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    globalListenersAttached = true;
  }
}
```

**Snap and preview pattern** (lines 128-133, 196-233, 389-395):
```typescript
function snapToGrid(pixels: number, dayWidth: number): number {
  return Math.round(pixels / dayWidth) * dayWidth;
}

const deltaX = e.clientX - startX;
let newLeft = snapToGrid(initialLeft + deltaX, dayWidth);
activeDrag.currentLeft = newLeft;
activeDrag.currentWidth = newWidth;
onProgress(newLeft, newWidth);
```

**Completion pattern** (lines 624-738):
```typescript
const handleComplete = useCallback((finalLeft: number, finalWidth: number) => {
  const dayOffset = Math.round(finalLeft / dayWidth);
  const durationDays = Math.round(finalWidth / dayWidth) - 1;
  const start = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate() + dayOffset));
  const end = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate() + dayOffset + durationDays));
  onDragEnd?.({ id: taskId, startDate: start, endDate: end });
}, [dayWidth, monthStart, onDragEnd, taskId]);
```

**Resource-specific adjustment:** do not import `core/scheduling`, dependency cascade, edge resize, hierarchy, or `Task`. Add `clientY` tracking and row hit-testing from resource row bounds. `readonly` and `item.locked` should gate `handleMouseDown`, matching `effectiveLocked` from lines 533-535 and line 790.

### `packages/gantt-lib/src/utils/resourceTimelineLayout.ts` (utility, transform)

**Analogs:** `packages/gantt-lib/src/utils/geometry.ts`, `dateUtils.ts`

**UTC geometry pattern** from `geometry.ts` (lines 1-40, 140-147):
```typescript
const getUTCDayDifference = (date1: Date, date2: Date): number => {
  const ms1 = Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
  const ms2 = Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
  return Math.round((ms1 - ms2) / (1000 * 60 * 60 * 24));
};

export const calculateTaskBar = (...) => {
  const startOffset = getUTCDayDifference(taskStartDate, monthStart);
  const duration = getUTCDayDifference(taskEndDate, taskStartDate);
  return { left: Math.round(startOffset * dayWidth), width: Math.round((duration + 1) * dayWidth) };
};

export const pixelsToDate = (pixels: number, monthStart: Date, dayWidth: number): Date => {
  const days = Math.round(pixels / dayWidth);
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate() + days));
};
```

**Date parsing and invalid handling boundary** from `dateUtils.ts` (lines 14-26):
```typescript
export const parseUTCDate = (date: string | Date): Date => {
  if (typeof date === 'string') {
    const dateStr = date.includes('T') ? date : `${date}T00:00:00Z`;
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string: ${date}`);
    }
    return parsed;
  }
  return date;
};
```

**Resource-specific adjustment:** catch `parseUTCDate` errors per item and return diagnostics instead of throwing. Sort valid items by start, end, then id. Non-overlap check must be `lastEnd < nextStart`; if `lastEnd === nextStart`, this is an inclusive overlap and needs a new lane.

### Export and model files

**Files:** `components/GanttChart/index.tsx`, `components/ResourceTimelineChart/index.tsx`, `src/index.ts`, `types/index.ts`

**Analog:** `packages/gantt-lib/src/components/GanttChart/index.tsx` (lines 1-2):
```typescript
export { GanttChart } from './GanttChart';
export type { Task, TaskDependency, TaskListMenuCommand, GanttChartProps, GanttChartHandle, ExportToPdfOptions, ExportToPdfHeaderOptions } from './GanttChart';
```

**Root export pattern** from `src/index.ts` (lines 3-13, 22-46):
```typescript
import './styles.css';

export { GanttChart, type Task, type TaskDependency, type GanttChartProps, type GanttChartHandle } from './components/GanttChart';
export { default as TaskRow } from './components/TaskRow';
export { useTaskDrag } from './hooks';
export * from './utils';
export type { GanttDateRange, TaskBarGeometry, GridConfig, MonthSpan, GridLine, WeekendBlock } from './types';
```

**Type style pattern** from `types/index.ts` (lines 1-20, 47-96):
```typescript
export type LinkType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskDependency {
  taskId: string;
  type: LinkType;
  lag: number;
}

export interface Task {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  color?: string;
  locked?: boolean;
}
```

**Resource-specific adjustment:** add `GanttChartMode`, `ResourceTimelineItem`, `ResourceTimelineResource<TItem>`, `ResourceTimelineMove<TItem>`, and `ResourcePlannerChartProps<TItem>` alongside existing exported public types. Keep type-only exports in `index.ts` and component barrel.

### Styling files

**Files:** `src/styles.css`, `components/ResourceTimelineChart/ResourceTimelineChart.css`

**Analog:** `packages/gantt-lib/src/styles.css`, `GanttChart.css`

**Variable pattern** from `styles.css` (lines 4-68):
```css
:root {
  --gantt-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --gantt-grid-line-color: #e0e0e0;
  --gantt-cell-background: #ffffff;
  --gantt-task-bar-default-color: #3b82f6;
  --gantt-task-bar-text-color: #ffffff;
  --gantt-task-bar-border-radius: 4px;
  --gantt-task-bar-height: 24px;
}
```

**Container/layout pattern** from `GanttChart.css` (lines 1-32):
```css
.gantt-container {
  width: 100%;
  font-family: var(--gantt-font-family, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  border: 1px solid var(--gantt-grid-line-color, #e0e0e0);
  background-color: var(--gantt-cell-background, #ffffff);
  border-radius: var(--gantt-container-border-radius, 10px);
  overflow: hidden;
}

.gantt-scrollContent {
  display: flex;
  min-width: min-content;
}
```

**Resource-specific adjustment:** add resource variables in `:root` and put component CSS under `.gantt-resourceTimeline*`. Do not alter `.gantt-taskArea`, `.gantt-tr-*`, or task-list selectors for resource styling.

### Tests

**Utility test analog:** `packages/gantt-lib/src/__tests__/geometry.test.ts` (lines 1-24, 54-69):
```typescript
import { describe, it, expect } from 'vitest';
import { calculateTaskBar } from '../utils/geometry';

describe('calculateTaskBar', () => {
  const monthStart = new Date('2024-03-01T00:00:00Z');
  const dayWidth = 40;

  it('should calculate position for task in middle of month', () => {
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, dayWidth);
    expect(result.left).toBe(360);
    expect(result.width).toBe(240);
  });
});
```

**Component test analog:** `ganttChartDatePickerTarget.test.tsx` (lines 1-5, 55-75, 77-94):
```tsx
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

const Harness = () => {
  const [tasks, setTasks] = React.useState(initialTasks);
  return <GanttChart tasks={tasks} showTaskList={true} onTasksChange={(updatedTasks) => { ... }} />;
};

const { container } = render(<Harness />);
const rows = container.querySelectorAll('.gantt-tl-row');
expect(rows).toHaveLength(2);
```

**Drag test analog:** `useTaskDrag.test.ts` (lines 1-23, 149-187, 214-227):
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return window.setTimeout(() => cb(performance.now()), 16) as unknown as number;
  });
});

act(() => {
  window.dispatchEvent(new MouseEvent('mousemove', { clientX: 360 + 120 + 40 }));
});

act(() => {
  window.dispatchEvent(new MouseEvent('mouseup', {}));
});
```

**Export contract analog:** `export-contract.test.ts` (lines 7-12):
```typescript
describe('Export contract: core/scheduling', () => {
  it('root package exports the public gantt chart API without runtime regressions', async () => {
    const mod = await import('../index');
    expect(mod.GanttChart).toBeDefined();
    expect(mod.TaskList).toBeDefined();
  });
});
```

**Resource-specific test additions:** assert `ResourceTimelineChart` runtime export, resource types compile through public imports, `mode` omitted still renders task mode, and `mode="resource-planner"` does not render `.gantt-dependencyLines*`/task-list surfaces.

### Docs

**README pattern:** `packages/gantt-lib/README.md` (lines 27-64, 66-84)

Add a resource planner quick-start near the existing Quick Start and update the prop table. Use the same concise code block style:
```tsx
import { GanttChart, type ResourceTimelineResource } from "gantt-lib";
import "gantt-lib/styles.css";

<GanttChart
  mode="resource-planner"
  resources={resources}
  onResourceItemMove={handleResourceItemMove}
/>
```

**Props docs pattern:** `docs/reference/04-props.md` (lines 3-40, 43-84)

Add discriminated union examples before the existing table, then a resource-mode prop table. Keep the existing task-mode table intact for backward compatibility.

**Styling docs pattern:** `docs/reference/09-styling.md` (lines 13-40)

Add rows for:
```markdown
| `--gantt-resource-row-header-width` | `240px` | Width of the resource-name column |
| `--gantt-resource-lane-height` | `40px` | Height of each lane inside a resource row |
| `--gantt-resource-bar-radius` | `4px` | Resource assignment bar corner radius |
| `--gantt-resource-bar-conflict-color` | `#ef4444` | Optional conflict marker color |
```

**Drag docs pattern:** `docs/reference/10-drag-interactions.md` (lines 3-18)

Add a separate resource planner section. Preserve the existing task drag semantics and document that resource drag has move-only bars, day snapping, valid row drops only, `readonly`, and `locked`.

## Shared Patterns

### Timeline Dates and Pixels
**Source:** `packages/gantt-lib/src/utils/dateUtils.ts` lines 14-26, 221-276; `geometry.ts` lines 1-40, 140-147
**Apply to:** resource layout utility, resource chart, resource drag

Use UTC parsing, full-month/multi-month date arrays, integer pixel math, and inclusive day width. Catch invalid resource item dates at the resource layer because `parseUTCDate` intentionally throws.

### Rendering Shell
**Source:** `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` lines 1031-1175
**Apply to:** `ResourceTimelineChart`

Reuse `.gantt-container`, scroll container/content, sticky header, `TimeScaleHeader`, `GridBackground`, and `TodayIndicator`. Replace task list/task rows/dependency lines with resource headers and item bars.

### Event-Driven Drag
**Source:** `packages/gantt-lib/src/hooks/useTaskDrag.ts` lines 83-133, 196-233, 410-421, 624-738, 788-902
**Apply to:** `useResourceItemDrag`

Use module-level active drag state, idempotent document/window listeners, RAF-throttled mousemove, snapped pixel movement, and one callback on mouseup. Do not carry over scheduling, dependency, resize, or hierarchy logic.

### Public Export Contract
**Source:** `packages/gantt-lib/src/index.ts` lines 3-13, 22-46; `export-contract.test.ts` lines 7-12
**Apply to:** root exports, component barrel, export regression tests

Public components and types are exported from the root package and verified by dynamic import tests.

### CSS Namespacing
**Source:** `packages/gantt-lib/src/styles.css` lines 4-68; `GanttChart.css` lines 1-32
**Apply to:** resource variables and resource component CSS

Add shared CSS variables in `:root`; component-specific selectors must be namespaced. Resource selectors should start with `.gantt-resourceTimeline`.

## No Analog Found

No files are fully without analog. The resource planner has no exact existing renderer, but each implementation concern maps to a strong local pattern:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `components/ResourceTimelineChart/ResourceTimelineChart.tsx` | component | request-response | No existing multi-lane resource renderer; copy timeline shell/grid/header/bar patterns from task mode. |
| `hooks/useResourceItemDrag.ts` | hook | event-driven | Existing drag hook is task-specific; copy listener/state mechanics only. |
| `utils/resourceTimelineLayout.ts` | utility | transform | No lane layout utility exists; copy UTC/date/pixel conventions from geometry/date utilities. |

## Metadata

**Analog search scope:** `packages/gantt-lib/src`, `packages/gantt-lib/README.md`, `docs/reference`
**Files scanned:** 60+ source/test/docs paths via `rg --files`; 14 analog files read with line numbers
**Pattern extraction date:** 2026-04-24
