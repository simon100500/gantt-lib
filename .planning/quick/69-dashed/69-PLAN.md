---
phase: quick-69
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.css
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/NewTaskRow.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Dependency add button has solid border, not dashed"
    - "Dependencies column is narrower than before"
    - "Task name column is wider than before"
    - "New task creation auto-selects all text in name field"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Column width styling and button border styling"
      contains: "gantt-tl-cell-deps, gantt-tl-dep-add"
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "New task creation handler with text selection"
      contains: "onInsertAfter handler"
    - path: "packages/gantt-lib/src/components/TaskList/NewTaskRow.tsx"
      provides: "Auto-focus and select all text on mount"
      contains: "useEffect with select()"
  key_links:
    - from: "TaskListRow.tsx onInsertAfter"
      to: "new task creation"
      via: "functional updater creates task with editing state"
      pattern: "onInsertAfter.*task"
    - from: "NewTaskRow.tsx useEffect"
      to: "input field"
      via: "focus() and select() calls"
      pattern: "inputRef.*focus.*select"
---

<objective>
UI improvements: Remove dashed border from dependency button, adjust column widths, and auto-select new task name

Purpose: Improve visual consistency and usability for dependency management and task creation
Output: Cleaner dependency button styling, better column proportions, streamlined new task workflow
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/NewTaskRow.tsx

## Current State Analysis

From STATE.md:
- Last completed: quick-68 (buttons position hover)
- Recent work on task list UI improvements and task creation flows

From code analysis:
- Dependencies column: currently 120px wide (line 221 in TaskList.css)
- Dependency add button: uses dashed border (line 453: `border: 1px dashed rgba(59, 130, 246, 0.4)`)
- New task creation: uses NewTaskRow component with auto-focus but no text selection
- Task name column: uses flex: 1 for width (line 111 in TaskList.css)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update dependency button styling and column widths</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    1. Remove dashed border from dependency add button:
       - Change line 453 from `border: 1px dashed rgba(59, 130, 246, 0.4);` to `border: 1px solid rgba(59, 130, 246, 0.4);`

    2. Make dependencies column narrower:
       - Change line 221 from `width: 120px;` to `width: 90px;`

    3. Make task name column wider by increasing its minimum width:
       - Add `min-width: 250px;` to `.gantt-tl-cell-name` (currently only has `flex: 1`)
  </action>
  <verify>
    <automated>grep -n "gantt-tl-dep-add" /d/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css | grep "solid"</automated>
  </verify>
  <done>
    - Dependency add button has solid border instead of dashed
    - Dependencies column is 90px (down from 120px)
    - Task name column has min-width: 250px for better proportion
  </done>
</task>

<task type="auto">
  <name>Task 2: Auto-select text when creating new task via insert button</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    Modify the onInsertAfter handler (lines 410-434) to pass an additional flag or create the task in editing mode.

    Current code creates task but doesn't enter edit mode. Need to:
    1. Add a state variable to track which task should be edited on mount
    2. Pass this to the parent or handle locally via ref
    3. Use useEffect to focus and select text when the new task row appears

    Implementation approach:
    - Add `editingTaskId` state to TaskList component (parent)
    - Pass `editingTaskId` and `setEditingTaskId` props to TaskListRow
    - In TaskListRow, check if `task.id === editingTaskId` on mount
    - If yes, set `editingName = true` AND select all text in the input
  </action>
  <verify>
    <automated>grep -n "setEditingName" /d/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</automated>
  </verify>
  <done>
    - After clicking insert button, new task row enters edit mode immediately
    - All text in task name field is auto-selected for easy replacement
  </done>
</task>

<task type="auto">
  <name>Task 3: Add select() call to NewTaskRow for text selection</name>
  <files>packages/gantt-lib/src/components/TaskList/NewTaskRow.tsx</files>
  <action>
    Modify the useEffect hook (lines 17-19) to call both focus() and select():

    Current:
    ```typescript
    useEffect(() => {
      inputRef.current?.focus();
    }, []);
    ```

    Change to:
    ```typescript
    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, []);
    ```

    This ensures that when a new task row is created via the "add task" button at the bottom, the text is auto-selected.
  </action>
  <verify>
    <automated>grep -A2 "useEffect" /d/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/NewTaskRow.tsx | grep "select"</automated>
  </verify>
  <done>
    - NewTaskRow auto-selects placeholder text on mount
    - User can immediately type to replace default text
  </done>
</task>

</tasks>

<verification>
Overall verification steps:
1. Check that dependency add button has solid border (not dashed)
2. Verify dependencies column appears narrower (90px vs 120px)
3. Verify task name column appears wider with min-width constraint
4. Test new task creation via insert button - should enter edit mode with text selected
5. Test new task creation via bottom add button - should have text selected
</verification>

<success_criteria>
- [ ] Dependency add button uses solid border
- [ ] Dependencies column width is 90px
- [ ] Task name column has min-width: 250px
- [ ] Insert button creates task with auto-selected text
- [ ] Bottom add button creates task with auto-selected text
</success_criteria>

<output>
After completion, create `.planning/quick/69-dashed/69-01-SUMMARY.md`
</output>
