# Phase 4: npm-packaging - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the current monolithic Next.js app into a monorepo. Extract the Gantt chart library into a publishable npm package (`packages/gantt-lib`) and create a fresh demo site (`packages/website`). The library should be installable via `npm install gantt-lib` and expose all components, hooks, utils, and types from a single entry point.

</domain>

<decisions>
## Implementation Decisions

### Repository structure
- Monorepo with npm workspaces: `packages/gantt-lib` (library) and `packages/website` (demo)
- Turborepo for build orchestration (`turbo.json`)
- Root `package.json` is private, workspaces include `packages/*`
- Shared `tsconfig.json` at root

### Library package (`packages/gantt-lib`)
- Package name: `gantt-lib`
- Version: `0.0.1`
- Build tool: `tsup`
- Dual output: CJS (`dist/index.js`) + ESM (`dist/index.mjs`) + TypeScript declarations (`dist/index.d.ts`)
- `"use client"` directive required — library is a React component library (Next.js App Router compat)

### Exports
- All components exposed: `GanttChart`, `TaskRow`, `TimeScaleHeader`, `GridBackground`, `TodayIndicator`, `DragGuideLines`
- All hooks exposed: `useTaskDrag`
- All utils exposed: `dateUtils`, geometry helpers
- All TypeScript types exposed: `Task`, `GanttChartProps`, etc.
- Single entry point — `import { GanttChart, type Task } from 'gantt-lib'`

### CSS delivery
- Separate CSS file: `dist/styles.css`
- Consumer imports CSS explicitly: `import 'gantt-lib/styles.css'`
- `exports` field includes explicit CSS subpath: `"./styles.css": "./dist/styles.css"`

### package.json exports field
```json
"exports": {
  ".": {
    "import": "./dist/index.mjs",
    "require": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "./styles.css": "./dist/styles.css"
}
```

### Peer dependencies
- `react: >=18` and `react-dom: >=18` — supports React 18 and 19
- Verify no React 19-only APIs are used in library source

### Dependencies
- `date-fns: ^4.1.0` — listed in `dependencies` (installed automatically)
- `clsx` — bundled into dist via tsup (NOT listed as dep or peerDep, consumers don't install it)

### Demo site (`packages/website`)
- Fresh Next.js 15 app — does NOT preserve existing pages/modal
- Single clean demo page showing `GanttChart` working
- Imports `gantt-lib` from workspace: `"gantt-lib": "*"`
- `react: ^19.0.0` in website's own dependencies

### Claude's Discretion
- Turborepo pipeline configuration (task dependencies, caching)
- tsup config details (sourcemaps, minification, external handling)
- Demo page layout and example tasks data
- tsconfig inheritance between root and packages

</decisions>

<specifics>
## Specific Ideas

- User provided a complete structure upfront — treat it as the canonical layout reference
- "установил и всё одним пакетом" (install and everything works from one package) — single import, no partial installs
- The existing Next.js app structure (`src/`) becomes the source for `packages/gantt-lib/src/` and `packages/website/src/`

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-npm-packaging*
*Context gathered: 2026-02-20*
