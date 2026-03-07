---
phase: 16
slug: adding-tasks
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `packages/gantt-lib/vitest.config.ts` |
| **Quick run command** | `cd packages/gantt-lib && npx vitest run` |
| **Full suite command** | `cd packages/gantt-lib && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/gantt-lib && npx vitest run`
- **After every plan wave:** Run `cd packages/gantt-lib && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | onAdd/onDelete props | unit | `cd packages/gantt-lib && npx vitest run --reporter=verbose src/__tests__/addDeleteTask.test.ts` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | GanttChart handleDelete cleanup | unit | `cd packages/gantt-lib && npx vitest run --reporter=verbose src/__tests__/addDeleteTask.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | NewTaskRow ghost row | unit | `cd packages/gantt-lib && npx vitest run --reporter=verbose src/__tests__/addDeleteTask.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | Blur/Enter confirmedRef guard | unit | `cd packages/gantt-lib && npx vitest run --reporter=verbose src/__tests__/addDeleteTask.test.ts` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 2 | Trash hover visibility | manual | See manual verifications table | N/A | ⬜ pending |
| 16-03-02 | 03 | 2 | Button gating on callback presence | unit | `cd packages/gantt-lib && npx vitest run --reporter=verbose src/__tests__/addDeleteTask.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/__tests__/addDeleteTask.test.ts` — unit tests for task build logic, dependency cleanup, callback gating, confirmedRef double-confirm guard

*Existing vitest infrastructure covers the framework — only the test file is new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Trash icon appears on row hover, disappears on mouse-leave | CSS hover pattern | CSS :hover not testable in unit env | Hover over task row in dev build; verify icon opacity transitions |
| Ghost row appears below task list on "+" click with input focused | DOM focus behavior | auto-focus via useEffect not reliable in jsdom | Click "+" button; verify new row appears at bottom with cursor in name input |
| Enter saves task, Escape cancels — ghost row disappears | Keyboard UX | Requires real render with @testing-library | Type in ghost row; press Enter → row gone, task appears; test Escape → row gone, no task |
| No layout shift on trash hover (row columns stay stable) | CSS positioning | Visual regression, no unit equivalent | Open Storybook/dev; hover rows; verify name/date cells don't shift |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
