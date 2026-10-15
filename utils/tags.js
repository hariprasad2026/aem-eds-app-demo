/**
 * Tags utils: turn AEM tag IDs into labels.
 */
import { textOf } from './properties.js';

/**
 * Turns an AEM tag ID (e.g. "tcs:topics/artificial-intelligence") into an id and a label.
 * @param {string} id
 * @returns {{ id: string, label: string }}
 */
export function parseTag(id) {
  const name = id.split(/[/:]/).pop().replace(/[-_]+/g, ' ').trim();
  return { id, label: name.charAt(0).toUpperCase() + name.slice(1) };
}

/**
 * Reads the tag values of a multi-value property cell (list items or a comma-separated list).
 * Resolve labels with utils/taxonomy.js resolveTags().
 * @param {Element} cell
 * @returns {string[]} tag IDs as authored
 */
export function readTagValues(cell) {
  if (!cell) return [];
  const items = cell.querySelectorAll('li');
  const values = items.length ? [...items].map((li) => li.textContent) : textOf(cell).split(',');
  return values.map((value) => value.trim()).filter(Boolean);
}

/**
 * Reads tags with labels derived from their IDs (no taxonomy lookup).
 * @param {Element} cell
 * @returns {{ id: string, label: string }[]}
 */
export const readTags = (cell) => readTagValues(cell).map((id) => parseTag(id));
