/**
 * Site utils: the TCS Corporate site structure. Each locale site lives in AEM under
 * /content/tcs-corp/{country}/{language} (e.g. /content/tcs-corp/de/de-de) and is published at
 * a language-only path (e.g. /de-de, see paths.json). Every locale site holds its pages and its
 * own references, error pages, sheets and block library:
 *
 *   /de-de/                       Home (the locale page itself) and the content pages
 *   /de-de/references/            Header (nav), Footer (footer) and other fragments
 *   /de-de/error-pages/           404, 403, 500
 *   /de-de/placeholders.json      UI text (Key, Text, Description, Category)
 *   /de-de/taxonomy.json          tag titles (paths.json maps each taxonomy page)
 *   /de-de/metadata.json          bulk metadata (listed in the site config's metadata.source)
 *   /de-de/data/*.json            authors, locations, partners, social-links, media-contacts
 *   block-library/                block test pages, on author only (excluded in paths.json)
 *
 * Redirects sheets are per locale too (/de-de/redirects.json); the platform only applies a root
 * /redirects.json, so they need another mechanism (e.g. CDN rules).
 *
 * Pages outside a locale (e.g. site-global-templates, drafts) use the default locale.
 * paths.json is generated from LOCALES: run `npm run build:paths` after changing them.
 */

/**
 * The locale sites: AEM country and language folders, the published path segment and the
 * language tag (<html lang>).
 */
export const LOCALES = [
  { country: 'us', code: 'en', lang: 'en-US' },
  { country: 'de', code: 'de-de', lang: 'de-DE' },
  { country: 'fr', code: 'fr-fr', lang: 'fr-FR' },
  { country: 'ca', code: 'fr-ca', lang: 'fr-CA' },
  { country: 'es', code: 'es-es', lang: 'es-ES' },
  { country: 'pt', code: 'pt-pt', lang: 'pt-PT' },
  { country: 'nl', code: 'nl-nl', lang: 'nl-NL' },
  { country: 'se', code: 'sv-se', lang: 'sv-SE' },
  { country: 'dk', code: 'da-dk', lang: 'da-DK' },
  { country: 'no', code: 'no-no', lang: 'no-NO' },
  { country: 'cn', code: 'zh-cn', lang: 'zh-CN' },
  { country: 'jp', code: 'ja-jp', lang: 'ja-JP' },
  { country: 'kr', code: 'ko-kr', lang: 'ko-KR' },
];

export const [DEFAULT_LOCALE] = LOCALES;

// the site prefix of AEM author paths (/content/<site>), not present on the published site
const CONTENT_ROOT = /^\/content\/(?!dam\/)[^/]+(?=\/|$)/;

/** the AEM folder path of a locale (below the site root), e.g. /de/de-de */
const aemRootOf = (locale) => `/${locale.country}/${locale.code}`;

/** the published root of a locale, e.g. /de-de */
const rootOf = (locale) => `/${locale.code}`;

const startsWithFolder = (path, folder) => path === folder || path.startsWith(`${folder}/`);

/** the locale whose published root (/de-de) starts the path */
const localeOfSitePath = (path) => LOCALES
  .find((locale) => startsWithFolder(path.toLowerCase(), rootOf(locale)));

/** the locale whose AEM folders (/de/de-de, below /content/tcs-corp) start the path */
const localeOfAemPath = (path) => LOCALES
  .find((locale) => startsWithFolder(path.toLowerCase(), aemRootOf(locale)));

/**
 * A locale with its paths.
 * @typedef {{
 *   country: string, code: string, lang: string, language: string, root: string,
 *   aemRoot: string, contentRoot: string
 * }} Locale
 * code: the published path segment (e.g. de-de); lang: the language tag (de-DE); language: the
 * ISO 639-1 language (de); root: the published root (/de-de); aemRoot: the AEM folders below the
 * site root (/de/de-de); contentRoot: the AEM site root (/content/tcs-corp) when editing,
 * otherwise ''
 */

/**
 * The locale site of a page: from its AEM path when editing, else from its published path.
 * @param {string} [pathname] defaults to the current page
 * @returns {Locale}
 */
export function getLocale(pathname = window.location.pathname) {
  const contentRoot = pathname.match(CONTENT_ROOT)?.[0] || '';
  const path = pathname.slice(contentRoot.length);
  const locale = (contentRoot ? localeOfAemPath(path) : localeOfSitePath(path)) || DEFAULT_LOCALE;
  return {
    ...locale,
    language: locale.lang.split('-')[0].toLowerCase(),
    root: rootOf(locale),
    aemRoot: aemRootOf(locale),
    contentRoot,
  };
}

/**
 * The parent pages of a page up to its locale's Home page (the locale page itself), nearest
 * first, as the URLs to load: published paths (/de-de/insights/blogs, /de-de/insights,
 * /de-de/), or AEM page URLs when editing (/content/tcs-corp/de/de-de/insights.html, …,
 * /content/tcs-corp/de/de-de.html). Empty for the Home page and for pages outside a locale.
 * @param {string} [pathname] defaults to the current page
 * @returns {string[]}
 */
