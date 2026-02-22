---
slug: ff-preview-jump
status: resolved
created: 2025-02-22
resolved: 2025-02-22
phase: 09-ff-dependency
related_plans:
  - 09-03
---

# FF Preview Jump Bug

## Description
When dragging parent task (A) with FF successor (B), the child visually jumps to the parent's start position during live drag preview, but returns to correct position on mouse release.

**Manifested when:** FF successor has negative lag (child starts before parent ends)

## Root Cause
The cascade preview calculated position from `chainStartOffset` (start date) for all tasks:
```javascript
let chainLeft = Math.round((chainStartOffset + deltaDays) * dayWidth);
```

For FF dependencies with negative lag, `startB` is not aligned with `startA`, so shifting from `startB` produces incorrect preview.

## Fix
For FF tasks, calculate position from `chainEndOffset` instead:
```javascript
if (hasFFDepOnDragged) {
  // FF: position based on end date shift, then back up by duration
  chainLeft = Math.round((chainEndOffset + deltaDays - chainDuration) * dayWidth);
} else {
  // FS/SS: position based on start date shift
  chainLeft = Math.round((chainStartOffset + deltaDays) * dayWidth);
}
```

## Resolution
- Commit: 7ea82db "fix(09-03): correct FF cascade preview positioning for negative lag"
- All 135 tests pass
- Awaiting user verification in browser
