---
phase: 18
slug: tasks-order
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (jsdom environment) |
| **Config file** | `packages/gantt-lib/vitest.config.ts` |
| **Quick run command** | `cd packages/gantt-lib && npm test` |
| **Full suite command** | `cd packages/gantt-lib && npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/gantt-lib && npm test`
- **After every plan wave:** Run `cd packages/gantt-lib && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 0 | REORDER-01 | unit | `cd packages/gantt-lib && npm test -- --reporter=verbose` | ❌ Wave 0 | ⬜ pending |
| 18-01-02 | 01 | 0 | REORDER-02 | unit | `cd packages/gantt-lib && npm test -- --reporter=verbose` | ❌ Wave 0 | ⬜ pending |
| 18-01-03 | 01 | 0 | REORDER-03 | unit | `cd packages/gantt-lib && npm test -- --reporter=verbose` | ❌ Wave 0 | ⬜ pending |
| 18-01-04 | 01 | 1 | REORDER-04 | manual | N/A | N/A | ⬜ pending |
| 18-01-05 | 01 | 1 | REORDER-05 | manual | N/A | N/A | ⬜ pending |
| 18-01-06 | 01 | 1 | REORDER-06 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/__tests__/reorderTasks.test.ts` — unit tests for REORDER-01, REORDER-02, REORDER-03

*All other test infrastructure exists: vitest.config.ts, jsdom environment, existing test files as reference.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| onDragOver without preventDefault disables drop | REORDER-04 | Browser behavior, not testable in jsdom | Try dragging a row — if drop never fires, check onDragOver |
| Escape cancel does not call onReorder | REORDER-05 | Requires real DnD interaction | Start drag, press Escape, verify task stays at original position and onReorder is not called |
| Moved task is selected after drop | REORDER-06 | Requires real DnD interaction | Drag task from row 2 to row 4, verify task is highlighted/selected in both TaskList and chart |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
