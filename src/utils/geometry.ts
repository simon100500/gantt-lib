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
 * Calculate total width for month grid
 * @param daysInMonth - Number of days in the month
 * @param dayWidth - Width of each day in pixels
 * @returns Total grid width in pixels
 */
export const calculateGridWidth = (daysInMonth: number, dayWidth: number): number => {
  return Math.round(daysInMonth * dayWidth);
};
