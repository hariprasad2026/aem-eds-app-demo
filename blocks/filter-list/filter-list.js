import { buildAuthorLockup } from '../../decorators/article-meta-decorator.js';
import { decorateButton } from '../../decorators/button-decorator.js';
import { buildTime } from '../../decorators/date-decorator.js';
import { createIconButton } from '../../decorators/icon-button-decorator.js';
import { layoutMasonry } from '../../decorators/masonry-decorator.js';
import { buildImage } from '../../decorators/responsive-image-decorator.js';
import { toClassName } from '../../scripts/aem.js';
import { getAuthors } from '../../utils/data.js';
import { isEditing } from '../../utils/environment.js';
import { uniqueId } from '../../utils/ids.js';
import { readMultifieldItems } from '../../utils/multifield.js';
import { getPlaceholders } from '../../utils/placeholders.js';
import { isOn, readProperties, textOf } from '../../utils/properties.js';
import { columnOf, getPages, listOf } from '../../utils/query-index.js';
import { toPublishedPath } from '../../utils/site.js';
import { readTagValues } from '../../utils/tags.js';
import { loadTaxonomy, resolveTags } from '../../utils/taxonomy.js';

/*
 * Filter List (blocks/filter-list/_filter-list.json; TCS DS Figma "Explore the Agentic bank" /
 * "Explore insights & opinions"): a content discovery list of the locale's pages from the query
 * index (or a manual list), as cards built from the pages' metadata (Card mapping).
 * - Source: pages below the Root path, of the Page types and Content types, in the Sort order
 * - Filters: pills for the Primary filter tags (labels from the taxonomy), All, single or multi
 *   select (multi: pages with every selected tag); the filter button opens the Advanced filter
 *   categories (options: the tags below each taxonomy root used by the pages; AND / OR)
 * - Cards: a hero spotlight first (Hero rule), standard cards in the Layout (masonry, grid,
 *   list) and Card style (default, compact, featured, mixed: report and image-less dark cards),
 *   a featured spotlight card after each page of cards (Featured rule, count)
 * - Load more adds the next cards; filtering re-renders from the index loaded once
 * Every label comes from the placeholders.
 */

const LAYOUTS = ['masonry', 'grid', 'list'];
const STYLES = ['default', 'compact', 'featured', 'mixed'];
const SORTS = ['latest', 'featured', 'priority', 'alphabetical'];
const FEATURED_RULES = ['featured', 'priority', 'manual'];
const HERO_RULES = ['latest', 'featured', 'manual'];
const FEATURED_PRIORITY = 3;
const MAX_CARD_TAGS = 2;
const CARD_IMAGE = [{ media: '(min-width: 900px)', width: '600' }, { width: '750' }];
const SPOTLIGHT_IMAGE = [{ media: '(min-width: 900px)', width: '1600' }, { width: '750' }];

const pick = (cell, allowed, fallback) => {
  const value = toClassName(textOf(cell));
  return allowed.includes(value) ? value : fallback;
};
const flag = (cell, fallback) => (cell ? isOn(cell) : fallback);
const count = (cell, fallback) => Math.max(1, parseInt(textOf(cell), 10) || fallback);
const normalizePath = (path) => toPublishedPath(path.replace(/\.html$/, '')).replace(/(.)\/$/, '$1');

/** page paths of an aem-content property (links or text, one or many) */
function pathsOf(cell) {
  if (!cell) return [];
  const links = [...cell.querySelectorAll('a[href]')];
  const values = links.length
    ? links.map((a) => new URL(a.href, window.location.href).pathname)
    : readTagValues(cell);
  return values.map(normalizePath).filter(Boolean);
}

/** the elements of a multifield item (a list item's children, or the item's elements) */
const itemElements = (item) => (item.length === 1 && item[0].tagName === 'LI' && item[0].children.length
  ? [...item[0].children] : item);
const isTagId = (text) => /^[\w-]+:[\w/-]*$/.test(text);

