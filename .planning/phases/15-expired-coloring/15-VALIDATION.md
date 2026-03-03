---
phase: 15
slug: expired-coloring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Existing: Jest + @testing-library/react |
| **Config file** | jest.config.js (existing) |
| **Quick run command** | `npm test -- --testPathPattern=TaskRow` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=TaskRow`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | Expired detection logic | unit | `npm test -- expired` | ✅ existing | ⬜ pending |
| 15-01-02 | 01 | 1 | Red background styling | visual | `npm test -- expired-visual` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | highlightExpiredTasks prop | unit | `npm test -- prop-passing` | ✅ existing | ⬜ pending |
| 15-01-04 | 01 | 1 | React.memo optimization | unit | `npm test -- memo-optimization` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/TaskRow.test.tsx` — add visual test cases for expired task red background
- [ ] Verify existing test infrastructure covers new prop passing

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual appearance of expired tasks | Red background on expired tasks | Color rendering requires visual confirmation | 1. Create gantt with expired task (endDate < today, progress < 100%) <br> 2. Set highlightExpiredTasks={true} <br> 3. Verify red background on task bar |
| Toggle functionality | Switch works when changed | Interaction test | 1. Set highlightExpiredTasks={true} - verify red <br> 2. Set highlightExpiredTasks={false} - verify normal color |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
