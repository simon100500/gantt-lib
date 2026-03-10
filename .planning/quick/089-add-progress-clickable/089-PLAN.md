---
phase: quick-089-add-progress-clickable
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "User can see progress percentage in a new column"
    - "User can click on progress value to edit it inline"
    - "Progress changes are saved to task object"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Progress cell with inline editing"
      min_lines: 50
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "Progress column header"
      exports: ["Progress header cell"]
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Progress cell styling"
      contains: ".gantt-tl-cell-progress"
  key_links:
    - from: "TaskListRow.tsx"
      to: "onTaskChange"
      via: "handleProgressChange callback"
      pattern: "onTaskChange.*progress"
    - from: "TaskList.css"
      to: "TaskListRow.tsx"
      via: "gantt-tl-cell-progress class"
      pattern: "gantt-tl-cell-progress"
---

<objective>
Add a clickable "Progress" column to the task list that displays progress percentage and allows inline editing on click.

Purpose: Enable users to quickly update task progress directly from the task list without needing to edit the full task object.
Output: New progress column with inline editing capability, similar to the existing name column editing pattern.
</objective>

<execution_context>
@D:/Проекты/gantt-lib/.planning/quick/089-add-progress-clickable

@D:/Проекты/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Проекты/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.tsx
@D:/Проекты/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css
@D:/Проекты/gantt-lib/packages/gantt-lib/src/types/index.ts
</execution_context>

<context>
From TaskListRow.tsx:
- Existing inline editing pattern for name column (useState for editingName, nameInputRef, nameValue)
- Uses Input component from ui/Input for overlay editing
- onSave/onKeyDown handlers for Enter/Esc key handling
- editTriggerRef tracking different edit modes ('keypress', 'doubleclick', 'autoedit')

From TaskList.tsx:
- Header row structure: №, Имя, Начало, Окончание, Связи
- taskListWidth default: 472px (will need to increase for new column)

From TaskList.css:
- Column widths: number (40px), date (68px), deps (90px)
- Name uses flex: 1 with min-width: 150px
- Cell padding: 0 0.5rem, font-size: 0.85rem

From types/index.ts:
- Task.progress is optional number (0-100)
- Comment says "Progress is visual-only, no user interaction" — this plan adds interaction

</context>

<tasks>

<task type="auto">
  <name>Task 1: Add progress column header and cell structure</name>
  <files>
    packages/gantt-lib/src/components/TaskList/TaskList.tsx,
    packages/gantt-lib/src/components/TaskList/TaskListRow.tsx,
    packages/gantt-lib/src/components/TaskList/TaskList.css
  </files>
  <action>
    1. In TaskList.tsx header row (after line 316): Add progress header cell
       ```tsx
       <div className="gantt-tl-headerCell gantt-tl-cell-progress">Прогресс</div>
       ```

    2. In TaskList.tsx: Increase default taskListWidth from 472 to 542 (add 70px for progress column)

    3. In TaskListRow.tsx dependencies cell (after line 597): Add progress cell
       - Display progress as "X%" format (e.g., "50%")
       - Show "0%" if progress is undefined/null
       - Use the same inline editing pattern as name column
       - Click to enter edit mode
       - Use Input component for editing (number type, min 0, max 100)
       - Full-cell click target like name column

    4. In TaskListRow.tsx: Add progress editing state
       - editingProgress state (bool)
       - progressValue state (number)
       - progressInputRef (useRef)
       - handleProgressClick, handleProgressSave, handleProgressKeyDown handlers
       - Validate input: clamp to 0-100 range
       - Save via onTaskChange({ ...task, progress: newValue })

    5. In TaskList.css: Add progress cell styling
       ```css
       .gantt-tl-cell-progress {
         width: 70px;
         flex-shrink: 0;
         justify-content: center;
         cursor: pointer;
       }

       .gantt-tl-progress-input {
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: 100%;
         border-width: 2px;
         border-color: #3b82f6;
         text-align: center;
         font-size: 0.85rem;
       }
       ```
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm run build 2>&1 | head -50</automated>
  </verify>
  <done>
    - Progress column visible in task list header
    - Progress values display as "X%" format
    - Click on progress cell activates inline editing
    - Input field shows current progress value
    - Enter key saves changes, Esc cancels
    - Values are clamped to 0-100 range
    - Task list width increased to accommodate new column
  </done>
</task>

</tasks>

<verification>
- Progress column appears between "Окончание" and "Связи" columns
- Clicking a progress value shows input field centered in cell
- Typing a number and pressing Enter updates the progress
- Progress bar on the task chart updates to reflect new value
- Invalid values (negative, >100) are clamped to valid range
- Column width is sufficient for "100%" text display
- Tab navigation works between progress cells
</verification>

<success_criteria>
- Progress column displays percentage values for all tasks
- Single click activates inline editing mode
- Input validation ensures 0-100 range
- Changes persist via onTaskChange callback
- Visual feedback matches existing task list editing patterns
- No layout shift or overflow issues with new column
</success_criteria>

<output>
After completion, create `.planning/quick/089-add-progress-clickable/089-01-SUMMARY.md`
</output>
