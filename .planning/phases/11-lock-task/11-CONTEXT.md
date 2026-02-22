# Phase 11: lock-task - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a `locked` boolean prop to the task data model that prevents the user from dragging or resizing the task. Designed for future use with completed work — locked tasks stay fixed regardless of drag attempts. Separate from any `completed` or `accepted` state props.

</domain>

<decisions>
## Implementation Decisions

### Lock scope
- Locked tasks cannot be moved (drag) or resized (resize-left, resize-right)
- Drag and resize interactions are fully blocked — not just constrained
- `locked` is a prop on the task object (independent from `accepted`, `progress`, etc.)

### Visual indicator
- A lock icon appears before the date range text on the task bar
- Icon placement: left of the existing date labels on the task bar

### API surface
- Per-task prop: `locked?: boolean` in the task data model (`GanttTask` type)
- No chart-level lock toggle — control is per task
- Consumer sets `locked: true` in task data to freeze a task

### Claude's Discretion
- Exact lock icon (SVG, emoji, or library icon)
- Cursor style when hovering a locked task (e.g., `not-allowed` or `default`)
- Whether to show any visual feedback on failed drag attempt (e.g., subtle shake or silent ignore)
- Styling of the lock icon (size, color, opacity)

</decisions>

<specifics>
## Specific Ideas

- Use case: completed/accepted work that should not be rescheduled
- `locked` is intentionally independent from `accepted`/`progress` — consumer controls both separately
- Lock icon appears before the date range (left side of the task bar label area)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-lock-task*
*Context gathered: 2026-02-22*
