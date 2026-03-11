---
phase: quick-090-remove-dependency-parent-child
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/utils/dependencyUtils.ts
  - packages/gantt-lib/src/utils/__tests__/dependencyUtils.test.ts
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "When two tasks become parent-child, any existing dependency link between them is removed"
    - "When demoting a task to become a child, dependencies to/from the new parent are removed"
    - "When promoting a task from child to root, no dependencies are removed (only hierarchy changes)"
    - "The cleanup happens automatically during hierarchy change operations"
    - "Dependencies are preserved when hierarchy changes don't involve directly related tasks"
  artifacts:
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "Updated handleDemoteTask with dependency cleanup"
      contains: "handleDemoteTask"
    - path: "packages/gantt-lib/src/utils/dependencyUtils.ts"
      provides: "Utility function to remove dependencies between parent and child"
      exports: ["removeDependenciesBetweenTasks"]
  key_links:
    - from: "handleDemoteTask"
      to: "removeDependenciesBetweenTasks"
      via: "function call"
      pattern: "removeDependenciesBetweenTasks\\(taskId, newParentId, currentTasks\\)"
    - from: "handleDemoteTask"
      to: "onChange callback"
      via: "functional updater"
      pattern: "onChange\\?\\.\\(\\(currentTasks\\) =>"
---

<objective>
Remove dependency links when tasks become parent-child relationship

Purpose: When two tasks were connected by a dependency link but then become parent-child relationship, the link between them should be removed as it's meaningless. Parent-child relationships already imply a structural connection, so having both a dependency link and a parent-child relationship is redundant and can cause confusion.

Output: Updated hierarchy handlers that automatically clean up dependencies when establishing parent-child relationships
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/get-shit-done/workflows/execute-plan.md
@D:/Projects/gantt-lib/.planning/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md

# Existing hierarchy implementation from GanttChart.tsx
```typescript
// Lines 556-566: handlePromoteTask - removes parentId
const handlePromoteTask = useCallback((taskId: string) => {
  onChange?.((currentTasks) => {
    return currentTasks.map(t => {
      if (t.id === taskId && (t as any).parentId) {
        // Remove parentId to promote to root level
        return { ...t, parentId: undefined };
      }
      return t;
    });
  });
}, [onChange]);

// Lines 568-612: handleDemoteTask - sets new parentId
const handleDemoteTask = useCallback((taskId: string, newParentId: string) => {
  onChange?.((currentTasks) => {
    // ... circular hierarchy check ...
    // Apply parentId change first
    let updatedTasks = currentTasks.map(t => {
      if (t.id === taskId) {
        // Set parentId to demote under new parent
        return { ...t, parentId: newParentId };
      }
      return t;
    });
    // ... update parent dates and progress ...
  });
}, [onChange]);
```

