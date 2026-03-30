---
phase: 25
slug: columns-refactoring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `packages/gantt-lib/vitest.config.ts` |
| **Quick run command** | `npm run test --workspace=packages/gantt-lib` |
| **Full suite command** | `npm run test --workspace=packages/gantt-lib` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test --workspace=packages/gantt-lib`
- **After every plan wave:** Run `npm run test --workspace=packages/gantt-lib`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | Column types | unit | `npm run test --workspace=packages/gantt-lib -- --run columns` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 1 | Resolver | unit | `npm run test --workspace=packages/gantt-lib -- --run resolveTaskListColumns` | ❌ W0 | ⬜ pending |
| 25-02-01 | 02 | 2 | Header render | unit | `npm run test --workspace=packages/gantt-lib -- --run TaskList` | ✅ | ⬜ pending |
| 25-02-02 | 02 | 2 | Row render | unit | `npm run test --workspace=packages/gantt-lib -- --run TaskListRow` | ✅ | ⬜ pending |
| 25-03-01 | 03 | 3 | Editor lifecycle | unit | `npm run test --workspace=packages/gantt-lib -- --run editor` | ❌ W0 | ⬜ pending |
| 25-04-01 | 04 | 4 | Generic typing | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/components/TaskList/columns/__tests__/resolveTaskListColumns.test.ts` — resolver unit tests
- [ ] `packages/gantt-lib/src/components/TaskList/columns/__tests__/createBuiltInColumns.test.tsx` — built-in column factory tests

*Existing test infrastructure (vitest + @testing-library/react) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Custom column renders visually in correct position | Column placement | Visual layout verification | Add custom column with `after: 'name'`, verify in browser it appears between Name and StartDate |
| Editor opens/closes with click interaction | Editor lifecycle | User interaction flow | Click editable custom cell, verify editor appears, click away, verify it closes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
