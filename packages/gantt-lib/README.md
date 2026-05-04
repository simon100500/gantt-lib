# gantt-lib

[![Demo](https://img.shields.io/badge/demo-online-brightgreen)](https://gantt-lib-demo.vercel.app/)

`gantt-lib` is a React/Next.js library for planning interfaces. It covers classic Gantt timelines, resource planning screens, and period-based table-matrix views such as finance plans, budgets, and plan-vs-actual layouts.

### Project Timeline

Classic Gantt-style planning for phases, tasks, dates, and dependencies.

![Gantt](https://raw.githubusercontent.com/simon100500/gantt-lib/refs/heads/master/docs/images/screen.png)

### Resource Planner

Dedicated scheduling mode for people, equipment, materials, rooms, and other resources with load visibility and reassignment flows.

![Resources](https://raw.githubusercontent.com/simon100500/gantt-lib/refs/heads/master/docs/images/resource.png)

### Finance Matrix

Period-based table view for budgets, plan-vs-actual, KPIs, and other data-matrix scenarios.

![Finance Matrix](https://raw.githubusercontent.com/simon100500/gantt-lib/refs/heads/master/docs/images/finance.png)

Use it for project timelines, delivery planning, resource allocation, capacity views, and spreadsheet-like matrices that stay aligned with the same left-side task list and time context.

Production-style example: [ai.getgantt.ru](https://ai.getgantt.ru/)

## Features

- 📊 **Classic Gantt chart mode** with tasks, phases, hierarchy, and progress
- ✋ **Drag-and-drop schedule editing** for moving and resizing timeline bars
- 🔗 **Task dependencies and cascade scheduling** for linked plans
- 🗓️ **Calendar and business-day modes** with weekend and custom-day support
- 📋 **Integrated left-side task list** with configurable and hideable columns
- 🔎 **Task filtering, search, and focus flows** for large schedules
- 👥 **Resource planner mode** for people, equipment, rooms, crews, and assignments
- ↔️ **Resource reassignment and date moves** directly on the calendar
- ⚠️ **Resource grouping and conflict-oriented workflows** for capacity views
- 💰 **Table matrix mode** for finance plans, budgets, KPIs, and other period-based data views
- 🎨 **Customizable styling** via CSS variables
- 📦 **Tree-shakeable ESM + CJS builds** with TypeScript types included

## Installation

```bash
npm install gantt-lib
```

## Quick Start

```tsx
import { GanttChart, type Task } from "gantt-lib";
import "gantt-lib/styles.css";
import { useState } from "react";

const initialTasks: Task[] = [
  {
    id: "1",
    name: "Project Kickoff",
    startDate: "2026-02-01",
    endDate: "2026-02-05",
    color: "#10b981",
  },
  {
    id: "2",
    name: "Development",
    startDate: "2026-02-06",
    endDate: "2026-02-20",
  },
];

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);

  return (
    <GanttChart
      tasks={tasks}
      showTaskList
      dayWidth={30}
      rowHeight={36}
      onTasksChange={(changedTasks) => {
        setTasks((prev) => {
          const byId = new Map(prev.map((task) => [task.id, task]));
          for (const task of changedTasks) {
            byId.set(task.id, task);
          }
          return [...byId.values()];
        });
      }}
    />
  );
}
```

## Resource Planner Mode

Use `mode="resource-planner"` when the primary rows are people, equipment, rooms, or other resources instead of tasks. Omitted `mode` still renders the default task Gantt chart.

```tsx
import {
  GanttChart,
  ResourceTimelineChart,
  type ResourceTimelineResource,
} from "gantt-lib";
import "gantt-lib/styles.css";

const resources: ResourceTimelineResource[] = [
  {
    id: "designer",
    name: "Designer",
    items: [
      {
        id: "assignment-1",
        resourceId: "designer",
        title: "Landing page",
        subtitle: "Client A",
        startDate: "2026-04-01",
        endDate: "2026-04-03",
        color: "#2563eb",
      },
    ],
  },
];

export default function Planner() {
  return (
    <GanttChart
      mode="resource-planner"
      resources={resources}
      disableResourceReassignment
      onResourceItemMove={(move) => {
        // Validate authorization/conflicts, then update your resource state.
        console.log(move.itemId, move.fromResourceId, move.toResourceId);
      }}
    />
  );
}
```

`ResourceTimelineChart` is also exported for consumers who want the specialized renderer directly. Resource mode does not render task list editing, dependency lines, hierarchy/cascade scheduling, or task reorder behavior.

See the full guide: [Resource Planner Mode](https://github.com/simon100500/gantt-lib/blob/master/docs/reference/15-resource-planner.md).

## API

### GanttChart

Main component that renders the interactive Gantt chart.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tasks` | `Task[]` | _required_ | Array of task rows shown in gantt mode. |
| `viewMode` | `'day' \| 'week' \| 'month'` | `'day'` | Time scale mode. |
| `dayWidth` | `number` | `40` | Width of one day column in pixels. |
| `rowHeight` | `number` | `40` | Height of one task row. |
| `headerHeight` | `number` | `40` | Height of the time-scale header. |
| `containerHeight` | `number \| string` | `undefined` | Container height in px, `%`, `vh`, or auto. |
| `showTaskList` | `boolean` | `false` | Shows the left-side task list. |
| `showChart` | `boolean` | `true` | Hides the chart area when set to `false`. |
| `showBaseline` | `boolean` | `false` | Renders baselines for tasks with `baselineStartDate` and `baselineEndDate`. |
| `taskListWidth` | `number` | `660` | Requested width of the task list panel. |
| `taskListColumnWidths` | `TaskListColumnWidthMap` | `undefined` | Width overrides for built-in and custom TaskList columns. |
| `businessDays` | `boolean` | `true` | Uses working days instead of calendar days for duration and drag behavior. |
| `disableTaskDrag` | `boolean` | `false` | Disables drag and resize interactions. |
| `onTasksChange` | `(tasks: Task[]) => void` | `undefined` | Receives only changed tasks. Merge them into your state. |
| `enableAutoSchedule` | `boolean` | `false` | Enables dependency-aware cascade scheduling. |
| `disableConstraints` | `boolean` | `false` | Lets tasks move freely, ignoring dependency rules. |
| `onCascade` | `(tasks: Task[]) => void` | `undefined` | Fires with all shifted tasks after a hard cascade drag. |
| `onValidateDependencies` | `(result: ValidationResult) => void` | `undefined` | Receives cycles, missing references, and constraint violations. |

More props, mode-specific APIs, and examples:

- [GanttChart Props](https://github.com/simon100500/gantt-lib/blob/master/docs/reference/04-props.md)
- [Resource Planner Mode](https://github.com/simon100500/gantt-lib/blob/master/docs/reference/15-resource-planner.md)
- [Table Matrix Mode](https://github.com/simon100500/gantt-lib/blob/master/docs/reference/16-table-matrix.md)

### Task

```typescript
interface Task {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  baselineStartDate?: string | Date;
  baselineEndDate?: string | Date;
  type?: 'task' | 'milestone';
  color?: string; // Optional bar color (CSS color value)
  progress?: number;
  accepted?: boolean;
  dependencies?: TaskDependency[];
  locked?: boolean;
  divider?: 'top' | 'bottom';
  parentId?: string;
}
```

Tasks accept ISO strings or `Date` objects, but internal calculations are UTC-safe. Milestones use `type: 'milestone'`. Hierarchy uses `parentId`. Locked tasks cannot be dragged or edited.

### Dependencies

Tasks can have dependencies on predecessor tasks using 4 link types following PM standards:

- **FS (Finish-to-Start)**: Predecessor must finish before successor starts. This is the most common dependency type.
- **SS (Start-to-Start)**: Predecessor and successor start simultaneously.
- **FF (Finish-to-Finish)**: Predecessor and successor finish simultaneously.
- **SF (Start-to-Finish)**: Predecessor must start before successor can finish.

#### TaskDependency Interface

```typescript
interface TaskDependency {
  taskId: string;      // ID of predecessor task
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag?: number;        // Days delay (default: 0); FS lag is clamped to >= 0
}
```

#### Lag

- **Positive lag**: Delays the successor (e.g., lag: 2 means successor starts 2 days after constraint is satisfied)
- **Negative lag**: Allowed for SS/FF/SF links. FS negative lag is reset to 0 to prevent predecessor/successor overlap.

#### Example

```tsx
const tasks: Task[] = [
  {
    id: "1",
    name: "Foundation",
    startDate: "2026-02-01",
    endDate: "2026-02-10",
  },
  {
    id: "2",
    name: "Construction",
    startDate: "2026-02-11",
    endDate: "2026-02-25",
    dependencies: [
      { taskId: "1", type: "FS" }  // Starts after Foundation finishes
    ],
  },
];
```

### Cascade Scheduling

Cascade scheduling automatically shifts dependent tasks when a predecessor task is moved or resized. This ensures dependency relationships remain valid during editing.

- **enableAutoSchedule**: Enable cascade scheduling by setting this prop to `true`
- **onCascade**: Callback that receives all shifted tasks (including the dragged task) when cascade completes
- **Hard mode**: Dependency constraints are enforced during drag (default). Tasks cannot violate dependencies.
- **Soft mode**: Set `disableConstraints` to `true` to allow violations during editing; lag values are recalculated on completion

Example with cascade scheduling enabled:

```tsx
<GanttChart
  tasks={tasks}
  enableAutoSchedule={true}
  onCascade={(shiftedTasks) => {
    console.log(`${shiftedTasks.length} tasks were shifted`);
  }}
  onTasksChange={(changedTasks) => {
    // Keep your normal merge handler for non-cascade edits.
    console.log(changedTasks);
  }}
/>
```

### Dependency Examples

#### Simple FS Dependency

The most common dependency type - successor starts after predecessor finishes:

```tsx
{
  id: "framing",
  name: "Framing",
  startDate: "2026-02-01",
  endDate: "2026-02-10",
},
{
  id: "roofing",
  name: "Roofing",
  startDate: "2026-02-11",
  endDate: "2026-02-20",
  dependencies: [
    { taskId: "framing", type: "FS" }  // Starts after framing ends
  ],
}
```

#### SS with Negative Lag (Overlap)

Start-to-Start dependency allows tasks to overlap. Negative lag pulls the successor start earlier:

```tsx
{
  id: "plumbing",
  name: "Plumbing",
  startDate: "2026-02-10",
  endDate: "2026-02-20",
  dependencies: [
    { taskId: "framing", type: "SS", lag: -3 }  // Start 3 days before framing ends
  ],
}
```

#### Multiple Dependencies

A task can wait for multiple predecessors to complete:

```tsx
{
  id: "inspection",
  name: "Final Inspection",
  startDate: "2026-02-25",
  endDate: "2026-02-26",
  dependencies: [
    { taskId: "plumbing", type: "FS" },
    { taskId: "electrical", type: "FS" },
    { taskId: "roofing", type: "FF", lag: 2 },  // Finish 2 days after roofing
  ],
}
```

#### Mixed Link Types

Different relationship types for complex scheduling:

```tsx
{
  id: "painting",
  name: "Painting",
  startDate: "2026-02-15",
  endDate: "2026-02-25",
  dependencies: [
    { taskId: "drywall", type: "SS", lag: 2 },      // Start 2 days after drywall starts
    { taskId: "priming", type: "FS" },              // Start after priming finishes
  ],
}
```

### Dependency Validation

The library automatically validates dependencies and detects issues:

- **Cycles**: Circular dependencies (A -> B -> A) are detected and highlighted in red
- **Missing tasks**: References to non-existent task IDs are reported
- **Constraint violations**: When tasks violate their dependencies during drag

Use the `onValidateDependencies` callback to handle validation results:

```tsx
<GanttChart
  tasks={tasks}
  onValidateDependencies={(result) => {
    if (!result.isValid) {
      result.errors.forEach(error => {
        console.error(`Task ${error.taskId}: ${error.message}`);
      });
    }
  }}
/>
```

#### ValidationResult Interface

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: DependencyError[];
}

interface DependencyError {
  type: 'cycle' | 'constraint' | 'missing-task';
  taskId: string;
  message: string;
  relatedTaskIds?: string[];
}
```

## Customization

### CSS Variables

Override these CSS variables to customize the appearance:

```css
:root {
  /* Grid Colors */
  --gantt-grid-line-color: #e0e0e0;
  --gantt-cell-background: #ffffff;
  --gantt-row-hover-background: #f8f9fa;

  /* Dimensions */
  --gantt-row-height: 30px;
  --gantt-header-height: 40px;
  --gantt-day-width: 30px;

  /* Task Bar Styling */
  --gantt-task-bar-default-color: #3b82f6;
  --gantt-task-bar-text-color: #ffffff;
  --gantt-task-bar-border-radius: 4px;
  --gantt-task-bar-height: 24px;

  /* Progress Bar */
  --gantt-progress-color: rgba(0, 0, 0, 0.2); /* In-progress overlay */
  --gantt-progress-completed: #fbbf24; /* 100% but not accepted */
  --gantt-progress-accepted: #22c55e; /* 100% and accepted */

  /* Today Indicator */
  --gantt-today-indicator-color: rgba(255, 0, 0, 0.2);
  --gantt-today-indicator-width: 2px;

  /* Calendar Grid - Weekend */
  --gantt-weekend-background: #fff9f8;
  --gantt-weekend-border: #fca5a5;

  /* Calendar Grid - Separators */
  --gantt-month-separator-width: 2px;
  --gantt-month-separator-color: #a1a1a1;
  --gantt-week-separator-width: 1px;
  --gantt-week-separator-color: #f3f4f6;
  --gantt-day-line-width: 1px;
  --gantt-day-line-color: #f3f4f6;
}
```

### Example: Dark Theme

```css
:root {
  --gantt-cell-background: #1f2937;
  --gantt-grid-line-color: #374151;
  --gantt-task-bar-default-color: #3b82f6;
  --gantt-weekend-background: #374151;
}
```

## Peer Dependencies

- `react` >= 18
- `react-dom` >= 18

## Dependencies

- `date-fns` ^4.1.0

## License

MIT

## GitHub

[https://github.com/simon100500/gantt-lib](https://github.com/simon100500/gantt-lib)
