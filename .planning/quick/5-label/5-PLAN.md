---
phase: quick
plan: 5
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/TaskRow/TaskRow.tsx
  - src/components/TaskRow/TaskRow.module.css
autonomous: true
requirements:
  - QUICK-05

must_haves:
  truths:
    - "Task name displays inside the task bar without being obscured by date labels"
    - "Start date label appears to the left of the task bar (outside)"
    - "End date label appears to the right of the task bar (outside)"
    - "Date labels remain visible during drag operations (real-time updates)"
  artifacts:
    - path: "src/components/TaskRow/TaskRow.tsx"
      provides: "Task bar with date labels positioned outside"
      contains: "taskContainer with dateLabelLeft, taskBar, dateLabelRight as siblings"
    - path: "src/components/TaskRow/TaskRow.module.css"
      provides: "Styling for external date labels"
      contains: ".dateLabel with proper positioning"
  key_links:
    - from: "src/components/TaskRow/TaskRow.tsx"
      to: "src/components/TaskRow/TaskRow.module.css"
      via: "taskContainer flex layout"
      pattern: "taskContainer.*flex"
---

<objective>
Move date labels outside the task bar so long task names don't get obscured. Start date appears on the left, end date on the right of the task bar.

Purpose: When task names are long, date labels inside the bar cause text overflow or overlap. Moving labels outside ensures task names are always readable and dates remain visible.

Output: Date labels positioned outside the task bar as siblings (not children) of the taskBar element.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/3-25-03/3-SUMMARY.md
@src/components/TaskRow/TaskRow.tsx
@src/components/TaskRow/TaskRow.module.css
</context>

<tasks>

<task type="auto">
  <name>Move date labels outside task bar in TaskRow component</name>
  <files>src/components/TaskRow/TaskRow.tsx</files>
  <action>
Update the JSX return statement in TaskRow component to move date labels outside the task bar.

Current structure (labels INSIDE taskBar):
```tsx
<div className={styles.taskContainer}>
  <div className={styles.taskBar} ...>
    <span className={styles.dateLabelLeft}>{startDateLabel}</span>
    <div className={styles.resizeHandleLeft} />
    <span className={styles.taskName}>{task.name}</span>
    <div className={styles.resizeHandleRight} />
    <span className={styles.dateLabelRight}>{endDateLabel}</span>
  </div>
</div>
```

New structure (labels OUTSIDE taskBar, as siblings in taskContainer):
```tsx
<div className={styles.taskContainer}>
  <span className={`${styles.dateLabel} ${styles.dateLabelLeft}`}>
    {startDateLabel}
  </span>
  <div
    className={`${styles.taskBar} ${isDragging ? styles.dragging : ''}`}
    style={{
      left: `${displayLeft}px`,
      width: `${displayWidth}px`,
      backgroundColor: barColor,
      height: 'var(--gantt-task-bar-height)',
      cursor: dragHandleProps.style.cursor,
      userSelect: dragHandleProps.style.userSelect,
    }}
    onMouseDown={dragHandleProps.onMouseDown}
  >
    <div className={`${styles.resizeHandle} ${styles.resizeHandleLeft}`} />
    <span className={styles.taskName}>{task.name}</span>
    <div className={`${styles.resizeHandle} ${styles.resizeHandleRight}`} />
  </div>
  <span className={`${styles.dateLabel} ${styles.dateLabelRight}`}>
    {endDateLabel}
  </span>
</div>
```

Changes:
1. Move dateLabelLeft span outside, before taskBar div
2. Move dateLabelRight span outside, after taskBar div
3. Remove date labels from inside taskBar
4. Keep resize handles and taskName inside taskBar

This ensures:
- Task name has full width available inside the bar
- Date labels never overlap with task name
- Labels remain visible during drag (currentStartDate/currentEndDate still update correctly)
  </action>
  <verify>
TypeScript compilation: npx tsc --noEmit
  </verify>
  <done>
Date labels are siblings of taskBar (not children)
Left date label appears before taskBar in JSX
Right date label appears after taskBar in JSX
Task name is the only text content inside taskBar (besides resize handles)
  </done>
</task>

<task type="auto">
  <name>Update CSS for external date label positioning</name>
  <files>src/components/TaskRow/TaskRow.module.css</files>
  <action>
The date label styles are already mostly correct from quick-03. Verify and adjust if needed:

Current styles (should be kept as-is):
```css
.taskContainer {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
}

.dateLabel {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  color: #666;
  white-space: nowrap;
  pointer-events: none;
}

.dateLabelLeft {
  right: 100%;
  margin-right: 4px;
}

.dateLabelRight {
  left: 100%;
  margin-left: 4px;
}
```

These styles work correctly for labels outside the task bar:
- position: absolute with top: 50% and transform centers labels vertically
- dateLabelLeft uses right: 100% to position to the left of the task bar
- dateLabelRight uses left: 100% to position to the right of the task bar
- pointer-events: none ensures labels don't interfere with drag/resize

If the current styles match the above, no changes needed. If different, update to match.
  </action>
  <verify>
CSS has .dateLabel with position: absolute
CSS has .dateLabelLeft with right: 100% and margin-right: 4px
CSS has .dateLabelRight with left: 100% and margin-left: 4px
  </verify>
  <done>
Date labels positioned absolutely relative to taskContainer
Left label positioned to left of task bar
Right label positioned to right of task bar
4px margin separates labels from task bar
  </done>
</task>

</tasks>

<verification>
Overall verification steps after completing all tasks:

1. TypeScript check: npx tsc --noEmit (no errors)

2. Visual verification:
   - Create a task with a very long name (e.g., "This is a very long task name that would normally overflow")
   - Verify the task name is fully visible inside the bar
   - Verify start date appears to the left of the bar
   - Verify end date appears to the right of the bar
   - Drag the task and verify dates update in real-time

3. Edge cases:
   - Single-day task: both dates should be visible (left shows start, right shows end)
   - Task at edge of viewport: labels should not cause horizontal scroll issues
   - Very short task (1-2 days): labels should be visible but not overlapping
</verification>

<success_criteria>
- Date labels are siblings of taskBar in DOM structure
- Task names display fully inside task bar without date label interference
- Start date label appears to left of task bar with 4px margin
- End date label appears to right of task bar with 4px margin
- Labels update in real-time during drag operations
- TypeScript compilation succeeds with no errors
- All existing functionality preserved (drag, resize, hover states)
</success_criteria>

<output>
After completion, create `.planning/quick/5-label/5-SUMMARY.md`
</output>
