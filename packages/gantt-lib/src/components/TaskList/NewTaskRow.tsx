'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '../ui/Input';

interface NewTaskRowProps {
  rowHeight: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export const NewTaskRow: React.FC<NewTaskRowProps> = ({ rowHeight, onConfirm, onCancel }) => {
  const [nameValue, setNameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (nameValue.trim()) {
        confirmedRef.current = true;
        onConfirm(nameValue.trim());
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    if (confirmedRef.current) return;  // already confirmed via Enter
    if (nameValue.trim()) {
      confirmedRef.current = true;
      onConfirm(nameValue.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div className="gantt-tl-row gantt-tl-row-new" style={{ minHeight: `${rowHeight}px` }}>
      <div className="gantt-tl-cell gantt-tl-cell-number" />
      <div className="gantt-tl-cell gantt-tl-cell-name gantt-tl-cell-new-name">
        <Input
          ref={inputRef}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Название"
          className="gantt-tl-name-input"
        />
      </div>
      <div className="gantt-tl-cell" />
      <div className="gantt-tl-cell" />
      <div className="gantt-tl-cell" />
    </div>
  );
};

export default NewTaskRow;
