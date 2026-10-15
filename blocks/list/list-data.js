/**
 * List data: the List block's configuration, content discovery and card model, without the DOM
 * (unit tested in test/list). Every source is normalized into the same card objects before
 * rendering:
 *   discover (parent / fixed / tags) -> filter -> normalize (+ overrides) -> deduplicate
 *   -> sort -> limit
 * Pages come from the query index (helix-query.yaml); redirects from the redirects sheets.
 */
import {
  flag, hash, integer, isExternal, isSafeUrl, isYes, normalizePath, normalizePresentation,
  pickValue as pick, text, toISODate,
} from '../../utils/card-list-config.js';
import { formatDate } from '../../utils/dates.js';
import { columnOf, listOf } from '../../utils/query-index.js';

// the presentation settings shared with the Cards block (re-exported for the List's users)
export {
  BREAKPOINTS, CARD_KINDS, CARD_STYLES, CARD_THEMES, DATE_FORMATS, DISPLAY_MODES, HEADINGS,
  IMAGE_RATIOS, PANEL_HEIGHTS, RESPONSIVE_DEFAULTS, YES, hash, isExternal, isSafeUrl, kindOf,
  normalizePath, toISODate, toSafeId,
} from '../../utils/card-list-config.js';

/**
 * The cells of a List Item row, in the order of the list-item model fields (link text and image
 * alt fold into the link and image cells); test/list checks the order against _list.json
 */
export const ITEM_FIELDS = ['link', 'newTab', 'headline', 'summary', 'image', 'eyebrow', 'tags',
  'subtitle', 'ctaLabel', 'kind', 'theme', 'analyticsLabel', 'ariaLabel'];

export const SOURCES = ['parent', 'fixed', 'tags'];
export const ORDER_BY = ['manual', 'title', 'lastmodified'];
export const EMPTY_BEHAVIORS = ['hide', 'message', 'fallback'];

/**
 * Page metadata columns of the card parts, in order of preference (metadata names; the index
 * names them in camelCase, e.g. card-title -> cardTitle). An extension point: projects can
 * change the order or add columns that helix-query.yaml indexes.
 */
export const PAGE_MAPPING = {
  title: ['card-title', 'title'],
  description: ['card-description', 'description'],
  image: ['card-image', 'image', 'thumbnail-image', 'featured-image'],
  imageAlt: ['card-image-alt', 'image-alt'],
  eyebrow: ['eyebrow', 'category'],
  tags: ['tags'],
  date: ['modified-date', 'publish-date'],
  contentType: ['content-type'],
  readingTime: ['reading-time'],
  authorId: ['author-id'],
  hidden: ['hide-in-nav'],
};

/** the site's default social image is no card image */
const DEFAULT_IMAGE = /\/default-meta-image\.(png|jpe?g|webp)/i;

/**
 * Normalizes the authored properties (lower-case keys, text values) into the configuration:
 * the List's sources and order, and the shared presentation (utils/card-list-config.js);
 * missing or invalid values get their defaults, so a configuration never breaks rendering.
 * @param {Object<string, string>} raw
 * @returns {Object}
 */
export function normalizeConfig(raw = {}) {
  const get = (key) => raw[key];
  const directOnly = flag(get('directchildrenonly'), true);
  const maxItems = integer(get('maxitems'), 0, { min: 0 });
  return {
    source: pick(get('source'), SOURCES, 'fixed'),
    // parent
    parentPath: normalizePath(get('parentpath')),
    parentUseCurrentPage: flag(get('parentusecurrentpage'), true),
    childDepth: directOnly ? 1 : integer(get('childdepth'), 1, { min: 1, max: 10 }),
    // tags
    rootPath: normalizePath(get('rootpath')),
    tagsUseCurrentPage: flag(get('tagsusecurrentpage'), true),
    tags: listOf(get('tags')).map(text).filter(Boolean),
    tagMatch: pick(get('tagmatch'), ['any', 'all'], 'any'),
    includeDescendants: flag(get('includedescendants'), true),
    maxDepth: integer(get('maxdepth'), 0, { min: 0, max: 10 }),
    // common
    orderBy: pick(text(get('orderby')).replace(/[^a-z]/gi, ''), ORDER_BY, 'manual'),
    sortOrder: pick(get('sortorder'), ['ascending', 'descending'], 'ascending'),
    maxItems: maxItems > 0 ? maxItems : Infinity,
    emptyBehavior: pick(get('emptybehavior'), EMPTY_BEHAVIORS, 'message'),
    ...normalizePresentation(raw),
  };
}