export function getParentPages(pathname = window.location.pathname) {
  const contentRoot = pathname.match(CONTENT_ROOT)?.[0] || '';
  const path = pathname.slice(contentRoot.length)
    .replace(/(\.plain)?\.html$/, '')
    .replace(/\/(index)?$/, '');
  const locale = contentRoot ? localeOfAemPath(path) : localeOfSitePath(path);
  if (!locale) return [];
  const root = contentRoot ? aemRootOf(locale) : rootOf(locale);
  const segments = path.slice(root.length).split('/').filter(Boolean);
  if (!segments.length) return [];
  const parents = [];
  for (let depth = segments.length - 1; depth > 0; depth -= 1) {
    const parent = `${root}/${segments.slice(0, depth).join('/')}`;
    parents.push(contentRoot ? `${contentRoot}${parent}.html` : parent);
  }
  parents.push(contentRoot ? `${contentRoot}${root}.html` : `${root}/`);
  return parents;
}

/**
 * Converts an AEM page path (/content/tcs-corp/de/de-de/about) to its published path
 * (/de-de/about), following paths.json; other paths are returned unchanged.
 * @param {string} pathname
 * @returns {string}
 */
export function toPublishedPath(pathname) {
  const siteRoot = pathname.match(CONTENT_ROOT)?.[0];
  if (!siteRoot) return pathname;
  const path = pathname.slice(siteRoot.length) || '/';
  const locale = localeOfAemPath(path);
  if (!locale) return path;
  return `${rootOf(locale)}${path.slice(aemRootOf(locale).length)}` || '/';
}

/**
 * Converts a published path (/de-de/about) to its AEM page path
 * (/content/tcs-corp/de/de-de/about) below the given site root; AEM paths are returned
 * unchanged.
 * @param {string} pathname
 * @param {string} contentRoot e.g. /content/tcs-corp
 * @returns {string}
 */
export function toAemPath(pathname, contentRoot) {
  if (CONTENT_ROOT.test(pathname)) return pathname;
  const locale = localeOfSitePath(pathname);
  if (!locale) return `${contentRoot}${pathname}`;
  return `${contentRoot}${aemRootOf(locale)}${pathname.slice(rootOf(locale).length)}`;
}

/**
 * The path of a page in the current locale, e.g. references/nav: /de-de/references/nav
 * (/content/tcs-corp/de/de-de/references/nav when editing in AEM).
 * @param {string} path relative to the locale root
 * @param {string} [pathname] a page of the locale to use, defaults to the current page
 */
export function localePagePath(path, pathname = window.location.pathname) {
  const { root, aemRoot, contentRoot } = getLocale(pathname);
  const relative = path.replace(/^\//, '');
  return contentRoot ? `${contentRoot}${aemRoot}/${relative}` : `${root}/${relative}`;
}

/**
 * The path of a configured page (e.g. the nav or footer metadata), else of the locale's default
 * page. A configured value may be an AEM path (/content/tcs-corp/de/de-de/references/nav-jobs),
 * a published path (/de-de/references/nav-jobs) or a path relative to the locale root
 * (references/nav-jobs); it's returned as the path to fetch here: the AEM path when editing,
 * the published path on the site.
 * @param {string} value the configured path, may be empty
 * @param {string} fallback the default page, relative to the locale root (e.g. references/nav)
 * @returns {string}
 */
export function resolvePagePath(value, fallback) {
  const configured = (value || '').trim();
  if (!configured) return localePagePath(fallback);
  if (!configured.startsWith('/') && !/^[a-z]+:/i.test(configured)) return localePagePath(configured);
  let pathname;
  try {
    pathname = new URL(configured, window.location.href).pathname;
  } catch {
    return localePagePath(fallback);
  }
  pathname = pathname.replace(/(\.plain)?\.html$/, '');
  const { contentRoot } = getLocale();
  return contentRoot ? toAemPath(pathname, contentRoot) : toPublishedPath(pathname);
}

/**
 * The URL of a spreadsheet of the current locale, e.g. placeholders: /de-de/placeholders.json
 * @param {string} name the sheet path relative to the locale root, without .json
 */
export function localeSheetPath(name) {
  return `${getLocale().root}/${name.replace(/^\//, '')}.json`;
}

/**
 * The rows of a spreadsheet JSON; for a multi-sheet JSON (e.g. a taxonomy with translated
 * titles) the given sheet, or the default one.
 * @param {Object} json
 * @param {string} [sheet]
 * @returns {Object[]}
 */
export function sheetRows(json, sheet) {
  if (!json) return [];
  if (json[':type'] === 'multi-sheet') {
    return (json[sheet] || json.default || json[json[':names']?.[0]])?.data || [];
  }
  return json.data || [];
}
