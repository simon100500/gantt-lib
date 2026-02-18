# Deferred Items - Phase 01-01

Pre-existing issues found during plan execution that are out of scope for current tasks:

## Test Files

### src/__tests__/geometry.test.ts - "should handle tasks spanning into next month"
**Issue:** Test expectation is incorrect. Test expects 200px but the function correctly returns 240px.
**Analysis:** Task from March 28 to April 2 spans 6 days inclusive (28, 29, 30, 31, 1, 2), not 5 days.
**Action:** Test comment says "5 days (inclusive)" but this is mathematically incorrect.
**Fix needed:** Update test expectation from 200 to 240, or correct the test data if 5 days was intended.

**Status:** Deferred - Pre-existing test file created before plan execution
