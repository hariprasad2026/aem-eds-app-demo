/**
 * Card list decorator: the cards of the TCS DS Figma List variations, shared by the List
 * (pages and links) and Cards (manually authored cards) blocks, so both render the same markup
 * and look the same (styles/card-list.css, imported by their block CSS):
 * - a header: title, description and a call to action
 * - image, panel, report and statistic cards, a feature card, or rows of links
 * - grid or horizontal scroll per breakpoint (desktop >= 1200px, tablet 600-1199px, mobile),
 *   with previous / next buttons, a scroll indicator, drag and keyboard (scroller decorator)
 * - the data layer state of the list and its cards (clicks: the data layer decorator)
 * The settings are utils/card-list-config.js (normalizePresentation); a card is the card
 * model of blocks/list/README.md (title, description or body, image, eyebrow, tags, date, ...).
 */
import { buildAuthorLockup } from './article-meta-decorator.js';
import { decorateButton } from './button-decorator.js';
import { trackPage } from './data-layer-decorator.js';
import { buildHeading } from './heading-decorator.js';
import { createIconButton } from './icon-button-decorator.js';
import { announceNewTab, setLinkTarget } from './link-decorator.js';
import { buildImage } from './responsive-image-decorator.js';
import { createScroller } from './scroller-decorator.js';
import { moveInstrumentation } from '../scripts/scripts.js';
import { pushComponents } from '../utils/analytics.js';
import { readButtonOptions } from '../utils/buttons.js';
import { BREAKPOINTS, HEADINGS, kindOf } from '../utils/card-list-config.js';
import { uniqueId } from '../utils/ids.js';
import { textOf } from '../utils/properties.js';

const MAX_CARD_TAGS = 3;
const IMAGE_BREAKPOINTS = [{ media: '(min-width: 600px)', width: '750' }, { width: '600' }];
const FEATURE_BREAKPOINTS = [{ media: '(min-width: 900px)', width: '1600' }, { width: '750' }];

const element = (tagName, className, content) => {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  if (content) el.textContent = content;
  return el;
};

/**
 * The header: the title (Title + Heading type), description and call to action (CTA link,
 * text and style); for lists made before, the authored heading and link.
 * @param {{ props: Object<string, Element>, legacy?: boolean, heading?: Element,
 *   legacyLink?: Element }} read
 * @param {{ base: string }} ids the id the title's id starts with
 * @returns {{ header: Element|null, heading: Element|null }}
 */
export function buildCardListHeader(read, ids) {
  const { props, legacy } = read;
  const header = element('div', 'list-header');
  let heading = legacy ? read.heading : buildHeading(props.title, props.titletype, '', 'h2');
  if (heading && !heading.textContent.trim()) heading = null;
  const titleSlot = element('div', 'list-title-slot');
  if (heading) {
    heading.id = heading.id || `${ids.base}-title`;
    heading.classList.add('list-title');
    titleSlot.append(heading);
  }
  const intro = props.description?.textContent.trim() ? element('div', 'list-description') : null;
  if (intro) {
    intro.append(...props.description.childNodes);
    titleSlot.append(intro);
  }
  if (titleSlot.children.length) header.append(titleSlot);

  const link = legacy ? read.legacyLink : props.link?.querySelector('a[href]');
  if (link) {
    const label = textOf(props.linktext);
    if (label) link.textContent = label;
    const type = legacy ? readButtonOptions(link).type : textOf(props.linktype).toLowerCase();
    decorateButton(link, { view: 'button', type: ['primary', 'secondary'].includes(type) ? type : 'tertiary' });
    link.dataset.cmpInteraction = 'cta';
    const ctaSlot = element('div', 'list-cta-slot');
    ctaSlot.append(link);
    header.append(ctaSlot);
  }
  return header.children.length ? { header, heading } : { header: null, heading };
}

/** the heading level of the card titles: one below the list's heading (h3 without one) */
export const cardHeadingLevel = (heading) => HEADINGS[Math.min(
  5,
  HEADINGS.indexOf(heading?.tagName.toLowerCase() || 'h2') + 1,
)];

/** a card's link: the card's destination, secure in a new tab, named by its label */
function cardLink(card, label, t) {
  const a = element('a', 'list-card-link', label);
  a.href = card.url;
  if (card.accessibilityLabel) a.setAttribute('aria-label', card.accessibilityLabel);
  if (card.openInNewTab) {
    setLinkTarget(a, true);
    announceNewTab(a, t('opensInNewTab', '(opens in a new tab)'));
  }
  if (card.external) a.dataset.external = 'true';
  a.dataset.cardId = card.id;
  a.dataset.cmpInteraction = 'card';
  if (card.analyticsLabel) a.dataset.analyticsLabel = card.analyticsLabel;
  return a;
}

