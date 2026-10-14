/* eslint-disable linebreak-style, eol-last -- Windows editor writes CRLF. */

import { decorateBlock, loadBlock } from '../../scripts/aem.js';

const DEFAULTS = {
  variations: '',
  maxCards: 4,
  showTags: false,
  cardColor: 'white',
  motionType: 'none',
  listTitle: 'Table-list title here...',
};

const VALID_VARIATIONS = ['', 'dark', 'no-number', 'description-first', 'title-right'];
const VALID_CARD_COLORS = ['white', 'black'];
const VALID_MOTIONS = ['none', 'fade', 'slide', 'reveal'];
const CTA_SELECTOR = '.cta, .cta-header, .cta-card, .table-list-cta-header, .table-list-cta-card, [data-aue-model="cta"]';

function findAuthoredCTA(root) {
  if (!root) return null;
  return root.matches(CTA_SELECTOR) ? root : root.querySelector(CTA_SELECTOR);
}

function getText(element) {
  return element?.textContent?.trim() || '';
}

function isCardCTA(cta) {
  return Boolean(cta && (
    cta.matches('.cta-card, .table-list-cta-card, .cta.card')
    || ['cta-card', 'table-list-cta-card'].includes(cta.dataset.blockName)
    || cta.dataset.aueLabel?.toLowerCase() === 'cta card'
  ));
}

/** Read both the new fields and the old, pre-standalone-CTA field order. */
function readBlockConfig(block) {
  const configRows = [];
  const contentRows = [];

  [...block.children].forEach((row) => {
    const model = row.dataset.aueModel;
    if (row.children.length === 1 && !findAuthoredCTA(row)
      && model !== 'table-list-header' && model !== 'table-list-card') {
      configRows.push(row);
    } else {
      contentRows.push(row);
    }
  });

  // Published markup has no editor attributes: a one-cell header follows the config.
  const legacyConfig = configRows.length >= 8;
  const configLength = legacyConfig ? 14 : 6;
  contentRows.unshift(...configRows.splice(configLength));
  const value = (index) => getText(configRows[index]?.children[0]);
  const rawMaxCards = Number.parseInt(value(1), 10);

  return {
    properties: {
      variations: value(0) || DEFAULTS.variations,
      maxCards: Number.isNaN(rawMaxCards)
        ? DEFAULTS.maxCards : Math.min(Math.max(rawMaxCards, 1), 4),
      showTags: ['true', 'yes', '1'].includes(value(2).toLowerCase()),
      cardColor: value(3) || DEFAULTS.cardColor,
      motionType: value(legacyConfig ? 6 : 4) || DEFAULTS.motionType,
      listTitle: value(legacyConfig ? 7 : 5) || DEFAULTS.listTitle,
    },
    contentRows,
    hasVariationConfig: Boolean(configRows[0]),
  };
}

function normalizeProperties(properties) {
  return {
    ...properties,
    variations: VALID_VARIATIONS.includes(properties.variations)
      ? properties.variations : DEFAULTS.variations,
    cardColor: VALID_CARD_COLORS.includes(properties.cardColor)
      ? properties.cardColor : DEFAULTS.cardColor,
    motionType: VALID_MOTIONS.includes(properties.motionType)
      ? properties.motionType : DEFAULTS.motionType,
  };
}

function createHeader(properties, headerRow, authoredCTA) {
  const header = headerRow || document.createElement('div');
  header.className = 'table-list-header';
  const heading = document.createElement('h2');
  heading.className = 'table-list-heading';
  heading.textContent = properties.listTitle
    || getText(headerRow?.children[0]) || DEFAULTS.listTitle;
  header.replaceChildren(heading);

  if (authoredCTA) {
    const explore = document.createElement('div');
    explore.className = 'table-list-explore';
    explore.append(authoredCTA);
    header.append(explore);
  }

  return header;
}

function createTags(tagCell) {
  const tags = document.createElement('div');
  tags.className = 'table-list-tags';
  getText(tagCell).split(/[,\n]+/).map((tag) => tag.trim()).filter(Boolean)
    .forEach((tagText) => {
      const tag = document.createElement('span');
      tag.className = 'table-list-tag';
      tag.textContent = tagText;
      tags.append(tag);
    });
  return tags;
}

