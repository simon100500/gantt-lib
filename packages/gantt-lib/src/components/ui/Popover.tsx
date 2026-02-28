'use client';

import React from 'react';
import * as RadixPopover from '@radix-ui/react-popover';

export interface PopoverProps {
  /** Whether the popover is open */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** The trigger element */
  children: React.ReactNode;
}

export interface PopoverContentProps {
  /** Content to display inside the popover */
  children: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** Alignment relative to trigger */
  align?: 'start' | 'center' | 'end';
  /** Side to render the popover */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Whether to use a portal for rendering */
  portal?: boolean;
  /** Collision padding */
  collisionPadding?: number;
}

/**
 * Popover root component wrapping Radix UI Popover
 */
export const Popover: React.FC<PopoverProps> = ({ open, onOpenChange, children }) => {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </RadixPopover.Root>
  );
};

/**
 * Popover trigger — wraps the element that opens the popover
 */
export const PopoverTrigger = RadixPopover.Trigger;

/**
 * Popover content — the floating panel
 */
export const PopoverContent: React.FC<PopoverContentProps> = ({
  children,
  className,
  align = 'start',
  side = 'bottom',
  portal = true,
  collisionPadding = 8,
}) => {
  const content = (
    <RadixPopover.Content
      className={`gantt-popover${className ? ` ${className}` : ''}`}
      align={align}
      side={side}
      collisionPadding={collisionPadding}
      sideOffset={4}
    >
      {children}
    </RadixPopover.Content>
  );

  if (portal) {
    return <RadixPopover.Portal>{content}</RadixPopover.Portal>;
  }

  return content;
};

export default Popover;
