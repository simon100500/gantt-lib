---
phase: 27
slug: core-refactor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | packages/gantt-lib/vitest.config.ts |
| **Quick run command** | `cd packages/gantt-lib && npx vitest run --reporter=verbose 2>&1 | tail -20` |
| **Full suite command** | `cd packages/gantt-lib && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/gantt-lib && npx vitest run --reporter=verbose 2>&1 | tail -20`
- **After every plan wave:** Run `cd packages/gantt-lib && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | Core types | unit | `npx vitest run src/core/scheduling/__tests__/types.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | Date math | unit | `npx vitest run src/core/scheduling/__tests__/dateMath.test.ts` | ❌ W0 | ⬜ pending |
| 27-02-01 | 02 | 1 | Dependency extraction | unit | `npx vitest run src/core/scheduling/__tests__/dependencies.test.ts` | ❌ W0 | ⬜ pending |
| 27-02-02 | 02 | 1 | Cascade extraction | unit | `npx vitest run src/core/scheduling/__tests__/cascade.test.ts` | ❌ W0 | ⬜ pending |
| 27-03-01 | 03 | 2 | Command APIs | unit | `npx vitest run src/core/scheduling/__tests__/commands.test.ts` | ❌ W0 | ⬜ pending |
| 27-03-02 | 03 | 2 | UI rewire | unit | `npx vitest run` (full suite regression) | ✅ | ⬜ pending |
| 27-04-01 | 04 | 3 | Public exports | unit | `npx vitest run` (full suite regression) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/core/scheduling/__tests__/types.test.ts` — stubs for core types
- [ ] `packages/gantt-lib/src/core/scheduling/__tests__/dateMath.test.ts` — stubs for date math
- [ ] `packages/gantt-lib/src/core/scheduling/__tests__/dependencies.test.ts` — stubs for dependency functions
- [ ] `packages/gantt-lib/src/core/scheduling/__tests__/cascade.test.ts` — stubs for cascade functions
- [ ] `packages/gantt-lib/src/core/scheduling/__tests__/commands.test.ts` — stubs for command APIs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag/resize behavior unchanged | Behavior preservation | Requires browser interaction to verify smooth drag UX | Open demo page, drag tasks, verify same behavior as before extraction |
| TaskList date editing unchanged | Behavior preservation | Requires browser interaction for inline editing | Open demo page, edit dates in TaskList, verify same calculations |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
