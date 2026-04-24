# CSS Variables

Override these in any global CSS file to customize the chart appearance. All overrides must target `:root` or a specific selector enclosing the chart.

```css
:root {
  --gantt-grid-line-color: #e0e0e0;
  --gantt-cell-background: #ffffff;
  /* ... etc */
}
```

| Variable | Default | Controls |
|---|---|---|
| `--gantt-grid-line-color` | `#e0e0e0` | Vertical separator lines between day columns, week starts, and month starts |
| `--gantt-cell-background` | `#ffffff` | Default row background (non-weekend cells) |
| `--gantt-row-hover-background` | `#f8f9fa` | Row background color on mouse hover |
| `--gantt-row-height` | `40px` | Row height (mirrors the `rowHeight` prop — set both consistently) |
| `--gantt-header-height` | `40px` | Header height (mirrors the `headerHeight` prop) |
| `--gantt-day-width` | `40px` | Day column width (mirrors the `dayWidth` prop) |
| `--gantt-task-bar-default-color` | `#3b82f6` | Task bar fill color when `task.color` is not set |
| `--gantt-task-bar-text-color` | `#ffffff` | Text color rendered on task bars |
| `--gantt-task-bar-border-radius` | `4px` | Corner radius of task bar rectangles |
| `--gantt-task-bar-height` | `28px` | Task bar height within its row. Should be less than `--gantt-row-height`. |
| `--gantt-progress-color` | `rgba(0,0,0,0.2)` | Progress bar overlay color when `progress` is > 0 and < 100 |
| `--gantt-progress-completed` | `#fbbf24` | Progress bar color when `progress === 100` and `accepted` is falsy |
| `--gantt-progress-accepted` | `#22c55e` | Progress bar color when `progress === 100` and `accepted === true` |
| `--gantt-expired-color` | `#ef4444` | Background color for expired (overdue) tasks when `highlightExpiredTasks={true}` |
| `--gantt-today-indicator-color` | `#ef4444` | Color of the vertical "today" line |
| `--gantt-today-indicator-width` | `2px` | Width of the vertical "today" line |
| `--gantt-container-border-radius` | `0px` | Border radius of the chart container element |
| `--gantt-parent-bar-color` | `#782fc4` | Color of parent task bars (gradient top section) |
| `--gantt-parent-bar-height` | `20px` | Height of parent task bar top section |
| `--gantt-parent-bar-radius` | `8px` | Corner radius of parent task bar top section |
| `--gantt-parent-ear-depth` | `6px` | Depth of trapezoid "ear" extensions on parent bars |
| `--gantt-parent-ear-width` | `8px` | Width of trapezoid "ear" extensions on parent bars |
| `--gantt-parent-row-bg` | `rgba(99, 102, 241, 0.05)` | Background color of parent rows in task list (subtle indigo tint) |
| `--gantt-baseline-color` | `rgba(71, 85, 105, 0.65)` | Color of the baseline line rendered below task bars |
| `--gantt-baseline-thickness` | `3px` | Thickness of the baseline line |
| `--gantt-baseline-offset` | `2px` | Vertical gap between the task bar and the baseline line |

## Resource Planner Variables

These variables apply to `mode="resource-planner"` and the direct `ResourceTimelineChart` export.

| Variable | Default | Controls |
|---|---|---|
| `--gantt-resource-row-header-width` | `240px` | Width of the left resource-name column. Match the `rowHeaderWidth` prop when overriding structurally. |
| `--gantt-resource-lane-height` | `40px` | Visual lane height for resource item rows. Match the `laneHeight` prop when overriding structurally. |
| `--gantt-resource-bar-radius` | `4px` | Corner radius of resource item bars. |
| `--gantt-resource-bar-conflict-color` | `#ef4444` | Reserved conflict color for consumer-rendered or future conflict states. The built-in resource planner does not reject overlaps. |

Resource item bars also reuse `--gantt-task-bar-default-color` and `--gantt-task-bar-text-color` for default fill and text color.

---

[← Back to API Reference](./INDEX.md)
