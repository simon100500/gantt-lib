'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Additional CSS class names */
  className?: string;
}

/**
 * Styled text input component using gantt-lib CSS variables
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`gantt-input${className ? ` ${className}` : ''}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
export default Input;
