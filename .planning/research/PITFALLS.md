# Pitfalls Research

**Domain:** React Gantt Chart Libraries (Lightweight, Drag-and-Drop Grids)
**Researched:** 2026-02-18
**Confidence:** MEDIUM

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Re-render Storm During Drag Operations

**What goes wrong:**
Every pixel of mouse movement triggers a React state update, causing all 100+ task components to re-render. The UI becomes laggy, janky, or completely unresponsive during drag operations.

**Why it happens:**
Developers store drag state (position, dragging item ID) in a parent component's state, causing all children to re-render on each `onMouseMove` event. The React reconciliation tree rebuilds for every mouse event, which can fire 60+ times per second.

**Consequences:**
- Drag operations feel sluggish or freeze the browser
- 60fps performance target is impossible to achieve
- Users perceive the library as "broken" or "slow"
- Frame drops cause visual glitches and ghosting effects

**How to avoid:**
1. Isolate drag state to the specific component being dragged using `useState` at the leaf level
2. Use `React.memo()` on all task row components with proper comparison functions
3. Implement `useCallback` for all drag event handlers
4. Consider using refs for drag position updates that don't trigger re-renders
5. Batch state updates or use `useTransition` for non-critical updates

**Warning signs:**
- Frame rate drops below 30fps during drag (check with React DevTools Profiler)
- All components re-rendering on every mouse move (highlight updates in DevTools)
- Dragged element "lags" behind cursor
- CPU usage spikes to 100% during drag operations

**Phase to address:** Phase 1 (Core rendering) — Build rendering architecture with memoization from the start, not as an afterthought

---

### Pitfall 2: Timezone and Daylight Saving Time (DST) Nightmares

**What goes wrong:**
Tasks appear to shift by 1 hour when crossing DST boundaries, display differently for users in different timezones, or show incorrect durations. Date calculations produce "off by one day" errors near month boundaries.

**Why it happens:**
JavaScript's `Date` object uses local browser timezone implicitly. Developers parse dates as local time, do arithmetic with mixed UTC/local values, or store dates without timezone awareness. DST transitions create "non-existent" or "duplicate" hours that break duration calculations.

**Consequences:**
- Tasks display with wrong start/end dates
- Duration calculations are incorrect (23-hour or 25-hour days)
- Different users see different task dates
- Data corruption when saving dates to server
- Impossible-to-reproduce timezone-dependent bugs

**How to avoid:**
1. Store all dates internally as UTC timestamps (Unix milliseconds or ISO strings with `Z` suffix)
2. Use UTC for ALL date arithmetic (addition, subtraction, comparison)
3. Only convert to local timezone for display, never for calculation
4. Implement a date utility module that enforces UTC usage
5. Test specifically with dates crossing DST transitions (March and November in US)
6. Consider using a date library with proper timezone support (date-fns-tz, Luxon) if complex timezone handling is needed

**Warning signs:**
- Date parsing uses `new Date('2024-03-10')` without timezone specifier
- Duration math uses `date.getTime() % 86400000` patterns (ignores DST)
- Tests only use dates far from DST boundaries
- Different team members see different results when viewing same data

**Phase to address:** Phase 1 (Data model) — Design date handling architecture before writing any date code

---

### Pitfall 3: Canvas/DOM Hybrid Rendering Complexity

**What goes wrong:**
Mixing DOM elements (for task labels, tooltips) with canvas rendering (for timeline grid, task bars) creates synchronization issues. Elements drift apart, click detection becomes unreliable, and accessibility suffers.

**Why it happens:**
Developers start with pure DOM rendering (easy to implement), then switch to canvas for performance when scale increases. The hybrid approach seems to offer "best of both worlds" but creates two coordinate systems that must stay perfectly synchronized.

**Consequences:**
- Visual misalignment between canvas and DOM elements
- Click/hover events target wrong elements
- Screen readers can't read canvas content
- Impossible to debug layout issues
- Responsive breaks completely as canvas and DOM resize differently

**How to avoid:**
1. Choose ONE rendering approach and commit to it:
   - **DOM-only**: Better for ~100 task target, easier accessibility, sufficient performance with React.memo
   - **Canvas-only**: Better for 1000+ tasks, but requires custom hit detection and accessibility work
