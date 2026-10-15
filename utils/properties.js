/**
 * Properties utils: read the authored properties of a key-value block (one row per model
 * field: name | value) and their plain values.
 */
import { toClassName } from '../scripts/aem.js';

/** a property name as read from a row key, e.g. "primaryCtaTarget" -> "primaryctatarget" */
export const normalizeKey = (text) => toClassName(text || '').replace(/-/g, '');

/**
 * Reads the property rows of a key-value block, keyed by their normalized name.
 * @param {Element} block
 * @returns {Object<string, Element>} the value cell of each property
 */
export function readProperties(block) {
  const properties = {};
  [...block.children].forEach((row) => {
    const [key, value] = row.children;
    if (row.children.length === 2) properties[normalizeKey(key.textContent)] = value;
  });
  return properties;
}

/** the trimmed text of a property cell */
export const textOf = (cell) => cell?.textContent.trim() || '';

/** a toggle: only an authored "true" turns it on, so a missing row means off */
export const isOn = (cell) => textOf(cell).toLowerCase() === 'true';

/**
 * A select value from its property row, or from the block classes (block options).
 * @param {Element} block
 * @param {Element} cell
 * @param {string[]} allowed
 * @returns {string} an allowed value, or ''
 */
export function optionOf(block, cell, allowed) {
  const value = toClassName(textOf(cell));
  if (allowed.includes(value)) return value;
  return allowed.find((name) => block.classList.contains(name)) || '';
}

/**
 * The element holding a plain-text value: authored text may be wrapped in a paragraph.
 * @param {Element} cell
 * @returns {Element} the paragraph, or the cell itself
 */
export function textSource(cell) {
  const only = cell.children.length === 1 ? cell.firstElementChild : null;
  return only?.tagName === 'P' && cell.textContent.trim() === only.textContent.trim() ? only : cell;
}
