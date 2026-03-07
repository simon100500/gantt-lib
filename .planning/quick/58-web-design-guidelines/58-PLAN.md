---
phase: quick-58
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/website/src/app/page.tsx
  - packages/website/src/app/globals.css
  - packages/gantt-lib/src/components/GanttChart/GanttChart.css
  - packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.css
  - packages/gantt-lib/src/components/TaskList/TaskList.css
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: false
requirements: [DESIGN-01]

must_haves:
  truths:
    - "Demo page has a clear, professional header with library name and description"
    - "Demo sections are visually separated with consistent spacing and typography"
    - "Control buttons (Today, Show/Hide Task List, etc.) are grouped in a styled toolbar strip"
    - "GanttChart has a subtle border-radius and shadow — feels like a polished component card"
    - "TimeScaleHeader today marker, weekend highlight, and month separators are visually refined"
    - "TaskList header cells have proper uppercase tracking and muted color — reads like a data table"
    - "Task bars have a consistent border-radius and look like those in Notion/Linear/Jira"
  artifacts:
    - path: "packages/website/src/app/page.tsx"
      provides: "Redesigned demo page layout"
    - path: "packages/website/src/app/globals.css"
      provides: "Base typography, CSS custom properties for demo shell"
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.css"
      provides: "Refined chart container — border-radius, subtle shadow"
    - path: "packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.css"
      provides: "Polished header — today pill, weekend tone, month separator"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Table-like task list — proper header style, row hover, chip polish"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "Modern task bar — rounded, hover shadow, divider color"
  key_links:
    - from: "packages/website/src/app/globals.css"
      to: "packages/website/src/app/page.tsx"
      via: "CSS custom properties consumed by demo page classes"
    - from: "packages/gantt-lib/src/styles.css"
      to: "packages/website/src/app/layout.tsx"
      via: "import 'gantt-lib/styles.css' — all library CSS loaded here"
---

<objective>
Audit and apply web-design-guidelines to the gantt-lib demo page and library CSS.
The demo currently uses plain inline styles and raw utility values. It should look like
a modern OSS library demo — clean, consistent, professional — comparable to FullCalendar,
DHTMLX Gantt, or Frappe Gantt demo pages.

Purpose: First impressions matter for npm adoption. A polished demo drives trust.
Output: Redesigned page.tsx demo shell + refined library CSS (chart, header, task list, task bar).
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Skill: web-design-guidelines — run the audit skill against the files listed below, then
implement the fixes identified. The skill evaluates: typography hierarchy, spacing consistency,
color palette coherence, component visual polish, and layout structure.

Files to audit (pass to skill):
- packages/website/src/app/page.tsx — demo shell (inline styles, button group, section layout)
- packages/website/src/app/globals.css — base CSS (near-empty currently)
- packages/gantt-lib/src/components/GanttChart/GanttChart.css
- packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.css
- packages/gantt-lib/src/components/TaskList/TaskList.css
- packages/gantt-lib/src/components/TaskRow/TaskRow.css

Known issues to address regardless of skill output:
1. page.tsx uses scattered inline styles — replace with CSS classes in globals.css
2. Buttons have no group container — add a `.demo-controls` flex row
3. Section wrappers use inline border + border-radius but no cohesive card style
4. TimeScaleHeader today cell is a solid `#dc2626` square — should be a rounded pill or accent dot
5. Weekend background `#fee2e2` is harsh red — soften to a warm neutral or very light red
6. TaskList header cells lack uppercase letter-spacing — looks like data but reads like body text
7. Task bar `border-radius` is controlled by CSS variable but no default is set — bars appear square
8. Demo page title is plain h1 with no visual hierarchy above the first chart
9. External task name color `#00389f` is inconsistent with blue palette used elsewhere (`#3b82f6`)
10. Divider line on task rows uses `#999` — should use `--gantt-grid-line-color` variable
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 0: Run web-design-guidelines skill audit</name>
  <what-built>
    The orchestrator will run the web-design-guidelines skill against the files listed in
    the context section above. The skill will produce a structured audit report identifying
    design issues across: typography, spacing, color, component polish, layout.
  </what-built>
  <how-to-verify>
    Review the skill audit output. The executor (next task) will use it together with
    the known issues listed in the context to decide exactly what to change.
    If the audit identifies additional issues beyond the 10 listed — note them for Task 1.
    Type "approved" when you have reviewed the audit and want Task 1 to proceed.
  </how-to-verify>
  <resume-signal>Type "approved" or list additional issues to address</resume-signal>