2. If using canvas, implement all interactive elements in canvas with proper hit testing
3. If using DOM, implement virtualization before performance becomes a problem
4. Never mix both for the same visual layer

**Warning signs:**
- `ReactDOM.createPortal` usage to sync DOM with canvas
- `getBoundingClientRect()` calls to manually align elements
- Separate `useEffect` hooks to sync positions
- CSS `position: absolute` with calculated coordinates to match canvas

**Phase to address:** Phase 1 (Architecture decision) — Must choose rendering strategy before any implementation begins

---

### Pitfall 4: Unbounded Date Range Explosion

**What goes wrong:**
The component tries to render from "the earliest task" to "the latest task" without limits. When a user accidentally enters a task in year 2099 or has historical data from 1990, the timeline becomes unusably wide or crashes the browser.

**Why it happens:**
Developers calculate timeline range dynamically from task data without implementing sensible bounds. A single outlying date causes the entire timeline scale to expand, making all other tasks microscopic or creating billions of rendered grid cells.

**Consequences:**
- Timeline grid renders millions of cells → browser crash
- Task bars become invisible (too compressed)
- Memory exhaustion from storing excessive DOM nodes
- Scroll/pan becomes unusable
- Calculation overflow in date arithmetic

**How to avoid:**
1. Define fixed timeline bounds (e.g., current month, current quarter, or current year ± 1 month)
2. Clamp all task dates to display bounds (show visual indicator when task is partially hidden)
3. Reject or warn about dates outside reasonable ranges during data input
4. Implement hard maximum range (e.g., never render more than 2 years at once)
5. Add pagination/zoom controls when tasks exceed bounds

**Warning signs:**
- Timeline width calculated as `maxDate - minDate` without constraints
- No validation on task start/end dates
- Tasks can be positioned at negative pixel coordinates
- No maximum limit on timeline range

**Phase to address:** Phase 1 (Data model) — Define date range constraints as part of the data model specification

---

## Moderate Pitfalls

### Pitfall 5: Drag State Management Complexity

**What goes wrong:**
Managing drag state (isDragging, dragType, dragStartPos, currentPos, affectedTask, originalTaskData) becomes a nightmare of nested conditions. Bugs appear when dragging near edges, dragging quickly, or interrupting drag with hover/click.

**Why it happens:**
Drag state has many possible states (idle, preparing, dragging-move, dragging-resize-left, dragging-resize-right, canceled, completed). Developers use multiple boolean flags and scattered state variables instead of a proper state machine.

**How to avoid:**
1. Use a proper state machine pattern or library (xstate, robot) for drag state
2. Encapsulate all drag state in a single custom hook (`useDragState`)
3. Use TypeScript discriminated unions for drag states
4. Implement proper cleanup in `useEffect` return functions
5. Test drag interruption scenarios (ESC key, window resize, component unmount)

**Phase to address:** Phase 2 (Drag interactions)

---

### Pitfall 6: Task List / Timeline Scroll Desync

**What goes wrong:**
The left task list and right timeline scroll independently. Vertical scroll position drifts apart, making it impossible to match tasks with their timeline bars.

**Why it happens:**
Developers implement two separate scroll containers and try to sync them with `onScroll` events. The sync is imperfect, causing visual drift. Browser scroll behavior differences compound the issue.

**How to avoid:**
1. Use a single scroll container with sticky positioning for the task list header
2. Or implement scroll sync with `requestAnimationFrame` for smooth updates
3. Or use a specialized synchronized scroll library
4. Disable native scroll and implement custom scroll handlers

**Phase to address:** Phase 1 (Layout implementation)

---

### Pitfall 7: Pixel Position / Date Conversion Errors

**What goes wrong:**
Task bars render at wrong positions because of floating-point errors in date-to-pixel calculations. Tasks that should be aligned to day boundaries appear offset by fractions of pixels.

**Why it happens:**
Converting between dates (continuous) and pixels (discrete) involves division and multiplication. Floating-point rounding errors accumulate, especially when timeline width is not evenly divisible by day width.

**How to avoid:**
1. Round all pixel calculations to integers with `Math.round()` or `Math.floor()`
2. Use fixed-precision arithmetic for date calculations
3. Implement snap-to-grid for drag operations
4. Store positions as integers throughout
5. Test with different screen widths and zoom levels

