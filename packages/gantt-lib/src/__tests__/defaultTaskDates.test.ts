import { describe, expect, it } from 'vitest';
import { buildDefaultTaskDateRange } from '../components/TaskList/defaultTaskDates';

const isWeekend = (date: Date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

describe('buildDefaultTaskDateRange', () => {
  it('interprets default duration as calendar days in calendar mode', () => {
    expect(buildDefaultTaskDateRange('2026-04-25', {
      businessDays: false,
      defaultTaskDurationDays: 5,
      weekendPredicate: isWeekend,
    })).toEqual({
      startDate: '2026-04-25',
      endDate: '2026-04-29',
    });
  });

  it('interprets default duration as working days in business-day mode', () => {
    expect(buildDefaultTaskDateRange('2026-04-25', {
      businessDays: true,
      defaultTaskDurationDays: 5,
      weekendPredicate: isWeekend,
    })).toEqual({
      startDate: '2026-04-27',
      endDate: '2026-05-01',
    });
  });
});
