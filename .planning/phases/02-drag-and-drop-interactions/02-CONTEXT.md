# Phase 2: Drag-and-Drop Interactions - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

## Phase Boundary

Interactive task bar manipulation via drag operations. Users can move task bars horizontally to change start/end dates, and drag edges to resize. Component must maintain 60fps performance with ~100 tasks. Parent receives updated task data via onChange callback after drag completes.

## Implementation Decisions

### Drag affordance
- Entire task bar is clickable and draggable (no separate drag handle)
- Cursor changes to `pointer` when hovering over task bar
- Visual hover feedback: shadow or transparency change
- Touch devices: long press to enter drag mode

### Resize zones
- Only edges (10-15px zone) respond to resize operations
- Visible markers displayed on left and right edges of task bar
- Minimum width constraint: 1 day (cell width)
- Resize has priority over move when cursor is on edge zone

### Snap & timing
- Tasks snap to start of day (grid cell boundaries)
- onChange callback fires only on drop (not during drag)
- Visual updates happen in real-time during drag
- Other tasks don't react or highlight during drag operations

### Visual feedback
- During move: bar itself moves, appears solid, old position is not shown
- During resize: edge follows cursor in real-time
- Date tooltip shown during drag (shows new start/end dates)
- Full date format in tooltip (e.g., "15 февраля" or "February 15")

### Claude's Discretion
- Exact hover visual style (shadow vs transparency vs border)
- Marker design for resize edges (dots, lines, handles)
- Tooltip positioning and timing
- Touch long-press duration
- Edge zone exact width (10-15px range)

## Specific Ideas

- "The bar should feel tangible/solid during drag, not ghost-like"
- Date tooltips should use full format for readability
- Long press for touch prevents accidental drags

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 02-drag-and-drop-interactions*
*Context gathered: 2026-02-19*
