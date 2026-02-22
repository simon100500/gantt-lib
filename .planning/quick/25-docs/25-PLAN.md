---
phase: quick-25
plan: 25
type: execute
wave: 1
depends_on: []
files_modified:
  - docs/REFERENCE.md
autonomous: true
requirements:
  - DOCS-01
must_haves:
  truths:
    - "AI agent can read the documentation and understand the full public API without reading source code"
    - "Every GanttChart prop is documented with type, default value, and effect"
    - "Every Task interface field is documented with type, constraints, and effect"
    - "All 4 dependency link types (FS, SS, FF, SF) are explained with semantics and lag behavior"
    - "Installation, CSS import, and minimal working example are included"
    - "CSS variable customization list is complete and accurate"
  artifacts:
    - path: "docs/REFERENCE.md"
      provides: "Complete library API reference for AI agents and human developers"
      min_lines: 300
  key_links:
    - from: "docs/REFERENCE.md"
      to: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      via: "GanttChartProps interface docs match source"
      pattern: "GanttChartProps"
    - from: "docs/REFERENCE.md"
      to: "packages/gantt-lib/src/types/index.ts"
      via: "Task interface docs match source"
      pattern: "Task"
---

<objective>
Create comprehensive API reference documentation in docs/REFERENCE.md, structured for AI agent consumption.

Purpose: Developers (human or AI) should be able to use gantt-lib correctly by reading this one file, without needing to inspect source code.
Output: docs/REFERENCE.md — structured reference covering installation, all public types, all props, dependency semantics, CSS variables, and usage patterns.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
@packages/gantt-lib/src/types/index.ts
@packages/gantt-lib/src/hooks/useTaskDrag.ts
@README.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write docs/REFERENCE.md — complete AI-structured API reference</name>
  <files>docs/REFERENCE.md</files>
  <action>
Create docs/REFERENCE.md as a comprehensive reference document. Structure it for AI agent readers: use unambiguous headings, avoid prose where a table suffices, and annotate every default, constraint, and edge case explicitly.

Document the following sections in this order:

## 1. Package Identity
- Package name: gantt-lib
- Version: 0.0.8
- NPM install: `npm install gantt-lib`
- Peer deps: react >=18, react-dom >=18
- CSS import (REQUIRED, must be separate import line): `import 'gantt-lib/styles.css'`
- Entrypoint: `import { GanttChart, type Task, type TaskDependency } from 'gantt-lib'`

## 2. Minimal Working Example
Provide a complete, copy-paste-ready TSX snippet using useState. Include the CSS import. Show tasks array with at least 2 tasks using ISO date strings. Show onChange handler.

## 3. Task Interface
Document all fields of the Task interface as a table:

| Field | Type | Required | Default | Constraints & Notes |
|---|---|---|---|---|
| id | string | yes | — | Must be unique across all tasks |
| name | string | yes | — | Displayed on the task bar |
| startDate | string \| Date | yes | — | ISO string ('2026-02-01') or Date. All arithmetic is UTC. Prefer ISO strings. |
| endDate | string \| Date | yes | — | Same as startDate. endDate is inclusive (a task on a single day has startDate === endDate). |
| color | string | no | '#3b82f6' | Any CSS color. Applied to task bar background. |
| progress | number | no | undefined | 0–100. Decimal values rounded for display. 0 or undefined = no bar shown. Progress is visual-only. |
| accepted | boolean | no | undefined | Only meaningful when progress === 100. true = green bar. false/undefined at 100% = yellow bar. |
| dependencies | TaskDependency[] | no | undefined | Array of predecessor links. See Dependency section. |

## 4. TaskDependency Interface
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| taskId | string | yes | — | ID of the predecessor task |
| type | 'FS' \| 'SS' \| 'FF' \| 'SF' | yes | — | Link type. See Dependency Types section. |
| lag | number | no | 0 | Days. Positive = delay, negative = overlap. Lag is updated automatically after drag. |

## 5. Dependency Types — Semantics
Document each of the 4 link types with:
- Full name
- Rule (when predecessor does X, successor must do Y)
- Lag formula (how lag is calculated after drag)
- Constraint direction (which edge of successor is constrained)
- Example

