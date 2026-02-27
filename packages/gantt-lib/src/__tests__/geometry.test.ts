import { describe, it, expect } from 'vitest';
import { calculateTaskBar, calculateGridWidth, calculateGridLines, calculateWeekendBlocks, detectEdgeZone } from '../utils/geometry';

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
    expect(result.width).toBe(160); // 4 days (inclusive) * 40px (Feb 28, 29, Mar 1, 2)
  });

  it('should handle tasks spanning into next month', () => {
    const taskStart = new Date('2024-03-28T00:00:00Z');
    const taskEnd = new Date('2024-04-02T00:00:00Z');
    const result = calculateTaskBar(taskStart, taskEnd, monthStart, dayWidth);

    expect(result.left).toBe(1080); // 27 days * 40px
    expect(result.width).toBe(240); // 6 days (inclusive) * 40px (Mar 28, 29, 30, 31, Apr 1, 2)
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

describe('calculateGridLines', () => {
  const dayWidth = 40;

  it('should return empty array for empty date range', () => {
    const result = calculateGridLines([], dayWidth);
    expect(result).toHaveLength(0);
  });

  it('should calculate x positions for single day', () => {
    const dateRange = [new Date('2024-03-01T00:00:00Z')];
    const result = calculateGridLines(dateRange, dayWidth);
    expect(result).toHaveLength(2); // Start + end lines
    expect(result[0].x).toBe(0);
    expect(result[0].isMonthStart).toBe(true);
    expect(result[1].x).toBe(40);
  });

  it('should detect month start correctly', () => {
    const dateRange = [
      new Date('2024-03-01T00:00:00Z'),
      new Date('2024-03-02T00:00:00Z'),
      new Date('2024-04-01T00:00:00Z')
    ];
    const result = calculateGridLines(dateRange, dayWidth);
    expect(result[0].isMonthStart).toBe(true);
    expect(result[1].isMonthStart).toBe(false);
    expect(result[2].isMonthStart).toBe(true); // April 1
  });

  it('should detect week start (Monday) correctly', () => {
    const dateRange = [
      new Date('2024-03-10T00:00:00Z'), // Sunday
      new Date('2024-03-11T00:00:00Z'), // Monday
      new Date('2024-03-12T00:00:00Z')  // Tuesday
    ];
    const result = calculateGridLines(dateRange, dayWidth);
    expect(result[0].isWeekStart).toBe(false);
    expect(result[1].isWeekStart).toBe(true); // Monday
    expect(result[2].isWeekStart).toBe(false);
  });

  it('should calculate correct x positions across multiple days', () => {
    const dateRange = [
      new Date('2024-03-01T00:00:00Z'),
      new Date('2024-03-02T00:00:00Z'),
      new Date('2024-03-03T00:00:00Z')
    ];
    const result = calculateGridLines(dateRange, dayWidth);
    expect(result[0].x).toBe(0);
    expect(result[1].x).toBe(40);
    expect(result[2].x).toBe(80);
    expect(result[3].x).toBe(120); // End line
  });

  it('should round all pixel values to integers', () => {
    const dateRange = [
      new Date('2024-03-01T00:00:00Z'),
      new Date('2024-03-02T00:00:00Z')
    ];
    const oddDayWidth = 33.33;
    const result = calculateGridLines(dateRange, oddDayWidth);
    result.forEach(line => {
      expect(Number.isInteger(line.x)).toBe(true);
    });
  });

  it('should handle year boundary for month start', () => {
    const dateRange = [
      new Date('2024-12-31T00:00:00Z'),
      new Date('2025-01-01T00:00:00Z'),
      new Date('2025-01-02T00:00:00Z')
    ];
    const result = calculateGridLines(dateRange, dayWidth);
    expect(result[0].isMonthStart).toBe(false); // Dec 31
    expect(result[1].isMonthStart).toBe(true); // Jan 1
    expect(result[2].isMonthStart).toBe(false); // Jan 2
  });
});

describe('calculateWeekendBlocks', () => {
  const dayWidth = 40;

  it('should return empty array for empty date range', () => {
    const result = calculateWeekendBlocks([], dayWidth);
    expect(result).toHaveLength(0);
  });

  it('should identify single Saturday', () => {
    const dateRange = [
      new Date('2024-03-09T00:00:00Z') // Saturday
    ];
    const result = calculateWeekendBlocks(dateRange, dayWidth);
    expect(result).toHaveLength(1);
    expect(result[0].left).toBe(0);
    expect(result[0].width).toBe(40);
  });

  it('should identify single Sunday', () => {
    const dateRange = [
      new Date('2024-03-10T00:00:00Z') // Sunday
    ];
    const result = calculateWeekendBlocks(dateRange, dayWidth);
    expect(result).toHaveLength(1);
    expect(result[0].left).toBe(0);
    expect(result[0].width).toBe(40);
  });

  it('should combine Saturday and Sunday into single block', () => {
    const dateRange = [
      new Date('2024-03-09T00:00:00Z'), // Saturday
      new Date('2024-03-10T00:00:00Z')  // Sunday
    ];
    const result = calculateWeekendBlocks(dateRange, dayWidth);
    expect(result).toHaveLength(1);
    expect(result[0].left).toBe(0);
    expect(result[0].width).toBe(80); // 2 days
  });

  it('should handle weekday range with no weekends', () => {
    const dateRange = [
      new Date('2024-03-11T00:00:00Z'), // Monday
      new Date('2024-03-12T00:00:00Z'), // Tuesday
      new Date('2024-03-13T00:00:00Z')  // Wednesday
    ];
    const result = calculateWeekendBlocks(dateRange, dayWidth);
    expect(result).toHaveLength(0);
  });

  it('should identify multiple weekend blocks', () => {
    const dateRange = [
      new Date('2024-03-09T00:00:00Z'), // Saturday (index 0)
      new Date('2024-03-10T00:00:00Z'), // Sunday (index 1)
      new Date('2024-03-11T00:00:00Z'), // Monday (index 2)
      new Date('2024-03-16T00:00:00Z'), // Saturday (index 3)
      new Date('2024-03-17T00:00:00Z')  // Sunday (index 4)
    ];
    const result = calculateWeekendBlocks(dateRange, dayWidth);
    expect(result).toHaveLength(2);
    expect(result[0].left).toBe(0);
    expect(result[0].width).toBe(80); // First weekend (index 0-1)
    expect(result[1].left).toBe(120); // Index 3 * 40px
    expect(result[1].width).toBe(80); // Second weekend (index 3-4)
  });

  it('should handle range starting on weekend', () => {
    const dateRange = [
      new Date('2024-03-10T00:00:00Z'), // Sunday
      new Date('2024-03-11T00:00:00Z'), // Monday
      new Date('2024-03-12T00:00:00Z')  // Tuesday
    ];
    const result = calculateWeekendBlocks(dateRange, dayWidth);
    expect(result).toHaveLength(1);
    expect(result[0].left).toBe(0);
    expect(result[0].width).toBe(40);
  });

  it('should handle range ending on weekend', () => {
    const dateRange = [
      new Date('2024-03-08T00:00:00Z'), // Friday
      new Date('2024-03-09T00:00:00Z'), // Saturday
      new Date('2024-03-10T00:00:00Z')  // Sunday
    ];
    const result = calculateWeekendBlocks(dateRange, dayWidth);
    expect(result).toHaveLength(1);
    expect(result[0].left).toBe(40);
    expect(result[0].width).toBe(80);
  });

  it('should round all pixel values to integers', () => {
    const dateRange = [
      new Date('2024-03-09T00:00:00Z'), // Saturday
      new Date('2024-03-10T00:00:00Z')  // Sunday
    ];
    const oddDayWidth = 33.33;
    const result = calculateWeekendBlocks(dateRange, oddDayWidth);
    result.forEach(block => {
      expect(Number.isInteger(block.left)).toBe(true);
      expect(Number.isInteger(block.width)).toBe(true);
    });
  });
});

describe('detectEdgeZone', () => {
  // Helper to create a mock DOM element with getBoundingClientRect
  const createMockElement = (width: number, left: number = 0): HTMLElement => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'getBoundingClientRect', {
      value: () => ({ left, width, top: 0, height: 40, right: left + width, bottom: 40 }),
      writable: false,
    });
    return element;
  };

  describe('with normal width tasks (width > 2 * edgeZoneWidth)', () => {
    const edgeZoneWidth = 20;
    const normalWidth = 100; // 100 > 40, so zones don't overlap

    it('should return left when clicking in left edge zone', () => {
      const element = createMockElement(normalWidth);
      const clientX = 10; // Within [0, 20]
      const result = detectEdgeZone(clientX, element, edgeZoneWidth);
      expect(result).toBe('left');
    });

    it('should return right when clicking in right edge zone', () => {
      const element = createMockElement(normalWidth);
      const clientX = 90; // Within [80, 100]
      const result = detectEdgeZone(clientX, element, edgeZoneWidth);
      expect(result).toBe('right');
    });

    it('should return move when clicking in middle area', () => {
      const element = createMockElement(normalWidth);
      const clientX = 50; // Between edge zones
      const result = detectEdgeZone(clientX, element, edgeZoneWidth);
      expect(result).toBe('move');
    });
  });

  describe('with 1-day tasks (width <= 2 * edgeZoneWidth)', () => {
    const edgeZoneWidth = 20;
    const oneDayWidth = 40; // 40 = 2 * 20, zones overlap

    it('should return left when clicking closer to left edge', () => {
      const element = createMockElement(oneDayWidth);
      const clientX = 10; // distanceToLeft = 10, distanceToRight = 30
      const result = detectEdgeZone(clientX, element, edgeZoneWidth);
      expect(result).toBe('left');
    });

    it('should return right when clicking closer to right edge', () => {
      const element = createMockElement(oneDayWidth);
      const clientX = 30; // distanceToLeft = 30, distanceToRight = 10
      const result = detectEdgeZone(clientX, element, edgeZoneWidth);
      expect(result).toBe('right');
    });

    it('should return left when clicking exactly in center (tiebreaker)', () => {
      const element = createMockElement(oneDayWidth);
      const clientX = 20; // Exactly center, distanceToLeft = 20, distanceToRight = 20
      const result = detectEdgeZone(clientX, element, edgeZoneWidth);
      expect(result).toBe('left'); // Left wins on tie
    });

    it('should handle clicking on far right edge of 1-day task', () => {
      const element = createMockElement(oneDayWidth);
      const clientX = 38; // distanceToLeft = 38, distanceToRight = 2
      const result = detectEdgeZone(clientX, element, edgeZoneWidth);
      expect(result).toBe('right');
    });

    it('should handle clicking on far left edge of 1-day task', () => {
      const element = createMockElement(oneDayWidth);
      const clientX = 2; // distanceToLeft = 2, distanceToRight = 38
      const result = detectEdgeZone(clientX, element, edgeZoneWidth);
      expect(result).toBe('left');
    });
  });

  describe('with task bar offset (left != 0)', () => {
    const edgeZoneWidth = 20;
    const oneDayWidth = 40;
    const offsetLeft = 100;

    it('should correctly calculate relative position with offset', () => {
      const element = createMockElement(oneDayWidth, offsetLeft);
      const clientX = 125; // relativeX = 25 (closer to right edge at 40)
      const result = detectEdgeZone(clientX, element, edgeZoneWidth);
      expect(result).toBe('right');
    });
  });
});
