---
phase: quick
plan: 13
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "Task labels always appear on the right side of the task bar"
    - "No task labels appear inside the task bar"
    - "Labels are positioned consistently regardless of task bar width"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Simplified label rendering logic"
      contains: "External task name label only"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "Label positioning styles"
      contains: ".gantt-tr-externalTaskName"
  key_links:
    - from: "TaskRow.tsx"
      to: "TaskRow.css"
      via: "className reference"
      pattern: "gantt-tr-externalTaskName"
---

<objective>
Remove complex task label positioning logic and always display labels on the right side outside the task bar.

Purpose: Simplify the component and provide consistent label positioning as per project requirements (from backlog: "Унификация подписей: название задачи всегда справа" - Unify labels: task name always on the right).

Output: Clean, consistent label positioning with no overflow detection logic.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
@packages/gantt-lib/src/components/TaskRow/TaskRow.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create worktree and new branch for label positioning refactor</name>
  <files></files>
  <action>
    Create a new git worktree and branch for this feature:

    1. Create worktree at path: `D:\Projects\gantt-lib-worktree\13-label-positioning`
    2. Create new branch: `feature/13-always-right-labels` from current branch `depend`

    Use git commands:
    ```bash
    git worktree add D:\Projects\gantt-lib-worktree\13-label-positioning -b feature/13-always-right-labels
    ```

    Verify worktree was created successfully.
  </action>
  <verify>Run `git worktree list` to confirm worktree exists</verify>
  <done>Worktree created at specified path with new branch checked out</done>
</task>

<task type="auto">
  <name>Task 2: Simplify label rendering to always show on right side</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.tsx, packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <action>
    Refactor TaskRow component to remove complex overflow detection and always render labels on the right side:

    **In TaskRow.tsx:**
    1. Remove the `isNameOverflow` state (lines 164-165)
    2. Remove the `useEffect` that checks overflow (lines 167-176)
    3. Remove the `taskNameRef` ref (line 165)
    4. Remove the `gantt-tr-taskNameHidden` className logic from the task name span (lines 210-215)
    5. Remove the entire task name span inside the taskBar (lines 210-215)
    6. Remove the conditional `{isNameOverflow && ...}` wrapper from rightLabels (lines 234-238) and always render the external task name
    7. Keep only the duration inside the task bar, move to the right side along with task name

    The final structure should be:
    - Task bar contains: left handle, progress bar (if any), right handle, duration (no task name inside)
    - Right labels container (outside bar): task name always displayed

    **In TaskRow.css:**
    1. Remove `.gantt-tr-taskName` and `.gantt-tr-taskNameHidden` styles (lines 55-75)
    2. Keep `.gantt-tr-externalTaskName` styles for the external label
    3. Update `.gantt-tr-taskDuration` to position properly without the task name inside the bar

    Reference existing code structure from lines 184-239 in TaskRow.tsx.
  </action>
  <verify>
    1. Run `npm run build` in packages/gantt-lib to ensure no TypeScript errors
    2. Run `npm run test` in packages/gantt-lib to ensure existing tests pass
  </verify>
  <done>Task labels always render on the right side outside the task bar, no overflow detection code remains</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Simplified label positioning with labels always on the right side</what-built>
  <how-to-verify>
    1. Navigate to the website directory: `cd D:\Projects\gantt-lib-worktree\13-label-positioning\packages\website`
    2. Start dev server: `npm run dev`
    3. Visit http://localhost:3000
    4. Verify that:
       - Task names appear on the right side of task bars (outside)
       - No task names appear inside the task bars
       - Duration remains visible inside the task bar
       - Labels are positioned consistently for tasks of different widths
       - Dragging and resizing still works correctly
    5. Test with tasks of various widths to ensure consistent behavior
  </how-to-verify>
  <resume-signal>Type "approved" or describe any issues with the label positioning</resume-signal>
</task>

</tasks>

<verification>
- [ ] Worktree created successfully with new branch
- [ ] TaskRow.tsx no longer contains overflow detection logic
- [ ] Task name is always rendered on the right side outside the bar
- [ ] Duration remains inside the task bar
- [ ] CSS is updated to remove unused styles
- [ ] Build passes without errors
- [ ] Visual verification confirms consistent label positioning
</verification>

<success_criteria>
- Task labels always appear on the right side of task bars, never inside
- No overflow detection state or effects in TaskRow component
- Simplified, maintainable code structure
- All existing functionality preserved
</success_criteria>

<output>
After completion, create `.planning/quick/13-remove-task-label-positioning-logic-alwa/13-SUMMARY.md`
</output>
