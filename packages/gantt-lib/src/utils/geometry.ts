/**
 * Calculate day difference in UTC
 */
const getUTCDayDifference = (date1: Date, date2: Date): number => {
  const ms1 = Date.UTC(
    date1.getUTCFullYear(),
    date1.getUTCMonth(),
    date1.getUTCDate()
  );
  const ms2 = Date.UTC(
    date2.getUTCFullYear(),
    date2.getUTCMonth(),
    date2.getUTCDate()
  );
  return Math.round((ms1 - ms2) / (1000 * 60 * 60 * 24));
};

/**
 * Calculate task bar positioning and dimensions
 * @param taskStartDate - Start date of the task
 * @param taskEndDate - End date of the task
 * @param monthStart - Start of the month/visible range
 * @param dayWidth - Width of each day in pixels
 * @returns Object with left position and width in pixels
 */
export const calculateTaskBar = (
  taskStartDate: Date,
  taskEndDate: Date,
  monthStart: Date,
  dayWidth: number
): { left: number; width: number } => {
  const startOffset = getUTCDayDifference(taskStartDate, monthStart);
  const duration = getUTCDayDifference(taskEndDate, taskStartDate);

  // Round to avoid sub-pixel rendering issues
  const left = Math.round(startOffset * dayWidth);
  const width = Math.round((duration + 1) * dayWidth); // +1 to include end date

  return { left, width };
};

/**
 * Convert pixel position to date (inverse of calculateTaskBar)
 * @param pixels - Position in pixels (left or width)
 * @param monthStart - Start of the month/visible range
 * @param dayWidth - Width of each day in pixels
 * @returns Date calculated from pixel position
 */
export const pixelsToDate = (pixels: number, monthStart: Date, dayWidth: number): Date => {
  const days = Math.round(pixels / dayWidth);
  return new Date(Date.UTC(
    monthStart.getUTCFullYear(),
    monthStart.getUTCMonth(),
    monthStart.getUTCDate() + days
  ));
};

/**
 * Calculate total width for month grid
 * @param daysInMonth - Number of days in the month
 * @param dayWidth - Width of each day in pixels
 * @returns Total grid width in pixels
 */
export const calculateGridWidth = (daysInMonth: number, dayWidth: number): number => {
  return Math.round(daysInMonth * dayWidth);
};

/**
 * Detect which edge zone the cursor is in on a task bar
 * @param clientX - Mouse X coordinate relative to viewport
 * @param taskBarElement - The task bar DOM element
 * @param edgeZoneWidth - Width of edge zones in pixels (default: 12px)
 * @returns 'left' if in left edge, 'right' if in right edge, 'move' if in middle
 */
export const detectEdgeZone = (
  clientX: number,
  taskBarElement: HTMLElement,
  edgeZoneWidth: number = 12
): 'left' | 'right' | 'move' => {
  const rect = taskBarElement.getBoundingClientRect();
  const relativeX = Math.round(clientX - rect.left);

  // Check left edge zone
  if (relativeX >= 0 && relativeX <= edgeZoneWidth) {
    return 'left';
  }

  // Check right edge zone
  const width = Math.round(rect.width);
  if (relativeX >= width - edgeZoneWidth && relativeX <= width) {
    return 'right';
  }

  // Middle area - move mode
  return 'move';
};

/**
 * Get appropriate cursor style for drag position
 * @param position - The drag position (left edge, right edge, or move)
 * @returns CSS cursor string for the position
 */
export const getCursorForPosition = (position: 'left' | 'right' | 'move'): string => {
  switch (position) {
    case 'left':
    case 'right':
      return 'ew-resize';
    case 'move':
      return 'grab';
    default:
      return 'default';
  }
};

/**
 * Calculate grid line positions for a date range
 * @param dateRange - Array of Date objects representing the visible range
 * @param dayWidth - Width of each day column in pixels
 * @returns Array of grid line objects with x position and flags
 */
export const calculateGridLines = (
  dateRange: Date[],
  dayWidth: number
): Array<{ x: number; isMonthStart: boolean; isWeekStart: boolean }> => {
  const lines: Array<{ x: number; isMonthStart: boolean; isWeekStart: boolean }> = [];

  for (let i = 0; i < dateRange.length; i++) {
    const date = dateRange[i];
    const x = Math.round(i * dayWidth);
    const isMonthStart = date.getUTCDate() === 1;
    const isWeekStart = date.getUTCDay() === 1; // Monday

    lines.push({ x, isMonthStart, isWeekStart });
  }

  // Add final line at the end of the range
  if (dateRange.length > 0) {
    lines.push({
      x: Math.round(dateRange.length * dayWidth),
      isMonthStart: false,
      isWeekStart: false
    });
  }

  return lines;
};