/** the Primary filter tags; the filters of lists made before (Tag title and Tags) */
function readPrimaryTags(props) {
  const tags = readMultifieldItems(props.primarytags)
    .map((item) => itemElements(item).map(textOf).find(isTagId))
    .filter(Boolean)
    .map((id) => ({ id, label: '', tags: [id] }));
  if (tags.length || !props.filters) return tags;
  return readMultifieldItems(props.filters).map((item) => {
    const [labelEl, ...rest] = itemElements(item);
    const cell = document.createElement('div');
    cell.append(...rest.map((el) => el.cloneNode(true)));
    return { id: textOf(labelEl), label: textOf(labelEl), tags: readTagValues(cell) };
  }).filter(({ label, tags: ids }) => label && ids.length);
}

/** the Advanced filter categories: a label and a taxonomy root each */
function readCategories(cell) {
  return readMultifieldItems(cell).map((item) => {
    const texts = itemElements(item).map(textOf).filter(Boolean);
    return { root: texts.find(isTagId) || '', label: texts.find((text) => !isTagId(text)) || '' };
  }).filter(({ root }) => root);
}

function readConfig(block) {
  const props = readProperties(block);
  return {
    props,
    showCount: flag(props.showresultcount, false),
    layout: pick(props.layout, LAYOUTS, 'masonry'),
    perPage: count(props.cardsperpage, 9),
    moreCount: count(props.loadmorecount, 6),
    manual: toClassName(textOf(props.source)) === 'manual',
    rootPath: pathsOf(props.rootpath)[0] || '',
    pages: pathsOf(props.pages),
    pageTypes: readTagValues(props.pagetypes).map(toClassName),
    contentTypes: readTagValues(props.contenttypes).map(toClassName),
    sortBy: pick(props.sortby, SORTS, 'latest'),
    category: textOf(props.primarycategory),
    primary: readPrimaryTags(props),
    showAll: flag(props.showall, true),
    multiSelect: flag(props.multiselect, false),
    advanced: flag(props.advancedfilter, true),
    categories: readCategories(props.advancedcategories),
    logic: pick(props.filterlogic, ['and', 'or'], 'and'),
    style: pick(props.cardstyle, STYLES, 'mixed'),
    featured: flag(props.enablefeatured, true),
    featuredRule: pick(props.featuredrule, FEATURED_RULES, 'featured'),
    featuredPages: pathsOf(props.featuredpages),
    featuredCount: count(props.featuredcount, 2),
    hero: flag(props.enablehero, false),
    heroRule: pick(props.herorule, HERO_RULES, 'featured'),
    heroPage: pathsOf(props.heropage)[0] || '',
    map: {
      image: textOf(props.imagesource) || 'featured-image',
      fallbackImage: textOf(props.fallbackimage) || 'thumbnail-image',
      eyebrow: textOf(props.eyebrowsource) || 'content-type',
      title: textOf(props.titlesource) || 'title',
      description: textOf(props.descriptionsource) || 'description',
      tags: textOf(props.tagsource) || 'tags',
      url: textOf(props.urlsource) || 'path',
      author: textOf(props.authorsource) || 'author',
    },
  };
}

/* filtering and sorting */

const hasTag = (page, tag) => page.tags.some((id) => id === tag || id.startsWith(`${tag}/`));
const byLatest = (a, b) => (b.publishDate || '').localeCompare(a.publishDate || '')
  || b.lastModified - a.lastModified;
const byPriority = (a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity) || byLatest(a, b);

function sorter(sortBy) {
  if (sortBy === 'featured') return (a, b) => Number(b.featured) - Number(a.featured) || byPriority(a, b);
  if (sortBy === 'priority') return byPriority;
  if (sortBy === 'alphabetical') {
    const collator = new Intl.Collator(document.documentElement.lang || undefined, { sensitivity: 'base' });
    return (a, b) => collator.compare(a.title, b.title);
  }
  return byLatest;
}

/** the pages of the list: the manual list, or the index pages of the source settings */
function candidatesOf(pages, config) {
  const here = normalizePath(window.location.pathname);
  if (config.manual) {
    const byPath = new Map(pages.map((page) => [normalizePath(page.path), page]));
    return config.pages.map((path) => byPath.get(path)).filter(Boolean);
  }
  const root = config.rootPath;
  return pages.filter((page) => {
    const path = normalizePath(page.path);
    if (path === here || (root && !path.startsWith(`${root}/`))) return false;
    const isOf = (types, value) => !types.length || types.includes(toClassName(value));
    return isOf(config.pageTypes, page.pageType) && isOf(config.contentTypes, page.contentType);
  }).sort(sorter(config.sortBy));
}

