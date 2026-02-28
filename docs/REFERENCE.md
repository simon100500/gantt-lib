# gantt-lib API Reference

**Version:** 0.1.1
**For:** AI agents and human developers. Every public type, prop, constraint, and edge case is documented here. Reading this file is sufficient to use the library correctly — source inspection is not required.

---

## 1. Package Identity

| Property | Value |
|---|---|
| Package name | `gantt-lib` |
| Version | `0.1.1` |
| NPM install | `npm install gantt-lib` |
| Peer dependencies | `react >= 18`, `react-dom >= 18` |
| CSS import (REQUIRED) | `import 'gantt-lib/styles.css'` |
| Main import | `import { GanttChart, type Task, type TaskDependency } from 'gantt-lib'` |

The CSS import MUST appear as a separate import line. Without it, task bars, grid lines, and layout will not render correctly.

---

## 2. Minimal Working Example

```tsx
import { useState, useRef } from 'react';
import { GanttChart, type Task } from 'gantt-lib';
import 'gantt-lib/styles.css';

const initialTasks: Task[] = [
  {
    id: '1',
    name: 'Planning',
    startDate: '2026-02-01',
    endDate: '2026-02-07',
    color: '#3b82f6',
  },
  {
    id: '2',
    name: 'Development',
    startDate: '2026-02-08',
    endDate: '2026-02-20',
    dependencies: [{ taskId: '1', type: 'FS', lag: 0 }],
  },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const ganttRef = useRef<{ scrollToToday: () => void }>(null);

  return (
    <div>
      <button onClick={() => ganttRef.current?.scrollToToday()}>
        Сегодня
      </button>
      <GanttChart
        ref={ganttRef}
        tasks={tasks}
        dayWidth={40}
        rowHeight={40}
        onChange={setTasks}
      />
    </div>
  );
}
```

Key points:
- CSS import comes before the component usage
- Use ISO strings (`'YYYY-MM-DD'`) for dates — avoids timezone issues
- Pass the `useState` setter directly to `onChange` — the library emits functional updaters
- No `month` prop needed — the calendar range is derived automatically from task dates
- Use `ref` to access the `scrollToToday()` method for programmatic scroll to current date

---

## 3. Task Interface

```typescript
interface Task {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  color?: string;
  progress?: number;
  accepted?: boolean;
  dependencies?: TaskDependency[];
  locked?: boolean;
  divider?: 'top' | 'bottom';
}
```

| Field | Type | Required | Default | Constraints and Notes |
|---|---|---|---|---|
| `id` | `string` | yes | — | Must be unique across all tasks in the array. Duplicate IDs cause undefined behavior in cascade and validation. |
| `name` | `string` | yes | — | Displayed as text label on the task bar. No length limit enforced, but very long names may overflow the bar visually. |
| `startDate` | `string \| Date` | yes | — | ISO string (`'2026-02-01'`) or `Date` object. All arithmetic is UTC. Prefer ISO strings to avoid local timezone off-by-one errors. |
| `endDate` | `string \| Date` | yes | — | Same format rules as `startDate`. **endDate is inclusive:** a task where `startDate === endDate` occupies exactly 1 day column. |
| `color` | `string` | no | `'#3b82f6'` | Any valid CSS color value (hex, rgb, named color). Applied as the task bar background color. |
| `progress` | `number` | no | `undefined` | Range: 0–100. Decimal values are rounded for display. `0` or `undefined` means no progress bar is rendered. Progress is purely visual — it does not restrict drag behavior. |
| `accepted` | `boolean` | no | `undefined` | Only meaningful when `progress === 100`. `true` renders a green progress bar. `false` or `undefined` at 100% renders a yellow bar. Has no effect when progress is not 100. |
| `dependencies` | `TaskDependency[]` | no | `undefined` | Array of predecessor links. Dependencies are defined on the **successor** task, pointing to the predecessor via `taskId`. See Section 4 and Section 5. |
| `locked` | `boolean` | no | `undefined` | When `true`, the task cannot be dragged or resized. Task name and dates cannot be edited in the task list. Independent of `progress` and `accepted` — consumer controls locking separately. |
| `divider` | `'top' \| 'bottom'` | no | `undefined` | Optional horizontal divider line for visual grouping. `'top'` renders a bold line above the task row. `'bottom'` renders a bold line below the task row. Spans the full grid width. |

