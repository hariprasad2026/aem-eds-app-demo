/**
 * Placeholders utils: user-facing UI text from the locale's placeholders spreadsheet
 * (/{locale}/placeholders.json, e.g. /de-de/placeholders.json; columns Key, Text, Description
 * and Category, code uses Key and Text), loaded once per page, so labels are authorable and
 * translated per locale site. Code always passes an English fallback for missing keys.
 *
 * Keys are camelCase in code; the sheet's Key column may use any casing or separators, e.g.
 * "Pause Slides", "pause-slides" and "pauseSlides" all match pauseSlides.
 */
import { localeSheetPath, sheetRows } from './site.js';

/** a key compared without case and separators */
const normalizeKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');

let placeholders;

/** the placeholders keyed by normalized key; empty when the sheet isn't published */
export function loadPlaceholders() {
  placeholders = placeholders || fetch(localeSheetPath('placeholders'))
    .then((response) => (response.ok ? response.json() : null))
    .then((json) => new Map(sheetRows(json)
      .filter((row) => row.Key || row.key)
      .map((row) => [normalizeKey(row.Key || row.key), row.Text ?? row.text ?? ''])))
    .catch(() => new Map());
  return placeholders;
}

/**
 * Fills {name} variables in a text, e.g. "Show slide {n} of {total}".
 * @param {string} text
 * @param {Object<string, string|number>} [values]
 */
export const fillPlaceholder = (text, values = {}) => text
  .replace(/\{(\w+)\}/g, (match, name) => (name in values ? String(values[name]) : match));

/**
 * Loads the placeholders and returns a lookup function for a block.
 * @returns {Promise<(key: string, fallback: string, values?: Object) => string>}
 * @example
 * const t = await getPlaceholders();
 * button.setAttribute('aria-label', t('nextSlide', 'Next slide'));
 * label.textContent = t('slideOf', '{n} of {total}', { n: 1, total: 4 });
 */
export async function getPlaceholders() {
  const values = await loadPlaceholders();
  return (key, fallback, vars) => fillPlaceholder(values.get(normalizeKey(key)) || fallback, vars);
}
