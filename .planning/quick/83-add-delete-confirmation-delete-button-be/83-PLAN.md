---
phase: quick
plan: 83
type: execute
wave: 1
depends_on: []
files_modified:
  - D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "First click on delete button changes button text to 'Delete?'"
    - "Second click on delete button actually deletes the task"
    - "Clicking elsewhere resets the delete button back to initial state"
  artifacts:
    - path: "D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Delete button with two-click confirmation state"
    - path: "D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Styles for delete button confirmation state"
  key_links:
    - from: "TaskListRow.tsx delete button click handler"
      to: "useState for delete confirmation state"
      via: "onClick handler"
---

<objective>
Add delete confirmation to the task delete button - requires two clicks to delete

Purpose: Prevent accidental task deletion by requiring confirmation via two-click pattern
Output: Delete button that shows "Delete?" on first click, then deletes on second click
</objective>

<execution_context>
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css
</execution_context>

<context>
<!-- Key context from TaskListRow.tsx -->
The delete button is currently at lines 530-542:
- It's a button with `gantt-tl-name-action-btn gantt-tl-action-delete` classes
- Directly calls `onDelete(task.id)` on click
- Uses TrashIcon component

The delete button styling is in TaskList.css at lines 300-308:
- `.gantt-tl-action-delete` has red background (#ef4444)
- `.gantt-tl-action-delete:hover` has darker red (#dc2626)
- Uses hover-reveal pattern (opacity 0 by default, 1 on row hover)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add delete confirmation state to TaskListRow</name>
  <files>D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
Add state for delete confirmation:
1. Add `useState` near line 245: `const [deletePending, setDeletePending] = useState(false);`
2. Modify delete button onClick handler (lines 534-537):
   - If `!deletePending`: call `setDeletePending(true)` instead of deleting
   - If `deletePending`: call `onDelete(task.id)` to actually delete
3. Add `useEffect` to reset deletePending state when clicking elsewhere:
   - Listen for mousedown events on document
   - Reset `setDeletePending(false)` if click is outside the delete button
   - Cleanup event listener on unmount
4. Update button content to show text when pending:
   - When `deletePending === true`: show text "Delete?" (Удалить?)
   - When `deletePending === false`: show TrashIcon
5. Update button styling to be wider when showing text (minimum width for text)
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>Delete button shows "Delete?" on first click, deletes on second click, resets when clicking elsewhere</done>
</task>

<task type="auto">
  <name>Task 2: Style delete button confirmation state</name>
  <files>D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Add styles for delete button confirmation state:
1. Add `.gantt-tl-action-delete-confirm` class for when button is in confirmation state:
   - Minimum width of 60px to fit text
   - Font size of 0.7rem to match other action text
   - Same red background color
   - Text weight of 500 or 600 for emphasis
2. Ensure the button remains visible during confirmation state (don't hide on hover loss)
3. Add hover state that intensifies the red color to signal danger
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>Delete button properly styled in both normal and confirmation states</done>
</task>

</tasks>

<verification>
1. Click delete button once - should show "Delete?" text
2. Click elsewhere - button should reset to trash icon
3. Click delete button twice - task should be deleted
4. Button should remain visible during confirmation (no hover-dependent hiding)
</verification>

<success_criteria>
- Delete button requires two clicks to delete a task
- First click shows "Delete?" text
- Second click performs deletion
- Clicking elsewhere resets the confirmation state
- No TypeScript errors
- No visual layout shifts
</success_criteria>

<output>
After completion, no summary file needed for quick plans
</output>