/**
 * Checks a configuration for problems an author can fix (shown in the editor).
 * @param {Object} config from normalizeConfig()
 * @param {{ fixedCount?: number }} [context]
 * @returns {string[]} warning codes
 */
export function validateConfig(config, { fixedCount = 0 } = {}) {
  const warnings = [];
  if (config.source === 'tags' && !config.tags.length) warnings.push('tags-missing');
  if (config.source === 'parent' && !config.parentPath && !config.parentUseCurrentPage) {
    warnings.push('parent-missing');
  }
  if (config.source === 'tags' && !config.rootPath && !config.tagsUseCurrentPage) {
    warnings.push('root-missing');
  }
  if (config.source === 'fixed' && !fixedCount) warnings.push('items-missing');
  return warnings;
}

/* discovery */

const depthBelow = (path, root) => {
  const rest = root === '/' ? path.slice(1) : path.slice(root.length + 1);
  return rest ? rest.split('/').length : 0;
};
const isBelow = (path, root) => (root === '/' ? path !== '/' : path.startsWith(`${root}/`));

/** pages that may be listed (not hidden from navigation, with a path) */
export const isListable = (page) => !!page?.path
  && !PAGE_MAPPING.hidden.some((column) => isYes(columnOf(page, column)));

/**
 * Parent / child pages: the pages below the parent, at most childDepth levels down.
 * @param {Object[]} pages index pages
 * @param {string} parent published path
 * @param {number} depth
 */
export function resolveParentPages(pages, parent, depth = 1) {
  if (!parent) return [];
  return pages.filter((page) => {
    const path = normalizePath(page.path);
    return isListable(page) && isBelow(path, parent) && depthBelow(path, parent) <= depth;
  });
}

/** whether a page has a tag, or one of its child tags (tcs:topic/ai matches tcs:topic/ai/genai) */
export const hasTag = (tags, tag) => tags.some((id) => id === tag || id.startsWith(`${tag}/`));

/**
 * Tag matching: any selected tag, or all of them.
 * @param {Object[]} pages
 * @param {string[]} tags
 * @param {'any'|'all'} match
 */
export function applyTagMatching(pages, tags, match = 'any') {
  if (!tags.length) return [];
  return pages.filter((page) => {
    const pageTags = listOf(columnOf(page, PAGE_MAPPING.tags[0]));
    return match === 'all' ? tags.every((tag) => hasTag(pageTags, tag))
      : tags.some((tag) => hasTag(pageTags, tag));
  });
}

/**
 * Tag-based pages: below the root (all descendants, or children only; at most maxDepth levels
 * when set) with the tags.
 */
export function resolveTagPages(pages, {
  root, tags, match, includeDescendants, maxDepth,
}) {
  if (!root) return [];
  const depth = includeDescendants ? (maxDepth || Infinity) : 1;
  const below = pages.filter((page) => {
    const path = normalizePath(page.path);
    return isListable(page) && isBelow(path, root) && depthBelow(path, root) <= depth;
  });
  return applyTagMatching(below, tags, match);
}

/* normalization */

const firstColumn = (page, columns) => columns.map((column) => text(columnOf(page, column)))
  .find(Boolean) || '';

/**
 * The card of an index page: page metadata, then defaults.
 * @param {Object} page index page (utils/query-index.js)
 * @param {Object} config
 * @param {Object} [context] { sourceType, resolveUrl(path), origin }
 */
