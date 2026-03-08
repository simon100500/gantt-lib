---
status: verifying
trigger: "first-character-eaten-on-keyboard-edit"
created: 2026-03-08T00:00:00.000Z
updated: 2026-03-08T01:05:00.000Z
---

## Current Focus
hypothesis: Scroll-to-task is attached to the wrong column - it's on the № column but should be on the task name column
test: Moved onScrollToTask call from handleNumberClick to handleNameClick
expecting: Clicking task name scrolls to task; clicking № only selects the row
next_action: Request human verification of the fix

## Symptoms
expected: When selecting a row and starting to type, all characters appear in the input field (like Excel/Google Sheets)
actual: The first character disappears — it's used to activate edit mode but doesn't appear in the field
errors: None (silent bug)
reproduction: Select a task row, then start typing a name
timeline: This was just implemented in quick task 66, so it's a new bug

## Eliminated

## Evidence
- timestamp: 2026-03-08T00:00:01.000Z
  checked: TaskListRow.tsx, handleRowKeyDown function (lines 280-288)
  found: When a printable key is pressed, the handler calls e.preventDefault() and sets nameValue to empty string (''), then activates edit mode. The typed character (e.key) is lost.
  implication: The first character is consumed to activate edit mode but never inserted into the input field
- timestamp: 2026-03-08T01:00:00.000Z
  checked: TaskListRow.tsx, click handlers
  found: handleNumberClick (lines 331-335) calls onScrollToTask when № column is clicked. handleNameClick (lines 267-271) does NOT call onScrollToTask.
  implication: Scroll-to-task is triggered by № column but should be triggered by task name column instead

## Resolution
root_cause: |
  1. First character eaten: handleRowKeyDown set nameValue to empty string instead of the typed character
  2. Scroll-to-task on wrong column: onScrollToTask was called from № column instead of task name column
fix: |
  1. Changed line 284 from setNameValue('') to setNameValue(e.key)
  2. Moved onScrollToTask call from handleNumberClick to handleNameClick
  3. Updated comments to reflect new behavior
verification: Self-verification complete - awaiting user confirmation
files_changed: ["packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"]