---

## 4. TaskDependency Interface

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
| `type` | `'FS' \| 'SS' \| 'FF' \| 'SF'` | yes | — | Dependency link type. Determines which edges are constrained and how lag is calculated. See Section 5 for full semantics. |
| `lag` | `number` | no | `0` | Days of offset. Positive = delay (gap between tasks). Negative = overlap (tasks overlap by that many days). **Do not set lag manually** after initial construction — the library recalculates lag automatically on every drag completion. |

---

## 5. Dependency Types — Semantics

Dependencies use standard project management link type semantics. All link types are relative to the predecessor task (A) and successor task (B).

### FS — Finish-to-Start

| Property | Value |
|---|---|
| Full name | Finish-to-Start |
| Rule | `B.startDate >= A.endDate + lag` |
| Lag formula | `lag = startB - endA` (can be negative, meaning B starts before A ends) |
| Constrained edge | Left edge (`startDate`) of successor B |
| Example | `{ taskId: 'A', type: 'FS', lag: 0 }` — B starts on or after A ends |

The most common link type. B cannot begin until A finishes. Negative lag creates deliberate overlap.

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

### Cascade Behavior

When `enableAutoSchedule={true}` and a predecessor is dragged:
- All successor tasks shift automatically to maintain their link constraints
- Dependency lines redraw in real-time during drag (not just on mouseup)
- When cascade occurs, `onCascade` fires instead of `onChange` — they are mutually exclusive per drag event

---

## 6. GanttChart Props

```typescript
interface GanttChartProps {
  tasks: Task[];
  dayWidth?: number;
  rowHeight?: number;
  headerHeight?: number;
  containerHeight?: number;
  onChange?: (tasks: Task[] | ((currentTasks: Task[]) => Task[])) => void;
  onValidateDependencies?: (result: ValidationResult) => void;
  enableAutoSchedule?: boolean;
  disableConstraints?: boolean;
  onCascade?: (tasks: Task[]) => void;
  showTaskList?: boolean;
  taskListWidth?: number;
  disableTaskNameEditing?: boolean;
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `tasks` | `Task[]` | required | Array of tasks to display. Row order in the chart matches array order (index 0 is the top row). |
| `dayWidth` | `number` | `40` | Width of each day column in pixels. Minimum effective value is approximately 20px — below that, day labels become illegible. |
| `rowHeight` | `number` | `40` | Height of each task row in pixels. Also controls the task bar vertical position within the row. |
| `headerHeight` | `number` | `40` | Height of the time-scale header (month + day rows) in pixels. |
| `containerHeight` | `number` | `600` | Total component height in pixels. Enables vertical scrolling when tasks exceed this height. The header is sticky during vertical scroll. |
| `onChange` | `(tasks: Task[] \| ((currentTasks: Task[]) => Task[])) => void` | `undefined` | Called once on mouseup after any drag or resize. Receives either a new tasks array or a functional updater `(prev) => next`. **Best usage:** pass the `useState` setter directly — `onChange={setTasks}`. This works because the library already wraps updates in functional updaters. |
| `onValidateDependencies` | `(result: ValidationResult) => void` | `undefined` | Called every time the tasks array changes. Receives a `ValidationResult` with all dependency errors (cycles, constraint violations, missing task references). |
| `enableAutoSchedule` | `boolean` | `false` | When `true` (hard mode): dragging a predecessor cascades all successor tasks to maintain their constraints. Dependency lines redraw in real-time during drag. |
| `disableConstraints` | `boolean` | `false` | When `true`: all drag constraint checks are skipped. Tasks can be placed freely, ignoring all dependency rules. Useful for debugging layouts or building unconstrained editors. |
| `onCascade` | `(tasks: Task[]) => void` | `undefined` | Called when a cascade drag completes in hard mode (`enableAutoSchedule={true}`). Receives all affected tasks including the dragged task. **When `onCascade` fires, `onChange` does NOT fire for that drag.** Use `onCascade` to update state in hard mode. |
| `showTaskList` | `boolean` | `false` | When `true`, displays a task list table on the left side of the chart with columns for №, Name, Start Date, End Date. The task list supports inline editing and synchronized scrolling. |
| `taskListWidth` | `number` | `520` | Width of the task list panel in pixels. Only effective when `showTaskList={true}`. |
| `disableTaskNameEditing` | `boolean` | `false` | When `true`, task names cannot be edited in the task list. Date editing is also disabled for locked tasks (see `task.locked` property). |

**Important — calendar range:** The visible date range is calculated automatically from the earliest `startDate` to the latest `endDate` across all tasks. The chart always shows complete calendar months. For example, if tasks span March 25 to May 5, the chart renders March 1 through May 31. There is no `month` prop.

---

## 7. Ref API

The `GanttChart` component supports an imperative handle via `ref` for programmatic control.

```typescript
interface GanttChartRef {
  scrollToToday: () => void;
}
```

Usage example:

```tsx
import { useRef } from 'react';
import { GanttChart } from 'gantt-lib';

