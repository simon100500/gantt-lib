# Changelog

All notable changes to this project will be documented in this file.

## [0.13.0] - 2026-03-15

### Features
- Color parent task name label to match the bar color
- Enhance parent task bar styling with dynamic background color
- Add border radius to parent task progress bars
- Improve progress bar styling clarity in TaskRow

### Refactor
- Remove debug console.log statements from GanttChart and TaskList

### Style
- Update parent task row background color for visual consistency

## [0.11.1] - 2026-03-15

### Fixes
- Fix drag & drop hierarchy: dropping a task below a collapsed group no longer incorrectly nests it inside the group; tasks now join a group only when dropped between a parent and its first child or between two siblings

### Style
- Adjust opacity of task number labels for improved readability

## [0.11.0] - 2026-03-15

### Features
- Add L-shaped hierarchy connector icon (├/└) for child task rows with continuous vertical tree lines
- Enforce single-level nesting rules for parent task drag-and-drop

### Fixes
- Cascade delete children when parent task is deleted
- Fix multi-level collapse visibility for nested tasks
- Resolve parent drop order bug with improved logic
- Prevent parent task from joining its own group (cycle prevention)
- Fix parent task drag restrictions to prevent invalid hierarchy states

## [0.9.0] - 2026-03-14

### Features
- Add `onPromoteTask` callback prop to GanttChart for custom promote behavior
- Add `onDemoteTask` callback prop to GanttChart for custom demote behavior
- Both callbacks are optional - internal default logic is used when not provided

### Documentation
- Updated REFERENCE.md with onPromoteTask/onDemoteTask optional prop documentation

## [0.8.0] - 2026-03-14

### Breaking Changes
- **Removed:** `onChange` prop - replaced with `onTasksChange`
- **Removed:** `onTaskChange` prop - merged into `onTasksChange`
- `onTasksChange` now receives only the changed tasks (never the full array)
- Single task changes are delivered as a single-element array
- Consumer must merge changed tasks into state using the pattern documented in REFERENCE.md

### Features
- `onTasksChange` API enables efficient REST API integration
  - Individual updates: `PATCH /api/tasks/:id`
  - Batch updates: `PATCH /api/tasks` with array
- All Task objects in callbacks include full properties (nested structures, dependencies, etc.)

### Documentation
- Updated REFERENCE.md to v0.8.0 with onTasksChange pattern examples

## [0.7.1] - 2026-03-13

### Fixes
- Automatically swap task dates when endDate < startDate (normalizeTaskDates)
- Dates are validated on initial data load and during editing

## [0.7.0] - 2026-03-11

### Features
- Add an inline `Дн.` duration column to the task list so end dates can be adjusted from a compact numeric editor

### Fixes
- Preview the recalculated end date immediately while editing duration and save the final value on confirm
- Keep duration display accurate during inline editing
- Keep task reordering stable when parent groups are collapsed

### Styling
- Compact the progress editor and enlarge its controls for easier interaction
- Refine task list cell sizing, child padding, and task name tooltip behavior
- Add a right-side shadow to the task list when the date grid is horizontally scrolled
- Rebalance task list minimum widths so name and dependency columns stay usable together

## [0.6.2] - 2026-03-11

### Fixes
- Derive parent task dates from children (auto-stretch parent to encompass all children)

## [0.6.1] - 2026-03-11

### Fixes
- Keep children next to parent when dragging tasks

### Documentation
- Update API reference with hierarchy features and new CSS variables

## [0.6.0] - 2026-03-11

### Features

#### Hierarchy System (Phase 19)
- Add parent-child task hierarchy support with `parentId` field
- Implement hierarchy utilities (getChildren, isParent, isDescendant, getAncestors)
- Add hierarchy UI with indentation, collapse buttons, and parent row styling
- Parent task bar with MS Project bracket styling (trapezoid ears)
- Promote/demote functionality with single directional button
- Smart parentId inference in drag-drop reordering
- Virtual dependency links for collapsed parent tasks
- Parent tasks automatically stretch when children are dragged
- Cascade delete for parent removal
- Parent progress auto-updates based on children progress

