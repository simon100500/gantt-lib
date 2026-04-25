# Resource Planner Mode

Resource planner mode renders a timeline where rows are resources and bars are scheduled assignments. Use it when the question is "who or what is booked when?" rather than "which tasks are in the project plan?"

Typical resources are people, crews, rooms, machines, vehicles, or workstations.

## When To Use It

Use resource planner mode for:

- Team or crew schedules
- Equipment reservations
- Room or location bookings
- Assignments that can move across dates
- Assignments that may optionally move between resources

Use the default Gantt mode for:

- Task dependencies
- Parent/child hierarchy
- Critical scheduling cascades
- Task list editing
- Reordering project tasks

Resource planner mode intentionally does not render dependency lines, task list editing, hierarchy, cascade scheduling, resize handles, or task reorder behavior.

## Basic Example

Set `mode="resource-planner"` and pass `resources` instead of `tasks`.

```tsx
import { GanttChart, type ResourceTimelineResource } from 'gantt-lib';
import 'gantt-lib/styles.css';

const resources: ResourceTimelineResource[] = [
  {
    id: 'crew-a',
    name: 'Crew A',
    items: [
      {
        id: 'assignment-1',
        resourceId: 'crew-a',
        title: 'Foundation work',
        subtitle: 'Building 1',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        color: '#2563eb',
      },
    ],
  },
  {
    id: 'crew-b',
    name: 'Crew B',
    items: [],
  },
];

export function Schedule() {
  return (
    <GanttChart
      mode="resource-planner"
      resources={resources}
      dayWidth={36}
      laneHeight={40}
      rowHeaderWidth={180}
    />
  );
}
```

If `mode` is omitted, `GanttChart` stays in the normal task Gantt mode and requires `tasks`.

## Data Model

Resource planner data is a list of resource rows. Each row owns an `items` array.

```ts
type ResourceTimelineResource = {
  id: string;
  name: string;
  items: ResourceTimelineItem[];
};

type ResourceTimelineItem = {
  id: string;
  resourceId: string;
  taskId?: string;
  title: string;
  subtitle?: string;
  startDate: string | Date;
  endDate: string | Date;
  color?: string;
  locked?: boolean;
  metadata?: unknown;
};
```

`resourceId` on each item should match the row that contains it. When an item is moved, the callback gives you the new resource id so your state can move the item into the correct row.

Dates use the same UTC-safe date conventions as task mode. Simple date strings such as `"2026-04-01"` are treated as calendar days.

## Controlled Movement

Resource planner mode is controlled. The chart does not mutate your `resources` array. It emits a move request, and your application decides whether to apply it.

```tsx
import {
  GanttChart,
  type ResourceTimelineMove,
  type ResourceTimelineResource,
} from 'gantt-lib';
import { useState } from 'react';

function Planner() {
  const [resources, setResources] = useState<ResourceTimelineResource[]>(initialResources);

  const handleMove = (move: ResourceTimelineMove) => {
    setResources((current) => {
      const movedItem = {
        ...move.item,
        resourceId: move.toResourceId,
        startDate: move.startDate.toISOString().slice(0, 10),
        endDate: move.endDate.toISOString().slice(0, 10),
      };

      return current.map((resource) => {
        const items = resource.items.filter((item) => item.id !== move.itemId);
        return resource.id === move.toResourceId
          ? { ...resource, items: [...items, movedItem] }
          : { ...resource, items };
      });
    });
  };

  return (
    <GanttChart
      mode="resource-planner"
      resources={resources}
      onResourceItemMove={handleMove}
    />
  );
}
```

`onResourceItemMove` fires once on mouseup. It does not fire during mousemove.

The payload is:

```ts
type ResourceTimelineMove = {
  item: ResourceTimelineItem;
  itemId: string;
  fromResourceId: string;
  toResourceId: string;
  startDate: Date;
  endDate: Date;
};
```

Validate the move before applying it if your app has permissions, capacity limits, resource availability, or conflict rules.

## X-Only Drag

If users should move assignments by date but not between resources, set `disableResourceReassignment`.

