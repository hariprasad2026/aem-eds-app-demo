import {
  applyCardListLayout, buildCardListHeader, cardListId, renderCardList, renderCardListEmpty,
  trackCardList,
} from '../../decorators/card-list-decorator.js';
import {
  HEADINGS, PRESENTATION_PROPERTIES, normalizePresentation, pickValue,
} from '../../utils/card-list-config.js';
import { matchCells } from '../../utils/cells.js';
import { isEditing } from '../../utils/environment.js';
import { getPlaceholders } from '../../utils/placeholders.js';
import { normalizeKey, textOf } from '../../utils/properties.js';
import { readTagValues } from '../../utils/tags.js';
import { resolveTags } from '../../utils/taxonomy.js';
import { buildManualCards } from './cards-data.js';

/*
 * Cards (blocks/cards/_cards.json): manually authored cards, the authoring alternative to the
 * List block (which lists pages): each Card holds its own image, eyebrow, title, description,
 * label, tags, date, link and call to action. The presentation is the List's (TCS DS Figma List
 * variations: image, panel, report and statistic cards, a feature card or rows of links; grid
 * or horizontal scroll per breakpoint), from the shared card list decorator, with the same
 * block settings (models/_card-list.json). Cards made before (an image and a rich text cell
 * per card) still render: the text's heading is the title and a link on its own the call to
 * action.
 */

// Card cells in model order (image alt and link text are part of the image and link cells)
const CARD_FIELDS = ['image', 'eyebrow', 'title', 'text', 'subtitle', 'tags', 'date', 'contentLabel',
  'readingTime', 'link', 'ctaLabel', 'newTab', 'kind', 'theme', 'analyticsLabel', 'ariaLabel'];
const LINE = (cell) => !cell.querySelector('a[href], picture, img, h1, h2, h3, h4, h5, h6, ul, ol')
  && cell.querySelectorAll('p').length <= 1;
const CARD_MATCHERS = {
  image: (cell) => !!cell.querySelector('picture, img'),
  text: (cell) => !cell.querySelector('picture, img'),
  date: (cell) => /^\d{4}-\d{2}-\d{2}/.test(textOf(cell)),
  link: (cell) => !!cell.querySelector('a[href]'),
  newTab: (cell) => /^(true|false)$/i.test(textOf(cell)),
  kind: (cell) => /^(image|panel|report|stat)$/i.test(textOf(cell)),
  theme: (cell) => /^(dark|navy|brand|brand-light|grey|mid-grey|gradient|image)$/i.test(textOf(cell)),
};
['eyebrow', 'title', 'subtitle', 'tags', 'contentLabel', 'readingTime', 'ctaLabel', 'analyticsLabel',
  'ariaLabel'].forEach((field) => { CARD_MATCHERS[field] = LINE; });

const PROPERTIES = new Set(PRESENTATION_PROPERTIES);

/**
 * The title and call to action of a rich text written before cards had their own fields: the
 * first heading (or a bold first paragraph) is the title; a link alone in the last paragraph is
 * the call to action.
 */
function readLegacyText(body, values) {
  const first = body.firstElementChild;
  const bold = first?.matches('p') && first.children.length === 1
    && first.firstElementChild.matches('strong, b')
    && first.textContent.trim() === first.firstElementChild.textContent.trim() ? first : null;
  const heading = !values.title && (body.querySelector(HEADINGS.join(',')) || bold);
  if (heading) {
    values.title = heading.textContent.trim();
    heading.remove();
  }
  const last = body.lastElementChild;
  const a = last?.matches('p') && last.querySelector('a[href]');
  if (!values.href && a && last.textContent.trim() === a.textContent.trim()) {
    values.href = a.getAttribute('href');
    values.ctaLabel = values.ctaLabel || a.textContent.trim();
    last.remove();
  }
}

