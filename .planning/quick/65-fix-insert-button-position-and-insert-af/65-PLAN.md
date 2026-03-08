---
phase: quick-65
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "Insert button is positioned inside the 'Связи' (Dependencies) cell alongside the chips"
    - "Insert button appears on hover within the deps cell, not on the row left edge"
    - "Clicking insert button calls onInsertAfter(taskId, newTask) with current task ID and new task object"
    - "The new callback properly inserts the task after the current task in the array"
    - "Button uses inline-flex layout to sit alongside chips and '+' add dependency button"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Insert button inside deps cell with onInsertAfter callback"
      contains: "onInsertAfter"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Inline-flex insert button styles for deps cell"
      contains: ".gantt-tl-dep-insert"
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "onInsertAfter prop and handler"
      contains: "onInsertAfter"
  key_links:
    - from: "TaskListRow deps cell insert button click"
      to: "onInsertAfter(taskId, newTask)"
      via: "handleInsertAfter callback"
      pattern: "onInsertAfter\\(.*taskId.*newTask"
    - from: "GanttChart onInsertAfter"
      to: "Consumer callback with updated tasks array"
      via: "functional updater inserting after index"
      pattern: "tasks\\.slice.*index.*newTask"
---

<objective>
Fix insert button position to be inside the 'Связи' (Dependencies) cell and implement onInsertAfter callback for proper task insertion.

Purpose: Improve UX by placing the insert button contextually within the deps cell alongside chips, and implement proper insertion logic that places the new task after the current task in the array (not just at the end).
Output: Insert button positioned inline in deps cell, onInsertAfter(taskId, newTask) callback implemented.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/64-add-hover-button-to-insert-task-below-cu/64-PLAN.md
@.planning/STATE.md

<interfaces>
<!-- Key contracts from existing code -->

From packages/gantt-lib/src/components/TaskList/TaskListRow.tsx (current implementation):
```typescript
export interface TaskListRowProps {
  onAdd?: (task: Task) => void;
  // ... other props
}

// Current insert button (left side of row, to be removed):
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

From packages/gantt-lib/src/components/TaskList/TaskListRow.tsx (deps cell structure):
```typescript
{/* Dependencies column */}
<div
  className="gantt-tl-cell gantt-tl-cell-deps"
  onClick={isPicking && !isSourceRow ? handlePredecessorPick : undefined}
>
  {/* ... chips, overflow popover, "+" add dependency button ... */}

  {/* "+" add dependency button — hidden in picker mode and when editing disabled */}
  {!disableDependencyEditing && !isPicking && (
    <button
      type="button"
      className="gantt-tl-dep-add"
      onClick={handleAddClick}
      aria-label="Добавить связь"
    >
      +
    </button>
  )}
</div>
```

From packages/gantt-lib/src/components/TaskList/TaskList.css (existing button patterns):
```css
/* "+" add dependency button */
.gantt-tl-dep-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px dashed rgba(59, 130, 246, 0.4);
  border-radius: 4px;
  width: 23px;
  height: 23px;
  font-size: 0.9rem;
  color: #3b82f6;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  flex-shrink: 0;
}

.gantt-tl-dep-add:hover {
  background-color: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}
```

From packages/gantt-lib/src/components/GanttChart/GanttChart.tsx (existing callback pattern):
```typescript
export interface GanttChartProps {
  onAdd?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  // ... other props
}

// TaskList receives these callbacks:
<TaskList
  onAdd={onAdd}
  onDelete={handleDelete}
  // ... other props
/>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add onInsertAfter callback to GanttChart and TaskList</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx, packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
    Add new onInsertAfter callback that receives both taskId and newTask, enabling proper insertion after the current task.

    **Step 1: Update GanttChartProps interface**
    Add after onDelete (around line 113):
    ```typescript
    /** Callback when a new task is inserted after a specific task via the task list */
    onInsertAfter?: (taskId: string, newTask: Task) => void;
    ```

    **Step 2: Add onInsertAfter to destructured props**
    Add to the destructured props in GanttChart component (around line 157):
    ```typescript
    onInsertAfter,
    ```

    **Step 3: Pass onInsertAfter to TaskList**
    Update TaskList props (around line 494):
    ```typescript
    <TaskList
      // ... existing props
      onInsertAfter={onInsertAfter}
    />
    ```

    **Step 4: Update TaskListProps interface in TaskList.tsx**
    Add to TaskListProps interface:
    ```typescript
    /** Callback when a new task is inserted after a specific task */
    onInsertAfter?: (taskId: string, newTask: Task) => void;
    ```

    **Step 5: Pass onInsertAfter to TaskListRow**
    Update TaskListRow rendering to pass the callback through.
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npx tsc --noEmit</automated>
  </verify>
  <done>TypeScript compiles without errors. onInsertAfter callback flows from GanttChart → TaskList → TaskListRow.</done>
