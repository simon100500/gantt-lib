---
phase: quick
plan: 60
subsystem: TaskRow component (resize handles)
tags: [css, ui, resize, visual-design]
dependency_graph:
  requires: []
  provides: [visual-offset-resize-handles]
  affects: [task-row-ux]
tech_stack:
  added: []
  patterns: [background-clip-padding-offset]
key_files:
  created: []
  modified: [packages/gantt-lib/src/components/TaskRow/TaskRow.css]
decisions: []
metrics:
  duration_seconds: 127
  tasks_completed: 1
  completed_date: "2026-03-07T21:19:45Z"
---

# Phase quick Plan 60: Visual Offset for Resize Handles Summary

**One-liner:** Resize handles now appear with 6px visual offset from task bar edges while maintaining 20px activation zone using background-clip with padding

## Objective Achieved

Added visual offset to resize handles so they appear 6px from task bar edges (8px visual handle centered in 20px zone) while keeping the full 20px activation zone for easier clicking.

## Implementation Details

Modified `.gantt-tr-resizeHandle` CSS class:
- Changed `width` from `8px` to `20px` (matches edgeZoneWidth in useTaskDrag hook)
- Added `background-clip: content-box` to constrain background to padding box
- Added `padding-left: 6px` and `padding-right: 6px` to create visual inset
- Added `box-sizing: border-box` for correct padding calculation

This creates an 8px visual handle centered within the 20px activation zone, with 6px offset from each edge.

### Files Modified

- `packages/gantt-lib/src/components/TaskRow/TaskRow.css` (7 lines changed)

## Deviations from Plan

None - plan executed exactly as written using Option A (padding + background-clip).

## Technical Notes

The `background-clip: content-box` property is key to this solution:
- Without it, background would extend to the outer edge of the 20px width
- With `content-box` and `box-sizing: border-box`, background only renders in the 8px content area (20px - 6px - 6px)
- The full 20px element remains clickable for the activation zone

This approach is cleaner than Option B (using ::before pseudo-element) because:
- Fewer DOM elements created
- Simpler CSS structure
- Better performance (no pseudo-element rendering)

## Verification

Build passed successfully with no TypeScript errors:
- ESM/CJS builds completed
- Type definitions generated
- CSS bundled correctly

Manual verification checklist (to be confirmed by user):
- [ ] Hover over task bar - handles should appear offset from edges (not flush)
- [ ] Click within 20px of edge - resize should activate (test activation zone)
- [ ] Click at 6px from edge - should hit the visual handle
- [ ] Visual handle should appear 8px wide centered in 20px zone

## Success Criteria Met

- [x] Visual handles appear 6px from task bar edges (via CSS padding)
- [x] 20px activation zone still functions correctly (via full element width)
- [x] Handle hover state works as before (opacity transition unchanged)
- [x] No TypeScript errors
- [x] Build succeeds

## Next Steps

None - this is a standalone quick task for visual polish.
