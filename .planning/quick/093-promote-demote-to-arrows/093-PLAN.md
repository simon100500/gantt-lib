---
phase: quick
plan: 093
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: false
requirements:
  - QUICK-093
user_setup: []

must_haves:
  truths:
    - "Single hierarchy button appears on hover in name cell"
    - "Left arrow (←) promotes task to root level"
    - "Right arrow (→) demotes task to child of previous task"
    - "Only one button shown per task (not two separate buttons)"
    - "Button disabled when action not available (first row, parent tasks)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Hierarchy button component with left/right arrows"
      contains: "hierarchy button with ←/→"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Styling for single hierarchy button"
      contains: ".gantt-tl-action-hierarchy"
  key_links:
    - from: "TaskListRow.tsx hierarchy button"
      to: "onPromoteTask/onDemoteTask callbacks"
      via: "click handler"
      pattern: "handlePromote|handleDemote"
---

<objective>
Replace separate "Повысить" and "Понизить" buttons with a single button showing left/right arrows (←/→) for hierarchy navigation.

Purpose: Simplify UI for non-multi-level hierarchy - use standard arrow indicators instead of text buttons, reducing visual clutter while maintaining functionality.
Output: Single hierarchy button with directional arrows that appears on hover.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/092-change-task-grouping/092-SUMMARY.md

# Current implementation (from TaskListRow.tsx lines 674-696)
- Promote button: `⬆ Повысить` (shown when `isChild && onPromoteTask`)
- Demote button: `⬇ Понизить` (shown when `!isParent && onDemoteTask`)
- Both use `gantt-tl-name-action-btn` class with inline styles
- Existing handlers: `handlePromote` (line 497) and `handleDemote` (line 502)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create single hierarchy button component</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    Create a new HierarchyButton component (inside TaskListRow.tsx before main component) that:
    - Accepts props: `isChild`, `isParent`, `onPromote`, `onDemote`, `rowIndex`
    - Shows a single button with left arrow "←" when task can be promoted (isChild)
    - Shows a single button with right arrow "→" when task can be demoted (!isParent && rowIndex > 0)
    - Button uses existing `gantt-tl-name-action-btn gantt-tl-action-hierarchy` classes
    - Click on left arrow calls `onPromote`, right arrow calls `onDemote`
    - Button disabled when neither action available (first row demote, parent task promote is always available if child)
    - Position: Replace existing promote/demote buttons (lines 674-696) with single HierarchyButton instance

    Implementation notes:
    - Use two separate arrow spans/buttons within single container for better click targets
    - Left arrow: `←` (promote to root), Right arrow: `→` (demote to child)
    - Each arrow can be independently disabled based on context
    - Maintain hover-reveal behavior via existing `gantt-tl-name-action-btn` class
  </action>
  <verify>
    <automated>MISSING — No automated test exists for UI hierarchy buttons. Manual verification only.</automated>
  </verify>
  <done>
    Single hierarchy button with left/right arrows replaces two separate text buttons
  </done>
</task>

<task type="auto">
  <name>Task 2: Add CSS styling for hierarchy button</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    Add styles for the new hierarchy button after existing action button styles (after line 408):

    ```css
    /* Single hierarchy button with left/right arrows */
    .gantt-tl-action-hierarchy {
      width: auto;
      min-width: 40px;
      padding: 2px 6px;
      gap: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Individual arrow buttons within hierarchy container */
    .gantt-tl-hierarchy-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 3px;
      font-size: 14px;
      line-height: 1;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .gantt-tl-hierarchy-arrow:hover:not(:disabled) {
      background-color: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }

    .gantt-tl-hierarchy-arrow:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* Show only available arrow - hide disabled arrows */
    .gantt-tl-hierarchy-arrow:disabled {
      display: none;
    }
    ```

    Remove obsolete CSS classes if any exist for `.gantt-tl-action-promote` and `.gantt-tl-action-demote` (none currently exist - styles are inline).
  </action>
  <verify>
    <automated>MISSING — CSS changes verified visually during manual testing.</automated>
  </verify>
  <done>
    Hierarchy button displays left/right arrows with proper hover states
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Single hierarchy button with left/right arrows replacing separate promote/demote text buttons
  </what-built>
  <how-to-verify>
    1. Open the Gantt chart application
    2. Create test tasks: Root task, Child task (demoted from root), Another root task
    3. Hover over Child task name:
       - Verify LEFT ARROW (←) appears and works (click → task becomes root)
    4. Hover over root task (not first row):
       - Verify RIGHT ARROW (→) appears and works (click → task becomes child of previous)
    5. Verify first row has NO right arrow (demote disabled)
    6. Verify parent tasks still show promote option if they're children
    7. Verify hover-reveal behavior works (button only visible on row hover)
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- Single button with arrows appears on hover in name cell
- Left arrow (←) promotes child tasks to root level
- Right arrow (→) demotes root tasks to child of previous task
- Only one button component rendered (not two separate buttons)
- Proper disabled states: first row cannot demote, arrows hidden when disabled
- Existing promote/demote functionality preserved (smart hierarchy inference from 092 still works)
</verification>

<success_criteria>
- Hierarchy navigation works with arrow UI instead of text buttons
- Visual clutter reduced in task name cell
- All existing hierarchy operations (promote/demote) function identically
</success_criteria>

<output>
After completion, create `.planning/quick/093-promote-demote-to-arrows/093-SUMMARY.md`
</output>
