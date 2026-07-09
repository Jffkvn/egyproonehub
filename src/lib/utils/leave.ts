/**
 * Calculates the number of working days between two dates, inclusive.
 * Excludes Saturdays (6) and Sundays (0) following standard corporate workflows.
 */
export function countWorkingDays(
  startDateStr: string | Date, 
  endDateStr: string | Date, 
  publicHolidays: string[] = []
): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  // Reset hours to midnight to ensure date differences are calculated accurately
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  if (end < start) {
    return 0;
  }

  // Format public holidays into standardized YYYY-MM-DD strings
  const holidaySet = new Set(
    publicHolidays.map(dateStr => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      // Format as YYYY-MM-DD in local time
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }).filter(s => s !== '')
  );

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Exclude Sat (6) and Sun (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      if (!holidaySet.has(formattedDate)) {
        count++;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Validates start and end date logic.
 * Enforces start_date and end_date are valid dates, and end_date >= start_date.
 */
export function validateLeaveDates(startDateStr: string, endDateStr: string): { isValid: boolean; error: string | null } {
  if (!startDateStr || !endDateStr) {
    return { isValid: false, error: 'Both start and end dates are required.' };
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid date format.' };
  }

  if (end < start) {
    return { isValid: false, error: 'End date cannot be earlier than start date.' };
  }

  return { isValid: true, error: null };
}