function App() {
  const ganttRef = useRef<{ scrollToToday: () => void }>(null);

  const handleTodayClick = () => {
    ganttRef.current?.scrollToToday();
  };

  return (
    <>
      <button onClick={handleTodayClick}>Today</button>
      <GanttChart ref={ganttRef} tasks={tasks} />
    </>
  );
}
```

| Method | Return Type | Description |
|---|---|---|
| `scrollToToday()` | `void` | Scrolls the chart horizontally so that today's date is centered in the viewport. If today is not within the visible date range, no action is taken. |

---

## 8. CSS Variables

Override these in any global CSS file to customize the chart appearance. All overrides must target `:root` or a specific selector enclosing the chart.

```css
:root {
  --gantt-grid-line-color: #e0e0e0;
  --gantt-cell-background: #ffffff;
  /* ... etc */
}
```

| Variable | Default | Controls |
|---|---|---|
| `--gantt-grid-line-color` | `#e0e0e0` | Vertical separator lines between day columns, week starts, and month starts |
| `--gantt-cell-background` | `#ffffff` | Default row background (non-weekend cells) |
| `--gantt-row-hover-background` | `#f8f9fa` | Row background color on mouse hover |
| `--gantt-row-height` | `40px` | Row height (mirrors the `rowHeight` prop — set both consistently) |
| `--gantt-header-height` | `40px` | Header height (mirrors the `headerHeight` prop) |
| `--gantt-day-width` | `40px` | Day column width (mirrors the `dayWidth` prop) |
| `--gantt-task-bar-default-color` | `#3b82f6` | Task bar fill color when `task.color` is not set |
| `--gantt-task-bar-text-color` | `#ffffff` | Text color rendered on task bars |
| `--gantt-task-bar-border-radius` | `4px` | Corner radius of task bar rectangles |
| `--gantt-task-bar-height` | `28px` | Task bar height within its row. Should be less than `--gantt-row-height`. |
| `--gantt-progress-color` | `rgba(0,0,0,0.2)` | Progress bar overlay color when `progress` is > 0 and < 100 |
| `--gantt-progress-completed` | `#fbbf24` | Progress bar color when `progress === 100` and `accepted` is falsy |
| `--gantt-progress-accepted` | `#22c55e` | Progress bar color when `progress === 100` and `accepted === true` |
| `--gantt-today-indicator-color` | `#ef4444` | Color of the vertical "today" line |
| `--gantt-today-indicator-width` | `2px` | Width of the vertical "today" line |

---

## 9. Drag Interactions

| User Action | Result |
|---|---|
| Click and drag center of task bar | Move task. Both `startDate` and `endDate` shift by the same delta. Snaps to day boundaries. |
| Click and drag left edge (12px zone) | Resize task start date (earlier or later). Right edge stays fixed. Snaps to day boundaries. |
| Click and drag right edge (12px zone) | Resize task end date (earlier or later). Left edge stays fixed. Snaps to day boundaries. |
| Click and drag empty grid area | Pan (scroll) the chart horizontally and vertically. Cursor changes to `grabbing`. |

**Edge zone priority:** Resize takes priority over move when the cursor is within 12px of either horizontal edge.

**Drag tooltip:** During drag, a tooltip displays the current start and end dates of the task being dragged.

**onChange timing:** `onChange` fires exactly once on `mouseup`, not during drag. This prevents re-render storms when 100+ tasks are in the array. During drag, only the dragged row re-renders internally.

