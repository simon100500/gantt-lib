---
phase: quick
plan: 097
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Parent task cannot be dragged between its own children"
    - "Parent task cannot be dragged between another parent's children"
    - "Drag handle is hidden for parent tasks (visually indicates non-draggable)"
    - "Child tasks can still be dragged normally"
    - "Root-level non-parent tasks can still be dragged normally"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "canDragTask helper function that validates drag operations"
      min_lines: 30
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Drag handle visibility conditionally hidden for parent tasks"
      exports: ["isTaskDraggable"]
  key_links:
    - from: "TaskListRow.tsx"
      to: "dependencyUtils.ts"
      via: "isTaskParent utility function"
      pattern: "isTaskParent.*taskId.*tasks"
    - from: "TaskList.tsx"
      to: "TaskListRow.tsx"
      via: "isDraggable prop"
      pattern: "isDraggable.*task"
---

<objective>
Fix drag-and-drop restrictions for parent tasks in single-level nesting hierarchy.

Purpose: Prevent invalid drag operations where a parent task would become nested (either as its own child or as a child of another parent), which violates the single-level nesting constraint.

Output: Parent tasks are non-draggable, child and root tasks remain draggable.
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/STATE.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/utils/dependencyUtils.ts
@D:/Projects/gantt-lib/packages/gantt-lib/src/types/index.ts
</execution_context>

<context>
## Current Behavior

**Drag handle** (TaskListRow.tsx line 744-754):
- All tasks show a drag handle (`draggable={true}`)
- No check for whether task is a parent
- Parent tasks can be dragged anywhere, including between their own children

**Single-level nesting constraint**:
- Task hierarchy has only one level of nesting (parent -> children)
- No grandchildren allowed (child -> grandchild)
- Moving a parent between children violates this constraint

## Problem Scenarios

1. **Parent dragged between own children**:
   - Parent A has children [Child1, Child2, Child3]
   - User drags Parent A between Child1 and Child2
   - Result: Parent becomes nested (invalid)

2. **Parent dragged between another parent's children**:
   - Parent A has children, Parent B has children
   - User drags Parent A between Parent B's children
   - Result: Parent A becomes child of Parent B (invalid)

## Existing Utilities

From `dependencyUtils.ts`:
- `isTaskParent(taskId, tasks)` - returns true if task has children
- `getChildren(parentId, tasks)` - returns all children of a parent
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add canDragTask validation helper to TaskList.tsx</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
    Add a helper function at component level (before return statement) to check if a task can be dragged:

    ```typescript
    const canDragTask = useCallback((taskId: string): boolean => {
      // Parent tasks cannot be dragged
      // This prevents them from becoming nested (either as their own child or another parent's child)
      return !isTaskParent(taskId, tasks);
    }, [tasks]);
    ```

    Import isTaskParent from dependencyUtils if not already imported:
    ```typescript
    import { isTaskParent } from '../../utils/dependencyUtils';
    ```

    This helper will be passed to TaskListRow to determine drag handle visibility.
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | head -20</automated>
  </verify>
  <done>
    canDragTask helper added to TaskList component, imported isTaskParent
  </done>
</task>

<task type="auto">
  <name>Task 2: Pass isDraggable prop to TaskListRow and conditionally render drag handle</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx, packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
    Part 1 - Update TaskList.tsx to pass isDraggable to each TaskListRow:
    In the visibleTasks.map section around line 552, add isDraggable prop:
    ```typescript
    <TaskListRow
      key={task.id}
      task={task}
      rowIndex={index}
      // ... existing props ...
      isDraggable={canDragTask(task.id)}
    />
    ```

    Part 2 - Update TaskListRow.tsx:
    1. Add isDraggable to props interface (around line 305):
    ```typescript
    /** Whether this task can be dragged (parent tasks cannot) */
    isDraggable?: boolean;
    ```

    2. Add to destructuring (around line 347):
    ```typescript
    isDraggable = true, // default to true for backward compatibility
    ```

    3. Conditionally render drag handle (modify line 744-754):
    ```typescript
    {isDraggable && (
      <span
        className="gantt-tl-drag-handle"
        draggable={true}
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart?.(rowIndex, e);
        }}
        onDragEnd={(e) => onDragEnd?.(e)}
        onClick={(e) => e.stopPropagation()}
      >
        <DragHandleIcon />
      </span>
    )}
    ```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -30</automated>
  </verify>
  <done>
    Drag handle hidden for parent tasks, visible for child and root tasks
  </done>
</task>

<task type="checkpoint:human-verify">
  <what-built>Drag restriction for parent tasks in task list</what-built>
  <how-to-verify>
    1. Start the dev server: npm run dev
    2. Open the browser and navigate to the demo page
    3. Create a parent task with at least 2 children
    4. Verify: Parent task does NOT show a drag handle (6-dot icon in № column)
    5. Verify: Child tasks DO show drag handles
    6. Try to drag a child task - should work normally
    7. Try to drag a parent task - should not be possible (no handle to grab)
    8. Test with multiple parent groups - verify all parents have no drag handles
  </how-to-verify>
  <resume-signal>Type "approved" if drag handles are correctly hidden for parent tasks</resume-signal>
</task>

</tasks>

<verification>
Manual verification steps:
1. Create a parent task "Parent A" with 2-3 children
2. Verify Parent A has no drag handle in the № column
3. Verify all children have drag handles
4. Create another parent task "Parent B" with children
5. Verify Parent B also has no drag handle
6. Drag a child from Parent A to between Parent B's children - should work
7. Verify parent tasks cannot be grabbed/dragged at all
</verification>

<success_criteria>
- Parent tasks do not display drag handles
- Child tasks display drag handles and can be dragged
- Root-level (non-parent) tasks display drag handles and can be dragged
- No TypeScript errors
- Build completes successfully
</success_criteria>

<output>
After completion, create `.planning/quick/097-fix-parent-drag-restriction/097-SUMMARY.md`
</output>
