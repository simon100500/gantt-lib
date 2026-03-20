---
phase: 24
slug: buisiness-days
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (已在项目中使用) |
| **Config file** | `packages/gantt-lib/vitest.config.ts` |
| **Quick run command** | `npm test -- --run src/utils/dateUtils.test.ts` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run src/utils/dateUtils.test.ts`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | getBusinessDaysCount | unit | `npm test -- -t "getBusinessDaysCount"` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | addBusinessDays | unit | `npm test -- -t "addBusinessDays"` | ❌ W0 | ⬜ pending |
| 24-02-01 | 02 | 1 | businessDays prop | integration | `npm test -- -t "businessDays"` | ❌ W0 | ⬜ pending |
| 24-03-01 | 03 | 2 | TaskListRow integration | e2e | `npm test -- -t "TaskListRow.*businessDays"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/utils/__tests__/dateUtils.businessDays.test.ts` — stubs for getBusinessDaysCount, addBusinessDays
- [ ] `packages/gantt-lib/src/components/__tests__/GanttChart.businessDays.test.tsx` — integration test stubs
- [ ] `packages/gantt-lib/src/components/TaskList/__tests__/TaskListRow.businessDays.test.tsx` — TaskListRow integration stubs

*Existing infrastructure covers base utilities testing — see Phase 21 dateUtils tests for patterns.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Визуальная проверка duration в demo page | UI feedback | Requires browser interaction | 1. Set `businessDays={true}` 2. Create task Fri-Mon 3. Verify duration shows "2 days" 4. Edit duration to "4" 5. Verify endDate = Wed |
| Кастомный календарь + businessDays | Custom calendar integration | Complex scenario setup | 1. Set `customDays` with holidays 2. Set `businessDays={true}` 3. Verify holidays excluded from duration |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
