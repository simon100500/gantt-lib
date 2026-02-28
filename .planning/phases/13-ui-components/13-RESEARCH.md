# Phase 13: UI Components — Research

## Task

Replace native `<input type="date">` and `<input type="text">` with polished shadcn/ui-style components.

## Questions Answered

### 1. Which UI library to use?

**Answer:** shadcn/ui pattern (copy-paste components)

**Reasoning:**
- shadcn/ui is not a library — it's a collection of components you copy into your project
- Runtime dependencies only: react-day-picker (~16KB), @radix-ui/react-popover (~3KB)
- Alternative: MUI (~100KB+) too heavy for a lightweight gantt library
- Alternative: Headless (Radix alone) requires full styling from scratch

### 2. What dependencies are needed?

**Already installed:**
- `date-fns`: ^4.1.0 ✓ (use for formatting)

**Need to install:**
- `react-day-picker`: ^8.10.0 — calendar component
- `@radix-ui/react-popover`: ^1.x — dropdown/popover for calendar

### 3. How to integrate with existing code?

**Current code:**
```tsx
<input
  type="date"
  value={startDateISO}
  onChange={handleStartDateChange}
  className="gantt-tl-date-picker"  // transparent overlay
/>
```

**New code:**
```tsx
<DatePicker
  value={task.startDate}
  onChange={(date) => handleStartDateChange(date)}
  format="dd.MM.yyyy"
  className="gantt-tl-date-picker"
/>
```

The `handleStartDateChange` logic remains the same (shifts whole task preserving duration).

### 4. Styling approach?

Use CSS variables for theming — matches existing gantt-lib pattern:

```css
:root {
  --gantt-input-bg: #ffffff;
  --gantt-input-border: #d1d5db;
  --gantt-calendar-day-selected: #3b82f6;
  /* ... */
}
```

Users can override these variables to customize the library.

### 5. Bundle size impact?

| Package | Size (gzipped) |
|---------|----------------|
| react-day-picker | ~16KB |
| @radix-ui/react-popover | ~3KB |
| Component code | ~5KB |
| **Total** | **~24KB** |

Acceptable for a date picker + input system.

## Implementation Strategy

1. Copy shadcn/ui component patterns into `src/components/ui/`
2. Wrap react-day-picker in styled component
3. Create DatePicker (Input + Popover + Calendar)
4. Replace native inputs in TaskListRow
5. Export from library (optional: users can use components too)

## Open Questions

None — approach is clear.
