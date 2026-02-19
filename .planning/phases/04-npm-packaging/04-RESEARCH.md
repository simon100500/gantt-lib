# Phase 4: npm-packaging - Research

**Researched:** 2026-02-20
**Domain:** npm monorepo, tsup library build, Turborepo, CSS modules distribution
**Confidence:** HIGH (core stack), MEDIUM (CSS modules pipeline), HIGH (pitfalls)

## Summary

Restructuring an existing Next.js app into a Turborepo monorepo with npm workspaces is a well-traveled path with clear patterns. The migration involves creating a root `package.json` with `"workspaces": ["packages/*"]`, moving library source to `packages/gantt-lib/src/`, creating a fresh Next.js 15 app at `packages/website/`, and installing Turborepo as the task orchestrator.

The most significant technical challenge in this phase is CSS delivery from the library. The components use CSS Modules (`.module.css` files), and tsup's CSS Modules support is experimental with known limitations. The correct approach is to abandon CSS Modules scoping in the library distribution and instead use a single aggregated `dist/styles.css` file with plain CSS. The mechanism: import all component CSS files from a central `src/styles.css`, then let tsup emit it as `dist/index.css`, then rename via `onSuccess`. Alternatively, use `loader: { '.css': 'copy' }` to pass through CSS files and concatenate them post-build.

The `"use client"` directive issue with CJS output is a real pitfall: the simple `banner` option does NOT work for CJS because `"use strict"` gets injected before it. The correct fix is `esbuild-plugin-preserve-directives` via `esbuildPlugins`. Since all library exports are client components (they all have `'use client'` already), using the `banner` option IS acceptable if the library only ships ESM — but to support both CJS and ESM correctly, the preserve-directives plugin is required.

**Primary recommendation:** Use tsup with `esbuild-plugin-preserve-directives` for `"use client"` handling, aggregate all CSS into a single entry CSS file imported from `src/index.ts`, and use `onSuccess` to rename the output to `dist/styles.css`. Use Turborepo's `tasks` (not `pipeline`) syntax with a minimal build/dev/test config.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Repository structure
- Monorepo with npm workspaces: `packages/gantt-lib` (library) and `packages/website` (demo)
- Turborepo for build orchestration (`turbo.json`)
- Root `package.json` is private, workspaces include `packages/*`
- Shared `tsconfig.json` at root

#### Library package (`packages/gantt-lib`)
- Package name: `gantt-lib`
- Version: `0.0.1`
- Build tool: `tsup`
- Dual output: CJS (`dist/index.js`) + ESM (`dist/index.mjs`) + TypeScript declarations (`dist/index.d.ts`)
- `"use client"` directive required — library is a React component library (Next.js App Router compat)

#### Exports
- All components exposed: `GanttChart`, `TaskRow`, `TimeScaleHeader`, `GridBackground`, `TodayIndicator`, `DragGuideLines`
- All hooks exposed: `useTaskDrag`
- All utils exposed: `dateUtils`, geometry helpers
- All TypeScript types exposed: `Task`, `GanttChartProps`, etc.
- Single entry point — `import { GanttChart, type Task } from 'gantt-lib'`

#### CSS delivery
- Separate CSS file: `dist/styles.css`
- Consumer imports CSS explicitly: `import 'gantt-lib/styles.css'`
- `exports` field includes explicit CSS subpath: `"./styles.css": "./dist/styles.css"`

#### package.json exports field
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

