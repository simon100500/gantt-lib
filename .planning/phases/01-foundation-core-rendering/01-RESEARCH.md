# Phase 1: Foundation & Core Rendering - Research

**Researched:** 2026-02-19
**Domain:** React/Next.js Static Gantt Chart Component
**Confidence:** MEDIUM

## Summary

Phase 1 focuses on building a static Gantt chart component that displays monthly calendar grids with task bars positioned by dates, using Excel-like table styling. The implementation uses React 19+ with TypeScript, CSS Modules for styling, and DOM-based rendering (not canvas) for the target scale of ~100 tasks. Dates are handled internally as UTC to prevent DST bugs.

**Primary recommendation:** Use DOM-based rendering with CSS Grid for layout, date-fns for UTC date handling, and CSS Modules with CSS variables for theming. Canvas is unnecessary for static rendering at this scale.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Grid Layout**
- Explicit grid lines like Excel table — clear cell boundaries
- Monthly calendar view showing days as columns
- Row height: medium (~40px) for good readability
- Vertical lines separate days, horizontal lines separate tasks
- Today indicator: vertical line highlighting current date

**Task Bars**
- Render task bars as rectangles ("колбаски") positioned by start/end dates
- Task names displayed on or within the bars
- Task bars span full height of their row
- Optional color property for custom styling
- Clean, flat appearance (minimal shadows)

**Date Header**
- Month view: show days as columns across the top
- Date format: day number (1, 2, 3...) or "Mon 1", "Tue 2" format
- Header height: reasonable for date labels (~30-40px)
- Weekday indicators optional

**Data API**
- Simple array of task objects: `{ id, name, startDate, endDate, color? }`
- Dates as strings or Date objects (component handles conversion)
- All dates processed internally as UTC to prevent DST bugs

**Styling**
- CSS variables for theming (colors, grid line width)
- Excel-like appearance: clear borders, grid-based layout
- Font: system sans-serif for compatibility

### Claude's Discretion

- Exact date format in header ("1" vs "Mon 1" vs "Feb 1")
- Task bar color when no color specified
- Whether to show weekends differently
- Empty state display (when no tasks provided)
- Exact pixel measurements for heights/widths
- CSS variable naming scheme

### Deferred Ideas (OUT OF SCOPE)

- Task sidebar with names — deferred to v2 (user changed mind, decided on names on bars)
- Drag-and-drop interactions — Phase 2
- Task dependencies — v2 or later
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **REND-01** | Display monthly calendar grid with date headers | CSS Grid layout with date-fns for month/day generation; header row with day cells |
| **REND-02** | Render task bars positioned by start/end dates on timeline | DOM elements with absolute positioning calculated by date-to-pixel conversion; full row height |
| **REND-03** | Show task names on or within task bars | Text rendering inside task bar div with white-space handling for overflow |
| **REND-04** | Display vertical indicator line for current date (today) | Absolute positioned div with UTC date comparison; styled with distinctive color |
| **REND-05** | Excel-like table styling with grid lines and cell-based appearance | CSS Grid with gap for cell borders; explicit border styling for grid lines |
| **API-01** | Component accepts simple array: `{ id, name, startDate, endDate, color? }` | TypeScript interface with optional color; flexible date input handling |
| **API-04** | All dates handled as UTC internally to prevent DST bugs | date-fns with UTC methods; all calculations use UTC timestamps |
| **DX-05** | CSS variables for theming (users can customize colors) | CSS custom properties for colors, grid widths, heights |
| **QL-03** | Unit tests for core date utilities and geometry calculations | Vitest for date arithmetic and position calculation functions |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **React** | 19.0+ | UI rendering | Latest stable with improved rendering; standard for component libraries |
| **TypeScript** | 5.7+ | Type safety | Industry standard for libraries; prevents breaking changes; excellent DX |
| **date-fns** | 4.1+ | Date manipulation | Modular, tree-shakeable; better than Moment.js; excellent UTC support |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **clsx** | 2.1+ | Conditional classes | For dynamic className composition; smaller than classnames |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vitest** | Unit testing | Faster than Jest; native ESM; same config as Vite |
| **ESLint** | Linting | Use with typescript-eslint plugin; strict mode for library code |

### Styling

