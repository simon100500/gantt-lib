---
phase: quick-041
plan: 01
subsystem: gantt-chart, task-list
tags: [navigation, scroll, ref-handle, imperativeHandle, ux]
dependency_graph:
  requires: []
  provides: [scrollToTask-ref-method, number-cell-scroll-trigger]
  affects: [GanttChart, TaskList, TaskListRow]
tech_stack:
  added: []
  patterns: [useImperativeHandle, useCallback, prop-callback-chain]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/GanttChart/index.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/index.ts
decisions:
  - "scrollToTask mirrors scrollToToday scroll formula — centers task start date in grid horizontally"
  - "handleNumberClick calls e.stopPropagation() to prevent row selection triggering on number click"
  - "GanttChartHandle interface exported from gantt-lib public API for external ref typing"
metrics:
  duration: "~8 min"
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 5
---

# Quick Task 041: Scroll Grid to Task — Summary

**One-liner:** `scrollToTask(taskId)` on GanttChart ref handle + № cell click that centers the task bar horizontally in the calendar grid.

## What Was Built

Added a `scrollToTask` imperative method to the GanttChart ref handle alongside the existing `scrollToToday`. Clicking the row number (№ cell) in the TaskList fires `onScrollToTask` through a prop callback chain, centering the corresponding task bar in the calendar viewport.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Add scrollToTask to GanttChart ref handle, export GanttChartHandle type | d99f407 | GanttChart.tsx, GanttChart/index.tsx, src/index.ts |
| 2 | Wire scrollToTask through TaskList to TaskListRow № cell click | c34f303 | TaskList.tsx, TaskListRow.tsx, GanttChart.tsx |

## Implementation Details

### GanttChartHandle interface (Task 1)

Extracted inline `{ scrollToToday: () => void }` into a named exported interface:

```typescript
export interface GanttChartHandle {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
}
```

`scrollToTask` uses the same centering formula as `scrollToToday`:
- Find task's start date in `dateRange` by UTC timestamp comparison
- Calculate `taskOffset = taskIndex * dayWidth`
- Set `scrollLeft = taskOffset - containerWidth/2 + dayWidth/2`, clamped to 0

### Prop callback chain (Task 2)

`GanttChart` passes `scrollToTask` as `onScrollToTask` to `<TaskList>`.
`TaskList` accepts `onScrollToTask?: (taskId: string) => void` and forwards it to each `<TaskListRow>`.
`TaskListRow` receives `onScrollToTask` and fires it from `handleNumberClick` on the № cell.

```
GanttChart.scrollToTask → TaskList.onScrollToTask → TaskListRow.onScrollToTask
                                                                  ↑
                                                      № cell onClick=handleNumberClick
```

### № cell UX

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

`handleNumberClick` calls `e.stopPropagation()` to prevent the row `onClick` (which triggers task selection) from firing.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript compiles without new errors (`npx tsc --noEmit -p packages/gantt-lib/tsconfig.json` — only pre-existing test/component index errors remain)
- `GanttChartHandle` exported from `gantt-lib` public API (index.ts)
- `scrollToToday` unchanged — still works
- Clicking № cell in TaskList scrolls the grid to center that task bar
- `ganttRef.current?.scrollToTask('task-id')` works programmatically

## Self-Check: PASSED

- packages/gantt-lib/src/components/GanttChart/GanttChart.tsx: modified (GanttChartHandle, scrollToTask, onScrollToTask prop)
- packages/gantt-lib/src/components/GanttChart/index.tsx: modified (GanttChartHandle re-export)
- packages/gantt-lib/src/index.ts: modified (GanttChartHandle public export)
- packages/gantt-lib/src/components/TaskList/TaskList.tsx: modified (onScrollToTask prop)
- packages/gantt-lib/src/components/TaskList/TaskListRow.tsx: modified (onScrollToTask prop, handleNumberClick, № cell click)
- Commits d99f407 and c34f303 exist in git log