/** Load the standalone implementation without replacing the authored block node. */
async function loadAuthoredCTA(cta) {
  if (cta.dataset.blockStatus === 'loaded' && cta.dataset.blockName === 'cta') return;
  const classes = [...cta.classList].filter((name) => name !== 'cta');
  cta.className = ['cta', ...classes].join(' ');
  // Live authoring can initialize the alias before the parent is decorated.
  // Always load the standalone module, never a nonexistent cta-card module.
  if (cta.dataset.blockName !== 'cta') {
    delete cta.dataset.blockStatus;
    delete cta.dataset.blockName;
  }
  decorateBlock(cta);
  await loadBlock(cta);
}

export default async function decorate(block) {
  const { properties: rawProperties, contentRows, hasVariationConfig } = readBlockConfig(block);
  const properties = normalizeProperties(rawProperties);
  const existingVariation = VALID_VARIATIONS.find(
    (variation) => variation && block.classList.contains(variation),
  ) || '';
  const variation = hasVariationConfig ? properties.variations : existingVariation;

  // A direct CTA row must never be mistaken for card or header fields.
  const looseCTAs = contentRows.filter((row) => {
    if (['table-list-header', 'table-list-card'].includes(row.dataset.aueModel)) return false;
    const cta = findAuthoredCTA(row);
    return cta && (cta === row || (row.children.length === 1 && row.contains(cta)));
  });
  const rows = contentRows.filter((row) => !looseCTAs.includes(row));
  const headerRow = rows.find((row) => row.dataset.aueModel === 'table-list-header'
    || (row.dataset.aueModel !== 'table-list-card' && row.children.length < 3));
  // Tags are optional: cards with only number, title and description are still cards.
  const cardRows = rows.filter((row) => row !== headerRow && row.children.length >= 3);
  const headerCTA = findAuthoredCTA(headerRow)
    || looseCTAs.map(findAuthoredCTA).find((cta) => !isCardCTA(cta));
  const cardCTAs = new Map(cardRows.map((row) => [row, findAuthoredCTA(row)]));

  // List-level card CTAs follow their card; nesting inside the card is also supported.
  looseCTAs.forEach((row) => {
    const cta = findAuthoredCTA(row);
    if (!isCardCTA(cta)) return;
    const precedingCards = cardRows.filter(
      (card) => contentRows.indexOf(card) < contentRows.indexOf(row),
    );
    const target = precedingCards.reverse().find((card) => !cardCTAs.get(card))
      || cardRows.find((card) => !cardCTAs.get(card));
    if (target) cardCTAs.set(target, cta);
  });

  block.classList.remove(...VALID_VARIATIONS.filter(Boolean));
  block.classList.add('table-list');
  if (variation) block.classList.add(variation);
  block.classList.add(`card-${properties.cardColor}`, `motion-${properties.motionType}`);
  if (properties.showTags) block.classList.add('show-tags');

  const header = createHeader(properties, headerRow, headerCTA);
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'table-list-cards';

  cardRows.slice(0, properties.maxCards).forEach((row, index) => {
    // Some authoring responses append the nested CTA as a direct child of the item.
    const cells = [...row.children].filter((cell) => !cell.matches(CTA_SELECTOR));
    if (cells.length < 3) return;
    const [numberCell, titleCell, descriptionCell] = cells;
    const authoredCTA = cardCTAs.get(row);
    numberCell.className = 'table-list-number';
    if (!getText(numberCell)) {
      numberCell.textContent = String(index + 1).padStart(2, '0');
    }
    titleCell.className = 'table-list-title';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'table-list-title-group';
    titleGroup.append(titleCell);
    const descriptionGroup = document.createElement('div');
    descriptionGroup.className = 'table-list-description-group';
    if (properties.showTags && variation === 'title-right') {
      // Legacy cards had a page-reference cell before tags and six CTA preference cells.
      descriptionGroup.append(createTags(cells[cells.length >= 11 ? 4 : 3]));
    }
    descriptionCell.className = 'table-list-description';
    descriptionGroup.append(descriptionCell);
    const action = document.createElement('div');
    action.className = 'table-list-link';
    if (authoredCTA) action.append(authoredCTA);
    row.className = 'table-list-card';
    row.replaceChildren(numberCell, titleGroup, descriptionGroup, action);
    cardsContainer.append(row);
  });

  block.replaceChildren(header, cardsContainer);
  if (block.classList.contains('featured-industry')) {
    block.querySelector('.table-list-card')?.classList.add('table-list-card-featured');
  }
  await Promise.all([...block.querySelectorAll(CTA_SELECTOR)].map(loadAuthoredCTA));
}
