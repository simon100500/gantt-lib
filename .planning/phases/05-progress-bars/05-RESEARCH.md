# Phase 5: Progress Bars - Research

**Researched:** 2026-02-20
**Domain:** React component with CSS overlay visualization
**Confidence:** HIGH

## Summary

This phase involves implementing visual progress indicators on Gantt chart task bars. The progress is read-only (no user interaction) and displays as a horizontal fill overlay from left to right. Based on research of existing Gantt chart implementations and CSS overlay techniques, the implementation requires:

1. **Type extension**: Add optional `progress?: number` and `accepted?: boolean` properties to Task interface
2. **CSS overlay technique**: Use absolute positioned pseudo-element or child div with darker semi-transparent background
3. **Color manipulation**: Use `color-mix()` CSS function or rgba overlays for darker shades
4. **Conditional rendering**: 0% hidden, 100% shows completed status (yellow for completed, green for accepted)
5. **No drag interaction**: Progress is purely visual, controlled programmatically via props

**Primary recommendation:** Implement progress bars as absolute positioned overlay divs within task bars using `color-mix()` for dynamic darker shades based on task color, with CSS variables for customizable progress colors.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual Display:**
- Horizontal fill from left to right
- Color: darker semi-transparent shade of task color
- NO percentage text displayed
- 0% progress is hidden
- 100% progress shows filled bar

**Interaction:**
- NO user modification of progress through UI
- NO drag markers for progress
- NO onProgressChange callback

**Data Format:**
- Number 0-100 (decimals allowed)
- Optional property: `progress?: number`
- Global options: `progressColor`, `progressSelectedColor`

**Edge Cases:**
- Clamp values 0-100
- Round decimals to nearest integer
- `accepted: boolean` parameter for accepted tasks

**Styling:**
- 100% (completed, not accepted): yellow color
- 100% + accepted=true (accepted): green color

### Claude's Discretion

**Implementation Details:**
- Exact method for creating darker semi-transparent color from task color
- Edge smoothing for progress bar
- Positioning and z-index relative to task text
- CSS approach (pseudo-element vs child div vs background gradient)

### Deferred Ideas (OUT OF SCOPE)

- User modification of progress through UI
- Task dependencies
- Milestones
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x (existing) | Component rendering | Already in use, stable API |
| TypeScript | 5.x (existing) | Type safety | Already in use, required for Task interface extension |
| CSS | 3 (with `color-mix()`) | Progress bar styling | Modern CSS function for color manipulation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| color-mix() | CSS CSS Color Module Level 5 | Dynamic darker shades | Creating darker progress color from task color |
| rgba() | CSS3 | Semi-transparent overlays | Fallback if color-mix not supported |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| color-mix() | Pre-calculated color classes | Less flexible, can't derive from dynamic task colors |
| Overlay div | CSS pseudo-element | Pseudo-element harder to control width dynamically via inline styles |
| Inline styles | CSS classes | Inline styles needed for dynamic width (%) |

**Installation:**
```bash
# No new packages needed - uses existing React and CSS
# color-mix() is native CSS in modern browsers
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── TaskRow/
│       ├── TaskRow.tsx        # Add progress rendering logic
│       ├── TaskRow.css        # Add progress bar styles
│       └── index.tsx
├── types/
│   └── index.ts               # Extend Task interface
├── utils/
│   └── progressUtils.ts       # NEW: progress clamping/rounding
└── styles.css                 # Add progress CSS variables
```

### Pattern 1: Progress Bar as Child Overlay
**What:** Absolute positioned div inside task bar with width set by progress percentage
**When to use:** When you need dynamic width control via inline styles
**Example:**
```tsx
// Source: Research based on existing TaskRow.css patterns
<div className="gantt-tr-taskBar" style={{ backgroundColor: barColor }}>
  {task.progress !== undefined && task.progress > 0 && (
    <div
      className="gantt-tr-progressBar"
      style={{
        width: `${Math.min(100, Math.max(0, Math.round(task.progress)))}%`,
        backgroundColor: getProgressColor(task.progress, task.accepted, task.color)
      }}
    />
  )}
  <span className="gantt-tr-taskName">{task.name}</span>
</div>
```

### Pattern 2: CSS Variables for Theme Customization
**What:** Extend existing CSS variable pattern for progress colors
**When to use:** Following existing project pattern for theming
**Example:**
```css
/* Source: Based on existing styles.css pattern */
:root {
  --gantt-progress-color: rgba(0, 0, 0, 0.2);        /* Default darker overlay */
  --gantt-progress-completed: #fbbf24;               /* Yellow for 100% */
  --gantt-progress-accepted: #22c55e;                /* Green for 100% + accepted */
}
```

### Pattern 3: Dynamic Color with color-mix()
**What:** Use CSS color-mix() to create darker shade from any task color
**When to use:** When task bars have custom colors and progress should match
**Example:**
```css
/* Source: MDN color-mix() documentation */
.gantt-tr-progressBar {
  background-color: color-mix(in srgb, var(--task-color) 65%, black);
  opacity: 0.7;
}
```

