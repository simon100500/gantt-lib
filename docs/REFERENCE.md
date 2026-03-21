# gantt-lib API Reference

**Version:** 0.25.0
**For:** AI agents and human developers. Every public type, prop, constraint, and edge case is documented here. Reading this file is sufficient to use the library correctly — source inspection is not required.

---

## 1. Package Identity

| Property | Value |
|---|---|
| Package name | `gantt-lib` |
| Version | `0.25.0` |
| NPM install | `npm install gantt-lib` |
| Peer dependencies | `react >= 18`, `react-dom >= 18` |
| CSS import (REQUIRED) | `import 'gantt-lib/styles.css'` |
| Main import | `import { GanttChart, type Task, type TaskDependency, type TaskPredicate } from 'gantt-lib'` |
| Filters import | `import { and, or, not, withoutDeps, expired, inDateRange, progressInRange, nameContains } from 'gantt-lib/filters'` |
| Date utils import | `import { getBusinessDaysCount, addBusinessDays } from 'gantt-lib'` |

The CSS import MUST appear as a separate import line. Without it, task bars, grid lines, and layout will not render correctly.

---

## 2. Installation

### Step 1: Install the package

```bash
npm install gantt-lib
```

### Step 2: Import the component and CSS (REQUIRED)

```tsx
import { GanttChart, type Task } from 'gantt-lib';
import 'gantt-lib/styles.css';  // <-- REQUIRED! See below
```

**⚠️ CRITICAL: The CSS import is REQUIRED**

The CSS import `import 'gantt-lib/styles.css'` must be included as a separate line. Without it:
- Task bars will not render
- Grid lines will be invisible
- Hover buttons (Add/Delete) will NOT appear
- The entire layout will be broken

The CSS contains all styling including:
- Task list panel layout
- Hover-reveal action buttons (+ insert, 🗑 delete)
- Calendar grid and month/day separators
- Progress bars and dependency lines

### Step 3: Use in your component

See Section 3 for a complete working example.

---

## 3. Minimal Working Example

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
  const ganttRef = useRef<{ scrollToToday: () => void; scrollToTask: (taskId: string) => void; scrollToRow: (taskId: string) => void }>(null);

  const handleAdd = (task: Task) => {
    // Called when user adds a task via the task list
    // The library creates a new task with auto-generated ID
    setTasks(prev => [...prev, task]);
  };

  const handleDelete = (taskId: string) => {
    // Called when user clicks the trash icon
    // The library also cleans up dependencies pointing to this task
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleInsertAfter = (taskId: string, newTask: Task) => {
    // Called when user clicks "+" to insert after a specific task
    // After insertion, the new task automatically enters edit mode
    setTasks(prev => {
      const index = prev.findIndex(t => t.id === taskId);
      if (index === -1) return prev;
      const newTasks = [...prev];
      newTasks.splice(index + 1, 0, newTask);
      return newTasks;
    });
  };

  const handleTasksChange = (changedTasks: Task[]) => {
    // Called when tasks are modified
    // Receives ONLY the changed tasks - merge them into state
    setTasks(prev => {
      const changedMap = new Map(changedTasks.map(t => [t.id, t]));
      return prev.map(t => changedMap.get(t.id) ?? t);
    });
  };

  return (
    <div>
      <button onClick={() => ganttRef.current?.scrollToToday()}>
        Сегодня
      </button>
      <button onClick={() => ganttRef.current?.scrollToTask('2')}>
        К задаче 2
      </button>
      <GanttChart
        ref={ganttRef}
        tasks={tasks}
        dayWidth={40}
        rowHeight={40}
        onTasksChange={handleTasksChange}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onInsertAfter={handleInsertAfter}
        showTaskList={true}
      />
    </div>
  );
}
```

Key points:
- **CSS import is required** for all visual features including hover buttons
- Use ISO strings (`'YYYY-MM-DD'`) for dates — avoids timezone issues
- **`onTasksChange` receives ONLY changed tasks** — merge them into your state using the pattern shown in `handleTasksChange`
- Implement `onAdd`, `onDelete`, and `onInsertAfter` to handle task operations from the UI
- After inserting via `onInsertAfter`, the new task automatically enters edit mode (managed internally)
- No `month` prop needed — the calendar range is derived automatically from task dates
- Use `ref` to access `scrollToToday()` and `scrollToTask()` methods for programmatic scroll
- Enable `showTaskList={true}` for the editable task list panel with hover-reveal action buttons

---

## 3.1. Full Example with Hierarchy and All Props

```tsx
import { useState, useRef, useCallback } from 'react';
import { GanttChart, type Task } from 'gantt-lib';
import 'gantt-lib/styles.css';

const initialTasks: Task[] = [
  // Root task (parent)
  {
    id: 'parent-1',
    name: 'Фундаментные работы (родитель)',
    startDate: '2026-03-01',
    endDate: '2026-03-11',
    progress: 70,
  },
  // Child tasks
  {
    id: 'child-1-1',
    parentId: 'parent-1',
    name: 'Котлован (ребенок)',
    startDate: '2026-03-01',
    endDate: '2026-03-05',
    progress: 100,
  },
  {
    id: 'child-1-2',
    parentId: 'parent-1',
    name: 'Бетонная подготовка (ребенок)',
    startDate: '2026-03-06',
    endDate: '2026-03-11',
    progress: 60,
  },
  // Standalone root task
  {
    id: 'task-3',
    name: 'Отдельная задача',
    startDate: '2026-03-12',
    endDate: '2026-03-15',
  },
];

