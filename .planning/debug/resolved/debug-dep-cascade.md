---
status: investigating
trigger: "Investigate issue: collapsed-parent-hard-dependency-cascade"
created: 2026-03-11T00:00:00Z
updated: 2026-03-11T00:00:00Z
---

## Current Focus

hypothesis: Cascade propagation ignores hidden child tasks when the moved item is a collapsed parent, so strict dependency shifting never sees the effective predecessor date change.
test: Inspect drag/cascade code paths for collapsed parent moves and trace whether hidden descendants are included when computing affected dependencies.
expecting: If the hypothesis is true, visual dependency rendering will use all tasks while move propagation will only use visible tasks or the parent task itself.
next_action: gather initial evidence from dependency rendering and drag/cascade scheduling code

## Symptoms

expected: When a parent task is moved and it contains hidden child tasks participating in hard dependencies, successors connected through those hidden children should shift according to the dependency constraints.
actual: Visual virtual links may exist, but moving the parent block does not shift successors for hard finish-to-start relations.
errors: No runtime error reported.
reproduction: Collapse a parent task, ensure one of its hidden children has an external strict finish-to-start dependency to another task, then drag the parent block. The successor does not move.
started: This remained unresolved after previous debugging/work on virtual dependency links; previous process marked it as partial and cascade investigation pending.

## Eliminated

## Evidence

- timestamp: 2026-03-11T00:00:00Z
  checked: .planning/debug/debug-dep.md
  found: Prior debugging implemented virtual dependency lines and filtered internal collapsed-parent links, but explicitly left cascade propagation unresolved.
  implication: The rendering path and the scheduling/cascade path are likely separate; the remaining bug is in move propagation rather than line visualization.

## Resolution

root_cause:
fix:
verification:
files_changed: []
