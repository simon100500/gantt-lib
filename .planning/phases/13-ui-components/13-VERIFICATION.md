# Phase 13: UI Components — Verification

## Goal

Verify that shadcn/ui-based DatePicker and Input components work correctly in TaskList with proper styling and cross-browser consistency.

## Verification Checklist

### Build & Install
- [ ] `pnpm install` completes without errors
- [ ] `pnpm build` completes without errors
- [ ] No TypeScript errors
- [ ] Bundle size increased by < 30KB gzipped

### Component Functionality
- [ ] Input component renders without errors
- [ ] Input accepts `value`, `onChange`, `placeholder`, `className` props
- [ ] Input shows focus ring on focus
- [ ] DatePicker renders without errors
- [ ] DatePicker accepts ISO date string (YYYY-MM-DD)
- [ ] DatePicker displays date in DD.MM.YYYY format
- [ ] Clicking DatePicker opens calendar popup
- [ ] Calendar shows correct month/year
- [ ] Calendar navigation (prev/next month) works
- [ ] Clicking a date selects it and closes popup
- [ ] Today's date is highlighted in calendar
- [ ] Selected date is highlighted in calendar

### TaskList Integration
- [ ] TaskList name editing uses Input component
- [ ] TaskList date editing uses DatePicker component
- [ ] Name edit mode shows styled input with focus ring
- [ ] Date edit mode shows styled date picker
- [ ] Date picker popup appears above/below input (no clip)
- [ ] Changing name via Enter saves correctly
- [ ] Changing date via calendar saves correctly
- [ ] Task duration is preserved when changing start date (existing behavior)
- [ ] Task duration is preserved when changing end date (existing behavior)

### Visual & Cross-Browser
- [ ] Components look consistent with gantt-lib design
- [ ] Input border color matches theme
- [ ] Focus ring color matches theme
- [ ] Calendar popup shadow and border look polished
- [ ] Selected date background matches theme blue (#3b82f6)
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

### Theming
- [ ] CSS variables are defined with `--gantt-` prefix
- [ ] CSS variables can be overridden by users
- [ ] Components respect user-defined CSS variables

### Exports
- [ ] Input is exported from 'gantt-lib'
- [ ] DatePicker is exported from 'gantt-lib'
- [ ] Calendar is exported from 'gantt-lib'
- [ ] Popover is exported from 'gantt-lib'
- [ ] Button is exported from 'gantt-lib'
- [ ] TypeScript types are exported

## Manual Testing Steps

1. Open demo page with TaskList
2. Click on a task name cell → should see styled Input
3. Type new name and press Enter → name should update
4. Click on a date cell → should see DatePicker
5. Click on DatePicker → calendar popup should appear
6. Navigate months using prev/next buttons
7. Click a date → popup closes, date updates
8. Verify task duration preserved (other date shifts accordingly)

## Rollback Criteria

If any of these occur, consider rollback:
- Bundle size increase > 50KB gzipped
- Components broken in any major browser
- Performance degradation (lag, jank)
- Breaking changes to existing API
- Cannot ship due to unresolved bugs
