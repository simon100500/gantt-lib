---
phase: 13-ui-components
verified: 2026-02-28T12:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Open demo, click a date cell — calendar popup appears"
    expected: "Radix Popover opens below the date trigger button with month/year header, prev/next navigation, and day grid"
    why_human: "Runtime DOM behavior: portal rendering, z-index stack, popover positioning cannot be verified statically"
  - test: "Click a date in the calendar — popup closes and date updates"
    expected: "Popover closes, trigger button shows newly selected date in dd.MM.yy format, task dates update in the gantt bar"
    why_human: "React state update + Radix controlled-open flow requires live execution"
  - test: "Click a task name cell — styled Input overlays the name"
    expected: "Input with blue border appears above cell, text is selected, Enter saves, Escape cancels"
    why_human: "Focus management and input overlay z-index require visual inspection"
  - test: "Change start date — verify end date shifts to preserve duration"
    expected: "If task was 5 days long, new end = new start + 5 days"
    why_human: "Data correctness under the preserved-duration logic requires running the component"
  - test: "Cross-browser: open calendar in Firefox, Safari, Edge"
    expected: "Calendar renders identically; no native date picker chrome appears"
    why_human: "Browser-specific rendering cannot be verified statically"
---

# Phase 13: UI Components Verification Report

**Phase Goal:** Replace native date/text inputs in TaskList with styled shadcn/ui-based components (DatePicker and Input) for consistent, cross-browser UI with minimal bundle size impact.
**Verified:** 2026-02-28T12:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dependencies installed (`react-day-picker`, `@radix-ui/react-popover`) | VERIFIED | Both in `package.json` dependencies and `pnpm-lock.yaml` at exact versions 9.14.0 / 1.1.15 |
| 2 | All UI component files exist and are substantive | VERIFIED | `Input.tsx` (27L), `Button.tsx` (38L), `Popover.tsx` (77L), `Calendar.tsx` (48L), `DatePicker.tsx` (100L), `index.ts`, `ui.css` (366L) — all present and non-trivial |
| 3 | DatePicker shows calendar popup on click (Popover + Calendar wired) | VERIFIED | `DatePicker.tsx` composes `Popover`/`PopoverTrigger`/`PopoverContent` + `Calendar` with `mode="single"`, `selected`, `onSelect`; `portal={true}` in TaskListRow for z-index safety |
| 4 | DatePicker accepts ISO strings and returns ISO strings | VERIFIED | Parses `value` as `new Date(value + 'T00:00:00Z')`; `handleSelect` builds ISO string via `getFullYear/getMonth/getDate`; no ChangeEvent wrapper |
| 5 | Input supports standard HTML input props | VERIFIED | `InputProps extends React.InputHTMLAttributes<HTMLInputElement>`, forwardRef, spreads `...props` |
| 6 | CSS variables with `gantt-` prefix are defined | VERIFIED | `ui.css` defines 11 CSS variables under `:root` with `--gantt-input-*`, `--gantt-popover-*`, `--gantt-calendar-*` prefixes |
| 7 | TaskList name editing uses Input component | VERIFIED | `TaskListRow.tsx` imports `Input`, renders `<Input ref={nameInputRef} ... className="gantt-tl-name-input">` inside `editingName` branch |
| 8 | TaskList date editing uses DatePicker component | VERIFIED | `TaskListRow.tsx` imports `DatePicker`, renders it for both start and end date cells with `onChange={handleStartDateChange}` / `onChange={handleEndDateChange}` (string-typed handlers) |
| 9 | Components exported from `gantt-lib` | VERIFIED | `src/index.ts` exports `Input`, `Button`, `Popover`, `PopoverTrigger`, `PopoverContent`, `Calendar`, `DatePicker` with types; confirmed in `dist/index.d.ts` |
| 10 | Bundle size increase within budget | VERIFIED | `dist/styles.css` = 23 KB uncompressed; JS bundles = 87 KB (CJS) / 81 KB (ESM) uncompressed; SUMMARY reports ~19 KB gzipped total increase (under 30 KB budget) |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/gantt-lib/src/components/ui/Input.tsx` | Styled text input with forwardRef | VERIFIED | 27 lines; `forwardRef`, `gantt-input` class, `InputProps extends React.InputHTMLAttributes` |
| `packages/gantt-lib/src/components/ui/Button.tsx` | Button with variant/size props | VERIFIED | 38 lines; variant (default/ghost/outline), size (default/sm/icon), forwardRef |
| `packages/gantt-lib/src/components/ui/Popover.tsx` | Radix UI Popover wrapper | VERIFIED | 77 lines; wraps `@radix-ui/react-popover`, exposes `Popover`, `PopoverTrigger`, `PopoverContent` with portal support |
| `packages/gantt-lib/src/components/ui/Calendar.tsx` | react-day-picker v9 wrapper | VERIFIED | 48 lines; wraps `DayPicker` with full `gantt-calendar-*` classNames mapping for v9 API |
| `packages/gantt-lib/src/components/ui/DatePicker.tsx` | Composite DatePicker (Popover + Calendar) | VERIFIED | 100 lines; ISO in/out, `dd.MM.yyyy` display format default, `portal` prop, `useCallback` handler |
| `packages/gantt-lib/src/components/ui/index.ts` | Barrel export for ui components | VERIFIED | Exports all 5 components with TypeScript types |
| `packages/gantt-lib/src/components/ui/ui.css` | Gantt-themed CSS for all components | VERIFIED | 366 lines; Input, Button, Popover, DatePicker trigger, Calendar (v9 day_button architecture) all styled |
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | Uses Input and DatePicker | VERIFIED | Imports both, Input in name edit branch, DatePicker in both date cells with correct string onChange handlers |
| `packages/gantt-lib/src/index.ts` | Library exports include UI components | VERIFIED | 5 UI components + types exported at lines 16–20 |
| `packages/gantt-lib/package.json` | New dependencies present | VERIFIED | `@radix-ui/react-popover@^1.1.15` and `react-day-picker@^9.14.0` in `dependencies` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TaskListRow.tsx` | `Input` component | `import { Input } from '../ui/Input'` | WIRED | Input rendered at line 108; ref forwarded; `onKeyDown`, `onBlur`, `onChange` handlers all connected |
| `TaskListRow.tsx` | `DatePicker` component | `import { DatePicker } from '../ui/DatePicker'` | WIRED | DatePicker rendered at lines 129 and 139; `onChange` connected to `handleStartDateChange`/`handleEndDateChange` (string type) |
| `DatePicker.tsx` | `Calendar` component | `import { Calendar } from './Calendar'` | WIRED | Calendar rendered inside `PopoverContent` with `mode="single"`, `selected={selectedDate}`, `onSelect={handleSelect}` |
| `DatePicker.tsx` | `Popover` components | `import { Popover, PopoverTrigger, PopoverContent } from './Popover'` | WIRED | Full Popover composition: Root wraps Trigger (button) + Content (Calendar); `portal={true}` plumbed through |
| `Popover.tsx` | `@radix-ui/react-popover` | `import * as RadixPopover from '@radix-ui/react-popover'` | WIRED | `RadixPopover.Root`, `RadixPopover.Trigger`, `RadixPopover.Content`, `RadixPopover.Portal` all used |
| `Calendar.tsx` | `react-day-picker` | `import { DayPicker } from 'react-day-picker'` | WIRED | `DayPicker` rendered with full v9 `classNames` object (15 keys) mapping to `gantt-calendar-*` classes |
| `styles.css` | `ui.css` | `@import './components/ui/ui.css'` | WIRED | Import at line 3 of `styles.css`; confirmed 89 `gantt-calendar/input/popover/datepicker` class occurrences in `dist/styles.css` |
| `src/index.ts` | `dist/index.d.ts` | tsup build | WIRED | All 5 UI component types confirmed exported in built declaration file |

