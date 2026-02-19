---
phase: quick
plan: 10
type: execute
wave: 1
depends_on: []
files_modified: [README.md]
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "README accurately reflects current monorepo structure"
    - "Installation instructions reference npm package name 'gantt-lib'"
    - "Import paths use 'gantt-lib' not '@/components'"
    - "Development commands reflect Turborepo setup"
  artifacts:
    - path: "README.md"
      provides: "Project documentation"
      contains: "gantt-lib", "monorepo", "packages/"
  key_links:
    - from: "README.md"
      to: "packages/gantt-lib/package.json"
      via: "package name reference"
      pattern: "gantt-lib"
---

<objective>
Update README.md to reflect the current monorepo structure after npm-packaging phase.

Purpose: The README still contains outdated references to the old single-repo structure (e.g., `@/components` imports, old dev commands). Users need accurate documentation to install and use the library.

Output: Updated README.md with correct monorepo structure, npm package name, and import paths.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@README.md
@.planning/STATE.md
@packages/gantt-lib/package.json
@packages/website/package.json
</context>

<tasks>

<task type="auto">
  <name>Update README for monorepo structure and npm package</name>
  <files>README.md</files>
  <action>
Update README.md with the following changes:

1. **Installation section** - Update to reflect npm package installation:
   - Add npm install option: `npm install gantt-lib`
   - Keep git clone option for contributors/dev mode

2. **Quick start imports** - Change from `@/components` to `gantt-lib`:
   ```tsx
   import { GanttChart, type Task } from 'gantt-lib';
   import 'gantt-lib/styles.css';
   ```

3. **Development section** - Update commands for Turborepo monorepo:
   - `npm run dev` - starts dev server (website package)
   - `npm run build` - builds all packages
   - `npm run test` - runs tests (gantt-lib package)
   - Note that commands run from root using Turborepo

4. **Add section about monorepo structure** - explain packages/ layout:
   - packages/gantt-lib/ - library source
   - packages/website/ - demo site

5. **Keep unchanged** - Features table, props interface, customization examples, stack section (still accurate)

Do NOT change: Russian language, feature descriptions, TypeScript interfaces, CSS customization examples.
  </action>
  <verify>grep -E "(gantt-lib|monorepo|packages/)" README.md | head -20</verify>
  <done>
README.md updated with:
- npm package install command added
- Import paths changed to 'gantt-lib'
- Dev commands updated for Turborepo
- Monorepo structure explained
- All existing content preserved and improved
  </done>
</task>

</tasks>

<verification>
- README mentions 'gantt-lib' as npm package name
- Import examples use 'gantt-lib' not '@/components'
- Development section references Turborepo
- Monorepo structure is documented
</verification>

<success_criteria>
README.md accurately describes:
1. How to install via npm (`npm install gantt-lib`)
2. How to import from library (`import { GanttChart } from 'gantt-lib'`)
3. Monorepo structure with packages/gantt-lib and packages/website
4. Turborepo-based development workflow
</success_criteria>

<output>
After completion, create `.planning/quick/10-readme/10-SUMMARY.md`
</output>