FS — Finish-to-Start
  Rule: successor.startDate >= predecessor.endDate + lag
  Lag: lag = startB - endA (can be negative, meaning overlap)
  Constraint: left edge (startDate) of successor
  Example: { taskId: 'A', type: 'FS', lag: 0 } — B starts on or after A ends

SS — Start-to-Start
  Rule: successor.startDate >= predecessor.startDate + lag; lag always >= 0
  Lag: lag = startB - startA (floored at 0; SS lag cannot be negative)
  Constraint: left edge (startDate) of successor
  Example: { taskId: 'A', type: 'SS', lag: 2 } — B starts at least 2 days after A starts

FF — Finish-to-Finish
  Rule: successor.endDate >= predecessor.endDate + lag (lag can be negative)
  Lag: lag = endB - endA (can be negative)
  Constraint: right edge (endDate) of successor
  Example: { taskId: 'A', type: 'FF', lag: -1 } — B ends 1 day before A ends

SF — Start-to-Finish
  Rule: successor.endDate <= predecessor.startDate + lag; lag always <= 0
  Lag: lag = endB - startA + 1day (ceiling at 0; SF lag cannot be positive)
  Constraint: right edge (endDate) of successor — B must finish before A starts
  Example: { taskId: 'A', type: 'SF', lag: 0 } — B ends adjacent to or before A starts

Note on cascade behavior: When enableAutoSchedule=true and a predecessor is dragged, all successor tasks shift automatically to maintain their constraints. Dependency line arrows redraw in real-time during drag.

## 6. GanttChart Props
Document as a table:

| Prop | Type | Default | Description |
|---|---|---|---|
| tasks | Task[] | required | Array of tasks. Order determines row order (top to bottom). |
| dayWidth | number | 40 | Width of each day column in pixels. Min effective value: 20px. |
| rowHeight | number | 40 | Height of each task row in pixels. |
| headerHeight | number | 40 | Height of the time-scale header in pixels. |
| containerHeight | number | 600 | Container height. Enables vertical scrolling when tasks overflow. |
| onChange | (tasks: Task[] \| ((prev: Task[]) => Task[])) => void | undefined | Called on mouseup after drag/resize. Receives either new array or functional updater. Use useState setter directly: onChange={setTasks}. |
| onValidateDependencies | (result: ValidationResult) => void | undefined | Called when tasks change with dependency validation result. |
| enableAutoSchedule | boolean | false | When true (hard mode): dragging predecessor cascades all successor tasks. Dependency lines redraw in real-time. |
| disableConstraints | boolean | false | When true: drag constraints are skipped (task can be placed freely). Useful for debugging layouts. |
| onCascade | (tasks: Task[]) => void | undefined | Called when a cascade drag completes in hard mode (enableAutoSchedule=true). Receives all shifted tasks including the dragged task. When onCascade fires, onChange does NOT fire for that drag. |

Important: calendar date range is derived automatically from task dates — no month prop required. The chart shows complete months for all tasks. If tasks span March 25 to May 5, it shows March 1 through May 31.

## 7. CSS Variables
Document all CSS custom properties. These can be overridden in any global CSS file:

| Variable | Default | Controls |
|---|---|---|
| --gantt-grid-line-color | #e0e0e0 | Vertical day/week/month separator lines |
| --gantt-cell-background | #ffffff | Default row background |
| --gantt-row-hover-background | #f8f9fa | Row background on mouse hover |
| --gantt-row-height | 40px | Row height (also controlled by rowHeight prop) |
| --gantt-header-height | 40px | Header height (also controlled by headerHeight prop) |
| --gantt-day-width | 40px | Day column width (also controlled by dayWidth prop) |
| --gantt-task-bar-default-color | #3b82f6 | Task bar color when task.color is not set |
| --gantt-task-bar-text-color | #ffffff | Text color on task bars |
| --gantt-task-bar-border-radius | 4px | Task bar corner radius |
| --gantt-task-bar-height | 28px | Task bar height within the row |
| --gantt-progress-color | rgba(0,0,0,0.2) | Progress bar color (in-progress state) |
| --gantt-progress-completed | #fbbf24 | Progress bar color when progress=100 and accepted is falsy |
| --gantt-progress-accepted | #22c55e | Progress bar color when progress=100 and accepted=true |
| --gantt-today-indicator-color | #ef4444 | Today vertical line color |
| --gantt-today-indicator-width | 2px | Today vertical line width |

