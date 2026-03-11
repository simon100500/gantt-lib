---
phase: quick
plan: 95
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
    - "Parent tasks are visually distinct from regular tasks in the tasklist"
    - "Parent tasks have a more prominent purple background highlighting"
    - "The purple color provides better contrast than the current subtle highlighting"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Parent row styling with purple background"
      contains: ".gantt-tl-row-parent"
  key_links:
    - from: ".gantt-tl-row-parent"
      to: "visual appearance"
      via: "background-color CSS property"
      pattern: "background-color.*rgba.*241"
---

<objective>
Make parent task highlighting more contrast with purple color in the tasklist.

Purpose: Currently parent tasks have a very subtle indigo background (5% opacity) that is hard to distinguish from regular tasks. This plan increases the contrast to make parent tasks more visually distinct.

Output: Parent tasks will have a more prominent purple background color that is clearly visible.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskList/TaskList.css
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx

Current parent row styling (line 85-88 in TaskList.css):
```css
.gantt-tl-row-parent {
  font-weight: 600;
  background-color: var(--gantt-parent-row-bg, rgba(99, 102, 241, 0.05));
}
```

The current color uses rgba(99, 102, 241, 0.05) - indigo/purple with only 5% opacity.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Increase parent row background opacity to make purple more visible</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    Update the .gantt-tl-row-parent CSS class to increase the opacity of the purple background color.

    Change from:
    background-color: var(--gantt-parent-row-bg, rgba(99, 102, 241, 0.05));

    Change to:
    background-color: var(--gantt-parent-row-bg, rgba(139, 92, 246, 0.15));

    This changes:
    - Color from indigo (99, 102, 241) to purple (139, 92, 246) for a more vibrant purple hue
    - Opacity from 0.05 (5%) to 0.15 (15%) for 3x better visibility while still being subtle

    The purple color (139, 92, 246) is a standard violet/purple that provides good contrast without being overwhelming.
  </action>
  <verify>
    <automated>grep -A 2 "\.gantt-tl-row-parent" packages/gantt-lib/src/components/TaskList/TaskList.css</automated>
  </verify>
  <done>Parent rows have visible purple background with rgba(139, 92, 246, 0.15)</done>
</task>

</tasks>

<verification>
1. Visual verification: Parent tasks should be clearly distinguishable from regular tasks by their purple background
2. The purple should be noticeable but not overwhelming (maintaining good UX)
3. The font-weight: 600 should remain unchanged
</verification>

<success_criteria>
- Parent task rows have a clearly visible purple background
- The background uses rgba(139, 92, 246, 0.15) for optimal contrast
- Regular child tasks do not have this background
- The styling works with the existing CSS variable fallback pattern
</success_criteria>

<output>
After completion, create `.planning/quick/95-tasklist/95-SUMMARY.md`
</output>
