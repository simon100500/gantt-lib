/**
 * Export contract tests: verify the export map of core/scheduling
 * and its backward-compatibility chain through dependencyUtils.
 */
import { describe, it, expect } from 'vitest';

describe('Export contract: core/scheduling', () => {
  it('exports command-level API from execute.ts', async () => {
    const mod = await import('../core/scheduling');
    expect(mod.moveTaskWithCascade).toBeDefined();
    expect(mod.resizeTaskWithCascade).toBeDefined();
    expect(mod.recalculateTaskFromDependencies).toBeDefined();
    expect(mod.recalculateProjectSchedule).toBeDefined();
    expect(typeof mod.moveTaskWithCascade).toBe('function');
  });

  it('exports domain types', async () => {
    // Type-only exports can't be checked at runtime, but we can verify the module loads
    const mod = await import('../core/scheduling');
    expect(mod).toBeDefined();
  });

  it('backward-compat: re-exports UI adapter functions from core/scheduling', async () => {
    const mod = await import('../core/scheduling');
    expect(mod.resolveDateRangeFromPixels).toBeDefined();
    expect(mod.clampDateRangeForIncomingFS).toBeDefined();
  });

  it('dependencyUtils re-exports all core scheduling functions', async () => {
    const mod = await import('../utils/dependencyUtils');
    expect(mod.moveTaskWithCascade).toBeDefined();
    expect(mod.universalCascade).toBeDefined();
    expect(mod.calculateSuccessorDate).toBeDefined();
    expect(mod.resolveDateRangeFromPixels).toBeDefined();
  });
});