## 8. Drag Interactions
| User Action | Result |
|---|---|
| Click and drag center of task bar | Move task. Snaps to day boundaries. |
| Click and drag left edge (12px zone) | Resize task start date. Snaps to day boundaries. |
| Click and drag right edge (12px zone) | Resize task end date. Snaps to day boundaries. |
| Click and drag empty grid area | Pan (scroll) the chart horizontally and vertically. |

Edge zone priority: resize has priority over move when cursor is within 12px of either edge.
Drag tooltip: start and end dates shown during drag.
onChange fires once on mouseup (not during drag). This prevents re-render storms with 100+ tasks.

## 9. ValidationResult Type
Used by onValidateDependencies prop.

interface ValidationResult {
  isValid: boolean;            // false if any errors
  errors: DependencyError[];   // empty when isValid=true
}

interface DependencyError {
  type: 'cycle' | 'constraint' | 'missing-task';
  taskId: string;              // task with the problem
  message: string;             // human-readable
  relatedTaskIds?: string[];   // related task IDs (cycle path, etc.)
}

## 10. Date Handling Rules
- Always use ISO strings ('YYYY-MM-DD') for task dates — avoids timezone issues.
- All internal calculations are UTC. Passing local Date objects can cause off-by-one errors.
- endDate is inclusive: a task from '2026-02-01' to '2026-02-01' occupies exactly 1 day column.
- After drag, dates in onChange callback are always ISO UTC strings.

## 11. onChange Pattern — Correct Usage

The onChange prop accepts a functional updater pattern. Always use:

```tsx
// CORRECT: direct setter (React handles merging)
<GanttChart tasks={tasks} onChange={setTasks} />

// CORRECT: manual functional updater
<GanttChart
  tasks={tasks}
  onChange={(update) => {
    setTasks(prev => typeof update === 'function' ? update(prev) : update);
  }}
/>

// WRONG: reading from tasks closure (stale closure bug with fast consecutive drags)
onChange={(newTasks) => setTasks(newTasks)} // may overwrite a concurrent drag
```

## 12. enableAutoSchedule vs onCascade
- enableAutoSchedule=false (default): tasks move independently, dependency lines are visual only.
- enableAutoSchedule=true + onCascade provided: cascade mode. Predecessors drag successors. onChange is NOT called for cascaded drags — use onCascade instead.
- enableAutoSchedule=true + no onCascade: soft mode. On drag end, updatedDependencies with new lag values are returned via onChange.

## 13. AI Agent Usage Notes
When generating task arrays for this library:
- id must be a unique string (use string numbers '1', '2', ... or UUIDs)
- Dependencies are defined on the successor (the task that depends on another), not on the predecessor
- taskId in dependencies points to the predecessor
- Date format: 'YYYY-MM-DD' ISO strings are safest
- Do not set lag manually after construction — the library recalculates lag on each drag completion
- When onCascade is used, update the tasks state from onCascade, not from onChange (they are mutually exclusive per drag)
  </action>
  <verify>
    1. File exists at docs/REFERENCE.md
    2. File has at least 300 lines
    3. All 4 dependency types (FS, SS, FF, SF) are present in the file
    4. All GanttChart props from GanttChartProps interface appear in the file
    5. CSS variables table contains at least 10 entries
  </verify>
  <done>
    docs/REFERENCE.md exists, covers full public API surface (Task, TaskDependency, GanttChartProps, CSS variables, dependency semantics), and is structured for AI agent consumption with tables for every type/prop.
  </done>
</task>

</tasks>

<verification>
After task completes:
- Read docs/REFERENCE.md and confirm all GanttChartProps are documented (tasks, dayWidth, rowHeight, headerHeight, containerHeight, onChange, onValidateDependencies, enableAutoSchedule, disableConstraints, onCascade)
- Confirm all 4 link types (FS, SS, FF, SF) have lag formula documented
- Confirm CSS import instruction is present
</verification>

<success_criteria>
docs/REFERENCE.md exists and contains complete, accurate, AI-readable API documentation for gantt-lib v0.0.8. An AI agent given only this file can generate correct usage code without inspecting source files.
</success_criteria>

<output>
After completion, create .planning/quick/25-docs/25-SUMMARY.md
</output>
