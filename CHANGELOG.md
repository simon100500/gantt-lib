# Changelog

All notable changes to this project will be documented in this file.

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