const labelRow = (className, values) => {
  const items = values.filter(Boolean);
  if (!items.length) return null;
  const row = element('p', className);
  items.forEach((value) => row.append(typeof value === 'string' ? element('span', '', value) : value));
  return row;
};

const timeOf = (card) => {
  if (!card.date) return null;
  const time = element('time', '', card.date);
  if (card.dateISO) time.dateTime = card.dateISO;
  return time;
};

const readingTimeOf = (card, t) => (/^\d+$/.test(card.readingTime)
  ? t('minutesShort', '{n}m', { n: card.readingTime }) : card.readingTime);

/** the description: the card's rich text (Cards) or its text */
function descriptionOf(card, className) {
  if (card.body?.textContent.trim()) {
    const body = element('div', `${className} list-card-body`);
    // the rich text stays editable in place in Universal Editor
    moveInstrumentation(card.body, body);
    body.append(...card.body.childNodes);
    return body;
  }
  return card.description ? element('p', className, card.description) : null;
}

function mediaOf(card, config, breakpoints) {
  if (!config.showImage || !card.image) return null;
  const picture = card.picture
    ? card.picture.cloneNode(true)
    : buildImage({ src: card.image, alt: card.imageAlt }, breakpoints);
  if (!picture) return null;
  const img = picture.tagName === 'IMG' ? picture : picture.querySelector('img');
  if (img) {
    img.alt = card.imageAlt || '';
    img.loading = config.imageLoading;
    if (config.imageLoading === 'eager') img.fetchPriority = 'high';
  }
  const media = element('div', 'list-card-media');
  media.append(picture);
  return media;
}

/**
 * A card of a kind (image, panel, report, stat). Its one link covers the card: the call to
 * action when shown, else the title; a card without a destination isn't linked.
 */
export function renderCard(card, config, { t, level, kind }) {
  const article = element('article', `list-card list-card-${kind}`);
  const theme = card.theme || config.cardTheme;
  if (theme) article.classList.add(`theme-${theme}`);
  const readingTime = readingTimeOf(card, t);
  const tags = config.showTags ? card.tags.slice(0, MAX_CARD_TAGS) : [];
  const eyebrow = config.showEyebrow ? card.eyebrow : '';
  const linked = config.linkItems && !!card.url;

  // the call to action, when shown, is the card's one link; else the title is
  const defaultCta = { report: t('download', 'Download'), panel: t('explore', 'Explore') }[kind] || '';
  const ctaLabel = config.showCta ? card.ctaLabel || defaultCta : '';
  const ctaType = { report: 'secondary', stat: 'secondary' }[kind] || 'tertiary';
  const cta = linked && ctaLabel ? cardLink(card, ctaLabel, t) : null;
  if (cta) {
    if (!card.accessibilityLabel && card.title) cta.setAttribute('aria-label', `${ctaLabel}: ${card.title}`);
    decorateButton(cta, { view: 'button', type: ctaType });
  }
  // a card without a title (e.g. an image and a description) has no heading
  const title = card.title ? element(level, 'list-card-title') : null;
  if (title && linked && !cta) title.append(cardLink(card, card.title, t));
  else if (title) title.textContent = card.title;
  const description = config.showDescription ? descriptionOf(card, 'list-card-description') : null;
  const date = config.showDate ? timeOf(card) : null;

  let parts;
  if (kind === 'image') {
    parts = [
      mediaOf(card, config, IMAGE_BREAKPOINTS),
      labelRow('list-card-kicker', [eyebrow, ...tags, config.showTags ? readingTime : '']),
      title,
      description,
      labelRow('list-card-meta', [card.contentType, date]),
    ];
  } else if (kind === 'report') {
    parts = [
      labelRow('list-card-kicker', [card.contentType || eyebrow, date]),
      title,
      description,
    ];
  } else if (kind === 'stat') {
    const top = element('div', 'list-card-top');
    top.append(...[labelRow('list-card-kicker', [eyebrow]), title].filter(Boolean));
    const bottom = element('div', 'list-card-bottom');
    bottom.append(...[card.subtitle ? element('p', 'list-card-subtitle', card.subtitle) : null,
      description].filter(Boolean));
    parts = [top, bottom.children.length ? bottom : null];
  } else {
    parts = [
      theme === 'image' ? mediaOf(card, config, FEATURE_BREAKPOINTS) : null,
      labelRow('list-card-kicker', [eyebrow || tags[0]]),
      title,
      description,
    ];
  }
  if (cta) {
    const action = element('p', 'list-card-action');
    action.append(cta);
    parts.push(action);
  }
  article.append(...parts.filter(Boolean));
  if (card.analyticsLabel) article.dataset.analyticsLabel = card.analyticsLabel;
  return article;
}

