---
phase: quick-73
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/ui/Calendar.tsx
  - packages/gantt-lib/src/components/ui/ui.css
autonomous: true
requirements: [QUICK-73]

must_haves:
  truths:
    - "User can quickly navigate calendar using buttons: -7, -1, Today, +1, +7"
    - "Buttons are positioned at the bottom of the calendar component"
    - "Clicking -7/-1 moves selection back by 7/1 days"
    - "Clicking +1/+7 moves selection forward by 1/7 days"
    - "Clicking 'Today' selects today's date"
  artifacts:
    - path: "packages/gantt-lib/src/components/ui/Calendar.tsx"
      provides: "Calendar component with navigation buttons"
      exports: ["Calendar"]
    - path: "packages/gantt-lib/src/components/ui/ui.css"
      provides: "CSS styles for navigation button bar"
      contains: "gantt-cal-nav"
  key_links:
    - from: "Calendar.tsx navigation buttons"
      to: "onSelect callback"
      via: "date-fns addDays/subDays functions"
      pattern: "addDays|subDays"
---

<objective>
Add quick navigation buttons (-7, -1, Today, +1, +7) to the bottom of the Calendar component for fast date selection. This enables users to quickly shift dates by common intervals without manual navigation.

Purpose: Improve UX for date selection by providing quick shortcuts for common date adjustments (week/day navigation, return to today).
Output: Calendar component with button bar at bottom, styled consistently with existing UI.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@D:/Projects/gantt-lib/.planning/STATE.md

Key facts from codebase:
- Calendar component is at packages/gantt-lib/src/components/ui/Calendar.tsx
- Uses date-fns for date utilities (already imported: addDays, subDays available)
- CSS convention: gantt- prefix for all classes
- Existing UI button styles in ui.css (.gantt-btn, .gantt-btn-sm)
- Calendar has onSelect callback for date selection
- Current structure: scrollRef container with renderedMonths

Current Calendar.tsx structure (relevant parts):
```typescript
export const Calendar: React.FC<CalendarProps> = ({
  selected,
  onSelect,
  initialDate,
  mode = 'single',
  disabled = false,
}) => {
  // ... months state, scroll handlers ...

  return (
    <div ref={scrollRef} className="gantt-cal-container">
      {renderedMonths}
    </div>
  );
};
```

Needed imports from date-fns:
- addDays — already imported
- subDays — already imported
- isToday — already imported
- format — already imported
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add navigation button bar to Calendar component</name>
  <files>
    packages/gantt-lib/src/components/ui/Calendar.tsx
    packages/gantt-lib/src/components/ui/ui.css
  </files>
  <action>
Two files to modify:

1. In packages/gantt-lib/src/components/ui/Calendar.tsx:
   - Add imports if missing: addDays, subDays from date-fns (check existing imports)
   - Create helper function to shift date by days: handleDayShift(deltaDays: number)
   - Add button bar div below renderedMonths with className="gantt-cal-nav"
   - Render 5 buttons: "-7", "-1", "Сегодня", "+1", "+7"
   - Wire click handlers to call onSelect with shifted date
   - Use today's date when no selection exists for +/- buttons
   - "Сегодня" button always selects today's date

Structure:
```jsx
<div ref={scrollRef} className="gantt-cal-container">
  {renderedMonths}
  <div className="gantt-cal-nav">
    <button type="button" className="gantt-btn gantt-btn-sm" onClick={() => handleDayShift(-7)}>-7</button>
    <button type="button" className="gantt-btn gantt-btn-sm" onClick={() => handleDayShift(-1)}>-1</button>
    <button type="button" className="gantt-btn gantt-btn-sm" onClick={() => handleToday()}>Сегодня</button>
    <button type="button" className="gantt-btn gantt-btn-sm" onClick={() => handleDayShift(1)}>+1</button>
    <button type="button" className="gantt-btn gantt-btn-sm" onClick={() => handleDayShift(7)}>+7</button>
  </div>
</div>
```

2. In packages/gantt-lib/src/components/ui/ui.css (add after .gantt-day-btn section):
```css
/* =========================================================
 * Calendar navigation buttons
 * ========================================================= */

.gantt-cal-nav {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-top: 1px solid var(--gantt-input-border);
  margin-top: 4px;
}

.gantt-cal-nav .gantt-btn {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  padding: 0 8px;
}
```
  </action>
  <verify>
    <automated>grep -n "gantt-cal-nav" D:/Projects/gantt-lib/packages/gantt-lib/src/components/ui/Calendar.tsx D:/Projects/gantt-lib/packages/gantt-lib/src/components/ui/ui.css</automated>
  </verify>
  <done>
    - Calendar.tsx has navigation button bar with 5 buttons
    - Buttons use gantt-btn gantt-btn-sm classes
    - CSS has .gantt-cal-nav styling with flex layout
    - Click handlers properly shift dates using addDays/subDays
  </done>
</task>

</tasks>

<verification>
After implementation:
1. Calendar shows 5-button bar at bottom: -7, -1, Сегодня, +1, +7
2. Clicking +/- buttons shifts selected date (or today if no selection)
3. Clicking "Сегодня" always selects today's date
4. Visual layout: buttons evenly spaced, full width of container
5. Border separates button bar from calendar grid above
</verification>

<success_criteria>
Users can quickly navigate dates using the button bar. Each button click triggers onSelect with the new date. Visual appearance matches existing gantt-lib button styles.
</success_criteria>

<output>
After completion, create .planning/quick/73-7-1-1-7/73-SUMMARY.md with implementation details.
</output>
