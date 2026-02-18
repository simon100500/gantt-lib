---
phase: 02-drag-and-drop-interactions
plan: 02
subsystem: ui-interactions
tags: [react, dnd, useTaskDrag, DragTooltip, resize]

# Dependency graph
requires:
  - phase: 02-01
    provides: useTaskDrag hook, edge detection utilities
provides:
  - DragTooltip component with fixed positioning and date formatting
  - TaskRow with integrated drag-and-drop interactions
  - onChange callback mechanism for parent notification
  - Visual feedback styles (hover, drag, resize handles)
affects: [02-03, demo-usage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Position fixed tooltips for cursor-following UI"
    - "CSS cursors for interaction affordance (grab/grabbing/ew-resize)"
    - "onChange callback on mouseup (not during drag)"

key-files:
  created:
    - src/components/DragTooltip/DragTooltip.tsx
    - src/components/DragTooltip/DragTooltip.module.css
    - src/components/DragTooltip/index.tsx
  modified:
    - src/components/TaskRow/TaskRow.tsx
    - src/components/TaskRow/TaskRow.module.css
    - src/components/GanttChart/GanttChart.tsx
    - src/components/index.ts
    - src/utils/dateUtils.ts (parseUTCDate fix)
    - app/page.tsx (onChange handler demo)
    - src/components/TaskRow/index.tsx

key-decisions:
  - "16px cursor offset for DragTooltip to prevent obscuring drag target"
  - "Full date format (d MMMM) for tooltip readability"
  - "Shadow-based hover feedback for 'tangible' feel per user preference"
  - "Resize has priority over move when cursor is on edge zone"

patterns-established:
  - "Pattern: Conditional DragTooltip render during isDragging state"
  - "Pattern: onChange callback fires only on mouseup (not during drag)"
  - "Pattern: Visual updates real-time, state updates deferred to drop"

requirements-completed: [INT-01, INT-02, INT-04, API-02]

# Metrics
duration: 45min
completed: 2026-02-19
---

# Phase 02-02: Move and Resize Interaction Handlers Summary

**Drag-and-drop task interactions with useTaskDrag integration, DragTooltip date feedback, visual affordances, and onChange callback for parent notification**

## Performance

- **Duration:** 45 min
- **Started:** 2026-02-19T22:00:00Z (approx)
- **Completed:** 2026-02-18T22:40:53Z
- **Tasks:** 3 (all auto) + 1 checkpoint + 2 bug fixes
- **Files modified:** 10

## Accomplishments

- **DragTooltip component** with fixed positioning, date formatting, and cursor-following behavior
- **TaskRow integration** with useTaskDrag hook for move and resize interactions
- **Visual feedback styles** including grab/grabbing cursors, shadow effects, and resize edge markers
- **onChange callback** mechanism that fires only on mouseup (not during drag)
- **Parent notification** through GanttChart onChange prop passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DragTooltip component** - `c268a93` (feat)
2. **Task 2: Add drag visual styles to TaskRow CSS** - `ad6a0d7` (feat)
3. **Task 3: Integrate useTaskDrag hook into TaskRow component** - `d100256` (feat)
4. **Bug fix: persist drag state by adding onChange handler to demo page** - `051bd14` (fix)
5. **Bug fix: handle ISO date strings in parseUTCDate** - `4eb7e35` (fix)

**Plan metadata:** (to be added with final docs commit)

## Files Created/Modified

### Created
- `src/components/DragTooltip/DragTooltip.tsx` - Floating date tooltip with fixed positioning, follows cursor at 16px offset
- `src/components/DragTooltip/DragTooltip.module.css` - Tooltip styling with white background, shadow, rounded corners
- `src/components/DragTooltip/index.tsx` - Barrel export for DragTooltip

### Modified
- `src/components/TaskRow/TaskRow.tsx` - Integrated useTaskDrag hook, added DragTooltip, resize handles, onChange prop
- `src/components/TaskRow/TaskRow.module.css` - Added hover, drag, and resize handle styles with cursor affordances
- `src/components/GanttChart/GanttChart.tsx` - Added onChange prop to interface, passed to TaskRow components
- `src/components/index.ts` - Added DragTooltip export
- `src/utils/dateUtils.ts` - Updated parseUTCDate to handle ISO date strings (was 'YYYY-MM-DD' only)
- `app/page.tsx` - Added onChange handler to demo page for drag state persistence
- `src/components/TaskRow/index.tsx` - Exported TaskRow component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Drag state not persisting after drag operations**
- **Found during:** Checkpoint verification
- **Issue:** Demo page lacked onChange handler, so drag state updates weren't persisted. Tasks reverted to original positions after drag.
- **Fix:** Added useState and onChange handler to app/page.tsx to update tasks array when onChange fires
- **Files modified:** app/page.tsx
- **Verification:** Drag operations now persist state changes correctly
- **Committed in:** `051bd14`

**2. [Rule 1 - Bug] Invalid date string error when dragging**
- **Found during:** Checkpoint verification
- **Issue:** parseUTCDate only handled 'YYYY-MM-DD' format but task dates are ISO strings (with time). Caused "Invalid Date" errors during drag.
- **Fix:** Updated parseUTCDate to handle ISO date strings by using new Date(isoString) for full ISO format
- **Files modified:** src/utils/dateUtils.ts
- **Verification:** Date parsing now works for both 'YYYY-MM-DD' and ISO string formats
- **Committed in:** `4eb7e35`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both auto-fixes essential for functionality. The missing onChange handler prevented drag state persistence - a critical functional requirement. The date parsing bug was breaking core functionality.

## Issues Encountered

- **Drag state not saving:** Demo page needed onChange handler to persist drag updates
- **Date format mismatch:** parseUTCDate expected 'YYYY-MM-DD' but tasks use ISO strings - extended utility to handle both

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 02-03:**
- Drag-and-drop foundation complete with useTaskDrag hook
- TaskRow fully interactive with move and resize capabilities
- Visual feedback and affordances in place
- onChange callback mechanism established for parent components

**Remaining for full drag-and-drop:**
- Visual drag indicators (ghost drag image, drop targets)
- Conflict detection and constraint enforcement (02-03)
- Undo/redo support (future phase)

## Self-Check: PASSED

**Files verified:**
- src/components/DragTooltip/DragTooltip.tsx - FOUND
- src/components/DragTooltip/DragTooltip.module.css - FOUND
- src/components/DragTooltip/index.tsx - FOUND

**Commits verified:**
- c268a93 - FOUND
- ad6a0d7 - FOUND
- d100256 - FOUND
- 051bd14 - FOUND
- 4eb7e35 - FOUND

---
*Phase: 02-drag-and-drop-interactions*
*Completed: 2026-02-19*
