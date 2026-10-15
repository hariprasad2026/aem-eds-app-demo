/**
 * Cards data: the authored Card items as the card model of the card list decorator (shared
 * with the List block), without the DOM structure (unit tested in test/cards). A card's content
 * is authored in the card itself (no page lookup): image, eyebrow, title, description, label,
 * tags, date, content type, reading time, link and call to action, style and colour.
 */
import {
  CARD_KINDS, CARD_THEMES, isExternal, isSafeUrl, isYes, text, toISODate,
} from '../../utils/card-list-config.js';
import { formatDate } from '../../utils/dates.js';

/**
 * The card of an authored item.
 * @param {Object} item the item's values ({ href, title, body, image, ... }; body: the
 *   description's element, rich text)
 * @param {Object} config normalizePresentation() of the block
 * @param {{ id: string, index: number, origin?: string }} context the block's component id,
 *   the item's position (0-based) and the page origin (external links)
 * @returns {Object|null} null for an item without content or with an unsafe link
 */
export function itemToCard(item, config, { id, index, origin = '' }) {
  const href = text(item.href);
  if (href && !isSafeUrl(href)) return null;
  const title = text(item.title);
  const hasBody = !!item.body?.textContent?.trim();
  if (!title && !hasBody && !item.image) return null;
  const dateISO = toISODate(item.date);
  const newTab = text(item.newTab);
  return {
    id: `${id}-item-${index + 1}`,
    sourceType: 'manual',
    sourcePath: href.startsWith('/') ? href : '',
    url: href,
    title,
    // the text of the rich text (the analytics title of a card without one)
    description: text(hasBody ? item.body.textContent : item.description).replace(/\s+/g, ' '),
    body: hasBody ? item.body : null,
    image: text(item.image),
    imageAlt: text(item.imageAlt),
    picture: item.picture || null,
    eyebrow: text(item.eyebrow),
    tagIds: item.tags || [],
    tags: [],
    dateISO,
    date: dateISO ? formatDate(dateISO, config.dateFormat).text : '',
    lastModified: 0,
    contentType: text(item.contentType),
    readingTime: text(item.readingTime),
    authorId: '',
    subtitle: text(item.subtitle),
    kind: CARD_KINDS.includes(text(item.kind).toLowerCase()) ? text(item.kind).toLowerCase() : '',
    theme: CARD_THEMES.includes(text(item.theme).toLowerCase()) ? text(item.theme).toLowerCase() : '',
    ctaLabel: text(item.ctaLabel),
    openInNewTab: newTab === '' ? config.openInNewTab : isYes(newTab),
    external: isExternal(href, origin),
    analyticsLabel: text(item.analyticsLabel),
    accessibilityLabel: text(item.accessibilityLabel),
    ref: item.ref || null,
  };
}

/**
 * The cards of the authored items, in the authored order (no sorting or deduplication: the
 * author chose them).
 * @param {Object[]} items
 * @param {Object} config
 * @param {{ id: string, origin?: string }} context
 */
export function buildManualCards(items, config, { id, origin = '' }) {
  return items.map((item, index) => itemToCard(item, config, { id, index, origin }))
    .filter(Boolean)
    // ids follow the shown cards (1, 2, ...)
    .map((card, i) => ({ ...card, id: `${id}-item-${i + 1}` }));
}
