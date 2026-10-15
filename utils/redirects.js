/**
 * Redirects utils: the redirect targets of pages, from the locale's redirects sheet
 * (/{locale}/redirects.json: source | destination), loaded once per page. Edge Delivery applies
 * only the root /redirects.json (server side); blocks linking to pages use these to link to the
 * target instead of a redirecting page.
 */
import { localeSheetPath } from './site.js';

const MAX_HOPS = 5;

let redirects;

/** a path as the sheets list it: no .html, no trailing slash (but the root), no query or hash */
export const normalizeRedirectPath = (value) => String(value || '').trim()
  .replace(/[?#].*$/, '').replace(/\.html$/, '')
  .replace(/(.)\/$/, '$1');

async function loadSheet(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = await response.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

/**
 * The redirects of the current locale, cached.
 * @returns {Promise<Map<string, string>>} source path to destination
 */
export function loadRedirects() {
  redirects = redirects || loadSheet(localeSheetPath('redirects'))
    .then((rows) => new Map(rows
      .filter((row) => row?.Source || row?.source)
      .map((row) => [normalizeRedirectPath(row.Source || row.source),
        String(row.Destination || row.destination || '').trim()])
      .filter(([source, destination]) => source.startsWith('/') && destination)));
  return redirects;
}

/**
 * The final target of a link: follows the redirects of internal paths (at most 5 hops, no loops).
 * @param {Map<string, string>} map from loadRedirects()
 * @param {string} href
 * @returns {string} the target, or the href when it doesn't redirect
 */
export function resolveRedirect(map, href) {
  if (!map?.size || !String(href || '').startsWith('/')) return href;
  let target = href;
  const seen = new Set();
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    const path = normalizeRedirectPath(target);
    const next = map.get(path);
    if (!next || seen.has(path)) break;
    seen.add(path);
    target = next;
    if (!target.startsWith('/')) break;
  }
  return target;
}
