# Changelog

All notable changes to this project will be documented in this file.

## [0.61.0] - 2026-03-31

### Features

- Add command-level scheduling API with ScheduleTask, ScheduleCommandResult, ScheduleCommandOptions domain types
- Implement scheduling execution engine with task resizing and project recalculation logic
- Extract UI adapter functions for drag scheduling to adapters/scheduling/drag.ts

### Refactor

- Rewire useTaskDrag hook to import UI functions from adapters/scheduling

### Documentation

- Rewrite headless scheduling API reference (14-headless-scheduling.md)

## [0.60.2] - 2026-03-30

### Fixes

- Commit date picker changes on confirm instead of on every value change

## [0.60.1] - 2026-03-30

### Refactor

- Add `./core/scheduling` subpath export to package.json for tree-shakeable scheduling core imports

## [0.60.0] - 2026-03-30

### Features

- Extract headless scheduling core module (`core/scheduling`) — standalone runtime-agnostic scheduling engine with backward-compat barrel exports
- Rewire all UI consumers to import scheduling functions from `core/scheduling` instead of `dependencyUtils`

### Documentation

- Add Architecture section to INDEX.md with Headless Scheduling Core reference
- Add 14-headless-scheduling.md API reference

## [0.53.1] - 2026-03-30

### Fixes

- Cascade parent date changes when editing dates via date picker

## [0.53.0] - 2026-03-30

### Features

- Add hierarchical dependency validation — prevent dependency links between parent and child tasks

### Fixes

- Improve task color representation and alignment in TaskList

## [0.52.0] - 2026-03-30

### Features

- Add reflowTasksOnModeSwitch utility for recalculating task dates when toggling between business and calendar days

### Documentation

- Add documentation for reflowTasksOnModeSwitch in business days guide

## [0.51.1] - 2026-03-30

### Features

- Add color stripe for custom task colors and fix parent-child dependency bug

### Fixes

- Update external task name color based on expiration status
- Address parent-child dependency bug and update color palette
- Rename color dot to color stripe and update styles
- Update task color selection to reflect new color value

## [0.51.0] - 2026-03-30

### Features

- Add context menu for task actions
- Enhance task demotion logic and UI integration
- Implement task duplication functionality
- Add color selection for tasks and descendants
- Update color palette with localized labels

### Refactoring

- Update external task name and progress styles to inherit color

## [0.50.0] - 2026-03-30

### Breaking Changes

- **`editor` property removed** — Custom columns must use `renderEditor` instead of `editor`. Simply rename the property:
  ```diff
  - editor: ({ task, updateTask, closeEditor }) => ...
  + renderEditor: ({ task, updateTask, closeEditor }) => ...
  ```
- **Import path changed** — `TaskListColumn` type must be imported from the package root (`gantt-lib`), not from internal `taskListColumns` path
- **Numeric `width` only** — Column `width` accepts only `number` (pixels), string values are not supported
- **`before` / `after` placement** — The only supported way to position custom columns

### Features

- Add `additionalColumns` prop to GanttChart for custom TaskList columns
- Add `TaskListColumn<TTask>` generic type with anchor-based placement (`before`/`after`)
- Add `resolveTaskListColumns` pipeline for unified column resolution
- Add built-in column factory for default TaskList columns
- Add `onInsertAfter` callback for inserting tasks between rows
- Add demo components: AdditionalColumnsChart, ConstructionChart

### Refactoring

- Unify header and row rendering via resolvedColumns pipeline
- Unify editor state into single `editingColumnId`
- Remove `as` Task casts from additionalColumns prop chain
- Extract sample tasks data into separate module
- Remove legacy editor fallback and bridge re-export

### Fixes

- Improve type safety for `onTasksChange` callbacks
- Fix custom column editor state unification with `editingColumnId`
- Widen `additionalColumns` prop type to `TaskListColumn<any>[]`

## [0.28.1] - 2026-03-25

### Fixes
- Update task list width handling and default values for better responsiveness
- Change minimum task list width from 640px to 530px
- Use CSS variables for task list width instead of fixed values

## [0.28.0] - 2026-03-23

### Features
- Add filter mode functionality with `filterMode` prop (`highlight` or `hide`)
- Add `filteredTaskIds` and `isFilterActive` props to GanttChart for task filtering
- Add filter display modes to TaskList and TaskListRow components
- Enhance demo page with filter mode examples and controls

### Documentation
- Split REFERENCE.md into modular chapter structure (12 chapters + INDEX.md)
- Add docs/reference/ folder with separate files for each API section
- Update REFERENCE.md with filter display modes documentation

## [0.27.0] - 2026-03-22

