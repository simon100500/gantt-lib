---
phase: quick
plan: 84
type: execute
wave: 1
depends_on: []
files_modified:
  - D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Delete confirmation state resets when mouse leaves the row"
    - "Hovering to a different row cancels the delete confirmation"
    - "Delete confirmation still works normally when staying on the same row"
  artifacts:
    - path: "D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Delete confirmation reset on mouse leave"
  key_links:
    - from: "TaskListRow onMouseLeave handler"
      to: "setDeletePending(false)"
      via: "onMouseLeave event"
---

<objective>
Reset delete confirmation when hovering to a different row

Purpose: Prevent accidental deletion when user moves mouse away after clicking delete once
Output: Delete confirmation state resets when mouse leaves the row
</objective>

<execution_context>
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Projects/gantt-lib/.planning/quick/83-add-delete-confirmation-delete-button-be/83-PLAN.md
</execution_context>

<context>
<!-- Current implementation from quick task 83 -->
The delete confirmation feature (lines 252-312):
- Uses `deletePending` state (line 252)
- Has `deleteButtonRef` for click-outside detection (line 253)
- Uses `useEffect` with mousedown listener to reset when clicking outside (lines 298-312)
- Delete button at lines 549-567 shows "Удалить?" when `deletePending === true`

Current gap: The confirmation state only resets when clicking outside the button, but not when hovering to a different row.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add onMouseLeave handler to reset delete confirmation</name>
  <files>D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
Add onMouseLeave handler to reset deletePending when mouse leaves the row:

1. Add onMouseLeave handler to the root div element (around line 462-477, the div with className 'gantt-tl-row'):
   ```tsx
   onMouseLeave={() => {
     if (deletePending) {
       setDeletePending(false);
     }
   }}
   ```

2. Place this handler alongside the existing event handlers (onClick, onKeyDown, onDragOver, onDrop).

3. This ensures that when the user's mouse leaves the row (e.g., hovers to a different row), the delete confirmation state is reset.

The handler should be added to the main row div:
```tsx
<div
  className={[...].filter(Boolean).join(' ')}
  style={{ minHeight: `${rowHeight}px`, position: 'relative' }}
  onClick={handleRowClickInternal}
  onKeyDown={handleRowKeyDown}
  onDragOver={(e) => onDragOver?.(rowIndex, e)}
  onDrop={(e) => onDrop?.(rowIndex, e)}
  onMouseLeave={() => {
    if (deletePending) {
      setDeletePending(false);
    }
  }}
  tabIndex={isSelected ? 0 : -1}
>
```
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>Delete confirmation resets when mouse leaves the row</done>
</task>

</tasks>

<verification>
1. Click delete button on a row - should show "Удалить?"
2. Move mouse to a different row - button should reset to trash icon
3. Click delete button twice on same row without leaving - task should be deleted
4. Delete confirmation still resets when clicking elsewhere (existing behavior)
</verification>

<success_criteria>
- Delete confirmation state resets when hovering to a different row
- Existing click-outside-to-reset behavior still works
- Two-click delete on same row still works when not leaving the row
- No TypeScript errors
- No visual glitches
</success_criteria>

<output>
After completion, no summary file needed for quick plans
</output>
