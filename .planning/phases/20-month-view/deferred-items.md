# Deferred Items — Phase 20

## Pre-existing Test Failures (out of scope for 20-01)

Found during 20-01 execution. These failures existed before any changes in this plan.

### isToday — timezone mismatch (3 tests)
- `should return true for today` — fails
- `should return false for tomorrow` — fails
- `should use UTC comparison for date equality` — fails
- **Root cause:** isToday uses local timezone logic (getFullYear/Month/Date for "now") but UTC for comparison — inconsistency causes failures in non-UTC timezones
- **Discovered during:** Task 1 RED phase verification

### getMultiMonthDays — padding behavior (4 tests)
- `should expand single month task to full month` — expects 31, gets 92 (3 months padding)
- `should expand multi-month task to full months` — expects 92, gets 153
- `should handle multiple tasks across different months` — expects 90, gets 151
- `should handle tasks across year boundary` — expects 62, gets 121
- **Root cause:** Implementation adds 2 months padding after task range; tests expect no padding
- **Discovered during:** Task 1 RED phase verification
