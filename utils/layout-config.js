/*
 * Layout config (pure, no DOM): which shared Navigation (header) and Footer page a page uses,
 * like the header and footer of AEM editable templates. Pages hold references, never copies:
 * the referenced pages are loaded at runtime, so a published change shows on every page that
 * resolves to them.
 *
 * Order, the first reference that loads wins:
 * 1. the page's own Navigation / Footer property (if its template allows page overrides)
 * 2. the template default: the locale's Page Templates sheet (data/page-templates), the row of
 *    the page's Page Type, else its "default" row
 * 3. the nearest parent page's property (inherited page properties)
 * 4. the locale's references/nav or references/footer
 * 5. the project default: the default locale's references
 * 6. a minimal fallback (the header shows a link to the Home page; the footer stays empty)
 * "none" (page property or template) switches the header or footer off, where allowed.
 */

/** Page Templates sheet columns; values are case-insensitive */
export const TEMPLATE_COLUMNS = Object.freeze({
  pageType: 'page-type',
  nav: 'nav',
  footer: 'footer',
  headerVariation: 'header-variation',
  footerVariation: 'footer-variation',
  showHeader: 'show-header',
  showFooter: 'show-footer',
  headerCanvas: 'header-canvas',
  footerCanvas: 'footer-canvas',
  pageOverride: 'page-override',
});

export const DEFAULT_TEMPLATE = 'default';
export const HEADER_VARIATIONS = Object.freeze(['default', 'overlay']);
export const FOOTER_VARIATIONS = Object.freeze(['default', 'plain']);
export const NONE = 'none';

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());
const key = (value) => text(value).toLowerCase().replace(/\s+/g, '-');
const isNo = (value) => ['no', 'false', '0', 'off', 'n', 'hide', 'hidden', 'not-allowed', 'none']
  .includes(key(value));

/** the cell of a sheet row, by column name (case-insensitive) */
export function cellOf(row, column) {
  if (!row) return '';
  const name = Object.keys(row).find((k) => key(k) === column);
  return name ? text(row[name]) : '';
}

/**
 * The template config of a Page Type: its row of the Page Templates sheet over the "default"
 * row (non-empty cells win), normalized.
 * @param {Object[]} rows the sheet rows
 * @param {string} pageType e.g. home, article ('' for none)
 * @returns {{
 *   template: string, nav: string, footer: string, headerVariation: string,
 *   footerVariation: string, showHeader: boolean, showFooter: boolean, headerCanvas: string,
 *   footerCanvas: string, allowOverride: boolean
 * }}
 */
export function resolveTemplateConfig(rows = [], pageType = '') {
  const type = key(pageType) || DEFAULT_TEMPLATE;
  const rowOf = (name) => rows.find((row) => key(cellOf(row, TEMPLATE_COLUMNS.pageType)) === name);
  const base = rowOf(DEFAULT_TEMPLATE);
  const own = type === DEFAULT_TEMPLATE ? null : rowOf(type);
  const value = (column) => cellOf(own, column) || cellOf(base, column);
  const variation = (column, allowed) => {
    const v = key(value(column));
    return allowed.includes(v) ? v : allowed[0];
  };
  return {
    template: own ? type : DEFAULT_TEMPLATE,
    nav: value(TEMPLATE_COLUMNS.nav),
    footer: value(TEMPLATE_COLUMNS.footer),
    headerVariation: variation(TEMPLATE_COLUMNS.headerVariation, HEADER_VARIATIONS),
    footerVariation: variation(TEMPLATE_COLUMNS.footerVariation, FOOTER_VARIATIONS),
    showHeader: !isNo(value(TEMPLATE_COLUMNS.showHeader)),
    showFooter: !isNo(value(TEMPLATE_COLUMNS.showFooter)),
    headerCanvas: value(TEMPLATE_COLUMNS.headerCanvas),
    footerCanvas: value(TEMPLATE_COLUMNS.footerCanvas),
    allowOverride: !isNo(value(TEMPLATE_COLUMNS.pageOverride)),
  };
}

/** a page path without .html / .plain.html / trailing slash, '' if it isn't a site path */
export function normalizePath(path) {
  const value = text(path);
  // site paths only: no protocol-relative or absolute URLs, no traversal, no query or hash
  if (!/^\/(?!\/)/.test(value) || /\.\.|[?#\\]/.test(value)) return '';
  return value.replace(/(\.plain)?\.html$/, '').replace(/(.)\/$/, '$1');
}

/**
 * The references to try, in order, for a page's header (nav) or footer.
 * Values are paths (already resolved to site or AEM paths) or '' / "none".
 * @param {Object} sources
 * @param {string} [sources.own] the page's own property
 * @param {string} [sources.template] the template default
 * @param {string} [sources.inherited] the nearest parent page's property
 * @param {string} [sources.localeDefault] the locale's references page
 * @param {string} [sources.projectDefault] the default locale's references page
 * @param {string} [sources.currentPath] the page itself (never loaded as its own header/footer)
 * @param {boolean} [sources.allowOverride] the template allows the page's own value
 * @param {boolean} [sources.enabled] the template shows the header / footer
 * @returns {{ disabled: boolean, source: string, candidates: string[], origins: string[] }}
 *   candidates: the paths to try in order; origins: where each one comes from (page, template,
 *   parent, locale, project); source: the origin of the first one, or fallback / page / template
 *   when disabled
 */
export function resolveCandidates({
  own = '', template = '', inherited = '', localeDefault = '', projectDefault = '',
  currentPath = '', allowOverride = true, enabled = true,
} = {}) {
  const useOwn = allowOverride && text(own);
  const off = (source) => ({
    disabled: true, source, candidates: [], origins: [],
  });
  if (!enabled && !useOwn) return off('template');
  if (useOwn && key(own) === NONE) return off('page');
  if (!useOwn && key(template) === NONE) return off('template');

  const self = normalizePath(currentPath);
  const seen = new Set();
  const candidates = [];
  const origins = [];
  const sources = [
    ['page', useOwn ? own : ''], ['template', template], ['parent', inherited],
    ['locale', localeDefault], ['project', projectDefault],
  ];
  sources.forEach(([name, value]) => {
    const path = key(value) === NONE ? '' : normalizePath(value);
    if (!path || path === self || seen.has(path)) return;
    seen.add(path);
    candidates.push(path);
    origins.push(name);
  });
  return {
    disabled: false, source: origins[0] || 'fallback', candidates, origins,
  };
}
