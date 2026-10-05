# Dependencies

## TaskDependency Interface

```typescript
interface TaskDependency {
  taskId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag?: number;
}
```

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `taskId` | `string` | yes | — | ID of the **predecessor** task. Must match an `id` in the tasks array. A missing `taskId` reference is reported as a `'missing-task'` validation error. |
| `type` | `'FS' \| 'SS' \| 'FF' \| 'SF'` | yes | — | Dependency link type. Determines which edges are constrained and how lag is calculated. See Section 6 for full semantics. |
| `lag` | `number` | no | `0` | Days of offset. Positive = delay (gap between tasks). Negative values are allowed for some link types, but FS lag is clamped to `0`. **Do not set lag manually** after initial construction — the library recalculates lag automatically on every drag completion. |

---

## Dependency Types — Semantics

Dependencies use standard project management link type semantics. All link types are relative to the predecessor task (A) and successor task (B).

Milestones are zero-duration events. The successor type participates in FS
date calculation: a milestone successor with `lag: 0` is placed on the
predecessor's finish date, while a regular successor starts on the following
day. SS/FF/SF keep their normal start/end anchor rules.

- **Visual**: dependency lines attach to the diamond edges via `calculateMilestoneConnectionBounds()`, offset by half the diamond diagonal (~10px from bar boundary).
- **Cascade**: when a milestone is a predecessor, its `endDate` is treated as equal to `startDate` (zero duration) via `normalizePredecessorDates()`. With `FS lag: 0`, regular successors start on the **next day**; milestone successors can share the milestone's date.
- **Stacked milestones**: when two milestones with a dependency share the same column (same date), the dependency line renders as a straight vertical segment instead of a diagonal chamfer.

### FS — Finish-to-Start

| Property | Value |
|---|---|
| Full name | Finish-to-Start |
| Rule | Regular B: `B.startDate = A.endDate + lag + 1`; milestone B: `B.startDate = A.endDate + lag` |
| Lag formula | Regular B: `lag = startB - endA - 1`; milestone B: `lag = startB - endA` |
| Constrained edge | Left edge (`startDate`) of successor B |
| Example | `{ taskId: 'A', type: 'FS', lag: 0 }` — B starts on or after A ends |

The most common link type. B cannot begin until A finishes. Negative FS lag is treated as invalid and reset to `0`.

---

### SS — Start-to-Start

| Property | Value |
|---|---|
| Full name | Start-to-Start |
| Rule | `B.startDate >= A.startDate + lag` |
| Lag formula | `lag = startB - startA` (floored at 0; SS lag is never negative) |
| Constrained edge | Left edge (`startDate`) of successor B |
| Example | `{ taskId: 'A', type: 'SS', lag: 2 }` — B starts at least 2 days after A starts |

B cannot start until A has started. Lag is always >= 0 — if B is dragged to start before A, the library clamps the lag to 0 (B starts simultaneously with A at minimum).

---

### FF — Finish-to-Finish

| Property | Value |
|---|---|
| Full name | Finish-to-Finish |
| Rule | `B.endDate >= A.endDate + lag` (lag can be negative) |
| Lag formula | `lag = endB - endA` (can be negative) |
| Constrained edge | Right edge (`endDate`) of successor B |
| Example | `{ taskId: 'A', type: 'FF', lag: -1 }` — B ends 1 day before A ends |

B cannot finish until A has finished. Negative lag is valid and means B finishes before A ends.

---

### SF — Start-to-Finish

| Property | Value |
|---|---|
| Full name | Start-to-Finish |
| Rule | `B.endDate <= A.startDate + lag` (lag always <= 0) |
| Lag formula | `lag = endB - startA + 1 day` (ceiling at 0; SF lag is never positive) |
| Constrained edge | Right edge (`endDate`) of successor B — B must finish before A starts |
| Example | `{ taskId: 'A', type: 'SF', lag: 0 }` — B ends adjacent to or before A starts |

Rare link type. B must be complete by the time A begins. Lag ceiling at 0 prevents B from ending after A starts.

---

## Cascade Behavior

When `enableAutoSchedule={true}` and a predecessor is dragged:
- All successor tasks shift automatically to maintain their link constraints
- Dependency lines redraw in real-time during drag (not just on mouseup)
- Without `onScheduleIntent`, when cascade occurs, `onCascade` fires instead of
  `onTasksChange` — they are mutually exclusive per drag event. With
  `onScheduleIntent`, the intent is the scheduling persistence boundary and the
  materialized cascade must not be persisted as a second operation.

---

## Activity Links (v0.143.0)

Works inside a row (`Task.activities`) and explicit activity graphs are joined
by links rendered through the same renderer as ordinary Gantt dependencies, so
styles, arrow markers and chain highlighting match. Rendering is split in two:

- **Row-local sequence** — consecutive works of a row are drawn on the row
  itself. Touching works leave a clean seam without an arrow; a gap produces a
  link exactly the width of that gap. The lag label (`+N`) is a row-local
  element.
- **Explicit graph overlay** — `activityDependencies` (host task IDs + activity
  IDs) is drawn in a chart-wide overlay as orthogonal paths with arrows, lag
  labels and joints. Supplying it (including `[]`) replaces the implicit
  consecutive-row links.

Key properties:

- **Purely visual** — activity links have no hit zones, no button role and no
  hover/click handlers, even when clicking on ordinary dependencies is enabled.
  They never participate in scheduling; `activityChain` governs conveyor
  behavior instead.
- **Joints** — touching FS zero-lag works in the same lane render a small
  rounded dashed joint instead of an arrow.
- **Performance** — lane packing, ports and link paths are computed once for
  the whole graph and reused during horizontal, vertical and diagonal
  scrolling; only visible edges are mounted. The dependency graph rebuilds on
  vertical scroll only.
- **Highlighting** — `activityDependencyHighlight` scopes the drawn edges to a
  selected chain (`'chain'`, `'chain-incoming'`, `'chain-outgoing'`,
  `'chain-all'`).

---

## Editing Dependencies in the Task List (v0.146.0)

With `disableDependencyEditing={false}` (default), dependencies are editable inline in the task list:

- **Chip** — each dependency renders as a chip (`[ОН/НН/ОО/НО] predecessor`). Clicking a chip selects it (the chart highlights the link); clicking again deselects.
- **Edit popover** — a selected chip shows an edit button that opens the dependency popover: a lag stepper (−/value/+ with a plain-language sentence like "start 2 days after start"), the successor and predecessor names, and an actions row.
- **Link type switcher (v0.146.0)** — the compact `[icon] type ▾` button in the bottom-left corner of the popover opens the list of all four link types. The current type is highlighted; a type that already exists between the same task pair is disabled (no duplicate links). Choosing a type updates the dependency **in place** — no delete/re-create needed: the lag value is preserved, the successor dates are rescheduled per the new type's anchor rules, and the popover stays open with the updated sentence and chip.
- **Delete** — "Удалить связь" removes the dependency; the popover closes.

All of the above is hidden when `disableDependencyEditing={true}`.

---

[← Back to API Reference](./INDEX.md)