### Anti-Patterns to Avoid
- **Modifying progress during drag:** Progress is visual-only, never changes via user interaction
- **Percentage text display:** Explicitly forbidden - no text labels on progress
- **Separate component:** Don't create a separate ProgressBar component - keep it within TaskRow for performance (React.memo optimization)
- **Complex state management:** Progress is derived from props, no local state needed

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color darkening | Manual hex/rgb color math | `color-mix()` CSS function | Edge cases with hex formats, browser inconsistencies |
| Progress clamping | Custom clamp logic | `Math.min(100, Math.max(0, value))` | Built-in functions handle all numeric cases |
| Rounding decimals | Custom rounding | `Math.round()` | Standard behavior, matches user requirements |
| Responsive width | Complex JS calculations | CSS percentage width | Browser handles layout, performs better |

**Key insight:** CSS percentage-based width with clamping/rounding in JS is the simplest, most performant approach. The browser handles all pixel calculations and layout updates.

## Common Pitfalls

### Pitfall 1: Progress Showing at 0%
**What goes wrong:** Empty progress bar visible when progress is 0
**Why it happens:** Rendering condition checks only for `progress !== undefined` without checking for `> 0`
**How to avoid:** Use condition `task.progress !== undefined && task.progress > 0`
**Warning signs:** Seeing thin or empty overlays on tasks with 0% progress

### Pitfall 2: Progress Overflowing Task Bar
**What goes wrong:** Progress bar wider than task bar when progress > 100
**Why it happens:** Missing clamp on progress value
**How to avoid:** Always clamp with `Math.min(100, Math.max(0, progress))`
**Warning signs:** Progress extending beyond task bar border

### Pitfall 3: Z-Index Issues with Task Text
**What goes wrong:** Progress bar covers task name/duration text
**Why it happens:** Progress bar has higher z-index or comes after text in DOM order
**How to avoid:** Progress bar should be absolutely positioned with lower z-index, or use `pointer-events: none`
**Warning signs:** Task text becoming unreadable or obscured

### Pitfall 4: React.memo Re-render Issues
**What goes wrong:** All tasks re-render when one task's progress changes
**Why it happens:** Forgetting to add `progress` to React.memo comparison function
**How to avoid:** Add `prevProps.task.progress === nextProps.task.progress` to `arePropsEqual` function
**Warning signs:** Performance degradation with many tasks, lag during progress updates

### Pitfall 5: Color Contrast Issues
**What goes wrong:** Progress bar too dark or too light, obscuring text
**Why it happens:** Using solid overlay color instead of semi-transparent
**How to avoid:** Use `rgba()` with alpha channel (0.2-0.4) or `color-mix()` with transparency
**Warning signs:** Task text difficult to read when progress is high

## Code Examples

Verified patterns from official sources:

### Progress Bar Implementation
```tsx
// Source: Based on existing TaskRow.tsx pattern and React best practices
interface Task {
  // ... existing properties
  progress?: number;  // 0-100, decimals allowed, undefined = no progress
  accepted?: boolean; // Optional: true if task is accepted
}

const TaskRow: React.FC<TaskRowProps> = React.memo(
  ({ task, monthStart, dayWidth, rowHeight, onChange, onDragStateChange }) => {
    // ... existing code

    // Calculate clamped and rounded progress
    const progressWidth = useMemo(() => {
      if (task.progress === undefined || task.progress <= 0) return 0;
      return Math.min(100, Math.max(0, Math.round(task.progress)));
    }, [task.progress]);

    // Determine progress color
    const progressColor = useMemo(() => {
      if (progressWidth === 100) {
        return task.accepted
          ? 'var(--gantt-progress-accepted, #22c55e)'    // Green
          : 'var(--gantt-progress-completed, #fbbf24)';   // Yellow
      }
      // Darker semi-transparent shade of task color
      return task.color
        ? `color-mix(in srgb, ${task.color} 60%, black)`  // Darker with opacity
        : 'var(--gantt-progress-color, rgba(0, 0, 0, 0.2))';
    }, [progressWidth, task.accepted, task.color]);

    return (
      <div className="gantt-tr-row" style={{ height: `${rowHeight}px` }}>
        <div className="gantt-tr-taskContainer">
          <div
            data-taskbar
            className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''}`}
            style={{
              left: `${displayLeft}px`,
              width: `${displayWidth}px`,
              backgroundColor: barColor,
              // ... existing styles
            }}
          >
            {/* Progress bar overlay */}
            {progressWidth > 0 && (
              <div
                className="gantt-tr-progressBar"
                style={{
                  width: `${progressWidth}%`,
                  backgroundColor: progressColor,
                }}
              />
            )}

            {/* Existing task bar content */}
            <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleLeft" />
            <span className="gantt-tr-taskDuration">{durationDays} д</span>
            <span className="gantt-tr-taskName">{task.name}</span>
            <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleRight" />
          </div>
          {/* ... rest of component */}
        </div>
      </div>
    );
  },
  arePropsEqual // Must be updated to include progress in comparison
);
```

### Updated React.memo Comparison
```typescript
// Source: Existing TaskRow.tsx pattern extended for progress
const arePropsEqual = (prevProps: TaskRowProps, nextProps: TaskRowProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.name === nextProps.task.name &&
    prevProps.task.startDate === nextProps.task.startDate &&
    prevProps.task.endDate === nextProps.task.endDate &&
    prevProps.task.color === nextProps.task.color &&
    prevProps.task.progress === nextProps.task.progress &&      // NEW
    prevProps.task.accepted === nextProps.task.accepted &&      // NEW
    prevProps.monthStart.getTime() === nextProps.monthStart.getTime() &&
    prevProps.dayWidth === nextProps.dayWidth &&
    prevProps.rowHeight === nextProps.rowHeight
    // onChange excluded - see existing note
  );
};
```

### CSS Styles for Progress Bar
```css
/* Source: Based on existing TaskRow.css patterns */
.gantt-tr-taskBar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  border-radius: var(--gantt-task-bar-border-radius);
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;  /* NEW: Contain progress bar within rounded corners */
  /* ... existing styles */
}