**Snapping:** All drag operations snap to full day boundaries. Sub-day positioning is not supported.

---

## 10. ValidationResult Type

Used as the argument type for the `onValidateDependencies` callback.

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

| Field | Type | Notes |
|---|---|---|
| `isValid` | `boolean` | `false` if any errors exist. `true` only when `errors` is empty. |
| `errors` | `DependencyError[]` | Empty array when `isValid === true`. |
| `errors[n].type` | `'cycle' \| 'constraint' \| 'missing-task'` | `cycle` = circular dependency detected; `constraint` = date constraint violated; `missing-task` = `taskId` in dependency does not exist in the tasks array. |
| `errors[n].taskId` | `string` | ID of the task with the problem. |
| `errors[n].message` | `string` | Human-readable description of the error. |
| `errors[n].relatedTaskIds` | `string[]` | Optional. For `cycle` errors: the IDs forming the cycle path. |

Validation runs automatically on every tasks array change. You do not call it manually.

---

## 11. Date Handling Rules

- **Use ISO strings.** Always pass dates as `'YYYY-MM-DD'` strings. `Date` objects from local environments can cause off-by-one errors due to timezone offsets.
- **All internal calculations are UTC.** The library uses `Date.UTC()` internally. A date string `'2026-02-01'` is treated as `2026-02-01T00:00:00Z`.
- **endDate is inclusive.** A task with `startDate: '2026-02-01'` and `endDate: '2026-02-01'` occupies exactly 1 day column. A task from Feb 1 to Feb 5 occupies 5 day columns.
- **After drag, dates in onChange are ISO strings.** The callback always receives ISO UTC date strings regardless of the input format used when constructing tasks.
- **Lag values after drag are integers (days).** The library rounds lag to whole days.

---

## 12. onChange Pattern — Correct Usage

The `onChange` prop accepts both a new tasks array and a functional updater. The library internally emits functional updaters to avoid stale closure bugs with fast consecutive drags.

```tsx
// CORRECT: pass useState setter directly — the library handles functional updater emission
<GanttChart tasks={tasks} onChange={setTasks} />

// CORRECT: manual functional updater wrapper (equivalent behavior)
<GanttChart
  tasks={tasks}
  onChange={(update) => {
    setTasks(prev => typeof update === 'function' ? update(prev) : update);
  }}
/>

// WRONG: reading from tasks closure — stale closure bug with fast consecutive drags
onChange={(newTasks) => setTasks(newTasks)}
// This may overwrite a concurrent drag because `newTasks` closes over a stale `tasks` reference.
```

**Rule:** Never read `tasks` directly inside the `onChange` callback. Always use the functional updater pattern so React can provide the current state.

---

## 13. enableAutoSchedule vs onCascade

Three distinct operating modes depending on prop combinations:

| `enableAutoSchedule` | `onCascade` provided | Mode | Behavior |
|---|---|---|---|
| `false` (default) | any | **Soft / visual only** | Tasks move independently. Dependency lines are visual only — no constraints enforced on drag. `onChange` fires on each drag. |
| `true` | no | **Soft cascade** | Predecessors drag successors. On drag end, updated tasks with recalculated lag values are returned via `onChange`. |
| `true` | yes | **Hard cascade** | Predecessors drag successors with real-time preview. On drag end, `onCascade` fires with all shifted tasks. `onChange` does NOT fire for cascaded drags. |

**State update rule for hard cascade:**
```tsx
// Update tasks from onCascade, not from onChange, in hard mode
<GanttChart
  tasks={tasks}
  enableAutoSchedule={true}
  onChange={setTasks}          // fires for non-cascade drags (resize of leaf task, etc.)
  onCascade={(shifted) => {    // fires for cascade drags — takes precedence
    setTasks(prev => {
      const map = new Map(shifted.map(t => [t.id, t]));
      return prev.map(t => map.get(t.id) ?? t);
    });
  }}
/>
```

---

## 14. AI Agent Usage Notes

When generating `Task` arrays for this library, follow these rules to avoid common errors:

**ID format**
- `id` must be a unique string. Use `'1'`, `'2'`, `'3'` or UUIDs. Do not use numbers — the type is `string`.