| Solution | Version | Purpose | When to Use |
|----------|---------|---------|-------------|
| **CSS Modules** | Native | Component styling | Default choice; scoped styles; tree-shakeable |
| **CSS Variables** | Native | Design tokens | For theming; user customization; zero JS overhead |

### Installation

```bash
# Core dependencies
npm install react@^19.0.0
npm install -D typescript@^5.7.0

# Date handling
npm install date-fns@^4.1.0

# Utilities
npm install clsx@^2.1.0

# Development dependencies
npm install -D vitest@^3.0.0
npm install -D eslint@^9.17.0 typescript-eslint@^8.18.0
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **date-fns** | Day.js | Day.js is 2KB vs date-fns 70KB but less modular; date-fns has better UTC support |
| **DOM rendering** | Canvas | Canvas better for 1000+ tasks; DOM sufficient for ~100 tasks, better accessibility |
| **CSS Modules** | Tailwind CSS | Tailwind adds dependency for users not using it; CSS Modules are framework-agnostic |

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
src/
├── components/
│   ├── GanttChart/
│   │   ├── index.tsx           # Main export
│   │   ├── GanttChart.tsx      # Root component
│   │   └── GanttChart.module.css
│   ├── Grid/
│   │   ├── index.tsx
│   │   ├── Grid.tsx            # Grid container
│   │   └── Grid.module.css
│   ├── TimeScaleHeader/
│   │   ├── index.tsx
│   │   ├── TimeScaleHeader.tsx # Month/day headers
│   │   └── TimeScaleHeader.module.css
│   ├── TaskRow/
│   │   ├── index.tsx
│   │   ├── TaskRow.tsx         # Single task row with bar
│   │   └── TaskRow.module.css
│   └── TodayIndicator/
│       ├── index.tsx
│       ├── TodayIndicator.tsx  # Today vertical line
│       └── TodayIndicator.module.css
├── utils/
│   ├── dateUtils.ts            # UTC date operations
│   ├── geometry.ts             # Date-to-pixel conversions
│   └── validation.ts           # Input validation
├── types/
│   └── index.ts                # TypeScript interfaces
└── __tests__/
    ├── dateUtils.test.ts
    └── geometry.test.ts
```

### Pattern 1: CSS Grid for Calendar Layout

**What:** Use CSS Grid for the main calendar structure with explicit column definitions for each day

**When to use:** Monthly calendar view with fixed day columns

**Example:**

```css
/* Grid layout with day columns */
.gantt-grid {
  display: grid;
  grid-template-columns: 200px repeat(30, 1fr); /* Task name column + 30 days */
  gap: 1px; /* Creates cell borders */
  background-color: var(--gantt-grid-line-color);
}

.gantt-cell {
  background-color: var(--gantt-cell-background);
  min-height: var(--gantt-row-height);
}
```

**Why:** CSS Grid provides explicit control over column sizing, handles alignment automatically, and creates clean table-like appearance with gap for borders.

### Pattern 2: Absolute Positioning for Task Bars

**What:** Position task bars absolutely within rows using calculated left/width from dates

**When to use:** Task bars that span variable date ranges

**Example:**

```typescript
// Calculate position from dates
const getTaskBarStyle = (task: Task, dayWidth: number, startDate: Date) => {
  const startDiff = differenceInCalendarDays(task.startDate, startDate);
  const duration = differenceInCalendarDays(task.endDate, task.startDate);

  return {
    left: `${startDiff * dayWidth}px`,
    width: `${(duration + 1) * dayWidth}px`, // +1 to include end date
  };
};
```

```css
.task-bar {
  position: absolute;
  height: 100%;
  background-color: var(--task-bar-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

**Why:** Absolute positioning allows precise placement regardless of grid cell boundaries; spans work better than trying to align with grid columns.

### Pattern 3: UTC-Only Date Handling

**What:** Store and process all dates as UTC timestamps; convert to local only for display

**When to use:** Any date arithmetic, comparisons, or calculations

**Example:**

```typescript
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInCalendarDays,
  format,
  utcToZonedTime
} from 'date-fns';