/* NEW: Progress bar overlay */
.gantt-tr-progressBar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 1;  /* Below text (z-index auto/2) but above background */
  pointer-events: none;  /* Allow clicks to pass through to task bar */
  border-radius: var(--gantt-task-bar-border-radius) 0 0 var(--gantt-task-bar-border-radius);
  transition: width 0.3s ease;  /* Smooth width changes */
}

/* Ensure text stays above progress */
.gantt-tr-taskName,
.gantt-tr-taskDuration,
.gantt-tr-resizeHandle {
  position: relative;
  z-index: 2;
}

/* Disable transition during drag for performance */
.gantt-tr-taskBar.gantt-tr-dragging .gantt-tr-progressBar {
  transition: none !important;
}
```

### CSS Variables for Theming
```css
/* Source: Existing styles.css pattern */
:root {
  /* ... existing variables */

  /* Progress Bar Colors */
  --gantt-progress-color: rgba(0, 0, 0, 0.2);        /* Default darker overlay */
  --gantt-progress-completed: #fbbf24;               /* Yellow for 100% */
  --gantt-progress-accepted: #22c55e;                /* Green for 100% + accepted */
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hex color manipulation | `color-mix()` CSS function | 2023-2024 | Browser support ~90%, allows dynamic color derivation |
| Inline progress elements | Absolute positioned overlays | Always been standard | Overlays more flexible than inline elements |
| JavaScript color math | CSS color functions | 2020s | CSS functions more performant, less JS |

**Deprecated/outdated:**
- **IE11 hacks:** Progress bars don't need to support IE11
- **CSS gradients for solid colors:** Use `color-mix()` or solid colors instead
- **Separate progress component:** Keep progress inline with task for React.memo optimization

## Open Questions

1. **Browser support for color-mix()**
   - What we know: `color-mix()` has ~90% browser support (Chrome 111+, Firefox 113+, Safari 16.2+)
   - What's unclear: Whether project needs to support older browsers
   - Recommendation: Use `color-mix()` with fallback to rgba for older browsers

2. **Progress bar edge radius**
   - What we know: Task bars have rounded corners
   - What's unclear: Should progress bar have left radius only (filling effect) or full radius
   - Recommendation: Left radius only for "fill from left" visual effect

3. **Transition duration**
   - What we know: Smooth transitions look better, but can cause lag during rapid updates
   - What's unclear: How rapidly progress values might update in real use
   - Recommendation: Use 0.3s ease transition, disable during drag (matches existing pattern)

## Sources

### Primary (HIGH confidence)
- [MDN Web Docs - color-mix()](https://developer.mozilla.org/en-US/docs/Web/CSS/color-mix) - CSS function for color manipulation
- [Existing TaskRow.tsx](D:/Проекты/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.tsx) - Current task bar implementation pattern
- [Existing styles.css](D:/Проекты/gantt-lib/packages/gantt-lib/src/styles.css) - CSS variable theming pattern
- [Existing TaskRow.css](D:/Проекты/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.css) - Task bar styling patterns

### Secondary (MEDIUM confidence)
- [CSS color-mix() Function - Dev.to](https://dev.to/drprime01/css-color-mix-function-34jh) - Practical examples of color-mix() for darker/lighter shades
- [W3Schools CSS color-mix()](https://www.w3school.com.cn/cssref/func_color-mix.asp) - Syntax and usage examples
- [React Progress Visualization Best Practices](https://www.geek-docs.com/react/react-question-207.html) - Progress component patterns

### Tertiary (LOW confidence)
- [Gantt Progress Bar Implementation](https://cloud.tencent.com/developer/article/2341027) - General Gantt progress patterns (verified against project requirements)
- [CSS RGBA Overlay Techniques](https://mobiletrain.org/about/what-is-css-rgba) - Semi-transparent overlay methods

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing React, TypeScript, CSS with modern color-mix()
- Architecture: HIGH - Follows existing TaskRow pattern documented in source code
- Pitfalls: HIGH - Based on React best practices and existing codebase patterns

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days - CSS and React APIs are stable)
