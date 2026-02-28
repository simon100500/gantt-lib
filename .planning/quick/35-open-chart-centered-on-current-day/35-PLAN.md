---
phase: 35-open-chart-centered-on-current-day
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: ["packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"]
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "Chart opens centered on current day"
    - "Today is visible in the middle of the viewport on initial load"
    - "Centering only happens on mount, not on re-renders"
  artifacts:
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "Gantt chart component with auto-center on today"
      min_lines: 5
  key_links:
    - from: "GanttChart.tsx"
      to: "scrollContainerRef.current.scrollLeft"
      via: "useEffect on mount"
      pattern: "scrollLeft.*dayWidth.*dateRange"
---

<objective>
Add action to center Gantt chart on current day when it opens

Purpose: When users open the Gantt chart, they should see the current day in the middle of the viewport, not the beginning of the date range. This provides immediate temporal context.
Output: GanttChart component scrolls to center today's date on initial mount
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Existing code patterns from GanttChart.tsx:
- scrollContainerRef: useRef<HTMLDivElement>(null) - controls horizontal scroll
- dateRange: useMemo(() => getMultiMonthDays(tasks), [tasks]) - array of Date objects
- monthStart: useMemo(...) - first day of date range
- dayWidth prop: pixels per day column (default 40)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add useEffect to center chart on today on mount</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
Add a useEffect that runs once on mount to scroll the chart so today is centered:

1. After line 180 (after todayInRange useMemo), add new useEffect:
   - Calculate today's offset from date range start using existing utilities
   - Calculate center position: todayOffset * dayWidth - (containerWidth / 2) + (dayWidth / 2)
   - Set scrollContainerRef.current.scrollLeft to calculated position
   - Use empty deps array [] to run only on mount

2. Use getDayOffset(dateRange, monthStart) pattern from existing code:
   - Find today's index in dateRange array: dateRange.findIndex(day => isToday(day))
   - If found (index !== -1), calculate scroll position

3. Get viewport width from scrollContainerRef.current.clientWidth
   - Center formula: scrollLeft = (todayIndex * dayWidth) - (clientWidth / 2) + (dayWidth / 2)

4. Guard against null scrollContainerRef and ensure scrollLeft >= 0

Pattern reference (similar to existing todayInRange logic on line 176):
```typescript
const now = new Date();
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
```
  </action>
  <verify>
Open demo page at http://localhost:3000 and verify:
- The chart opens with today's date visible in the middle of the viewport
- Check console: no errors
- Manually scroll away and refresh - chart recenters on today
  </verify>
  <done>
On initial page load, today's date column is positioned in the center of the visible chart area (not at the left or right edge)
  </done>
</task>

</tasks>

<verification>
- Demo page loads without errors
- Today is centered in viewport on initial load
- Manual scrolling works after initial center
- Re-centering does NOT happen on component re-renders (only on mount)
</verification>

<success_criteria>
Chart opens with current day centered in viewport
</success_criteria>

<output>
After completion, create `.planning/quick/35-open-chart-centered-on-current-day/35-01-SUMMARY.md`
</output>
