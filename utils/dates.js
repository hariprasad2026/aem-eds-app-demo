/**
 * Dates utils: format authored dates for display without time zone shifts.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a date (YYYY-MM-DD, possibly with a time) using its calendar date as authored.
 * @param {string} value
 * @param {string} format dd-mm-yyyy (default) | mm-dd-yyyy | mmm-d-yyyy | dd/mm/yy | dd-mmm-yy
 *   (04 Sep 26)
 * @returns {{ iso: string, text: string }} iso is YYYY-MM-DD, or '' when the value isn't a date
 */
// eslint-disable-next-line import/prefer-default-export
export function formatDate(value, format) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return { iso: '', text: value || '' };
  const [, year, month, day] = match;
  const iso = `${year}-${month}-${day}`;
  if (format === 'mm-dd-yyyy') return { iso, text: `${month}-${day}-${year}` };
  if (format === 'mmm-d-yyyy') {
    return { iso, text: `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}` };
  }
  if (format === 'dd/mm/yy') return { iso, text: `${day}/${month}/${year.slice(2)}` };
  if (format === 'dd-mmm-yy') {
    return { iso, text: `${day} ${MONTHS[Number(month) - 1]} ${year.slice(2)}` };
  }
  return { iso, text: `${day}-${month}-${year}` };
}
