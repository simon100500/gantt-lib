import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker } from '../components/ui/DatePicker';

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/ui/Calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

describe('DatePicker', () => {
  it('shifts by business days and keeps focus on the input when clicking +1', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value="2026-03-13"
        onChange={onChange}
        businessDays={true}
        isWeekend={(date) => date.getUTCDay() === 0 || date.getUTCDay() === 6}
      />
    );

    const input = screen.getByDisplayValue('13.03.26');
    const plusOneButton = screen.getByRole('button', { name: '+1' });

    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.mouseDown(plusOneButton);
    expect(document.activeElement).toBe(input);

    fireEvent.click(plusOneButton);

    expect(onChange).toHaveBeenCalledWith('2026-03-16');
    expect(document.activeElement).toBe(input);
  });

  it('keeps calendar-day shifting when business days mode is disabled', () => {
    const onChange = vi.fn();

    render(<DatePicker value="2026-03-13" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    expect(onChange).toHaveBeenCalledWith('2026-03-14');
  });
});
