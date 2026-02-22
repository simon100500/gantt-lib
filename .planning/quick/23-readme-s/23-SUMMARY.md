---
phase: quick-023
plan: 23
subsystem: Documentation
tags: [documentation, readme, dependencies, api]
dependency_graph:
  requires: []
  provides: [README documentation for dependency features]
  affects: [User experience, developer onboarding]
tech_stack:
  added: []
  patterns: []
key_files:
  created: [.planning/quick/23-readme-s/23-SUMMARY.md]
  modified: [packages/gantt-lib/README.md]
decisions: []
metrics:
  duration: 65s
  completed_date: 2026-02-22
---

# Phase quick-023 Plan 23: README dependency documentation summary

Updated README.md to document recently added dependency features: task dependencies (FS/SS/FF/SF link types), cascade scheduling, constraint enforcement, and validation.

## One-liner

Added comprehensive README documentation for the dependency system including all 4 link types (FS, SS, FF, SF), TaskDependency interface, cascade scheduling props, validation API, and practical code examples.

## Changes Made

### Task 1: Add dependency system documentation to README
- Added Dependencies section after Task interface documentation
- Documented all 4 link types (FS, SS, FF, SF) with clear explanations
- Added TaskDependency interface documentation
- Explained lag (positive for delay, negative for overlap)
- Included code example showing FS dependency usage

### Task 2: Add cascade scheduling and constraint props to GanttChart API
- Updated GanttChart props table with new dependency-related props:
  - `enableAutoSchedule`: Enable cascade scheduling
  - `onCascade`: Callback when cascade drag completes
  - `disableConstraints`: Disable constraint checking during drag
  - `onValidateDependencies`: Callback for validation results
  - `headerHeight`: Header row height
  - `containerHeight`: Container height for vertical scrolling
- Added Cascade Scheduling section explaining hard mode vs soft mode

### Task 3: Add comprehensive dependency examples to README
- Added Dependency Examples section with practical examples:
  - Simple FS dependency
  - SS with negative lag (overlap)
  - Multiple dependencies
  - Mixed link types
- Added Dependency Validation section with ValidationResult interface
- Added onValidateDependencies callback example

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- bf93e51: feat(quick-023): add dependency system documentation to README
- 11c5890: feat(quick-023): add cascade scheduling and constraint props to GanttChart API
- 828b404: feat(quick-023): add comprehensive dependency examples to README

## Files Modified

- packages/gantt-lib/README.md (+195 lines)

## Verification

- README documents Task.dependencies field with TaskDependency interface
- All 4 link types (FS, SS, FF, SF) are explained with use cases
- GanttChart props table includes enableAutoSchedule, onCascade, disableConstraints, onValidateDependencies, headerHeight, containerHeight
- Code examples show practical dependency usage
- Dependency validation is documented

## Self-Check: PASSED

All claimed commits exist:
- bf93e51 exists
- 11c5890 exists
- 828b404 exists

All modified files exist:
- packages/gantt-lib/README.md exists and contains dependency documentation
