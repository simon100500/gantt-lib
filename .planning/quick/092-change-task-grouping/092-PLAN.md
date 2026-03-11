---
phase: quick
plan: 092
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/utils/dependencyUtils.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "When demoting a task below an already-child task, it becomes a sibling (same parent) not a grandchild"
    - "When dragging a task between existing child tasks, it automatically becomes a child of their parent"
    - "When dragging a regular task below a child task, it becomes a child of the same parent"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Updated demote handler that finds parent of previous task"
      min_lines: 20
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "Smart demote and drag-drop handlers that infer parent from context"
      min_lines: 40
    - path: "packages/gantt-lib/src/utils/dependencyUtils.ts"
      provides: "Utility function to find parent of a task"
      exports: ["findParentId"]
  key_links:
    - from: "TaskListRow.tsx"
      to: "GanttChart.tsx"
      via: "onDemoteTask callback"
      pattern: "onDemoteTask.*taskId.*parentId"
    - from: "GanttChart.tsx"
      to: "dependencyUtils.ts"
      via: "findParentId utility function"
      pattern: "findParentId.*tasks"
---

<objective>
Change task grouping behavior to make hierarchy operations more intuitive:
1. Demote (понижение) should infer parent from context - if previous task is a child, use its parent
2. Drag-and-drop reordering should automatically set parentId based on drop position
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/STATE.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/utils/dependencyUtils.ts
@D:/Projects/gantt-lib/packages/gantt-lib/src/types/index.ts
</execution_context>

<context>
## Current Behavior

**Demote button** (TaskListRow.tsx line 502-510):
- Finds previous task in `allTasks[currentIndex - 1]`
- Sets that task as parent: `onDemoteTask(task.id, previousTask.id)`
- Problem: If previous task is already a child, creates grandchild nesting

**Drag-and-drop** (TaskList.tsx line 289-316):
- Simply reorders tasks in array
- Does not adjust `parentId` based on new position
- Problem: Task can be moved between children but doesn't become a child

## Desired Behavior

**Smart Demote**:
- If previous task has no parentId → use previous task as parent (current behavior)
- If previous task has a parentId → use that parent (sibling behavior)

**Smart Drag-Drop**:
- When dropping between tasks that share a parent → set parentId to that parent
- When dropping below a child task → set parentId to that child's parent
- When dropping at root level → remove parentId

## Existing Utilities

From `dependencyUtils.ts`:
- `getChildren(parentId, tasks)` - returns all children of a parent
- `isTaskParent(taskId, tasks)` - checks if task has children
- `computeParentDates`, `computeParentProgress` - update parent metadata

</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add findParentId utility function</name>
  <files>packages/gantt-lib/src/utils/dependencyUtils.ts</files>
  <behavior>
    - findParentId('child-id', tasks) returns 'parent-id'
    - findParentId('root-id', tasks) returns undefined
    - findParentId('non-existent', tasks) returns undefined
  </behavior>
  <action>
    Add utility function to dependencyUtils.ts:
    ```typescript
    export function findParentId(taskId: string, tasks: Task[]): string | undefined {
      const task = tasks.find(t => t.id === taskId);
      return task?.parentId;
    }
    ```
    This simple lookup enables demote to check if previous task has a parent.
  </action>
  <verify>
    <automated>npm test -- --testNamePattern="findParentId"</automated>
  </verify>
  <done>
    findParentId function added to dependencyUtils.ts and exported
  </done>
</task>

<task type="auto">
  <name>Task 2: Update TaskListRow demote handler to use smart parent inference</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    Modify handleDemote callback (line 502-510) to infer parent from previous task's context:
    ```typescript
    const handleDemote = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      const currentIndex = allTasks.findIndex(t => t.id === task.id);
      if (currentIndex > 0) {
        const previousTask = allTasks[currentIndex - 1];
        // If previous task has a parent, use that parent (sibling behavior)
        // Otherwise, use previous task as parent (child behavior)
        const targetParentId = previousTask.parentId || previousTask.id;
        onDemoteTask?.(task.id, targetParentId);
      }
    }, [task.id, allTasks, onDemoteTask]);
    ```
    This change makes "понижение" create siblings instead of grandchildren.
  </action>
  <verify>
    <automated>No automated test - manual verification in browser required</automated>
  </verify>
  <done>
    Demote handler now creates sibling tasks when previous task is a child
  </done>
