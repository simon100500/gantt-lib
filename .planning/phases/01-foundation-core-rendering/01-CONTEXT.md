# Phase 1: Foundation & Core Rendering - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

## Phase Boundary

Build a static Gantt chart component with monthly calendar grid and task bars. Component displays tasks positioned by their dates with Excel-like table styling. No interactions yet — that's Phase 2.

## Implementation Decisions

### Grid Layout
- Explicit grid lines like Excel table — clear cell boundaries
- Monthly calendar view showing days as columns
- Row height: medium (~40px) for good readability
- Vertical lines separate days, horizontal lines separate tasks
- Today indicator: vertical line highlighting current date

### Task Bars
- Render task bars as rectangles ("колбаски") positioned by start/end dates
- Task names displayed on or within the bars
- Task bars span full height of their row
- Optional color property for custom styling
- Clean, flat appearance (minimal shadows)

### Date Header
- Month view: show days as columns across the top
- Date format: day number (1, 2, 3...) or "Mon 1", "Tue 2" format
- Header height: reasonable for date labels (~30-40px)
- Weekday indicators optional

### Data API
- Simple array of task objects: `{ id, name, startDate, endDate, color? }`
- Dates as strings or Date objects (component handles conversion)
- All dates processed internally as UTC to prevent DST bugs

### Styling
- CSS variables for theming (colors, grid line width)
- Excel-like appearance: clear borders, grid-based layout
- Font: system sans-serif for compatibility

## Claude's Discretion

- Exact date format in header ("1" vs "Mon 1" vs "Feb 1")
- Task bar color when no color specified
- Whether to show weekends differently
- Empty state display (when no tasks provided)
- Exact pixel measurements for heights/widths
- CSS variable naming scheme

## Specific Ideas

- "Табличный стиль, как будто закрасил в экселе ячейки" — Excel cell appearance is key reference
- Task names should be readable on the bars
- Clean, minimalist aesthetic

## Deferred Ideas

- Task sidebar with names — deferred to v2 (user changed mind, decided on names on bars)
- Drag-and-drop interactions — Phase 2
- Task dependencies — v2 or later

---

*Phase: 01-foundation-core-rendering*
*Context gathered: 2026-02-18*