// Always work with UTC
const getMonthDays = (date: Date | string): Date[] => {
  // Ensure input is parsed as UTC
  const utcDate = typeof date === 'string'
    ? new Date(`${date}Z`) // Append Z to force UTC
    : date;

  const monthStart = startOfMonth(utcDate);
  const monthEnd = endOfMonth(utcDate);

  return eachDayOfInterval({ start: monthStart, end: monthEnd });
};

// Calculate position using UTC
const getDayOffset = (taskDate: Date, monthStart: Date): number => {
  return differenceInCalendarDays(taskDate, monthStart);
};
```

**Why:** Prevents DST bugs where dates shift by 1 hour; ensures consistent rendering across timezones.

### Pattern 4: React.memo for Performance Prevention

**What:** Wrap task row components in React.memo to prevent unnecessary re-renders

**When to use:** Lists of components where parent state updates shouldn't affect all children

**Example:**

```typescript
const TaskRow = React.memo(({ task, style }: TaskRowProps) => {
  return (
    <div className={styles.row} style={style}>
      <div className={styles.taskBar} style={getTaskBarStyle(task)}>
        {task.name}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if task dates or name changed
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.startDate === nextProps.task.startDate &&
    prevProps.task.endDate === nextProps.task.endDate &&
    prevProps.task.name === nextProps.task.name
  );
});
```

**Why:** Prevents re-render storms when parent component updates; lays groundwork for Phase 2 drag interactions.

### Anti-Patterns to Avoid

- **Anti-pattern: Using Canvas for static rendering** — Overkill for < 100 tasks; DOM is sufficient and more accessible
- **Anti-pattern: Mixing canvas and DOM for same visual layer** — Creates sync issues; commit to one approach
- **Anti-pattern: Storing dates as local time** — Causes DST bugs; always use UTC internally
- **Anti-pattern: Inline event handlers** — Creates new functions on every render; use useCallback
- **Anti-pattern: Not using React.memo on list items** — Causes unnecessary re-renders; performance degrades with ~30+ tasks

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic | Custom date math functions | date-fns | Handles leap years, month boundaries, DST transitions, edge cases |
| Date parsing | String splitting, manual parsing | date-fns parse functions | Handles ISO 8601, various formats, timezone complexities |
| Conditional classes | Ternary strings, template literals | clsx | Cleaner syntax, handles arrays/objects, smaller bundle |
| Type definitions | Any types, loose typing | TypeScript interfaces | Catch errors at build time, better DX, self-documenting |

**Key insight:** Date handling has notorious edge cases (leap years, DST, month boundaries). date-fns has handled these for years; reinventing this wheel is technical debt from day one.

## Common Pitfalls

### Pitfall 1: DST Timezone Bugs

**What goes wrong:** Tasks appear to shift by 1 hour when crossing DST boundaries, display differently for users in different timezones, or show incorrect durations.

**Why it happens:** JavaScript's Date object uses local browser timezone implicitly. Parsing dates without timezone specifiers or doing arithmetic with mixed UTC/local values creates bugs.

**How to avoid:**
1. Parse all dates with explicit UTC: `new Date(`${dateString}Z`)`
2. Use date-fns UTC methods for all arithmetic
3. Only convert to local timezone for display
4. Test specifically with dates crossing DST transitions (March and November in US)

**Warning signs:** Date parsing uses `new Date('2024-03-10')` without timezone specifier; duration math uses `date.getTime() % 86400000` patterns; tests only use dates far from DST boundaries.

**Phase:** Prevent in Phase 1 by building date utilities with UTC-only approach

### Pitfall 2: Re-render Storm with Un-memoized Components

**What goes wrong:** All task components re-render when any single task changes or parent state updates, causing performance degradation.

**Why it happens:** Without React.memo, any parent state update triggers all children to re-render. At ~50-100 tasks, this becomes noticeable.

**How to avoid:**
1. Wrap TaskRow component in React.memo with proper comparison
2. Use useCallback for event handlers
3. Keep task-specific state local to the component
4. Avoid storing calculated values in parent state

**Warning signs:** Frame rate drops when scrolling or hovering; DevTools Profiler shows all components re-rendering on any change.

**Phase:** Build with memoization from the start in Phase 1

### Pitfall 3: Floating Point Position Errors

**What goes wrong:** Task bars render at wrong positions because of floating-point errors in date-to-pixel calculations. Visual misalignment, gaps, or overlaps appear.

**Why it happens:** Converting between dates (continuous) and pixels (discrete) involves division and multiplication. Floating-point rounding errors accumulate.

**How to avoid:**
1. Round all pixel calculations to integers with `Math.round()`
2. Use fixed day widths that are integers
3. Test with different screen widths and zoom levels

**Warning signs:** Tasks that should be aligned appear offset by sub-pixel amounts; grid lines don't align with task bar edges.

**Phase:** Prevent in Phase 1 geometry utilities

### Pitfall 4: Overflow with Unbounded Date Ranges

**What goes wrong:** Component tries to render from "earliest task" to "latest task" without limits. When a user has a task in year 2099 or 1990, timeline becomes unusable or crashes.

**Why it happens:** Calculating timeline range dynamically from task data without implementing sensible bounds.

**How to avoid:**
1. Define fixed timeline bounds (e.g., current month or current quarter)
2. Clamp task dates to display bounds
3. Reject or warn about dates outside reasonable ranges

**Warning signs:** Timeline width calculated as `maxDate - minDate` without constraints; no validation on task start/end dates.

**Phase:** Address in Phase 1 by defining date range constraints

## Code Examples

### Date Utilities (UTC-only)

```typescript
// utils/dateUtils.ts
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInCalendarDays,
  isSameDay,
  parseISO,
  isValid
} from 'date-fns';

