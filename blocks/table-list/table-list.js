/* eslint-disable linebreak-style, eol-last -- Windows editor writes CRLF. */

const DEFAULTS = {
  variations: '',
  maxCards: 4,
  showTags: false,
  view: 'list',
  cardColor: 'white',
  display: 'title-description',
  viewAllTitle: 'View all',
  viewAllLink: '',
  motionType: 'none',
  listTitle: 'Our transformation solutions',
  reportCtaTitle: 'View Report',
};

const VALID_VARIATIONS = [
  '',
  'compact',
  'no-description',
  'dark',
  'featured-industry',
  'no-number',
  'description-first',
  'title-right',
];

const VALID_CARD_COLORS = ['white', 'blue', 'black', 'grey'];
const VALID_DISPLAYS = ['title-description', 'title', 'description'];
const VALID_MOTIONS = ['none', 'fade', 'slide', 'reveal'];

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
      view: value(3) || DEFAULTS.view,
      cardColor: value(4) || DEFAULTS.cardColor,
      display: value(5) || DEFAULTS.display,
      viewAllTitle: value(6) || DEFAULTS.viewAllTitle,
      viewAllLink: getFieldLink(configRows[7]?.children[0]),
      motionType: value(8) || DEFAULTS.motionType,
      listTitle: value(9) || DEFAULTS.listTitle,
      reportCtaTitle: value(10) || DEFAULTS.reportCtaTitle,
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
    view: ['list', 'table'].includes(properties.view)
      ? properties.view
      : DEFAULTS.view,
    cardColor: VALID_CARD_COLORS.includes(properties.cardColor)
      ? properties.cardColor
      : DEFAULTS.cardColor,
    display: VALID_DISPLAYS.includes(properties.display)
      ? properties.display
      : DEFAULTS.display,
    motionType: VALID_MOTIONS.includes(properties.motionType)
      ? properties.motionType
      : DEFAULTS.motionType,
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
    link.textContent = properties.viewAllTitle
      || getText(authoredLink)
      || DEFAULTS.viewAllTitle;

    explore.append(link);
    header.append(explore);
  }

  return header;
}

function createTags(cell1, cell2) {
  const tags = document.createElement('div');
  tags.className = 'table-list-tags';

  [getText(cell1), getText(cell2)].filter(Boolean).forEach((text) => {
    const tag = document.createElement('span');
    tag.className = 'table-list-tag';
    tag.textContent = text;
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

function applyDisplayMode(block, display) {
  block.classList.add(`display-${display}`);
}

function applyTableView(block, display) {
  block.classList.add('view-table');

  const cards = [...block.querySelectorAll('.table-list-card')];
  if (!cards.length) return;

  const table = document.createElement('table');
  table.className = 'table-list-table';

  const showTitle = display !== 'description';
  const showDescription = display !== 'title';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  ['Number']
    .concat(showTitle ? ['Title'] : [])
    .concat(showDescription ? ['Description'] : [])
    .concat([''])
    .forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.append(th);
    });

  thead.append(headerRow);

  const tbody = document.createElement('tbody');

  cards.forEach((card) => {
    const row = document.createElement('tr');

    const number = card.querySelector('.table-list-number');
    const title = card.querySelector('.table-list-title');
    const description = card.querySelector('.table-list-description');
    const link = card.querySelector('.table-list-link a');

    [
      number,
      ...(showTitle ? [title] : []),
      ...(showDescription ? [description] : []),
    ].forEach((source) => {
      const cell = document.createElement('td');
      cell.textContent = getText(source);
      row.append(cell);
    });

    const actionCell = document.createElement('td');

    if (link) {
      const actionLink = link.cloneNode(true);
      actionLink.className = 'table-list-table-link';
      actionLink.removeAttribute('aria-label');
      actionCell.append(actionLink);
    }

    row.append(actionCell);
    tbody.append(row);
  });

  table.append(thead, tbody);
  block.querySelector('.table-list-cards')?.replaceWith(table);
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
  applyDisplayMode(block, properties.display);

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
      descriptionGroup.append(createTags(cells[4], cells[5]));
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

  if (properties.view === 'table') {
    applyTableView(block, properties.display);
  }
}