```tsx
<GanttChart
  mode="resource-planner"
  resources={resources}
  disableResourceReassignment
  onResourceItemMove={handleMove}
/>
```

With this prop:

- Horizontal drag still changes `startDate` and `endDate`
- Vertical drag is visually locked to the original row
- `toResourceId` stays equal to `fromResourceId`

This is the right default for schedules where assignments belong to a fixed crew or resource and users are only allowed to adjust dates.

## Locked And Readonly States

Use `readonly` to disable all resource item movement:

```tsx
<GanttChart mode="resource-planner" resources={resources} readonly />
```

Use `locked` on one item to disable movement for that item only:

```ts
{
  id: 'assignment-1',
  resourceId: 'crew-a',
  title: 'Approved work',
  startDate: '2026-04-01',
  endDate: '2026-04-05',
  locked: true,
}
```

Readonly and locked items do not start drag operations and do not emit `onResourceItemMove`.

## Lanes And Overlaps

Items in the same resource row are laid out into lanes.

- Non-overlapping items share one lane
- Overlapping items are stacked into additional lanes
- Empty resources still render as visible rows
- Row height grows with lane count

Overlap is inclusive: if one item ends on the same day another item starts, they are treated as overlapping and placed on different lanes.

The chart does not reject overlaps. It displays them. Your application can reject or mark conflicts in `onResourceItemMove` before updating state.

## Custom Item Rendering

Use `renderItem` to replace the inner content of a bar. The chart still controls position, width, height, and drag behavior.

```tsx
<GanttChart
  mode="resource-planner"
  resources={resources}
  renderItem={(item) => (
    <div>
      <strong>{item.title}</strong>
      {item.subtitle && <span>{item.subtitle}</span>}
    </div>
  )}
/>
```

Use `getItemClassName` to add per-item classes:

```tsx
<GanttChart
  mode="resource-planner"
  resources={resources}
  getItemClassName={(item) => item.locked ? 'is-locked' : undefined}
/>
```

Keep custom content compact. It renders inside a fixed bar shell, so long text should truncate or wrap intentionally.

## Sizing Props

| Prop | Default | Purpose |
|---|---:|---|
| `dayWidth` | `40` | Width of one day column in pixels. Drag snaps to this grid. |
| `rowHeaderWidth` | `240` | Width of the resource-name column. |
| `laneHeight` | `40` | Height of one item lane. |
| `headerHeight` | `40` | Height of the time scale header. |

Use smaller `dayWidth` for dense schedules and larger `laneHeight` when custom item content needs more vertical space.

## Styling

Resource planner mode uses the normal chart CSS import:

```tsx
import 'gantt-lib/styles.css';
```

Resource-specific variables:

```css
:root {
  --gantt-resource-row-header-width: 240px;
  --gantt-resource-lane-height: 40px;
  --gantt-resource-bar-radius: 4px;
  --gantt-resource-bar-conflict-color: #ef4444;
}
```

Resource bars also use the default task bar colors when item-specific `color` is not provided:

```css
:root {
  --gantt-task-bar-default-color: #3b82f6;
  --gantt-task-bar-text-color: #ffffff;
}
```

## Direct Component Export

Most users should use `GanttChart` with `mode="resource-planner"`. The specialized renderer is also exported:

```tsx
import { ResourceTimelineChart } from 'gantt-lib';
```

Use the direct export when you are building a resource-only view and do not need the mode switch through `GanttChart`.

## Common Mistakes

### Passing `tasks` to resource mode

Resource mode uses `resources`, not `tasks`.

```tsx
// Correct
<GanttChart mode="resource-planner" resources={resources} />
```

### Expecting built-in resource conflict rejection

The chart displays overlaps but does not reject them. Reject moves in `onResourceItemMove` if your business rules require it.

### Mutating items in place

Return new arrays and objects from your state update. React needs new references to re-render the schedule.

### Forgetting to rebuild local package output

In a monorepo, apps may import the built package output. Rebuild the package after changing the library before testing the app.

## Related Reference

- [GanttChart Props](./04-props.md)
- [Drag Interactions](./10-drag-interactions.md)
- [Styling](./09-styling.md)
