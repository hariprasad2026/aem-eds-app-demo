/**
 * IDs utils: per-page instance numbers, so blocks used several times on a page get unique
 * element ids (tabs, form fields, carousels, live regions).
 */

import { toClassName } from '../scripts/aem.js';

const counters = new Map();

/**
 * The next instance number for a name: 1, 2, 3, ...
 * @param {string} name e.g. the block name
 * @returns {number}
 */
export function nextInstance(name) {
  const next = (counters.get(name) || 0) + 1;
  counters.set(name, next);
  return next;
}

/**
 * A unique id for a name, e.g. "tabs-2".
 * @param {string} name
 * @returns {string}
 */
export const uniqueId = (name) => `${name}-${nextInstance(name)}`;

/**
 * An id not used by another element on the page: the id itself, else with a -2, -3, ... suffix
 * (for authored ids, e.g. anchors and tab ids).
 * @param {string} id
 * @param {Element} [self] the element that will have the id (its own id isn't a conflict)
 * @returns {string}
 */
export function availableId(id, self = null) {
  const taken = (value) => {
    const el = document.getElementById(value);
    return el && el !== self;
  };
  let free = id;
  for (let n = 2; taken(free); n += 1) free = `${id}-${n}`;
  return free;
}

/**
 * Creates an id generator for the elements of one block instance: ids are prefixed, made safe
 * for ids, and de-duplicated against each other and the page.
 * @param {string} prefix e.g. "form-variations-1"
 * @returns {(name: string) => string}
 */
export function createIdFactory(prefix) {
  const used = new Set();
  return (name) => {
    const base = `${prefix}-${toClassName(name) || 'field'}`;
    let id = base;
    let n = 2;
    while (used.has(id) || document.getElementById(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    used.add(id);
    return id;
  };
}
