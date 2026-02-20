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

| Prop        | Type                                          | Default    | Description                        |
| ----------- | --------------------------------------------- | ---------- | ---------------------------------- |
| `tasks`     | `Task[]`                                      | _required_ | Array of tasks to display          |
| `dayWidth`  | `number`                                      | `30`       | Width of each day column in pixels |
| `rowHeight` | `number`                                      | `36`       | Height of each task row in pixels  |
| `onChange`  | `(tasks: Task[] \| Task[] => Task[]) => void` | _required_ | Callback when tasks are modified   |

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
