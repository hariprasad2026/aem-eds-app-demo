/* eslint-disable linebreak-style, eol-last -- Windows editor writes CRLF. */

const DEFAULTS = {
  variations: '',
  maxCards: 4,
  showTags: false,
  cardColor: 'white',
  viewAllTitle: 'View all',
  viewAllLink: '',
  motionType: 'none',
  listTitle: 'Our transformation solutions',
  ctaView: 'primary',
  ctaShape: 'pill',
  ctaBackgroundColor: '#111820',
  ctaTextColor: '#ffffff',
  ctaBorderColor: '#111820',
  ctaArrowDirection: 'right',
};

const VALID_VARIATIONS = [
  '',
  'dark',
  'no-number',
  'description-first',
  'title-right',
];

const VALID_CARD_COLORS = ['white', 'black'];
const VALID_MOTIONS = ['none', 'fade', 'slide', 'reveal'];
const VALID_CTA_VIEWS = ['primary', 'secondary', 'text'];
const VALID_CTA_SHAPES = ['rectangle', 'rounded', 'pill'];
const VALID_ARROW_DIRECTIONS = ['none', 'left', 'right'];

function getText(element) {
  return element?.textContent?.trim() || '';
}

function getFieldLink(element) {
  const link = element?.querySelector('a');
  return link?.getAttribute('href') || getText(element);
}

/**
 * Extract a page path from an authored page-reference cell.
 * The path is used as a destination, never as visible card text.
 *
 * @param {Element|null} cell Authored reference cell.
 * @returns {string} Page path or an empty string.
 */
function getPageReference(cell) {
  if (!cell) return '';

  const anchor = cell.querySelector('a[href]');
  const candidates = [
    anchor?.getAttribute('href'),
    cell.getAttribute('href'),
    getText(cell),
  ].filter(Boolean);

  const path = candidates.find((candidate) => {
    const value = candidate.trim();
    return value.startsWith('/content/')
      || value.startsWith('/content/dam/')
      || value.startsWith('https://')
      || value.startsWith('http://');
  });

  return path?.trim() || '';
}

