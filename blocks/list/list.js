import {
  applyCardListLayout, buildCardListHeader, cardListId, renderCardList, renderCardListEmpty,
  trackCardList,
} from '../../decorators/card-list-decorator.js';
import { PRESENTATION_PROPERTIES } from '../../utils/card-list-config.js';
import { matchCells } from '../../utils/cells.js';
import { getAuthors } from '../../utils/data.js';
import { isEditing } from '../../utils/environment.js';
import { getPlaceholders } from '../../utils/placeholders.js';
import { normalizeKey, textOf } from '../../utils/properties.js';
import { getPages } from '../../utils/query-index.js';
import { loadRedirects, resolveRedirect } from '../../utils/redirects.js';
import { toPublishedPath } from '../../utils/site.js';
import { readTagValues } from '../../utils/tags.js';
import { resolveTags } from '../../utils/taxonomy.js';
import {
  HEADINGS, ITEM_FIELDS, buildCards, normalizeConfig, normalizePath, validateConfig,
} from './list-data.js';

/*
 * List (blocks/list/_list.json): the AEM Core List component for Edge Delivery Services, with
 * the TCS DS Figma List variations as its presentation. Sources: child pages of a page, a fixed
 * list of pages and links (List Item children, with overrides) or pages with tags; pages and
 * their metadata come from the query index, redirects from the redirects sheets (no repository
 * queries in the browser). The cards (image, panel, report, statistic, feature) or the list of
 * links, the grid or horizontal scroll per breakpoint and the data layer state come from the
 * card list decorator, shared with the Cards block (manually authored cards). The data side is
 * ./list-data.js; lists made before (a title and a CTA only) render as they did.
 */

const TEXT_CELL = (cell) => !cell.querySelector('a[href], picture, img');
const ITEM_MATCHERS = {
  link: (cell) => !!cell.querySelector('a[href]'),
  image: (cell) => !!cell.querySelector('picture, img'),
  newTab: (cell) => /^(true|false)$/i.test(textOf(cell)),
  kind: (cell) => /^(image|panel|report|stat)$/i.test(textOf(cell)),
  theme: (cell) => /^(dark|navy|brand|brand-light|grey|mid-grey|gradient|image)$/i.test(textOf(cell)),
};
['headline', 'summary', 'eyebrow', 'tags', 'subtitle', 'ctaLabel', 'analyticsLabel', 'ariaLabel']
  .forEach((field) => { ITEM_MATCHERS[field] = TEXT_CELL; });

/** the block's property names (normalized), to tell property rows from item rows */
const PROPERTIES = new Set([...PRESENTATION_PROPERTIES, 'source', 'parentpath',
  'parentusecurrentpage', 'directchildrenonly', 'childdepth', 'rootpath', 'tagsusecurrentpage',
  'tags', 'tagmatch', 'includedescendants', 'maxdepth', 'orderby', 'sortorder', 'maxitems']);
const PATH_PROPERTIES = ['parentpath', 'rootpath'];
const LIST_PROPERTIES = ['tags', 'classes'];
const debug = (...args) => {
  if (/[?&]debug=list\b/.test(window.location.search)) console.debug('[list]', ...args); // eslint-disable-line no-console
};

/** a published page path from an aem-content value (a link or a path) */
function pathOf(cell) {
  const href = cell?.querySelector('a[href]')?.getAttribute('href') || textOf(cell);
  if (!href) return '';
  const path = /^https?:/i.test(href) ? new URL(href).pathname : href;
  return normalizePath(toPublishedPath(path));
}

/**
 * Reads the block: property rows (key | value), List Item rows and, for lists made before the
 * key-value model, the title and CTA rows.
 * @param {Element} block
 */
