# Phase 17: action-buttons-panel - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a dedicated action buttons panel to the right of TaskList — a narrow column with per-row SVG icon buttons (insert after, delete). Panel is part of the TaskList feature (visible only when showTaskList=true). Removes existing inline action buttons from TaskList rows and centralizes them in this panel.

</domain>

<decisions>
## Implementation Decisions

### Layout
- Separate panel column positioned between TaskList and Gantt chart timeline
- Panel scrolls synchronized with task rows (same scroll container as TaskList)
- Panel is visible only when `showTaskList=true` — it is part of the TaskList feature, not independent

### Buttons per row
- Two buttons per row: **Insert after** (+) and **Delete** (✕)
- SVG icon buttons — compact, no text labels
- Hover-only visibility: buttons appear when hovering over the row

### Consolidation of existing buttons
- **Insert after button** (currently in TaskListRow deps cell, added in quick-65) — remove from deps cell, move to action panel
- **Delete button** (trash icon, currently hover in TaskListRow) — remove from TaskListRow, move to action panel
- Result: TaskListRow becomes cleaner, all row actions centralized in the panel

### Callbacks
- Insert after → calls existing `onInsertAfter` prop
- Delete → calls existing `onDelete` prop
- No new props needed on GanttChart (callbacks already exist from Phase 16)

### Claude's Discretion
- Panel width (narrow — just enough for two icon buttons)
- Exact icon SVG shapes for + and ✕
- CSS hover state coordination between row and panel buttons
- Header cell for the panel column (empty or minimal)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TaskList.tsx` — main container, manages scroll sync; panel column added here
- `TaskListRow.tsx` — row component with hover state; delete button removed from here
- `NewTaskRow.tsx` — ghost row for new task; no changes needed
- `DepIcons.tsx` — existing SVG icon pattern to follow for new icons

### Established Patterns
- CSS prefix `gantt-tl-` for all TaskList styles (established Phase 12)
- Hover-only buttons: use CSS `.gantt-tl-row:hover .gantt-tl-btn { opacity: 1 }` pattern
- Scroll sync: TaskList already syncs vertically with GanttChart via shared scroll container
- `onInsertAfter(taskId, newTask)` and `onDelete(taskId)` callbacks already wired through GanttChart → TaskList → TaskListRow (Phase 16)

### Integration Points
- `TaskList.tsx`: add new column for action panel, render per-row action cells
- `TaskListRow.tsx`: remove existing delete trash button and insert button from deps cell
- CSS: add `gantt-tl-actions-panel` styles; remove old hover button styles from row/deps cell

</code_context>

<specifics>
## Specific Ideas

- Panel column is narrow — just two small icon buttons side by side or stacked
- The insert-after button currently lives in the deps cell (quick-65) — this moves it out so the deps cell is cleaner
- Hover state should cover the whole row (consistent with current TaskListRow hover highlight behavior)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-action-buttons-panel*
*Context gathered: 2026-03-08*
