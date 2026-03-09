---
phase: quick-72
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements:
  - QUICK-72
must_haves:
  truths:
    - "Dependencies column width is constrained to 90px"
    - "Content does not overflow beyond the column boundary"
    - "Column respects the defined width constraint"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "CSS styling for dependencies column"
      contains: ".gantt-tl-cell-deps { overflow: hidden; }"
  key_links:
    - from: ".gantt-tl-cell-deps"
      to: "90px width constraint"
      via: "overflow: hidden property"
      pattern: "overflow:\\s*hidden"
---

<objective>
Fix dependencies column width overflow issue by constraining content to 90px boundary

Purpose: The dependencies column (`.gantt-tl-cell-deps`) currently has `overflow: visible` which allows chips and text to extend beyond the 90px width, causing layout issues.
Output: Constrained column width with content properly contained within 90px
</objective>

<execution_context>
@D:/Projects/gantt-lib/.claude/get-shit-done/workflows/execute-plan.md
@D:/Projects/gantt-lib/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix dependencies column overflow</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    In the `.gantt-tl-cell-deps` class (around line 219), change `overflow: visible;` to `overflow: hidden;`.

    This will ensure that all content (chips, text, buttons) remains within the 90px width boundary and doesn't spill out into adjacent columns.

    Current (line 226):
    ```css
    overflow: visible;
    ```

    Change to:
    ```css
    overflow: hidden;
    ```
  </action>
  <verify>
    <automated>grep -n "overflow:" packages/gantt-lib/src/components/TaskList/TaskList.css | grep -A1 "gantt-tl-cell-deps"</automated>
  </verify>
  <done>
    The `.gantt-tl-cell-deps` class has `overflow: hidden` set, constraining all content within the 90px width boundary
  </done>
</task>

</tasks>

<verification>
- CSS file updated with overflow: hidden
- No content extends beyond 90px in dependencies column
- Visual inspection confirms column respects width constraint
</verification>

<success_criteria>
Dependencies column properly constrains content to 90px width without overflow
</success_criteria>

<output>
After completion, create `.planning/quick/72-gantt-tl-cell-deps-90px/72-SUMMARY.md`
</output>
