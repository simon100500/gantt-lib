---
phase: 26-props
plan: 26
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: true
requirements: [quick-26]
must_haves:
  truths:
    - "Task can render a horizontal divider line above the row when divider='top'"
    - "Task can render a horizontal divider line below the row when divider='bottom'"
    - "Divider line spans the full grid width (not just task width)"
    - "Divider line is bolder/thicker than regular grid lines"
    - "No divider rendered when divider prop is undefined"
  artifacts:
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "Task interface extended with divider property"
      contains: "divider?: 'top' | 'bottom'"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Divider rendering logic"
      contains: "divider line rendering"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "Divider styling"
      contains: "gantt-tr-divider"
  key_links:
    - from: "TaskRow.tsx"
      to: "Task.divider"
      via: "prop read"
      pattern: "task\\.divider"
    - from: "TaskRow.css"
      to: "TaskRow.tsx"
      via: "CSS class reference"
      pattern: "gantt-tr-divider"
---

<objective>
Add optional horizontal divider line to tasks for visual grouping of task sets.

Purpose: Allow users to visually separate groups of tasks with a bolder horizontal line (similar to month separators) that renders above or below specific tasks.

Output: Tasks with `divider: 'top'` or `divider: 'bottom'` prop render a bold horizontal line spanning the full grid width.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
@packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
@packages/gantt-lib/src/components/TaskRow/TaskRow.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add divider property to Task interface and TaskRow component</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx, packages/gantt-lib/src/components/TaskRow/TaskRow.tsx</files>
  <action>
    In GanttChart.tsx, extend the Task interface with a new optional property:
    - `divider?: 'top' | 'bottom'` - renders a bold horizontal line above or below the task row

    In TaskRow.tsx:
    1. Add `divider` to TaskRowProps interface (optional, typed as `'top' | 'bottom' | undefined`)
    2. Extract `divider` from task prop: `const { divider } = task;`
    3. Add a conditional render for the divider line inside gantt-tr-row, before the gantt-tr-taskContainer div:
       ```tsx
       {divider === 'top' && <div className="gantt-tr-divider gantt-tr-divider-top" />}
       ```
    4. Add another conditional render after gantt-tr-taskContainer (before closing gantt-tr-row):
       ```tsx
       {divider === 'bottom' && <div className="gantt-tr-divider gantt-tr-divider-bottom" />}
       ```

    5. Update the arePropsEqual comparison function to include `prevProps.task.divider === nextProps.task.divider`

    The divider line must be positioned to span the full grid width (using position: absolute with left: 0 and width: 100%).
  </action>
  <verify>
    TypeScript compilation passes: npm run build in packages/gantt-lib
  </verify>
  <done>Task interface includes divider property, TaskRow renders divider line based on divider value</done>
</task>

<task type="auto">
  <name>Task 2: Add divider line CSS styles</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <action>
    Add CSS for the divider line. The line should:
    - Be bolder/thicker than regular grid lines (use 2px or 3px border)
    - Use a distinct color (darker than grid lines, e.g., #999 or #888)
    - Position absolutely within gantt-tr-row to span full width

    Add the following styles:
    ```css
    .gantt-tr-divider {
      position: absolute;
      left: 0;
      width: 100%;
      height: 0;
      border-top: 2px solid #888;
      pointer-events: none;
      z-index: 5;
    }

    .gantt-tr-divider-top {
      top: 0;
    }

    .gantt-tr-divider-bottom {
      bottom: 0;
    }
    ```

    Make the line significantly more visible than the standard 1px grid lines (border-bottom: 1px solid var(--gantt-grid-line-color) on .gantt-tr-row).
  </action>
  <verify>grep -n "gantt-tr-divider" packages/gantt-lib/src/components/TaskRow/TaskRow.css</verify>
  <done>Divider line renders as a bold horizontal line spanning full grid width above or below the task row</done>
</task>

</tasks>

<verification>
1. TypeScript compilation succeeds
2. Divider line appears above task when `divider: 'top'`
3. Divider line appears below task when `divider: 'bottom'`
4. No divider when prop is undefined
5. Line spans full grid width
6. Line is thicker than regular grid lines
</verification>

<success_criteria>
- Tasks can have `divider: 'top'` | `'bottom'` property
- Divider renders as bold horizontal line spanning full grid width
- No visual artifacts or layout shifts
</success_criteria>

<output>
After completion, create `.planning/quick/26-props/26-SUMMARY.md`
</output>
