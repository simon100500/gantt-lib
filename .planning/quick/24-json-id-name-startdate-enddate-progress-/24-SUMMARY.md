---
phase: quick-24
plan: 24
subsystem: website/demo
tags: [export, json, clipboard, demo]
dependency_graph:
  requires: []
  provides: [json-export-button]
  affects: [packages/website/src/app/page.tsx]
tech_stack:
  added: []
  patterns: [useCallback, navigator.clipboard, blob-download-fallback]
key_files:
  created: []
  modified:
    - packages/website/src/app/page.tsx
decisions:
  - "useCallback for exportTasksAsJson with empty dep array — function is pure over taskList arg, no closure deps"
  - "navigator.clipboard primary path + Blob/anchor fallback for environments without clipboard API"
  - "accepted defaults to false (not undefined) and progress defaults to 0 per plan spec"
  - "lag defaults to 0 per dep in output regardless of source value"
metrics:
  duration: "41 seconds"
  completed: "2026-02-22"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 24: JSON Export Button Summary

**One-liner:** Export JSON button on Construction Project chart that copies all 22 tasks as a typed JSON array (id, name, startDate, endDate, progress, accepted, dependencies) to clipboard.

## What Was Built

Added an `exportTasksAsJson` function (implemented as `useCallback`) to `packages/website/src/app/page.tsx` and an "Export JSON" button below the Construction Project Gantt chart.

### Function behavior

- Maps every `Task` in the provided array to a plain object with exactly 7 fields: `id`, `name`, `startDate`, `endDate`, `progress`, `accepted`, `dependencies`
- `progress` defaults to `0` when not set on the task
- `accepted` defaults to `false` when not set on the task
- `dependencies` is always an array; each entry is `{taskId, type, lag}` where `lag` defaults to `0`
- Output is pretty-printed with `JSON.stringify(result, null, 2)`
- Primary path: copies to clipboard via `navigator.clipboard.writeText()` and shows `alert("JSON copied to clipboard!")`
- Fallback: creates a Blob, builds an object URL, triggers an `<a download="tasks.json">` click, then revokes the URL

### Button placement

Below the chart wrapper `<div>` in the Construction Project section (inside the outer `marginBottom: "3rem"` div), separated by `marginTop: "0.75rem"`.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Add exportTasksAsJson function and Export JSON button | DONE | 1a9b1c3 |

## Verification

- `npm run build -w packages/website` completed without TypeScript errors
- Build output: `✓ Compiled successfully` and `✓ Generating static pages (4/4)`
- All existing charts and handlers unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/website/src/app/page.tsx` — modified (confirmed)
- Commit `1a9b1c3` — confirmed via `git log`
