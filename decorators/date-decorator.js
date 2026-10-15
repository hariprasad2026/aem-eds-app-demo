/**
 * Date decorator: <time> elements for authored or page-property dates.
 */
import { formatDate } from '../utils/dates.js';

/**
 * Builds a <time> element for a date.
 * @param {string} value YYYY-MM-DD, possibly with a time
 * @param {string} format see utils/dates.js formatDate
 * @param {string} [className]
 * @returns {HTMLTimeElement | null}
 */
// eslint-disable-next-line import/prefer-default-export
export function buildTime(value, format, className = '') {
  const { iso, text } = formatDate(value, format);
  if (!text) return null;
  const time = document.createElement('time');
  if (className) time.className = className;
  if (iso) time.dateTime = iso;
  time.textContent = text;
  return time;
}
