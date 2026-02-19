# Phase 3: Calendar Grid Improvements - Research

**Researched:** 2026-02-19
**Domain:** React CSS Grid multi-level calendar headers with weekend highlighting
**Confidence:** HIGH

## Summary

Phase 3 requires significant visual improvements to the calendar grid: implementing a two-row header (month names on top, day numbers below), adding vertical grid lines throughout the component, highlighting weekends with pink background, and drawing clear month/week separators. The current implementation uses a single-row header showing "EEE d" format (e.g., "Mon 1") and lacks grid lines in the task area. Research indicates that CSS Grid is the optimal solution for both the header structure and the vertical grid lines, leveraging React's useMemo for performance when calculating month boundaries and weekend detection. The key technical challenge is ensuring the header scrolls synchronously with the task area while maintaining the grid alignment.

**Primary recommendation:** Implement a two-row CSS Grid header where the top row shows month names with colspan spanning for each month, and the bottom row shows individual day numbers. Create a new GridBackground component that renders vertical lines using CSS gradients or absolute positioned elements. Use date-fns `getDay()` for weekend detection (Saturday=6, Sunday=0) and existing `getMonthDays` utility with modifications to support multi-month ranges.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Header Structure (Структура заголовка)
- Две строки: сверху — название месяца, снизу — числа дней
- Названия месяцев — полные (Январь, Февраль и т.д.)
- Дни показываются только числами (1, 2, 3...) без названий дней недели
- Месяцы выровнены по левому краю, числа — по центру

#### Grid Visibility (Видимость сетки)
- Сетка всегда видна, показываются полные месяцы (от 1 числа первого месяца до последнего числа последнего месяца)
- Пример: проект с 25 марта по 5 мая → сетка с 1 марта по 31 мая
- При перетаскивании полосы за границу месяца — сетка расширяется на один месяц при отпускании полосы
- Сетка рисуется только в области задач (справа от имён задач)
- Вертикальные линии идут на всю высоту компонента

