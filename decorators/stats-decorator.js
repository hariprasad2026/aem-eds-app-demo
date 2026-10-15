/**
 * Stats decorator: builds the Stats of a block (testimonial, teaser, ...) from its Stats
 * composite multifield (Stats Title and Stats Value per item), as a description list.
 */
import { moveInstrumentation } from '../scripts/scripts.js';
import { readMultifieldItems } from '../utils/multifield.js';

/**
 * Reads the Stats composite multifield: items are runs of elements between <hr>s (or list
 * items). The last element of an item is the Stats Value, the ones before it the Stats Title.
 * @param {Element} cell
 * @returns {{ label: Element[], value: Element }[]}
 */
function readStats(cell) {
  return readMultifieldItems(cell)
    // a list item holds the stat's elements
    .map((item) => (item.length === 1 && item[0].tagName === 'LI' ? [...item[0].children] : item))
    .filter((item) => item.length)
    .map((item) => ({
      label: item.slice(0, -1),
      value: item[item.length - 1],
    }));
}

/**
 * The stats as a <dl>, the Stats Title above its value; classes {prefix}-stats, -stat,
 * -stat-label and -stat-value.
 * @param {Element} cell the Stats property cell
 * @param {string} prefix the block name, e.g. "teaser"
 * @returns {HTMLDListElement|null}
 */
// eslint-disable-next-line import/prefer-default-export
export function buildStats(cell, prefix) {
  const stats = readStats(cell);
  if (!stats.length) return null;
  const list = document.createElement('dl');
  list.className = `${prefix}-stats`;
  stats.forEach(({ label, value }) => {
    const item = document.createElement('div');
    item.className = `${prefix}-stat`;
    const dt = document.createElement('dt');
    dt.className = `${prefix}-stat-label`;
    dt.append(...label);
    const dd = document.createElement('dd');
    dd.className = `${prefix}-stat-value`;
    dd.append(value);
    item.append(dt, dd);
    list.append(item);
  });
  moveInstrumentation(cell, list);
  return list;
}
