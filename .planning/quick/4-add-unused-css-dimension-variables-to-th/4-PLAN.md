---
phase: quick
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
  - src/components/TaskRow/TaskRow.module.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "CSS variables for task dimensions are defined in globals.css"
    - "Component styles use the CSS variables instead of hardcoded values"
    - "Users can customize task dimensions by overriding CSS variables"
  artifacts:
    - path: "src/app/globals.css"
      provides: "CSS variable definitions for task dimensions"
      contains: "--gantt-task-height, --gantt-task-margin, --gantt-task-padding, --gantt-task-border-radius"
    - path: "src/components/TaskRow/TaskRow.module.css"
      provides: "Task row styles using CSS variables"
      contains: "var(--gantt-task-*)"
  key_links:
    - from: "src/components/TaskRow/TaskRow.module.css"
      to: "src/app/globals.css"
      via: "CSS variable references"
      pattern: "var\\(--gantt-task-"
---

<objective>
Add CSS dimension variables to globals.css for theming support

Purpose: Enable users to customize task bar dimensions (height, margin, padding, border-radius) through CSS variables instead of hardcoded values
Output: Enhanced globals.css with task dimension variables
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/globals.css
@src/components/TaskRow/TaskRow.module.css

# CSS Variables to Add (from planning image)
--gantt-task-height: 40px
--gantt-task-margin: 10px
--gantt-task-padding: 12px
--gantt-task-border-radius: 8px
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add task dimension CSS variables to globals.css</name>
  <files>src/app/globals.css</files>
  <action>
    Add the following CSS variables to the :root section in globals.css:

    /* Task Bar Dimensions */
    --gantt-task-height: 40px;
    --gantt-task-margin: 10px;
    --gantt-task-padding: 12px;
    --gantt-task-border-radius: 8px;

    Place these variables in a new "Task Bar Dimensions" subsection after the existing "Task Bar Styling" section (after --gantt-task-bar-height).

    Note: Keep --gantt-task-bar-height as is (28px) since it refers to the rendered height, while --gantt-task-height (40px) will be the total height including margin.
  </action>
  <verify>grep -n "gantt-task-\(height\|margin\|padding\|border-radius\)" src/app/globals.css returns 4 matching lines</verify>
  <done>All four task dimension variables are defined in globals.css :root section</done>
</task>

<task type="auto">
  <name>Task 2: Update TaskRow.module.css to use CSS variables</name>
  <files>src/components/TaskRow/TaskRow.module.css</files>
  <action>
    Update TaskRow.module.css to use the new CSS variables:

    1. .resizeHandle width: Change from "8px" to "var(--gantt-resize-handle-width, 8px)"
    2. .dateLabel font-size: Change from "1rem" to "var(--gantt-date-label-font-size, 1rem)"
    3. .dateLabel color: Change from "#666" to "var(--gantt-date-label-color, #666)"
    4. .dateLabelLeft margin-right: Change from "4px" to "var(--gantt-date-label-margin, 4px)"
    5. .dateLabelRight margin-left: Change from "4px" to "var(--gantt-date-label-margin, 4px)"

    This allows users to customize resize handle width and date label styling.
  </action>
  <verify>grep "var(--gantt-" src/components/TaskRow/TaskRow.module.css shows variable references for resize handle and date labels</verify>
  <done>TaskRow.module.css uses CSS variables for resize handle and date label styling</done>
</task>

</tasks>

<verification>
1. Check globals.css contains all task dimension variables
2. Verify TaskRow.module.css uses CSS variables instead of hardcoded values
3. Confirm existing component functionality is preserved
</verification>

<success_criteria>
- globals.css has 4 new task dimension variables defined
- TaskRow.module.css uses CSS variables for resize handle and date label styling
- No visual changes to the rendered Gantt chart (backward compatible with fallback values)
</success_criteria>

<output>
After completion, create `.planning/quick/4-add-unused-css-dimension-variables-to-th/4-SUMMARY.md`
</output>