/** the hero, the featured cards and the standard cards of the matching pages */
function arrange(matches, config) {
  let rest = [...matches];
  const take = (pages) => {
    rest = rest.filter((page) => !pages.includes(page));
    return pages;
  };
  const find = (path) => rest.find((page) => normalizePath(page.path) === path);
  const inOrder = (paths) => paths.map(find).filter(Boolean);

  let hero = null;
  if (config.hero) {
    // manual: the Hero page; featured: the top featured page, else the latest; latest
    if (config.heroRule === 'manual') hero = find(config.heroPage) || null;
    else {
      const top = config.heroRule === 'featured' ? rest.filter((page) => page.featured) : [];
      hero = (top.length ? top.sort(byPriority) : [...rest].sort(byLatest))[0] || null;
    }
    if (hero) take([hero]);
  }

  let featured = [];
  if (config.featured) {
    const byRule = (page) => page.featured;
    const byRank = (page) => page.priority !== null && page.priority <= FEATURED_PRIORITY;
    if (config.featuredRule === 'manual') featured = inOrder(config.featuredPages);
    else if (config.featuredRule === 'featured') {
      featured = rest.filter(byRule).sort(byPriority);
      if (!featured.length) featured = rest.filter(byRank).sort(byPriority);
    } else featured = rest.filter(byRank).sort(byPriority);
    featured = take(featured.slice(0, config.featuredCount));
  }
  return { hero, featured, cards: rest };
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = readConfig(block);
  const { props, map } = config;
  const id = uniqueId('filter-list');
  const [t, pages, taxonomy, authorRows] = await Promise.all([
    getPlaceholders(), getPages(), loadTaxonomy(), getAuthors().catch(() => []),
  ]);
  const authors = new Map(authorRows.map((author) => [author.id, author]));
  const candidates = candidatesOf(pages, config);

  // tag labels from the taxonomy (never the IDs)
  const tagIds = [...new Set([
    ...candidates.flatMap((page) => listOf(columnOf(page, map.tags))),
    ...config.primary.flatMap((filter) => filter.tags),
  ])];
  const labels = new Map((await resolveTags(tagIds)).map((tag) => [tag.id, tag.label]));
  const labelOf = (tag) => labels.get(tag) || taxonomy.get(tag) || tag;

  // the pills: the Primary filter tags, else the category's tags used by the pages
  const used = (root) => [...new Set(candidates.flatMap((page) => page.tags)
    .filter((tag) => tag.startsWith(`${root}/`)))].sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
  const primary = config.primary.length ? config.primary
    : (config.category ? used(config.category) : []).map((tag) => ({ id: tag, tags: [tag] }));
  primary.forEach((filter) => {
    if (!filter.label) filter.label = labelOf(filter.id);
  });
  const categories = config.advanced ? config.categories.map((category) => ({
    ...category,
    label: category.label || labelOf(category.root),
    options: used(category.root),
  })).filter((category) => category.options.length) : [];

  const element = (tagName, className, text) => {
    const el = document.createElement(tagName);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };

  /* cards */

  const text = (page, source) => String(columnOf(page, source) || '').trim();
  const urlOf = (page) => text(page, map.url) || page.path;
  const titleOf = (page) => text(page, map.title) || page.title || page.path;
  const imageOf = (page) => text(page, map.image) || text(page, map.fallbackImage);
  const tagsOf = (page) => listOf(columnOf(page, map.tags)).slice(0, MAX_CARD_TAGS).map(labelOf);
  const readingOf = (page) => (/^\d+$/.test(page.readingTime)
    ? t('minutesShort', '{n}m', { n: page.readingTime }) : page.readingTime);
  const authorOf = (page) => {
    const value = text(page, map.author);
    const author = authors.get(value) || authors.get(page.authorId);
    if (author) return author;
    return value ? { name: value } : null;
  };

  const labelRow = (className, values) => {
    const items = values.filter(Boolean);
    if (!items.length) return null;
    const row = element('p', className);
    items.forEach((value) => row.append(typeof value === 'string' ? element('span', '', value) : value));
    return row;
  };
  const media = (page, breakpoints) => {
    const picture = buildImage(imageOf(page) ? { src: imageOf(page), alt: '' } : null, breakpoints);
    if (!picture) return null;
    const wrapper = element('div', 'filter-list-card-media');
    wrapper.append(picture);
    return wrapper;
  };
  // the card's one link covers the card: the title, or the call to action
  const titleLink = (page) => {
    const heading = element('h3', 'filter-list-card-title');
    const a = element('a', 'filter-list-card-link', titleOf(page));
    a.href = urlOf(page);
    heading.append(a);
    return heading;
  };
  const action = (page, label, type) => {
    const a = element('a', 'filter-list-card-link', label);
    a.href = urlOf(page);
    a.setAttribute('aria-label', `${label}: ${titleOf(page)}`);
    decorateButton(a, { view: 'button', type });
    const wrapper = element('p', 'filter-list-card-action');
    wrapper.append(a);
    return wrapper;
  };
  const description = (page) => {
    const value = text(page, map.description);
    return value ? element('p', 'filter-list-card-description', value) : null;
  };
  const meta = (page) => labelRow('filter-list-card-meta', [
    text(page, map.eyebrow), buildTime(page.publishDate, 'dd-mmm-yy'),
  ]);
  const tagRow = (page) => labelRow('filter-list-card-tags', [...tagsOf(page), readingOf(page)]);

  const card = (kind, parts) => {
    const article = element('article', `filter-list-card filter-list-card-${kind}`);
    article.append(...parts.filter(Boolean));
    return article;
  };
  const isReport = (page) => /report/i.test(text(page, map.eyebrow));

  function standardCard(page) {
    const { style } = config;
    if (style === 'mixed' && isReport(page)) {
      return card('report', [
        labelRow('filter-list-card-tags', [text(page, map.eyebrow), buildTime(page.publishDate, 'dd-mmm-yy')]),
        element('h3', 'filter-list-card-title', titleOf(page)),
        description(page),
        action(page, t('download', 'Download'), 'secondary'),
      ]);
    }
    if (style === 'mixed' && !imageOf(page)) {
      return card('dark', [
        labelRow('filter-list-card-tags', tagsOf(page).slice(0, 1)),
        element('h3', 'filter-list-card-title', titleOf(page)),
        description(page),
        action(page, t('explore', 'Explore'), 'tertiary'),
      ]);
    }
    if (style === 'compact') {
      return card('compact', [tagRow(page), titleLink(page), meta(page)]);
    }
    if (style === 'featured') {
      return card('large', [
        media(page, CARD_IMAGE), tagRow(page), element('h3', 'filter-list-card-title', titleOf(page)),
        description(page), meta(page), action(page, t('readMore', 'Read more'), 'tertiary'),
      ]);
    }
    return card('standard', [
      media(page, CARD_IMAGE), tagRow(page), titleLink(page),
      style === 'default' ? description(page) : null, meta(page),
    ]);
  }

  /** hero and featured cards: the image behind tags, title and author */
  function spotlightCard(page, kind) {
    const author = authorOf(page);
    const content = element('div', 'filter-list-card-content');
    content.append(...[
      tagRow(page),
      titleLink(page),
      kind === 'hero' ? description(page) : null,
      author ? buildAuthorLockup({
        picture: buildImage(author.image ? { src: author.image, alt: '' } : null),
        name: element('p', 'filter-list-author-name', author.name),
        designation: author.designation ? element('p', 'filter-list-author-designation', author.designation) : null,
        prefix: 'filter-list',
      }) : null,
    ].filter(Boolean));
    const spotlight = card(`spotlight filter-list-card-${kind}`, [media(page, SPOTLIGHT_IMAGE), content]);
    if (kind === 'hero') spotlight.querySelector('img')?.setAttribute('loading', 'eager');
    return spotlight;
  }

  /* the block */

  const header = element('div', 'filter-list-header');
  const title = textOf(props.title);
  if (title) header.append(element('h2', 'filter-list-title', title));
  if (props.description?.textContent.trim()) {
    const intro = element('div', 'filter-list-description');
    intro.append(...props.description.childNodes);
    header.append(intro);
  }

  const status = element('p', `filter-list-count${config.showCount ? '' : ' visually-hidden'}`);
  status.setAttribute('role', 'status');
  const results = element('div', 'filter-list-results');
  results.id = `${id}-results`;
  const grid = element('div', `filter-list-grid layout-${config.layout}`);
  if (config.layout === 'masonry') layoutMasonry(grid);
  const more = element('button', '', t('loadMore', 'Load more'));
  more.dataset.cmpInteraction = 'load-more';
  more.type = 'button';
  decorateButton(more, { view: 'button', type: 'secondary' });
  const moreWrapper = element('p', 'filter-list-more');
  moreWrapper.append(more);
  moreWrapper.hidden = true;

  // the filter state
  const selected = new Set();
  const options = new Set();
  let shown = 0;
  let arranged = { hero: null, featured: [], cards: [] };
  let nextFeatured = 0;

  const matches = () => candidates.filter((page) => {
    const chosen = primary.filter((filter) => selected.has(filter.id));
    const inFilter = (filter) => filter.tags.some((tag) => hasTag(page, tag));
    if (chosen.length && !chosen.every(inFilter)) return false;
    if (!options.size) return true;
    const has = (tag) => hasTag(page, tag);
    return config.logic === 'or' ? [...options].some(has) : [...options].every(has);
  });

  /** the next page of cards, then the next featured card (the rest of them after the last) */
  const appendCards = (size) => {
    const added = arranged.cards.slice(shown, shown + size).map(standardCard);
    shown += added.length;
    const { featured } = arranged;
    const spotlights = featured.slice(nextFeatured, shown >= arranged.cards.length
      ? featured.length : nextFeatured + 1);
    nextFeatured += spotlights.length;
    added.push(...spotlights.map((page) => spotlightCard(page, 'featured')));
    grid.append(...added);
    moreWrapper.hidden = shown >= arranged.cards.length && nextFeatured >= arranged.featured.length;
    return added;
  };

  const resultText = (n) => (n === 1 ? t('resultCountOne', '1 result') : t('resultCount', '{n} results', { n }));

  const reset = element('button', '', t('resetFilters', 'Reset filters'));
  reset.type = 'button';
  decorateButton(reset, { view: 'button', type: 'secondary' });

  function render() {
    arranged = arrange(matches(), config);
    const total = (arranged.hero ? 1 : 0) + arranged.featured.length + arranged.cards.length;
    shown = 0;
    nextFeatured = 0;
    grid.replaceChildren();
    results.replaceChildren();
    status.textContent = resultText(total);
    if (!total) {
      const empty = element('div', 'filter-list-empty');
      const editorHint = isEditing() && !pages.length;
      empty.append(element('p', 'filter-list-empty-title', editorHint
        ? t('filterListEditor', 'The results show on the published page, from the pages\' metadata.')
        : t('noResources', 'No resources found.')));
      if (!editorHint) {
        empty.append(element('p', 'filter-list-empty-hint', t('noResourcesHint', 'Try selecting another filter.')));
        if (selected.size || options.size) empty.append(reset);
      }
      results.append(empty);
      moreWrapper.hidden = true;
      return;
    }
    if (arranged.hero) results.append(spotlightCard(arranged.hero, 'hero'));
    results.append(grid);
    appendCards(config.perPage);
  }

  // the pills: All and the Primary filter tags
  const pills = element('div', 'filter-list-filters');
  pills.setAttribute('role', 'group');
  pills.setAttribute('aria-label', t('filters', 'Filters'));
  const pillList = [
    ...(config.showAll ? [{ id: '', label: t('all', 'All') }] : []),
    ...primary,
  ];
  const pillButtons = pillList.map((filter) => {
    const button = element('button', 'filter-list-filter', filter.label);
    button.dataset.cmpInteraction = 'filter';
    button.dataset.cmpValue = filter.id || 'all';
    button.type = 'button';
    button.dataset.filter = filter.id;
    button.setAttribute('aria-controls', results.id);
    return button;
  });
  const syncPills = () => pillButtons.forEach((button) => {
    const value = button.dataset.filter;
    button.setAttribute('aria-pressed', String(value ? selected.has(value) : !selected.size));
  });
  pillButtons.forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.filter;
    if (!value) selected.clear();
    else if (selected.has(value)) selected.delete(value);
    else {
      if (!config.multiSelect) selected.clear();
      selected.add(value);
    }
    syncPills();
    render();
  }));
  pills.append(...pillButtons);
  syncPills();

  // the advanced filter: a panel of the categories' options
  const toolbar = element('div', 'filter-list-toolbar');
  if (pillButtons.length) toolbar.append(element('p', 'filter-list-label', textOf(props.filterslabel) || t('filters', 'Filters')), pills);
  let panel = null;
  if (categories.length) {
    panel = element('div', 'filter-list-panel');
    panel.id = `${id}-panel`;
    panel.hidden = true;
    panel.setAttribute('role', 'region');
    const panelLabel = t('advancedFilters', 'Advanced filters');
    panel.setAttribute('aria-label', panelLabel);
    const panelHeader = element('div', 'filter-list-panel-header');
    const clear = element('button', '', t('clearAll', 'Clear all'));
    clear.type = 'button';
    decorateButton(clear, { view: 'button', type: 'tertiary' });
    panelHeader.append(element('p', 'filter-list-panel-title', panelLabel), clear);
    panel.append(panelHeader);

    const boxes = [];
    categories.forEach((category, c) => {
      const fieldset = element('fieldset', 'filter-list-category');
      fieldset.append(element('legend', '', category.label));
      const list = element('ul', 'filter-list-options');
      category.options.forEach((tag, o) => {
        const item = element('li');
        const box = element('input');
        box.type = 'checkbox';
        box.dataset.cmpInteraction = 'filter-option';
        box.id = `${id}-option-${c}-${o}`;
        box.value = tag;
        const label = element('label', '', labelOf(tag));
        label.htmlFor = box.id;
        item.append(box, label);
        list.append(item);
        boxes.push(box);
      });
      fieldset.append(list);
      panel.append(fieldset);
    });

    const toggle = createIconButton({
      label: panelLabel,
      icon: 'filter',
      className: 'filter-list-toggle',
      onClick: () => {
        panel.hidden = !panel.hidden;
        toggle.setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) boxes[0]?.focus();
      },
    });
    toggle.setAttribute('aria-controls', panel.id);
    toggle.setAttribute('aria-expanded', 'false');
    const badge = element('span', 'filter-list-toggle-count');
    badge.setAttribute('aria-hidden', 'true');
    toggle.append(badge);
    const syncOptions = () => {
      boxes.forEach((box) => {
        box.checked = options.has(box.value);
      });
      badge.textContent = options.size ? String(options.size) : '';
      toggle.setAttribute('aria-label', options.size
        ? `${panelLabel}, ${t('selectedCount', '{n} selected', { n: options.size })}` : panelLabel);
      clear.hidden = !options.size;
    };
    boxes.forEach((box) => box.addEventListener('change', () => {
      if (box.checked) options.add(box.value);
      else options.delete(box.value);
      syncOptions();
      render();
    }));
    clear.addEventListener('click', () => {
      options.clear();
      syncOptions();
      render();
      boxes[0]?.focus();
    });
    panel.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    });
    reset.addEventListener('click', () => {
      options.clear();
      syncOptions();
    });
    syncOptions();
    toolbar.append(toggle);
  }
  reset.addEventListener('click', () => {
    selected.clear();
    syncPills();
    render();
    // the reset button is gone with the empty message: focus back on the filters
    (pillButtons[0] || toolbar.querySelector('button'))?.focus();
  });
  if (toolbar.children.length) header.append(toolbar);
  if (panel) header.append(panel);
  header.append(status);

  // Load more: the next cards, focus on the first of them, how many are shown announced
  more.addEventListener('click', () => {
    const added = appendCards(config.moreCount);
    added[0]?.querySelector('a')?.focus();
    const total = (arranged.hero ? 1 : 0) + arranged.featured.length + arranged.cards.length;
    const n = (arranged.hero ? 1 : 0) + nextFeatured + shown;
    status.textContent = n < total ? t('showingCount', 'Showing {n} of {total}', { n, total })
      : resultText(total);
  });

  block.classList.add(`card-${config.style}`, `layout-${config.layout}`);
  block.replaceChildren(header, results, moreWrapper);
  render();
}
