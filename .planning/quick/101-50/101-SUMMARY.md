---
phase: quick-101
plan: "01"
subsystem: website/demo
tags: [demo, dataset, hierarchy, dependencies]
key-files:
  modified:
    - packages/website/src/app/page.tsx
decisions:
  - Replaced flat 23-task demo with structured 50-task construction project using parentId nesting
  - Kept function signature identical (const createSampleTasks = (): Task[] => {})
  - Removed unused baseDate/pad/addDays helpers from function body
metrics:
  duration: "~2 minutes"
  completed: "2026-03-15"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 101: Replace createSampleTasks with 50-task construction project

**One-liner:** 50-task construction project dataset with 8 parent groups, parentId hierarchy, all 4 dependency types (FS/SS/FF/SF), and mixed progress/color/divider/locked fields.

## What Was Done

Replaced the old flat 23-task `createSampleTasks()` function body in `packages/website/src/app/page.tsx` with a rich 50-task construction project organized into 8 collapsible parent groups.

## Task Breakdown

| Group | Name | Parent + Children |
|-------|------|-------------------|
| g1 | Подготовительные работы | 1 + 5 = 6 tasks |
| g2 | Земляные работы | 1 + 5 = 6 tasks |
| g3 | Фундамент | 1 + 7 = 8 tasks |
| g4 | Каркас здания | 1 + 6 = 7 tasks |
| g5 | Кровля | 1 + 4 = 5 tasks |
| g6 | Наружные стены и фасад | 1 + 5 = 6 tasks |
| g7 | Инженерные сети | 1 + 5 = 6 tasks |
| g8 | Внутренняя отделка и сдача | 1 + 5 = 6 tasks |
| **Total** | | **8 + 42 = 50 tasks** |

## Dependency Coverage

- **FS** (Finish-to-Start): 23 occurrences
- **SS** (Start-to-Start): 13 occurrences
- **FF** (Finish-to-Finish): 5 occurrences
- **SF** (Start-to-Finish): 1 occurrence (g7-5 depends on g7-4 with SF lag 0)

## Visual Variety

- `divider: 'top'` on all 7 non-first parent groups
- Colors: `#4ade80` (g2-4), `#60a5fa` (g3-3), `#f59e0b` (g3-6), `#a78bfa` (g6-5), `#38bdf8` (g7-4)
- `locked: true` on g1 parent
- `accepted: true` on all completed tasks (groups 1 and 2)
- Progress values spanning 0-100% reflecting realistic construction phases

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Description |
|------|-------------|
| 2ec54eb | feat(quick-101): replace createSampleTasks with 50-task construction project |