export function readBlockConfig(block) {
  const rows = [...block.children];
  const props = {};
  const itemRows = [];
  rows.forEach((row) => {
    const model = row.dataset.aueModel;
    const cells = [...row.children];
    const key = cells.length === 2 ? normalizeKey(cells[0].textContent) : '';
    if (model === 'list-item' || (!model && !PROPERTIES.has(key))) itemRows.push(row);
    else if (key) [, props[key]] = cells;
  });
  const legacy = !Object.keys(props).length && rows.every((row) => row.children.length <= 1);
  const raw = {};
  Object.entries(props).forEach(([key, cell]) => {
    if (PATH_PROPERTIES.includes(key)) raw[key] = pathOf(cell);
    else if (LIST_PROPERTIES.includes(key)) raw[key] = readTagValues(cell).join(',');
    else raw[key] = textOf(cell);
  });
  const items = legacy ? [] : itemRows.map((row) => {
    const cells = matchCells([...row.children], ITEM_FIELDS, ITEM_MATCHERS);
    const a = cells.link?.querySelector('a[href]');
    const href = a?.getAttribute('href') || '';
    const img = cells.image?.querySelector('img');
    const get = (field) => textOf(cells[field]);
    return {
      href,
      linkText: a && a.textContent.trim() !== href ? a.textContent.trim() : '',
      title: get('headline'),
      description: get('summary'),
      image: img?.getAttribute('src') || '',
      imageAlt: img?.getAttribute('alt') || '',
      picture: cells.image?.querySelector('picture') || null,
      eyebrow: get('eyebrow'),
      tags: readTagValues(cells.tags),
      subtitle: get('subtitle'),
      ctaLabel: get('ctaLabel'),
      newTab: get('newTab').toLowerCase(),
      analyticsLabel: get('analyticsLabel'),
      accessibilityLabel: get('ariaLabel'),
      kind: get('kind').toLowerCase(),
      theme: get('theme').toLowerCase(),
      ref: row,
    };
  }).filter((item) => item.href);
  return {
    legacy,
    raw,
    props,
    items,
    heading: legacy ? block.querySelector(HEADINGS.join(',')) : null,
    legacyLink: legacy ? block.querySelector('a[href]') : null,
  };
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  if (block.dataset.listDecorated) return;
  block.dataset.listDecorated = 'true';

  const read = readBlockConfig(block);
  const config = normalizeConfig(read.raw);
  const t = await getPlaceholders();
  const id = cardListId(config, block, 'list');
  if (config.componentId && id !== config.componentId) debug(`component id "${config.componentId}" is used twice`);
  const { header, heading } = buildCardListHeader(read, { base: id });

  // lists made before: a title and a CTA only
  if (read.legacy) {
    block.classList.add('card-list', 'list-legacy');
    block.replaceChildren(...[header].filter(Boolean));
    return;
  }
  block.id = id;
  config.componentId = id;

  const warnings = validateConfig(config, { fixedCount: read.items.length });
  debug('config', config, warnings);
  const needsIndex = config.source !== 'fixed' || read.items.some((item) => item.href.startsWith('/'));
  const [pages, redirects, authorRows] = await Promise.all([
    needsIndex ? getPages() : [],
    loadRedirects(),
    config.featureFirst ? getAuthors().catch(() => []) : [],
  ]);
  const data = {
    pages,
    items: read.items,
    currentPath: normalizePath(toPublishedPath(window.location.pathname)),
    resolveUrl: (path) => resolveRedirect(redirects, path),
    origin: window.location.origin,
    lang: document.documentElement.lang,
  };
  let cards = buildCards(config, data);
  if (!cards.length && config.emptyBehavior === 'fallback' && config.source !== 'fixed') {
    cards = buildCards({ ...config, source: 'fixed' }, data);
  }
  const tagIds = [...new Set(cards.flatMap((card) => card.tagIds))];
  const labels = new Map((await resolveTags(tagIds)).map((tag) => [tag.id, tag.label]));
  cards.forEach((card) => {
    card.tags = card.tagIds.map((tag) => labels.get(tag) || tag);
  });
  debug('cards', cards);

  applyCardListLayout(block, config);
  block.classList.add(`source-${config.source}`);

  if (!cards.length) {
    const editing = isEditing();
    if (config.emptyBehavior === 'hide' && !editing) {
      block.replaceChildren();
      block.hidden = true;
      block.parentElement?.setAttribute('hidden', '');
      return;
    }
    let message = config.emptyMessage || t('listEmpty', 'There are no items to show.');
    if (editing && warnings.length) {
      message = t('listEditorHint', 'Set up the list in its properties: {problems}.', { problems: warnings.join(', ') });
    } else if (editing && config.source !== 'fixed' && !pages.length) {
      message = t('listEditorPages', 'The pages show on the published page (from the query index).');
    }
    renderCardListEmpty(block, header, message);
    return;
  }

  const authors = new Map(authorRows.map((author) => [author.id, author]));
  renderCardList(block, {
    config, cards, header, heading, id, t, authors,
  });
  if (config.analytics) {
    trackCardList(block, {
      id,
      type: 'tcs-corp/components/list',
      title: heading?.textContent.trim() || config.listLabel,
      cards,
      state: {
        'xdm:listSource': config.source,
        'xdm:variant': config.displayAsTeaser ? config.cardStyle : 'links',
      },
    });
  } else {
    block.dataset.analytics = 'off';
  }
}