</task>

<task type="auto">
  <name>Task 2: Move insert button to deps cell and implement onInsertAfter in TaskListRow</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx, packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    Move the insert button from the left row edge to inside the deps cell, and change callback to onInsertAfter(taskId, newTask).

    **Step 1: Update TaskListRowProps interface**
    Replace onAdd with onInsertAfter (around line 193):
    ```typescript
    /** Callback when a new task is inserted after this task */
    onInsertAfter?: (taskId: string, newTask: Task) => void;
    ```

    **Step 2: Remove the left-side insert button**
    Delete the entire insert button block that's currently rendered after the trash button (lines 370-396).

    **Step 3: Add insert button to deps cell**
    Inside the deps cell div, add the insert button after the "+" add dependency button (around line 537):
    ```tsx
    {/* Insert task button — inline with chips, shown on hover */}
    {onInsertAfter && !isPicking && (
      <button
        type="button"
        className="gantt-tl-dep-insert"
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
          onInsertAfter(task.id, newTask);
        }}
        aria-label="Вставить задачу после этой"
      >
        <PlusIcon />
      </button>
    )}
    ```

    **Step 4: Add CSS for inline insert button**
    Add to TaskList.css after the .gantt-tl-dep-add styles (around line 487):
    ```css
    /* Insert task button — inline in deps cell, green to differentiate */
    .gantt-tl-dep-insert {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px dashed rgba(34, 197, 94, 0.4);
      border-radius: 4px;
      width: 23px;
      height: 23px;
      font-size: 0.9rem;
      color: var(--gantt-success-color, #22c55e);
      cursor: pointer;
      padding: 0;
      font-family: inherit;
      flex-shrink: 0;
      opacity: 0.6;
      transition: opacity 0.15s ease;
    }

    .gantt-tl-dep-insert:hover {
      background-color: rgba(34, 197, 94, 0.1);
      border-color: var(--gantt-success-color, #22c55e);
      opacity: 1;
    }

    /* Reveal on cell hover when not in picker mode */
    .gantt-tl-cell-deps:hover .gantt-tl-dep-insert {
      opacity: 1;
    }
    ```

    **Step 5: Remove old row-level insert button CSS**
    Delete the .gantt-tl-row-insert styles from TaskList.css (lines 109-142).
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npx vitest run</automated>
  </verify>
  <done>Insert button positioned inline in deps cell, visible on hover. Button calls onInsertAfter(task.id, newTask). Old left-side button and CSS removed. Tests pass.</done>
</task>

<task type="auto">
  <name>Task 3: Implement consumer-side onInsertAfter handler in demo page</name>
  <files>packages/website/app/page.tsx</files>
  <action>
    Update the demo page to implement onInsertAfter handler that properly inserts the task after the specified task.

    **Step 1: Replace onAdd with onInsertAfter**
    Find the GanttChart component usage and replace onAdd with onInsertAfter.

    **Step 2: Implement insertion logic**
    Add handler that inserts the task after the specified task ID:
    ```typescript
    const handleInsertAfter = useCallback((taskId: string, newTask: Task) => {
      setTasks(prevTasks => {
        const index = prevTasks.findIndex(t => t.id === taskId);
        if (index === -1) return prevTasks;
        // Insert after the found index
        const newTasks = [...prevTasks];
        newTasks.splice(index + 1, 0, newTask);
        return newTasks;
      });
    }, []);
    ```

    **Step 3: Pass handler to GanttChart**
    ```typescript
    <GanttChart
      // ... other props
      onInsertAfter={handleInsertAfter}
    />
    ```
  </action>
  <verify>
    <automated>cd packages/website && npx tsc --noEmit</automated>
  </verify>
  <done>Demo page implements onInsertAfter handler that inserts task after specified task in array. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- GanttChartProps has onInsertAfter?(taskId: string, newTask: Task) callback
- TaskListProps passes onInsertAfter through to TaskListRow
- TaskListRow renders insert button inline in deps cell (not on row left edge)
- Insert button uses .gantt-tl-dep-insert class with inline-flex layout
- Insert button has green styling (dashed border, green color, green hover state)
- Insert button calls onInsertAfter(task.id, newTask) on click
- Demo page implements handler that inserts task after specified index
- Old .gantt-tl-row-insert CSS removed
- Full vitest suite passes
- TypeScript compiles without errors
</verification>

<success_criteria>
Insert button positioned inside the 'Связи' (Dependencies) cell alongside chips and add dependency button. Button reveals on cell hover with green styling. Clicking calls onInsertAfter(taskId, newTask) callback which properly inserts the new task after the current task in the array.
</success_criteria>

<output>
After completion, create `.planning/quick/65-fix-insert-button-position-and-insert-af/65-SUMMARY.md`
</output>
