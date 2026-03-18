---
phase: quick
plan: 260318-nji
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "External duration label has the same offset from bar edge regardless of whether duration is inside or outside the bar"
    - "Spacing between external labels (duration, progress, task name) remains visually consistent via container gap"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "Cleaned up margins on rightLabels flex children"
  key_links: []
---

<objective>
Fix inconsistent positioning of external duration labels in TaskRow.

Purpose: When duration text is rendered outside the task bar (narrow bars), the offset from the bar's right edge differs by 4px compared to when duration is inside. This is caused by redundant margin-left/margin-right on flex children inside `.gantt-tr-rightLabels`, which already uses `gap: 4px` for inter-item spacing.

Output: Clean CSS with consistent label positioning across all scales.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskRow/TaskRow.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Clean up rightLabels flex child margins</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <action>
In TaskRow.css, make these changes:

1. `.gantt-tr-rightLabels` (line ~67-76): change `margin-left: 24px` to `margin-left: 8px`. The container already has `gap: 4px` for spacing between children. The 8px value matches the bar's internal padding (0.5rem = 8px), keeping proportions clean.

2. `.gantt-tr-externalTaskName` (line ~83-90): remove `margin-left: 4px`. The container gap handles spacing between items. This margin caused first-item offset inconsistency.

3. `.gantt-tr-externalProgress` (line ~195-202): remove both `margin-right: 4px` and `margin-left: 4px`. Container gap handles inter-item spacing.

4. `.gantt-tr-externalDuration` (line ~205-211): remove `margin-right: 4px`. Container gap handles inter-item spacing.

Do NOT change any other properties on these selectors. Only remove/change margin properties as specified.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --noEmit 2>&1 | head -5</automated>
  </verify>
  <done>All four CSS rules updated. No individual margins on flex children — only container gap for inter-item spacing and margin-left: 8px on container for offset from bar edge.</done>
</task>

</tasks>

<verification>
- Visual inspection: external duration labels on 1-day tasks align at same offset as task names on wider tasks
- No TypeScript compilation errors
</verification>

<success_criteria>
- `.gantt-tr-rightLabels` has `margin-left: 8px` (not 24px)
- `.gantt-tr-externalTaskName` has no margin-left
- `.gantt-tr-externalProgress` has no margin-left or margin-right
- `.gantt-tr-externalDuration` has no margin-right
- Container `gap: 4px` unchanged (handles all inter-item spacing)
</success_criteria>

<output>
After completion, create `.planning/quick/260318-nji-taskrow/260318-nji-SUMMARY.md`
</output>
