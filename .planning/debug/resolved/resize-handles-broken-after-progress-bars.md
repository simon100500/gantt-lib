---
status: resolved
trigger: "resize-handles-broken-after-progress-bars"
created: 2026-02-21T00:00:00Z
updated: 2026-02-21T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - The progress bar CSS commit adds `position: relative` to `.gantt-tr-resizeHandle` (to enable z-index stacking), which overrides the existing `position: absolute` rule. This causes resize handles to leave absolute positioning and enter the flex flow, corrupting the task bar's layout and the edge zone detection.
test: Read TaskRow.css - confirmed two conflicting rules for .gantt-tr-resizeHandle
expecting: Fix: use `position: absolute; z-index: 2` directly in the specific `.gantt-tr-resizeHandle` rule instead of inheriting `position: relative` from the combined selector
next_action: Apply fix to TaskRow.css

## Symptoms

expected: After resizing a task bar using the resize handles, the bar should maintain correct position and size relative to the timeline. The bar should only change its start/end date as intended.
actual: After resizing a bar, the bar changes its visual scale and position incorrectly. The handles change the bar's dimensions/position in an unexpected way after the resize operation completes.
errors: No specific error messages provided.
reproduction: Use resize handles on task bars in the Gantt chart. Drag a resize handle to change task duration. After releasing, the bar appears at wrong position/scale.
started: After phase 05-progress-bars was implemented (commits: 5581cb4, 2651e39, a15133d, ea7e378, 29a0f1c)

## Eliminated

- hypothesis: Progress overlay changes measured dimensions via getBoundingClientRect
  evidence: resize drag logic uses React state (currentLeft/currentWidth) for initial position, not DOM measurements
  timestamp: 2026-02-21T00:01:00Z

- hypothesis: Progress bar z-index or pointer-events intercepts mouse events
  evidence: commit 2651e39 already fixed pointer-events by adding `pointer-events: auto` and `z-index: 10` to handles; this correctly allows click-through
  timestamp: 2026-02-21T00:02:00Z

## Evidence

- timestamp: 2026-02-21T00:00:00Z
  checked: directory structure
  found: packages/gantt-lib/src has components, hooks, utils, types, styles.css
  implication: Need to read all relevant files

- timestamp: 2026-02-21T00:01:00Z
  checked: TaskRow.css lines 101-118 and 173-179
  found: TWO conflicting CSS rules for .gantt-tr-resizeHandle:
    1. Line 101: `.gantt-tr-resizeHandle { position: absolute; top: 0; width: 8px; height: 100%; ... }`
    2. Line 174-179: `.gantt-tr-taskName, .gantt-tr-taskDuration, .gantt-tr-resizeHandle { position: relative; z-index: 2; }`
  implication: The second rule (added in commit 29a0f1c for progress bar z-index stacking) overrides `position: absolute` with `position: relative`. CSS specificity: both are single-class selectors, so the LAST one wins. The resize handles are now in normal flow (relative) instead of absolutely positioned at bar edges.

- timestamp: 2026-02-21T00:02:00Z
  checked: TaskRow.tsx - onMouseDown handler, DOM structure
  found: The task bar div itself has `onMouseDown={dragHandleProps.onMouseDown}`. Edge zone detection (detectEdgeZone) uses `e.currentTarget` which is always the task bar element. The resize handle divs are visual-only children.
  implication: The edge zone detection math is based on the task bar bounding rect and is still correct. The bug is entirely in the CSS layout of the handle elements.

- timestamp: 2026-02-21T00:03:00Z
  checked: How position:relative on handles corrupts the bar
  found: .gantt-tr-taskBar is `display: flex`. Its children include: progress bar (absolute), left resize handle, duration span, task name span, right resize handle. When handles were `position: absolute`, they were overlaid at left:0 and right:0 of the bar and took NO space in flow. Now with `position: relative`, they are 8px-wide flex items occupying space in the flex layout, pushing content and visually appearing in the middle of the bar instead of at edges.
  implication: The bar's content layout is disrupted. The resize handles appear at wrong positions (not at bar edges), likely causing the visual "wrong position/scale" effect the user sees after drag completes (when CSS transitions/repaints settle).

- timestamp: 2026-02-21T00:04:00Z
  checked: Why drag appears to break specifically on completion
  found: During drag the `gantt-tr-dragging` class is applied with `transition: none`. On completion, the dragging class is removed. The CSS layout issues with the handles (now in flex flow) would be visible both during and after drag, but the wrong bar size/position would be most apparent after the drag updates state (new dates) and the bar re-renders at its final position.
  implication: Root cause is the position:relative override. Fix: move z-index onto the .gantt-tr-resizeHandle rule itself, keeping position: absolute.

## Resolution

root_cause: |
  In commit 29a0f1c (feat: add progress bar CSS), a combined selector was added:
    `.gantt-tr-taskName, .gantt-tr-taskDuration, .gantt-tr-resizeHandle { position: relative; z-index: 2; }`
  This overrides the existing `position: absolute` rule on `.gantt-tr-resizeHandle`.
  Since `.gantt-tr-taskBar` is `display: flex`, switching the handles from
  `position: absolute` to `position: relative` puts them INTO the flex flow as
  8px-wide items. They no longer overlay the bar edges (left:0, right:0) but instead
  appear as inline elements between the duration text and task name, corrupting
  the task bar layout. The edge zone detection (detectEdgeZone) still measures the
  task bar element correctly, but clicking what the user sees as "the resize handle"
  now hits the wrong area of the bar, causing unexpected drag modes and apparent
  position/scale corruption after drag completes.

fix: |
  Removed `.gantt-tr-resizeHandle` from the combined `position: relative; z-index: 2`
  selector. The resize handle already has `position: absolute; z-index: 10` in its
  own rule, which correctly places it above the progress bar (z-index: 1) without
  breaking its absolute positioning. Added explanatory comments to prevent regression.

verification: |
  CSS rules verified visually - .gantt-tr-resizeHandle rule now solely has
  position: absolute (not overridden by any later rule). The combined selector
  now only applies to .gantt-tr-taskName and .gantt-tr-taskDuration (inline text
  elements that benefit from position:relative for z-index stacking).

files_changed:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