export function normalizePageToCard(page, config, context = {}) {
  const { sourceType = config.source, resolveUrl = (u) => u } = context;
  const path = normalizePath(page.path);
  // the first image that isn't the site's default social image
  const image = PAGE_MAPPING.image.map((column) => text(columnOf(page, column)))
    .find((value) => value && !DEFAULT_IMAGE.test(value)) || '';
  const modified = toISODate(columnOf(page, 'modified-date'));
  const dateISO = toISODate(firstColumn(page, PAGE_MAPPING.date))
    || toISODate(page.lastModified);
  return {
    sourceType,
    sourcePath: path,
    url: resolveUrl(path),
    title: firstColumn(page, PAGE_MAPPING.title) || path.split('/').pop().replace(/-/g, ' '),
    description: firstColumn(page, PAGE_MAPPING.description),
    image,
    imageAlt: firstColumn(page, PAGE_MAPPING.imageAlt),
    eyebrow: firstColumn(page, PAGE_MAPPING.eyebrow),
    tagIds: listOf(columnOf(page, PAGE_MAPPING.tags[0])).map(text).filter(Boolean),
    tags: [],
    dateISO,
    date: dateISO ? formatDate(dateISO, config.dateFormat).text : '',
    // last modified: the modified-date metadata, else when the page was last published
    lastModified: (modified ? Date.parse(modified) / 1000 : 0) || Number(page.lastModified) || 0,
    contentType: firstColumn(page, PAGE_MAPPING.contentType),
    readingTime: firstColumn(page, PAGE_MAPPING.readingTime),
    authorId: firstColumn(page, PAGE_MAPPING.authorId),
    subtitle: '',
    kind: '',
    theme: '',
    ctaLabel: '',
    openInNewTab: config.openInNewTab,
    external: false,
    analyticsLabel: '',
    accessibilityLabel: '',
  };
}

/** an empty card for a link that isn't an indexed page */
function linkCard(href, config, origin) {
  return {
    sourceType: 'fixed',
    sourcePath: '',
    url: href,
    title: '',
    description: '',
    image: '',
    imageAlt: '',
    eyebrow: '',
    tagIds: [],
    tags: [],
    dateISO: '',
    date: '',
    lastModified: 0,
    contentType: '',
    readingTime: '',
    authorId: '',
    subtitle: '',
    kind: '',
    theme: '',
    ctaLabel: '',
    openInNewTab: config.openInNewTab,
    external: isExternal(href, origin),
    analyticsLabel: '',
    accessibilityLabel: '',
  };
}

/**
 * Applies a Fixed item's overrides over its card (an authored value wins).
 * @param {Object} card
 * @param {Object} item the authored item values
 */
export function applyOverrides(card, item) {
  const out = { ...card };
  const set = (key, value) => {
    if (text(value)) out[key] = text(value);
  };
  set('title', item.title);
  if (!out.title) set('title', item.linkText);
  set('description', item.description);
  if (item.image) {
    out.image = text(item.image);
    out.imageAlt = text(item.imageAlt);
  } else {
    set('imageAlt', item.imageAlt);
  }
  set('eyebrow', item.eyebrow);
  set('subtitle', item.subtitle);
  set('ctaLabel', item.ctaLabel);
  set('analyticsLabel', item.analyticsLabel);
  set('accessibilityLabel', item.accessibilityLabel);
  set('kind', item.kind);
  set('theme', item.theme);
  if (item.tags?.length) out.tagIds = item.tags;
  if (text(item.newTab) !== '') out.openInNewTab = isYes(item.newTab);
  // opaque references the renderer uses: the authored image element and the item's row
  if (item.picture) out.picture = item.picture;
  if (item.ref) out.ref = item.ref;
  return out;
}

/**
 * Fixed items: each item's page (from the index, when it's an indexed page) with the item's
 * overrides, in the authored order. Unsafe or missing links are skipped.
 * @param {Object[]} items authored items ({ href, linkText, title, ... })
 * @param {Map<string, Object>} pagesByPath index pages by normalized path
 * @param {Object} config
 * @param {Object} [context] { resolveUrl(path), origin }
 */