</task>

<task type="auto">
  <name>Task 3: Add smart parentId inference to drag-and-drop reordering</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx, packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
    Part 1 - Update TaskList.tsx handleDrop (line 289-316):
    - After reordering, check the new position of the moved task
    - Infer parentId from surrounding tasks:
      * If task below has a parentId → use that parent
      * If task above has a parentId → use that parent
      * Otherwise → remove parentId (root level)
    - Pass inferred parent to new onReorder callback or add onReorderWithParent callback

    Part 2 - Update GanttChart.tsx:
    - Add new callback handler `handleReorderWithInferredParent` that:
      1. Applies the reorder
      2. Infers parentId for moved task based on new position
      3. Updates parent dates/progress if parentId changed
    - Replace onReorder prop to use the new handler

    Implementation approach for handleDrop:
    ```typescript
    const handleDrop = useCallback((dropIndex: number, e: React.DragEvent) => {
      e.preventDefault();
      const originIndex = dragOriginIndexRef.current;
      if (originIndex === null || originIndex === dropIndex) {
        setDraggingIndex(null);
        setDragOverIndex(null);
        dragOriginIndexRef.current = null;
        return;
      }
      const reordered = [...tasks];
      const [moved] = reordered.splice(originIndex, 1);
      const insertIndex = dropIndex === tasks.length
        ? tasks.length - 1
        : originIndex < dropIndex ? dropIndex - 1 : dropIndex;
      reordered.splice(insertIndex, 0, moved);

      // Infer parentId from context after reorder
      let inferredParentId: string | undefined;
      if (insertIndex > 0) {
        const taskAbove = reordered[insertIndex - 1];
        if (taskAbove.parentId) {
          // Task above is a child, use its parent
          inferredParentId = taskAbove.parentId;
        } else {
          // Task above is root, check if it's a parent
          const taskBelow = reordered[insertIndex + 1];
          if (taskBelow?.parentId === taskAbove.id) {
            // Task below is child of taskAbove, use taskAbove as parent
            inferredParentId = taskAbove.id;
          }
        }
      }
      // If no parent inferred, moved task becomes root

      onReorder?.(reordered, moved.id, inferredParentId);
      onTaskSelect?.(moved.id);
      setDraggingIndex(null);
      setDragOverIndex(null);
      dragOriginIndexRef.current = null);
    }, [tasks, onReorder, onTaskSelect]);
    ```

    Then update GanttChart.tsx to handle the extended onReorder signature:
    ```typescript
    const handleReorder = useCallback((reorderedTasks: Task[], movedTaskId?: string, inferredParentId?: string) => {
      onChange?.((currentTasks) => {
        let updated = reorderedTasks;
        if (movedTaskId && inferredParentId !== undefined) {
          updated = updated.map(t =>
            t.id === movedTaskId
              ? { ...t, parentId: inferredParentId || undefined }
              : t
          );
        }
        return updated;
      });
      onReorderProp?.(reorderedTasks);
    }, [onChange, onReorderProp]);
    ```
  </action>
  <verify>
    <automated>No automated test - manual verification in browser required</automated>
  </verify>
  <done>
    Drag-and-drop now automatically sets parentId based on drop position
  </done>
</task>

</tasks>

<verification>
Manual verification steps:
1. Create a hierarchy: Parent (root) → Child1, Child2
2. Add a new root task "RootTask" below Child2
3. Click "demote" on RootTask
4. Expected: RootTask becomes Child3 (sibling of Child1, Child2), not grandchild
5. Test drag-and-drop: drag a root task between Child1 and Child2
6. Expected: Dragged task becomes Child3 with same parent
</verification>

<success_criteria>
- Demote button creates sibling tasks when previous task is a child
- Drag-and-drop between child tasks automatically sets correct parentId
- No "grandchild" nesting created accidentally
- All existing tests still pass
</success_criteria>

<output>
After completion, create `.planning/quick/092-change-task-grouping/092-SUMMARY.md`
</output>
