# Phase 13: UI Components — Context

## Problem

TaskList (Phase 12) uses native HTML inputs:
- `<input type="date">` — inconsistent across browsers, ugly in some
- `<input type="text">` — plain, no focus states, no visual polish

Users expect modern, polished UI components.

## Solution

Use **shadcn/ui** patterns (copy-paste components, not npm package):

### Why shadcn/ui?

| Factor | shadcn/ui | Alternatives |
|--------|-----------|--------------|
| Runtime dependency | **None** (copy-paste) | MUI: 100KB+, Radix: headless |
| Bundle size | ~24KB (react-day-picker + radix primitives) | react-day-picker alone: 16KB |
| Customization | **Full** (code is yours) | Headless: need to style everything |
| Maintenance | You own the code | Managed by library maintainers |

### Approach

1. Copy component code from shadcn/ui (or write similar patterns)
2. Install runtime dependencies only: `react-day-picker`, `@radix-ui/react-popover`
3. Style with CSS variables matching gantt-lib theme
4. Integrate into TaskListRow

## Components to Create

```
packages/gantt-lib/src/components/ui/
├── Input.tsx       # Styled text input
├── Button.tsx      # Simple button (calendar nav)
├── Popover.tsx     # Radix Popover wrapper
├── Calendar.tsx    # react-day-picker wrapper
├── DatePicker.tsx  # Input + Popover + Calendar
├── ui.css          # Component styles
└── index.ts        # Exports
```

## Design System

Use CSS variables for theming (users can override):

```css
--gantt-input-bg
--gantt-input-border
--gantt-input-focus-ring
--gantt-popover-bg
--gantt-calendar-day-selected
/* ... */
```

## Existing Project Assets

- `date-fns` already installed (use for formatting)
- `dateUtils.ts` has parseUTCDate, formatDateLabel
- TaskList component structure ready

## Success Metric

TaskList with modern, polished date picker and input that works consistently across browsers.
