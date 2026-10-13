const FIELD_ORDER = [
  'canvasTitle',
  'canvasDescription',
  'motionType',
  'maximumOptions',
  'optionsType',
];

function normalizeKey(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function extractValue(cell) {
  const link = cell?.querySelector('a');
  return link ? link.href || link.textContent.trim() : cell?.textContent.trim() || '';
}

function extractData(block) {
  const data = {};
  let fieldIndex = 0;

  [...block.children].forEach((row) => {
    if (row.classList.contains('canvas-block-option')) return;
    const cells = [...row.children];
    if (!cells.length) return;

    const key = normalizeKey(cells[0].textContent);
    const fieldName = FIELD_ORDER.find((field) => normalizeKey(field) === key);
    if (fieldName && cells.length > 1) {
      data[fieldName] = extractValue(cells[1]);
      return;
    }

    const fallbackField = FIELD_ORDER[fieldIndex];
    fieldIndex += 1;
    if (fallbackField) data[fallbackField] = extractValue(cells[0]);
  });

  return data;
}

function extractOptions(optionRows) {
  return optionRows.map((option) => {
    const fields = {};
    [...option.children].forEach((row) => {
      const cells = [...row.children];
      if (cells.length < 2) return;
      const key = normalizeKey(cells[0].textContent);
      if (['optionlabel', 'label', 'title'].includes(key)) {
        fields.label = cells[1].textContent.trim();
      } else if (['optionlink', 'link', 'url', 'href'].includes(key)) {
        fields.url = extractValue(cells[1]);
      }
    });

    if (!fields.label || !fields.url) {
      const cells = [...option.children];
      if (!fields.label && cells[0]) fields.label = cells[0].textContent.trim();
      if (!fields.url && cells[1]) fields.url = extractValue(cells[1]);
    }

    return fields;
  }).filter((option) => option.label);
}

function normalizeMotionType(value) {
  const motion = String(value || 'none').trim().toLowerCase().replace(/\s+/g, '-');
  return ['none', 'fade', 'slide-up'].includes(motion) ? motion : 'none';
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : Math.max(parsed, 0);
}

async function fetchDefaultOptions(maximumOptions) {
  try {
    const response = await fetch('/blocks/canvas-block/dummy.json');
    if (!response.ok) return [];
    const data = await response.json();
    return (data.options || []).slice(0, maximumOptions);
  } catch (error) {
    return [];
  }
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

async function render(block, data, authoredOptions) {
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

  if (data.canvasDescription) {
    const description = document.createElement('div');
    description.className = 'canvas-block-description';
    description.innerHTML = data.canvasDescription;
    content.appendChild(description);
  }

  const searchSlot = document.createElement('div');
  searchSlot.className = 'canvas-block-search-slot';
  content.appendChild(searchSlot);

  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'canvas-block-options';
  const maximumOptions = Math.min(5, positiveInteger(data.maximumOptions, 5));
  const options = extractOptions(authoredOptions);
  const configuredOptions = options.length
    ? options.slice(0, maximumOptions)
    : await fetchDefaultOptions(maximumOptions);

  configuredOptions.forEach((item, index) => {
    const link = document.createElement('a');
    link.className = 'canvas-block-option-pill';
    link.href = item.url || '#';
    link.textContent = item.label || '';

    const rowIndex = Math.floor(index / 3);
    let row = optionsContainer.children[rowIndex];
    if (!row) {
      row = document.createElement('div');
      row.className = 'canvas-block-options-row';
      optionsContainer.appendChild(row);
    }
    row.appendChild(link);
  });

  content.appendChild(optionsContainer);
  section.appendChild(content);
  block.appendChild(section);
  attachMotion(block);
}

export default function decorate(block) {
  const data = extractData(block);
  const optionRows = [...block.querySelectorAll('.canvas-block-option')];
  block.innerHTML = '';
  block.classList.add('canvas-block');
  block.dataset.motionType = normalizeMotionType(data.motionType);
  render(block, data, optionRows);
}