**Dependency direction**
- Dependencies are defined on the **successor** (the task that depends on something), not on the predecessor.
- `taskId` inside a dependency points to the **predecessor**.

```typescript
// CORRECT: task B depends on task A finishing first (FS)
const tasks: Task[] = [
  { id: 'A', name: 'Task A', startDate: '2026-02-01', endDate: '2026-02-05' },
  {
    id: 'B',
    name: 'Task B',
    startDate: '2026-02-06',
    endDate: '2026-02-10',
    dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }], // B has the dependency
  },
];
```

**Date format**
- Always use `'YYYY-MM-DD'` ISO strings.
- Do not construct `new Date('2026-02-01')` in environments where local timezone matters — use strings.

**Lag**
- Do not calculate or set `lag` manually after drag events — the library recalculates it on every drag completion.
- When constructing initial tasks, `lag: 0` is the standard neutral value. Omitting `lag` is equivalent (defaults to 0).

**onChange vs onCascade**
- When `enableAutoSchedule={true}` and `onCascade` is provided, update your state from `onCascade`, not from `onChange`. They are mutually exclusive per drag event.

**Locked tasks**
- Use `locked: true` to prevent drag, resize, and editing of a task. This is independent from progress and accepted properties.
- When a task is locked, both the task bar and task list cells become non-interactive.

**Task List**
- Enable with `showTaskList={true}` prop. Shows a table on the left with №, Name, Start Date, End Date columns.
- Task list scrolls horizontally in sync with the chart. Row selection highlights both the list row and the task bar.
- Inline editing: click to edit, Enter to save, Esc to cancel.
- Use `taskListWidth` to control the panel width (default: 520px).
- Use `disableTaskNameEditing={true}` to globally disable name editing. Date editing is automatically disabled for locked tasks.

**Scroll to Today**
- Use `ref` to access the `scrollToToday()` method for programmatic scroll to the current date.
- The chart centers today's date in the viewport when `scrollToToday()` is called.
- Example: `ganttRef.current?.scrollToToday()`

**Progress bar states summary**

| `progress` | `accepted` | Visual Result |
|---|---|---|
| `undefined` or `0` | any | No progress bar rendered |
| 1–99 | any | Partial progress bar in `--gantt-progress-color` |
| `100` | `false` or `undefined` | Full bar in `--gantt-progress-completed` (yellow) |
| `100` | `true` | Full bar in `--gantt-progress-accepted` (green) |

---

## 15. Public Exports

```typescript
// Named exports from 'gantt-lib'
export { GanttChart };              // Main component
export type { Task };               // Task data interface
export type { TaskDependency };     // Dependency link interface
export type { ValidationResult };   // Dependency validation result
export type { DependencyError };    // Individual validation error
```

Import pattern:
```typescript
import { GanttChart, type Task, type TaskDependency, type ValidationResult } from 'gantt-lib';
import 'gantt-lib/styles.css';
```

---

## 16. Performance Notes

- `onChange` fires once on mouseup — not on every drag frame. Safe with 100+ tasks.
- `TaskRow` uses `React.memo` with a custom comparator. Only the dragged row re-renders during drag.
- During cascade drag, chain member rows re-render from CSS transform overrides, not React state updates.
- For very large task lists (500+), consider virtualizing the row container — the library does not virtualize internally.

---

## 17. Known Constraints and Edge Cases

| Scenario | Behavior |
|---|---|
| `tasks` array is empty | Chart renders with no rows. Calendar defaults to the current month. |
| Task with `startDate > endDate` | Undefined visual behavior — the task bar may render with zero or negative width. Always ensure `startDate <= endDate`. |
| Circular dependency (A → B → A) | Reported as `'cycle'` error in `ValidationResult`. Chart still renders but drag constraints may behave unexpectedly. |
| `taskId` in dependency not found | Reported as `'missing-task'` error. The dependency line for that link is not rendered. |
| `disableConstraints={true}` | Drag freely ignores all FS/SS/FF/SF constraints. Validation still runs and reports via `onValidateDependencies`. |
| Two tasks with the same `id` | Undefined behavior — cascade and validation operate on the first match. Always use unique IDs. |
| `dayWidth` below 20 | Day labels in the header become illegible but no error is thrown. Layout still functions. |
