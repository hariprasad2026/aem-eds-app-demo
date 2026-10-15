/**
 * Heading decorator: headings from a title property and its Title Type (h1-h6).
 */
import { toClassName } from '../scripts/aem.js';
import { moveInstrumentation } from '../scripts/scripts.js';
import { textOf, textSource } from '../utils/properties.js';

export const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/**
 * Builds a heading from a title property and its Title Type, keeping editor instrumentation.
 * @param {Element} cell the title cell
 * @param {Element} typeCell the Title Type cell
 * @param {string} className
 * @param {string} [fallback] heading level when no Title Type is set
 * @returns {HTMLHeadingElement | null}
 */
export function buildHeading(cell, typeCell, className, fallback = 'h2') {
  if (!textOf(cell)) return null;
  const level = toClassName(textOf(typeCell));
  const authored = cell.querySelector(HEADINGS.join(','));
  const tagName = HEADINGS.includes(level) ? level : (authored?.tagName.toLowerCase() || fallback);
  const heading = document.createElement(tagName);
  heading.className = className;
  const source = authored || textSource(cell);
  heading.append(...source.childNodes);
  moveInstrumentation(source, heading);
  moveInstrumentation(cell, heading);
  return heading;
}
