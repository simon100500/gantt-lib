---
phase: quick-71
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/styles.css
  - packages/gantt-lib/src/components/GanttChart/GanttChart.css
autonomous: true
requirements: [QUICK-71]

must_haves:
  truths:
    - "Consumer can override border-radius of .gantt-container by setting --gantt-container-border-radius CSS variable"
    - "Default border-radius remains 10px when variable is not set"
  artifacts:
    - path: "packages/gantt-lib/src/styles.css"
      provides: "--gantt-container-border-radius default in :root"
      contains: "--gantt-container-border-radius: 10px"
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.css"
      provides: "border-radius uses CSS variable"
      contains: "border-radius: var(--gantt-container-border-radius, 10px)"
  key_links:
    - from: "packages/gantt-lib/src/styles.css"
      to: "packages/gantt-lib/src/components/GanttChart/GanttChart.css"
      via: "CSS variable --gantt-container-border-radius used in border-radius property"
---

<objective>
Expose border-radius of .gantt-container as a CSS custom property --gantt-container-border-radius following the project's existing --gantt-* variable pattern. Currently the value is hardcoded as 10px in GanttChart.css.

Purpose: Allows consumers to customize container corner rounding via CSS variable, consistent with all other gantt theming variables.
Output: Variable declared in :root in styles.css, consumed in GanttChart.css.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@D:/Projects/gantt-lib/.planning/STATE.md

Key facts from codebase:
- CSS variable convention: --gantt-* (e.g., --gantt-task-bar-border-radius, --gantt-grid-line-color)
- All global defaults live in :root block in packages/gantt-lib/src/styles.css
- GanttChart.css .gantt-container currently has: border-radius: 10px (hardcoded)
- Pattern: border-radius: var(--gantt-task-bar-border-radius, 4px) already used for task bars

Current GanttChart.css .gantt-container:
```css
.gantt-container {
  width: 100%;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border: 1px solid var(--gantt-grid-line-color, #e0e0e0);
  background-color: var(--gantt-cell-background, #ffffff);
  border-radius: 10px;
  overflow: hidden;
}
```

Current styles.css :root (relevant excerpt — Dimensions section ends at --gantt-day-width, Task Bar section has --gantt-task-bar-border-radius):
```css
/* Dimensions */
--gantt-row-height: 30px;
--gantt-header-height: 40px;
--gantt-day-width: 30px;

/* Task Bar Styling */
--gantt-task-bar-default-color: #3b82f6;
--gantt-task-bar-text-color: #ffffff;
--gantt-task-bar-border-radius: 4px;
--gantt-task-bar-height: 24px;
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add --gantt-container-border-radius variable to :root defaults and consume in .gantt-container</name>
  <files>
    packages/gantt-lib/src/styles.css
    packages/gantt-lib/src/components/GanttChart/GanttChart.css
  </files>
  <action>
Two targeted edits:

1. In packages/gantt-lib/src/styles.css, add --gantt-container-border-radius to the :root block. Place it in the Dimensions section, after --gantt-day-width and before the Task Bar Styling comment:

```css
/* Dimensions */
--gantt-row-height: 30px;
--gantt-header-height: 40px;
--gantt-day-width: 30px;
--gantt-container-border-radius: 10px;
```

2. In packages/gantt-lib/src/components/GanttChart/GanttChart.css, replace the hardcoded border-radius value in .gantt-container with the CSS variable (keep fallback for safety):

Change:
  border-radius: 10px;
To:
  border-radius: var(--gantt-container-border-radius, 10px);

Do NOT change any other properties in either file.
  </action>
  <verify>
    <automated>grep -n "gantt-container-border-radius" D:/Projects/gantt-lib/packages/gantt-lib/src/styles.css D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.css</automated>
  </verify>
  <done>
    - styles.css :root contains: --gantt-container-border-radius: 10px;
    - GanttChart.css .gantt-container has: border-radius: var(--gantt-container-border-radius, 10px);
    - No hardcoded "border-radius: 10px" remains in GanttChart.css
  </done>
</task>

</tasks>

<verification>
After the edit, verify both occurrences of the variable name are present:
- styles.css should show line: `--gantt-container-border-radius: 10px;`
- GanttChart.css should show line: `border-radius: var(--gantt-container-border-radius, 10px);`
</verification>

<success_criteria>
Consumer can customize border-radius by setting --gantt-container-border-radius in their own CSS. Default visual appearance is unchanged (10px radius with overflow: hidden).
</success_criteria>

<output>
After completion, create .planning/quick/71-global-style/71-SUMMARY.md with what was changed.
</output>
