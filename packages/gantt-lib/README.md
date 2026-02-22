# gantt-lib

[![Demo](https://img.shields.io/badge/demo-online-brightgreen)](https://gantt-lib-demo.vercel.app/)

![Screenshot](https://raw.githubusercontent.com/simon100500/gantt-lib/refs/heads/master/docs/images/screen.png)

Lightweight React Gantt chart component library with drag-and-drop task management.

## Features

- 📊 **Interactive Gantt chart** with drag-and-drop task management
- 🎨 **Customizable** via CSS variables
- 📅 **Multi-month calendar grid** with two-row header (month + day)
- 🌈 **Weekend highlighting** with customizable colors
- 📍 **Today indicator** vertical line
- 📈 **Progress bars** with accepted/completed states
- ⚡ **Performance optimized** for ~100 tasks at 60fps
- 📦 **Tree-shakeable** ESM + CJS builds
- ✅ **TypeScript** types included

## Installation

```bash
npm install gantt-lib
```

## Quick Start

```tsx
import { GanttChart, type Task } from "gantt-lib";
import "gantt-lib/styles.css";

const tasks: Task[] = [
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
  const handleChange = (updated: Task[] | ((prev: Task[]) => Task[])) => {
    // Handle task updates
    setTasks(updated);
  };

  return (
    <GanttChart
      tasks={tasks}
      dayWidth={30}
      rowHeight={36}
      onChange={handleChange}
    />
  );
}
```

## API

### GanttChart

Main component that renders the interactive Gantt chart.

| Prop                    | Type                                          | Default    | Description                                             |
| ----------------------- | --------------------------------------------- | ---------- | ------------------------------------------------------- |
| `tasks`                 | `Task[]`                                      | _required_ | Array of tasks to display                                |
| `dayWidth`              | `number`                                      | `40`       | Width of each day column in pixels                      |
| `rowHeight`             | `number`                                      | `40`       | Height of each task row in pixels                       |
| `headerHeight`          | `number`                                      | `40`       | Height of the header row in pixels                      |
| `containerHeight`       | `number`                                      | `600`      | Container height for vertical scrolling                 |
| `onChange`              | `(tasks: Task[] \| Task[] => Task[]) => void` | _required_ | Callback when tasks are modified                        |
| `enableAutoSchedule`    | `boolean`                                     | `false`    | Enable automatic shifting of dependent tasks when predecessor moves (cascade) |
| `onCascade`             | `(tasks: Task[]) => void`                     | _undefined_ | Callback when cascade drag completes; receives all shifted tasks including the dragged task |
| `disableConstraints`    | `boolean`                                     | `false`    | Disable dependency constraint checking during drag (allows violations during editing) |
| `onValidateDependencies`| `(result: ValidationResult) => void`          | _undefined_ | Callback for dependency validation results (cycles, missing tasks, constraint violations) |

### Task

```typescript
interface Task {
  id: string;
  name: string;
  startDate: string; // ISO date format: YYYY-MM-DD
  endDate: string; // ISO date format: YYYY-MM-DD
  color?: string; // Optional bar color (CSS color value)
  progress?: number; // Optional progress 0–100. Renders a progress bar overlay inside the task bar.
  accepted?: boolean; // Optional. Only meaningful when progress is 100. true = green bar, false/undefined = yellow bar.
  dependencies?: TaskDependency[]; // Optional array of predecessor dependencies
}
```

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
  lag?: number;        // Days delay (positive or negative, default: 0)
}
```

#### Lag

- **Positive lag**: Delays the successor (e.g., lag: 2 means successor starts 2 days after constraint is satisfied)
- **Negative lag**: Allows overlap (e.g., lag: -3 means successor starts 3 days before predecessor finishes)

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
  onChange={handleChange}
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
