---
phase: quick-37
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/components/GanttChart/GanttChart.css
autonomous: true
requirements:
  - QUICK-36
user_setup: []

must_haves:
  truths:
    - "User can see a 'Today' button in the chart header area"
    - "Clicking the button scrolls the chart to center on today's date"
    - "Button is visually distinct and accessible"
  artifacts:
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "GanttChart with Today button and scrollToToday handler"
      min_lines: 10
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.css"
      provides: "CSS styling for Today button positioning"
      min_lines: 10
  key_links:
    - from: "GanttChart.tsx"
      to: "scrollContainerRef.current.scrollLeft"
      via: "handleScrollToToday callback"
      pattern: "scrollLeft.*todayOffset"
---

<objective>
Add a "Today" button to the Gantt chart that allows users to quickly return to today's date

Purpose: Improve UX by providing quick navigation back to the current day after scrolling through the timeline
Output: A styled button in the chart header that centers the view on today when clicked
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@d/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
@d/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.css
@d/Projects/gantt-lib/packages/gantt-lib/src/components/ui/Button.tsx

# Key Interfaces

From GanttChart.tsx:
- Component has existing scroll centering logic on mount (lines 182-199)
- Uses scrollContainerRef to access scroll container
- dateRange array contains all visible days
- dayWidth prop defines column width
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add scrollToToday handler and Today button to GanttChart</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
    1. Import Button component from '../ui/Button'
    2. Create handleScrollToToday callback using useCallback that:
       - Gets today's date (UTC)
       - Finds today's index in dateRange
       - Calculates scroll position to center today: (todayIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2)
       - Sets scrollContainerRef.current.scrollLeft
    3. Add Button element positioned absolutely or fixed in the chart area:
       - Text: "Today" (or localized to "Сегодня" since project uses Russian)
       - variant="default" or variant="outline"
       - size="sm"
       - onClick handler
    4. Place button in a fixed position overlay (bottom-right or top-right corner of chart)
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>GanttChart has Today button that centers view on current day when clicked</done>
</task>

<task type="auto">
  <name>Task 2: Add CSS styles for Today button positioning</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.css</files>
  <action>
    Add styles for Today button container:
    1. Create .gantt-today-button class with:
       - position: fixed or absolute
       - bottom: 20px or top (consistent location)
       - right: 20px (or inline with header)
       - z-index: 15 (above grid, below drag guides which are z-index 20)
       - box-shadow for visibility
    2. Consider responsive design - ensure button doesn't overlap with content on mobile
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>Today button is properly positioned and styled</done>
</task>

</tasks>

<verification>
- Clicking "Today" button scrolls chart to center current day
- Button remains visible during scroll
- Button is keyboard accessible (focusable, Enter key activates)
- Button has hover/focus states
</verification>

<success_criteria>
- Today button visible in chart UI
- Button click scrolls chart to center today's date
- No console errors or TypeScript build errors
- Visual design matches existing gantt-lib UI patterns
</success_criteria>

<output>
After completion, create `.planning/quick/37-creating-quick-task-36-today/37-01-SUMMARY.md`
</output>
