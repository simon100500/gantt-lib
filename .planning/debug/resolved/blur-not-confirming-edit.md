---
status: resolved
trigger: "blur-not-confirming-edit: Clicking outside the task name input sometimes doesn't save/confirm the edit."
created: 2026-03-09T00:00:00.000Z
updated: 2026-03-09T00:00:00.000Z
---

## Current Focus

hypothesis: confirmedRef.current is left as true after an Enter-key save, and is never reset when edit mode is entered again. On the next edit session, the blur event fires handleNameSave which sees confirmedRef=true, resets it to false, and returns early without saving.
test: Read TaskListRow.tsx in full — confirmed the ref is set true on Enter but never reset at edit-session start.
expecting: Fix by resetting confirmedRef.current = false wherever editing begins (handleNameDoubleClick, handleRowKeyDown, and the auto-edit useEffect).
next_action: Apply fix — reset confirmedRef.current = false at every entry point that sets editingName=true.

## Symptoms

expected: After editing a task name and clicking outside the input, the edit should be confirmed and saved immediately.
actual: Sometimes clicking outside does nothing — the field doesn't confirm. Specific reproduction: double-click task name → move cursor to end → add text → click outside → nothing happens. Still in edit mode or value not saved.
errors: No console errors reported.
reproduction:
  1. Double-click on an existing task name (enters edit mode, full name selected)
  2. Press End key or click to move cursor to end of text
  3. Type additional characters to append to the name
  4. Click somewhere outside the input field
  5. The edit is NOT confirmed — field may stay in edit mode or revert
  The key prior step: the PREVIOUS edit session was confirmed with Enter (which sets confirmedRef=true).
timeline: Appeared after recent refactoring that added editTriggerRef and confirmedRef to TaskListRow.tsx

## Eliminated

- hypothesis: The blur event itself is not firing.
  evidence: Symptoms confirm blur fires (field exits or appears to — the issue is handleNameSave returns early).
  timestamp: 2026-03-09T00:00:00.000Z

- hypothesis: confirmedRef is reset when setEditingName(false) is called.
  evidence: Code confirms setEditingName(false) is called but confirmedRef is NEVER reset to false at that point, nor at edit-session start.
  timestamp: 2026-03-09T00:00:00.000Z

## Evidence

- timestamp: 2026-03-09T00:00:00.000Z
  checked: TaskListRow.tsx lines 235, 326-336, 342-352
  found: |
    confirmedRef = useRef(false)  [line 235]
    handleNameSave (onBlur handler) [lines 326-336]:
      if (confirmedRef.current) { confirmedRef.current = false; return; }  ← skips save, resets flag
    handleNameKeyDown [lines 342-352]:
      if (e.key === 'Enter') { confirmedRef.current = true; ... setEditingName(false); }  ← sets flag
    confirmedRef is NEVER reset to false when entering edit mode.
  implication: |
    Scenario that breaks:
    1. User edits and presses Enter → confirmedRef = true → edit mode exits
    2. User double-clicks to edit again → confirmedRef is STILL true
    3. User clicks outside → handleNameSave fires → sees confirmedRef=true → resets to false → returns early (NO SAVE)
    4. The entire edit session is lost.

- timestamp: 2026-03-09T00:00:00.000Z
  checked: Entry points that set editingName=true
  found: |
    1. handleNameDoubleClick (line 307-313): sets editTriggerRef but does NOT reset confirmedRef
    2. handleRowKeyDown (line 315-324): sets editTriggerRef but does NOT reset confirmedRef
    3. auto-edit useEffect (line 286-298): sets editTriggerRef='autoedit' but does NOT reset confirmedRef
  implication: All three entry points must reset confirmedRef.current = false.

## Resolution

root_cause: |
  confirmedRef.current is set to true when the user presses Enter to save a task name. This flag is designed to prevent the subsequent blur event from double-saving. However, confirmedRef.current is NEVER reset to false when a new edit session starts. On the next edit session (triggered by double-click, keypress, or auto-edit), confirmedRef.current is still true from the previous session. When the user clicks outside (blur), handleNameSave checks confirmedRef.current, finds it true, resets it to false, and returns early — skipping the save entirely.

fix: |
  Added confirmedRef.current = false at every edit-session entry point:
  1. handleNameDoubleClick (line 311) — double-click to edit
  2. handleRowKeyDown (line 321) — printable keypress starts editing
  3. auto-edit useEffect (line 293) — programmatic edit-on-insert
  This ensures the flag from any prior Enter-key save cannot bleed into a new session.
verification: confirmed fixed by user on 2026-03-09
files_changed:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
