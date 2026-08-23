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

## Parent Bar Resize = Subtree Scaling

Parent tasks are computed wrappers: their dates always derive from children. Resizing a parent bar edge therefore does not change the parent's own range — it **proportionally rescales the whole subtree** via `scaleTaskSubtreeDuration` (see [Headless Scheduling Core](./14-headless-scheduling.md), subtreeScaling.ts):

- dragging the **right edge** anchors the start (`anchor: 'start'`), the new target duration comes from the dragged end date;
- dragging the **left edge** anchors the end (`anchor: 'end'`);
- **live preview**: the scaled layout is recomputed on every snapped day during the drag (memoized per target duration) — children follow the dragged edge in real time; the atomic batch commits on `mouseup`;
- leaf durations are scaled by one common factor; positive explicit lags compress only after durations hit their minima; independent branches scale their virtual offsets;
- if the requested duration is below the reachable minimum, the minimal admissible schedule is applied (live, too) and the `onSubtreeScaleResult` prop receives a structured result with `clamped: true` and a `TARGET_CLAMPED_TO_MINIMUM` warning — enough to render a localized notification without parsing dates;
- external successors (tasks outside the subtree that depend on it) are shifted with preserved durations (`cascade-successors` policy); an immutable external successor cancels the operation with `EXTERNAL_DEPENDENCY_CONFLICT` and no changes are emitted;
- moving a parent bar (drag by the middle) keeps the old behavior: descendants shift uniformly, durations unchanged.

### "Сохранять длительность" checkbox (`taskDateChangeMode`)

Parent date edits in the TaskList follow the checkbox:

- **checked (`preserve-duration`)** — двигаем срок: the stage moves so the edited boundary lands on the picked date, duration preserved; descendants shift by the parent's project-day deltas (business days in business mode);
- **unchecked (`free`)** — меняем длительность: the subtree rescales proportionally to the new duration (same as a bar edge resize).

Chart bar edge resize is a resize gesture and always rescales regardless of the checkbox (leaf bars behave the same way: edge drag always resizes).

```tsx
<GanttChart
  tasks={tasks}
  businessDays={false}
  onSubtreeScaleResult={(result) => {
    if (result.ok && result.clamped) {
      const warning = result.warnings[0];
      showToast(`Минимально достижимый срок — ${warning.minimumDuration} дн.`);
    }
  }}
/>
```

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
