---
status: resolved
trigger: "Today indicator vertical line doesn't appear on re-render when today's date is scrolled off-screen"
created: 2026-02-28T00:00:00.000Z
updated: 2026-02-28T00:00:06.000Z
---

## Current Focus
hypothesis: FIX APPLIED - Removed the isInMonth check from TodayIndicator. The component now always calculates the position, and GanttChart's todayInRange check controls visibility.
test: Run existing tests to verify no regressions, then create a test to verify today indicator renders correctly when today is in a different month than monthStart.
expecting: All tests pass, and today indicator renders for any date within the dateRange, not just the first month.
next_action: Run tests to verify the fix works correctly.

## Symptoms
expected: The vertical "today" line should always render correctly, even when the current date is outside the visible viewport. When scrolling to bring today into view, the line should appear.
actual: When today's date is outside the visible viewport and a re-render occurs, the today line does not appear even when scrolling back to today's position.
errors: No error messages - visual rendering issue only
reproduction:
1. Open Gantt chart with data spanning multiple months
2. Scroll horizontally so today's date is outside the visible viewport
3. Trigger a re-render (e.g., through state change, drag operation, or data update)
4. Scroll back to today's date - the vertical line is missing
started: User discovered this issue during recent testing

## Eliminated

## Evidence
- timestamp: 2026-02-28T00:00:00.000Z
  checked: TodayIndicator.tsx component logic
  found: The component checks `isInMonth` by comparing today's date with `monthStart` (lines 30-35). If today is not in the same month as monthStart, it returns null (line 45-47).
  implication: The today line only renders when today is in the same month as monthStart, regardless of whether today is in the visible dateRange.

- timestamp: 2026-02-28T00:00:01.000Z
  checked: GanttChart.tsx monthStart calculation (lines 167-173)
  found: `monthStart` is calculated as the first day of the first month in the dateRange: `new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), 1))`
  implication: monthStart is ALWAYS the first day of the overall dateRange, not the month containing today. This means TodayIndicator only renders when today is in the first month of the dateRange.

- timestamp: 2026-02-28T00:00:02.000Z
  checked: GanttChart.tsx todayInRange check (lines 176-180)
  found: There's already a `todayInRange` check that correctly determines if today is in the dateRange, but this is only used to conditionally render TodayIndicator (line 446). The TodayIndicator component itself does its own redundant and incorrect month check.
  implication: The bug is in the TodayIndicator component's isInMonth logic, not the conditional rendering in GanttChart.

- timestamp: 2026-02-28T00:00:05.000Z
  checked: Fixed TodayIndicator component behavior
  found: Verified that the fix correctly calculates position (2320px for Feb 28 when monthStart is Jan 1). The todayInRange check in GanttChart properly gates rendering.
  implication: The today indicator will now render for any date within the dateRange, not just the first month.

## Resolution
root_cause: The TodayIndicator component's `isInMonth` check (lines 30-35) incorrectly limits rendering to only when today is in the same month as `monthStart`. Since `monthStart` is always the first day of the dateRange (not the month containing today), the today indicator only renders when today falls in the first month of the entire date range. This is redundant and incorrect because GanttChart already checks `todayInRange` before rendering TodayIndicator.
fix: Removed the `isInMonth` check from TodayIndicator component. The component now simply calculates the position based on offset from monthStart, allowing the parent GanttChart's `todayInRange` check to control visibility. The position calculation now handles negative offsets (when today is before monthStart) gracefully by only returning null for NaN positions.
verification: User-confirmed fixed. The today indicator now renders correctly when scrolling back to today's position after a re-render, regardless of which month today falls in within the dateRange.
files_changed:
- src/components/TodayIndicator/TodayIndicator.tsx: Removed isInMonth check and simplified position calculation
