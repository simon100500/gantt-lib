# Changelog

## [0.3.1] - 2026-03-04

### Fixes
- Fix isExpired calculation to properly exclude current day from elapsed time
- Fix taskDuration calculation to include end date (+1 day)
- Fix isTaskEndingTodayOrTomorrow condition (use === instead of <=)
- Remove incorrect "future task" early return that was skipping expiration check

### Tests
- Add failing tests for isExpired edge cases
- Add test for visual bug case (15.02-11.03 with 70% progress)

### Refactor
- Remove debug logging from handleTaskChange

## [0.3.0] - 2026-03-03

### Features
- Add time-based expired task coloring with red progress bar
- Add option to enable/disable expired task highlighting

### Fixes
- Fix dark red progress bar for expired tasks
- Fix multiply blend mode for clean red color
- Fix simple red overlay for expired tasks

## [0.2.1] - 2026-02-28

### Fixes
- Fix cascade calculation for FF dependency links
- Fix lag label direction-aware vertical positioning

## [0.2.0] - 2026-02-22

### Features
- Add dependency lines visualization with Bezier curves
- Add support for FS, SS, FF, SF link types
- Add cascade drag functionality
- Add lag display on dependency connection lines

## [0.1.2] - 2026-02-19

### Features
- Add external date labels for task bars
- Add drag guide lines
- Add sticky header for vertical scrolling
- Add vertical divider lines

## [0.1.1] - 2026-02-19

### Fixes
- Fix month names to use nominative case with capital letter
- Fix DependencyLines component arrowhead and path start position
- Fix FS negative-lag drag snap-back behavior
- Add disableConstraints toggle for constraint-free editing

## [0.1.0] - 2026-02-18

### Features
- Initial release
- Basic Gantt chart rendering with task bars
- Drag-and-drop task movement and resizing
- Progress bar display
- Time scale header with months and days
- Weekend highlighting
- Today indicator
