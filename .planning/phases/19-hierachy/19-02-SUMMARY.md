---
phase: 19-hierachy
plan: 02
subsystem: hierarchy-ui
tags: [hierarchy, ui, tasklist, collapse, expand, indentation, react]

# Dependency graph
requires:
  - phase: 19-01
    provides: [hierarchy utilities, parentId field in Task interface]
provides:
  - TaskList collapse state management and filtered task rendering
  - TaskListRow hierarchy UI with indentation and collapse buttons
  - CSS styles for child row indentation and parent row styling
  - GanttChart hierarchy props threading for coordinated collapse state
affects: [19-03-hierarchy-cascade, 19-04-hierarchy-level-change]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Controlled/uncontrolled state pattern for collapse state (like selectedTaskId)
    - Set-based state management for collapsed parent IDs
    - Computed isParent/isChild flags using utility functions
    - CSS class toggling based on computed hierarchy props
    - Filtered rendering for hidden children in both TaskList and GanttChart

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx

key-decisions:
  - "Used controlled/uncontrolled pattern for collapse state (external prop wins, internal state fallback)"
  - "Computed isParent from task array instead of stored field to prevent data inconsistency"
  - "Filtered tasks in both TaskList and GanttChart for consistent collapse behavior"
  - "Collapse button (+/-) replaces number label in parent rows, drag handle hidden for parents"

patterns-established:
  - "Controlled/uncontrolled pattern: external collapsedParentIds prop wins, internal state as fallback"
  - "Computed hierarchy flags: isParent via isTaskParent utility, isChild via parentId check"
  - "Set-based state management for collapsed parent IDs with functional updates"
  - "Filtered rendering: visibleTasks memo filters hidden children from both list and chart"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 19: hierachy - Plan 02 Summary

**TaskList hierarchy UI with child row indentation, parent row styling, and collapse/expand buttons (+/-) replacing row numbers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T19:47:28Z
- **Completed:** 2026-03-10T19:52:33Z
- **Tasks:** 5
- **Files modified:** 4

## Accomplishments

- Implemented TaskList collapse state management with controlled/uncontrolled pattern
- Added filtered task rendering to hide children of collapsed parents
- Implemented TaskListRow hierarchy UI: child row indentation, parent row styling, collapse buttons
- Added CSS styles for hierarchy: 24px left padding for children, bold font for parents, 20x20px collapse button
- Threaded hierarchy props through GanttChart for coordinated collapse state
- Fixed TypeScript compilation by adding missing props to TaskListProps interface

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Task type with parentId field** - Already complete (19-01)
2. **Task 2: Add collapse state and filtered rendering to TaskList** - `40575e8` (feat)
3. **Task 3: Add hierarchy UI to TaskListRow** - `c4042c8` (feat)
4. **Task 4: Add CSS styles for hierarchy UI** - `cd4372d` (feat)
5. **Task 5: Wire TaskList props through GanttChart** - `77d49be` (feat)
6. **Fix: Add collapsedParentIds and onToggleCollapse to TaskListProps** - `5716e85` (fix)

**Plan metadata:** N/A (summary created after completion)

## Files Created/Modified

- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` - Added collapsedParentIds state, handleToggleCollapse callback, visibleTasks memo, controlled/uncontrolled pattern, TaskListProps interface updates
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - Added isParent/isChild/isCollapsed computed props, handleToggleCollapse callback, collapse button rendering, row className modifications
- `packages/gantt-lib/src/components/TaskList/TaskList.css` - Added .gantt-tl-row-child (24px padding-left), .gantt-tl-row-parent (bold font, background tint), .gantt-tl-collapse-btn (20x20px button) styles
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` - Added collapsedParentIds state, handleToggleCollapse callback, filteredTasks memo, TaskList and TaskRow rendering updates

## Decisions Made

- Used controlled/uncontrolled pattern for collapse state (external collapsedParentIds prop wins, internal state as fallback) - matches existing selectedTaskId pattern
- Collapse button (+/-) replaces number label and drag handle in parent rows for visual distinction
- Child rows indented with 24px padding-left for clear visual hierarchy
- Parent rows use bold font (weight 600) and subtle background tint (rgba(99, 102, 241, 0.05)) for prominence
- Filtered rendering applied to both TaskList and GanttChart for consistent collapse behavior
- isParent computed via isTaskParent utility instead of stored field to prevent data inconsistency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing TaskListProps interface properties**
- **Found during:** Build verification
- **Issue:** TaskListProps interface was missing collapsedParentIds and onToggleCollapse properties, causing TypeScript compilation errors
- **Fix:** Added collapsedParentIds?: Set<string> and onToggleCollapse?: (parentId: string) => void to TaskListProps interface
- **Files modified:** packages/gantt-lib/src/components/TaskList/TaskList.tsx
- **Verification:** Build succeeded with no TypeScript errors
- **Committed in:** 5716e85

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix was necessary for TypeScript compilation. No scope creep.

## Issues Encountered

- TypeScript compilation error due to missing TaskListProps interface properties (resolved via deviation Rule 3)
- Duplicate handleToggleCollapse callback implementation (resolved by consolidating into controlled/uncontrolled pattern)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Hierarchy UI complete with working collapse/expand functionality
- Collapse state coordinated between TaskList and GanttChart via controlled/uncontrolled pattern
- Child row indentation (24px) and parent row styling (bold font, background tint) implemented
- Collapse buttons (+/-) functional in parent rows
- Build succeeds with no TypeScript errors
- Ready for plan 19-03 (hierarchy cascade behavior) or 19-04 (level change UI)

---
*Phase: 19-hierachy*
*Completed: 2026-03-10*