function isValidDestination(destination) {
  if (!destination) return false;

  if (destination.startsWith('/content/')) return true;

  try {
    const url = new URL(destination, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function readBlockConfig(block) {
  const configRows = [];
  const contentRows = [];

  [...block.children].forEach((row) => {
    if (row.children.length === 1) {
      configRows.push(row);
    } else {
      contentRows.push(row);
    }
  });

  const value = (index) => getText(configRows[index]?.children[0]);

  const booleanValue = (rawValue, fallback) => {
    if (rawValue === '') return fallback;
    return ['true', 'yes', '1'].includes(rawValue.toLowerCase());
  };

  const rawMaxCards = Number.parseInt(value(1), 10);

  return {
    properties: {
      variations: value(0) || DEFAULTS.variations,
      maxCards: Number.isNaN(rawMaxCards)
        ? DEFAULTS.maxCards
        : Math.min(Math.max(rawMaxCards, 1), 4),
      showTags: booleanValue(value(2), DEFAULTS.showTags),
      cardColor: value(3) || DEFAULTS.cardColor,
      viewAllTitle: value(4) || DEFAULTS.viewAllTitle,
      viewAllLink: getFieldLink(configRows[5]?.children[0]),
      motionType: value(6) || DEFAULTS.motionType,
      listTitle: value(7) || DEFAULTS.listTitle,
      ctaView: value(9) || DEFAULTS.ctaView,
      ctaShape: value(10) || DEFAULTS.ctaShape,
      ctaBackgroundColor: value(11) || DEFAULTS.ctaBackgroundColor,
      ctaTextColor: value(12) || DEFAULTS.ctaTextColor,
      ctaBorderColor: value(13) || DEFAULTS.ctaBorderColor,
      ctaArrowDirection: value(14) || DEFAULTS.ctaArrowDirection,
    },
    contentRows,
    hasVariationConfig: Boolean(configRows[0]),
  };
}

function normalizeProperties(properties) {
  return {
    ...properties,
    variations: VALID_VARIATIONS.includes(properties.variations)
      ? properties.variations
      : DEFAULTS.variations,
    maxCards: Math.min(
      Math.max(Number(properties.maxCards) || DEFAULTS.maxCards, 1),
      4,
    ),
    cardColor: VALID_CARD_COLORS.includes(properties.cardColor)
      ? properties.cardColor
      : DEFAULTS.cardColor,
    motionType: VALID_MOTIONS.includes(properties.motionType)
      ? properties.motionType
      : DEFAULTS.motionType,
    ctaView: VALID_CTA_VIEWS.includes(properties.ctaView)
      ? properties.ctaView
      : DEFAULTS.ctaView,
    ctaShape: VALID_CTA_SHAPES.includes(properties.ctaShape)
      ? properties.ctaShape
      : DEFAULTS.ctaShape,
    ctaArrowDirection: VALID_ARROW_DIRECTIONS.includes(
      properties.ctaArrowDirection,
    )
      ? properties.ctaArrowDirection
      : DEFAULTS.ctaArrowDirection,
  };
}

function readHeader(row) {
  const cells = [...row.children];

  return {
    row,
    heading: getText(cells[0]),
    linkCell: cells[1] || null,
  };
}

function createHeader(properties, authoredHeader) {
  const header = document.createElement('div');
  header.className = 'table-list-header';

  const heading = document.createElement('h2');
  heading.className = 'table-list-heading';
  heading.textContent = properties.listTitle
    || authoredHeader?.heading
    || DEFAULTS.listTitle;

  header.append(heading);

  const authoredLink = authoredHeader?.linkCell?.querySelector('a');
  const href = properties.viewAllLink
    || authoredLink?.getAttribute('href')
    || '';

  if (isValidDestination(href)) {
    const explore = document.createElement('div');
    explore.className = 'table-list-explore';

    const link = document.createElement('a');
    link.href = href;
    link.className = [
      'table-list-cta',
      `cta-${properties.ctaView}`,
      `cta-shape-${properties.ctaShape}`,
    ].join(' ');

    link.textContent = properties.viewAllTitle
      || getText(authoredLink)
      || DEFAULTS.viewAllTitle;

    link.style.setProperty('--cta-text-color', properties.ctaTextColor);
    link.style.setProperty('--cta-border-color', properties.ctaBorderColor);

    if (properties.ctaView === 'primary') {
      link.style.setProperty(
        '--cta-background-color',
        properties.ctaBackgroundColor,
      );
    }

    explore.append(link);
    header.append(explore);
  }

  return header;
}

function createTags(tagCell) {
  const tags = document.createElement('div');
  tags.className = 'table-list-tags';

  const rawTags = getText(tagCell);

  const tagValues = rawTags
    .split(/[,\n]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  tagValues.forEach((tagText) => {
    const tag = document.createElement('span');
    tag.className = 'table-list-tag';
    tag.textContent = tagText;
    tags.append(tag);
  });

  return tags;
}

/**
 * Build the arrow-only card action.
 *
 * @param {Element} cell Authored page-reference cell.
 * @param {string} title Card title for accessibility.
 * @returns {HTMLElement} Arrow action wrapper.
 */
function createCardAction(cell, title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'table-list-link';

  const destination = getPageReference(cell);
  const hasDestination = isValidDestination(destination);

  const action = document.createElement(hasDestination ? 'a' : 'span');
  action.className = 'table-list-arrow';

  if (hasDestination) {
    action.href = destination;
    action.setAttribute('aria-label', `Explore ${title || 'card'}`);
  } else {
    action.setAttribute('aria-hidden', 'true');
  }

  wrapper.append(action);
  action.textContent = '→';
  return wrapper;
}

function applyFeaturedIndustry(block) {
  if (!block.classList.contains('featured-industry')) return;

  block.querySelector('.table-list-card')?.classList.add(
    'table-list-card-featured',
  );
}

export default function decorate(block) {
  const { properties: rawProperties, contentRows, hasVariationConfig } = readBlockConfig(block);
  const properties = normalizeProperties(rawProperties);

  const existingVariation = VALID_VARIATIONS.find(
    (variation) => variation && block.classList.contains(variation),
  ) || '';

  const variation = hasVariationConfig ? properties.variations : existingVariation;

  const headerRow = contentRows.find((row) => row.children.length === 2);
  const authoredHeader = headerRow ? readHeader(headerRow) : null;

  const cardRows = contentRows.filter(
    (row) => row.children.length >= 4 && row !== headerRow,
  );

  block.classList.remove(...VALID_VARIATIONS.filter(Boolean));

  block.classList.add('table-list');

  if (variation) block.classList.add(variation);

  block.classList.add(`card-${properties.cardColor}`);
  block.classList.add(`motion-${properties.motionType}`);

  if (properties.showTags) block.classList.add('show-tags');

  block.replaceChildren();
  block.append(createHeader(properties, authoredHeader));

  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'table-list-cards';

  cardRows.slice(0, properties.maxCards).forEach((row, index) => {
    const cells = [...row.children];

    const numberCell = cells[0];
    const titleCell = cells[1];
    const descriptionCell = cells[2];
    const pageReferenceCell = cells[3];

    numberCell.className = 'table-list-number';

    if (!getText(numberCell)) {
      numberCell.textContent = String(index + 1).padStart(2, '0');
    }

    titleCell.className = 'table-list-title';

    const titleText = getText(titleCell);

    const titleGroup = document.createElement('div');
    titleGroup.className = 'table-list-title-group';
    titleGroup.append(titleCell);

    const descriptionGroup = document.createElement('div');
    descriptionGroup.className = 'table-list-description-group';

    if (properties.showTags && variation === 'title-right') {
      descriptionGroup.append(createTags(cells[4]));
    }

    descriptionCell.className = 'table-list-description';
    descriptionGroup.append(descriptionCell);

    const action = createCardAction(pageReferenceCell, titleText);

    row.className = 'table-list-card';
    row.replaceChildren(numberCell, titleGroup, descriptionGroup, action);

    cardsContainer.append(row);
  });

  block.append(cardsContainer);

  applyFeaturedIndustry(block);
}