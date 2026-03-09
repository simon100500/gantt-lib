---
phase: quick-081
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: ["packages/gantt-lib/src/utils/geometry.ts"]
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "First month in calendar grid has no separator line at the left edge"
    - "All other month separators still appear correctly"
    - "Week and day separators remain unchanged"
  artifacts:
    - path: "packages/gantt-lib/src/utils/geometry.ts"
      provides: "calculateGridLines function with first month separator fix"
      contains: "first date check to skip month separator at x=0"
  key_links:
    - from: "packages/gantt-lib/src/components/GridBackground/GridBackground.tsx"
      to: "packages/gantt-lib/src/utils/geometry.ts"
      via: "calculateGridLines function call"
      pattern: "calculateGridLines\\(dateRange, dayWidth\\)"
---

<objective>
Remove the month separator line at the left edge of the calendar grid (first month)

Purpose: The first month should not have a separator line at position x=0 since it's the start of the visible range, not a transition between months.
Output: Modified calculateGridLines function that skips month separator for the first date in the range
</objective>

<execution_context>
@D:/Projects/gantt-lib/.claude/get-shit-done/workflows/execute-plan.md
@D:/Projects/gantt-lib/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Key implementation detail
The calculateGridLines function in geometry.ts currently marks ANY date with getUTCDate() === 1 as isMonthStart.
When the first date in dateRange is the 1st of a month, it creates an unwanted separator at x=0.
Solution: Skip the isMonthStart flag for the first date (index 0) in the range.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Skip month separator for first date in calculateGridLines</name>
  <files>packages/gantt-lib/src/utils/geometry.ts</files>
  <action>
    In the calculateGridLines function (line 129-154):
    1. For the first date in the range (i === 0), set isMonthStart to false regardless of the actual date
    2. Keep the existing isMonthStart logic for all other dates (i > 0)
    3. This ensures no separator appears at x=0 (left edge) while preserving all other month separators

    Modify the loop to check if i === 0 before setting isMonthStart:
    ```typescript
    const isMonthStart = i === 0 ? false : date.getUTCDate() === 1;
    ```
  </action>
  <verify>
    <automated>npm test -- geometry.test</automated>
  </verify>
  <done>First month has no separator at left edge, all other separators visible</done>
</task>

</tasks>

<verification>
- View the calendar grid in the demo app
- Confirm no thick line at the left edge of the first month
- Confirm month separators still appear between different months
- Confirm week and day separators are unchanged
</verification>

<success_criteria>
- No month separator at position x=0
- All other month separators (between months) still render correctly
- No changes to week or day separators
- Tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/081-remove-first-month-separator/081-01-SUMMARY.md`
</output>