export default function FullExample() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const ganttRef = useRef<{ scrollToToday: () => void; scrollToTask: (taskId: string) => void; scrollToRow: (taskId: string) => void }>(null);

  // Basic task operations
  const handleTasksChange = useCallback((changedTasks: Task[]) => {
    setTasks(prev => {
      const changedMap = new Map(changedTasks.map(t => [t.id, t]));
      return prev.map(t => changedMap.get(t.id) ?? t);
    });
  }, []);

  const handleAdd = useCallback((task: Task) => {
    setTasks(prev => [...prev, task]);
  }, []);

  const handleDelete = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const handleInsertAfter = useCallback((taskId: string, newTask: Task) => {
    setTasks(prev => {
      const index = prev.findIndex(t => t.id === taskId);
      if (index === -1) return prev;
      const newTasks = [...prev];
      newTasks.splice(index + 1, 0, newTask);
      return newTasks;
    });
  }, []);

  // Reorder with parent inference (for drag-drop hierarchy)
  const handleReorder = useCallback((reorderedTasks: Task[], movedTaskId?: string, inferredParentId?: string) => {
    if (movedTaskId && inferredParentId !== undefined) {
      // Update the moved task's parentId based on drop position
      setTasks(reorderedTasks.map(t =>
        t.id === movedTaskId
          ? { ...t, parentId: inferredParentId || undefined }
          : t
      ));
    } else {
      setTasks(reorderedTasks);
    }
  }, []);

  // Promote: remove parentId (move to root level, after last sibling)
  const handlePromoteTask = useCallback((taskId: string) => {
    setTasks(currentTasks => {
      const task = currentTasks.find(t => t.id === taskId);
      if (!task || !(task as any).parentId) return currentTasks;

      const parentId = (task as any).parentId;
      const siblings = currentTasks.filter(t => (t as any).parentId === parentId);

      if (siblings.length <= 1) {
        return currentTasks.map(t => t.id === taskId ? { ...t, parentId: undefined } : t);
      }

      // Find position after last sibling
      const lastSiblingIndex = currentTasks
        .map((t, i) => ({ task: t, index: i }))
        .filter(({ task }) => (task as any).parentId === parentId)
        .sort((a, b) => b.index - a.index)[0];

      if (!lastSiblingIndex) return currentTasks;

      const withoutPromoted = currentTasks.filter(t => t.id !== taskId);
      const insertIndex = lastSiblingIndex.index + 1;
      const promotedTask = { ...task, parentId: undefined };

      return [
        ...withoutPromoted.slice(0, insertIndex),
        promotedTask,
        ...withoutPromoted.slice(insertIndex)
      ];
    });
  }, []);

  // Demote: set parentId to previous task (make it a child)
  const handleDemoteTask = useCallback((taskId: string, newParentId: string) => {
    setTasks(currentTasks => {
      return currentTasks.map(t =>
        t.id === taskId ? { ...t, parentId: newParentId } : t
      );
    });
  }, []);

  // Collapse/expand state (controlled mode)
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(new Set());

  const handleToggleCollapse = useCallback((parentId: string) => {
    setCollapsedParentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  }, []);

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
        containerHeight={400}
        onTasksChange={handleTasksChange}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onInsertAfter={handleInsertAfter}
        onReorder={handleReorder}
        onPromoteTask={handlePromoteTask}
        onDemoteTask={handleDemoteTask}
        collapsedParentIds={collapsedParentIds}
        onToggleCollapse={handleToggleCollapse}
        showTaskList={true}
        taskListWidth={500}
        enableAddTask={true}
      />
    </div>
  );
}
```

**Hierarchy behavior:**
- **Parent tasks:** Displayed with gradient background (indigo to violet) and collapse/expand button (-/+)
- **Child tasks:** Indented in task list with "⬆" button to promote (remove parentId)
- **Root tasks:** Show "⬇" button to demote (become child of previous task)
- **Drag-and-drop:** Dragging a task between child tasks automatically assigns it the same parent
- **Promote:** Clicking "⬆" moves task after last sibling and removes parentId. The `onPromoteTask` callback is optional — if not provided, the library uses internal default logic.
- **Demote:** Clicking "⬇" makes task a child of the previous task (or sibling if previous task is a child). The `onDemoteTask` callback is optional — if not provided, the library uses internal default logic.

---

## 4. Task Interface

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
  parentId?: string;
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
| `dependencies` | `TaskDependency[]` | no | `undefined` | Array of predecessor links. Dependencies are defined on the **successor** task, pointing to the predecessor via `taskId`. See Section 5 and Section 6. |
| `locked` | `boolean` | no | `undefined` | When `true`, the task cannot be dragged or resized. Task name and dates cannot be edited in the task list. Independent of `progress` and `accepted` — consumer controls locking separately. |
| `divider` | `'top' \| 'bottom'` | no | `undefined` | Optional horizontal divider line for visual grouping. `'top'` renders a bold line above the task row. `'bottom'` renders a bold line below the task row. Spans the full grid width. |
| `parentId` | `string` | no | `undefined` | ID of the parent task for hierarchy (parent-child relationships). Child tasks are indented in the task list. Parent tasks display with a gradient background and collapse/expand button. Dragging a task between child tasks automatically assigns it the same parent. **Unlimited nesting depth** is supported. Hierarchical numbering (1, 1.1, 1.1.1, 2...) is displayed in the task list's № column. |

---

### 4.1. Task Hierarchy — Parent-Child Relationships (v0.18.0+)

The library supports unlimited-depth task hierarchy via the `parentId` property:

```typescript
interface Task {
  // ... other fields
  parentId?: string; // ID of parent task
}
```

**Key Features:**

1. **Unlimited Nesting Depth** — No artificial limit on hierarchy levels (1, 1.1, 1.1.1, 1.1.1.1, etc.)

2. **Hierarchical Numbering** — The task list № column automatically displays hierarchical numbers:
   ```
   1    Root Task 1
   1.1    Child of 1
   1.1.1    Grandchild of 1.1
   1.1.2    Another grandchild
   2    Root Task 2
   ```

3. **Visual Indicators** — Parent tasks have:
   - Gradient background
   - Collapse/expand button
   - Vertical guide lines for nested children

4. **Drag-and-Drop** — Dragging a task between child tasks automatically assigns it the same `parentId`

**Hierarchy Rules:**

- **One-level parenting**: A child can have only one parent (single `parentId` reference)
- **No cycles**: A task cannot be its own ancestor (validated by the library)
- **Parent task dates**: Parent tasks can have their own dates, independent of children
- **Parent progress**: Parent tasks can have their own progress, independent of children

**Promote/Demote Buttons:**

The task list includes hierarchy control buttons:
- **⬆ Promote** — Move task to root level (remove `parentId`)
- **⬇ Demote** — Make task a child of the previous visible task (set `parentId`)

**Example — Hierarchy Setup:**

```tsx
const tasks: Task[] = [
  {
    id: '1',
    name: 'Project Phase 1',
    startDate: '2026-03-01',
    endDate: '2026-03-15',
    progress: 50,
    // No parentId = root level task
  },
  {
    id: '1-1',
    parentId: '1',  // Child of '1'
    name: 'Design',
    startDate: '2026-03-01',
    endDate: '2026-03-05',
    progress: 100,
  },
  {
    id: '1-1-1',
    parentId: '1-1',  // Grandchild (nested)
    name: 'UI Mockups',
    startDate: '2026-03-01',
    endDate: '2026-03-03',
    progress: 100,
  },
  {
    id: '1-1-2',
    parentId: '1-1',  // Sibling of 1-1-1
    name: 'API Design',
    startDate: '2026-03-04',
    endDate: '2026-03-05',
    progress: 100,
  },
  {
    id: '1-2',
    parentId: '1',  // Another child of '1'
    name: 'Development',
    startDate: '2026-03-06',
    endDate: '2026-03-15',
    progress: 0,
  },
];
```

**Resulting Display:**
```
№    Name                     Start    End
1    Project Phase 1          01.03    15.03
1.1  Design                  01.03    05.03
1.1.1  UI Mockups            01.03    03.03
1.1.2  API Design            04.03    05.03
1.2  Development             06.03    15.03
```

**Handling Promote/Demote:**

```tsx
// Optional: Provide custom handlers
const handlePromoteTask = useCallback((taskId: string) => {
  setTasks(currentTasks => {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task || !task.parentId) return currentTasks;

    // Option 1: Simple promote (remove parentId)
    return currentTasks.map(t =>
      t.id === taskId ? { ...t, parentId: undefined } : t
    );

    // Option 2: Reposition after siblings (advanced)
    // Find last sibling and insert after it
  });
}, []);

const handleDemoteTask = useCallback((taskId: string, newParentId: string) => {
  setTasks(currentTasks => {
    return currentTasks.map(t =>
      t.id === taskId ? { ...t, parentId: newParentId } : t
    );
  });
}, []);

<GanttChart
  tasks={tasks}
  showTaskList={true}
  onPromoteTask={handlePromoteTask}   // Optional
  onDemoteTask={handleDemoteTask}     // Optional
