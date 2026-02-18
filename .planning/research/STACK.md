# Stack Research

**Domain:** React/Next.js Component Library with Drag-and-Drop
**Researched:** 2026-02-18
**Confidence:** MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **React** | 19.0+ | UI library | Latest stable with improved concurrent rendering, better performance for interactive components |
| **TypeScript** | 5.7+ | Type safety | Industry standard for component libraries; prevents breaking changes; excellent DX |
| **Next.js** | 15.0+ | Framework (if building demo site) | App Router stable; Turbopack for fast builds; RSC support for modern patterns |
| **Vite** | 6.0+ | Build tool (for library) | Faster dev server; better HMR; native ESM support; smaller bundles compared to Webpack |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@dnd-kit/core** | 6.3+ | Drag-and-drop | Modern, lightweight, accessible DnD; better React 18+ support than react-dnd |
| **@dnd-kit/utilities** | 3.2+ | DnD utilities | Required for modifiers, transformations; use with @dnd-kit/core |
| **date-fns** | 4.1+ | Date manipulation | Modular, tree-shakeable; better than Moment.js; no locale bloat |
| **clsx** | 2.1+ | Conditional classes | Simpler than classnames; smaller bundle; perfect for CSS Modules |
| **React ARIA** | 3.35+ | Accessibility primitives | For keyboard navigation, ARIA attributes; critical for chart components |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vitest** | Unit testing | Faster than Jest; native ESM; same config as Vite |
| **Testing Library** | Component testing | Standard for React component testing; encourages user-centric tests |
| **Playwright** | E2E testing | For drag-drop interaction testing; cross-browser |
| **ESLint** | Linting | Use with typescript-eslint plugin; strict mode for library code |
| **Prettier** | Code formatting | Consistent code style; integrate with ESLint |
| **Changesets** | Versioning | For managing versions and CHANGELOG; standard for component libraries |
| **TSUP** | Library bundling | Fast esbuild-based bundler; dual ESM/CJS builds; TypeScript-first |

### Styling Solutions

| Solution | Version | Purpose | When to Use |
|----------|---------|---------|-------------|
| **CSS Modules** | Native | Component styling | Default choice; scoped styles; tree-shakeable; works with all frameworks |
| **CSS Variables** | Native | Design tokens | For theming; user customization; no runtime overhead |
| **Open Props** | 1.7+ | Design tokens (optional) | If you want pre-built tokens; can cherry-pick custom properties |

## Installation

```bash
# Core dependencies
npm install react@^19.0.0
npm install -D typescript@^5.7.0

# Build tool (library mode)
npm install -D vite@^6.0.0 tsup@^8.3.0

# Drag and drop
npm install @dnd-kit/core@^6.3.0 @dnd-kit/utilities@^3.2.0

# Date handling
npm install date-fns@^4.1.0

# Utilities
npm install clsx@^2.1.0

# Development dependencies
npm install -D vitest@^3.0.0 @testing-library/react@^16.1.0 @testing-library/user-event@^14.5.0
npm install -D @playwright/test@^1.49.0
npm install -D eslint@^9.17.0 typescript-eslint@^8.18.0 prettier@^3.4.0
npm install -D @changesets/cli@^2.27.0
```

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| **DnD Library** | @dnd-kit/core | react-dnd | Only if you need HTML5Backend with specific browser features; otherwise dnd-kit is more modern |
| **DnD Library** | @dnd-kit/core | Native HTML5 DnD | Only for extremely simple use cases; lacks accessibility and polish |
| **Date Library** | date-fns | Day.js | If you need Moment.js-like API or smaller bundle; Day.js is 2KB vs date-fns 70KB but less modular |
| **Date Library** | date-fns | Temporal (native) | Not ready yet; experimental TC39 proposal; check back in 2026+ |
| **Build Tool** | Vite + tsup | esbuild directly | If you need max control; otherwise tsup provides better library defaults |
| **Build Tool** | Vite + tsup | Webpack | Legacy projects; avoid for new libraries |
| **Testing** | Vitest | Jest | Only if migrating from Jest; Vitest is faster and ESM-native |
| **Bundling** | tsup | Rollup | If you need complex bundling; tsup is simpler for 90% of libraries |
| **Styling** | CSS Modules | Tailwind CSS | If building for Tailwind ecosystem; adds dependency for users not using Tailwind |
| **Styling** | CSS Modules | CSS-in-JS (emotion) | Avoid; runtime overhead; not tree-shakeable; RSC incompatible |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Moment.js** | 67KB minified; mutable; deprecated; not tree-shakeable | date-fns or Day.js |
| **react-beautiful-dnd** | No longer maintained; last release 2023; doesn't support React 18+ features | @dnd-kit/core |
| **Styled Components / Emotion** | Runtime overhead; poor tree-shaking; Next.js App Router issues | CSS Modules + CSS Variables |
| **PropTypes** | TypeScript makes it redundant; runtime check adds weight | TypeScript types only |
| **Classnames** | Heavier than needed; doesn't use modern optimizations | clsx (smaller, faster) |
| **Lodash** | Large bundle size; tree-shaking issues; modern JS has most methods | Native methods or lodash-es (if needed) |
| **Immutable.js** | Rarely needed; adds complexity; modern React patterns handle this | Immer (if needed) or native spread |
| **Redux / Zustand** | Component library should be stateless; let users manage state | Controlled component pattern only |
| **Create React App** | Deprecated; no longer maintained | Vite or Next.js |
| **Babel standalone** | For runtime only; use build-time transpilation | Vite with SWC (default) |
| **Material UI / Chakra** | Too heavy; hard to extract components; users bring their own design system | Unstyled components with CSS Modules |
| **D3.js** | Overkill for simple charts; heavy bundle; hard to customize | Native Canvas API or SVG for custom rendering |
| **React DnD** | Older API; HOC patterns; less performant than dnd-kit; decorator patterns outdated | @dnd-kit/core |

