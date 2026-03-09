---
phase: quick-74
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "The 'Выберите задачу' text fits within the 90px dependencies column width"
    - "The text wraps to multiple lines if needed instead of overflowing"
    - "No text is clipped or cut off"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "CSS rule for source hint text styling"
      contains: ".gantt-tl-dep-source-hint"
  key_links:
    - from: ".gantt-tl-dep-source-hint"
      to: ".gantt-tl-cell-deps"
      via: "text wrapping within 90px container"
      pattern: "white-space: normal"
---

<objective>
Fix text overflow in the dependencies column during link creation mode by allowing the "Выберите задачу" placeholder text to wrap within the 90px width boundary.

Purpose: The current `white-space: nowrap` prevents text wrapping, causing "Выберите задачу" to overflow beyond the 90px column width. This needs to wrap to fit properly.

Output: Modified CSS rule allowing text wrapping for the source hint placeholder.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/72-gantt-tl-cell-deps-90px/72-SUMMARY.md
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Allow text wrapping for source hint placeholder</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
In the `.gantt-tl-dep-source-hint` CSS rule (around line 497), change `white-space: nowrap;` to `white-space: normal;`. This will allow the "Выберите задачу" text to wrap to multiple lines within the 90px column width instead of overflowing beyond it.

The change:
```css
/* Before */
.gantt-tl-dep-source-hint {
  white-space: nowrap;
}

/* After */
.gantt-tl-dep-source-hint {
  white-space: normal;
}
```

Additionally, ensure the text remains readable by:
1. Keeping `font-size: 0.75rem` for compact text
2. Keeping `color: #6b7280` for grey hint appearance
3. Keeping `font-style: italic` for placeholder styling
4. Keeping `pointer-events: none` to prevent interaction
</action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && grep -A5 "\.gantt-tl-dep-source-hint" packages/gantt-lib/src/components/TaskList/TaskList.css | grep "white-space: normal"</automated>
  </verify>
  <done>
    - "Выберите задачу" text wraps within 90px column width
    - No text overflow beyond column boundary
    - Text remains readable with proper styling
  </done>
</task>

</tasks>

<verification>
1. Open demo page with task list visible
2. Click "+" in any row's deps cell to enter link creation mode
3. Confirm: the initiating row shows "Выберите задачу" with text wrapping to fit within 90px
4. Confirm: no text overflows into adjacent columns
</verification>

<success_criteria>
"Выберите задачу" placeholder text wraps within the 90px dependencies column width without overflow.
</success_criteria>

<output>
After completion, create `.planning/quick/74-overflow-90px/74-SUMMARY.md`
</output>