/**
 * Calculate weekend background blocks for a date range
 * @param dateRange - Array of Date objects representing the visible range
 * @param dayWidth - Width of each day column in pixels
 * @returns Array of weekend block objects with left position and width
 */
export const calculateWeekendBlocks = (
  dateRange: Date[],
  dayWidth: number
): Array<{ left: number; width: number }> => {
  const blocks: Array<{ left: number; width: number }> = [];
  let inWeekend = false;
  let weekendStartIndex = -1;

  for (let i = 0; i < dateRange.length; i++) {
    const date = dateRange[i];
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    if (isWeekend && !inWeekend) {
      // Start of a weekend block
      inWeekend = true;
      weekendStartIndex = i;
    } else if (!isWeekend && inWeekend) {
      // End of a weekend block
      inWeekend = false;
      const left = Math.round(weekendStartIndex * dayWidth);
      const width = Math.round((i - weekendStartIndex) * dayWidth);
      blocks.push({ left, width });
    }
  }

  // Handle case where range ends on a weekend
  if (inWeekend && weekendStartIndex >= 0) {
    const left = Math.round(weekendStartIndex * dayWidth);
    const width = Math.round((dateRange.length - weekendStartIndex) * dayWidth);
    blocks.push({ left, width });
  }

  return blocks;
};

/**
 * Calculate SVG cubic Bezier curve path for dependency lines
 * @param from - Start point {x, y} (right edge of predecessor)
 * @param to - End point {x, y} (left edge of successor)
 * @returns SVG path string for cubic Bezier curve
 */
export const calculateBezierPath = (
  from: { x: number; y: number },
  to: { x: number; y: number }
): string => {
  // Control points create smooth vertical curve
  // Offset is proportional to vertical distance for natural-looking curves
  const verticalDistance = Math.abs(to.y - from.y);
  const cpOffset = Math.max(verticalDistance * 0.5, 20); // Minimum 20px for same-row connections

  // For same-row connections, use arc above the task bars
  if (from.y === to.y) {
    const arcHeight = 20;
    const midX = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} Q ${midX} ${from.y - arcHeight} ${to.x} ${to.y}`;
  }

  // Standard cubic Bezier for multi-row connections
  const cp1x = from.x;
  const cp1y = from.y + (to.y > from.y ? cpOffset : -cpOffset);
  const cp2x = to.x;
  const cp2y = to.y - (to.y > from.y ? cpOffset : -cpOffset);

  return `M ${Math.round(from.x)} ${Math.round(from.y)} C ${Math.round(cp1x)} ${Math.round(cp1y)}, ${Math.round(cp2x)} ${Math.round(cp2y)}, ${Math.round(to.x)} ${Math.round(to.y)}`;
};

/**
 * Calculate SVG Г-shaped (L-shaped) path for FS dependency lines.
 * Goes vertically from the right edge of the predecessor bar, then horizontally
 * to the left edge of the successor bar. Supports negative lag (overlap).
 * @param from - Start point {x, y} (right edge of predecessor, vertical center)
 * @param to - End point {x, y} (left edge of successor, vertical center)
 * @returns SVG path string
 */
export const calculateOrthogonalPath = (
  from: { x: number; y: number },
  to: { x: number; y: number }
): string => {
  const fx = Math.round(from.x);
  const fy = Math.round(from.y);
  const tx = Math.round(to.x);
  const ty = Math.round(to.y);

  // Same row: straight horizontal line
  if (fy === ty) {
    return `M ${fx} ${fy} H ${tx}`;
  }

  const R = 4;
  const goingDown = ty > fy;
  const goingRight = tx >= fx;
  const dirY = goingDown ? 1 : -1;
  const dirX = goingRight ? 1 : -1;

  // Add a rounded corner if there's enough room in both axes
  if (Math.abs(ty - fy) >= R && Math.abs(tx - fx) >= R) {
    // CW sweep when directions match (↓→ or ↑←), CCW otherwise (↓← or ↑→)
    const sweep = goingDown === goingRight ? 1 : 0;
    return [
      `M ${fx} ${fy}`,
      `V ${ty - dirY * R}`,
      `a ${R} ${R} 0 0 ${sweep} ${dirX * R} ${dirY * R}`,
      `H ${tx}`,
    ].join(' ');
  }

  // Sharp corner fallback (very short segments)
  return `M ${fx} ${fy} V ${ty} H ${tx}`;
};