#### Task List Improvements
- Add clickable progress column in task list
- Add show/hide task list toggle buttons
- Add `enableAddTask` prop for task creation control

#### Styling
- Add CSS variables for optional vertical separators between columns

### Fixes
- Children follow parent when moved by dependency link
- Child tasks can exit group when moved above parent
- Cascade successors when moving collapsed parents
- Fix parent task resize boundaries
- Enable progress bar for parent tasks
- Fix parent bar centering and positioning
- Prevent row keydown from interfering with progress input
- Remove vertical separator lines between task list columns

### Documentation
- Add REFERENCE.md with hierarchy examples and full API reference

## [0.5.1] - 2026-03-09

### Fixes
- Fix drag-and-drop to allow moving tasks to the very end of the list
- The "+ Добавить задачу" button now serves as a drop target for placing tasks at the end

## [0.5.0] - 2026-03-09

### Features

#### Task Drag-to-Reorder (Phase 18)
- Add drag handle overlay on task number cell hover
- Implement drag-and-drop task reordering with visual feedback
- Add `onReorder` callback to GanttChart for external state sync
- Add blue text highlighting for dragging row visibility
- Use transparent background for dragging row to maintain readability
- Implement proper drop index calculation for drag-down scenarios
- Add no-op checks for adjacent position drags

#### Delete Confirmation
- Add two-click delete confirmation to prevent accidental deletions
- Delete button shows "Удалить?" on first click, deletes on second
- Reset confirmation state when clicking outside button or hovering to different row

### Fixes
- Fix drop index calculation when dragging down (subtract 1 from dropIndex)
- Add no-op checks for adjacent position drags
- Simplify drop logic to only no-op for same position
- Use ::before for drag indicator to prevent layout shift

### Style
- Remove transition on drag handle for instant feedback
- Keep drag handle visible during dragging
- Use visibility instead of pointer-events for drag handle

## [0.4.1] - 2026-03-09

### Fixes
- Remove first month separator line at the left edge of calendar grid

### Refactor
- Move `editingTaskId` from prop to internal state for better encapsulation

### Documentation
- Add detailed installation guide emphasizing CSS import requirement
- Fix `onAdd` and `onInsertAfter` callback signatures in API reference
- Add troubleshooting note for missing hover buttons (CSS import issue)

## [0.4.0] - 2026-03-09

### Features

#### Task Add/Delete (Phase 16-17)
- Add `onAdd` and `onDelete` callbacks to GanttChart for external task control
- Implement `handleDelete` with automatic dependency cleanup
- Create NewTaskRow component with ghost row for inline task creation
- Add action panel (48px) with insert/delete buttons in task list
- Use hover-reveal pattern for action buttons to keep UI clean

#### Calendar & Navigation
- Add calendar navigation button bar with quick-jump buttons (-7, -1, Today, +1, +7)
- Add F2 keyboard shortcut to enter task name edit mode

#### Dependency Chip UX Improvements
- Toggle off dependency chip view on second click
- Scroll to predecessor task when clicking dependency chip
- Hide "add link" button when a dependency chip is selected
- Allow cancelling link creation mode by clicking the source cell
- Remove action column from TaskList header for cleaner layout

#### CSS & Styling
- Expose `--gantt-container-border-radius` CSS variable for customization
- Move action buttons into task name cell with hover-reveal
- Constrain dependencies column width to 90px
- Add text wrapping for source hint placeholder
- Update dependency button styling and column widths

#### Quick Fixes
- Prevent popover from re-opening on chip click
- Fix dependency add button display issues
- Fix task list row hover behavior for action buttons

### [0.3.4] - 2026-02-28

### Features
- Initial release foundation
