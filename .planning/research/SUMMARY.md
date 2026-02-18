# Project Research Summary

**Project:** Gantt Chart Library for Next.js
**Domain:** React/Next.js Component Library with Drag-and-Drop
**Researched:** 2026-02-18
**Confidence:** MEDIUM

## Executive Summary

This is a lightweight React/Next.js component library for interactive Gantt charts. Experts build these using a hybrid DOM/Canvas approach for performance, date-fns for UTC-safe date handling, and controlled component patterns for state management. The research strongly recommends starting with a DOM-only rendering approach given the 100-task target, only migrating to Canvas if performance testing shows it's necessary.

The recommended approach is to build a focused library that does one thing well: drag-and-drop task scheduling on a monthly timeline. Avoid the "feature creep trap" of competing libraries that add dependencies, auto-scheduling, resource management, and multiple zoom levels. Instead, focus on a simple API surface (<10KB bundle), excellent TypeScript support, and 60fps drag interactions using React.memo and proper state isolation. Key risks include re-render storms during drag operations (mitigated by isolating drag state to leaf components) and DST/timezone bugs (mitigated by UTC-only date arithmetic throughout).

## Key Findings

### Recommended Stack

Core technologies selected for modern React development with minimal bundle impact. React 19+ for concurrent rendering, TypeScript 5.7+ for first-class types, and Vite 6+ for fast development builds. For production library builds, tsup provides dual ESM/CJS outputs with automatic TypeScript declarations.

**Core technologies:**
- **React 19+**: UI library with improved concurrent rendering for smoother drag interactions
- **TypeScript 5.7+**: Type safety prevents breaking changes and provides excellent DX
- **Vite 6+**: Fast HMR critical for drag-drop interaction development
- **tsup**: esbuild-powered bundler for library builds with dual ESM/CJS output

**Supporting libraries:**
- **date-fns 4.1+**: Modular date manipulation, tree-shakeable, UTC-safe utilities
- **@dnd-kit/core 6.3+**: Modern drag-and-drop with better React 18+ support than react-dnd
- **CSS Modules + CSS Variables**: Zero runtime styling, framework-agnostic, RSC-compatible
- **Vitest**: Unit testing with same config as Vite, native ESM support

### Expected Features

**Must have (table stakes):**
- Timeline visualization — core value proposition, shows tasks over time
- Task bars rendering — visual representation with start/end dates
- Task list/table view — left sidebar with task names, synchronized with timeline
- Date header/axis — month-based temporal context across the top
- Drag-to-resize tasks — drag edges to change duration (standard interaction pattern)
- Drag-to-move tasks — drag bar to shift in time (standard interaction pattern)
- Today indicator — vertical line showing current date
- Basic styling/theming — CSS variables for user customization
- Task IDs/identifiers — required for React rendering and updates

**Should have (competitive):**
- True zero dependencies — bundle size optimization, no dependency hell
- Tree-shakeable API — users only bundle what they use
- Simple API surface — `<Gantt tasks={tasks} onChange={fn} />` vs complex configuration
- TypeScript-first — generated types, not authored separately
- Accessibility built-in — keyboard nav, ARIA, screen reader support (major differentiator)
- Server component friendly — Next.js App Router compatibility
- Extremely small bundle — <10KB gzipped vs 100KB+ competitors

**Defer (v2+):**
- Task dependencies — adds massive complexity, conflicts with drag-drop when dates locked
- Auto-scheduling — requires constraint solver, unpredictable behavior
- Resource management — doubles complexity, outside scope
- Multiple zoom levels — each level needs different rendering (requirement is month-only)
- Export to PDF/PNG — requires heavy libraries, browser print is sufficient

### Architecture Approach

Standard React component library architecture with clear separation of concerns. The system comprises four layers: Presentation (GanttContainer, TaskListSidebar, TimeScaleHeader, TaskBars), Interaction (DnDManager, SelectionManager, ScrollSync), State Management (Context-based with actions/reducers), and Data (Task models, DateUtils, GeometryEngine). For the 100-task target, a DOM-only rendering approach is recommended over Canvas to prioritize accessibility and simpler implementation.

**Major components:**
1. **GanttContainer** — root component orchestrating state via Context Provider
2. **TaskListSidebar** — left task panel with synchronized scrolling
3. **TimeScaleHeader** — calendar grid displaying month/day headers
4. **TaskBars** — individual task rendering with hit detection for drag interactions
5. **DnDManager** — drag-and-drop state machine (idle, dragging-move, dragging-resize)
6. **GeometryEngine** — converts dates to pixels and vice versa (pure functions)

### Critical Pitfalls

**Re-render storm during drag operations** — Every pixel of mouse movement triggers all 100+ task components to re-render. Avoid by isolating drag state to leaf components with useState, using React.memo() on all task row components, and implementing useCallback for drag handlers.

**Timezone and DST bugs** — Tasks shift by 1 hour crossing DST boundaries or display differently per timezone. Avoid by storing all dates internally as UTC timestamps, using UTC for all date arithmetic, and only converting to local timezone for display.

**Canvas/DOM hybrid complexity** — Mixing DOM elements with canvas creates synchronization issues, drift, and accessibility problems. Avoid by choosing ONE rendering approach: DOM-only for 100-task target (easier accessibility), Canvas-only for 1000+ tasks (requires custom hit detection).

