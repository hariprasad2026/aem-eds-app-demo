/**
 * Content decorator: moves authored property content into the elements a block renders,
 * keeping Universal Editor instrumentation so in-place editing keeps working.
 */
import { moveInstrumentation } from '../scripts/scripts.js';
import { textSource } from '../utils/properties.js';

/**
 * Moves the content of a property cell into a new element, with its editor instrumentation.
 * Plain-text values lose their wrapping paragraph; a div keeps rich text as is.
 * @param {Element} cell
 * @param {string} tagName
 * @param {string} className
 * @returns {Element}
 */
// eslint-disable-next-line import/prefer-default-export
export function fromCell(cell, tagName, className) {
  const el = document.createElement(tagName);
  el.className = className;
  const source = tagName === 'div' ? cell : textSource(cell);
  el.append(...source.childNodes);
  moveInstrumentation(source, el);
  moveInstrumentation(cell, el);
  return el;
}
