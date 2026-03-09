---
phase: quick-70
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Pressing F2 on a selected task row enters name edit mode"
    - "After F2, cursor is at the end of the task name (not all selected)"
    - "Existing text of the task name is preserved (not replaced)"
    - "F2 is ignored when task name editing is disabled"
    - "F2 does not trigger when already in edit mode"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "F2 key handler in handleRowKeyDown"
      contains: "e.key === 'F2'"
  key_links:
    - from: "handleRowKeyDown in TaskListRow.tsx"
      to: "editTriggerRef and setEditingName"
      via: "F2 branch sets nameValue=task.name, trigger='keypress', editingName=true"
      pattern: "e\\.key === 'F2'"
---

<objective>
Add F2 shortcut to enter task name edit mode with cursor positioned at the end of the existing name.

Purpose: Standard spreadsheet/list UX — F2 enters inline edit preserving existing text, cursor at end.
Output: Single file change in TaskListRow.tsx adding F2 handling to the existing keydown handler.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx

## Current State Analysis

`handleRowKeyDown` (lines 317-327 in TaskListRow.tsx) handles row-level key events:
- Printable key (length === 1, no modifiers): starts editing, replaces name with typed char, cursor at end
- F2 is NOT currently handled

`editTriggerRef` controls cursor behavior in the `useEffect` at lines 267-279:
- `'keypress'`: cursor at end (`setSelectionRange(len, len)`)
- `'doubleclick'` or `'autoedit'`: select all (`select()`)

For F2 the desired behavior is: preserve `task.name`, cursor at end — which matches the `'keypress'`
cursor behavior but with `task.name` as the value instead of a single character.

The existing `'keypress'` trigger already positions cursor at end of whatever value is in the input,
so reusing `editTriggerRef.current = 'keypress'` is correct here as long as `nameValue` is set to `task.name`.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add F2 key handler to TaskListRow handleRowKeyDown</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    Modify `handleRowKeyDown` (currently lines 317-327) to add an F2 branch BEFORE the printable-key branch:

    Current:
    ```typescript
    const handleRowKeyDown = useCallback((e: React.KeyboardEvent) => {
      // If not editing and a printable key is pressed, start editing
      if (!editingName && !disableTaskNameEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        confirmedRef.current = false;
        editTriggerRef.current = 'keypress';
        setNameValue(e.key);
        setEditingName(true);
      }
    }, [editingName, disableTaskNameEditing]);
    ```

    Change to:
    ```typescript
    const handleRowKeyDown = useCallback((e: React.KeyboardEvent) => {
      // F2: enter edit mode with cursor at end of existing name
      if (!editingName && !disableTaskNameEditing && e.key === 'F2') {
        e.preventDefault();
        confirmedRef.current = false;
        editTriggerRef.current = 'keypress';  // 'keypress' trigger = cursor at end (not select-all)
        setNameValue(task.name);
        setEditingName(true);
        return;
      }
      // If not editing and a printable key is pressed, start editing
      if (!editingName && !disableTaskNameEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        confirmedRef.current = false;
        editTriggerRef.current = 'keypress';
        setNameValue(e.key);
        setEditingName(true);
      }
    }, [editingName, disableTaskNameEditing, task.name]);
    ```

    Key points:
    - Add `task.name` to the dependency array since we now read it in the F2 branch
    - Use `editTriggerRef.current = 'keypress'` so the existing useEffect places cursor at end (not select-all)
    - Set `nameValue` to `task.name` to preserve existing text
    - Return early after F2 handling to avoid falling into the printable-key branch
    - F2 is filtered out by `e.key.length === 1` check in the existing branch anyway (length > 1), but the early return is cleaner
  </action>
  <verify>
    <automated>grep -n "F2" "D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"</automated>
  </verify>
  <done>
    - `handleRowKeyDown` contains `e.key === 'F2'` branch
    - F2 branch sets `nameValue = task.name` and `editTriggerRef.current = 'keypress'`
    - `task.name` added to `useCallback` dependency array
    - Pressing F2 on a selected row enters edit mode with full task name and cursor at end
  </done>
</task>

</tasks>

<verification>
Manual verification:
1. Select a task row by clicking it
2. Press F2 — edit mode should activate with the full task name in the input
3. Cursor should be at the END of the name (not all selected)
4. Type additional characters — they should append after existing text
5. Press Escape — should cancel and restore original name
6. Press F2 again while already editing — should do nothing (guard: `!editingName`)
</verification>

<success_criteria>
- [ ] F2 on selected row activates name edit mode
- [ ] Existing task name is preserved in the input field
- [ ] Cursor is positioned at the end of the text
- [ ] F2 while already editing has no effect
- [ ] F2 is ignored when `disableTaskNameEditing` is true
</success_criteria>

<output>
After completion, create `.planning/quick/70-f2/70-SUMMARY.md`
</output>