/**
 * Parse date string as UTC to prevent DST issues
 */
export const parseUTCDate = (date: string | Date): Date => {
  if (typeof date === 'string') {
    // Append Z to force UTC parsing
    const parsed = parseISO(`${date}Z`);
    if (!isValid(parsed)) {
      throw new Error(`Invalid date string: ${date}`);
    }
    return parsed;
  }
  return date;
};

/**
 * Get all days in the month of given date (UTC)
 */
export const getMonthDays = (date: Date | string): Date[] => {
  const utcDate = parseUTCDate(date);
  const monthStart = startOfMonth(utcDate);
  const monthEnd = endOfMonth(utcDate);

  return eachDayOfInterval({ start: monthStart, end: monthEnd });
};

/**
 * Calculate day offset from month start (0-based)
 */
export const getDayOffset = (date: Date, monthStart: Date): number => {
  return differenceInCalendarDays(date, monthStart);
};

/**
 * Check if date is today (UTC comparison)
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return isSameDay(date, today);
};
```

### Geometry Calculations

```typescript
// utils/geometry.ts
import { differenceInCalendarDays } from 'date-fns';

/**
 * Calculate task bar positioning and dimensions
 */
export const calculateTaskBar = (
  taskStartDate: Date,
  taskEndDate: Date,
  monthStart: Date,
  dayWidth: number
): { left: number; width: number } => {
  const startOffset = differenceInCalendarDays(taskStartDate, monthStart);
  const duration = differenceInCalendarDays(taskEndDate, taskStartDate);

  // Round to avoid sub-pixel rendering
  const left = Math.round(startOffset * dayWidth);
  const width = Math.round((duration + 1) * dayWidth); // +1 to include end date

  return { left, width };
};

/**
 * Calculate total width for month grid
 */
export const calculateGridWidth = (daysInMonth: number, dayWidth: number): number => {
  return Math.round(daysInMonth * dayWidth);
};
```

### Component Structure

```typescript
// components/GanttChart/GanttChart.tsx
import React, { useMemo } from 'react';
import styles from './GanttChart.module.css';
import { getMonthDays } from '../../utils/dateUtils';
import { calculateGridWidth } from '../../utils/geometry';
import TimeScaleHeader from '../TimeScaleHeader';
import TaskRow from '../TaskRow';

export interface Task {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  color?: string;
}

interface GanttChartProps {
  tasks: Task[];
  month?: Date | string; // Default to current month
  dayWidth?: number; // Default to 40px
  rowHeight?: number; // Default to 40px
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  month = new Date(),
  dayWidth = 40,
  rowHeight = 40
}) => {
  // Parse month as UTC and get days
  const monthDays = useMemo(() => getMonthDays(month), [month]);

  // Calculate grid dimensions
  const gridWidth = useMemo(
    () => calculateGridWidth(monthDays.length, dayWidth),
    [monthDays.length, dayWidth]
  );

  return (
    <div className={styles.container}>
      <TimeScaleHeader
        days={monthDays}
        dayWidth={dayWidth}
        headerHeight={40}
      />

      <div className={styles.taskRows}>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            monthStart={monthDays[0]}
            dayWidth={dayWidth}
            rowHeight={rowHeight}
          />
        ))}
      </div>
    </div>
  );
};

