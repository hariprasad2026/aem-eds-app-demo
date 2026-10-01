import { moveInstrumentation } from '../../scripts/scripts.js';

function getCells(row) {
  let cells = [...row.children];
  while (cells.length === 1 && cells[0].children.length > 1) {
    cells = [...cells[0].children];
  }
  return cells;
}

function getCellValue(cell) {
  const image = cell?.querySelector('img[src]');
  return image?.getAttribute('src')
    || cell?.querySelector('a[href]')?.getAttribute('href')
    || cell?.textContent?.trim()
    || '';
}

function getItemType(row, cells) {
  const explicitType = row.dataset.aueComponent
    || [...row.classList].find((className) => className.startsWith('canvas-search-hero-'));
  if (explicitType) return explicitType;
  if (row.querySelector('[data-aue-prop="heading"]') || cells.length >= 8) {
    return 'canvas-search-hero-settings';
  }
  if (cells.length === 2) return 'canvas-search-hero-cta';
  return '';
}

function getProperty(block, name, fallback = '') {
  const property = block.querySelector(`[data-aue-prop="${name}"]`);
  return property?.textContent?.trim() || fallback;
}

function createSearch(block, mode, placeholder, action) {
  const form = document.createElement('form');
  form.className = `canvas-search-hero-search search-${mode}`;
  form.action = action || window.location.pathname;
  form.method = 'get';

  let input;
  if (mode !== 'voice') {
    input = document.createElement('input');
    input.type = 'search';
    input.name = 'q';
    input.placeholder = placeholder || 'Ask TCS...';
    input.setAttribute('aria-label', input.placeholder);
    form.appendChild(input);
  }

  if (mode !== 'text') {
    const microphone = document.createElement('button');
    microphone.type = 'button';
    microphone.className = 'canvas-search-hero-mic';
    microphone.setAttribute('aria-label', 'Search by voice');
    microphone.title = 'Search by voice';
    microphone.addEventListener('click', () => {
      block.dispatchEvent(new CustomEvent('canvas-search-hero:voice-request', {
        bubbles: true,
        detail: { query: input?.value || '', mode },
      }));
    });
    form.appendChild(microphone);
  }

  form.addEventListener('submit', (event) => {
    block.dispatchEvent(new CustomEvent('canvas-search-hero:search', {
      bubbles: true,
      detail: { query: input?.value.trim() || '', mode },
    }));
    if (!action) event.preventDefault();
  });

  return form;
}

function createCta(label, href, row) {
  const isAuthoringItem = [...row.attributes]
    .some(({ name }) => name.startsWith('data-aue-'));
  if (!label && !isAuthoringItem) return null;
  const link = document.createElement('a');
  link.className = 'canvas-search-hero-cta';
  link.textContent = label || 'Add CTA label';
  link.href = href || '#';
  if (!label) link.classList.add('is-empty');
  return link;
}

export default function decorate(block) {
  const settings = {};
  let settingsRow;
  const ctas = [];

  [...block.children].forEach((row) => {
    const cells = getCells(row);
    const values = cells.map(getCellValue);
    const itemType = getItemType(row, cells);
    if (itemType === 'canvas-search-hero-settings') {
      settingsRow = row;
      [
        settings.heading,
        settings.description,
        settings.backgroundStyle,
        settings.backgroundImage,
        settings.headingFont,
        settings.enableSearch,
        settings.searchMode,
        settings.searchPlaceholder,
        settings.searchActionUrl,
      ] = values;
    } else if (itemType === 'canvas-search-hero-cta') {
      ctas.push({ label: values[0], href: values[1], row });
    }
  });

  Object.entries(settings).forEach(([name]) => {
    settings[name] = getProperty(block, name, settings[name] || '');
  });

  const theme = ['light', 'dark', 'image'].includes(settings.backgroundStyle)
    ? settings.backgroundStyle
    : 'light';
  const wrapper = document.createElement('section');
  wrapper.className = `canvas-search-hero-content theme-${theme}`;

  if (theme === 'image' && settings.backgroundImage) {
    const background = document.createElement('img');
    background.className = 'canvas-search-hero-background';
    background.src = settings.backgroundImage;
    background.alt = '';
    background.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(background);
  }

  const content = document.createElement('div');
  content.className = 'canvas-search-hero-inner';
  const settingsContent = document.createElement('div');
  settingsContent.className = 'canvas-search-hero-settings';
  if (settingsRow) moveInstrumentation(settingsRow, settingsContent);
  const heading = document.createElement('h1');
  heading.className = `canvas-search-hero-heading font-${settings.headingFont === 'roboto-condensed' ? 'roboto-condensed' : 'roboto'}`;
  heading.textContent = settings.heading || '';
  settingsContent.appendChild(heading);

  if (settings.description) {
    const description = document.createElement('p');
    description.className = 'canvas-search-hero-description';
    description.textContent = settings.description;
    settingsContent.appendChild(description);
  }

  const searchModes = ['text', 'voice', 'text-and-voice'];
  const searchMode = searchModes.includes(settings.searchMode) ? settings.searchMode : 'text-and-voice';
  if (settings.enableSearch?.toLowerCase() !== 'false') {
    settingsContent.appendChild(createSearch(
      block,
      searchMode,
      settings.searchPlaceholder,
      settings.searchActionUrl,
    ));
  }
  content.appendChild(settingsContent);

  const ctaList = document.createElement('div');
  ctaList.className = 'canvas-search-hero-ctas';
  ctas.forEach(({ label, href, row }) => {
    const cta = createCta(label, href, row);
    if (cta) {
      moveInstrumentation(row, cta);
      ctaList.appendChild(cta);
    }
  });
  if (ctaList.childElementCount) content.appendChild(ctaList);
  wrapper.appendChild(content);
  block.replaceChildren(wrapper);
}
