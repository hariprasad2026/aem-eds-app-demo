/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

// eslint-disable-next-line import/no-cycle
import {
  decorateMain,
} from '../../scripts/scripts.js';

import {
  loadSections,
} from '../../scripts/aem.js';

const pagePath = (path) => path.replace(/(\.plain)?\.html$/, '').replace(/(.)\/$/, '$1');

// fragment markup per path, fetched once per page view (e.g. a canvas page used by the header
// and the footer); each caller still gets its own decorated copy
const markup = new Map();

function fetchMarkup(path) {
  if (!markup.has(path)) {
    markup.set(path, fetch(`${path}.plain.html`)
      .then((resp) => (resp.ok ? resp.text() : null))
      .catch(() => null));
  }
  return markup.get(path);
}

/**
 * Loads a fragment. The page itself is never loaded as its own fragment (no endless nesting).
 * @param {string} path The path to the fragment
 * @returns {Promise<HTMLElement | null>} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    // eslint-disable-next-line no-param-reassign
    path = path.replace(/(\.plain)?\.html/, '');
    if (pagePath(path) === pagePath(window.location.pathname)) return null;
    const html = await fetchMarkup(path);
    if (html !== null) {
      const main = document.createElement('main');
      main.innerHTML = html;

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (fragment) block.replaceChildren(...fragment.childNodes);
}