</task>

<task type="auto">
  <name>Task 1: Redesign demo page shell</name>
  <files>
    packages/website/src/app/page.tsx,
    packages/website/src/app/globals.css
  </files>
  <action>
    Apply web-design-guidelines audit findings + known issues to the demo page.

    In globals.css, add a demo shell design system:
    - CSS custom properties: `--demo-bg: #f9fafb`, `--demo-max-width: 1200px`,
      `--demo-section-gap: 3rem`, `--demo-text-muted: #6b7280`, `--demo-border: #e5e7eb`
    - `.demo-page`: max-width, margin auto, padding, background color
    - `.demo-hero`: styled header area with library name (large, bold), tagline (muted),
      install snippet in a `<code>` tag with light gray background and monospace font
    - `.demo-section`: margin-bottom with `--demo-section-gap`, no other decoration
    - `.demo-section-title`: font-size 1.125rem, font-weight 600, color #111827, margin-bottom 0.5rem
    - `.demo-section-desc`: font-size 0.875rem, color var(--demo-text-muted), margin-bottom 1rem
    - `.demo-controls`: display flex, gap 0.5rem, flex-wrap wrap, margin-bottom 1rem, align-items center
    - `.demo-chart-card`: border 1px solid var(--demo-border), border-radius 10px, overflow hidden
      (no padding — GanttChart fills edge-to-edge inside the card)
    - `.demo-btn`: base button styles extracted from inline — border-radius 6px, font-size 0.875rem,
      font-weight 500, padding 0.4rem 0.9rem, border none, cursor pointer, transition 150ms
    - `.demo-btn-primary`: blue (#3b82f6 bg, white text), hover #2563eb
    - `.demo-btn-neutral`: gray (#f3f4f6 bg, #374151 text), hover #e5e7eb
    - `.demo-btn-danger`: red (#ef4444 bg, white text), hover #dc2626
    - `.demo-btn-active`: green (#10b981 bg, white text), hover #059669
    - `.demo-checkbox-label`: font-size 0.875rem, color #374151, display flex, align-items center, gap 0.375rem

    In page.tsx:
    - Wrap `<main>` content in `<div className="demo-page">`
    - Replace `<h1>` / `<p>` header with a `<header className="demo-hero">` block containing
      `<h1>gantt-lib</h1>`, tagline paragraph, and install code snippet
    - Wrap each demo section in `<section className="demo-section">`
    - Replace `<h2>` with `<h2 className="demo-section-title">`
    - Replace `<p>` descriptions with `<p className="demo-section-desc">`
    - Wrap all control buttons in `<div className="demo-controls">`
    - Replace all inline `style={{...}}` on buttons with `className="demo-btn demo-btn-*"`
      (remove all `onMouseEnter`/`onMouseLeave` hover JS — CSS handles hover now)
    - Replace all chart wrapper `<div style={{ border... padding... }}>` with
      `<div className="demo-chart-card">`
    - Replace checkbox label inline style with `<label className="demo-checkbox-label">`

    Do NOT change any GanttChart props, task data arrays, or callback handlers.
    Do NOT add new sections or remove existing demo sections.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npm run build --workspace=packages/website 2>&1 | tail -5</automated>
  </verify>
  <done>
    page.tsx has no inline style attributes on structural elements (hero, section titles,
    buttons, chart wrappers). globals.css defines all demo-* classes. Build passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Polish library CSS — chart, header, task list, task bar</name>
  <files>
    packages/gantt-lib/src/components/GanttChart/GanttChart.css,
    packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.css,
    packages/gantt-lib/src/components/TaskList/TaskList.css,
    packages/gantt-lib/src/components/TaskRow/TaskRow.css
  </files>
  <action>
    Apply web-design-guidelines audit findings + known issues to library CSS.
    Preserve all CSS variable names — do not rename existing custom properties.
    All changes must be additive or value-only edits (no class renames).

    GanttChart.css:
    - `.gantt-container`: add `border-radius: 10px; overflow: hidden;`
      (chart card shape — the demo-chart-card wrapper clips content to radius)
    - `.gantt-stickyHeader`: remove background repetition; it already uses variable correctly

    TimeScaleHeader.css:
    - `.gantt-tsh-weekendDay`: change `--gantt-weekend-background` fallback from `#fee2e2`
      to `#fef3f2` (softer blush — less alarming, more refined)
    - `.gantt-tsh-today`: replace solid block style with a pill approach:
      `background-color: #3b82f6; border-radius: 4px;` (use brand blue, not alarm red)
    - `.gantt-tsh-today .gantt-tsh-dayLabel`: keep `color: #ffffff`
    - `.gantt-tsh-weekendDay .gantt-tsh-dayLabel`: change `color: #dc2626` → `color: #ef4444`
      (slightly less intense)
    - `.gantt-tsh-monthCell`: add `text-transform: uppercase; letter-spacing: 0.04em;`
      (month names read as labels, not headings)

    TaskList.css:
    - `.gantt-tl-headerCell`: add `text-transform: uppercase; letter-spacing: 0.05em;`
      and change `color: #1f2937` → `color: #6b7280` (muted header label, standard table pattern)
    - `.gantt-tl-row:hover`: change `rgba(0, 0, 0, 0.05)` → `rgba(59, 130, 246, 0.04)`
      (on-brand row hover instead of neutral gray)
    - `.gantt-tl-dep-chip`: refine border-radius to `6px` (matches overall component rounding)
    - `.gantt-tl-dep-summary-chip`: same, `border-radius: 6px`

    TaskRow.css:
    - Set `--gantt-task-bar-border-radius` default: add to `:root` in this file:
      `:root { --gantt-task-bar-border-radius: 6px; }` so bars are rounded by default
      (currently unset — bars appear square)
    - `.gantt-tr-row:hover`: change `rgba(0, 0, 0, 0.05)` → `rgba(59, 130, 246, 0.04)`
      (consistent with TaskList row hover)
    - `.gantt-tr-externalTaskName`: change `color: #00389f` → `color: #2563eb`
      (consistent with brand blue palette)
    - `.gantt-tr-divider`: change `border-top: 1px solid #999` → `border-top: 1px solid var(--gantt-grid-line-color, #d1d5db)`
      (use shared grid line variable, lighter than #999)
    - `.gantt-tr-taskBar:hover`: uncomment the box-shadow line (currently commented out):
      `box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);`
      and uncomment `.gantt-tr-taskBar { transition: box-shadow 0.15s ease; }`
      so task bars have tactile hover feedback
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib 2>&1 | tail -5</automated>
  </verify>
  <done>
    Library CSS builds cleanly. Task bars are rounded (6px). Today header cell is blue pill.
    Weekend column is soft blush. TaskList header is muted uppercase. Row hover is blue-tinted.
    External task name uses consistent brand blue. Divider uses grid-line variable.
    Task bar hover shows subtle shadow.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual verification of redesigned demo</name>
  <what-built>
    Redesigned demo page shell (Task 1) and polished library CSS (Task 2).
  </what-built>
  <how-to-verify>
    1. Run: `cd D:/Projects/gantt-lib && npm run dev`
    2. Open http://localhost:3000
    3. Check the hero header: "gantt-lib" heading, tagline, install snippet in a code block
    4. Check button toolbar: all demo control buttons are grouped in a flex row, no hover JS
    5. Check chart cards: each GanttChart is inside a card with border-radius and border
    6. Check TimeScaleHeader: today column is BLUE (not red), weekends are very soft pink/blush
    7. Check TaskList: header cells are UPPERCASE MUTED text (not bold dark)
    8. Check task bars: bars have rounded corners (6px), hover shows a subtle shadow
    9. Check task bar divider lines: lighter gray, not #999
    10. Overall: does it look noticeably more polished compared to before?
  </how-to-verify>
  <resume-signal>Type "approved" if it looks good, or describe specific issues to fix</resume-signal>
</task>

</tasks>

<verification>
- `npm run build --workspace=packages/gantt-lib` passes
- `npm run build --workspace=packages/website` passes
- No inline style attributes remain on structural elements in page.tsx
- All `--gantt-task-bar-border-radius` usages resolve to 6px by default
- TimeScaleHeader today cell uses blue (#3b82f6), not red (#dc2626)
- TaskList header cells use uppercase + muted color (#6b7280)
</verification>

<success_criteria>
Demo page looks like a modern OSS library demo: clear hero, grouped controls, chart cards
with border-radius. Library components are visually consistent: rounded task bars, blue today
indicator, soft weekend highlight, uppercase muted table headers, on-brand row hover.
All existing functionality unchanged — only visual CSS properties modified.
</success_criteria>

<output>
After completion, create `.planning/quick/58-web-design-guidelines/58-SUMMARY.md`
</output>
