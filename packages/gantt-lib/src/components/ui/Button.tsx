'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: 'default' | 'ghost' | 'outline';
  /** Size variant */
  size?: 'default' | 'sm' | 'icon';
  /** Additional CSS class names */
  className?: string;
}

/**
 * Simple button component for calendar navigation and UI actions
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
    const classes = [
      'gantt-btn',
      variant !== 'default' ? `gantt-btn-${variant}` : '',
      size !== 'default' ? `gantt-btn-${size}` : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
