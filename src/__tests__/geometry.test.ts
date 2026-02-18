import { describe, it, expect } from 'vitest';
import { calculateTaskBar, calculateGridWidth } from '../utils/geometry';

describe('calculateTaskBar', () => {
  const monthStart = new Date('2024-03-01T00:00:00Z');
  const dayWidth = 40;

  it('should calculate position for task starting on month start', () => {
    const taskStart = new Date('2024-03-01T00:00:00Z');
    const taskEnd = new Date('2024-03-01T00:00:00Z');
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, dayWidth);

    expect(result.left).toBe(0);
    expect(result.width).toBe(40); // 1 day
  });

  it('should calculate position for task in middle of month', () => {
    const taskStart = new Date('2024-03-10T00:00:00Z');
    const taskEnd = new Date('2024-03-15T00:00:00Z');
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, dayWidth);

    expect(result.left).toBe(360); // 9 days * 40px
    expect(result.width).toBe(240); // 6 days (inclusive) * 40px
  });

  it('should round pixel values to integers', () => {
    const taskStart = new Date('2024-03-01T00:00:00Z');
    const taskEnd = new Date('2024-03-01T00:00:00Z');
    const oddDayWidth = 33.33;
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, oddDayWidth);

    expect(Number.isInteger(result.left)).toBe(true);
    expect(Number.isInteger(result.width)).toBe(true);
  });

  it('should handle negative offset for tasks before month start', () => {
    const taskStart = new Date('2024-02-28T00:00:00Z');
    const taskEnd = new Date('2024-03-02T00:00:00Z');
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, dayWidth);

    expect(result.left).toBe(-80); // -2 days * 40px
    expect(result.width).toBe(120); // 3 days (inclusive) * 40px
  });

  it('should handle tasks spanning into next month', () => {
    const taskStart = new Date('2024-03-28T00:00:00Z');
    const taskEnd = new Date('2024-04-02T00:00:00Z');
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, dayWidth);

    expect(result.left).toBe(1080); // 27 days * 40px
    expect(result.width).toBe(200); // 5 days (inclusive) * 40px
  });

  it('should add +1 to duration for inclusive end dates', () => {
    const taskStart = new Date('2024-03-01T00:00:00Z');
    const taskEnd = new Date('2024-03-05T00:00:00Z');
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, dayWidth);

    // From March 1 to March 5 inclusive is 5 days, not 4
    expect(result.width).toBe(200); // 5 days * 40px
  });

  it('should handle zero duration (start equals end)', () => {
    const taskStart = new Date('2024-03-15T00:00:00Z');
    const taskEnd = new Date('2024-03-15T00:00:00Z');
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, dayWidth);

    expect(result.width).toBe(40); // 1 day (inclusive)
  });

  it('should handle DST transition dates', () => {
    // March 10, 2024 is DST transition in US
    const taskStart = new Date('2024-03-10T00:00:00Z');
    const taskEnd = new Date('2024-03-11T00:00:00Z');
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, dayWidth);

    expect(result.left).toBe(360); // 9 days * 40px
    expect(result.width).toBe(80); // 2 days * 40px
  });

  it('should handle leap year dates', () => {
    const febMonthStart = new Date('2024-02-01T00:00:00Z');
    const taskStart = new Date('2024-02-28T00:00:00Z');
    const taskEnd = new Date('2024-02-29T00:00:00Z');
    const result = calculateTaskBar(taskStart, taskEnd, febMonthStart, dayWidth);

    expect(result.left).toBe(1080); // 27 days * 40px
    expect(result.width).toBe(80); // 2 days * 40px (Feb 28 & 29)
  });
});

describe('calculateGridWidth', () => {
  it('should calculate width for 31-day month', () => {
    const result = calculateGridWidth(31, 40);
    expect(result).toBe(1240); // 31 * 40
  });

  it('should calculate width for 30-day month', () => {
    const result = calculateGridWidth(30, 40);
    expect(result).toBe(1200); // 30 * 40
  });

  it('should calculate width for February (28 days)', () => {
    const result = calculateGridWidth(28, 40);
    expect(result).toBe(1120); // 28 * 40
  });

  it('should calculate width for February in leap year (29 days)', () => {
    const result = calculateGridWidth(29, 40);
    expect(result).toBe(1160); // 29 * 40
  });

  it('should round to integer for non-integer day widths', () => {
    const result = calculateGridWidth(30, 33.33);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('should handle zero days', () => {
    const result = calculateGridWidth(0, 40);
    expect(result).toBe(0);
  });
});