**Unbounded date range explosion** — Single outlier date causes timeline to become unusably wide or crash. Avoid by defining fixed timeline bounds (current month or current year ± 1 month), clamping task dates to display bounds, and implementing hard maximum range.

**Drag state management complexity** — Managing drag state becomes nightmare of nested conditions. Avoid by using proper state machine pattern, encapsulating all drag state in custom hook (useDragState), and using TypeScript discriminated unions for drag states.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Core Rendering
**Rationale:** Architecture dependencies require data models and rendering pipeline before interactions. The research identifies date handling and rendering approach as foundational decisions that are costly to change later.
**Delivers:** Working static Gantt chart displaying task bars on monthly timeline
**Addresses:** Timeline visualization, task bars rendering, date header/axis, task list/table view, task IDs, today indicator
**Avoids:** DST/timezone bugs (UTC-only from start), Canvas/DOM hybrid complexity (commit to DOM-only), unbounded date range (define constraints upfront)

### Phase 2: Drag-and-Drop Interactions
**Rationale:** Build interactions on solid rendering foundation. Research shows this is where most projects fail (re-render storms), so it deserves focused attention.
**Delivers:** Interactive task bar manipulation via drag
**Uses:** @dnd-kit/core or custom mouse event handlers, state machine pattern for drag state
**Implements:** DnDManager, drag-to-resize tasks, drag-to-move tasks
**Avoids:** Re-render storm (isolate drag state to leaf components), drag state complexity (use state machine), memory leaks (proper useEffect cleanup)

### Phase 3: Polish & Differentiators
**Rationale:** After core functionality works, add features that make the library competitive.
**Delivers:** Production-ready library with excellent UX and DX
**Uses:** TypeScript types, CSS Variables for theming, React ARIA for accessibility
**Implements:** Basic styling/theming, TypeScript-first API, accessibility built-in, simple API surface, bundle optimization

### Phase Ordering Rationale

This order follows the architecture research's build order implications: Data Layer → Rendering Core → Basic Components → Interactions → Advanced Features. By building rendering first (Phase 1), we establish the coordinate system and visual foundation. Interactions second (Phase 2) because drag depends on hit testing against rendered elements. Polish third (Phase 3) because optimization and accessibility require working functionality to test against.

This grouping avoids critical pitfalls identified in PITFALLS.md: Phase 1 commits to DOM-only rendering and UTC date handling before technical debt accumulates. Phase 2 isolates drag state before re-render performance problems surface. Phase 3 adds accessibility after rendering stabilizes, avoiding the "accessibility as afterthought" anti-pattern.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Canvas vs DOM performance verification — research recommends DOM-only for 100 tasks, but verify with real-world profiling before committing
- **Phase 3:** Accessibility patterns for interactive charts — sparse documentation, may need to consult ARIA authoring practices and test with screen readers

Phases with standard patterns (skip research-phase):
- **Phase 1:** React component architecture and date utilities — well-documented, established patterns
- **Phase 2:** Basic drag-and-drop — standard patterns, @dnd-kit has good examples if using that approach

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Based on established 2024-2025 React ecosystem patterns; web search was rate-limited so latest package versions couldn't be verified |
| Features | MEDIUM | Domain knowledge of Gantt libraries is strong; limited by inability to verify current competitor feature sets via web search |
| Architecture | HIGH | Based on established React patterns and component library best practices; canvas/dom tradeoffs well-understood |
| Pitfalls | MEDIUM | Common issues in drag-drop and date handling are well-documented; limited verification via current community discussions |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Latest package verification:** React 19 compatibility with @dnd-kit, date-fns v4 ESM-only implications, tsup 8.x latest features — verify during setup before committing to versions
- **Performance baseline:** Research recommends DOM-only for 100 tasks, but should benchmark with actual task data to confirm 60fps target is achievable
- **Accessibility patterns:** Interactive chart accessibility has sparse documentation; may need iterative testing with screen readers during Phase 3
- **DST edge cases:** Date utilities should be tested specifically with DST transition dates (March and November in US) before release

## Sources

### Primary (HIGH confidence)
- React 19 documentation and concurrent rendering patterns
- TypeScript 5.7+ type system features
- Component library best practices (changesets, tsup patterns)
- CSS Modules and CSS Variables specifications
- React Context and state management patterns

### Secondary (MEDIUM confidence)
- @dnd-kit vs react-dnd comparison — based on established 2024-2025 ecosystem knowledge
- date-fns documentation and patterns — modular, tree-shakeable date utilities
- Common Gantt library feature sets (Frappe Gantt, DHTMLX, react-gantt-chart)
- Canvas vs DOM rendering tradeoffs in data visualization
- React performance optimization patterns (memo, useCallback, state isolation)

### Tertiary (LOW confidence)
- Latest competitor feature sets and bundle sizes — web search was rate-limited, unable to verify current state
- Current GitHub issues in popular Gantt libraries — unable to access via rate-limited search
- Latest @dnd-kit React 19 support documentation — package docs couldn't be accessed

---
*Research completed: 2026-02-18*
*Ready for roadmap: yes*