# Existing dependency structure from types/index.ts
```typescript
export interface Task {
  id: string;
  // ... other fields ...
  dependencies?: TaskDependency[];
}

export interface TaskDependency {
  taskId: string;  // predecessor task ID
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag?: number;
}
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create utility function to remove dependencies between two tasks</name>
  <files>packages/gantt-lib/src/utils/dependencyUtils.ts</files>
  <action>
    Add a new utility function `removeDependenciesBetweenTasks(taskId1: string, taskId2: string, tasks: Task[]): Task[]` that:

    1. Takes two task IDs and the current tasks array
    2. Returns a new tasks array with all dependencies between the two tasks removed in both directions:
       - Remove any dependency in task1.dependencies that references task2
       - Remove any dependency in task2.dependencies that references task1
    3. Handles cases where tasks don't have dependencies array (undefined)
    4. Returns new task objects to maintain immutability

    Implementation approach:
    ```typescript
    export function removeDependenciesBetweenTasks(
      taskId1: string,
      taskId2: string,
      tasks: Task[]
    ): Task[] {
      return tasks.map(task => {
        if (task.id === taskId1 || task.id === taskId2) {
          if (!task.dependencies) return task;
          const otherTaskId = task.id === taskId1 ? taskId2 : taskId1;
          return {
            ...task,
            dependencies: task.dependencies.filter(dep => dep.taskId !== otherTaskId)
          };
        }
        return task;
      });
    }
    ```

    Add this function after the `computeParentProgress` function (around line 484) in the hierarchy utilities section.
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm test -- --testNamePattern="removeDependenciesBetweenTasks" 2>/dev/null || echo "Test needs to be created"</automated>
  </verify>
  <done>
    Function exists in dependencyUtils.ts, properly removes bidirectional dependencies between two tasks, returns new array with updated tasks
  </done>
</task>

<task type="auto">
  <name>Task 2: Update handleDemoteTask to remove dependencies when establishing parent-child relationship</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
    Update the `handleDemoteTask` function (lines 568-612) to remove dependencies between the task being demoted and its new parent.

    Changes needed:
    1. Import the new utility function at the top of the file:
       ```typescript
       import { removeDependenciesBetweenTasks, /* other imports */ } from '../../utils/dependencyUtils';
       ```

    2. After the circular hierarchy check passes (around line 589) and before applying parentId changes, add:
       ```typescript
       // Remove any existing dependencies between the two tasks
       let updatedTasks = removeDependenciesBetweenTasks(taskId, newParentId, currentTasks);
       ```

    3. Change the subsequent `currentTasks.map` to use `updatedTasks.map` instead:
       ```typescript
       // Apply parentId change first
       updatedTasks = updatedTasks.map(t => {
         if (t.id === taskId) {
           // Set parentId to demote under new parent
           return { ...t, parentId: newParentId };
         }
         return t;
       });
       ```

    This ensures that when a task becomes a child of another task, any existing dependency link (in either direction) between them is removed, since the parent-child relationship makes the dependency meaningless.
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm test -- --testNamePattern="handleDemoteTask.*dependency" 2>/dev/null || echo "Manual verification needed - demote task with existing dependency"</automated>
  </verify>
  <done>
    When demoting a task to become a child, any existing dependencies between the child and parent are automatically removed, parent-child hierarchy is established correctly
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Add unit tests for dependency removal on hierarchy change</name>
  <files>packages/gantt-lib/src/utils/__tests__/dependencyUtils.test.ts</files>
  <behavior>
    - Test 1: Remove dependency from child to parent when demoting
      Given: Task A depends on Task B (A.dependencies = [{taskId: 'B', type: 'FS'}])
      When: Task A is demoted to become child of Task B
      Then: Task A should have empty dependencies array

    - Test 2: Remove dependency from parent to child when demoting
      Given: Task B depends on Task A (B.dependencies = [{taskId: 'A', type: 'FS'}])
      When: Task A is demoted to become child of Task B
      Then: Task B should have empty dependencies array

    - Test 3: Preserve dependencies to other tasks
      Given: Task A depends on Task B and Task C
      When: Task A is demoted to become child of Task B
      Then: Task A.dependencies should only contain reference to Task C

    - Test 4: No change when promoting (removing parentId)
      Given: Child task with dependencies to parent
      When: Task is promoted to root level (parentId removed)
      Then: Dependencies should remain unchanged

    - Test 5: Handle tasks without dependencies array
      Given: Task A and Task B, neither has dependencies
      When: removeDependenciesBetweenTasks('A', 'B', tasks) is called
      Then: Should return tasks unchanged, no errors
  </behavior>
  <action>
    Add test cases to verify:
    1. `removeDependenciesBetweenTasks` function correctly removes bidirectional dependencies
    2. Demoting a task removes dependencies to/from the new parent
    3. Other dependencies are preserved
    4. Promoting a task does NOT remove dependencies (only hierarchy changes)
    5. Edge cases: tasks without dependencies, empty arrays, etc.

    Use Jest/Vitest test patterns from existing tests in the file.
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm test -- --testNamePattern="removeDependenciesBetweenTasks|dependency.*hierarchy" 2>&1 | head -50</automated>
  </verify>
  <done>
    All new tests pass, existing tests still pass, code coverage for removeDependenciesBetweenTasks is 100%
  </done>
</task>

</tasks>

<verification>
Overall verification steps:
1. Run unit tests to ensure dependency removal logic works correctly
2. Manually test: Create two tasks with a dependency link, then make one a child of the other - verify the dependency link disappears
3. Test edge cases: promote/demote tasks with multiple dependencies
4. Verify no regression: existing hierarchy and dependency functionality still works
</verification>

<success_criteria>
1. Utility function `removeDependenciesBetweenTasks` exists and is tested
2. `handleDemoteTask` automatically removes dependencies when establishing parent-child relationship
3. Dependencies are only removed between the two tasks involved in the hierarchy change
4. All other dependencies remain intact
5. Unit tests cover normal and edge cases
6. No existing functionality is broken
</success_criteria>

<output>
After completion, create `.planning/quick/090-remove-dependency-parent-child/090-SUMMARY.md`
</output>
