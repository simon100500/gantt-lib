# Changelog

All notable changes to this project will be documented in this file.

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