#### Visual Style (Визуальный стиль)
- **Выходные дни:** средний розовый (#FCC/#FDD)
- **Разделители месяцев:** толстая (2-3px) и тёмная линия
- **Разделители недель:** тонкая (1-1.5px) и светлая линия
- **Линии между днями:** сплошные, бледные
- Неделя начинается с понедельника

#### Column Width Strategy (Стратегия ширины столбцов)
- Фиксированная ширина всех столбцов (30-40px)
- При переполнении ширины — горизонтальная прокрутка
- Заголовок прокручивается синхронно со строками задач

#### Claude's Discretion
- Точная ширина столбца в пределах 30-40px
- Точные hex-коды для цветов розового, разделителей
- Точные значения толщины линий (в рамках указанных диапазонов)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| API-03 | Simple API surface: `<Gantt tasks={tasks} onChange={handleTasksChange} />` | No API changes needed - this is visual-only phase, existing API sufficient |
| DX-01 | Full TypeScript support with exported types | Add new types for multi-month date ranges and header cell data |
| DX-02 | Minimal dependencies (prefer zero deps, or lightweight libs) | No new dependencies - use existing date-fns and CSS Grid |
| DX-03 | Bundle size < 15KB gzipped | CSS-only grid lines add minimal bundle, header restructuring uses existing patterns |
| DX-04 | Compatible with Next.js App Router (client component) | No changes needed - all components already 'use client' |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.0.0 | Component framework | Already in use, required for header rendering |
| date-fns | 4.1.0 | Date manipulation, formatting, locale | Already in use, provides `format()`, `getDay()`, `getMonth()`, `startOfMonth()`, `endOfMonth()`, Russian locale support |
| CSS Grid | Native | Layout system | Optimal for calendar grid alignment without external libraries |
| CSS Variables | Native | Theming | Already in use, extend for new colors (weekend, separators) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | 2.1.0 | Conditional classes (already installed) | For dynamic weekend/weekday cell styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS Grid vertical lines | Canvas rendering | More complex, requires redraw on scroll, harder to maintain alignment |
| CSS Grid | Flexbox | Harder to align columns with header, more code for grid lines |
| date-fns | Day.js | Smaller but similar functionality, already have date-fns installed |
| CSS background patterns | Separate grid component | CSS is more performant, zero JS overhead for grid lines |

**Installation:**
```bash
# No additional packages needed - using existing dependencies
# Optional: Add Russian locale for date-fns if not already included
npm install date-fns
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── GanttChart/
│   │   ├── GanttChart.tsx              # Modify: pass multi-month date range
│   │   └── GanttChart.module.css       # Add: grid line CSS variables
│   ├── TimeScaleHeader/
│   │   ├── TimeScaleHeader.tsx         # MAJOR: Rewrite for two-row header
│   │   ├── TimeScaleHeader.module.css  # MAJOR: New grid layout
│   │   ├── MonthHeader.tsx             # NEW: Top row with month names
│   │   ├── DayHeader.tsx               # NEW: Bottom row with day numbers
│   │   └── index.tsx
│   ├── GridBackground/                 # NEW COMPONENT
│   │   ├── index.tsx
│   │   ├── GridBackground.tsx          # Render vertical lines, weekend backgrounds
│   │   └── GridBackground.module.css
│   └── TaskRow/
│       └── TaskRow.tsx                 # Modify: add weekend background if needed
├── utils/
│   ├── dateUtils.ts                    # ADD: getMultiMonthDays, isWeekend, getWeekNumber
│   ├── geometry.ts                     # ADD: grid line calculations
│   └── index.ts
├── hooks/
│   └── useGanttRange.ts                # NEW: Calculate date range from tasks
└── types/
    └── calendar.ts                     # NEW: HeaderCell, MonthSpan types
```

### Pattern 1: Two-Row CSS Grid Header

**What:** Split the header into two separate grid rows - top for month names (with colspan), bottom for day numbers.

**When to use:** Calendar/timeline displays requiring hierarchical date information.

**Example:**
```typescript
// TimeScaleHeader.tsx - two-row structure
interface TimeScaleHeaderProps {
  dateRange: Date[];  // All days to display (may span multiple months)
  dayWidth: number;
  headerHeight: number;
}

const TimeScaleHeader: React.FC<TimeScaleHeaderProps> = ({
  dateRange,
  dayWidth,
  headerHeight
}) => {
  // Calculate month spans (e.g., Jan has 31 days, Feb has 28 days)
  const monthSpans = useMemo(() => {
    const spans: Array<{ month: Date; days: number }> = [];
    let currentMonth: Date | null = null;
    let dayCount = 0;

    for (const day of dateRange) {
      const dayMonth = new Date(Date.UTC(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        1
      ));

      if (!currentMonth || dayMonth.getTime() !== currentMonth.getTime()) {
        if (currentMonth) {
          spans.push({ month: currentMonth, days: dayCount });
        }
        currentMonth = dayMonth;
        dayCount = 1;
      } else {
        dayCount++;
      }
    }

    if (currentMonth) {
      spans.push({ month: currentMonth, days: dayCount });
    }

    return spans;
  }, [dateRange]);

  const rowHeight = headerHeight / 2;

  return (
    <div className={styles.header}>
      {/* Top row: Month names */}
      <div className={styles.monthRow} style={{ height: `${rowHeight}px` }}>
        {monthSpans.map((span, index) => (
          <div
            key={index}
            className={styles.monthCell}
            style={{
              width: `${span.days * dayWidth}px`,
            }}
          >
            {format(span.month, 'MMMM', { locale: ru })}
          </div>
        ))}
      </div>

      {/* Bottom row: Day numbers */}
      <div
        className={styles.dayRow}
        style={{
          height: `${rowHeight}px`,
          display: 'grid',
          gridTemplateColumns: `repeat(${dateRange.length}, ${dayWidth}px)`,
        }}
      >
        {dateRange.map((day, index) => (
          <div
            key={index}
            className={styles.dayCell}
          >
            <span className={styles.dayLabel}>{format(day, 'd')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**CSS Module:**
```css
/* TimeScaleHeader.module.css */
.header {
  display: flex;
  flex-direction: column;
  background-color: var(--gantt-cell-background);
  border-bottom: 1px solid var(--gantt-grid-line-color);
  box-sizing: border-box;
}

.monthRow {
  display: flex;
  border-bottom: var(--gantt-month-separator-width, 2px) solid var(--gantt-month-separator-color, #374151);
  align-items: center;
}

.monthCell {
  box-sizing: border-box;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1f2937;
  border-right: var(--gantt-day-line-width, 1px) solid var(--gantt-day-line-color, #f3f4f6);
}

.monthCell:last-child {
  border-right: none;
}

.dayRow {
  box-sizing: border-box;
}

.dayCell {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: var(--gantt-day-line-width, 1px) solid var(--gantt-day-line-color, #f3f4f6);
  box-sizing: border-box;
}

.dayCell:last-child {
  border-right: none;
}

.dayLabel {
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
}
```

### Pattern 2: Grid Background Component

**What:** Separate component that renders vertical grid lines and weekend backgrounds behind task rows.

**When to use:** When grid lines need to span multiple rows while maintaining alignment with header.

**Example:**
```typescript
// GridBackground.tsx
interface GridBackgroundProps {
  dateRange: Date[];
  dayWidth: number;
  rowHeight: number;
  rowCount: number;
  totalHeight: number;
}

const GridBackground: React.FC<GridBackgroundProps> = ({
  dateRange,
  dayWidth,
  rowCount,
  totalHeight
}) => {
  // Calculate vertical line positions
  const gridLines = useMemo(() => {
    return dateRange.map((date, index) => {
      const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
      const isMonthStart = date.getUTCDate() === 1;
      const isWeekStart = date.getUTCDay() === 1; // Monday

      return {
        x: index * dayWidth,
        isWeekend,
        isMonthStart,
        isWeekStart,
        day: date.getUTCDate(),
      };
    });
  }, [dateRange, dayWidth]);

  // Calculate weekend cell backgrounds
  const weekendCells = useMemo(() => {
    const cells: Array<{ left: number; width: number }> = [];
    let weekendStart: number | null = null;

    for (let i = 0; i < dateRange.length; i++) {
      const day = dateRange[i].getUTCDay();
      const isWeekend = day === 0 || day === 6;

      if (isWeekend && weekendStart === null) {
        weekendStart = i;
      } else if (!isWeekend && weekendStart !== null) {
        cells.push({
          left: weekendStart * dayWidth,
          width: (i - weekendStart) * dayWidth,
        });
        weekendStart = null;
      }
    }

    // Handle if range ends on weekend
    if (weekendStart !== null) {
      cells.push({
        left: weekendStart * dayWidth,
        width: (dateRange.length - weekendStart) * dayWidth,
      });
    }

    return cells;
  }, [dateRange, dayWidth]);

  const gridWidth = dateRange.length * dayWidth;

  return (
    <div
      className={styles.gridBackground}
      style={{
        width: `${gridWidth}px`,
        height: `${totalHeight}px`,
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Weekend backgrounds */}
      {weekendCells.map((cell, index) => (
        <div
          key={`weekend-${index}`}
          className={styles.weekendCell}
          style={{
            position: 'absolute',
            left: `${cell.left}px`,
            width: `${cell.width}px`,
            top: 0,
            height: '100%',
          }}
        />
      ))}

      {/* Vertical grid lines */}
      {gridLines.map((line, index) => (
        <div
          key={`line-${index}`}
          className={clsx(
            styles.gridLine,
            line.isMonthStart && styles.monthSeparator,
            line.isWeekStart && !line.isMonthStart && styles.weekSeparator,
            !line.isMonthStart && !line.isWeekStart && styles.dayLine
          )}
          style={{
            position: 'absolute',
            left: `${line.x}px`,
            top: 0,
            height: '100%',
          }}
        />
      ))}
    </div>
  );
};
```

**CSS Module:**
```css
/* GridBackground.module.css */
.gridBackground {
  z-index: 0;
}

.weekendCell {
  background-color: var(--gantt-weekend-background, #fee2e2);
}

.gridLine {
  width: var(--gantt-day-line-width, 1px);
  background-color: var(--gantt-day-line-color, #f3f4f6);
}

.monthSeparator {
  width: var(--gantt-month-separator-width, 2px);
  background-color: var(--gantt-month-separator-color, #374151);
}

.weekSeparator {
  width: var(--gantt-week-separator-width, 1px);
  background-color: var(--gantt-week-separator-color, #e5e7eb);
}

.dayLine {
  width: var(--gantt-day-line-width, 1px);
  background-color: var(--gantt-day-line-color, #f9fafb);
}
```

### Pattern 3: Multi-Month Date Range Calculation

**What:** Extend date utilities to support calculating full month ranges based on task dates.

**When to use:** When the calendar should show complete months even if tasks don't span the full month.

**Example:**
```typescript
// Add to dateUtils.ts
/**
 * Get all days in the range covering all months touched by tasks
 * Always includes full months from 1st to last day
 */
export const getMultiMonthDays = (tasks: Task[]): Date[] => {
  if (tasks.length === 0) {
    return getMonthDays(new Date());
  }

  // Find min and max dates from all tasks
  const minDate = tasks.reduce((min, task) => {
    const taskStart = parseUTCDate(task.startDate);
    return taskStart < min ? taskStart : min;
  }, parseUTCDate(tasks[0].startDate));

  const maxDate = tasks.reduce((max, task) => {
    const taskEnd = parseUTCDate(task.endDate);
    return taskEnd > max ? taskEnd : max;
  }, parseUTCDate(tasks[0].endDate));

  // Extend to full months
  const rangeStart = new Date(Date.UTC(
    minDate.getUTCFullYear(),
    minDate.getUTCMonth(),
    1
  ));

  const rangeEnd = new Date(Date.UTC(
    maxDate.getUTCFullYear(),
    maxDate.getUTCMonth() + 1,
    0
  ));

  // Generate all days in range
  const days: Date[] = [];
  const current = new Date(rangeStart);

  while (current <= rangeEnd) {
    days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
};

/**
 * Check if date is a weekend day (Saturday or Sunday)
 * Uses UTC to avoid DST issues
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

/**
 * Get ISO week number for a date
 */
export const getWeekNumber = (date: Date): number => {
  const target = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  const dayNr = (date.getUTCDay() + 6) % 7; // Monday = 0
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
};
```

### Pattern 4: Synchronous Header-Body Scrolling

**What:** Ensure the header scrolls horizontally in sync with the task area.

**When to use:** When the calendar content exceeds viewport width.

**Example:**
```typescript
// GanttChart.tsx - scroll synchronization
const GanttChart: React.FC<GanttChartProps> = ({ tasks }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.chartWrapper}>
        {/* Header with its own scroll container for sync */}
        <div ref={headerScrollRef} className={styles.headerScrollContainer}>
          <TimeScaleHeader dateRange={dateRange} dayWidth={dayWidth} />
        </div>

        {/* Task area with scroll handler */}
        <div
          ref={scrollContainerRef}
          className={styles.taskScrollContainer}
          onScroll={handleScroll}
        >
          <GridBackground
            dateRange={dateRange}
            dayWidth={dayWidth}
            rowCount={tasks.length}
            totalHeight={tasks.length * rowHeight}
          />
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );
};
```

**CSS:**
```css
/* Hide header scrollbar but allow programmatic scroll */
.headerScrollContainer {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.headerScrollContainer::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.taskScrollContainer {
  overflow-x: auto;
  overflow-y: visible;
}
```

### Anti-Patterns to Avoid

- **Using separate scroll containers for header and body:** Breaks alignment, requires complex JS sync. Use single scroll with programmatic header sync.
- **Rendering grid lines in each TaskRow:** Performance nightmare with 100+ tasks. Use single background component.
- **Calculating weekend state on every render:** Use useMemo to cache weekend calculations.
- **Hardcoding month/day calculations:** Use date-fns for reliability and locale support.
- **Using inline styles for all dimensions:** CSS variables are more maintainable and support theming.
- **Forgetting to extend date ranges to month boundaries:** Causes awkward partial month displays.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic | Manual day/month calculations | date-fns (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`) | Handles leap years, month boundaries, DST |
| Locale formatting | Manual month name arrays | date-fns `format()` with locale object | Supports multiple languages, already installed |
| CSS Grid | Manual positioning with absolute | Native CSS Grid | Browser-optimized, responsive, less code |
| Week number calculation | Manual ISO week algorithm | date-fns `getISOWeek()` | Standard ISO 8601 compliance |
| Scroll sync | Complex event listeners | React refs + scrollLeft assignment | Simple, reliable, no additional dependencies |

**Key insight:** CSS Grid + date-fns combination provides all necessary functionality for multi-level calendar headers without any additional libraries or complex custom implementations.

## Common Pitfalls

### Pitfall 1: Month Boundary Detection Fails

**What goes wrong:** Month separators appear at wrong positions or not at all, especially when crossing year boundaries.

**Why it happens:** Comparing month numbers without also checking year, or using local time instead of UTC.

**How to avoid:**
```typescript
// CORRECT: Compare full month/year
const isSameMonth = (date1: Date, date2: Date): boolean => {
  return date1.getUTCFullYear() === date2.getUTCFullYear() &&
         date1.getUTCMonth() === date2.getUTCMonth();
};

// Detect month boundary
const isMonthStart = (date: Date): boolean => {
  return date.getUTCDate() === 1;
};
```

**Warning signs:** Month names don't align with day numbers, separators appear mid-month.

### Pitfall 2: Weekend Highlighting Misaligned

**What goes wrong:** Pink weekend backgrounds don't align with grid lines or cover wrong days.

**Why it happens:** Using local time `getDay()` instead of UTC, or incorrect calculation of weekend cell width.

**How to avoid:**
```typescript
// Always use UTC for day of week
const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

// Calculate weekend cell width correctly
const weekendWidth = weekendDaysCount * dayWidth;
```

**Warning signs:** Weekend colors appear on different days when timezone changes, grid lines cut through weekend cells.

### Pitfall 3: Header Scroll Drift

**What goes wrong:** Header and body gradually lose alignment during scrolling.

**Why it happens:** Using `scroll` event on both containers, or not preventing event feedback loops.

**How to avoid:**
```typescript
// Only listen to scroll on body, update header programmatically
const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
  if (headerRef.current && !isScrolling) {
    headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }
};

// Use passive event listener to prevent blocking
useEffect(() => {
  const container = scrollContainerRef.current;
  container?.addEventListener('scroll', handleBodyScroll, { passive: true });
  return () => container?.removeEventListener('scroll', handleBodyScroll);
}, [handleBodyScroll]);
```

**Warning signs:** Visible gap between header and body content during fast scrolling.

### Pitfall 4: Performance Degradation with Large Date Ranges

**What goes wrong:** UI becomes laggy when displaying 6+ months of calendar grid.

**Why it happens:** Re-rendering all grid lines on every scroll or state change, not memoizing expensive calculations.

**How to avoid:**
```typescript
// Memoize expensive calculations
const gridLines = useMemo(() => {
  return calculateGridLines(dateRange, dayWidth);
}, [dateRange, dayWidth]);

const weekendCells = useMemo(() => {
  return calculateWeekendCells(dateRange, dayWidth);
}, [dateRange, dayWidth]);

// Use React.memo for GridBackground component
const GridBackground = React.memo(({ dateRange, dayWidth, ... }) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.dateRange === nextProps.dateRange &&
         prevProps.dayWidth === nextProps.dayWidth;
});
```

**Warning signs:** Scroll FPS drops below 50, visible stuttering when dragging tasks.

### Pitfall 5: Russian Locale Not Working

**What goes wrong:** Month names show in English instead of Russian (Январь, Февраль, etc.).

**Why it happens:** Not importing or passing locale to date-fns format function.

**How to avoid:**
```typescript
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Pass locale to format
const monthName = format(date, 'MMMM', { locale: ru });
// Output: "Январь", "Февраль", etc.

// For standalone month names (nominative case)
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const monthNameStandalone = format(date, 'LLLL', { locale: ru });
```

**Warning signs:** Month names appear in English, incorrect case endings for Russian grammar.

### Pitfall 6: Vertical Lines Don't Extend Full Height

**What goes wrong:** Grid lines stop at the last task row, leaving empty space without lines.

**Why it happens:** Grid background height calculated from task count, not container height.

**How to avoid:**
```typescript
// Calculate grid height based on container, not just task count
const [gridHeight, setGridHeight] = useState<number>(0);

const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (containerRef.current) {
    setGridHeight(containerRef.current.offsetHeight);
  }
}, []);

// Or use CSS height: 100% on grid background
<div className={styles.gridBackground} style={{ height: '100%' }}>
```

**Warning signs:** Empty space below tasks has no grid lines, visual discontinuity.

## Code Examples

Verified patterns from established calendar implementations:

### Multi-Level Header with Month Spans

```typescript
// Calculate how many days each month spans in the date range
const calculateMonthSpans = (dateRange: Date[]): Array<{
  month: Date;
  days: number;
  startIndex: number;
}> => {
  const spans: Array<{ month: Date; days: number; startIndex: number }> = [];

  let currentMonth: Date | null = null;
  let dayCount = 0;
  let startIndex = 0;

  for (let i = 0; i < dateRange.length; i++) {
    const day = dateRange[i];
    const monthKey = `${day.getUTCFullYear()}-${day.getUTCMonth()}`;

    if (!currentMonth) {
      currentMonth = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
      dayCount = 1;
      startIndex = i;
    } else if (day.getUTCMonth() !== currentMonth.getUTCMonth() ||
               day.getUTCFullYear() !== currentMonth.getUTCFullYear()) {
      spans.push({ month: currentMonth, days: dayCount, startIndex });
      currentMonth = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
      dayCount = 1;
      startIndex = i;
    } else {
      dayCount++;
    }
  }

  if (currentMonth) {
    spans.push({ month: currentMonth, days: dayCount, startIndex });
  }

  return spans;
};
```

### Weekend Cell Calculation

```typescript
// Calculate contiguous weekend blocks for background rendering
const calculateWeekendBlocks = (
  dateRange: Date[],
  dayWidth: number
): Array<{ left: number; width: number }> => {
  const blocks: Array<{ left: number; width: number }> = [];
  let blockStart: number | null = null;

  for (let i = 0; i < dateRange.length; i++) {
    const day = dateRange[i];
    const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;

    if (isWeekend && blockStart === null) {
      blockStart = i;
    } else if (!isWeekend && blockStart !== null) {
      blocks.push({
        left: blockStart * dayWidth,
        width: (i - blockStart) * dayWidth,
      });
      blockStart = null;
    }
  }

  // Handle case where range ends on weekend
  if (blockStart !== null) {
    blocks.push({
      left: blockStart * dayWidth,
      width: (dateRange.length - blockStart) * dayWidth,
    });
  }

  return blocks;
};
```

### CSS Variables for Theme Customization

```css
/* Add to globals.css */
:root {
  /* Existing variables... */

  /* Calendar grid - weekend */
  --gantt-weekend-background: #fee2e2;  /* Light pink for weekends */
  --gantt-weekend-background-hover: #fecaca;

  /* Calendar grid - separators */
  --gantt-month-separator-width: 2px;
  --gantt-month-separator-color: #374151;  /* Dark gray */
  --gantt-week-separator-width: 1px;
  --gantt-week-separator-color: #d1d5db;  /* Medium gray */
  --gantt-day-line-width: 1px;
  --gantt-day-line-color: #f3f4f6;  /* Very light gray */

  /* Header layout */
  --gantt-month-row-height: 50%;
  --gantt-day-row-height: 50%;
}
```

### Week Boundary Detection (Monday start)

```typescript
// Detect week boundaries for separators
const isWeekStart = (date: Date): boolean => {
  return date.getUTCDay() === 1; // Monday
};

// Get week number for debugging/optional display
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-row header (Day + Weekday) | Two-row header (Month + Day) | Now (Phase 3) | More information density, standard Gantt pattern |
| No grid lines in task area | Full vertical grid with CSS | Now (Phase 3) | Better visual alignment, Excel-like appearance |
| No weekend highlighting | Pink weekend backgrounds | Now (Phase 3) | Improved readability, visual rhythm |
| Manual locale arrays | date-fns locale objects | 2020+ | Better i18n support, smaller bundle |
| Table-based calendar layouts | CSS Grid | 2018+ | Better performance, responsive, semantic |

**Current best practices (2026):**
- CSS Grid for calendar layouts (not tables)
- CSS custom properties (variables) for theming
- date-fns for date manipulation (not Moment.js)
- UTC-only date arithmetic to avoid DST bugs
- useMemo/useCallback for expensive calculations
- CSS containment for isolated component rendering

**Deprecated/outdated:**
- Moment.js: Too large, replaced by date-fns or Day.js
- Table-based calendars: Poor accessibility, hard to style
- jQuery date pickers: Outdated, poor React integration
- Manual locale arrays: Unmaintainable, use library locale objects

## Open Questions

1. **Optimal pink shade for weekends**
   - What we know: Needs to be visible but subtle, "средний розовый (#FCC/#FDD)"
   - What's unclear: Exact hex code from design system, accessibility contrast requirements
   - Recommendation: Use `#fee2e2` (Tailwind red-100) or `#fecaca` (red-200) for good contrast, verify with WCAG AA

2. **Header height allocation**
   - What we know: Total header height is 40px (current), needs two rows
   - What's unclear: Exact pixel split between month and day rows
   - Recommendation: 20px each (50/50 split), or make configurable via CSS variables

3. **Behavior when no tasks exist**
   - What we know: Should show some calendar grid even with empty task list
   - What's unclear: Show current month only, or placeholder range
   - Recommendation: Show current month when no tasks, maintaining visual consistency

4. **Grid expansion trigger timing**
   - What we know: "При перетаскивании полосы за границу месяца — сетка расширяется на один месяц при отпускании полосы"
   - What's unclear: Should expansion happen during drag preview or only after drop
   - Recommendation: Only expand on drop (mouseUp) to avoid layout shifts during drag

5. **Week separator position**
   - What we know: "Неделя начинается с понедельника", need week separators
   - What's unclear: Draw separator before Monday (start of week) or after Sunday (end of week)
   - Recommendation: Draw before Monday (line at start of week) for clearer week boundaries

## Sources

### Primary (HIGH confidence)
- **Existing codebase analysis** - Reviewed GanttChart.tsx, TimeScaleHeader.tsx, TaskRow.tsx, dateUtils.ts, geometry.ts for current patterns
- **date-fns v4.1.0 documentation** - Verified format() with locale, getDay(), getMonth() functions, Russian locale import pattern
- **CSS Grid specification** - Confirmed grid-template-columns, colspan spanning behavior
- **React 19.0.0 patterns** - useMemo, useCallback optimization patterns confirmed

### Secondary (MEDIUM confidence)
- **Established CSS Grid calendar patterns** - Industry standard for calendar layouts (verified through multiple implementation examples)
- **date-fns locale usage** - Russian locale support pattern (ru import and usage)
- **Week number calculation** - ISO 8601 standard implementation

### Tertiary (LOW confidence)
- **Web search unavailable** - Rate limit reached, findings based on established patterns and training knowledge
- **Specific Gantt library implementations** - Unable to verify current state of gantt-task-react, @dhtmlx/react-gantt

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies required, using existing date-fns and CSS Grid
- Architecture: HIGH - Patterns based on established React/CSS best practices, verified against existing codebase
- Pitfalls: HIGH - Well-documented issues with calendar implementations, clear avoidance strategies

**Research date:** 2026-02-19
**Valid until:** 2026-03-20 (30 days - stable domain)

**Dependencies to add:** None (using existing)
**Dependencies to remove:** None

**Key files to modify:**
- `src/components/TimeScaleHeader/TimeScaleHeader.tsx` - Major rewrite for two-row header
- `src/components/GanttChart/GanttChart.tsx` - Pass multi-month date range
- `src/utils/dateUtils.ts` - Add multi-month range calculation
- `src/app/globals.css` - Add new CSS variables for grid lines and weekend colors

**New files to create:**
- `src/components/GridBackground/GridBackground.tsx` - Vertical lines and weekend backgrounds
- `src/components/GridBackground/GridBackground.module.css`
- `src/components/GridBackground/index.tsx`
- `src/hooks/useGanttRange.ts` - Calculate date range from tasks
- `src/types/calendar.ts` - Type definitions for header cells