#### Peer dependencies
- `react: >=18` and `react-dom: >=18` — supports React 18 and 19
- Verify no React 19-only APIs are used in library source
- `date-fns: ^4.1.0` — listed in `dependencies` (installed automatically)
- `clsx` — bundled into dist via tsup (NOT listed as dep or peerDep, consumers don't install it)

#### Demo site (`packages/website`)
- Fresh Next.js 15 app — does NOT preserve existing pages/modal
- Single clean demo page showing `GanttChart` working
- Imports `gantt-lib` from workspace: `"gantt-lib": "*"`
- `react: ^19.0.0` in website's own dependencies

### Claude's Discretion
- Turborepo pipeline configuration (task dependencies, caching)
- tsup config details (sourcemaps, minification, external handling)
- Demo page layout and example tasks data
- tsconfig inheritance between root and packages

### Deferred Ideas (OUT OF SCOPE)
- None listed
</user_constraints>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsup | ^8.5.x | Bundle library to CJS + ESM + .d.ts | esbuild-powered, zero-config for TypeScript libraries, dual-format output out of the box |
| turbo | ^2.x | Monorepo task orchestration | Industry standard for npm/pnpm/yarn workspaces; caching, parallel execution, dep-aware ordering |
| esbuild-plugin-preserve-directives | ^0.x | Preserve `"use client"` in CJS output | Fixes the `"use strict"` ordering bug that breaks the `banner` approach for CJS |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-tsconfig-paths | ^5.x | Resolve tsconfig `paths` in vitest | Use in library package's `vitest.config.ts` to support `@/*` aliases during tests |
| @vitejs/plugin-react | ^4.x | React JSX transform in vitest | Already present in existing vitest.config.ts; carry over to library package |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsup | Rollup + rollup-plugin-preserve-directives | Rollup has better per-file directive handling, but tsup is simpler and decided |
| tsup | Vite lib mode | Vite has better CSS Modules native support, but tsup is decided |
| esbuild-plugin-preserve-directives | `banner: { js: '"use client"' }` | Banner approach BREAKS CJS output — `"use strict"` precedes it |
| npm workspaces | pnpm workspaces | pnpm has `workspace:*` protocol, but npm workspaces with `"*"` works and is decided |

**Installation (library devDeps):**
```bash
npm install --save-dev tsup esbuild-plugin-preserve-directives
```

**Installation (root):**
```bash
npm install --save-dev turbo
```

## Architecture Patterns

### Recommended Project Structure

```
gantt-lib/                           # repo root
├── package.json                     # private: true, workspaces: ["packages/*"]
├── turbo.json                       # task pipeline
├── tsconfig.json                    # base tsconfig (no paths, just compilerOptions)
├── .gitignore                       # add .turbo
├── packages/
│   ├── gantt-lib/                   # publishable library
│   │   ├── package.json             # name: gantt-lib, exports, peerDeps
│   │   ├── tsup.config.ts
│   │   ├── tsconfig.json            # extends ../../tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── src/
│   │   │   ├── index.ts             # single entry point + CSS import
│   │   │   ├── styles.css           # aggregated import of all component CSS
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   └── dist/                    # gitignored build output
│   │       ├── index.js             # CJS
│   │       ├── index.mjs            # ESM
│   │       ├── index.d.ts           # types
│   │       └── styles.css           # aggregated CSS
│   └── website/                     # fresh Next.js 15 demo
│       ├── package.json             # "gantt-lib": "*"
│       ├── next.config.js           # transpilePackages not needed (pre-built)
│       ├── tsconfig.json            # extends ../../tsconfig.json
│       └── src/
│           └── app/
│               └── page.tsx         # demo page
└── node_modules/                    # hoisted workspace deps
```

### Pattern 1: Monorepo File Migration Order

**What:** The migration must be done in a specific order to avoid breaking the git working tree.

**Order:**
1. Create root scaffolding (`packages/`, root `package.json`, `turbo.json`, root `tsconfig.json`)
2. Use `git mv` to move library source: `src/` → `packages/gantt-lib/src/`
3. Create `packages/gantt-lib/package.json` (new, not moved — it's a new package definition)
4. Create `packages/gantt-lib/tsup.config.ts`, `vitest.config.ts`, `tsconfig.json`
5. Create `packages/website/` as a fresh `create-next-app` output (not migrated from existing)
6. Update root `node_modules` with `npm install` from root
7. Wire up workspace dependency in website's `package.json`

**Why git mv matters:** `git mv src/ packages/gantt-lib/src/` preserves file history so `git log --follow` works. Without it, git treats the files as deleted + created, losing blame/history.

### Pattern 2: tsup Configuration for This Library

**What:** tsup config that produces CJS + ESM + types + separate CSS, with correct `"use client"` handling.

**Example:**
```typescript
// packages/gantt-lib/tsup.config.ts
// Source: tsup docs + esbuild-plugin-preserve-directives README
import { defineConfig } from 'tsup';
import { preserveDirectivesPlugin } from 'esbuild-plugin-preserve-directives';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'date-fns'],
  // clsx is NOT external — it gets bundled
  esbuildPlugins: [
    preserveDirectivesPlugin({
      directives: ['use client', 'use strict'],
      include: /\.(js|ts|jsx|tsx)$/,
    }),
  ],
  onSuccess: 'node -e "const fs=require(\'fs\'); const files=fs.readdirSync(\'dist\').filter(f=>f.endsWith(\'.css\')); if(files.length>0){fs.renameSync(\'dist/\'+files[0],\'dist/styles.css\')}"',
});
```

**Note on CSS:** tsup will emit a `.css` file when CSS is imported from the entry point. The `onSuccess` script renames whatever CSS tsup emits to `dist/styles.css`. On Windows (the dev environment), use a Node.js script rather than shell `cat`/`mv`.

### Pattern 3: CSS Aggregation for Library Distribution

**What:** CSS Modules scoped classnames work fine within the library. The key is ensuring all CSS gets collected into `dist/styles.css`.

**Approach — Import aggregator:**
```css
/* packages/gantt-lib/src/styles.css */
@import './components/GanttChart/GanttChart.module.css';
@import './components/TaskRow/TaskRow.module.css';
@import './components/TimeScaleHeader/TimeScaleHeader.module.css';
@import './components/TodayIndicator/TodayIndicator.module.css';
@import './components/DragGuideLines/DragGuideLines.module.css';
@import './components/GridBackground/GridBackground.module.css';
```

```typescript
// packages/gantt-lib/src/index.ts
import './styles.css';   // ← triggers tsup CSS emission
export { GanttChart } from './components/GanttChart';
// ... all other exports
```

**IMPORTANT:** CSS Modules class names (`.container`, `.stickyHeader`, etc.) are local by default and will be scoped/mangled by the esbuild CSS Modules plugin. Since the CSS is being distributed as plain CSS (not consumed through a CSS Modules-aware bundler), the class names must remain stable.

**Resolution:** The components reference CSS Modules via `import styles from './GanttChart.module.css'`. When tsup processes these without a CSS Modules plugin, it treats them as regular CSS. The JS side gets `styles.container` as an object lookup, which works if the CSS class names in the emitted CSS match. **Verify this behavior** — the safest option is to convert `.module.css` files to plain `.css` files for the library distribution, keeping component styles non-scoped (they are already using CSS custom properties / variables for theming, not generic class names like `.button`).

### Pattern 4: Turborepo turbo.json for 2-Package Monorepo

**What:** Minimal pipeline for build → website depends on gantt-lib build completing first.

**Example:**
```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
```

**Key:** `"dependsOn": ["^build"]` means "build all dependencies first". When website builds, Turborepo runs `gantt-lib`'s `build` first, ensuring `dist/` exists. This is required — the website imports from the built `dist/`, not source.

### Pattern 5: npm Workspaces — How Local Resolution Works

**What:** When `packages/website/package.json` declares `"gantt-lib": "*"`, npm symlinks `node_modules/gantt-lib` → `packages/gantt-lib/`. Resolution is automatic after `npm install` from root.

**Important for dev workflow:** The website imports from `dist/` (via `exports` in `package.json`). This means:
- During dev, `gantt-lib` must be built before website can run
- `turbo dev` with `dependsOn: ["^build"]` on the dev task would pre-build the lib, but for active library development, you need `turbo build --filter=gantt-lib --watch` + `turbo dev --filter=website` in parallel
- Or: run `turbo dev` and accept that library changes require a rebuild

**The `"*"` version:** npm workspaces treat `"*"` as "any version from local workspace". It's equivalent to pnpm's `"workspace:*"` in behavior during monorepo development. When publishing, `"*"` does NOT get replaced with the actual version (unlike pnpm's `workspace:*` protocol) — this only matters when publishing the website, which is not in scope here.

### Pattern 6: TypeScript Config for 2-Package Monorepo

**What:** Shared root `tsconfig.json` as a base; each package extends it.

**Root `tsconfig.json`** (base compiler options only, NO paths or project refs — keep simple):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
```

**packages/gantt-lib/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "declarationDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/__tests__/**"]
}
```

**packages/website/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "esnext",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["src/**/*", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

**Decision: no TypeScript project references.** For a 2-package monorepo, project references add maintenance overhead without meaningful benefit. Use workspace + tsup `dts: true` for type generation. TypeScript project references are overkill for this scope.

### Pattern 7: ESLint in Monorepo

**What:** ESLint v9 flat config for monorepo. Current project has ESLint v9 with `eslint.config.mjs` (typical for Next.js 15).

**Simple approach for 2-package monorepo:** Single root `eslint.config.mjs` with glob-based per-package rules. ESLint v9 loads only the root config when run from root — use glob patterns to differentiate packages.

**Note:** ESLint v10 (released February 2026) changes the lookup to start from the file being linted, enabling true per-directory configs. If the project is staying on ESLint v9, use the v10 behavior early with the `v10_config_lookup_from_file` flag, or just use a single root config with globs.

### Anti-Patterns to Avoid

- **Using `banner: { js: '"use client"' }` without the preserve-directives plugin:** In CJS output, `"use strict"` is injected BEFORE the banner, breaking the directive. Next.js App Router will throw "The `use client` directive must be placed before other expressions."
- **Making `clsx` a peer dependency or external:** The decision is to bundle it. Do NOT add it to `external: []` in tsup config.
- **Making `date-fns` external AND not listing it in dependencies:** It IS in `dependencies` (consumers get it automatically). Make it `external` in tsup so it's not bundled — it will be resolved by the consumer's package manager.
- **Using `transpilePackages: ['gantt-lib']` in website's next.config:** This is for source-first packages. Since gantt-lib ships pre-built `dist/`, `transpilePackages` is NOT needed and should be AVOIDED — especially since Turbopack has bugs with `transpilePackages` for monorepo packages.
- **Running `npm install` per-package instead of from root:** With npm workspaces, always run `npm install` from root. Per-package installs break hoisting and symlinks.
- **Moving files with regular `cp`/`mv` instead of `git mv`:** Regular move breaks `git log --follow` file history.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `"use client"` preservation in CJS | Custom esbuild plugin | `esbuild-plugin-preserve-directives` | Handles `"use strict"` ordering bug, battle-tested |
| CSS aggregation renaming | Complex build script | Simple `onSuccess` Node.js one-liner | tsup already emits the CSS; just rename it |
| Workspace dependency resolution | `npm link` or path aliases | npm workspaces native symlinks | Automatic after `npm install` from root |
| Build orchestration | Custom shell scripts | Turborepo | Caching, parallel execution, dep-aware ordering |

**Key insight:** The hardest part of this phase is CSS distribution, not monorepo setup. Don't attempt to hand-roll CSS Modules injection into JS — distribute plain CSS and require explicit import.

## Common Pitfalls

### Pitfall 1: `"use client"` + CJS Output

**What goes wrong:** The built CJS file starts with `"use strict";Object.defineProperty(...);"use client";` — `"use client"` is NOT the first expression, so Next.js App Router throws an error.

**Why it happens:** tsup uses esbuild, which injects `"use strict"` and `exports` preamble BEFORE any banner text in CJS format.

**How to avoid:** Use `esbuild-plugin-preserve-directives` via `esbuildPlugins` in tsup config. This plugin intercepts the `onEnd` hook and moves directives to the top of output files.

**Warning signs:** Consumer Next.js app throws "The `use client` directive must be placed before other expressions" when importing from `gantt-lib`.

### Pitfall 2: CSS Modules Class Name Mangling

**What goes wrong:** The library is built with an esbuild CSS Modules plugin that mangles `.container` to `._container_abc123_1`. The emitted CSS has mangled names, but the component references the mangled name via the JS object. When the consumer imports `gantt-lib/styles.css`, it gets the mangled CSS — this works. BUT: if the build emits class names differently between CJS and ESM builds, or if the hash changes between builds, styles break.

**Why it happens:** tsup runs separate CJS and ESM builds. CSS Modules hash is content-based, but build order differences can produce different hashes.

**How to avoid:** Convert `.module.css` files to plain `.css` files for library distribution, OR keep `.module.css` and ensure both formats share the same CSS emission (use `splitting: false`). The simplest solution: since component class names are unique (`.ganttContainer`, `.taskRow`, not generic like `.btn`), converting to plain CSS loses nothing.

**Warning signs:** Styles apply in dev but not in production, or styles are applied but class names don't match.

### Pitfall 3: `date-fns` Dual-Listed as Both External and Peer

**What goes wrong:** `date-fns` is in both `external` (tsup) and `dependencies` (package.json). This is correct. If it's accidentally added to `peerDependencies` instead of `dependencies`, consumers must install it manually — inconsistent with the decision.

**How to avoid:** `date-fns` goes in `dependencies` only (auto-installed for consumers). `external: ['react', 'react-dom', 'date-fns']` in tsup tells the bundler "don't bundle this, the consumer will provide it" — but since it's in `dependencies`, npm installs it automatically.

### Pitfall 4: Website Dev Server Can't Find Library Types

**What goes wrong:** After moving files, `packages/website` can't import `gantt-lib` because either (a) the library hasn't been built yet, or (b) TypeScript can't find the types.

**Why it happens:** `packages/website/package.json` declares `"gantt-lib": "*"`. npm creates a symlink to `packages/gantt-lib/`. But the package's `exports` points to `dist/index.d.ts` which only exists after `tsup` runs.

**How to avoid:** Always run `turbo build --filter=gantt-lib` before starting the website dev server. In `turbo.json`, the `dev` task for website should list `gantt-lib#build` as a dependency, OR use `turbo dev` which inherits the `dependsOn: ["^build"]` from `build`.

**Warning signs:** TypeScript error "Cannot find module 'gantt-lib'" in the website, despite the symlink existing.

### Pitfall 5: Turbopack + `transpilePackages` Combination

**What goes wrong:** If `transpilePackages: ['gantt-lib']` is added to website's `next.config.js`, it breaks with Turbopack (Next.js 15's default bundler). Known open bug in Next.js.

**How to avoid:** Do NOT use `transpilePackages` for pre-built library packages. Pre-built packages (with `dist/` + `exports`) do not need `transpilePackages`.

**Warning signs:** Next.js dev server errors about module resolution with Turbopack enabled.

### Pitfall 6: Windows Shell in `onSuccess`

**What goes wrong:** `onSuccess: 'cat dist/*.css > dist/styles.css'` fails on Windows because `cat` and glob expansion don't work in cmd.exe/PowerShell.

**How to avoid:** Use a Node.js script for the `onSuccess` step, not shell commands. Platform-agnostic.

```typescript
onSuccess: async () => {
  const fs = await import('fs');
  const path = await import('path');
  const distDir = path.join(process.cwd(), 'dist');
  const cssFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.css') && f !== 'styles.css');
  if (cssFiles.length > 0) {
    fs.renameSync(path.join(distDir, cssFiles[0]), path.join(distDir, 'styles.css'));
  }
}
```

## Code Examples

Verified patterns from official sources and confirmed community patterns:

### Root package.json (monorepo)
```json
{
  "name": "gantt-lib-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.7.0"
  }
}
```

### packages/gantt-lib/package.json
```json
{
  "name": "gantt-lib",
  "version": "0.0.1",
  "license": "MIT",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "lint": "eslint src/"
  },
  "dependencies": {
    "date-fns": "^4.1.0"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "tsup": "^8.5.0",
    "typescript": "^5.7.0",
    "esbuild-plugin-preserve-directives": "^0.0.6",
    "@vitejs/plugin-react": "^4.3.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "vitest": "^3.0.0",
    "jsdom": "^25.0.0"
  }
}
```

### packages/website/package.json (key fields)
```json
{
  "name": "website",
  "private": true,
  "dependencies": {
    "gantt-lib": "*",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

### turbo.json (complete)
```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^build"]
    },
    "test": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
```

**Note on `dev` + `dependsOn: ["^build"]`:** This ensures that when running `turbo dev`, the library is built before the website dev server starts. Without this, the website can't find `dist/index.mjs`.

### packages/gantt-lib/src/index.ts (public API entry point)
```typescript
// CSS must be imported to trigger tsup CSS emission
import './styles.css';

// Components
export { GanttChart } from './components/GanttChart';
export type { Task, GanttChartProps } from './components/GanttChart/GanttChart';
export { TaskRow } from './components/TaskRow';
export { TimeScaleHeader } from './components/TimeScaleHeader';
export { GridBackground } from './components/GridBackground';
export { TodayIndicator } from './components/TodayIndicator';
export { DragGuideLines } from './components/DragGuideLines/DragGuideLines';

// Hooks
export { useTaskDrag } from './hooks/useTaskDrag';

// Utils
export * from './utils/dateUtils';
export * from './utils/geometry';

// Types
export type {
  GanttDateRange,
  TaskBarGeometry,
  GridConfig,
  MonthSpan,
  GridLine,
  WeekendBlock,
} from './types';
```

### packages/gantt-lib/vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.ts', 'src/**/__tests__/**/*.tsx'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*'],
    },
  },
});
```

**Key difference from current config:** No `@/*` path alias needed (library uses relative imports internally). No `next` plugin. No `.next` exclusion.

### git mv migration command sequence
```bash
# From repo root
mkdir -p packages/gantt-lib packages/website

# Move library source (preserves git history)
git mv src packages/gantt-lib/src

# Move test infrastructure (if tests are in src/)
# Tests are at src/__tests__/ — they move with src/

# Note: DO NOT git mv the following — they stay/are recreated:
# - package.json (root gets new one; gantt-lib gets new one)
# - tsconfig.json (root gets new base; packages get package-specific ones)
# - next.config.js (website-specific, won't exist at root)
# - vitest.config.ts (package-specific, new one in gantt-lib)
# - next-env.d.ts (only in website)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pipeline` key in turbo.json | `tasks` key in turbo.json | Turborepo v2 | Old `pipeline` key still works as alias but `tasks` is canonical |
| `next-transpile-modules` npm package | `transpilePackages` in next.config | Next.js 13.1 | Built-in, no extra package needed |
| `.eslintrc.json` per directory | `eslint.config.mjs` (flat config) at root | ESLint v9 (default) / v8 (opt-in) | Single root config with glob overrides |
| `banner: { js: '"use client"' }` | `esbuild-plugin-preserve-directives` | ~2023-2024 | Banner approach broken for CJS; plugin handles correctly |
| TypeScript project references for monorepos | Workspaces + per-package tsconfig extending base | Ongoing | Project refs are optional; for 2 packages they add more maintenance than value |

**Deprecated/outdated:**
- `pipeline` key in turbo.json: Replaced by `tasks` in Turborepo v2. Still works as an alias but will likely be removed.
- `npm link` for local package development: Replaced by npm workspaces automatic symlinks.
- `transpilePackages` for pre-built workspace packages: Not needed and actively buggy with Turbopack.

## Open Questions

1. **CSS Modules in tsup — class name stability**
   - What we know: tsup treats `.module.css` imports with experimental CSS support; class names may or may not be scoped/mangled depending on whether a CSS Modules plugin is active
   - What's unclear: Whether tsup (without explicit CSS Modules plugin) passes `.module.css` through as plain CSS (preserving `.container` class names) or mangles them
   - Recommendation: Test with a minimal tsup build immediately. If mangling occurs, convert `.module.css` → `.css` (drop the Modules suffix) for the library package. The component CSS names are already unique enough (`.ganttContainer`, `.taskRow`, `.stickyHeader`) that CSS Modules scoping is not needed in the distribution.

2. **Modal component — include or exclude?**
   - What we know: `src/components/Modal/` exists in current codebase and is in `src/components/index.ts`. It is NOT listed in the locked decisions for exported components.
   - What's unclear: Is Modal part of the library export or website-only?
   - Recommendation: Treat Modal as website-only (demo UI). Do NOT export it from `gantt-lib`. Move it to `packages/website/src/components/`.

3. **`date-fns` external vs bundled**
   - What we know: Decision is `date-fns` in `dependencies` (auto-installed). The tsup config should mark it `external` so it's not bundled.
   - What's unclear: Whether `date-fns` v4 has any tree-shaking implications from being external vs bundled.
   - Recommendation: Mark as `external` in tsup. It will be resolved from the consumer's `node_modules` (installed automatically via `dependencies`). This is standard practice.

4. **ESLint config location**
   - What we know: Current root has `eslint.config.mjs`. Claude's discretion for this.
   - Recommendation: Keep a single root `eslint.config.mjs` with glob-based rules for `packages/gantt-lib` (no Next.js rules) vs `packages/website` (with Next.js rules). ESLint v9 loads the root config when run from root via Turborepo.

## Sources

### Primary (HIGH confidence)
- Turborepo official docs (turborepo.dev/docs) — structuring, task configuration, adding to existing repo
- tsup GitHub issues #536, #1101, #1106 — CSS Modules status, `"use client"` behavior
- npm workspaces docs (docs.npmjs.com) — workspace declaration, symlink behavior

### Secondary (MEDIUM confidence)
- WebSearch: tsup + CSS Modules + separate file — multiple sources confirm the `import './styles.css'` from entry pattern
- WebSearch: `esbuild-plugin-preserve-directives` — multiple sources confirm this is the correct fix for CJS `"use client"` issue
- WebSearch: Turborepo + Next.js 15 + pre-built packages — confirms `transpilePackages` NOT needed for pre-built dist
- WebSearch: ESLint v9 flat config monorepo — multiple sources confirm single-root-config-with-globs approach
- WebSearch: TypeScript monorepo — confirms project references overkill for 2-package repos

### Tertiary (LOW confidence)
- Specific tsup `onSuccess` CSS rename behavior on Windows — inferred from Node.js fs API; not verified against tsup latest docs
- Exact `esbuild-plugin-preserve-directives` version compatibility with tsup 8.5.x — check npm on implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — tsup, Turborepo, esbuild-plugin-preserve-directives all verified via official sources and community
- Architecture: HIGH — monorepo migration pattern is well-documented; file structure follows Turborepo conventions
- CSS pipeline: MEDIUM — CSS Modules in tsup is experimental; class name stability needs hands-on verification
- Pitfalls: HIGH — `"use client"` CJS bug, `transpilePackages` Turbopack bug, Windows shell in `onSuccess` all verified
- tsconfig approach: HIGH — simple extend-from-base is confirmed correct for 2-package repos

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days — tools are stable but CSS Modules in tsup is actively evolving)