**Phase to address:** Phase 1 (Rendering pipeline)

---

### Pitfall 8: Memory Leaks from Event Listeners

**What goes wrong:**
Event listeners for drag operations are not properly cleaned up when components unmount or drag operations complete. Memory usage grows over time, especially in single-page applications.

**Why it happens:**
Developers add `document.addEventListener('mousemove', ...)` during drag but forget cleanup in the return function of `useEffect`. When the component unmounts during a drag operation, listeners persist.

**How to avoid:**
1. Always return cleanup function from `useEffect` that removes all listeners
2. Use refs to track mounted state and check before state updates
3. Implement drag abort on component unmount
4. Use `AbortController` for event cleanup
5. Test with React StrictMode (double-invokes effects)

**Phase to address:** Phase 2 (Drag interactions)

---

## Minor Pitfalls

### Pitfall 9: Missing Drag Constraints

**What goes wrong:**
Tasks can be dragged outside visible bounds, to invalid dates, or resized to zero/negative duration.

**How to avoid:**
Implement drag boundaries:
1. Clamp task start date to minimum date
2. Enforce minimum task duration (e.g., 1 day)
3. Prevent dragging beyond timeline bounds
4. Validate on drag end, revert if invalid

**Phase to address:** Phase 2 (Drag interactions)

---

### Pitfall 10: Mobile/Touch Interaction Gaps

**What goes wrong:**
Library works on desktop but fails on touch devices. Touch events not handled, no touch feedback, gestures conflict with browser navigation.

**How to avoid:**
1. Handle both mouse and touch events from the start
2. Implement `touch-action: CSS` property to prevent scroll conflicts
3. Test on real mobile devices, not just browser devtools
4. Consider touch-specific UI (larger touch targets)