---

### Requirements Coverage

Phase 13 has no formal requirement IDs (`requirements: null` in PLAN frontmatter). This is an internal UX improvement with success criteria as the contract.

| Success Criterion | Status | Evidence |
|-------------------|--------|---------|
| shadcn/ui components in `src/components/ui/` | SATISFIED | All 5 components + barrel export + CSS present |
| Dependencies installed: `react-day-picker`, `@radix-ui/react-popover` | SATISFIED | In `package.json` dependencies + lockfile |
| TaskListRow uses new Input and DatePicker | SATISFIED | Imports and renders both; native `<input type="date">` replaced |
| CSS variables with `gantt-` prefix | SATISFIED | 11 CSS variables in `ui.css` under `:root` |
| Bundle size increase < 30 KB gzipped | SATISFIED | ~19 KB gzipped per SUMMARY (commit-verified build) |
| Cross-browser (Chrome, Firefox, Safari, Edge) | NEEDS HUMAN | Cannot verify statically — see Human Verification section |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DatePicker.tsx` | 4 | `parse` imported from `date-fns` but never called | Info | Dead import — tree-shaking removes it from bundle; no functional impact |

No placeholder returns, no console.log-only handlers, no TODO/FIXME blockers found in any phase-13 files.

---

### Deviations From Plan (Adapted Successfully)

1. **react-day-picker v9 instead of v8** — Plan referenced v8 hooks API. v9 was installed. `Calendar.tsx` uses v9's `classNames` prop with `rdp-*` key names (`day_button`, `month_caption`, `button_previous`, etc.) instead of the planned v8 hook-based approach. CSS targets `gantt-calendar-day-button` (not `gantt-calendar-day`) for click styling — this is correct for v9. VERIFIED the CSS selectors match the v9 classNames mapping.

2. **DatePicker trigger is a `<button>` not `<input>`** — Plan sketched an input-style trigger. Implementation uses a `<button class="gantt-datepicker-trigger">` which avoids native browser date picker chrome entirely. Better for cross-browser consistency. VERIFIED in `DatePicker.tsx` line 71.

3. **`onChange` signature is `string` not `ChangeEvent`** — Plan showed wrapping the date in a synthetic event. Implementation simplified to plain `string`. `TaskListRow` handlers (`handleStartDateChange`, `handleEndDateChange`) correctly typed as `(newDateISO: string) => void`. VERIFIED.

4. **Format is `dd.MM.yy` (2-digit year) in TaskListRow** — DatePicker default is `dd.MM.yyyy` but TaskListRow passes `format="dd.MM.yy"` matching the existing `formatShortDate` convention. VERIFIED.

---

### Human Verification Required

#### 1. Calendar Popup Opens and Renders

**Test:** Click on any date cell in the TaskList
**Expected:** Radix Popover opens below the trigger button showing a calendar with month/year header, prev/next chevron buttons, weekday row, and a 7-column day grid; today's date highlighted in blue-tinted background
**Why human:** Radix Popover portal rendering, z-index stacking above the gantt chart, and react-day-picker v9 DOM output require live execution

#### 2. Date Selection Closes Popup and Updates Task

**Test:** Open calendar popup, click any day
**Expected:** Popup closes immediately; trigger button updates to new date in `dd.MM.yy` format; the gantt bar for that task shifts accordingly
**Why human:** Controlled `open` state + `handleSelect` closing flow requires runtime verification

#### 3. Preserve-Duration Behavior on Date Change

**Test:** Note a task duration (e.g. 5 days), change start date via DatePicker, check end date
**Expected:** End date shifts so the task is still 5 days long (same as drag-move behavior)
**Why human:** The `durationMs` preservation math in `handleStartDateChange`/`handleEndDateChange` needs functional testing with real dates

#### 4. Styled Name Input Overlay

**Test:** Click a task name cell
**Expected:** `Input` component appears as a blue-bordered overlay above the cell text; existing name is selected; Enter saves, Escape cancels
**Why human:** `useEffect` focus + `nameInputRef.current.select()` behavior, z-index overlap with gantt cells

#### 5. Cross-Browser Calendar Appearance

**Test:** Open calendar in Firefox, Safari, and Edge
**Expected:** Calendar looks consistent; no native OS date picker appears at any point
**Why human:** Browser rendering of Radix Popover and react-day-picker v9 requires manual inspection

---

### Gaps Summary

No gaps found. All 10 must-haves are fully verified at all three levels (exists, substantive, wired). The five commits documented in the SUMMARY are confirmed in git history. TypeScript compilation produces zero errors in any phase-13 source file. The built distribution (`dist/`) includes UI component code in JS and CSS output.

The sole non-issue found is an unused `parse` import in `DatePicker.tsx` (tree-shaken by bundler, no functional impact).

Five items require human testing at runtime because they involve DOM behavior, Radix Popover animation, z-index stacking, and browser-specific rendering.

---

_Verified: 2026-02-28T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