/** a row of the list of links (Display as teaser off) */
export function renderRow(card, config, { t, level }) {
  const article = element('article', 'list-row');
  const linked = config.linkItems && !!card.url;
  const title = card.title ? element(level, 'list-row-title') : null;
  if (title && linked) title.append(cardLink(card, card.title, t));
  else if (title) title.textContent = card.title;
  article.append(...[
    labelRow('list-card-kicker', [config.showEyebrow ? card.eyebrow || card.contentType : '',
      config.showTags ? card.tags[0] : '']),
    title,
    config.showDescription ? descriptionOf(card, 'list-row-description') : null,
    config.showDate ? labelRow('list-card-meta', [timeOf(card)]) : null,
  ].filter(Boolean));
  if (linked && title) {
    const arrow = element('span', 'list-row-arrow');
    arrow.setAttribute('aria-hidden', 'true');
    article.append(arrow);
  }
  return article;
}

/** the feature card (First card as feature): the image behind tags, title and author */
export function renderFeature(card, config, { t, level, authors = new Map() }) {
  const article = element('article', 'list-feature');
  const content = element('div', 'list-feature-content');
  const author = authors.get(card.authorId);
  const readingTime = readingTimeOf(card, t);
  const title = card.title ? element(level, 'list-feature-title') : null;
  if (title && config.linkItems && card.url) title.append(cardLink(card, card.title, t));
  else if (title) title.textContent = card.title;
  content.append(...[
    labelRow('list-card-kicker', [...(config.showTags ? card.tags.slice(0, MAX_CARD_TAGS) : []),
      config.showTags ? readingTime : '']),
    title,
    author ? buildAuthorLockup({
      picture: buildImage(author.image ? { src: author.image, alt: '' } : null),
      name: element('p', 'list-author-name', author.name),
      designation: author.designation ? element('p', 'list-author-designation', author.designation) : null,
      prefix: 'list',
    }) : null,
  ].filter(Boolean));
  article.append(...[mediaOf(card, { ...config, showImage: true }, FEATURE_BREAKPOINTS), content]
    .filter(Boolean));
  return article;
}

/** the block classes and custom properties of the layout (grid or scroll per breakpoint) */
export function applyCardListLayout(block, config) {
  const rem = (px) => `${px / 16}rem`;
  block.classList.add('card-list');
  BREAKPOINTS.forEach((bp) => {
    const r = config.responsive[bp];
    const scroll = r.mode === 'horizontal-scroll';
    block.classList.add(`${bp}-${scroll ? 'scroll' : 'grid'}`);
    if (scroll && r.controls) block.classList.add(`${bp}-controls`);
    if (scroll && r.indicator) block.classList.add(`${bp}-indicator`);
    block.style.setProperty(`--list-columns-${bp}`, r.columns);
    block.style.setProperty(`--list-gap-${bp}`, rem(r.gap));
    block.style.setProperty(`--list-visible-${bp}`, r.visible);
    // no card width: the CSS sizes the cards by Items visible
    if (r.cardWidth) block.style.setProperty(`--list-card-width-${bp}`, rem(r.cardWidth));
  });
  const flags = {
    snap: config.snap,
    'hide-scrollbar': config.hideScrollbar,
    'no-swipe': !config.swipe,
    'edge-bleed': config.edge === 'bleed',
    'equal-height': config.equalHeight,
    stretch: config.stretch,
    'feature-first': config.featureFirst,
  };
  Object.entries(flags).forEach(([name, on]) => block.classList.toggle(name, !!on));
  block.classList.add(
    `snap-${config.snapAlign}`,
    config.displayAsTeaser ? 'teaser' : 'links',
    `style-${config.cardStyle}`,
    `ratio-${config.imageRatio}`,
    `panel-${config.panelHeight}`,
    ...(config.styleOptions || []),
  );
}

/**
 * Renders the cards (after the header): the feature card, the list of cards or rows in a
 * labelled region, previous / next and the scroll indicator, and starts the scroller.
 * @param {Element} block
 * @param {Object} options { config, cards, header, heading, id, t, authors, regionLabel }
 *   regionLabel: the name of the cards for screen readers without a title (default "List")
 */