### Features
- Add `showChart` prop for controlling calendar chart visibility independently from task list
- Update chart visibility handling with proper CSS (`display: none` for complete layout exclusion)
- Add demo page buttons for view modes: "Оба", "Только список", "Только календарь"

### Documentation
- Add `showChart` prop to API reference

## [0.26.0] - 2026-03-22

### Features
- Add disableTaskDrag prop to prevent accidental task movement during panning

### Fixes
- Use grab cursor instead of not-allowed when disableTaskDrag is enabled

## [0.25.1] - 2026-03-22

### Style
- Update hierarchy line color to a more neutral shade
- Use CSS variable for hierarchy line color
- Move parent chevron and title left, start hierarchy line lower

### Fixes
- Hide hierarchy line when parent is collapsed
- Align parent hierarchy line with children, remove horizontal segment
- Start hierarchy line from parent chevron instead of first child

## [0.25.0] - 2026-03-21

### Features
- Add keyboard navigation for task list search results (ArrowUp/ArrowDown, Enter to select)
- Add automatic scrolling to highlighted task rows when navigating search results
- Improve task list row search with smooth scroll behavior

## [0.24.1] - 2026-03-21

### Fixes
- Fix hydration error: remove nested button in dependency source options
- Replace inner `<button>` with `<span>` to resolve HTML constraint violation
- Add keyboard support (Delete/Backspace) for removing linked items

## [0.24.0] - 2026-03-21

### Features
- Add business days mode — count duration in workdays, excluding weekends
- Add `businessDays` prop to GanttChart for controlling workday calculation
- Add `getBusinessDaysCount` and `addBusinessDays` utilities for date calculations
- Implement weekend snapping in DatePicker for business days
- Add dependency search functionality in TaskListRow with row highlight and scroll
- Add active link type selection (FS/SS/FF/SF) with visual feedback
- Add Russian labels for dependency link types
- Enhance task dependency lag calculations with business days support
- Implement clamping for FS lag in task dependencies

### Fixes
- Correct task ID reference in DepChip component
- Refine dependency lag display in TaskListRow
- Ensure task duration integrity during business days adjustments
- Enforce workday resize invariants
- Snap workday drag preview to weekdays

### Tests
- Add tests for business days utilities (getBusinessDaysCount, addBusinessDays)
- Add tests for incoming lag recalculation on start date change
- Add tests for dependency handling with business days

### Documentation
- Update REFERENCE.md with businessDays API documentation and usage examples

## [0.23.1] - 2026-03-19

### Refactor
- Improve parent task ID retrieval logic in GanttChart component

## [0.23.0] - 2026-03-19

### Features
- Add controlled collapse mode with `collapsedParentIds` and `onToggleCollapse` props
- Add hierarchical task insertion with descendants when inserting after parent tasks
- Add `getAllDescendants` utility for retrieving all descendant tasks

### Fixes
- Update import path for `getAllDescendants` utility in page component

### Documentation
- Update REFERENCE.md with controlled collapse mode examples and API reference

## [0.22.2] - 2026-03-19

### Fixes
- Fixed delete dependency button functionality issues
- Moved add connection button to appear after dependency chips for better alignment
- Improved chip minimum width and container gap for more consistent appearance

## [0.22.1] - 2026-03-19

### Enhancements
- Enhanced TaskList overlay animations with smooth slide and width transitions
- TaskList now smoothly animates in/out without layout shifts

### Documentation
- Updated project documentation for v0.50.0 progress

## [0.22.0] - 2026-03-19

### Features
- Add task filtering API with predicate-based filters
- Add ready-made filters: `withoutDeps`, `expired`, `inDateRange`, `progressInRange`, `nameContains`
- Add boolean composites: `and`, `or`, `not` for combining filters
- Add `taskFilter` prop to `GanttChart` component
- Add public export from `gantt-lib/filters` module
- Add demo page with interactive filter examples

### Fixes
- Enhance demo filters with highlight behavior (filtered tasks are highlighted instead of hidden)
- Refine expired task logic in filters
- Fix hierarchy: prevent child tasks from moving when parent dates are edited via task list

### Documentation
- Add Section 7.3 "Task Filtering API" to REFERENCE.md with comprehensive examples
- Update ROADMAP.md, MILESTONES.md, PROJECT.md after Phase 22 completion

## [0.21.0] - 2026-03-18

### Features
- Add external duration labels for tasks - displays outside the task bar when duration text doesn't fit inside
- Improve TaskList UI: display "-" for empty progress, add "д" suffix for duration, bold dates for parent tasks
- Add custom weekend calendar examples to demo page

