---
phase: quick
plan: 260317-mrj-1
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "Promote button always moves task up by exactly 1 hierarchy level"
    - "Demote button always moves task down by exactly 1 hierarchy level"
    - "No hierarchy gaps can be created (levels must be sequential)"
    - "Circular dependencies are prevented"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "handleDemoteWrapper with single-level demote logic"
      contains: "handleDemoteWrapper"
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "handlePromote with single-level promote logic"
      contains: "handlePromote"
  key_links:
    - from: "TaskList.tsx handleDemoteWrapper"
      to: "onDemoteTask"
      via: "previous visible task becomes parent"
      pattern: "onDemoteTask\\?\\(taskId, previousTask\\.id\\)"
    - from: "GanttChart.tsx handlePromote"
      to: "promotedTask.parentId"
      via: "single level up (not grandparent)"
      pattern: "parentId:.*currentParentId"
---

<objective>
Change hierarchy promotion/demotion buttons to always change level by exactly 1.

Current behavior:
- Promote jumps to grandparent (can skip multiple levels)
- Demote uses "previous visible task becomes parent" (can create gaps)

Required behavior:
- Promote: move up exactly 1 level (to parent's parent, or root if no grandparent)
- Demote: move down exactly 1 level (to previous sibling as parent, cannot create gaps)

Purpose: Make hierarchy navigation predictable - each button press changes depth by exactly 1 level.
Output: Updated promote/demote handlers with single-level logic
</objective>

<execution_context>
@D:/Проекты/gantt-lib/.planning/quick/260317-mrj-1
@C:/Users/simon/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/simon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskList/TaskList.tsx
@packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
@packages/gantt-lib/src/utils/hierarchyOrder.ts

Current state:
- handlePromote (GanttChart.tsx ~line 580): promotes to grandparent, potentially skipping levels
- handleDemoteWrapper (TaskList.tsx ~line 684): uses "previous visible task becomes parent"
- flattenHierarchy function provides stable depth-first ordering
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update promote handler to single-level logic</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
    Modify handlePromote callback (~line 580) to change hierarchy by exactly 1 level:

    Current logic (multi-level jump):
    - Finds grandparent (task.parentId's parent)
    - Sets promotedTask.parentId = grandparentId
    - Problem: can skip multiple levels if task is deeply nested

    New logic (single level):
    - Calculate current depth: count how many parents exist above this task
    - If depth > 1 (has grandparent): parentId = grandparentId (move up 1 level)
    - If depth <= 1 (no grandparent): parentId = undefined (move to root)
    - This ensures: pressing promote always reduces depth by exactly 1

    Key changes:
    1. Replace grandparent lookup with depth calculation
    2. Always move to immediate parent's parent (or root)
    3. Preserve existing reorder logic for positioning among siblings
    4. Keep circular dependency prevention

    Helper function to add:
    ```typescript
    function getTaskDepth(taskId: string, tasks: Task[]): number {
      let depth = 0;
      let current = tasks.find(t => t.id === taskId);
      while (current?.parentId) {
        depth++;
        current = tasks.find(t => t.id === current.parentId);
      }
      return depth;
    }
    ```

    Updated promote logic:
    ```typescript
    const depth = getTaskDepth(taskId, tasks);
    const grandparentId = depth > 1
      ? tasks.find(t => t.id === task.parentId)?.parentId
      : undefined;
    const promotedTask = { ...taskToPromote, parentId: grandparentId };
    ```

    Do NOT change:
    - Sibling reordering logic (lines 590-610)
    - Dependency removal (already handled)
    - onTasksChange call structure
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm test -- --testNamePattern="promote" 2>&1 | head -50</automated>
  </verify>
  <done>
    Promote button moves task up by exactly 1 level:
    - Root child → becomes root (depth 1 → 0)
    - Level 2 child → becomes level 1 (depth 2 → 1)
    - Level 3 child → becomes level 2 (depth 3 → 2)
    - No multi-level jumps occur
  </done>
</task>

<task type="auto">
  <name>Task 2: Update demote handler to single-level logic</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
    Modify handleDemoteWrapper (~line 684) to ensure single-level demotion:

    Current logic (potential multi-level):
    - Uses "previous visible task becomes parent"
    - Problem: if previous task is at depth N-2, creates gap at depth N-1

    New logic (single level):
    - Calculate current task depth
    - Find previous visible task
    - If previous task depth == current depth - 1: valid parent (adjacent level)
    - If previous task depth < current depth - 1: invalid (would create gap)
    - If previous task depth >= current depth: find nearest valid ancestor

    Validation rules:
    1. New parent must be at exactly (currentDepth - 1)
    2. If previous visible task is not adjacent level, walk up to find valid parent
    3. For first task: still create "Новый раздел" (existing behavior)

    Key changes to handleDemoteWrapper:
    ```typescript
    const handleDemoteWrapper = useCallback((taskId: string, _newParentId: string) => {
      const taskIndex = visibleTasks.findIndex(t => t.id === taskId);
      const currentDepth = getTaskDepth(visibleTasks[taskIndex], orderedTasks);

      if (taskIndex > 0) {
        const previousTask = visibleTasks[taskIndex - 1];
        const previousDepth = getTaskDepth(previousTask, orderedTasks);

        // Only use previous task as parent if it creates single-level change
        if (previousDepth === currentDepth - 1) {
          onDemoteTask?.(taskId, previousTask.id);
          return;
        }

        // Previous task is not at correct level - find valid parent
        // Walk up from current task to find parent at depth - 1
        const currentTask = orderedTasks.find(t => t.id === taskId);
        if (currentTask?.parentId) {
          const currentParent = orderedTasks.find(t => t.id === currentTask.parentId);
          if (currentParent && getTaskDepth(currentParent, orderedTasks) === currentDepth - 1) {
            // Current parent is already at correct level - task cannot be demoted further
            // (would create duplicate parent-child relationship)
            return;
          }
        }

        // Use previous task anyway (fallback to current behavior)
        // This case should be rare with proper UI state
        onDemoteTask?.(taskId, previousTask.id);
        return;
      }

      // First-task case: create "Новый раздел" as a new root parent
      // (existing logic unchanged)
      const demotedTask = orderedTasks.find(t => t.id === taskId);
      if (!demotedTask) return;

      const newSectionTask: Task = {
        id: crypto.randomUUID(),
        name: 'Новый раздел',
        startDate: demotedTask.startDate,
        endDate: demotedTask.endDate,
      };

      const updatedTasks: Task[] = [
        newSectionTask,
        ...orderedTasks.map(t =>
          t.id === taskId ? { ...t, parentId: newSectionTask.id } : t
        ),
      ];

      onReorder?.(updatedTasks, taskId, newSectionTask.id);
    }, [visibleTasks, orderedTasks, onDemoteTask, onReorder]);

    // Add helper function
    function getTaskDepth(task: Task | undefined, tasks: Task[]): number {
      if (!task) return 0;
      let depth = 0;
      let current: Task | undefined = task;
      while (current?.parentId) {
        depth++;
        current = tasks.find(t => t.id === current.parentId);
      }
      return depth;
    }
    ```

    Do NOT change:
    - First task "Новый раздел" creation (lines 694-715)
    - onReorder call structure
    - Date preservation logic
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm test -- --testNamePattern="demote" 2>&1 | head -50</automated>
  </verify>
  <done>
    Demote button moves task down by exactly 1 level:
    - Root task → becomes child of previous task (depth 0 → 1)
    - Level 1 task → becomes level 2 (depth 1 → 2)
    - Level 2 task → becomes level 3 (depth 2 → 3)
    - No hierarchy gaps are created
    - First task creates "Новый раздел" parent (unchanged)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Single-level promote/demote handlers</what-built>
  <how-to-verify>
    1. Run the application
    2. Create a multi-level hierarchy:
       - Task 1 (root)
         - Task 1.1 (level 1)
           - Task 1.1.1 (level 2)
             - Task 1.1.1.1 (level 3)
    3. Test promote on Task 1.1.1.1:
       - Press promote (left arrow) → should become level 2 (child of 1.1)
       - Press promote again → should become level 1 (child of 1)
       - Press promote again → should become root
    4. Test demote on root task:
       - Press demote (right arrow) → should become child of previous task
       - Each press should increase depth by exactly 1
    5. Verify no hierarchy gaps occur (e.g., no level 0 → level 2 jump)
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues with the hierarchy change behavior</resume-signal>
</task>

</tasks>

<verification>
- [ ] Promote button reduces task depth by exactly 1 level
- [ ] Demote button increases task depth by exactly 1 level
- [ ] No multi-level jumps occur
- [ ] No hierarchy gaps are created
- [ ] Circular dependencies are prevented
- [ ] First task demotion creates "Новый раздел" parent
- [ ] Existing tests pass
</verification>

<success_criteria>
Hierarchy buttons provide predictable single-level navigation:
- Promote: depth → depth - 1 (minimum 0)
- Demote: depth → depth + 1 (uses previous visible task as parent)
- No gaps in hierarchy levels (sequential depth change only)
- Manual verification confirms expected behavior
</success_criteria>

<output>
After completion, create `.planning/quick/260317-mrj-1/260317-mrj-SUMMARY.md`
</output>