## Stack Patterns by Variant

**If building as standalone library:**
- Use Vite for dev server (fast HMR)
- Use tsup for production builds (dual ESM/CJS)
- Export CSS Modules as part of package
- Provide TypeScript types via `exports` field

**If building for Next.js App Router:**
- Mark components with `'use client'` directive
- Keep drag-drop interactions client-side only
- Use Server Components for static parts (headers, sidebar)
- Optimize for RSC streaming

**If targeting both library and Next.js demo:**
- Monorepo with workspace packages
- Shared source code
- Separate build configs for library vs demo
- Use changesets for versioning

**If bundle size is critical (<10KB goal):**
- Avoid date-fns; implement minimal date math using native Date
- Consider custom drag-drop instead of dnd-kit (adds ~15KB)
- Use CSS Modules only (no runtime styling)
- Tree-shake utilities; export multiple entry points

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 19 | Next.js 15+ | React 18 works with Next.js 14+ |
| @dnd-kit/core 6.3+ | React 18+ | Requires concurrent features |
| date-fns 4.x | All major frameworks | v4 is ESM-only; use v3 for CJS |
| Vite 6+ | Node.js 20+ | Requires modern Node version |
| TypeScript 5.7+ | React 19+ | For new React types support |
| Vitest 3+ | Vite 6+ | Matches Vite major version |

## Recommended Package.json Configuration

```json
{
  "name": "gantt-lib",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist"],
  "sideEffects": ["*.css"],
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "tsup": "^8.3.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.1.0",
    "@playwright/test": "^1.49.0",
    "eslint": "^9.17.0",
    "typescript-eslint": "^8.18.0",
    "prettier": "^3.4.0",
    "@changesets/cli": "^2.27.0"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.0",
    "@dnd-kit/utilities": "^3.2.0",
    "date-fns": "^4.1.0",
    "clsx": "^2.1.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsup",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "changeset": "changeset",
    "release": "changeset publish"
  }
}
```

## Stack Decision Rationale

### Rendering Approach: Canvas + DOM Hybrid

**Why:** For 100 tasks with smooth 60fps drag interactions:
- Canvas for task bars and grid (performance-critical, high update frequency)
- DOM for sidebar and headers (accessibility, keyboard nav, screen readers)
- Hybrid approach balances performance with accessibility

**Trade-offs:**
- Canvas: Better rendering performance, harder accessibility
- DOM only: Easier accessibility, worse performance at scale
- Hybrid: Best of both, requires careful coordination

### Drag-and-Drop: @dnd-kit/core

**Why chosen over react-dnd:**
- Modern React patterns (hooks, no HOCs)
- Better React 18+ concurrent rendering support
- Smaller bundle size (~15KB vs ~30KB)
- Built-in accessibility features
- Active maintenance (2024+ releases)

**When to use:**
- Task list reordering (sidebar)
- Resizable handles (task bar edges)
- If simple dragging is needed

**When NOT to use:**
- Canvas interactions need custom DnD implementation
- For ultra-lightweight builds, consider native mouse events

### Date Handling: date-fns

**Why chosen over alternatives:**
- Modular: import only needed functions
- Tree-shakeable: reduces bundle size
- Immutable: pure functions, no mutations
- TypeScript: excellent type definitions
- Locale support: only import what you need

**Alternative: Day.js**
- Use if bundle size is critical (2KB vs 70KB)
- Similar API to Moment.js (easier migration)
- Less modular than date-fns

**For this project:**
- Month-only view simplifies date math
- Could use native Date API for zero dependencies
- date-fns provides reliability and edge-case handling

### Styling: CSS Modules + CSS Variables

