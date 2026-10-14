import { moveInstrumentation } from '../../scripts/scripts.js';

// Block-level config fields, in model order. In xwalk markup each of these renders as a
// single-cell row; every row after them is an authored option item (label | link).
const FIELD_ORDER = [
  'canvasTitle',
  'canvasDescription',
  'motionType',
  'maximumOptions',
];

function normalizeKey(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function extractValue(cell) {
  const link = cell?.querySelector('a');
  return link ? link.href || link.textContent.trim() : cell?.textContent.trim() || '';
}

/**
 * Splits block rows into config data and option rows. Config rows are either explicit
 * key/value rows (key cell matches a field name) or the first FIELD_ORDER.length positional
 * rows; all remaining rows are treated as option items.
 */
function extractData(block) {
  const data = {};
  const optionRows = [];
  let fieldIndex = 0;

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;

    const [keyCell, valueCell] = cells;
    const key = normalizeKey(keyCell.textContent);
    const explicitKey = FIELD_ORDER.find((field) => normalizeKey(field) === key);
    let fieldName;
    let fieldCell;

    if (explicitKey && valueCell) {
      fieldName = explicitKey;
      fieldCell = valueCell;
    } else if (fieldIndex < FIELD_ORDER.length) {
      fieldName = FIELD_ORDER[fieldIndex];
      fieldCell = keyCell;
      fieldIndex += 1;
    } else {
      optionRows.push(row);
      return;
    }

    data[fieldName] = extractValue(fieldCell);
    if (fieldName === 'canvasDescription') data.canvasDescriptionCell = fieldCell;
  });

  return { data, optionRows };
}

function extractOptions(optionRows) {
  return optionRows.map((row) => {
    const [labelCell, linkCell] = [...row.children];
    return {
      row,
      label: labelCell?.textContent.trim() || '',
      url: extractValue(linkCell),
    };
  }).filter((option) => option.label && option.url);
}

function normalizeMotionType(value) {
  const motion = String(value || 'none').trim().toLowerCase().replace(/\s+/g, '-');
  return ['none', 'fade', 'slide-up'].includes(motion) ? motion : 'none';
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : Math.max(parsed, 0);
}

function attachMotion(block) {
  if (block.dataset.motionType === 'none') return;
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      block.classList.add('is-motion-visible');
      observer.disconnect();
    }
  });
  observer.observe(block);
}

function render(block, data, optionRows) {
  const section = document.createElement('section');
  section.className = 'canvas-block-stage';

  const glowYellow = document.createElement('div');
  glowYellow.className = 'canvas-block-glow canvas-block-glow-yellow';
  const glowBlue = document.createElement('div');
  glowBlue.className = 'canvas-block-glow canvas-block-glow-blue';
  section.append(glowYellow, glowBlue);

  const content = document.createElement('div');
  content.className = 'canvas-block-content';

  if (data.canvasTitle) {
    const title = document.createElement('h2');
    title.className = 'canvas-block-title';
    title.textContent = data.canvasTitle;
    content.appendChild(title);
  }

  if (data.canvasDescription && data.canvasDescriptionCell) {
    const description = document.createElement('div');
    description.className = 'canvas-block-description';
    description.append(...data.canvasDescriptionCell.childNodes);
    content.appendChild(description);
  }

  const searchSlot = document.createElement('div');
  searchSlot.className = 'canvas-block-search-slot';
  content.appendChild(searchSlot);

  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'canvas-block-options';
  const maximumOptions = Math.min(5, positiveInteger(data.maximumOptions, 5));
  const options = extractOptions(optionRows).slice(0, maximumOptions);

  options.forEach((item, index) => {
    const link = document.createElement('a');
    link.className = 'canvas-block-option-pill';
    link.href = item.url;
    link.textContent = item.label;
    moveInstrumentation(item.row, link);

    const rowIndex = Math.floor(index / 3);
    let row = optionsContainer.children[rowIndex];
    if (!row) {
      row = document.createElement('div');
      row.className = 'canvas-block-options-row';
      optionsContainer.appendChild(row);
    }
    row.appendChild(link);
  });

  if (options.length) content.appendChild(optionsContainer);
  section.appendChild(content);
  block.appendChild(section);
  attachMotion(block);
}

export default function decorate(block) {
  const { data, optionRows } = extractData(block);
  block.replaceChildren();
  block.classList.add('canvas-block');
  block.dataset.motionType = normalizeMotionType(data.motionType);
  render(block, data, optionRows);
}