/** a card's values from its row: the model's cells, or an image and a rich text (before) */
function readCard(row) {
  const cells = [...row.children];
  let matched;
  if (cells.length <= 2) {
    // cards made before: an image and a rich text, or the rich text only
    matched = {
      image: cells.find((cell) => cell.querySelector('picture, img')),
      text: cells.find((cell) => !cell.querySelector('picture, img')),
    };
  } else {
    matched = matchCells(cells, CARD_FIELDS, CARD_MATCHERS);
  }
  const get = (field) => textOf(matched[field]);
  const img = matched.image?.querySelector('img');
  const a = matched.link?.querySelector('a[href]');
  const values = {
    href: a?.getAttribute('href') || '',
    title: get('title'),
    body: matched.text || null,
    image: img?.getAttribute('src') || '',
    imageAlt: img?.getAttribute('alt') || '',
    picture: matched.image?.querySelector('picture') || null,
    eyebrow: get('eyebrow'),
    subtitle: get('subtitle'),
    tags: readTagValues(matched.tags),
    date: get('date'),
    contentType: get('contentLabel'),
    readingTime: get('readingTime'),
    ctaLabel: get('ctaLabel'),
    newTab: get('newTab').toLowerCase(),
    kind: get('kind'),
    theme: get('theme'),
    analyticsLabel: get('analyticsLabel'),
    accessibilityLabel: get('ariaLabel'),
    ref: row,
  };
  if (values.body) readLegacyText(values.body, values);
  // as in the List: the link text is the title when the card has none
  const linkText = a?.textContent.trim();
  if (linkText && !values.title && linkText !== values.href) values.title = linkText;
  return values;
}

/** the block: property rows (key | value) and Card rows */
function readBlock(block) {
  const props = {};
  const items = [];
  [...block.children].forEach((row) => {
    const model = row.dataset.aueModel;
    const cells = [...row.children];
    const key = cells.length === 2 ? normalizeKey(cells[0].textContent) : '';
    if (model === 'card' || (!model && !PROPERTIES.has(key))) items.push(readCard(row));
    else if (key) [, props[key]] = cells;
  });
  const raw = Object.fromEntries(Object.entries(props).map(([key, cell]) => [key, textOf(cell)]));
  return { props, raw, items };
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  if (block.dataset.cardsDecorated) return;
  block.dataset.cardsDecorated = 'true';

  const { props, raw, items } = readBlock(block);
  const config = {
    ...normalizePresentation(raw, { idPrefix: 'cards' }),
    emptyBehavior: pickValue(raw.emptybehavior, ['hide', 'message'], 'hide'),
  };
  const t = await getPlaceholders();
  const id = cardListId(config, block, 'cards');
  const { header, heading } = buildCardListHeader({ props }, { base: id });
  block.id = id;
  config.componentId = id;

  const cards = buildManualCards(items, config, { id, origin: window.location.origin });
  const tagIds = [...new Set(cards.flatMap((card) => card.tagIds))];
  const labels = tagIds.length
    ? new Map((await resolveTags(tagIds)).map((tag) => [tag.id, tag.label])) : new Map();
  cards.forEach((card) => {
    card.tags = card.tagIds.map((tag) => labels.get(tag) || tag);
  });
  applyCardListLayout(block, config);
  block.classList.add('source-manual');

  if (!cards.length) {
    const editing = isEditing();
    if (config.emptyBehavior === 'hide' && !editing) {
      block.replaceChildren();
      block.hidden = true;
      block.parentElement?.setAttribute('hidden', '');
      return;
    }
    const message = editing
      ? t('cardsEditorHint', 'Add a Card to the block and give it a title, a description or an image.')
      : config.emptyMessage || t('listEmpty', 'There are no items to show.');
    renderCardListEmpty(block, header, message);
    return;
  }

  renderCardList(block, {
    config, cards, header, heading, id, t, regionLabel: t('cards', 'Cards'),
  });
  if (config.analytics) {
    trackCardList(block, {
      id,
      type: 'tcs-corp/components/cards',
      title: heading?.textContent.trim() || config.listLabel,
      cards,
      state: { 'xdm:variant': config.displayAsTeaser ? config.cardStyle : 'links' },
    });
  } else {
    block.dataset.analytics = 'off';
  }
}
