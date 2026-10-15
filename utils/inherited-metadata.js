/**
 * Inherited metadata utils: page properties that child pages inherit from their parent pages,
 * like AEM's inherited page properties. Edge Delivery publishes each page with its own metadata
 * only, so the nearest parent page (up to the locale's Home page) that sets a value is looked
 * up: its published HTML head is loaded and read. Used for the Navigation (nav), Footer
 * (footer) and 404 Page (error-page) page properties. On a 404 page, the missing page has no
 * properties, so the lookup starts at its nearest existing parent.
 *
 * Parent pages are loaded in parallel, once per page and URL, and their values are cached for
 * the browser session (a changed parent property shows in a new session).
 */
import { getMetadata } from '../scripts/aem.js';
import { getParentPages } from './site.js';

/** the metadata names that are inherited: Navigation, Footer and 404 Page */
export const INHERITED_METADATA = ['nav', 'footer', 'error-page'];

const CACHE_KEY = 'tcs-inherited-metadata';
const pages = new Map();

function readCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeCache(url, values) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [url]: values }));
  } catch {
    // storage unavailable or full: values are loaded again next time
  }
}

/** the inherited metadata of a page as { nav, footer, error-page }; empty for a missing page */
function loadPageMetadata(url) {
  if (!pages.has(url)) {
    const cached = readCache()[url];
    pages.set(url, cached ? Promise.resolve(cached) : fetch(url)
      .then((response) => (response.ok ? response.text() : ''))
      .then((html) => {
        const { head } = new DOMParser().parseFromString(html, 'text/html');
        const values = Object.fromEntries(INHERITED_METADATA.map((name) => [
          name, head.querySelector(`meta[name="${name}"]`)?.content.trim() || '',
        ]));
        writeCache(url, values);
        return values;
      })
      .catch(() => ({})));
  }
  return pages.get(url);
}

/**
 * The value of an inherited metadata: the page's own (page properties, or a column of the bulk
 * metadata sheet), else the nearest parent page's up to the locale's Home page, else ''.
 * @param {string} name e.g. nav or footer
 * @returns {Promise<string>}
 */
export async function getInheritedMetadata(name) {
  const own = getMetadata(name);
  if (own) return own;
  const parents = await Promise.all(getParentPages().map(loadPageMetadata));
  return parents.find((values) => values[name])?.[name] || '';
}
