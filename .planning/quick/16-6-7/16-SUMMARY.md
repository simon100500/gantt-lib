---
phase: quick-16-6-7
plan: 16
subsystem: website-demo
tags: [demo, dependencies, construction-project]
dependency_graph:
  requires: []
  provides: [DEMO-01]
  affects: [packages/website/src/app/page.tsx]
tech_stack:
  added: []
  patterns: [FS dependency links, as const type narrowing]
key_files:
  created: []
  modified:
    - packages/website/src/app/page.tsx
decisions:
  - "Added dependencies only to tasks 2, 3, 8, 9, 10, 11, 12 — leaving tasks 4-7, 13-64 untouched per plan spec"
  - "Used 'FS' as const for each dependency to satisfy TypeScript strict mode"
metrics:
  duration: "3 min"
  completed: "2026-02-22"
  tasks: 1
  files: 1
---

# Phase Quick-16 Plan 16: Add Construction Project Dependencies Summary

**One-liner:** 7 FS dependency arrows added to the main Construction Project Gantt demo connecting preparatory-stage and earthwork tasks in a realistic construction sequence.

## What Was Done

Added `dependencies` arrays to 7 task objects in `createSampleTasks` inside `packages/website/src/app/page.tsx`. The links form two FS chains:

- **Preparatory chain:** 1 -> 2 -> 3 (Геодезическая разбивка -> Ограждение -> Временные дороги)
- **Earthwork chain:** 7 -> 8 -> 9 -> 10 -> 11 -> 12 (Мобильный кран -> Вывоз гумуса -> Срезка -> Планировка -> Разработка котлована -> Уплотнение)

## Dependency Pairs Added

| # | From Task | To Task | Link |
|---|-----------|---------|------|
| 1 | 1 - Геодезическая разбивка | 2 - Ограждение | FS |
| 2 | 2 - Ограждение | 3 - Временные дороги | FS |
| 3 | 7 - Мобильный кран | 8 - Вывоз гумуса | FS |
| 4 | 8 - Вывоз гумуса | 9 - Срезка растительного слоя | FS |
| 5 | 9 - Срезка | 10 - Планировка площадки | FS |
| 6 | 10 - Планировка | 11 - Разработка котлована | FS |
| 7 | 11 - Разработка котлована | 12 - Уплотнение основания | FS |

## Files Modified

- `packages/website/src/app/page.tsx` — added `dependencies` field to 7 task objects in `createSampleTasks`; no other functions or sections touched

## Verification

- `npx tsc --noEmit` in `packages/website` — exits with no errors (zero output)
- All 7 dependency entries use `type: 'FS' as const` for TypeScript strict mode compliance
- `createDependencyTasks` and `createCascadeTasks` are unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Commit

- `58041eb` feat(quick-16): add 7 FS dependency links to Construction Project demo

## Self-Check: PASSED

- packages/website/src/app/page.tsx — modified (confirmed via Read)
- Commit 58041eb — exists (confirmed via git log)
- TypeScript compiles cleanly (confirmed via tsc --noEmit with zero output)
