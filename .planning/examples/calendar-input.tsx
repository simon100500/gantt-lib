import React, { useState, useRef } from 'react';
import { format, parse, isValid, startOfDay, addDays, addMonths, addYears, subDays, subMonths, subYears } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * KeyboardDatePicker: Объединенный интерфейс с клавиатурным вводом и встроенным календарем.
 */
export default function KeyboardDatePicker({
    label = "Выберите дату",
    onChange,
    className
}) {
    const today = startOfDay(new Date());
    const [date, setDate] = useState(today);
    const [inputValue, setInputValue] = useState(format(today, "dd.MM.yy"));
    const inputRef = useRef(null);

    const segments = [
        { start: 0, end: 2, label: 'day', max: 31 },
        { start: 3, end: 5, label: 'month', max: 12 },
        { start: 6, end: 8, label: 'year', max: 99 }
    ];

    const selectSegment = (pos) => {
        if (!inputRef.current) return;
        const segment = segments.find(s => pos >= s.start && pos <= s.end) || segments[0];
        inputRef.current.setSelectionRange(segment.start, segment.end);
    };

    const handleFocus = () => {
        setTimeout(() => selectSegment(0), 0);
    };

    const handleMouseDown = (e) => {
        setTimeout(() => {
            const pos = inputRef.current?.selectionStart || 0;
            selectSegment(pos);
        }, 0);
    };

    const updateFromDate = (newDate) => {
        if (!isValid(newDate)) return;
        setDate(newDate);
        const formatted = format(newDate, "dd.MM.yy");
        setInputValue(formatted);
        if (onChange) onChange(newDate);
    };

    const handleSelect = (selectedDate) => {
        if (!selectedDate) return;
        updateFromDate(selectedDate);
    };

    const handleInputChange = () => { };

    const handleKeyDown = (e) => {
        const { selectionStart, selectionEnd, value } = inputRef.current;
        const segmentIndex = segments.findIndex(s => selectionStart >= s.start && selectionStart <= s.end);
        const currentSegment = segments[segmentIndex];

        if (e.key === 'Tab') return;

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            let newDate = date || today;
            if (currentSegment.label === 'day') {
                newDate = e.key === 'ArrowUp' ? addDays(newDate, 1) : subDays(newDate, 1);
            } else if (currentSegment.label === 'month') {
                newDate = e.key === 'ArrowUp' ? addMonths(newDate, 1) : subMonths(newDate, 1);
            } else if (currentSegment.label === 'year') {
                newDate = e.key === 'ArrowUp' ? addYears(newDate, 1) : subYears(newDate, 1);
            }
            updateFromDate(newDate);
            setTimeout(() => selectSegment(currentSegment.start), 0);
            return;
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            const newValue = value.split('');
            for (let i = currentSegment.start; i < currentSegment.end; i++) {
                newValue[i] = '0';
            }
            setInputValue(newValue.join(''));
            setTimeout(() => selectSegment(currentSegment.start), 0);
            return;
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = segments[segmentIndex + 1] || segments[0];
            selectSegment(next.start);
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = segments[segmentIndex - 1] || segments[segments.length - 1];
            selectSegment(prev.start);
            return;
        }

        if (/^\d$/.test(e.key)) {
            e.preventDefault();
            const newValue = value.split('');
            let charIndex = selectionStart;
            const isFullSelected = (selectionEnd - selectionStart) >= (currentSegment.end - currentSegment.start);
            if (isFullSelected) charIndex = currentSegment.start;

            const tempValue = [...newValue];
            tempValue[charIndex] = e.key;
            const segmentString = tempValue.slice(currentSegment.start, currentSegment.end).join('');
            const segmentValue = parseInt(segmentString, 10);

            if (currentSegment.label === 'month' && charIndex === currentSegment.start && parseInt(e.key) > 1) return;
            if (currentSegment.label === 'day' && charIndex === currentSegment.start && parseInt(e.key) > 3) return;
            if (segmentValue > currentSegment.max) return;

            const updatedValue = tempValue.join('');
            setInputValue(updatedValue);

            const nextPos = charIndex + 1;
            if (nextPos >= currentSegment.end) {
                const nextSegment = segments[segmentIndex + 1];
                if (nextSegment) setTimeout(() => selectSegment(nextSegment.start), 0);
                else setTimeout(() => selectSegment(currentSegment.start), 0);
            } else {
                setTimeout(() => inputRef.current.setSelectionRange(nextPos, currentSegment.end), 0);
            }

            const parsedDate = parse(updatedValue, "dd.MM.yy", new Date());
            if (isValid(parsedDate) && !updatedValue.includes('00.00')) {
                setDate(parsedDate);
                if (onChange) onChange(parsedDate);
            }
        }
    };

    return (
        <div className={cn("flex flex-col w-full max-w-[280px] gap-3 p-4 border rounded-xl bg-card shadow-sm", className)}>
            <div className="space-y-1.5 px-1">
                <Label htmlFor="date-input" className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">
                    {label}
                </Label>
                <div className="relative">
                    <Input
                        ref={inputRef}
                        id="date-input"
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onMouseDown={handleMouseDown}
                        onKeyDown={handleKeyDown}
                        className="font-mono text-lg tabular-nums selection:bg-primary/30 cursor-default border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
                        spellCheck={false}
                        autoComplete="off"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none text-muted-foreground/50">
                        <CalendarIcon className="h-4 w-4" />
                    </div>
                </div>
            </div>

            <div className="border-t pt-2">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    className="p-0 pointer-events-auto"
                    initialFocus={false}
                />
            </div>
        </div>
    );
}

export function App() {
    return (
        <div className="p-8 flex flex-col items-center justify-center min-h-screen bg-slate-50 text-foreground">
            <div className="space-y-6">
                <KeyboardDatePicker
                    label="Дата вылета"
                    onChange={(d) => console.log("Дата выбрана:", d)}
                />

                <div className="max-w-[280px] text-[11px] text-muted-foreground leading-relaxed px-2">
                    <strong>Интерактивный блок:</strong> вводите дату прямо в поле сверху или выбирайте в календаре ниже. Используйте стрелки для быстрой настройки.
                </div>
            </div>
        </div>
    );
}