/**
 * Layout utils: the shared Navigation (header) and Footer pages of a page and its template
 * config, resolved by utils/layout-config.js (see there for the order). Used by the header
 * and footer blocks; the referenced pages are loaded as fragments, so they are never copied
 * into the pages that use them.
 *
 * Template config: the locale's Page Templates data sheet (data/page-templates, e.g.
 * /en/data/page-templates.json), one row per Page Type plus a "default" row, with the columns
 * of TEMPLATE_COLUMNS. Loaded once per page view.
 */
import { getMetadata } from '../scripts/aem.js';
import { loadFragment } from '../blocks/fragment/fragment.js';
import { loadDataSheet } from './data.js';
import { getParentMetadata } from './inherited-metadata.js';
import { NONE, resolveCandidates, resolveTemplateConfig } from './layout-config.js';
import { getPageType } from './metadata.js';
import {
  DEFAULT_LOCALE, getLocale, localePagePath, resolvePagePath,
} from './site.js';

export const PAGE_TEMPLATES_SHEET = 'page-templates';

const KINDS = {
  nav: { metadata: 'nav', fallback: 'references/nav', enabled: 'showHeader' },
  footer: { metadata: 'footer', fallback: 'references/footer', enabled: 'showFooter' },
};

let config;

/**
 * The template config of the page (its Page Type's row of the Page Templates sheet over the
 * default row); defaults when the sheet is missing.
 * @returns {Promise<ReturnType<typeof resolveTemplateConfig>>}
 */
export function getLayoutConfig() {
  config = config || loadDataSheet(PAGE_TEMPLATES_SHEET)
    .then((rows) => resolveTemplateConfig(rows, getPageType()))
    .catch(() => resolveTemplateConfig([], getPageType()));
  return config;
}

const isNone = (value) => value.trim().toLowerCase() === NONE;

/** a configured page value as the path to fetch here ("none" and '' kept) */
const toPath = (value) => (!value || isNone(value) ? value : resolvePagePath(value, ''));

/** the default locale's page, e.g. /en/references/nav (an AEM path when editing) */
function projectPagePath(relative) {
  const { contentRoot } = getLocale();
  const { country, code } = DEFAULT_LOCALE;
  return contentRoot ? `${contentRoot}/${country}/${code}/${relative}` : `/${code}/${relative}`;
}

/**
 * Loads the shared page of the page's header (nav) or footer.
 * @param {'nav' | 'footer'} kind
 * @returns {Promise<{
 *   config: Object, disabled: boolean, source: string, path: string, fragment: Element | null
 * }>} source: page, template, parent, locale, project or fallback (nothing loaded)
 */
export async function loadLayoutFragment(kind) {
  const { metadata, fallback, enabled } = KINDS[kind];
  const layout = await getLayoutConfig();
  const own = getMetadata(metadata);
  const template = layout[kind];
  // parent pages are only looked up when neither the page nor its template sets a value
  const usesOwn = layout.allowOverride && own;
  const inherited = usesOwn || template ? '' : await getParentMetadata(metadata);

  const { disabled, candidates, origins } = resolveCandidates({
    own: toPath(own),
    template: toPath(template),
    inherited: toPath(inherited),
    localeDefault: localePagePath(fallback),
    projectDefault: projectPagePath(fallback),
    currentPath: window.location.pathname,
    allowOverride: layout.allowOverride,
    enabled: layout[enabled],
  });
  const result = {
    config: layout, disabled, source: disabled ? 'disabled' : 'fallback', path: '', fragment: null,
  };
  if (disabled) return result;

  for (let i = 0; i < candidates.length; i += 1) {
    const path = candidates[i];
    // in order: a missing or empty page falls back to the next reference
    // eslint-disable-next-line no-await-in-loop
    const fragment = await loadFragment(path);
    if (fragment?.children.length) {
      return {
        ...result, source: origins[i], path, fragment,
      };
    }
  }
  return result;
}

/**
 * Loads a Canvas page for the header or footer: the template's Header / Footer Canvas, else
 * the authored value (the Footer block's Conversation Canvas Page); "none" switches it off.
 * Never the page itself or the shared page it is part of.
 * @param {string} templateValue the template config's headerCanvas or footerCanvas
 * @param {string} [authoredValue] the block's own Canvas page, if any
 * @param {string} [hostPath] the shared page hosting the canvas (e.g. the footer page)
 * @returns {Promise<Element | null>} the fragment's main element
 */
export async function loadLayoutCanvas(templateValue, authoredValue = '', hostPath = '') {
  const value = templateValue || authoredValue;
  if (!value || isNone(value)) return null;
  const path = toPath(value);
  const strip = (p) => p.replace(/(\.plain)?\.html$/, '').replace(/(.)\/$/, '$1');
  if (hostPath && strip(path) === strip(hostPath)) return null;
  const fragment = await loadFragment(path);
  return fragment?.children.length ? fragment : null;
}
