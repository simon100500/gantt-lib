'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '../ui/Input';

interface NewTaskRowProps {
  rowHeight: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  nestingDepth?: number;
}

export const NewTaskRow: React.FC<NewTaskRowProps> = ({
  rowHeight,
  onConfirm,
  onCancel,
  nestingDepth = 0,
}) => {
  const [nameValue, setNameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmedRef = useRef(false);
  const inputInnerPadding = 4;
  const levelOffset = nestingDepth > 0 ? nestingDepth * 20 + 8 : 0;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
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
          style={{
            left: `${Math.max(0, levelOffset - inputInnerPadding)}px`,
            width: levelOffset > 0 ? `calc(100% - ${Math.max(0, levelOffset - inputInnerPadding)}px)` : '100%',
            paddingLeft: `${inputInnerPadding}px`,
          }}
        />
      </div>
      <div className="gantt-tl-cell" />
      <div className="gantt-tl-cell" />
      <div className="gantt-tl-cell" />
    </div>
  );
};

export default NewTaskRow;
