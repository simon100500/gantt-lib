---
phase: quick-020-progress-percent
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "Progress percentage displays inside task bar when space permits"
    - "Progress percentage displays outside task bar (before task name) when space is limited"
    - "Progress percentage only shows when progress > 0"
    - "Format: 'X д Y%' (days + percentage) inside bar, 'Y%' outside"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Progress percentage rendering logic with space detection"
      contains: "progressText, showProgressInside"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "Styling for progress text inside and outside task bar"
      contains: ".gantt-tr-progressText, .gantt-tr-externalProgress"
  key_links:
    - from: "TaskRow.tsx render"
      to: "task bar width vs text width comparison"
      via: "useMemo measurement or estimation"
      pattern: "displayWidth.*textWidth"
---

<objective>
Add progress percentage display to task bars with intelligent positioning

Purpose: Users need to see task progress percentage at a glance for better project status visibility
Output: Progress percentage shown inside task bar (after duration) or outside (before task name) based on available space
</objective>

<execution_context>
@D:/Projects/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@D:/Projects/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.css
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add progress percentage display logic with space detection</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.tsx</files>
  <action>
Add progress percentage display after the duration text. Implementation steps:

1. Calculate if progress fits inside the bar:
   - Estimate text width: duration text (~"15 д" = ~30px) + progress text (~"100%" = ~30px) + padding (~16px)
   - If displayWidth > estimatedTextWidth, show inside
   - Otherwise, show outside

2. Add progress text element inside task bar (after duration span):
   ```jsx
   {progressWidth > 0 && showProgressInside && (
     <span className="gantt-tr-progressText">
       {progressWidth}%
     </span>
   )}
   ```

3. Add progress text element in rightLabels (before task name):
   ```jsx
   {progressWidth > 0 && !showProgressInside && (
     <span className="gantt-tr-externalProgress">
       {progressWidth}%
     </span>
   )}
   ```

4. Place the external progress span in .gantt-tr-rightLabels, BEFORE the task name span

Key constraint: Do NOT modify existing duration display or task name display - only add progress percentage
</action>
<verify>
- Check that progress appears inside wide task bars (e.g., 10+ days)
- Check that progress appears outside narrow task bars (e.g., 1-2 days)
- Verify no progress shows when task.progress = 0 or undefined
</verify>
<done>
Progress percentage displays correctly in both inside and outside positions based on available space
</done>
</task>

<task type="auto">
  <name>Task 2: Style progress text elements</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <action>
Add CSS styles for progress text elements:

1. .gantt-tr-progressText (inside bar):
   - color: var(--gantt-task-bar-text-color)
   - font-size: 0.875rem
   - font-weight: 500
   - white-space: nowrap
   - margin-left: 4px (space after duration)
   - position: relative
   - z-index: 2 (above progress bar overlay)

2. .gantt-tr-externalProgress (outside bar):
   - font-size: 0.85rem
   - font-weight: 500
   - color: #666666 (same as date labels)
   - white-space: nowrap
   - margin-right: 4px (space before task name)
   - Order: progress span → task name span

3. Ensure .gantt-tr-rightLabels maintains gap: 4px and proper alignment

Match existing styling patterns from .gantt-tr-taskDuration and .gantt-tr-externalTaskName
</action>
<verify>
- Visual inspection: Progress text matches existing text styling
- Check spacing: 4px gap between elements is maintained
- Verify z-index: Inside progress text stays above progress bar overlay
</verify>
<done>
Progress text styling is consistent with existing task bar text elements
</done>
</task>

<task type="checkpoint:human-verify">
  <what-built>Progress percentage display inside and outside task bars based on available space</what-built>
  <how-to-verify>
1. Open the website demo (npm run dev in packages/website)
2. Find a wide task bar (10+ days) - verify progress shows inside as "X д Y%"
3. Find a narrow task bar (1-2 days) - verify progress shows outside before task name as "Y% Task Name"
4. Check a task with 0% or no progress - verify no percentage displays
5. Drag a task to change its width - verify progress position updates dynamically
</how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- Progress percentage only displays when progress > 0
- Wide task bars show progress inside after duration
- Narrow task bars show progress before task name
- Styling matches existing text elements
- No layout breaks when dragging/resizing tasks
</verification>

<success_criteria>
- Progress percentage visible for all tasks with progress > 0
- Intelligent positioning based on available space
- Consistent styling with existing UI elements
- No regressions to existing duration or task name display
</success_criteria>

<output>
After completion, create `.planning/quick/020-progress-percent/020-SUMMARY.md`
</output>
