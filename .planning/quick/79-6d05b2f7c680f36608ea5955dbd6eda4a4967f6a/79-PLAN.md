---
phase: quick
plan: 79
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "Clicking a dependency chip scrolls the chart to the predecessor task"
    - "Chip toggle functionality still works (clicking selected chip deselects it)"
    - "Scroll does not interfere with chip selection state"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Dependency chip with scroll to predecessor task"
      contains: "onScrollToTask(dep.taskId) in DepChip handleClick"
  key_links:
    - from: "DepChip.handleClick"
      to: "onScrollToTask"
      via: "direct callback with predecessor task ID"
      pattern: "onScrollToTask\\(dep\\.taskId\\)"
---

<objective>
Add scroll-to-predecessor functionality when clicking a dependency chip, using a simpler approach that doesn't break the chip toggle behavior.

Purpose: Users want to quickly navigate to the predecessor task when viewing dependencies.
Output: Clicking a dependency chip scrolls the chart to center the predecessor task bar.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add scroll to predecessor on dependency chip click</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    In the `DepChip` component's `handleClick` function (around line 88), add a call to `onScrollToTask(dep.taskId)` to scroll to the predecessor task when the chip is clicked.

    Key changes:
    1. In `handleClick`, after `onChipSelect?.(...)` call, add `onScrollToTask?.(dep.taskId);`
    2. Do NOT call `onRowClick` - this was the problematic approach that broke toggle
    3. Only scroll to the predecessor task (dep.taskId), not the current task (taskId)

    The simplified logic should be:
    - Clicking unselected chip: select it AND scroll to predecessor
    - Clicking already selected chip: deselect it (no scroll needed)

    This approach is simpler and more reliable because:
    - Scroll happens after selection, not before
    - No row selection interference
    - Clear separation of concerns: selection state vs navigation
  </action>
  <verify>
    <automated>npm run test</automated>
  </verify>
  <done>
    - Clicking a dependency chip scrolls the chart to center the predecessor task bar
    - Chip toggle still works (clicking selected chip deselects it)
    - No interference with row selection or other interactions
  </done>
</task>

</tasks>

<verification>
1. Click a dependency chip in the task list
2. Verify the chart scrolls to center the predecessor task bar
3. Click the same chip again
4. Verify the chip deselects (toggle off) without unwanted side effects
5. Verify row selection still works independently
</verification>

<success_criteria>
- Dependency chip click triggers scroll to predecessor task
- Chip toggle functionality remains intact
- No regression in existing chip/row interaction behavior
</success_criteria>

<output>
After completion, create `.planning/quick/79-6d05b2f7c680f36608ea5955dbd6eda4a4967f6a/79-SUMMARY.md`
</output>