### Fixes
- Fix external label positioning and overflow handling
- Fix parent bar text overflow
- Adjust external labels alignment with task bar edge
- Position external labels relative to visual bar edge accounting for border-radius
- Clean up redundant margins on rightLabels flex children

## [0.20.0] - 2026-03-18

### Breaking Changes
- **Removed:** `weekends` and `workdays` props - replaced with unified `customDays` array
- **New:** `customDays?: CustomDayConfig[]` prop where `CustomDayConfig = { date: Date; type: 'weekend' | 'workday' }`
- Migration: replace `weekends={[date1, date2]}` with `customDays={[{ date: date1, type: 'weekend' }, { date: date2, type: 'weekend' }]}`

### Refactor
- Unify custom weekend/workday API into single `customDays` array with explicit type annotations
- Add `CustomDayConfig` interface and `createCustomDayPredicate` utility with O(1) Set-based lookup
- Update all components (GanttChart, TaskList, TaskListRow, Calendar, DatePicker) to use new API
- Preserve `isWeekend?: (date: Date) => boolean` prop for custom predicate logic

### Features
- Add priority order for custom days: workday > weekend > base predicate > default

### Fixes
- Update demo page to use new `customDays` API

### Tests
- Add 8 new unit tests for `createCustomDayPredicate` covering all scenarios

## [0.19.0] - 2026-03-18

### Features
- Add custom weekend calendar support with isCustomWeekend predicate
- Add createIsWeekendPredicate utility for flexible weekend patterns
- Add createDateKey utility for date-based lookups
- Add isWeekend prop to Calendar component
- Pass custom weekends to DatePicker in TaskList
- Add weekday headers (Mon-Sun) to Calendar component

### Fixes
- Use UTC dates for consistent weekend detection across timezones
- Remove unused custom weekends task lists and update GanttChart weekends

### Refactor
- Improve date utilities for custom weekend support

## [0.18.0] - 2026-03-17

### Features
- Remove nesting depth restrictions - tasks can now be nested at unlimited levels
- Add depth-based visual indentation for better hierarchy visualization

### Fixes
- Fix hierarchy vertical lines rendering at all nesting levels
- Fix demote logic to find previous task at same level
- Fix ancestorContinuesMap to check current.id instead of current.parentId
- Add explicit type annotations for TypeScript strict null checks

### Refactor
- Improve TaskListRow code structure and formatting

### Style
- Refine task progress display with conditional styling
- Comment out background color for parent rows

## [0.17.2] - 2026-03-17

### Style
- Adjust TaskList padding for improved layout

## [0.17.1] - 2026-03-17

### Features
- Add hierarchical task numbering in TaskList (1, 1.1, 1.2, etc.) with getTaskNumber function
- Task numbers now reflect parent-child relationships with proper indentation

### Fixes
- Revert ID column width to 32px and left-align drag handle for consistency

### Style
- Add left padding to task numbers and drag handle for better visual spacing

## [0.17.0] - 2026-03-17

### Features
- Interactive dependency edit popover with keyboard lag input and ± buttons
- Month view mode with "По месяцам" button on timeline
- Cascading parent position updates during task drag operations
- Cascade 100% progress to children when parent marked complete
- Native tooltip on dependency chips showing dependency details
- Task numbering by hierarchy level in task list
- Close button in dependency edit popover
- Fixed min-width for dependency chips to prevent layout shift

### Fixes
- Fix popover 3-line layout: task name / lag input / predecessor name
- Fix lag calculation display for SS/SF link types at zero lag
- Fix popover styling: unified font-size, color inheritance, proper spacing
- Fix cascade parent sync during child drag operations
- Fix month view styling: day width, year boundary lines, Russian month names
- Fix header separator lines: thin in row 2 only, thick separators full-height
- Fix dependency chip hover state and delete button positioning
- Fix predecessor-side delete button label ("× удалить")

### Style
- Update popover colors and font weights for better visual hierarchy
- Adjust chip min-width and center alignment
- Improve grid border colors and separator visibility
- Enhance task row hover state consistency

## [0.16.0] - 2026-03-16

### Features
- Add keyboard date input to DatePicker popup with segment navigation (dd.MM.yy)
- Auto-focus date input field when calendar popup opens
- Add day-shift buttons (-7, -1, +1, +7) flanking the date input field

### Fixes
- Fix fast-typing digit jump to year segment — segment position now tracked in refs, independent of DOM/rAF timing
- Remove printable key capture from TaskListRow — task name edit now only on F2 or double-click on name cell

### Style
- Reduce calendar max-height from 400px to 280px
- Stretch shift buttons to full calendar width with equal flex sizing
- Show date input border always; blue focus ring when active

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
