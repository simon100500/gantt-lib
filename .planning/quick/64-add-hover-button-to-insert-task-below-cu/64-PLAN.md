---
phase: quick-64
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "Hovering over a task row reveals a '+' button on the left side (near the № cell)"
    - "Clicking the '+' button on a row inserts a new task below that row"
    - "The '+' button only appears when onAdd callback is provided"
    - "The new task is created with the same properties as the global add button (UUID, today's date, etc.)"
    - "Hover behavior matches existing trash button pattern (opacity transition, hidden by default)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Insert task button component and handler"
      contains: "insertTaskButton"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Hover-reveal styles for insert button"
      contains: ".gantt-tl-row-insert"
  key_links:
    - from: "TaskListRow insert button click"
      to: "onAdd callback with new Task object"
      via: "handleInsertTask callback"
      pattern: "onAdd.*crypto.randomUUID"
    - from: "TaskListRow hover state"
      to: "insert button visibility"
      via: "CSS :hover selector"
      pattern: "\\.gantt-tl-row:hover.*\\.gantt-tl-row-insert"
---

<objective>
Add a hover-reveal '+' button to each task row that inserts a new task below the current row.

Purpose: Provide quick task insertion contextually within the task list, allowing users to add tasks at specific positions without scrolling to the bottom. Matches the existing trash button UX pattern for consistency.
Output: Hover-reveal insert button on each row, positioned near the № cell, gated on onAdd prop.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/16-adding-tasks/16-01-SUMMARY.md
@.planning/phases/16-adding-tasks/16-02-SUMMARY.md
@.planning/STATE.md

<interfaces>
<!-- Key contracts from existing code -->

From packages/gantt-lib/src/components/TaskList/TaskList.tsx:
```typescript
export interface TaskListProps {
  onAdd?: (task: Task) => void;
  // ... other props
}

// TaskListRow already receives onAdd prop
<TaskListRow
  onAdd={onAdd}
  // ... other props
/>
```

From packages/gantt-lib/src/components/TaskList/TaskList.tsx handleConfirmNewTask:
```typescript
const handleConfirmNewTask = useCallback((name: string) => {
  const now = new Date();
  const todayISO = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
  )).toISOString().split('T')[0];
  const endISO = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7
  )).toISOString().split('T')[0];
  const newTask: Task = {
    id: crypto.randomUUID(),
    name,
    startDate: todayISO,
    endDate: endISO,
  };
  onAdd?.(newTask);
  setIsCreating(false);
}, [onAdd]);
```

From packages/gantt-lib/src/components/TaskList/TaskListRow.tsx (existing pattern):
```typescript
export interface TaskListRowProps {
  onAdd?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  // ... other props
}

// Existing hover-reveal trash button pattern:
<button
  type="button"
  className="gantt-tl-row-trash"
  onClick={(e) => {
    e.stopPropagation();
    onDelete?.(task.id);
  }}
>
  <TrashIcon />
</button>
```

From packages/gantt-lib/src/components/TaskList/TaskList.css (existing hover-reveal pattern):
```css
.gantt-tl-row-trash {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.gantt-tl-row:hover .gantt-tl-row-trash {
  opacity: 1;
  pointer-events: auto;
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add insert button component and handler to TaskListRow</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    Add a hover-reveal insert button to TaskListRow that creates a new task below the current row.

    1. **Add PlusIcon component** after TrashIcon (around line 36):
    ```tsx
    const PlusIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
    ```

    2. **Add onAdd to TaskListRowProps interface** (already exists, verify it's there)

    3. **Add insert button in the row JSX** (find the trash button rendering around line 450+):
    - Position the insert button absolutely on the LEFT side of the row (near the № cell)
    - Use the same hover-reveal pattern as the trash button
    - Add stopPropagation to prevent row selection when clicking the button
    - Gate rendering on `!!onAdd` (only show when callback provided)

    The insert button should render after the trash button or as a sibling element:
    ```tsx
    {/* Insert task button - hover-reveal on left side */}
    {onAdd && (
      <button
        type="button"
        className="gantt-tl-row-insert"
        onClick={(e) => {
          e.stopPropagation();
          const now = new Date();
          const todayISO = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
          )).toISOString().split('T')[0];
          const endISO = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7
          )).toISOString().split('T')[0];
          const newTask: Task = {
            id: crypto.randomUUID(),
            name: 'Новая задача',
            startDate: todayISO,
            endDate: endISO,
          };
          onAdd(newTask);
        }}
        aria-label="Вставить задачу ниже"
      >
        <PlusIcon />
      </button>
    )}
    ```

    Positioning: Left side of row, vertically centered (same as trash button but mirrored horizontally).
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npx vitest run</automated>
  </verify>
  <done>TaskListRow.tsx renders insert button on hover, gated on onAdd prop. Button creates task with UUID, default name "Новая задача", and today/today+7 dates. Full vitest suite passes.</done>
</task>

<task type="auto">
  <name>Task 2: Add CSS styles for insert button hover-reveal</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    Add hover-reveal CSS styles for the insert button, mirroring the trash button pattern.

    Add after the `.gantt-tl-row-trash` styles (around line 100):

    ```css
    /* Hover-reveal insert button on task rows - left side */
    .gantt-tl-row-insert {
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 3px;
      border-radius: 3px;
      color: var(--gantt-text-muted, #9ca3af);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gantt-tl-row-insert:hover {
      background-color: rgba(34, 197, 94, 0.1);
      color: var(--gantt-success-color, #22c55e);
    }

    .gantt-tl-row:hover .gantt-tl-row-insert {
      opacity: 1;
      pointer-events: auto;
    }

    /* When both insert and trash are visible, ensure no overlap */
    .gantt-tl-row:hover .gantt-tl-row-insert:hover {
      opacity: 1;
    }
    ```

    Style notes:
    - Mirrors trash button positioning (left instead of right)
    - Green hover state to differentiate from delete action
    - Same opacity transition for smooth reveal
    - Slightly larger padding (3px vs 2px) for better touch target
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npx tsc --noEmit</automated>
  </verify>
  <done>TaskList.css has .gantt-tl-row-insert styles with hover-reveal, green hover state, and smooth opacity transition. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` has insert button with PlusIcon
- Insert button only renders when `onAdd` prop is provided
- Clicking insert button calls `onAdd` with new Task object (UUID, default name, today dates)
- `packages/gantt-lib/src/components/TaskList/TaskList.css` has `.gantt-tl-row-insert` styles
- Button reveals on hover with opacity transition (hidden by default)
- Button positioned on left side of row (mirrors trash button on right)
- Full vitest suite passes green
- TypeScript compiles without errors
</verification>

<success_criteria>
Hover-reveal insert button (+ icon) appears on left side of each row when onAdd is provided. Clicking creates new task below current row with default properties. Matches trash button UX pattern for consistency.
</success_criteria>

<output>
After completion, create `.planning/quick/64-add-hover-button-to-insert-task-below-cu/64-SUMMARY.md`
</output>
