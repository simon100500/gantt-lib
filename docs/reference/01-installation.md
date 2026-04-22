# Installation

**Version:** 0.74.0

## Package Identity

| Property | Value |
|---|---|
| Package name | `gantt-lib` |
| Version | `0.74.0` |
| NPM install | `npm install gantt-lib` |
| Peer dependencies | `react >= 18`, `react-dom >= 18` |
| CSS import (REQUIRED) | `import 'gantt-lib/styles.css'` |
| Main import | `import { GanttChart, type Task, type TaskDependency, type TaskPredicate } from 'gantt-lib'` |
| Filters import | `import { and, or, not, withoutDeps, expired, inDateRange, progressInRange, nameContains } from 'gantt-lib/filters'` |
| Date utils import | `import { getBusinessDaysCount, addBusinessDays } from 'gantt-lib'` |

The CSS import MUST appear as a separate import line. Without it, task bars, grid lines, and layout will not render correctly.

---

## Installation

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

## Minimal Working Example

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

## Full Example with Hierarchy and All Props

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

[← Back to API Reference](./INDEX.md)
