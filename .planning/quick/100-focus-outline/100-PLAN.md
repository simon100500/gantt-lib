---
phase: quick-100
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/styles.css
autonomous: true
requirements:
  - QUICK-100-focus-outline
must_haves:
  truths:
    - "No black focus ring appears on any gantt element when tabbing or clicking"
    - "Text inside the gantt chart cannot be selected by dragging the cursor"
  artifacts:
    - path: "packages/gantt-lib/src/styles.css"
      provides: "Global focus-outline reset and user-select: none"
      contains: "outline"
  key_links:
    - from: "packages/gantt-lib/src/styles.css"
      to: ".gantt-container *"
      via: "CSS universal selector scoped to container"
      pattern: "outline.*none|user-select.*none"
---

<objective>
Remove the browser default black focus outline from all gantt chart elements and prevent text selection by cursor globally within the gantt container.

Purpose: Improves the visual polish of the gantt chart by eliminating the native focus ring artifact and accidental text-selection UX noise during drag interactions.
Output: Two CSS rule blocks appended to styles.css, scoped to .gantt-container *.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/styles.css
@packages/gantt-lib/src/components/GanttChart/GanttChart.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add global focus-outline reset and user-select: none to styles.css</name>
  <files>packages/gantt-lib/src/styles.css</files>
  <action>
Append the following two rule blocks at the END of packages/gantt-lib/src/styles.css (after the existing :root block):

```css
/* Remove browser default focus outlines for all gantt elements */
.gantt-container *:focus,
.gantt-container *:focus-visible {
  outline: none;
}

/* Prevent text selection by cursor inside the gantt chart */
.gantt-container * {
  user-select: none;
}
```

Scope MUST be `.gantt-container *` — do NOT use a bare `*` global selector, which would affect the host application outside the gantt. Do NOT use `outline: 0` (use `outline: none` for clarity). Do NOT add `-webkit-user-select` or `-moz-user-select` prefixes — they are not needed for the supported browser baseline (modern evergreen).
  </action>
  <verify>
    <automated>grep -n "outline: none" D:/Projects/gantt-lib/packages/gantt-lib/src/styles.css && grep -n "user-select: none" D:/Projects/gantt-lib/packages/gantt-lib/src/styles.css</automated>
  </verify>
  <done>styles.css contains both rule blocks; scoped to .gantt-container *; no bare global selectors used.</done>
</task>

</tasks>

<verification>
After task completes, confirm:
1. `grep -n "outline: none" packages/gantt-lib/src/styles.css` returns a match inside a `.gantt-container *` rule.
2. `grep -n "user-select: none" packages/gantt-lib/src/styles.css` returns a match inside a `.gantt-container *` rule.
3. No bare `*` universal selector was introduced.
</verification>

<success_criteria>
- Focus rings are suppressed on all gantt elements (.gantt-container *)
- Text cannot be selected by cursor drag anywhere inside .gantt-container
- Change is confined to styles.css — no other files modified
</success_criteria>

<output>
After completion, create `.planning/quick/100-focus-outline/quick-100-01-SUMMARY.md`
</output>
