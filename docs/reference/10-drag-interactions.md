# Drag Interactions

| User Action | Result |
|---|---|
| Click and drag center of task bar | Move task. Both `startDate` and `endDate` shift by the same delta. Snaps to day boundaries. |
| Click and drag left edge (12px zone) | Resize task start date (earlier or later). Right edge stays fixed. Snaps to day boundaries. |
| Click and drag right edge (12px zone) | Resize task end date (earlier or later). Left edge stays fixed. Snaps to day boundaries. |
| Click and drag empty grid area | Pan (scroll) the chart horizontally and vertically. Cursor changes to `grabbing`. |

**Edge zone priority:** Resize takes priority over move when the cursor is within 12px of either horizontal edge.

**Drag tooltip:** During drag, a tooltip displays the current start and end dates of the task being dragged.

**onTasksChange timing:** `onTasksChange` fires exactly once on `mouseup`, not during drag. This prevents re-render storms when 100+ tasks are in the array. During drag, only the dragged row re-renders internally.

**Snapping:** All drag operations snap to full day boundaries. Sub-day positioning is not supported.

**Milestone drag:** When `type: 'milestone'`, resize is disabled — edge zones are ignored and the drag mode is always `move`. Milestone width is clamped to a single day (`dayWidth` pixels) after every frame, preventing visual stretching during drag. On drop, `endDate` is set equal to `startDate`.

## Resource Planner Drag

For a complete resource planner guide, see [Resource Planner Mode](./15-resource-planner.md).

Resource planner mode uses `onResourceItemMove`, not `onTasksChange`.

| User Action | Result |
|---|---|
| Drag a resource item horizontally | Emits shifted `startDate` and `endDate` on `mouseup`. Movement snaps to day columns and preserves duration. |
| Drag a resource item to another resource row | Emits `fromResourceId` and `toResourceId` so the consumer can validate reassignment before updating state. |
| Drop outside all resource rows | Cancels the drag and emits no callback. |
| Set `readonly={true}` | Prevents all resource item drag starts. |
| Set `item.locked === true` | Prevents drag for that item only. |
| Set `disableResourceReassignment={true}` | Locks drag to the X axis. The item can move by dates, but stays on its source resource. |

`onResourceItemMove` fires once on `mouseup`, never during `mousemove`. The payload contains `item`, `itemId`, `fromResourceId`, `toResourceId`, `startDate`, and `endDate`.

Resource mode does not render dependency lines, resize handles, task list editing, hierarchy/cascade scheduling, or task reorder behavior. The library does not reject overlaps on a target resource; consumers must validate authorization, capacity, and conflicts before applying the move.

---

[← Back to API Reference](./INDEX.md)