export function resolveFixedItems(items, pagesByPath, config, context = {}) {
  const { resolveUrl = (u) => u, origin = '' } = context;
  return items.map((item) => {
    const href = text(item.href);
    if (!isSafeUrl(href)) return null;
    // a link to this site (absolute) is read as its path
    const sameSite = origin && href.toLowerCase().startsWith(origin.toLowerCase());
    const local = sameSite ? href.slice(origin.length) || '/' : href;
    const internal = local.startsWith('/');
    const page = internal ? pagesByPath.get(normalizePath(local)) : null;
    let base;
    if (page) base = normalizePageToCard(page, config, { sourceType: 'fixed', resolveUrl });
    else {
      base = linkCard(internal ? resolveUrl(local) : href, config, origin);
      base.sourcePath = internal ? normalizePath(local) : '';
    }
    const card = applyOverrides(base, item);
    card.external = isExternal(card.url, origin);
    return card.title ? card : null;
  }).filter(Boolean);
}

/* deduplicate, sort, limit */

/** the stable key of a card: its destination (path, or the full external URL), lower case */
export const dedupeKey = (card) => normalizePath(card.url || card.sourcePath).toLowerCase();

export function deduplicateCards(cards) {
  const seen = new Set();
  return cards.filter((card) => {
    const key = dedupeKey(card);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Sorts the cards. Manual keeps the authored order (Fixed) or, for Parent and Tags, the path
 * order (deterministic). Ties are broken by path.
 * @param {Object[]} cards
 * @param {string} orderBy manual | title | lastmodified
 * @param {string} sortOrder ascending | descending
 * @param {string} [lang]
 */
export function sortCards(cards, orderBy, sortOrder, lang) {
  const collator = new Intl.Collator(lang || undefined, { sensitivity: 'base', numeric: true });
  const byPath = (a, b) => collator.compare(a.sourcePath || a.url, b.sourcePath || b.url);
  const sign = sortOrder === 'descending' ? -1 : 1;
  let compare;
  if (orderBy === 'title') compare = (a, b) => collator.compare(a.title, b.title) || byPath(a, b);
  else if (orderBy === 'lastmodified') compare = (a, b) => (a.lastModified - b.lastModified) || byPath(a, b);
  else if (cards[0]?.sourceType === 'fixed') return [...cards];
  else compare = byPath;
  return [...cards].sort((a, b) => sign * compare(a, b));
}

export const limitCards = (cards, max) => (Number.isFinite(max) && max > 0
  ? cards.slice(0, max) : cards);

/** stable ids: the component id and a hash of the card key */
export const withIds = (cards, componentId) => cards.map((card) => ({
  ...card,
  id: `${componentId}-item-${hash(dedupeKey(card))}`,
}));

/**
 * The whole pipeline for a source.
 * @param {Object} config
 * @param {Object} data { pages, items, currentPath, resolveUrl, origin, lang }
 * @returns {Object[]} cards with ids
 */
export function buildCards(config, data) {
  const {
    pages = [], items = [], currentPath = '', resolveUrl = (u) => u, origin = '', lang,
  } = data;
  let cards = [];
  if (config.source === 'parent') {
    const parent = config.parentPath || (config.parentUseCurrentPage ? normalizePath(currentPath) : '');
    cards = resolveParentPages(pages, parent, config.childDepth)
      .map((page) => normalizePageToCard(page, config, { sourceType: 'parent', resolveUrl }));
  } else if (config.source === 'tags') {
    const root = config.rootPath || (config.tagsUseCurrentPage ? normalizePath(currentPath) : '');
    cards = resolveTagPages(pages, {
      root,
      tags: config.tags,
      match: config.tagMatch,
      includeDescendants: config.includeDescendants,
      maxDepth: config.maxDepth,
    }).map((page) => normalizePageToCard(page, config, { sourceType: 'tags', resolveUrl }));
  } else {
    const pagesByPath = new Map(pages.map((page) => [normalizePath(page.path), page]));
    cards = resolveFixedItems(items, pagesByPath, config, { resolveUrl, origin });
  }
  const sorted = sortCards(deduplicateCards(cards), config.orderBy, config.sortOrder, lang);
  return withIds(limitCards(sorted, config.maxItems), config.componentId || 'list');
}