export function renderCardList(block, {
  config, cards, header, heading, id, t, authors, regionLabel,
}) {
  const level = cardHeadingLevel(heading);
  const parts = [header];
  let listed = cards;
  if (config.displayAsTeaser && config.featureFirst && cards.length) {
    parts.push(renderFeature(cards[0], config, { t, level, authors }));
    listed = cards.slice(1);
  }

  const viewport = element('div', 'list-scroller');
  viewport.id = `${id}-items`;
  viewport.setAttribute('role', 'region');
  if (heading) viewport.setAttribute('aria-labelledby', heading.id);
  else viewport.setAttribute('aria-label', config.listLabel || regionLabel || t('list', 'List'));
  if (config.listLabel) viewport.setAttribute('aria-label', config.listLabel);
  const list = element('ul', 'list-items');
  const fragment = document.createDocumentFragment();
  listed.forEach((card, index) => {
    const li = element('li', 'list-item');
    li.dataset.cardId = card.id;
    li.dataset.cmpId = card.id;
    li.dataset.cmpPosition = String(index + 1);
    li.append(config.displayAsTeaser
      ? renderCard(card, config, { t, level, kind: kindOf(card, config.cardStyle) })
      : renderRow(card, config, { t, level }));
    if (card.ref) moveInstrumentation(card.ref, li);
    fragment.append(li);
  });
  list.append(fragment);
  viewport.append(list);
  if (listed.length) parts.push(viewport);

  // previous / next and the scroll indicator, shown where the breakpoint scrolls
  const nav = element('div', 'list-nav');
  const indicator = element('div', 'list-indicator');
  indicator.setAttribute('aria-hidden', 'true');
  indicator.append(element('span', 'list-indicator-thumb'));
  const controls = element('div', 'list-controls');
  const previous = createIconButton({ label: t('listPrevious', 'Previous items'), icon: 'chevron-left', className: 'list-previous' });
  const next = createIconButton({ label: t('listNext', 'Next items'), icon: 'chevron-right', className: 'list-next' });
  [previous, next].forEach((button) => button.setAttribute('aria-controls', viewport.id));
  controls.append(previous, next);
  nav.append(indicator, controls);
  if (listed.length) parts.push(nav);

  block.replaceChildren(...parts.filter(Boolean));
  createScroller(viewport, {
    list,
    previous,
    next,
    indicator,
    step: config.step,
    loop: config.loop,
    drag: config.drag,
    keyboard: config.keyboard,
    reducedMotion: config.reducedMotion,
    initialIndex: config.initialIndex,
  });
  previous.dataset.cmpInteraction = 'previous';
  next.dataset.cmpInteraction = 'next';
}

/** the empty state: the header and a message */
export function renderCardListEmpty(block, header, message) {
  block.replaceChildren(...[header, element('p', 'list-empty', message)].filter(Boolean));
}

/**
 * A unique component id: the authored Component ID (suffixed when taken), else the block's id
 * (its Anchor ID, Additional tab), else a generated one ({prefix}-1, ...).
 */
export function cardListId(config, block, prefix) {
  let id = config.componentId || block.id || uniqueId(prefix);
  if (config.componentId && document.getElementById(id) && document.getElementById(id) !== block) {
    id = `${id}-${uniqueId('dup').split('-').pop()}`;
  }
  return id;
}

/**
 * The data layer state of the list and its cards; clicks (cards, CTA, previous / next) are
 * pushed by the data layer decorator from the data-cmp-* attributes.
 * @param {Element} block
 * @param {{ id: string, type: string, title: string, cards: Object[], state?: Object }} options
 *   type: the component type, e.g. tcs-corp/components/list; state: more list properties
 */
export function trackCardList(block, {
  id, type, title, cards, state = {},
}) {
  block.dataset.analytics = 'custom';
  const components = {
    [id]: {
      '@type': type, parentId: trackPage(), 'dc:title': title || undefined, ...state,
    },
  };
  cards.forEach((card, i) => {
    components[card.id] = {
      '@type': `${type}/item`,
      parentId: id,
      'dc:title': card.analyticsLabel || card.title || card.description.slice(0, 100) || undefined,
      'xdm:linkURL': card.url || undefined,
      'xdm:position': i + 1,
      'repo:modifyDate': card.dateISO || undefined,
    };
  });
  pushComponents(components);
}
