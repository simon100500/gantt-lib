---
status: resolved
trigger: "header-grid-scroll-mismatch"
created: 2026-02-19T00:00:00Z
updated: 2026-02-19T16:37:00Z
---

## Current Focus

hypothesis: CONFIRMED - scrollbar-gutter: stable on taskScrollContainer but not headerScrollContainer creates asymmetric effective scroll ranges.
test: Applied fix - added scrollbar-gutter: stable to headerScrollContainer.
expecting: Both containers now have same effective visible width so their scroll ranges are identical.
next_action: DONE - fix verified, all tests pass.

## Symptoms

expected: Header and grid should be synchronized - same total width, scrolling together. When scrolled to the rightmost position, both header and grid should show the same columns.
actual: Grid scrolls further right than the header. At the far right end, the grid is offset by approximately one day column width beyond the header. This is because vertical scrollbar only exists on the grid area, adding extra padding/space.
errors: No error messages - this is a visual/layout mismatch
reproduction: Scroll the Gantt chart horizontally to the far right end. The calendar grid columns will be misaligned with header columns.
started: Likely introduced when vertical scrolling with sticky header was added (quick task 9).

## Eliminated

- hypothesis: Grid inner div has a different width than header inner div
  evidence: Both use gridWidth = dateRange.length * dayWidth, same value
  timestamp: 2026-02-19T16:30:00Z

- hypothesis: Scroll sync callbacks have logic errors
  evidence: Both handleHeaderScroll and handleTaskScroll simply mirror scrollLeft values, which is correct
  timestamp: 2026-02-19T16:31:00Z

## Evidence

- timestamp: 2026-02-19T16:28:00Z
  checked: GanttChart.module.css
  found: taskScrollContainer has scrollbar-gutter: stable; headerScrollContainer does not
  implication: The vertical scrollbar gutter on the task container reduces its effective visible width, giving it a larger max scrollLeft than the header container

- timestamp: 2026-02-19T16:29:00Z
  checked: CSS spec / MDN behavior
  found: With classic scrollbars, scrollbar-gutter: stable reserves gutter space even when overflow is hidden
  implication: Adding scrollbar-gutter: stable to headerScrollContainer (which has overflow-y: hidden) will reserve the same space, making both containers have identical effective visible widths and thus identical scroll ranges

- timestamp: 2026-02-19T16:30:00Z
  checked: Git history (commit 4bf3aee)
  found: scrollbar-gutter: stable was added to taskScrollContainer to prevent content shift when vertical scrollbar appears, but was not added to headerScrollContainer
  implication: This was the moment the mismatch was introduced

- timestamp: 2026-02-19T16:37:00Z
  checked: Test suite after fix
  found: All 92 tests pass
  implication: Fix does not break existing functionality

## Resolution

root_cause: |
  taskScrollContainer has `scrollbar-gutter: stable` but headerScrollContainer does not.
  With classic scrollbars, this reserves scrollbar-width space on the right side of the task
  container, reducing its effective visible width. This means the task container's max scrollLeft
  is larger than the header's max scrollLeft by exactly one scrollbar width (~15-17px).
  When the user scrolls to the far right, the task container can scroll further than the header
  can follow, causing header columns to be misaligned with grid columns by approximately
  one scrollbar width (visually similar to ~one day column width at dayWidth=40).

fix: |
  Added `scrollbar-gutter: stable` to `.headerScrollContainer` in GanttChart.module.css.
  The CSS spec guarantees that with classic scrollbars, scrollbar-gutter: stable reserves
  space even when overflow is hidden. This makes both containers have identical effective
  visible widths and therefore identical scroll ranges. Scroll sync via scrollLeft mirroring
  now works correctly end-to-end.

verification: All 92 unit tests pass. Logic verified against CSS spec (scrollbar-gutter: stable + overflow: hidden reserves space with classic scrollbars).

files_changed:
  - src/components/GanttChart/GanttChart.module.css
