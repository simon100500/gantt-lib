---
status: awaiting_human_verify
trigger: "new-task-double-confirm"
created: 2026-03-09T00:00:00Z
updated: 2026-03-09T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - useEffect had task.name in its deps; saving the task name caused task.name to change, re-triggering the effect, re-entering edit mode, requiring a second Enter to exit.
test: COMPLETED - fix applied in TaskListRow.tsx
expecting: single Enter/click now confirms and exits edit mode
next_action: human verification

## Symptoms

expected: After adding a new task and entering edit mode, pressing Enter once or clicking once outside should confirm and exit edit mode.
actual: First Enter/click does not confirm. Second Enter/click actually confirms. Requires double interaction.
errors: No console errors reported.
reproduction: 1. Click "add task" button (NewTaskRow) 2. Task is created and enters edit mode (editingTaskId is set) 3. Try to press Enter or click outside - doesn't work first time 4. Press Enter or click outside again - now it works
timeline: Previous fix attempt (commit a7af20e) added confirmedRef to TaskListRow to prevent double-save, but the issue persists.

## Eliminated

- hypothesis: double-save on Enter + blur
  evidence: confirmedRef was added to prevent this but issue persists
  timestamp: 2026-03-09

## Evidence

- timestamp: 2026-03-09
  checked: page.tsx handleInsertAfter callback
  found: calls setEditingTaskId(newTask.id) inside setTasks functional updater - sets editingTaskId to new task's ID
  implication: editingTaskId is set to the new task's ID after insert

- timestamp: 2026-03-09
  checked: GanttChart.tsx - editingTaskId prop flow
  found: editingTaskId passed straight through GanttChart -> TaskList -> TaskListRow as propEditingTaskId -> editingTaskId
  implication: no transformation or clearing at any level

- timestamp: 2026-03-09
  checked: TaskListRow.tsx useEffect lines 273-278
  found: |
    useEffect(() => {
      if (editingTaskId === task.id && !disableTaskNameEditing) {
        setNameValue(task.name);
        setEditingName(true);
      }
    }, [editingTaskId, task.id, task.name, disableTaskNameEditing]);
  implication: Sets editingName=true whenever editingTaskId === task.id. This effect re-runs EVERY TIME editingTaskId or task.id changes. Since editingTaskId is NEVER cleared, if the component re-renders (e.g., after name save triggers onTaskChange which updates tasks), the effect will fire AGAIN and set editingName=true once more.

- timestamp: 2026-03-09
  checked: page.tsx - who clears editingTaskId
  found: setEditingTaskId is only called once in handleInsertAfter (sets to newTask.id). It is NEVER set back to null.
  implication: editingTaskId === newTask.id FOREVER after insert. Every time onTaskChange is called (i.e., when user presses Enter to save the name), the tasks array updates, TaskListRow re-renders, and the useEffect re-fires setting editingName=true again.

- timestamp: 2026-03-09
  checked: sequence of events on Enter press
  found: |
    1. User presses Enter in the name input
    2. handleNameKeyDown fires: saves name via onTaskChange, calls setEditingName(false)
    3. onTaskChange propagates up through GanttChart.handleTaskChange -> onChange -> setTasks
    4. setTasks causes re-render. Now task.name has changed.
    5. TaskListRow re-renders with updated task.name
    6. useEffect dependency [editingTaskId, task.id, task.name, disableTaskNameEditing] detects task.name changed
    7. useEffect fires AGAIN: setEditingName(true) - edit mode is re-entered!
    8. User is back in edit mode - needs to press Enter a second time
  implication: ROOT CAUSE CONFIRMED. The useEffect has task.name in its dependency array. Saving the name (step 3) causes task.name to change, which re-triggers the useEffect, which re-enters edit mode.

## Resolution

root_cause: |
  The useEffect in TaskListRow that auto-enters edit mode has `task.name` in its dependency array.
  When the user saves the task name (pressing Enter), onTaskChange is called with the new name.
  This causes a re-render with an updated task.name, which re-triggers the useEffect.
  Since editingTaskId is never cleared (still equals task.id), the condition passes and setEditingName(true) fires again.
  Result: edit mode is re-entered immediately after being exited, requiring a second Enter/click to actually exit.

  Secondary contributing factor: editingTaskId is never cleared after use - it permanently stays set to the last-inserted task's ID.

fix: |
  In TaskListRow.tsx:
  1. Added `autoEditedForRef = useRef<string | null>(null)` to track which editingTaskId we already reacted to.
  2. Added guard condition `autoEditedForRef.current !== editingTaskId` to the auto-edit useEffect.
  3. Inside the effect, set `autoEditedForRef.current = editingTaskId` before entering edit mode.
  4. Removed `task.name` from the useEffect dependency array (only [editingTaskId, task.id, disableTaskNameEditing] remain).

  This ensures the auto-edit effect fires exactly ONCE per designated editingTaskId, even if the component re-renders
  with a new task.name (which happens immediately when the user saves the name via Enter/blur).

verification: pending human confirmation
files_changed:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
