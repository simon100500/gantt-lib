---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/TaskRow/TaskRow.tsx
  - src/components/TaskRow/TaskRow.module.css
  - src/utils/dateUtils.ts
autonomous: true
requirements:
  - QUICK-03

must_haves:
  truths:
    - "User can see start date displayed on the left side of the task bar"
    - "User can see end date displayed on the right side of the task bar"
    - "Dates are formatted in DD.MM format (e.g., 25.03 for March 25th)"
  artifacts:
    - path: "src/components/TaskRow/TaskRow.tsx"
      provides: "Task bar with start/end date labels"
      contains: "startDateLabel, endDateLabel"
    - path: "src/components/TaskRow/TaskRow.module.css"
      provides: "Styling for date labels positioned outside task bar"
      contains: ".dateLabel, .dateLabelLeft, .dateLabelRight"
    - path: "src/utils/dateUtils.ts"
      provides: "Date formatting utility for DD.MM format"
      exports: ["formatDateLabel"]
  key_links:
    - from: "src/components/TaskRow/TaskRow.tsx"
      to: "src/utils/dateUtils.ts"
      via: "formatDateLabel function"
      pattern: "formatDateLabel.*parseUTCDate"
---

<objective>
Add date labels (start date on left, end date on right) to task bars in DD.MM format for clear task duration visualization.

Purpose: Improve readability by showing exact dates without needing to reference the calendar header. Users can instantly see when each task starts and ends.

Output: Task bars with date labels positioned outside the bar on left and right sides.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/TaskRow/TaskRow.tsx
@src/components/TaskRow/TaskRow.module.css
@src/utils/dateUtils.ts
</context>

<tasks>

<task type="auto">
  <name>Add date formatting utility</name>
  <files>src/utils/dateUtils.ts</files>
  <action>
Add the following function to src/utils/dateUtils.ts:

```typescript
/**
 * Format date as DD.MM (e.g., 25.03 for March 25th)
 * @param date - Date to format
 * @returns Formatted date string in DD.MM format
 */
export const formatDateLabel = (date: Date | string): string => {
  const parsed = parseUTCDate(date);
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
};
```

This function:
- Takes Date or string input
- Returns date in DD.MM format (e.g., "25.03")
- Uses UTC methods to avoid DST issues
- Pads single digits with leading zeros

DO NOT:
- Use date-fns format() (native implementation is simpler and lighter)
- Add locale support (format is fixed DD.MM)
- Create new utility file
  </action>
  <verify>
TypeScript compilation: npx tsc --noEmit
Import test: import { formatDateLabel } from '@/utils/dateUtils'
  </verify>
  <done>
formatDateLabel function exists and exports correctly
Returns dates in DD.MM format (e.g., "25.03")
Handles both Date and string inputs
  </done>
</task>

<task type="auto">
  <name>Add date labels to TaskRow component and styles</name>
  <files>src/components/TaskRow/TaskRow.tsx src/components/TaskRow/TaskRow.module.css</files>
  <action>
1. **Update src/components/TaskRow/TaskRow.tsx:**

After the existing imports, add:
```typescript
import { formatDateLabel } from '../../utils/dateUtils';
```

Inside the TaskRow component (after displayWidth calculation), add:
```typescript
// Format date labels for display
const startDateLabel = formatDateLabel(taskStartDate);
const endDateLabel = formatDateLabel(taskEndDate);
```

Update the JSX return statement. Replace the existing taskBar div with:

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

2. **Update src/components/TaskRow/TaskRow.module.css:**

Add the following styles at the end:

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
  font-size: 0.75rem;
  color: var(--gantt-task-bar-text-color);
  opacity: 0.7;
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

Implementation details:
- Date labels are positioned absolutely outside the task bar
- Left label shows start date, right label shows end date
- Labels use smaller font (0.75rem) and reduced opacity (0.7)
- Labels don't interfere with mouse interactions (pointer-events: none)
- 4px margin separates labels from the bar

DO NOT:
- Change existing task bar drag/resize behavior
- Add hover effects to date labels
- Make date labels selectable/editable
  </action>
  <verify>
TypeScript compilation: npx tsc --noEmit
Visual test: Check that dates appear on both sides of task bar
  </verify>
  <done>
Start date appears on left side of task bar in DD.MM format
End date appears on right side of task bar in DD.MM format
Labels are positioned outside the bar with 4px margin
Labels don't interfere with drag/resize interactions
Existing task bar functionality unchanged
  </done>
</task>

</tasks>

<verification>
Overall verification steps after completing all tasks:

1. TypeScript check: npx tsc --noEmit (no errors)
2. Visual verification: Run the app and check:
   - Task bars show dates on both sides
   - Format is DD.MM (e.g., 25.03)
   - Labels don't overlap with task bar
   - Drag/resize still works correctly
3. Check different date ranges:
   - Single-day task shows same date on both sides
   - Multi-day task shows correct start/end dates
   - Cross-month tasks show correct dates
</verification>

<success_criteria>
- formatDateLabel utility function returns dates in DD.MM format
- Start date label appears on left side of task bar
- End date label appears on right side of task bar
- Labels use 0.75rem font size with 0.7 opacity
- Labels have 4px margin from task bar
- Labels don't interfere with drag/resize interactions
- TypeScript compilation succeeds with no errors
- All existing functionality preserved
</success_criteria>

<output>
After completion, create `.planning/quick/3-25-03/3-SUMMARY.md`
</output>
