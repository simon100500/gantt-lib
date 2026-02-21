---
phase: 06-dependencies
plan: 01
title: "Dependency Type Definitions and Core Utilities"
subsystem: "dependency-core"
one-liner: "Task dependency types with DFS-based cycle detection and Bezier curve calculation for visualization"
tags: ["dependencies", "types", "cycle-detection", "bezier", "validation"]

requires:
  - INT-05

provides:
  - Dependency type system (LinkType, TaskDependency, DependencyError, ValidationResult)
  - Cycle detection algorithm using depth-first search
  - Link type date calculation (FS, SS, FF, SF with lag support)
  - Dependency validation API
  - Bezier curve path calculation for future dependency visualization

affects:
  - Task interface extended with dependencies array
  - Utils module exports new dependency utilities

tech-stack:
  added:
    - "TypeScript union types for link types"
    - "DFS algorithm for cycle detection"
    - "SVG path generation for Bezier curves"
  patterns:
    - "UTC-safe Date arithmetic (following existing dateUtils pattern)"
    - "Math.round() for pixel values (following existing geometry pattern)"
    - "Simple, testable data structure returns"

key-files:
  created:
    - path: "packages/gantt-lib/src/utils/dependencyUtils.ts"
      lines: 165
      exports: ["buildAdjacencyList", "detectCycles", "calculateSuccessorDate", "validateDependencies", "getAllDependencyEdges"]
  modified:
    - path: "packages/gantt-lib/src/types/index.ts"
      added: ["LinkType", "TaskDependency", "DependencyError", "ValidationResult", "Task.dependencies?"]
      total_lines: 145
    - path: "packages/gantt-lib/src/utils/geometry.ts"
      added: ["calculateBezierPath"]
      total_lines: 219
    - path: "packages/gantt-lib/src/utils/index.ts"
      added: ["dependencyUtils export"]
      total_lines: 4

decisions: []

metrics:
  duration: "3 minutes"
  completed_date: "2026-02-21"
  tasks_completed: 3
  files_created: 1
  files_modified: 3
  total_lines_added: 247
---

# Phase 06-dependencies Plan 01: Dependency Type Definitions and Core Utilities Summary

## Overview

Extended the Task type with dependency definitions and implemented core dependency utilities including cycle detection, link type date calculations, and constraint validation. This enables tasks to define predecessor relationships with support for all four PM link types (FS, SS, FF, SF), lag values, and automatic detection of circular dependencies.

## Implementation Summary

### 1. Dependency Type Definitions

Added comprehensive TypeScript types for the dependency system:

- **LinkType**: Union type of 'FS' | 'SS' | 'FF' | 'SF' (finish-to-start, start-to-start, finish-to-finish, start-to-finish)
- **TaskDependency**: Interface defining a single predecessor relationship with taskId, type, and optional lag
- **DependencyError**: Interface for validation errors with type, taskId, message, and relatedTaskIds
- **ValidationResult**: Interface containing isValid flag and errors array
- **Task interface**: Extended with optional `dependencies?: TaskDependency[]` property

### 2. Dependency Utilities (dependencyUtils.ts)

Implemented core dependency management functions:

- **buildAdjacencyList()**: Constructs adjacency list representation of dependency graph
- **detectCycles()**: DFS-based cycle detection with path tracking for error reporting
- **calculateSuccessorDate()**: Applies link type logic (FS/SS/FF/SF) with lag support
- **validateDependencies()**: Validates missing-task references and circular dependencies
- **getAllDependencyEdges()**: Helper for rendering dependency connections

### 3. Bezier Curve Calculation

Added **calculateBezierPath()** to geometry.ts:

- Handles same-row connections using quadratic arc (Q command)
- Handles multi-row connections using cubic Bezier curves (C command)
- Control point offset proportional to vertical distance for natural curves
- Minimum 20px offset for same-row connections to prevent flat lines
- All coordinates rounded with Math.round() for clean rendering

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- [x] Task interface extended with dependencies?: TaskDependency[] property
- [x] All four link types (FS, SS, FF, SF) defined as LinkType union type
- [x] detectCycles() function correctly identifies circular dependencies using DFS
- [x] calculateSuccessorDate() applies link type logic with lag support
- [x] validateDependencies() returns ValidationResult with errors array
- [x] calculateBezierPath() generates SVG path strings for dependency visualization
- [x] All new exports available from gantt-lib package (via utils/index.ts)
- [x] Zero TypeScript errors in new files (pre-existing DragGuideLines export issue is out of scope)

## Self-Check: PASSED

### Files Created
- FOUND: packages/gantt-lib/src/utils/dependencyUtils.ts (165 lines)

### Files Modified
- FOUND: packages/gantt-lib/src/types/index.ts (added dependency types)
- FOUND: packages/gantt-lib/src/utils/geometry.ts (added calculateBezierPath)
- FOUND: packages/gantt-lib/src/utils/index.ts (added dependencyUtils export)

### Commits
- FOUND: 9d09370 - feat(06-01): add dependency type definitions
- FOUND: a81e297 - feat(06-01): add dependency utilities with cycle detection
- FOUND: 3336d9d - feat(06-01): add Bezier curve calculation and export dependency utilities

### TypeScript Verification
All new files compile without errors. Pre-existing DragGuideLines export issue (src/components/index.ts:6) is unrelated to this plan and was deferred per scope boundary rules.

---

*Execution time: 3 minutes*
*Phase: 06-dependencies, Plan: 01*
*Date: 2026-02-21*