**Phase to address:** Phase 3 (Polish) or Phase 2 if mobile is priority

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| **Using Date objects directly** | No dependency to learn | DST bugs, timezone issues | Never — use UTC from day one |
| **DOM rendering for all tasks** | Easy to implement | Performance ceiling ~200 tasks | Only for MVP with < 50 tasks |
| **Inline drag handlers** | Quick implementation | Impossible to test, hard to debug | Only for prototype, never ship |
| **CSS-in-JS for all styles** | Scoped styling, easy theming | Runtime performance cost, bundle size | Use CSS variables instead |
| **Ignoring accessibility** | Faster development | Expensive retrofit, excludes users | Never — plan a11y from start |
| **Using any date library** | Rich features, nice API | 50KB+ bundle cost | Use native Date API for simple needs |
| **Prop drilling callbacks** | Simple, no context | Painful refactors as tree grows | Use context for drag state |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Unmemoized task components** | All tasks re-render on any change | Use `React.memo()` with proper comparison | ~30 tasks |
| **State in parent component** | Cascading re-renders down entire tree | Push state down to leaf components | ~20 tasks |
| **Date parsing in render** | Expensive operations every frame | Parse once, cache, use UTC | ~50 tasks |
| **Inline event handlers** | New function every render | Use `useCallback` or refs | ~20 tasks |
| **No virtualization** | DOM node count explosion | Implement windowing for >100 tasks | ~150 tasks |
| **Synchronous drag updates** | Main thread blocking | Use `useTransition` or requestAnimationFrame | ~100 tasks |
| **Layout thrashing** | Read/write/read/write DOM | Batch DOM reads and writes | Any scale with sync scrolling |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| **No drag preview/ghost** | User doesn't know what they're moving | Show semi-transparent copy at cursor position |
| **Today line not visible** | Can't orient in time | Always show, highlight when scrolled into view |
| **No snap feedback** | Unclear if drag will snap to grid | Show snap lines/indicators during drag |
| **Tiny drag handles** | Impossible to grab on mobile | 8px minimum touch target, visible hover state |
| **No undo after drag** | Accidental moves are frustrating | Provide visual undo or revert option |
| **Janky scroll during drag** | Motion sickness, loss of context | Smooth scroll with requestAnimationFrame |
| **Task name not visible during drag** | Can't tell what's being moved | Show tooltip or lift label to z-index top |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Drag operations:** Often missing drag interruption (ESC key, window blur, component unmount) — verify drag state cleans up properly in all exit scenarios
- [ ] **Date rendering:** Often missing month boundaries, leap years, DST transitions — verify with test dates: 2024-02-28, 2024-03-10 (DST), 2024-12-31
- [ ] **Resize handles:** Often missing hit detection on thin elements — verify 8px minimum touch target, can grab both ends
- [ ] **Edge positioning:** Often missing tasks at exact start/end of timeline — verify tasks at month boundaries render correctly
- [ ] **Zero/negative duration:** Often missing validation — verify can't resize to zero or negative duration
- [ ] **Task overlap:** Often missing visual stacking — verify what happens when two tasks occupy same date range
- [ ] **Empty state:** Often missing no-data display — verify component renders gracefully with empty task array
- [ ] **Performance at target:** Often missing actual measurement — verify 60fps with 100 tasks using React DevTools Profiler
- [ ] **Date mutation:** Often missing immutability — verify dragging doesn't mutate original task objects
- [ ] **Callback contract:** Often missing clear change description — verify `onChange` callback provides clear before/after values

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| **Re-render storm** | HIGH | Refactor to isolate drag state, add React.memo to all components, implement useCallback for handlers |
| **DST bugs** | HIGH | Migrate all date handling to UTC, audit every date operation, add DST test cases |
| **Canvas/DOM hybrid** | HIGH | Choose one approach, rewrite the other layer, test thoroughly |
| **Unbounded dates** | MEDIUM | Add date range constraints, implement clamping, add input validation |
| **Drag state complexity** | MEDIUM | Extract to custom hook or state machine, add TypeScript types, refactor incrementally |
| **Scroll desync** | LOW | Reimplement with single scroll container or proper sync with rAF |
| **Pixel conversion errors** | LOW | Add Math.round() to all position calculations, add unit tests |
| **Memory leaks** | MEDIUM | Audit all useEffect cleanup, add AbortController, test with strict mode |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Re-render storm | Phase 1: Core rendering — build with memoization from start | Profiler shows < 5 components re-render during drag |
| DST/timezone bugs | Phase 1: Data model — UTC-only date utilities | Test with DST boundaries, multiple timezones |
| Canvas/DOM hybrid | Phase 1: Architecture decision — commit to one approach | Single rendering path throughout codebase |
| Unbounded date range | Phase 1: Data model — define date constraints | Test with dates from year 1900 and 3000 |
| Drag state complexity | Phase 2: Drag interactions — use state machine pattern | All drag states have explicit transitions |
| Scroll desync | Phase 1: Layout implementation | Scroll position tests, visual alignment tests |
| Pixel conversion errors | Phase 1: Rendering pipeline | Unit tests for position calculations |
| Memory leaks | Phase 2: Drag interactions | Strict mode tests, memory profiler |
| Missing drag constraints | Phase 2: Drag interactions | Drag boundary tests, resize limit tests |
| Mobile/touch gaps | Phase 3: Polish or Phase 2 | Real device testing suite |

---

## Sources

**Note: Web services were rate-limited during research. Analysis based on:**
- Domain knowledge of React performance patterns and re-render optimization
- Common issues in drag-and-drop libraries (react-beautiful-dnd, dnd-kit, react-draggable)
- Known timezone and DST handling challenges in JavaScript applications
- Canvas vs DOM rendering tradeoffs in data visualization
- Memory leak patterns in React event handling
- Performance optimization patterns for React applications
- Common UX issues in interactive data visualization components

**Confidence: MEDIUM** - Limited by inability to verify current community discussions via web search. Would benefit from verification of:
- Current issues in popular React Gantt libraries (Frappe Gantt, react-gantt-chart, DHTMLX)
- Latest performance optimization patterns for React 18+ concurrent features
- Current best practices for drag-and-drop in React

**Recommended verification before roadmap finalization:**
- Review GitHub issues for Frappe Gantt, DHTMLX Gantt, react-beautiful-dnd
- Check React documentation for latest performance optimization patterns
- Research current state of canvas vs DOM rendering for data visualization

---
*Pitfalls research for: Lightweight React Gantt Chart Library*
*Researched: 2026-02-18*
