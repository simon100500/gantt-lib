---
phase: quick
plan: 80
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "When clicking a dependency chip (selection mode), the add button (+) does not appear on hover"
    - "The delete button (trash) for the selected chip remains visible"
    - "When no chip is selected, the add button appears on hover as before"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Component logic for hiding add button when chip selected"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "CSS styling for conditional add button visibility"
  key_links:
    - from: "TaskListRow.tsx"
      to: "TaskList.css"
      via: "CSS class condition gantt-tl-dep-add-hidden"
      pattern: "gantt-tl-dep-add.*hidden"
---

<objective>
Hide add dependency button on hover when a dependency chip is selected

Purpose: When a user clicks on a dependency chip to select it (for deletion), the add dependency button (+) should not appear on hover since it would clutter the UI alongside the delete button. The add button should only appear when no chip is selected.

Output: Clean UI where only the delete button shows when a chip is selected, and the add button only appears when no selection is active.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add CSS class to hide add button when chip is selected</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    Add a new CSS class `.gantt-tl-dep-add-hidden` that overrides the hover-reveal behavior:
    - Set `opacity: 0` and `pointer-events: none` with `!important` to override the hover state
    - This class will be conditionally applied when a chip is selected

    Add after line 474 (after `.gantt-tl-row:hover .gantt-tl-dep-add-hover` rule):
    ```css
    /* Hide add button when a chip is selected (to avoid clutter with delete button) */
    .gantt-tl-dep-add-hidden {
      opacity: 0 !important;
      pointer-events: none !important;
    }
    ```
  </action>
  <verify>
    <automated>grep -n "gantt-tl-dep-add-hidden" packages/gantt-lib/src/components/TaskList/TaskList.css</automated>
  </verify>
  <done>CSS class exists that hides add button even on hover when applied</done>
</task>

<task type="auto">
  <name>Task 2: Conditionally apply hidden class when chip is selected</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    Modify the add dependency button rendering (around line 595-603) to conditionally apply the `gantt-tl-dep-add-hidden` class when `selectedChip` is not null.

    Find the button:
    ```tsx
    <button
      type="button"
      className="gantt-tl-dep-add gantt-tl-dep-add-hover"
      onClick={handleAddClick}
      aria-label="Добавить связь"
    >
      +
    </button>
    ```

    Change to:
    ```tsx
    <button
      type="button"
      className={`gantt-tl-dep-add gantt-tl-dep-add-hover${selectedChip ? ' gantt-tl-dep-add-hidden' : ''}`}
      onClick={handleAddClick}
      aria-label="Добавить связь"
    >
      +
    </button>
    ```

    This ensures the add button is hidden when ANY chip is selected (not just chips on this row), since `selectedChip` is a prop from the parent TaskList component that tracks the globally selected chip.
  </action>
  <verify>
    <automated>grep -n "gantt-tl-dep-add-hidden" packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</automated>
  </verify>
  <done>Add button receives conditional class and is hidden when chip is selected</done>
</task>

</tasks>

<verification>
1. Click on a dependency chip - verify the delete button (trash) appears
2. Hover over the dependencies cell - verify the add button (+) does NOT appear
3. Click elsewhere to deselect the chip
4. Hover over the dependencies cell - verify the add button (+) appears again
</verification>

<success_criteria>
- When a dependency chip is selected, hovering over any dependencies cell does not show the add button
- The delete button remains visible and functional for the selected chip
- When no chip is selected, the add button appears on hover as before
</success_criteria>

<output>
After completion, create `.planning/quick/80-hover/quick-80-SUMMARY.md`
</output>
