---
phase: quick
plan: 086
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.css
  - packages/gantt-lib/src/styles.css
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "Vertical separator lines between task list columns are hidden by default"
    - "Separators can be optionally enabled via CSS variable"
    - "Task list right border (separator from gantt grid) remains visible"
  artifacts:
    - path: "packages/gantt-lib/src/styles.css"
      provides: "CSS variable for controlling vertical separators"
      contains: "--gantt-tl-vertical-separators"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Task list column styles with optional separators"
      contains: "border-right: var(--gantt-tl-vertical-separators-width)"
  key_links:
    - from: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      to: "packages/gantt-lib/src/styles.css"
      via: "CSS variable reference"
      pattern: "var\\(--gantt-tl-vertical-separators"
---

<objective>
Remove vertical separator lines between task list columns by default, with optional CSS variable to enable them.

Purpose: Cleaner UI appearance with less visual clutter between columns, while maintaining customizability for users who prefer separators.
Output: Task list with no vertical column separators by default, configurable via CSS variable.
</objective>

<execution_context>
@C:/Users/simon/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/simon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add CSS variable for optional vertical separators</name>
  <files>packages/gantt-lib/src/styles.css</files>
  <action>
    Add two new CSS variables to styles.css in the CSS Variables section (around line 30-40):

    1. `--gantt-tl-vertical-separators: none;` - Controls whether vertical separators are shown (default: none)
    2. `--gantt-tl-vertical-separators-width: 1px solid var(--gantt-grid-line-color, #e0e0e0);` - The border style when enabled

    Add these after the existing grid variables and before the TimeScale variables. Include comments explaining that users can set `--gantt-tl-vertical-separators: var(--gantt-tl-vertical-separators-width);` to enable separators.
  </action>
  <verify>
    <automated>grep -n "gantt-tl-vertical-separators" packages/gantt-lib/src/styles.css</automated>
  </verify>
  <done>CSS variables added with default value "none" (separators hidden)</done>
</task>

<task type="auto">
  <name>Task 2: Update TaskList.css to use CSS variable for column separators</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    Replace hardcoded `border-right: 1px solid var(--gantt-grid-line-color, #e0e0e0);` with the CSS variable in two locations:

    1. Line 50 in `.gantt-tl-headerCell`: Change from `border-right: 1px solid var(--gantt-grid-line-color, #e0e0e0);` to `border-right: var(--gantt-tl-vertical-separators);`

    2. Line 86 in `.gantt-tl-cell`: Change from `border-right: 1px solid var(--gantt-grid-line-color, #e0e0e0);` to `border-right: var(--gantt-tl-vertical-separators);`

    IMPORTANT: Do NOT modify:
    - Line 13 (`.gantt-tl-overlay` border-right) - this is the main separator between task list and gantt grid
    - Line 54 (`.gantt-tl-headerCell:last-child` border-right: none) - keep last-child rule
    - Line 92 (`.gantt-tl-cell:last-child` border-right: none) - keep last-child rule
  </action>
  <verify>
    <automated>grep -n "gantt-tl-vertical-separators" packages/gantt-lib/src/components/TaskList/TaskList.css</automated>
  </verify>
  <done>Column separators now controlled by CSS variable (default: hidden)</done>
</task>

</tasks>

<verification>
1. Build the library: npm run build (in packages/gantt-lib)
2. Check demo page: Task list columns should have no vertical separators between them
3. Verify main border: The right border of the entire task list (separating it from the gantt grid) should still be visible
4. Test optional enabling: Add custom CSS `:root { --gantt-tl-vertical-separators: var(--gantt-tl-vertical-separators-width); }` to demo page and verify separators appear
</verification>

<success_criteria>
- Vertical separator lines between task list columns are hidden by default
- Task list right border (separator from gantt grid) remains visible
- Users can enable separators by setting CSS variable
- No hardcoded border-right values on column cells
- Last-child rules still prevent border on final column
</success_criteria>

<output>
After completion, create `.planning/quick/086-remove-vertical-separators/086-SUMMARY.md`
</output>