/>
```

**Note:** If `onPromoteTask` and `onDemoteTask` are not provided, the library uses internal default logic.

---

## 5. TaskDependency Interface

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
| `lag` | `number` | no | `0` | Days of offset. Positive = delay (gap between tasks). Negative = overlap (tasks overlap by that many days). **Do not set lag manually** after initial construction — the library recalculates lag automatically on every drag completion. |

---

## 6. Dependency Types — Semantics

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
- When cascade occurs, `onCascade` fires instead of `onTasksChange` — they are mutually exclusive per drag event

---

## 7. GanttChart Props

```typescript
interface GanttChartProps {
  tasks: Task[];
  dayWidth?: number;
  rowHeight?: number;
  headerHeight?: number;
  containerHeight?: number | string;
  viewMode?: 'day' | 'week' | 'month';
  onTasksChange?: (tasks: Task[]) => void;
  onAdd?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onInsertAfter?: (taskId: string, newTask: Task) => void;
  onReorder?: (tasks: Task[], movedTaskId?: string, inferredParentId?: string) => void;
  onPromoteTask?: (taskId: string) => void;
  onDemoteTask?: (taskId: string, newParentId: string) => void;
  onValidateDependencies?: (result: ValidationResult) => void;
  enableAutoSchedule?: boolean;
  disableConstraints?: boolean;
  onCascade?: (tasks: Task[]) => void;
  showTaskList?: boolean;
  taskListWidth?: number;
  disableTaskNameEditing?: boolean;
  disableDependencyEditing?: boolean;
  disableTaskDrag?: boolean;
  highlightExpiredTasks?: boolean;
  collapsedParentIds?: Set<string>;
  onToggleCollapse?: (parentId: string) => void;
  enableAddTask?: boolean;
  taskFilter?: TaskPredicate;
  highlightedTaskIds?: Set<string>;
  customDays?: CustomDayConfig[];
  isWeekend?: (date: Date) => boolean;
  businessDays?: boolean;
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `tasks` | `Task[]` | required | Array of tasks to display. Row order in the chart matches array order (index 0 is the top row). |
| `dayWidth` | `number` | `40` | Width of each day column in pixels. In `'week'` view mode, this represents the width of a week column. Minimum effective value is approximately 20px — below that, day labels become illegible. |
| `viewMode` | `'day' \| 'week' \| 'month'` | `'day'` | View mode for the time scale. `'day'` = daily columns (default), `'week'` = weekly columns with weekends skipped, `'month'` = one column per calendar month. See Section 7.1 for implementation details. |
| `rowHeight` | `number` | `40` | Height of each task row in pixels. Also controls the task bar vertical position within the row. |
| `headerHeight` | `number` | `40` | Height of the time-scale header (month + day rows) in pixels. |
| `containerHeight` | `number \| string` | `undefined` | Container height. Can be pixels (`600`), string (`"90vh"`, `"100%"`, `"500px"`), or `undefined` for auto height (adapts to content). |
| `onTasksChange` | `(tasks: Task[]) => void` | `undefined` | Called when tasks are modified. **Receives ONLY the changed tasks** (never the full array unless all actually changed). Single task = array of 1 element. Consumer must merge changed tasks into state. See Section 13 for usage patterns. |
| `onAdd` | `(task: Task) => void` | `undefined` | Called when user adds a new task. The library creates a task with auto-generated ID and default dates. Consumer adds the task to the array. |
| `onDelete` | `(taskId: string) => void` | `undefined` | Called when user clicks the trash icon in the task list action panel. Receives the `taskId` of the task to delete. The library automatically cleans up dependencies pointing to this task. |
| `onInsertAfter` | `(taskId: string, newTask: Task) => void` | `undefined` | Called when user clicks the "+" insert button in the action panel. Receives the `taskId` to insert after and the `newTask` object. After insertion, the new task automatically enters edit mode (managed internally by the component). |
| `onReorder` | `(tasks: Task[], movedTaskId?: string, inferredParentId?: string) => void` | `undefined` | Called when tasks are reordered via drag-and-drop in the task list. `movedTaskId` is the ID of the dragged task. `inferredParentId` is the parent ID inferred from the drop position (undefined if dropped at root level). **Implementation:** update `parentId` of `movedTaskId` to `inferredParentId` (or remove `parentId` if `inferredParentId` is undefined). |
| `onPromoteTask` | `(taskId: string) => void` | `undefined` | Called when user clicks the "⬆" button to promote a child task to root level. **Optional** — if not provided, the library uses internal default logic (calls `onTasksChange` with the promoted task and reorders the task array). |
| `onDemoteTask` | `(taskId: string, newParentId: string) => void` | `undefined` | Called when user clicks the "⬇" button to make a task a child of the previous task. `newParentId` is the ID of the parent task. **Optional** — if not provided, the library uses internal default logic (calls `onTasksChange` with the demoted task and updated parent, removes dependencies between tasks to prevent circular references). |
| `onValidateDependencies` | `(result: ValidationResult) => void` | `undefined` | Called every time the tasks array changes. Receives a `ValidationResult` with all dependency errors (cycles, constraint violations, missing task references). |
| `enableAutoSchedule` | `boolean` | `false` | When `true` (hard mode): dragging a predecessor cascades all successor tasks to maintain their constraints. Dependency lines redraw in real-time during drag. |
| `disableConstraints` | `boolean` | `false` | When `true`: all drag constraint checks are skipped. Tasks can be placed freely, ignoring all dependency rules. Useful for debugging layouts or building unconstrained editors. |
| `onCascade` | `(tasks: Task[]) => void` | `undefined` | Called when a cascade drag completes in hard mode (`enableAutoSchedule={true}`). Receives all affected tasks including the dragged task. **When `onCascade` fires, `onTasksChange` does NOT fire for that drag.** Use `onCascade` to update state in hard mode. |
| `showTaskList` | `boolean` | `false` | When `true`, displays a task list table on the left side of the chart with columns for №, Name, Start Date, End Date. The task list supports inline editing and synchronized scrolling. **CSS import required for hover-reveal action buttons.** |
| `taskListWidth` | `number` | `520` | Width of the task list panel in pixels. Only effective when `showTaskList={true}`. |
| `disableTaskNameEditing` | `boolean` | `false` | When `true`, task names cannot be edited in the task list. Date editing is also disabled for locked tasks (see `task.locked` property). |
| `disableDependencyEditing` | `boolean` | `false` | When `true`, dependency editing is disabled in the task list. Users cannot add, remove, or modify dependencies via the UI. |
| `disableTaskDrag` | `boolean` | `false` | When `true`, all drag and resize operations on the calendar grid are disabled. Useful for preventing accidental task movement during panning. Cursor shows `grab` instead of `not-allowed` to allow panning. |
| `highlightExpiredTasks` | `boolean` | `false` | When `true`, tasks that are behind schedule are visually highlighted. An expired task is one where today's date is within the task's date range and the current progress is less than the elapsed percentage. Expired tasks render with the `--gantt-expired-color` background. |
| `collapsedParentIds` | `Set<string>` | `undefined` | Set of parent task IDs that are collapsed (children hidden). Pass `undefined` for uncontrolled mode (internal state). |
| `onToggleCollapse` | `(parentId: string) => void` | `undefined` | Called when user clicks collapse/expand button on a parent task. Receives the `parentId` of the parent being toggled. Required for controlled mode when providing `collapsedParentIds`. |
| `enableAddTask` | `boolean` | `true` | When `true`, shows the "+ Добавить задачу" button at the bottom of the task list for adding new tasks. |
| `taskFilter` | `TaskPredicate` | `undefined` | Predicate function to filter tasks. Receives a `Task | undefined`, returns `true` to show the task, `false` to hide it. **Import:** `import { type TaskPredicate } from 'gantt-lib'`. See Section 7.3 for usage and ready-made filters. |
| `highlightedTaskIds` | `Set<string>` | `undefined` | Task IDs to highlight in the task list. Useful for external search results or navigation state without hiding other rows. |
| `customDays` | `CustomDayConfig[]` | `undefined` | Array of custom day configurations with explicit types. Each entry: `{ date: Date, type: 'weekend' | 'workday' }`. **IMPORTANT:** Use UTC dates: `{ date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' }` for March 8, 2026. See Section 7.2 for details. |
| `isWeekend` | `(date: Date) => boolean` | `undefined` | Optional base weekend predicate for flexible logic (e.g., Sunday-only weekends, 4-day work week). **Checked BEFORE customDays overrides** — use for base patterns, then override specific dates with `customDays`. Receives a UTC `Date` object, return `true` for weekends, `false` for workdays. |
| `businessDays` | `boolean` | `true` | Когда `true` (default), длительность задачи (duration) считается в рабочих днях, исключая выходные. Когда `false`, длительность считается в календарных днях. Влияет на расчёт зависимостей, перетаскивание задач и отображение длительности. См. раздел 7.5. |

**Important — calendar range:** The visible date range is calculated automatically from the earliest `startDate` to the latest `endDate` across all tasks. The chart always shows complete calendar months. For example, if tasks span March 25 to May 5, the chart renders March 1 through May 31. There is no `month` prop.

### 7.1. View Modes — Implementation Guide

The Gantt chart supports three time-scale view modes via the `viewMode` prop:

| Mode | Column Width | Header Row 1 | Header Row 2 | Use Case |
|------|--------------|--------------|--------------|----------|
| `day` | 1 day (default 40px) | Month names | Day numbers | Detailed daily planning |
| `week` | 7 days | Month names (spanning weeks) | Week start dates | Weekly sprint planning |
| `month` | 1 calendar month | Year names | Month names | High-level roadmap view |

**Architecture Overview:**

View modes are implemented across three components with a shared date array (`days`) generated by `getMultiMonthDays()`:

1. **TimeScaleHeader** — renders the two-row header
2. **GridBackground** — renders vertical grid lines
3. **TaskRow** — positions task bars and renders dependencies

**Adding a New View Mode:**

To add a new view mode (e.g., `'quarter'`, `'year'`), follow these steps:

**Step 1: Update type definitions**

```typescript
// src/types.ts
export type ViewMode = 'day' | 'week' | 'month' | 'quarter'; // Add your mode

// src/components/TimeScaleHeader/TimeScaleHeader.tsx
export interface TimeScaleHeaderProps {
  viewMode?: ViewMode; // Use the shared type
}
```

**Step 2: Add date utility functions**

Create block/span calculation functions in `src/utils/dateUtils.ts`:

```typescript
// Example: Quarter mode
export interface QuarterBlock {
  year: number;
  quarter: number; // 1-4
  startMonth: number; // 0-11
  months: number[]; // Month indices in this quarter
}

export const getQuarterBlocks = (days: Date[]): QuarterBlock[] => {
  const quarters = new Map<string, QuarterBlock>();

  days.forEach(day => {
    const year = day.getFullYear();
    const month = day.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const key = `${year}-Q${quarter}`;

    if (!quarters.has(key)) {
      quarters.set(key, {
        year,
        quarter,
        startMonth: (quarter - 1) * 3,
        months: []
      });
    }

    const block = quarters.get(key)!;
    if (!block.months.includes(month)) {
      block.months.push(month);
    }
  });

  return Array.from(quarters.values());
};

export const getQuarterSpans = (days: Date[]): Span[] => {
  // Group quarters by year for row 1 header
  // Return: [{ start, end, label: '2025' }, ...]
};
```

**Step 3: Update TimeScaleHeader component**

```typescript
// src/components/TimeScaleHeader/TimeScaleHeader.tsx
const TimeScaleHeader: React.FC<TimeScaleHeaderProps> = ({
  days,
  dayWidth,
  headerHeight,
  viewMode = 'day',
}) => {
  // Add your mode calculation
  const quarterBlocks = useMemo(
    () => (viewMode === 'quarter' ? getQuarterBlocks(days) : []),
    [days, viewMode]
  );

  // Calculate column widths for grid template
  const quarterColumnWidths = useMemo(
    () => quarterBlocks.map(b => b.months.length * 30 * dayWidth), // ~30 days/month
    [quarterBlocks, dayWidth]
  );

  // In JSX: render your mode-specific header
  return (
    <div className="gantt-tsh-header">
      {/* Row 1: Years */}
      {/* Row 2: Quarters */}
    </div>
  );
};
```

**Step 4: Update GridBackground component**

```typescript
// src/components/GridBackground/GridBackground.tsx
// Add similar logic to render vertical lines at your mode's boundaries
```

**Step 5: Update TaskRow component**

```typescript
// src/components/TaskRow/TaskRow.tsx
// Adjust task bar width calculation based on viewMode
// For quarter mode: bar width = (days in quarter) * dayWidth
```

**Step 6: Add CSS styling (if needed)**

```css
/* src/components/TimeScaleHeader/TimeScaleHeader.css */
.gantt-tsh-quarter-block {
  /* Custom styles for quarter columns */
}
```

**Key Implementation Notes:**

1. **Date Array**: All modes use the same `days` array from `getMultiMonthDays()` — each element is one calendar day. Your mode groups these days into larger blocks.

2. **Grid Template**: Use CSS Grid with variable column widths:
   ```css
   grid-template-columns: 120px 90px 60px 91px ...;
   ```

3. **dayWidth Interpretation**:
   - `day` mode: each column = `dayWidth` pixels
   - `week` mode: each column = `7 * dayWidth` pixels (approximately)
   - `month` mode: each column = `(days in month) * dayWidth` pixels
   - Your mode: define your own calculation

4. **Span Calculation**: Row 1 spans over row 2 columns. Use the `*Blocks` functions for row 2, then group them for row 1.

**Example: Adding Month Mode (Reference Implementation)**

The month view mode was added following this pattern:

1. `getMonthBlocks()` — returns one block per calendar month
2. `getYearSpans()` — groups month blocks by year
3. TimeScaleHeader renders year names (row 1) spanning month columns (row 2)
4. GridBackground renders year boundary lines (thick) and month separators
5. TaskRow adjusts bar width to cover full month width

**Related Files:**
- `src/utils/dateUtils.ts` — Date calculation utilities
- `src/components/TimeScaleHeader/TimeScaleHeader.tsx` — Header rendering
- `src/components/GridBackground/GridBackground.tsx` — Grid lines
- `src/components/TaskRow/TaskRow.tsx` — Task bar positioning
- `src/components/GanttChart/GanttChart.tsx` — View mode prop propagation

### 7.2. Custom Days API

The library supports custom weekend/workday calendars via the `customDays` prop and optional `isWeekend` predicate. This is useful for:
- National holidays (e.g., March 8, May 1-9 in Russia)
- Company-specific off days
- Shifted workdays (working Saturdays)
- Alternative work week patterns (4-day work week, Sunday-only weekends)

**IMPORTANT — Date Format:**

All custom day dates MUST be created as UTC dates to avoid timezone issues:

```tsx
// ❌ WRONG — uses local timezone, may cause off-by-one errors
const holiday = new Date('2026-03-08');

// ✅ CORRECT — explicit UTC date
const holiday = { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' };
```

**Why UTC?** The library internally uses UTC for all date calculations. If you pass a local timezone date, the date may be interpreted as the previous or next day depending on the user's timezone.

---

#### 7.2.1. CustomDayConfig Type

Each custom day is defined with an explicit type:

```typescript
interface CustomDayConfig {
  date: Date;           // The date to customize (UTC)
  type: 'weekend' | 'workday';  // Explicit type annotation
}
```

---

#### 7.2.2. Adding Holidays

Use `customDays` with `type: 'weekend'` to ADD specific dates to the default Saturday/Sunday weekends:

```tsx
import { GanttChart } from 'gantt-lib';

const holidays = [
  { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },   // March 8
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' },   // May 1
  { date: new Date(Date.UTC(2026, 4, 9)), type: 'weekend' },   // May 9
];

<GanttChart
  tasks={tasks}
  customDays={holidays}
/>
```

**Behavior:**
- Default weekends (Saturday, Sunday) remain
- Holidays are added to the default weekends
- Grid background highlights these dates
- Task dates respect these as non-working days

---

#### 7.2.3. Working Saturdays

Use `customDays` with `type: 'workday'` to EXCLUDE specific dates from default weekends:

```tsx
const workingSaturdays = [
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // Saturday, March 14
  { date: new Date(Date.UTC(2026, 2, 21)), type: 'workday' },  // Saturday, March 21
];

<GanttChart
  tasks={tasks}
  customDays={workingSaturdays}
/>
```

**Behavior:**
- Specified dates become workdays even if they fall on Saturday/Sunday
- Grid background does NOT highlight these dates

---

#### 7.2.4. Combining Weekends and Workdays

You can mix both types in a single array:

```tsx
const customDays = [
  // Add holidays
  { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },   // March 8 — holiday
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' },   // May 1 — holiday
  // Add working Saturdays
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // March 14 — workday
  { date: new Date(Date.UTC(2026, 2, 21)), type: 'workday' },  // March 21 — workday
];

<GanttChart
  tasks={tasks}
  customDays={customDays}
/>
```

---

#### 7.2.5. Custom Weekend Predicate (isWeekend prop)

For maximum flexibility, provide a base `isWeekend` predicate:

```tsx
// Sunday-only weekends (6-day work week)
const sundayOnlyWeekend = (date: Date) => {
  return date.getUTCDay() === 0; // Only Sunday (0)
};

<GanttChart
  tasks={tasks}
  isWeekend={sundayOnlyWeekend}
/>
```

```tsx
// 4-day work week (Friday, Saturday, Sunday are weekends)
const fourDayWorkWeek = (date: Date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 5 || day === 6; // Sun, Fri, Sat
};

<GanttChart
  tasks={tasks}
  isWeekend={fourDayWorkWeek}
/>
```

**Important:** `isWeekend` is the **base predicate**. Specific dates from `customDays` override it:

```tsx
// 4-day work week, but make some Fridays workdays
const customDays = [
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // Working Friday
];

<GanttChart
  tasks={tasks}
  isWeekend={fourDayWorkWeek}  // Fri-Sun are weekends
  customDays={customDays}       // But March 14 is a workday
/>
```

---

#### 7.2.6. Precedence Order

When both `customDays` and `isWeekend` are provided, the following precedence applies (highest to lowest):

1. **`customDays` with `type: 'workday'`** — overrides everything
2. **`customDays` with `type: 'weekend'`** — overrides base predicate and default
3. **`isWeekend`** predicate — base pattern (if provided)
4. **Default** — Saturday (6) and Sunday (0) only

```tsx
// Example: Same date with different types
const customDays = [
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },
];
// Result: March 14 is a WORKDAY (workday takes precedence)
```

---

#### 7.2.7. Internal Implementation

The library uses `createCustomDayPredicate()` utility from `src/utils/dateUtils.ts`:

```typescript
export interface CustomDayConfig {
  date: Date;
  type: 'weekend' | 'workday';
}

export interface CustomDayPredicateConfig {
  customDays?: CustomDayConfig[];
  isWeekend?: (date: Date) => boolean;
}

export const createCustomDayPredicate = (
  config: CustomDayPredicateConfig
): ((date: Date) => boolean) => {
  const { customDays, isWeekend: basePredicate } = config;

  // Build Set-based lookups for O(1) performance
  const workdaySet = new Set<string>();
  const weekendSet = new Set<string>();

  customDays?.forEach(({ date, type }) => {
    const key = createDateKey(date);
    if (type === 'workday') {
      workdaySet.add(key);
    } else {
      weekendSet.add(key);
    }
  });

  return (date: Date) => {
    const key = createDateKey(date);

    // Priority 1: Workday (highest)
    if (workdaySet.has(key)) {
      return false;
    }

    // Priority 2: Weekend
    if (weekendSet.has(key)) {
      return true;
    }

    // Priority 3: Base predicate
    if (basePredicate) {
      return basePredicate(date);
    }

    // Priority 4: Default
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  };
};
```

**Key Utility Functions:**

```typescript
// Creates UTC-safe date key for Set lookup: "2026-2-15"
// Note: Month is 0-indexed (0=January)
export const createDateKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
};
```

---

#### 7.2.8. Usage Examples

**Example 1: Russian Holidays 2026**

```tsx
import { GanttChart } from 'gantt-lib';

const russianHolidays2026 = [
  // New Year holidays
  { date: new Date(Date.UTC(2026, 0, 1)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 2)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 3)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 4)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 5)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 6)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 7)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 8)), type: 'weekend' },
  // Defender of the Fatherland Day
  { date: new Date(Date.UTC(2026, 1, 23)), type: 'weekend' },
  // International Women's Day
  { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },
  // Spring and Labour Day
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 2)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 3)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 4)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 5)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 6)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 7)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 8)), type: 'weekend' },
  // Victory Day
  { date: new Date(Date.UTC(2026, 4, 9)), type: 'weekend' },
  // Russia Day
  { date: new Date(Date.UTC(2026, 5, 12)), type: 'weekend' },
  // Unity Day
  { date: new Date(Date.UTC(2026, 10, 4)), type: 'weekend' },
];

<GanttChart
  tasks={tasks}
  customDays={russianHolidays2026}
/>
```

**Example 2: Holidays + Working Saturdays**

```tsx
const customDays = [
  // Holidays
  { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },   // March 8
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' },   // May 1
  // Working Saturdays (shifted workdays)
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // March 14
  { date: new Date(Date.UTC(2026, 2, 21)), type: 'workday' },  // March 21
];

<GanttChart
  tasks={tasks}
  customDays={customDays}
/>
```

**Example 3: 4-Day Work Week with Overrides**

```tsx
// Base: Fri-Sun are weekends
const fourDayWorkWeek = (date: Date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 5 || day === 6; // Sun, Fri, Sat
};

// But make some Fridays workdays
const customDays = [
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // Working Friday
  { date: new Date(Date.UTC(2026, 2, 28)), type: 'workday' },  // Working Friday
];

<GanttChart
  tasks={tasks}
  isWeekend={fourDayWorkWeek}
  customDays={customDays}
/>
```

**Example 4: Dynamic Holiday Calculation**

```tsx
import { useMemo } from 'react';

const App = () => {
  const customDays = useMemo(() => {
    const year = new Date().getUTCFullYear();
    return [
      { date: new Date(Date.UTC(year, 0, 1)), type: 'weekend' },
      { date: new Date(Date.UTC(year + 1, 0, 1)), type: 'weekend' },
    ];
  }, []);

  return <GanttChart tasks={tasks} customDays={customDays} />;
};
```

**Example 5: Calendar Component Integration**

The `Calendar` component also supports custom weekends:

```tsx
import { Calendar } from 'gantt-lib';

const isWeekend = (date: Date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Default Sat/Sun
};

<Calendar
  selected={selectedDate}
  onSelect={setSelectedDate}
  isWeekend={isWeekend}
/>
```

---

### 7.3. Task Filtering API

The library supports task filtering via a predicate-based API. You can:
- Use ready-made filters for common scenarios
- Combine filters with boolean logic (`and`, `or`, `not`)
- Create custom predicates for any filtering logic
- Pass filters to `GanttChart` via the `taskFilter` prop

**Key behaviors:**
- Filtered tasks are **hidden from view** but remain in the data
- Dependencies work on **ALL tasks** including hidden ones
- Filter updates in real-time when the predicate changes
- Filtering does NOT modify the underlying `tasks` array

---

#### 7.3.1. Basic Usage

Import the filter utilities:

```tsx
import { GanttChart, type TaskPredicate } from 'gantt-lib';
import { and, or, not, withoutDeps, expired, inDateRange, progressInRange, nameContains } from 'gantt-lib/filters';
```

Pass a filter to `GanttChart`:

```tsx
const myFilter = withoutDeps();

<GanttChart
  tasks={tasks}
  taskFilter={myFilter}
/>
```

---

#### 7.3.2. TaskPredicate Type

All filters are functions that accept a task and return a boolean:

```typescript
type TaskPredicate = (task: Task | undefined) => boolean;
```

- **Input:** `Task | undefined` — undefined is passed for placeholder/empty rows
- **Output:** `true` = show task, `false` = hide task
- **Safe:** Always check `if (!task) return false;` in custom predicates

---

#### 7.3.3. Ready-Made Filters

The library provides 6 ready-made filters for common use cases:

##### `withoutDeps()`

Filter tasks that have no dependencies:

```tsx
import { withoutDeps } from 'gantt-lib/filters';

<GanttChart
  tasks={tasks}
  taskFilter={withoutDeps()}
/>
```

**Use case:** Find root tasks that can start independently.

---

##### `expired(referenceDate?)`

Filter overdue tasks (tasks ending before the reference date):

```tsx
import { expired } from 'gantt-lib/filters';

// Uses today's date by default
<GanttChart
  tasks={tasks}
  taskFilter={expired()}
/>

// Or specify a custom reference date
<GanttChart
  tasks={tasks}
  taskFilter={expired(new Date(Date.UTC(2026, 5, 1)))}
/>
```

**Use case:** Identify delayed tasks for project recovery.

---

##### `inDateRange(rangeStart, rangeEnd)`

Filter tasks that intersect with a date range:

```tsx
import { inDateRange } from 'gantt-lib/filters';

// Show tasks in March 2026
const marchStart = new Date(Date.UTC(2026, 2, 1));
const marchEnd = new Date(Date.UTC(2026, 2, 31));

<GanttChart
  tasks={tasks}
  taskFilter={inDateRange(marchStart, marchEnd)}
/>
```

**Intersection logic:** Task intersects if `taskStart <= rangeEnd && taskEnd >= rangeStart`.

**Use case:** Focus on specific time periods (sprints, quarters).

---

##### `progressInRange(min, max)`

Filter tasks by progress percentage:

```tsx
import { progressInRange } from 'gantt-lib/filters';

// Show not started tasks (0%)
<GanttChart
  tasks={tasks}
  taskFilter={progressInRange(0, 0)}
/>

// Show in-progress tasks (1-99%)
<GanttChart
  tasks={tasks}
  taskFilter={progressInRange(1, 99)}
/>

// Show completed tasks (100%)
<GanttChart
  tasks={tasks}
  taskFilter={progressInRange(100, 100)}
/>
```

**Use case:** Track project completion status.

---

##### `nameContains(substring, caseSensitive?)`

Filter tasks by name substring:

```tsx
import { nameContains } from 'gantt-lib/filters';

// Case-insensitive search (default)
<GanttChart
  tasks={tasks}
  taskFilter={nameContains('backend')}
/>

// Case-sensitive search
<GanttChart
  tasks={tasks}
  taskFilter={nameContains('API', true)}
/>
```

**Use case:** Quick search by task name/keyword.

---

#### 7.3.4. Boolean Composites

Combine multiple filters with boolean logic:

##### `and(...predicates)`

All predicates must return `true`:

```tsx
import { and, expired, nameContains } from 'gantt-lib/filters';

// Show expired tasks containing "backend"
const filter = and(expired(), nameContains('backend'));

<GanttChart
  tasks={tasks}
  taskFilter={filter}
/>
```

---

##### `or(...predicates)`

At least one predicate must return `true`:

```tsx
import { or, withoutDeps, progressInRange } from 'gantt-lib/filters';

// Show tasks without deps OR completed tasks
const filter = or(withoutDeps(), progressInRange(100, 100));

<GanttChart
  tasks={tasks}
  taskFilter={filter}
/>
```

---

##### `not(predicate)`

Inverts the predicate logic:

```tsx
import { not, expired } from 'gantt-lib/filters';

// Hide expired tasks (show non-expired)
const filter = not(expired());

<GanttChart
  tasks={tasks}
  taskFilter={filter}
/>
```

---

#### 7.3.5. Complex Combinations

Nest composites for complex logic:

```tsx
import { and, or, not, expired, progressInRange, nameContains } from 'gantt-lib/filters';

// Show (NOT expired AND in-progress) OR tasks containing "critical"
const filter = or(
  and(not(expired()), progressInRange(1, 99)),
  nameContains('critical')
);

<GanttChart
  tasks={tasks}
  taskFilter={filter}
/>
```

---

#### 7.3.6. Custom Predicates

Create your own predicates for custom logic:

```tsx
import { type TaskPredicate } from 'gantt-lib';

// Filter by color
const blueTasks: TaskPredicate = (task) => {
  if (!task) return false;
  return task.color === '#3b82f6';
};

// Filter by parent status
const topLevelTasks: TaskPredicate = (task) => {
  if (!task) return false;
  return !task.parentId;
};

// Filter by duration (shorter than 7 days)
const shortTasks: TaskPredicate = (task) => {
  if (!task) return false;
  const start = new Date(task.startDate);
  const end = new Date(task.endDate);
  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return days < 7;
};

// Use custom predicates
<GanttChart
  tasks={tasks}
  taskFilter={blueTasks}
/>
```

---

#### 7.3.7. Combining Custom + Ready-Made

```tsx
import { and, withoutDeps } from 'gantt-lib/filters';

// Combine custom predicate with ready-made filter
const rootBackendTasks: TaskPredicate = and(
  withoutDeps(),
  (task) => task?.name.toLowerCase().includes('backend') ?? false
);

<GanttChart
  tasks={tasks}
  taskFilter={rootBackendTasks}
/>
```

---

#### 7.3.8. Dynamic Filters

Use `useState` for dynamic filter changes:

```tsx
import { useState } from 'react';
import { GanttChart } from 'gantt-lib';
import { expired, progressInRange, withoutDeps } from 'gantt-lib/filters';

export default function App() {
  const [filterType, setFilterType] = useState<'all' | 'expired' | 'completed' | 'root'>('all');

  const getFilter = () => {
    switch (filterType) {
      case 'expired': return expired();
      case 'completed': return progressInRange(100, 100);
      case 'root': return withoutDeps();
      default: return undefined;
    }
  };

  return (
    <>
      <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
        <option value="all">All Tasks</option>
        <option value="expired">Expired Only</option>
        <option value="completed">Completed Only</option>
        <option value="root">Root Tasks Only</option>
      </select>
      <GanttChart tasks={tasks} taskFilter={getFilter()} />
    </>
  );
}
```

---

#### 7.3.9. Filter Behavior Details

**Dependencies and filtering:**
- Dependencies are calculated on ALL tasks, including hidden ones
- Dragging a visible task still respects constraints from hidden predecessors
- Dependency lines from hidden tasks are not rendered

**Task list behavior:**
- Row numbers reflect the **filtered view** (not the original array index)
- Hidden tasks are excluded from row reordering
- Add/delete operations work on the full `tasks` array

**Performance:**
- Filters run on every render — keep predicates lightweight
- For large task sets (>1000), consider memoizing predicates with `useMemo`

---

#### 7.3.10. Usage Examples

**Example 1: Sprint Focus**

```tsx
import { inDateRange } from 'gantt-lib/filters';

const sprintStart = new Date(Date.UTC(2026, 2, 1));  // March 1
const sprintEnd = new Date(Date.UTC(2026, 2, 14));   // March 14

<GanttChart
  tasks={tasks}
  taskFilter={inDateRange(sprintStart, sprintEnd)}
/>
```

**Example 2: Risk Dashboard**

```tsx
import { or, and, not, expired, progressInRange } from 'gantt-lib/filters';

// Show expired OR (behind schedule)
const riskFilter = or(
  expired(),
  and(
    not(expired()),
    progressInRange(0, 50)  // Less than 50% complete
  )
);

<GanttChart
  tasks={tasks}
  taskFilter={riskFilter}
/>
```

**Example 3: Assignee Search**

```tsx
import { type TaskPredicate } from 'gantt-lib';

const byAssignee = (assigneeName: string): TaskPredicate =>
  (task) => {
    if (!task) return false;
    // Assuming you store assignee in task metadata
    return (task as any).assignee?.toLowerCase() === assigneeName.toLowerCase();
  };

<GanttChart
  tasks={tasks}
  taskFilter={byAssignee('alice')}
/>
```

**Example 4: Multi-Filter UI**

```tsx
import { useState, useMemo } from 'react';
import { GanttChart } from 'gantt-lib';
import { and, or, not, expired, progressInRange, nameContains, inDateRange } from 'gantt-lib/filters';

export default function FilterableGantt() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [progressRange, setProgressRange] = useState<[number, number]>([0, 100]);

  const filter = useMemo(() => {
    const predicates: Array<(task: any) => boolean> = [];

    if (searchQuery) {
      predicates.push(nameContains(searchQuery));
    }

    if (showExpiredOnly) {
      predicates.push(expired());
    }

    if (progressRange[0] > 0 || progressRange[1] < 100) {
      predicates.push(progressInRange(progressRange[0], progressRange[1]));
    }

    return predicates.length > 0 ? and(...predicates) : undefined;
  }, [searchQuery, showExpiredOnly, progressRange]);

  return (
    <>
      <input
        placeholder="Search tasks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={showExpiredOnly}
          onChange={(e) => setShowExpiredOnly(e.target.checked)}
        />
        Expired only
      </label>
      <GanttChart tasks={tasks} taskFilter={filter} />
    </>
  );
}
```

---

### 7.4. Controlled Collapse/Expand Mode (v0.23.0+)

The library supports both controlled and uncontrolled modes for managing parent task collapse/expand state:

**Uncontrolled Mode (default):**
- Omit `collapsedParentIds` and `onToggleCollapse` props
- Component manages internal state
- Use `ref.collapseAll()` and `ref.expandAll()` for bulk operations

**Controlled Mode:**
- Pass `collapsedParentIds: Set<string>` prop with current state
- Pass `onToggleCollapse: (parentId: string) => void` callback
- You own the state — useful for persistence, URL sync, or external controls

---

#### 7.4.1. Controlled Mode Example

```tsx
import { useState, useCallback } from 'react';
import { GanttChart, type Task } from 'gantt-lib';
import 'gantt-lib/styles.css';

export default function ControlledCollapseExample() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(new Set());

  const handleToggleCollapse = useCallback((parentId: string) => {
    setCollapsedParentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);  // Expand
      } else {
        newSet.add(parentId);     // Collapse
      }
      return newSet;
    });
  }, []);

  // Optional: Collapse/expand all via external controls
  const handleCollapseAll = useCallback(() => {
    const allParentIds = tasks
      .filter(t => !t.parentId && tasks.some(c => c.parentId === t.id))
      .map(t => t.id);
    setCollapsedParentIds(new Set(allParentIds));
  }, [tasks]);

  const handleExpandAll = useCallback(() => {
    setCollapsedParentIds(new Set());
  }, []);

  return (
    <div>
      <button onClick={handleCollapseAll}>Collapse All</button>
      <button onClick={handleExpandAll}>Expand All</button>
      <GanttChart
        tasks={tasks}
        collapsedParentIds={collapsedParentIds}
        onToggleCollapse={handleToggleCollapse}
        showTaskList={true}
        onTasksChange={(changed) => {
          const changedMap = new Map(changed.map(t => [t.id, t]));
          setTasks(prev => prev.map(t => changedMap.get(t.id) ?? t));
        }}
      />
    </div>
  );
}
```

---

#### 7.4.2. Persistence Example

```tsx
import { useEffect, useState, useCallback } from 'react';

export default function PersistentCollapseExample() {
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('gantt-collapsed');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('gantt-collapsed', JSON.stringify([...collapsedParentIds]));
  }, [collapsedParentIds]);

  const handleToggleCollapse = useCallback((parentId: string) => {
    setCollapsedParentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  }, []);

  return (
    <GanttChart
      tasks={tasks}
      collapsedParentIds={collapsedParentIds}
      onToggleCollapse={handleToggleCollapse}
    />
  );
}
```

---

#### 7.4.3. URL Sync Example

```tsx
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function URLSyncExample() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(() => {
    const collapsed = searchParams.get('collapsed');
    return collapsed ? new Set(collapsed.split(',')) : new Set();
  });

  const handleToggleCollapse = useCallback((parentId: string) => {
    setCollapsedParentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }

      // Update URL
      const collapsedArray = Array.from(newSet);
      setSearchParams(collapsedArray.length > 0
        ? { collapsed: collapsedArray.join(',') }
        : {}
      );

      return newSet;
    });
  }, [setSearchParams]);

  return (
    <GanttChart
      tasks={tasks}
      collapsedParentIds={collapsedParentIds}
      onToggleCollapse={handleToggleCollapse}
    />
  );
}
```

---

#### 7.4.4. Mode Comparison

| Feature | Uncontrolled | Controlled |
|---------|--------------|------------|
| State management | Internal (React useState) | External (your state) |
| Props needed | None | `collapsedParentIds`, `onToggleCollapse` |
| Ref methods | `collapseAll()`, `expandAll()` work | Ref methods still work (call `onToggleCollapse` per parent) |
| Persistence | Manual implementation needed | Easy — just persist your state |
| URL sync | Requires ref hacks | Direct — sync your state to URL |
| External controls | Via ref only | Direct state access |

---

### 7.5. Business Days Mode (Режим рабочих дней)

Режим рабочих дней (`businessDays`) управляет тем, как считается длительность задач — в календарных или рабочих днях.

#### 7.5.1. Prop: `businessDays`

```typescript
businessDays?: boolean;  // default: true
```

| Значение | Поведение |
|----------|-----------|
| `true` (default) | Длительность считается в **рабочих днях** (исключая выходные). Задача на 5 дней, начинающаяся в пятницу, закончится в следующую пятницу. |
| `false` | Длительность считается в **календарных днях**. Задача на 5 дней всегда заканчивается через 5 календарных дней. |

#### 7.5.2. Влияние на расчёты

Когда `businessDays={true}`:

1. **Duration calculations** — При изменении даты начала или конца, длительность пересчитывается в рабочих днях
2. **Dependency lag** — Задержка зависимостей считается в рабочих днях
3. **Task dragging** — При перетаскивании задачи она "прилипает" к будням
4. **Cascade operations** — Каскадное обновление дат учитывает выходные

#### 7.5.3. Утилиты для работы с рабочими днями

```typescript
import { getBusinessDaysCount, addBusinessDays } from 'gantt-lib';
```

**`getBusinessDaysCount(startDate, endDate, isWeekend?)`**

Подсчитывает количество рабочих дней между двумя датами.

```typescript
const count = getBusinessDaysCount(
  new Date(Date.UTC(2026, 2, 1)),  // 1 марта 2026 (пн)
  new Date(Date.UTC(2026, 2, 7)),  // 7 марта 2026 (вс)
  (date) => date.getUTCDay() === 0 || date.getUTCDay() === 6  // выходные: сб, вс
);
// count = 5 (пн, вт, ср, чт, пт)
```

**`addBusinessDays(date, days, isWeekend?)`**

Добавляет указанное количество рабочих дней к дате.

```typescript
const result = addBusinessDays(
  new Date(Date.UTC(2026, 2, 6)),  // 6 марта 2026 (пт)
  3,  // добавить 3 рабочих дня
  (date) => date.getUTCDay() === 0 || date.getUTCDay() === 6
);
// result = 11 марта 2026 (ср) — пт + 3 рабочих дня = пт, пн, вт, ср
```

#### 7.5.4. Пример использования

```tsx
import { GanttChart } from 'gantt-lib';
import 'gantt-lib/styles.css';

function ProjectSchedule() {
  return (
    <GanttChart
      tasks={tasks}
      businessDays={true}  // считать в рабочих днях (default)
      isWeekend={(date) => {
        const day = date.getUTCDay();
        return day === 0 || day === 6;  // сб, вс = выходные
      }}
      onTasksChange={handleChange}
    />
  );
}
```

#### 7.5.5. Сценарии использования

**Сценарий 1: Стандартная 5-дневная рабочая неделя**

```tsx
<GanttChart
  businessDays={true}  // default
  // выходные определяются автоматически (сб, вс)
/>
```

**Сценарий 2: 6-дневная рабочая неделя**

```tsx
<GanttChart
  businessDays={true}
  isWeekend={(date) => date.getUTCDay() === 0}  // только вс = выходной
/>
```

**Сценарий 3: Календарные дни (без выходных)**

```tsx
<GanttChart
  businessDays={false}  // считать в календарных днях
/>
```

#### 7.5.6. Взаимодействие с `customDays` и `isWeekend`

Порядок приоритета при определении выходного дня:

1. **`customDays`** — явное указание типа для конкретной даты
2. **`isWeekend`** — базовый предикат выходных (если не переопределён в `customDays`)
3. **Default** — сб (6) и вс (0) считаются выходными

Когда `businessDays={true}`:
- Выходные дни (определённые через `isWeekend` или `customDays` с `type: 'weekend'`) **исключаются** из расчёта длительности
- Рабочие дни (определённые через `customDays` с `type: 'workday'`) **включаются** в расчёт

#### 7.5.7. Особенности реализации

- **UTC dates**: Все утилиты работают с UTC датами для избежания проблем с часовыми поясами
- **Inclusive start**: При подсчёте рабочих дней начальная дата включается
- **Weekend snapping**: При перетаскивании в режиме рабочих дней задачи "прилипают" к ближайшему будню
- **Lag calculations**: Задержка зависимостей автоматически пересчитывается при изменении дат

---

## 8. Ref API

The `GanttChart` component supports an imperative handle via `ref` for programmatic control.

```typescript
interface GanttChartRef {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
  scrollToRow: (taskId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
}
```

Usage example:

```tsx
import { useRef } from 'react';
import { GanttChart } from 'gantt-lib';

function App() {
  const ganttRef = useRef<{ scrollToToday: () => void; scrollToTask: (taskId: string) => void; scrollToRow: (taskId: string) => void; collapseAll: () => void; expandAll: () => void }>(null);

  const handleTodayClick = () => {
    ganttRef.current?.scrollToToday();
  };

  const handleScrollToTask = (taskId: string) => {
    ganttRef.current?.scrollToTask(taskId);
  };

  const handleScrollToRow = (taskId: string) => {
    ganttRef.current?.scrollToRow(taskId);
  };

  const handleCollapseAll = () => {
    ganttRef.current?.collapseAll();
  };

  const handleExpandAll = () => {
    ganttRef.current?.expandAll();
  };

  return (
    <>
      <button onClick={handleTodayClick}>Today</button>
      <button onClick={() => handleScrollToRow('task-1')}>Row</button>
      <button onClick={handleCollapseAll}>Collapse All</button>
      <button onClick={handleExpandAll}>Expand All</button>
      <GanttChart ref={ganttRef} tasks={tasks} />
    </>
  );
}
```

| Method | Return Type | Description |
|---|---|---|
| `scrollToToday()` | `void` | Scrolls the chart horizontally so that today's date is centered in the viewport. If today is not within the visible date range, no action is taken. |
| `scrollToTask(taskId)` | `void` | Scrolls the chart horizontally so that the task bar with the given `taskId` is visible in the grid. If the task ID is not found, no action is taken. |
| `scrollToRow(taskId)` | `void` | Scrolls the task list vertically to the row for the given `taskId` using the current visible row order. If the task ID is not visible, no action is taken. |
| `collapseAll()` | `void` | Collapses all parent tasks in the chart. Hides all child tasks from both the task list and the chart. |
| `expandAll()` | `void` | Expands all parent tasks in the chart. Shows all child tasks in both the task list and the chart. |

---

## 9. CSS Variables

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
| `--gantt-expired-color` | `#ef4444` | Background color for expired (overdue) tasks when `highlightExpiredTasks={true}` |
| `--gantt-today-indicator-color` | `#ef4444` | Color of the vertical "today" line |
| `--gantt-today-indicator-width` | `2px` | Width of the vertical "today" line |
| `--gantt-container-border-radius` | `0px` | Border radius of the chart container element |
| `--gantt-parent-bar-color` | `#782fc4` | Color of parent task bars (gradient top section) |
| `--gantt-parent-bar-height` | `20px` | Height of parent task bar top section |
| `--gantt-parent-bar-radius` | `8px` | Corner radius of parent task bar top section |
| `--gantt-parent-ear-depth` | `6px` | Depth of trapezoid "ear" extensions on parent bars |
| `--gantt-parent-ear-width` | `8px` | Width of trapezoid "ear" extensions on parent bars |
| `--gantt-parent-row-bg` | `rgba(99, 102, 241, 0.05)` | Background color of parent rows in task list (subtle indigo tint) |

---

## 10. Drag Interactions

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

---

## 11. ValidationResult Type

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

## 12. Date Handling Rules

- **Use ISO strings.** Always pass dates as `'YYYY-MM-DD'` strings. `Date` objects from local environments can cause off-by-one errors due to timezone offsets.
- **All internal calculations are UTC.** The library uses `Date.UTC()` internally. A date string `'2026-02-01'` is treated as `2026-02-01T00:00:00Z`.
- **endDate is inclusive.** A task with `startDate: '2026-02-01'` and `endDate: '2026-02-01'` occupies exactly 1 day column. A task from Feb 1 to Feb 5 occupies 5 day columns.
- **After drag, dates in onTasksChange are ISO strings.** The callback always receives ISO UTC date strings regardless of the input format used when constructing tasks.
- **Lag values after drag are integers (days).** The library rounds lag to whole days.

---

## 13. onTasksChange Pattern — Correct Usage

The `onTasksChange` prop receives an array of **only the changed tasks**. You must merge these into your state. Single task changes are delivered as a single-element array.

```tsx
// CORRECT: merge changed tasks into state
const handleTasksChange = useCallback((changedTasks: Task[]) => {
  setTasks(prev => {
    const changedMap = new Map(changedTasks.map(t => [t.id, t]));
    return prev.map(t => changedMap.get(t.id) ?? t);
  });
}, []);

<GanttChart tasks={tasks} onTasksChange={handleTasksChange} />
```

**What onTasksChange receives per operation:**

| Operation | Array Contents |
|-----------|----------------|
| Edit task name | `[task]` |
| Edit task progress | `[task]` or `[child, parent]` (if parent exists) |
| Drag/resize (no cascade) | `[task]` |
| Cascade | `[task1, task2, ...]` (chain + parent updates) |
| Reorder | full `reorderedTasks` array |
| Delete | tasks with cleaned dependencies |

**For REST API:**
```tsx
onTasksChange={(tasks) => {
  tasks.forEach(t => patch(`/api/tasks/${t.id}`, t))
}}
```

**For batch REST API:**
```tsx
onTasksChange={(tasks) => patch('/api/tasks', { tasks })}
```

---

## 14. enableAutoSchedule vs onCascade

Three distinct operating modes depending on prop combinations:

| `enableAutoSchedule` | `onCascade` provided | Mode | Behavior |
|---|---|---|---|
| `false` (default) | any | **Soft / visual only** | Tasks move independently. Dependency lines are visual only — no constraints enforced on drag. `onTasksChange` fires on each drag. |
| `true` | no | **Soft cascade** | Predecessors drag successors. On drag end, updated tasks with recalculated lag values are returned via `onTasksChange`. |
| `true` | yes | **Hard cascade** | Predecessors drag successors with real-time preview. On drag end, `onCascade` fires with all shifted tasks. `onTasksChange` does NOT fire for cascaded drags. |

**State update rule for hard cascade:**
```tsx
// Update tasks from onCascade, not from onTasksChange, in hard mode
<GanttChart
  tasks={tasks}
  enableAutoSchedule={true}
  onTasksChange={handleTasksChange}  // fires for non-cascade drags (resize of leaf task, etc.)
  onCascade={(shifted) => {          // fires for cascade drags — takes precedence
    setTasks(prev => {
      const map = new Map(shifted.map(t => [t.id, t]));
      return prev.map(t => map.get(t.id) ?? t);
    });
  }}
/>
```

---

## 15. AI Agent Usage Notes

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

**onTasksChange vs onCascade**
- When `enableAutoSchedule={true}` and `onCascade` is provided, update your state from `onCascade`, not from `onTasksChange`. They are mutually exclusive per drag event.

**Locked tasks**
- Use `locked: true` to prevent drag, resize, and editing of a task. This is independent from progress and accepted properties.
- When a task is locked, both the task bar and task list cells become non-interactive.

**Task List**
- Enable with `showTaskList={true}` prop. Shows a table on the left with №, Name, Start Date, End Date, Dependencies columns.
- Task list scrolls horizontally in sync with the chart. Row selection highlights both the list row and the task bar.
- Inline editing: click to edit, Enter to save, Esc to cancel. Press F2 to enter edit mode for the selected task name.
- **Action Panel:** Hover over any row to reveal "+" (insert) and trash (delete) buttons in the name cell.
  - Click "+" to insert a new task below that row (triggers `onAdd` callback with the task ID).
  - Click trash to delete the task (triggers `onDelete` callback with the task ID).
  - Implement `onAdd` and `onDelete` handlers to manage your tasks array.
- Dependencies column displays chips with SVG icons for link types (FS/SS/FF/SF) and lag values.
- Click on a dependency chip to highlight the corresponding arrow on the chart and scroll to the predecessor task.
- Click the same chip again to toggle off the selection.
- When a dependency chip is selected, the "add link" button is hidden to avoid UI clutter.
- During link creation mode, click the source cell again to cancel (cursor shows pointer, not blocked).
- Click the task number to scroll the chart to that task and highlight the row.
- Use `taskListWidth` to control the panel width (default: 520px).
- Use `disableTaskNameEditing={true}` to globally disable name editing.
- Use `disableDependencyEditing={true}` to globally disable dependency editing. Date editing is automatically disabled for locked tasks.

**Scroll to Today / Scroll to Task**
- Use `ref` to access `scrollToToday()`, `scrollToTask(taskId)`, and `scrollToRow(taskId)` methods for programmatic scroll.
- `scrollToToday()` centers the current date in the viewport.
- `scrollToTask(taskId)` scrolls the chart grid to the specified task bar.
- `scrollToRow(taskId)` scrolls the task list to the specified row.
- Example: `ganttRef.current?.scrollToToday()`, `ganttRef.current?.scrollToTask('task-1')`, or `ganttRef.current?.scrollToRow('task-1')`
- **Calendar Navigation Buttons:** The task list header includes quick-jump buttons (-7, -1, Today, +1, +7) for fast navigation. Click to shift the chart view by the specified number of days.

**Collapse/Expand All**
- Use `ref` to access `collapseAll()` and `expandAll()` methods for bulk hierarchy operations.
- `collapseAll()` collapses all parent tasks, hiding their children.
- `expandAll()` expands all parent tasks, showing their children.
- Example: `ganttRef.current?.collapseAll()` or `ganttRef.current?.expandAll()`

**View Mode (Day/Week)**
- Use `viewMode` prop to switch between day and week display modes.
- `viewMode='day'` (default): Shows daily columns with weekend highlighting.
- `viewMode='week'`: Shows weekly columns with weekends skipped. Month separators render at week boundaries for visual clarity.
- Week mode is useful for long-term project views where daily granularity is not required.

**Expired tasks highlight**
- Enable with `highlightExpiredTasks={true}` prop.
- An expired task is one where today is within the task's date range AND progress is less than the elapsed percentage.
- Expired tasks render with the `--gantt-expired-color` background (default: red #ef4444).
- The progress bar for expired tasks displays in a darker red color.

**Progress bar states summary**

| `progress` | `accepted` | Visual Result |
|---|---|---|
| `undefined` or `0` | any | No progress bar rendered |
| 1–99 | any | Partial progress bar in `--gantt-progress-color` |
| `100` | `false` or `undefined` | Full bar in `--gantt-progress-completed` (yellow) |
| `100` | `true` | Full bar in `--gantt-progress-accepted` (green) |

**Task Hierarchy (Parent-Child Relationships)**
- Set `parentId` on a task to make it a child of another task.
- **Parent task bar styling:** Displays with MS Project-style bracket appearance — rounded top bar with trapezoid "ear" extensions on left and right sides. The color is controlled by `--gantt-parent-bar-color` (default: purple #782fc4).
- **Parent row background:** Task list rows for parents display with subtle indigo tint (`--gantt-parent-row-bg`). This helps visually distinguish parent tasks from root and child tasks.
- **Collapse/expand:** Parent tasks show a collapse/expand button (-/+) in the task list. When collapsed, children are hidden from both the task list and the chart.
- **Virtual dependency links:** When a parent is collapsed, dependency lines from hidden children connect to/from the parent's bar edges, maintaining visual continuity of the project network.
- **Child tasks:** Indented in the task list with "⬆" button to promote (remove parentId).
- **Root tasks:** Show "⬇" button to demote (become a child of the previous task).
- **Drag-and-drop parent inference:** When dragging a task between child tasks, it automatically inherits their parent. If neither task above nor below has a parent, the task becomes root-level.
- **Promote behavior:** Clicking "⬆" moves the task after the last sibling of its current parent and removes `parentId`.
- **Demote behavior:** Clicking "⬇" makes the task a child of the previous task. If the previous task is already a child, the task becomes a sibling (same parent).
- **Implement `onReorder`:** The callback receives `(reorderedTasks, movedTaskId, inferredParentId)`. Update `parentId` of `movedTaskId` to `inferredParentId` (or remove `parentId` if `inferredParentId` is undefined).
- **Implement `onPromoteTask` (optional):** If provided, this callback is called when the user clicks the "⬆" button. Remove `parentId` and optionally reposition the task after its last sibling. If not provided, the library uses internal default logic (calls `onTasksChange` with the updated task).
- **Implement `onDemoteTask` (optional):** If provided, this callback is called when the user clicks the "⬇" button. Set `parentId` to the specified parent task ID. The library automatically removes dependencies between the two tasks to prevent circular references. If not provided, the library uses internal default logic (calls `onTasksChange` with the updated task and parent).
- **Parent date computation:** Parent task dates are automatically computed as the min/max of all child dates. When children are added/removed/moved, parent dates update automatically.
- **Parent progress calculation:** Computed as a weighted average based on child task durations (longer children have more influence on parent progress).
- **Cascade delete:** Deleting a parent task also deletes all its descendants (children and their children). The library also cleans up dependencies pointing to any deleted tasks.
- **Controlled collapse mode:** Pass `collapsedParentIds` Set and `onToggleCollapse` callback to control collapse state from parent component. Omit these props for uncontrolled mode (internal state).

---

## 16. Public Exports

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

## 17. Performance Notes

- `onTasksChange` fires once on mouseup — not on every drag frame. Safe with 100+ tasks.
- `TaskRow` uses `React.memo` with a custom comparator. Only the dragged row re-renders during drag.
- During cascade drag, chain member rows re-render from CSS transform overrides, not React state updates.
- For very large task lists (500+), consider virtualizing the row container — the library does not virtualize internally.

---

## 18. Known Constraints and Edge Cases

| Scenario | Behavior |
|---|---|
| `tasks` array is empty | Chart renders with no rows. Calendar defaults to the current month. |
| Task with `startDate > endDate` | Undefined visual behavior — the task bar may render with zero or negative width. Always ensure `startDate <= endDate`. |
| Circular dependency (A → B → A) | Reported as `'cycle'` error in `ValidationResult`. Chart still renders but drag constraints may behave unexpectedly. |
| `taskId` in dependency not found | Reported as `'missing-task'` error. The dependency line for that link is not rendered. |
| `disableConstraints={true}` | Drag freely ignores all FS/SS/FF/SF constraints. Validation still runs and reports via `onValidateDependencies`. |
| Two tasks with the same `id` | Undefined behavior — cascade and validation operate on the first match. Always use unique IDs. |
| `dayWidth` below 20 | Day labels in the header become illegible but no error is thrown. Layout still functions. |
| Circular hierarchy (A is parent of B, B is parent of A) | Prevented by `onDemoteTask` — the library detects circular dependencies and blocks the operation. The task remains unchanged. |
| Deleting a parent task | All descendants (children and their children) are also deleted. This is cascade delete behavior. |
| Parent task with no children | Parent displays with its manually set dates (or defaults to current date). Progress is 0 if no children exist. |
| Moving a collapsed parent | All hidden children move with the parent by the same delta. Dependency successors of collapsed children also cascade appropriately. |
| Virtual dependency links | When a parent is collapsed, dependency lines from hidden children connect to/from the parent's edges for visual continuity. |

---