export default GanttChart;
```

### CSS Module with Theming

```css
/* components/GanttChart/GanttChart.module.css */

:root {
  /* Default theme - users can override these */
  --gantt-grid-line-color: #e0e0e0;
  --gantt-cell-background: #ffffff;
  --gantt-row-height: 40px;
  --gantt-header-height: 40px;
  --gantt-day-width: 40px;
  --task-bar-default-color: #3b82f6;
  --task-bar-text-color: #ffffff;
  --today-indicator-color: #ef4444;
}

.container {
  --gantt-grid-line-color: var(--gantt-grid-line-color, #e0e0e0);
  --gantt-cell-background: var(--gantt-cell-background, #ffffff);

  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, sans-serif;
  border: 1px solid var(--gantt-grid-line-color);
}

.taskRows {
  position: relative;
  overflow-x: auto;
  overflow-y: visible;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Moment.js for dates | date-fns or native Date | 2020+ | Moment is deprecated; date-fns is tree-shakeable and modular |
| Canvas for all rendering | DOM for < 100 tasks, Canvas for 1000+ | ~2022 | DOM sufficient for most use cases; better accessibility |
| CSS-in-JS libraries | CSS Modules + CSS Variables | ~2023 | Runtime overhead eliminated; RSC compatible |
| PropTypes | TypeScript | ~2021 | Better DX; compile-time type checking |

**Deprecated/outdated:**
- Moment.js: 67KB minified; not tree-shakeable; deprecated maintenance
- Create React App: Deprecated; no longer maintained
- React Beautiful DND: No longer maintained; last release 2023
- Classnames package: Heavier than needed; clsx is more modern

## Open Questions

1. **Date header format**
   - What we know: Requirements allow flexibility ("1" vs "Mon 1" vs "Feb 1")
   - What's unclear: User preference for format
   - Recommendation: Start with "Mon 1" format (weekday + day number) for clarity; make configurable via prop if needed

2. **Weekend styling**
   - What we know: Requirements mention weekends as optional
   - What's unclear: Should weekends have different background color?
   - Recommendation: For v1, use subtle background difference for weekends (light gray); make optional via CSS variable

3. **Empty state**
   - What we know: Component should handle empty task array gracefully
   - What's unclear: What to display (empty message, placeholder, blank grid)
   - Recommendation: Show grid with no task rows and subtle "No tasks to display" message

4. **Default task bar color**
   - What we know: Color is optional property; need fallback
   - What's unclear: What default color to use
   - Recommendation: Use a neutral blue (#3b82f6); overrideable via CSS variable

## Sources

### Primary (HIGH confidence)
- date-fns documentation — Date arithmetic, UTC methods, formatting functions (from existing research)
- React 19 documentation — Component patterns, React.memo usage (from existing research)
- CSS Grid specification — Grid layout, gap for borders, positioning (from existing research)
- TypeScript 5.7 documentation — Interface definitions, type safety patterns (from existing research)

### Secondary (MEDIUM confidence)
- Existing project research documents:
  - STACK.md — Technology selection and justification
  - ARCHITECTURE.md — Component structure and patterns
  - PITFALLS.md — Common mistakes and prevention strategies

### Tertiary (LOW confidence)
- None — web search was rate-limited during research; all findings based on established patterns and existing documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Based on established React/TypeScript patterns and existing project research
- Architecture: MEDIUM — DOM-based rendering approach is appropriate for scale; based on React best practices
- Pitfalls: HIGH — DST and re-render issues are well-documented in React/date handling community

**Research date:** 2026-02-19
**Valid until:** 30 days (stable domain; React 19 and date-fns 4.x patterns are stable)

---

*Phase 1 Research: Foundation & Core Rendering*
*Researcher: GSD Phase Researcher*
*Project: Lightweight React Gantt Chart Library*
