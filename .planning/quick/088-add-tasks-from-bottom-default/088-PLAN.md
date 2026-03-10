---
phase: quick-088
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/website/src/app/page.tsx
  - packages/website/src/app/mcp/page.tsx
autonomous: true
requirements:
  - QUICK-088
must_haves:
  truths:
    - "Add task button appears by default on all Gantt charts"
    - "Add task button can be hidden via new prop"
    - "Test/demo charts show the button by default"
  artifacts:
    - path: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
      provides: GanttChart component with new enableAddTask prop
      contains: enableAddTask?: boolean
    - path: packages/gantt-lib/src/components/TaskList/TaskList.tsx
      provides: TaskList component with updated prop interface
      contains: enableAddTask?: boolean
    - path: packages/website/src/app/page.tsx
      provides: Demo page with add task button enabled
      contains: No enableAddTask prop (uses default true)
  key_links:
    - from: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
      to: packages/gantt-lib/src/components/TaskList/TaskList.tsx
      via: enableAddTask prop propagation
      pattern: enableAddTask={enableAddTask ?? true}
    - from: packages/website/src/app/page.tsx
      to: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
      via: Consumer uses default behavior
      pattern: No enableAddTask prop passed
---

<objective>
Make "add tasks from bottom" feature enabled by default with option to disable via prop.

Purpose: Currently the add task button only appears when `onAdd` callback is provided. This makes the feature invisible on most test/demo charts. Users should see the add task button by default and can explicitly disable it if needed.

Output: Add task button visible on all charts by default, new `enableAddTask` prop to hide it when needed.
</objective>

<execution_context>
@C:/Users/simon/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/simon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Current Implementation Analysis

From TaskList.tsx (lines 393-418):
- Add task button currently only renders when `onAdd` callback is provided
- Button shows "+ Добавить задачу" text
- Located at bottom of task list outside body div
- Also serves as drop target for drag-to-reorder

From GanttChart.tsx (lines 110-115):
- `onAdd` prop is optional
- Passed through to TaskList component

Current behavior:
- Main demo page (page.tsx): shows button (has onAdd callback)
- MCP demo page: no button (no onAdd callback)
- Other demo sections: no button (no onAdd callback)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add enableAddTask prop to GanttChart and TaskList</name>
  <files>
    packages/gantt-lib/src/components/GanttChart/GanttChart.tsx,
    packages/gantt-lib/src/components/TaskList/TaskList.tsx
  </files>
  <action>
Add `enableAddTask?: boolean` prop to GanttChartProps interface in GanttChart.tsx:
- Add after line 115 (after onReorder prop)
- Default value: true
- Documentation: "Enable add task button at bottom of task list (default: true)"

Update GanttChart component destructuring to include enableAddTask with default true:
- Add to props destructuring: `enableAddTask = true`

Pass enableAddTask to TaskList component:
- Update TaskList props call to include: `enableAddTask={enableAddTask}`

Add `enableAddTask?: boolean` to TaskListProps interface in TaskList.tsx:
- Add after line 51 (after editingTaskId prop)
- Default value: true
- Documentation: "Enable add task button at bottom of task list (default: true)"

Update TaskList component destructuring to include enableAddTask with default true:
- Add to props destructuring: `enableAddTask = true`

Modify add task button rendering condition (line 393):
- Change from: `{onAdd && !isCreating && (`
- To: `{enableAddTask && onAdd && !isCreating && (`

This ensures:
1. Button only shows when BOTH enableAddTask is true AND onAdd callback is provided
2. Default behavior shows button (enableAddTask defaults to true)
3. Consumer can hide button by passing enableAddTask={false}
4. Button still requires onAdd callback to function
</action>
  <verify>
<automated>grep -n "enableAddTask" packages/gantt-lib/src/components/GanttChart/GanttChart.tsx packages/gantt-lib/src/components/TaskList/TaskList.tsx</automated>
  </verify>
  <done>
enableAddTask prop added to both GanttChart and TaskList with default true, button condition updated to require both enableAddTask AND onAdd
  </done>
</task>

<task type="auto">
  <name>Task 2: Update demo pages to use default add task button behavior</name>
  <files>
    packages/website/src/app/page.tsx,
    packages/website/src/app/mcp/page.tsx
  </files>
  <action>
For packages/website/src/app/page.tsx:
- No changes needed - main demo already has onAdd callback, button will show by default

For packages/website/src/app/mcp/page.tsx:
- Add onAdd callback to enable add task functionality
- Add handleAdd function after handleChange (after line 34):
  ```typescript
  const handleAdd = useCallback((task: Task) => {
    setTasks(prev => [...prev, task]);
  }, []);
  ```
- Update GanttChart component to include onAdd prop (after onChange prop):
  ```typescript
  onChange={handleChange}
  onAdd={handleAdd}
  ```

This ensures MCP demo page also shows add task button by default.
</action>
  <verify>
<automated>grep -A2 "onChange={handleChange}" packages/website/src/app/mcp/page.tsx | grep "onAdd"</automated>
  </verify>
  <done>
MCP demo page updated with onAdd callback, add task button now visible on all demo charts by default
  </done>
</task>

<task type="auto">
  <name>Task 3: Add example of disabling add task button to documentation</name>
  <files>
    packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  </files>
  <action>
Update GanttChart component JSDoc comment (before line 144) to include example with enableAddTask prop:

Add example after existing example:
```typescript
 * @example
 * ```tsx
 * // Hide add task button
 * <GanttChart
 *   tasks={tasks}
 *   enableAddTask={false}
 * />
 * ```
```

This documents how consumers can disable the add task button when needed.
</action>
  <verify>
<automated>grep -A3 "enableAddTask={false}" packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</automated>
  </verify>
  <done>
Documentation updated with example showing how to disable add task button
  </done>
</task>

</tasks>

<verification>
1. Check that add task button appears on main demo page (construction project)
2. Check that add task button appears on MCP demo page
3. Verify button can be hidden by passing enableAddTask={false} to GanttChart
4. Confirm existing functionality (add task, insert after, drag-to-reorder) still works
</verification>

<success_criteria>
- Add task button visible by default on all demo pages
- New enableAddTask prop available on GanttChart component (default: true)
- Button hidden when enableAddTask={false} is passed
- All existing add/insert/reorder functionality preserved
</success_criteria>

<output>
After completion, create `.planning/quick/088-add-tasks-from-bottom-default/088-SUMMARY.md`
</output>
