# Quick Task 53 Summary

## What was done
Each option in the link-type switcher popover now shows icon + Russian label.

Labels:
- FS → Окончание-начало
- SS → Начало-начало
- FF → Окончание-окончание
- SF → Начало-окончание

## Files changed
- `DepIcons.tsx` — added `LINK_TYPE_LABELS` export
- `TaskList.tsx` — import `LINK_TYPE_LABELS`, render `<span>{label}</span>` next to icon
- `TaskList.css` — menu min-width 180px, options justify-content flex-start + gap 8px

## Commit
e2b3eda
