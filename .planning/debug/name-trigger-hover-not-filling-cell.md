---
status: awaiting_human_verify
trigger: "name-trigger-hover-not-filling-cell — `.gantt-tl-name-trigger:hover` doesn't reach the edges of the task name cell"
created: 2026-03-09T00:00:00.000Z
updated: 2026-03-09T00:00:00.000Z
---

## Current Focus

hypothesis: The `.gantt-tl-name-trigger` button has `width: 100%` and `height: 100%` but its parent `.gantt-tl-cell-name` uses `padding: 0 4px`. This padding shrinks the available space, so `width: 100%` resolves to the padded inner width — leaving 4px gaps on left and right edges. The button never reaches the cell borders.
test: Inspect the CSS — `.gantt-tl-cell-name` has `padding: 0 4px` (line 116 of TaskList.css). The trigger has `width: 100%; height: 100%` (lines 135-136). In a flex/block container with padding, width:100% fills the content box, not the full cell.
expecting: Confirmed — the 4px padding on each side creates a gap between the trigger and the cell edges.
next_action: Fix applied — see Resolution

## Symptoms

expected: The hover/click area of `.gantt-tl-name-trigger` should fill the entire task name cell edge-to-edge.
actual: The hover area stops before reaching the cell edges — there are gaps where hovering/clicking on the cell doesn't trigger the hover state or double-click-to-edit.
errors: None.
reproduction: Hover near the edges of a task name cell — the hover highlight doesn't reach the cell borders.
timeline: Unknown, possibly always been this way or regressed during recent TaskListRow changes.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-09T00:00:00.000Z
  checked: TaskList.css lines 110-118 (.gantt-tl-cell-name)
  found: `padding: 0 4px` on the name cell
  implication: Creates 4px left and 4px right gaps inside the cell. The button's width:100% fills only the inner content box, not the padded area.

- timestamp: 2026-03-09T00:00:00.000Z
  checked: TaskList.css lines 130-152 (.gantt-tl-name-trigger)
  found: `width: 100%; height: 100%; padding: 0 0.2rem`
  implication: Width fills content area of parent (excludes parent padding). Height 100% in a flex container may not stretch to full row height either.

- timestamp: 2026-03-09T00:00:00.000Z
  checked: TaskListRow.tsx lines 436-501 (name cell JSX)
  found: `.gantt-tl-cell-name` is a flex container with `align-items: center`. The `.gantt-tl-name-trigger` button is a direct child.
  implication: In a flex container, a child with `height: 100%` needs the parent to have a definite height. The row has `min-height: rowHeight` but is a flex container itself. The trigger likely doesn't stretch vertically.

- timestamp: 2026-03-09T00:00:00.000Z
  checked: TaskList.css line 81-89 (.gantt-tl-cell) and line 110-118 (.gantt-tl-cell-name)
  found: .gantt-tl-cell has `display: flex; align-items: center; padding: 0 0.5rem`. .gantt-tl-cell-name overrides padding to `0 4px`.
  implication: The trigger sits in a flex container with 4px horizontal padding — direct cause of the horizontal gap.

## Resolution

root_cause: `.gantt-tl-cell-name` has `padding: 0 4px` which creates a 4px gap on left and right sides. The `.gantt-tl-name-trigger` button uses `width: 100%` which resolves to the content-box width (excluding padding), so it never reaches the cell borders. Additionally, as a flex child with `height: 100%`, the trigger may not stretch to the full cell height because flex children need `align-self: stretch` (not `align-items: center` on parent) to fill height.

fix: |
  1. Remove padding from `.gantt-tl-cell-name` (move it to `.gantt-tl-name-trigger` as negative margins or keep inside the trigger's own padding).
  2. Use negative margins on `.gantt-tl-name-trigger` (`margin: 0 -4px`) to counteract the parent's 4px padding, combined with `padding: 0 4px` on the trigger itself to preserve visual text indent.
  3. Ensure the trigger stretches vertically by making the cell use `align-items: stretch` and giving the trigger `align-self: stretch` — OR use `position: absolute; inset: 0` approach.

  Chosen approach: negative margin trick — keeps layout flow intact, visually identical, trigger now fills edge-to-edge.

verification: awaiting human confirmation
files_changed:
  - packages/gantt-lib/src/components/TaskList/TaskList.css