**Why this combination:**
- **CSS Modules:** Scoped styles; no conflicts; tree-shakeable; framework-agnostic
- **CSS Variables:** Runtime theming; user customization; zero JS overhead
- **No runtime:** No CSS-in-JS performance penalty
- **RSC compatible:** Works with Next.js Server Components

**Why NOT Tailwind CSS:**
- Adds dependency for users not using Tailwind
- Component libraries should be framework/styling-agnostic
- Users can wrap components with their own Tailwind classes

**Why NOT CSS-in-JS:**
- Runtime performance cost
- Poor tree-shaking
- Next.js App Router compatibility issues
- Larger bundle sizes

### Build Tool: Vite + tsup

**Vite for development:**
- Fast HMR (critical for drag-drop interaction development)
- Native ESM support
- Better DX than Webpack
- Good Vue/React integration

**tsup for library builds:**
- esbuild-powered (fast compilation)
- Dual ESM/CJS output
- Automatic TypeScript declaration generation
- CSS bundling
- Simple configuration

**Why not Rollup directly:**
- tsup is simpler; covers 90% of library needs
- Rollup needed for complex code-splitting scenarios

## Minimal Dependencies Stack (Zero-Dep Goal)

If achieving minimal bundle size (<10KB) is critical:

```bash
# Core only (no date-fns, no dnd-kit)
npm install react@^19.0.0
npm install -D typescript@^5.7.0 vite@^6.0.0 tsup@^8.3.0

# Build custom instead of using libraries:
# - Date math: Native Date API (simple enough for month-only view)
# - Drag-drop: Native mouse events (mousedown, mousemove, mouseup)
# - Geometry: Custom pixel-to-date calculations
# - Styling: CSS Modules (no runtime CSS)
```

**Trade-offs:**
- Pros: Minimal bundle; full control; no dependency updates
- Cons: More code to maintain; edge cases to handle; accessibility work

**Recommended approach for v1:**
- Start with minimal dependencies (date-fns only)
- Implement custom drag-drop using mouse events
- Add @dnd-kit only if complex interactions needed
- Benchmark bundle at each stage

## Performance Considerations by Stack Choice

| Stack Choice | Bundle Impact | Runtime Performance | DX Impact |
|--------------|---------------|---------------------|-----------|
| **date-fns** | +15KB (tree-shaken to ~5KB for 3 functions) | Negligible (pure functions) | Excellent (well-documented) |
| **@dnd-kit/core** | +15KB | Negligible (efficient updates) | Excellent (modern API) |
| **Custom DnD** | 0KB | Depends on implementation | Poor (more code, edge cases) |
| **Canvas rendering** | 0KB | Excellent (GPU accelerated) | Poor (harder debugging) |
| **DOM rendering** | 0KB | Poor at 100+ tasks | Excellent (easy debugging) |
| **CSS Modules** | 0KB (compile-time) | Excellent (no runtime) | Excellent (familiar) |
| **CSS-in-JS** | +10-20KB | Poor (runtime overhead) | Good (developer-friendly) |

## Recommended tsup Configuration

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";', // For Next.js App Router
    };
  },
});
```

## Recommended Vite Configuration (Dev)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
});
```

## Next.js App Router Compatibility

For Server Component compatibility:

```typescript
// Mark client components explicitly
'use client';

import { useDnD } from './hooks/useDnD';

export const GanttChart = ({ tasks }: GanttProps) => {
  // Drag-drop must be client-side
  const { handlers } = useDnD();

  return <div {...handlers} />;
};
```

**Keep server-side where possible:**
- Static date headers (can be server components)
- Task list (if no drag-drop)
- Layout structure

**Must be client-side:**
- All drag-drop interactions
- Canvas rendering
- Scroll synchronization
- Selection state

## Sources

**Note: Web services were rate-limited during research. Analysis based on:**
- Current state of React ecosystem (2025)
- Package documentation from training data (React 19, Next.js 15, Vite 6)
- Component library best practices (changesets, tsup patterns)
- Drag-and-drop library comparison (@dnd-kit vs react-dnd)
- Date handling library landscape (date-fns, Day.js)
- Modern build tooling (Vite, esbuild, tsup)

**Confidence: MEDIUM** - Stack recommendations are based on established 2024-2025 patterns, but limited by inability to verify latest package versions and documentation via web search.

**Recommended verification before implementation:**
- Verify @dnd-kit/latest version and React 19 compatibility
- Confirm date-fns v4 ESM-only implications
- Check tsup documentation for latest configuration patterns
- Verify Vitest 3.x API changes from v2
- Confirm React 19 release notes for any breaking changes

**Research gaps (web search rate-limited):**
- Latest @dnd-kit features and React 19 support
- Current date-fns v4 stability and ecosystem adoption
- tsup 8.x latest features and best practices
- React 19 specific changes affecting component libraries
- Next.js 15 App Router patterns for component libraries

---
*Stack research for: Lightweight React Gantt Chart Library*
*Researched: 2026-02-18*
