# Task Interface

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

## Task Hierarchy — Parent-Child Relationships (v0.18.0+)

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

[← Back to API Reference](./INDEX.md)
