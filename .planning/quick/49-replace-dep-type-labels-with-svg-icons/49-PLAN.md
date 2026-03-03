---
phase: quick-49
plan: 49
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements: [QUICK-49]
must_haves:
  truths:
    - "Dep chips show an SVG icon (not Russian text) next to the task number"
    - "Header type-switcher dropdown shows SVG icons for each link type"
    - "Active link type in header trigger button shows its SVG icon"
    - "Icon colors inherit from chip text color (currentColor stroke)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "LINK_TYPE_ICONS map + header icon rendering"
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "DepChip with icon+number rendering, LINK_TYPE_ICONS map"
  key_links:
    - from: "TaskList.tsx LINK_TYPE_ICONS"
      to: "header trigger button and dropdown menu items"
      via: "JSX inline rendering"
    - from: "TaskListRow.tsx DepChip"
      to: "chip span text content"
      via: "linkType prop mapped to icon component"
---

<objective>
Replace the four Russian text labels (ОН, НН, ОО, НО) with SVG icons everywhere they appear in the dependency UI — in the dep column header type-switcher and inside each dep chip.

Purpose: Visual icons are more compact and internationally readable than Russian abbreviations.
Output: Both TaskList.tsx and TaskListRow.tsx updated; chips render `<icon>(N)` instead of `ОН(N)`.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md

Key files to modify:
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` — contains `LINK_TYPE_LABELS` record and renders labels in header trigger button (`Связи [ОН ▾]`) and dropdown menu items.
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — contains `DEFAULT_LABELS` record, builds `label` string (`"ОН(3)"`), and `DepChip` renders `{label}` as text.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add LINK_TYPE_ICONS to TaskList.tsx and render icons in header</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
Replace the `LINK_TYPE_LABELS` string record with a `LINK_TYPE_ICONS` map of React SVG components (one per LinkType). Define four inline functional components above the map — one per dep type — using the exact SVG markup specified below. Use `width="14" height="14"` (scaled down from 24) so they fit inline in the header button and dropdown.

Icon definitions (use these exact paths, just adjust width/height to 14):

FS (ОО — Finish-to-Start):
```tsx
const DepIconFS = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/>
  </svg>
);
```

SS (НН — Start-to-Start):
```tsx
const DepIconSS = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5v14"/><path d="M21 12H7"/><path d="m15 18 6-6-6-6"/>
  </svg>
);
```

FF (ОН — Finish-to-Finish):
```tsx
const DepIconFF = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10 15 5 5 5-5"/><path d="M4 4h7a4 4 0 0 1 4 4v12"/>
  </svg>
);
```

SF (НО — Start-to-Finish):
```tsx
const DepIconSF = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m14 15-5 5-5-5"/><path d="M20 4h-7a4 4 0 0 0-4 4v12"/>
  </svg>
);
```

Then define the map:
```tsx
export const LINK_TYPE_ICONS: Record<LinkType, React.FC> = {
  FS: DepIconFS,
  SS: DepIconSS,
  FF: DepIconFF,
  SF: DepIconSF,
};
```

Remove `LINK_TYPE_LABELS` entirely.

In the header trigger button (line ~239), replace `{LINK_TYPE_LABELS[activeLinkType]}` with:
```tsx
{React.createElement(LINK_TYPE_ICONS[activeLinkType])}
```
So the button reads: `Связи [<icon> ▾]`

In the dropdown menu items (line ~250), replace `{LINK_TYPE_LABELS[lt]}` with:
```tsx
{React.createElement(LINK_TYPE_ICONS[lt])}
```

In the `linkTypeLabels` prop passed to `TaskListRow` (line ~281), remove that prop entirely — TaskListRow will use its own icon map (done in Task 2).

Also remove the `linkTypeLabels?: Record<LinkType, string>` prop from `TaskListProps` if present.
  </action>
  <verify>TypeScript compiles without errors: `cd D:/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | head -30`</verify>
  <done>Header trigger button shows active link type SVG icon; dropdown menu items show SVG icons; no Russian text labels in TaskList.tsx</done>
</task>

<task type="auto">
  <name>Task 2: Replace label text with SVG icon in TaskListRow DepChip</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
Add the same four icon components (DepIconFS, DepIconSS, DepIconFF, DepIconSF) and `LINK_TYPE_ICONS` map at the top of `TaskListRow.tsx` (same definitions as Task 1, local copies — no cross-file import needed since they're tiny inline SVGs).

Remove `DEFAULT_LABELS` constant.

Change `DepChipProps`: replace `label: string` with `linkType: LinkType` and `taskNumber: number`. Remove `linkTypeLabels?: Record<LinkType, string>` from `TaskListRowProps` if present.

Update `DepChip` render to show icon + number:
```tsx
const Icon = LINK_TYPE_ICONS[dep.type];
// inside the span:
<><Icon />{taskNumber}</>
```
Where `taskNumber` is the 1-based index of the predecessor task (same number that was in parentheses before).

Update chip building in `useMemo` (around line 174):
```tsx
const chips = useMemo(() => {
  return (task.dependencies ?? []).map(dep => {
    const predecessorIndex = (allTasks as Task[]).findIndex(t => t.id === dep.taskId);
    return {
      dep,
      taskNumber: predecessorIndex + 1,
    };
  });
}, [task.dependencies, allTasks]);
```

Update all `<DepChip>` usages to pass `taskNumber={chip.taskNumber}` instead of `label={chip.label}`.

Update `DepChip` signature: remove `label` param, add `taskNumber: number`. Inside DepChip, replace `{label}` with `<><Icon />{taskNumber}</>` where `const Icon = LINK_TYPE_ICONS[dep.type]`.

Remove the `linkTypeLabels` prop from `TaskListRowProps` and from the destructuring in `TaskListRow`.
  </action>
  <verify>TypeScript compiles without errors: `cd D:/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | head -30`</verify>
  <done>Dep chips show `<SVG icon><task number>` (e.g. arrow icon + "3") instead of "ОН(3)"; no Russian text labels remain in TaskListRow.tsx</done>
</task>

</tasks>

<verification>
After both tasks:
1. `npx tsc --noEmit -p packages/gantt-lib/tsconfig.json` — zero errors
2. Visual check in browser: dep chips display SVG icon next to number, header type-switcher shows icons in dropdown
3. No occurrences of ОН/НН/ОО/НО remain as rendered text in TaskList.tsx or TaskListRow.tsx
</verification>

<success_criteria>
- All four Russian abbreviations (ОН, НН, ОО, НО) replaced with SVG icon components in both files
- Chips render as `<icon>(N)` visually in the UI
- Header column trigger shows active icon; dropdown shows all four icons
- TypeScript compiles clean
- `linkTypeLabels` prop and `DEFAULT_LABELS`/`LINK_TYPE_LABELS` string records removed
</success_criteria>

<output>
After completion, create `.planning/quick/49-replace-dep-type-labels-with-svg-icons/49-SUMMARY.md`
</output>
