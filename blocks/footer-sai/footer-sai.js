import { moveInstrumentation } from '../../scripts/scripts.js';
import decorateCanvasSearchHero from '../canvas-search-hero/canvas-search-hero.js';

function getCells(row) {
  let cells = [...row.children];
  while (cells.length === 1 && cells[0].children.length > 1) {
    cells = [...cells[0].children];
  }
  return cells;
}

function getCellValue(cell) {
  return cell?.querySelector('a')?.getAttribute('href') || cell?.textContent?.trim() || '';
}

function getItemType(row) {
  const explicitType = row.dataset.aueComponent
    || [...row.classList].find((className) => (
      className.startsWith('footer-sai-') || className.startsWith('canvas-search-hero-')
    ));
  if (explicitType) return explicitType;

  const cells = getCells(row);
  const values = cells.map((cell) => cell.textContent.trim());
  if (row.querySelector('[data-aue-prop="heading"], [data-aue-prop="backgroundStyle"]')
    || cells.length >= 8) {
    return 'canvas-search-hero-settings';
  }
  if (row.querySelector('img')) {
    const combinedText = values.join(' ').toLowerCase();
    if (combinedText.includes('tata') && !combinedText.includes('tcs')) {
      return 'footer-sai-tata-logo';
    }
    return 'footer-sai-tcs-logo';
  }
  if (cells.length >= 5 && /^(true|false)$/i.test(values[1] || '')) return 'footer-sai-hero';
  if (values.some((value) => value.toLowerCase().includes('copyright')) || cells.length >= 3) {
    return 'footer-sai-legal-item';
  }
  if (cells.length === 2 && values[0]) return 'footer-sai-nav-item';
  return '';
}

function getThemeValueFromBlock(block) {
  const propNode = block.matches('[data-aue-prop="theme"]')
    ? block
    : block.querySelector('[data-aue-prop="theme"]');
  const propertyValue = propNode?.dataset?.value || propNode?.textContent?.trim() || '';
  const directValue = block.dataset.theme
    || block.getAttribute('data-theme')
    || block.dataset.backgroundColor
    || block.getAttribute('data-backgroundColor')
    || block.getAttribute('data-backgroundcolor')
    || propertyValue
    || [...block.classList].find((className) => className.startsWith('footer-sai-theme-'))?.replace('footer-sai-theme-', '')
    || '';

  return directValue
    .trim()
    .toLowerCase()
    .replace(/^footer-sai-theme-/, '')
    .replace(/\s+/g, '-');
}

function createLink(label, href) {
  if (!label) return null;
  const link = document.createElement('a');
  link.textContent = label;
  link.href = href || '#';
  return link;
}

function createSearch(block, mode, placeholder, action) {
  const form = document.createElement('form');
  form.className = `search-container search-${mode}`;
  form.dataset.searchMode = mode;
  form.action = action || '#';

  const hasTextInput = mode !== 'voice';
  const hasVoiceInput = mode !== 'text';
  let input;

  if (hasTextInput) {
    input = document.createElement('input');
    input.type = 'search';
    input.name = 'q';
    input.placeholder = placeholder || 'Ask TCS...';
    input.setAttribute('aria-label', input.placeholder);
    input.addEventListener('input', () => {
      form.dataset.query = input.value;
      block.dataset.searchQuery = input.value;
      block.dispatchEvent(new CustomEvent('footer-sai:querychange', {
        bubbles: true,
        detail: { query: input.value, mode },
      }));
    });
    form.appendChild(input);
  }

  if (hasVoiceInput) {
    const microphone = document.createElement('button');
    microphone.type = 'button';
    microphone.className = 'mic-icon';
    microphone.setAttribute('aria-label', 'Search by voice');
    microphone.title = 'Search by voice';
    microphone.addEventListener('click', () => {
      block.dispatchEvent(new CustomEvent('footer-sai:voice-request', {
        bubbles: true,
        detail: { query: input?.value || '', mode },
      }));
    });
    form.appendChild(microphone);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input?.value.trim() || '';
    form.dataset.query = query;
    block.dataset.searchQuery = query;
    block.dispatchEvent(new CustomEvent('footer-sai:search', {
      bubbles: true,
      detail: { query, mode },
    }));
  });

  return form;
}

export default function decorate(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'footer-sai-content';

  const themeOptions = ['soft-white', 'powder-blue', 'sage-green', 'blush-pink', 'lavender', 'warm-cream', 'dark'];
  let selectedTheme = '';
  const blockThemeValue = getThemeValueFromBlock(block);
  if (themeOptions.includes(blockThemeValue)) selectedTheme = blockThemeValue;

  const heroContainer = document.createElement('div');
  heroContainer.className = 'footer-sai-hero';
  const mainRowContainer = document.createElement('div');
  mainRowContainer.className = 'footer-sai-main-row';
  const logosContainer = document.createElement('div');
  logosContainer.className = 'footer-sai-logos';
  const navContainer = document.createElement('nav');
  navContainer.className = 'footer-sai-nav';
  navContainer.setAttribute('aria-label', 'Footer');
  const legalRowContainer = document.createElement('div');
  legalRowContainer.className = 'footer-sai-legal-row';
  const legalLinksContainer = document.createElement('nav');
  legalLinksContainer.className = 'footer-sai-legal-links';
  legalLinksContainer.setAttribute('aria-label', 'Legal');
  const canvasHeroRows = [];

  let copyrightTextElement = null;

  [...block.children].forEach((row) => {
    const itemType = getItemType(row);
    const cells = getCells(row);
    const values = cells.map(getCellValue);

    if (itemType === 'canvas-search-hero-settings') {
      canvasHeroRows.push(row);
    } else if (itemType === 'footer-sai-hero') {
      const heroItem = document.createElement('div');
      heroItem.className = 'footer-sai-hero-item';
      const heading = document.createElement('h2');
      heading.textContent = values[0] || '';
      if (heading.textContent) heroItem.appendChild(heading);

      if (values[1]?.toLowerCase() === 'true') {
        const mode = ['text', 'voice', 'text-and-voice'].includes(values[2]?.toLowerCase())
          ? values[2].toLowerCase()
          : 'text-and-voice';
        heroItem.appendChild(createSearch(block, mode, values[3], values[4]));
      }
      moveInstrumentation(row, heroItem);
      heroContainer.appendChild(heroItem);
    } else if (itemType === 'footer-sai-tcs-logo' || itemType === 'footer-sai-tata-logo') {
      const logoItem = document.createElement('div');
      logoItem.className = 'footer-sai-logo-item';
      const [imageCell] = cells;
      const [, logoAlt, logoHref] = values;
      const imageSource = getCellValue(imageCell);
      const image = imageCell?.querySelector('img')?.cloneNode(true)
        || (imageSource ? document.createElement('img') : null);

      const defaultUrl = itemType === 'footer-sai-tcs-logo'
        ? 'https://www.tcs.com'
        : 'https://www.tata.com';
      const targetUrl = logoHref || defaultUrl;

      if (image) {
        if (!image.getAttribute('src')) image.src = imageSource;
        image.alt = logoAlt || image.alt || (itemType === 'footer-sai-tcs-logo' ? 'TCS Logo' : 'Tata Logo');

        const link = document.createElement('a');
        link.href = targetUrl;
        if (targetUrl.startsWith('http')) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
        link.appendChild(image);
        logoItem.appendChild(link);
      }
      moveInstrumentation(row, logoItem);
      logosContainer.appendChild(logoItem);
    } else if (itemType === 'footer-sai-nav-item') {
      const navItem = document.createElement('div');
      navItem.className = 'footer-sai-nav-item';
      const link = createLink(values[0], values[1]);
      if (link) navItem.appendChild(link);
      moveInstrumentation(row, navItem);
      navContainer.appendChild(navItem);
    } else if (itemType === 'footer-sai-legal-item') {
      const [copyright] = values;
      const copyrightElement = copyright?.toLowerCase().includes('copyright')
        ? document.createElement('div')
        : null;
      if (copyrightElement) {
        copyrightElement.className = 'footer-sai-copyright';
        copyrightElement.textContent = copyright;
        copyrightTextElement = copyrightElement;
      }
      const link = createLink(values[1], values[2]);
      if (link) {
        moveInstrumentation(row, link);
        legalLinksContainer.appendChild(link);
      } else if (copyrightElement) {
        moveInstrumentation(row, copyrightElement);
      } else {
        const legalItem = document.createElement('span');
        legalItem.className = 'footer-sai-legal-item';
        moveInstrumentation(row, legalItem);
        legalLinksContainer.appendChild(legalItem);
      }
    }
  });

  mainRowContainer.append(logosContainer, navContainer);
  if (copyrightTextElement) legalRowContainer.appendChild(copyrightTextElement);
  legalRowContainer.appendChild(legalLinksContainer);
  const mainContentContainer = document.createElement('div');
  mainContentContainer.className = 'footer-sai-main-content';
  mainContentContainer.append(mainRowContainer, document.createElement('hr'), legalRowContainer);

  if (canvasHeroRows.length) {
    const canvasHeroBlock = document.createElement('div');
    canvasHeroBlock.className = 'canvas-search-hero';
    canvasHeroBlock.append(...canvasHeroRows);
    decorateCanvasSearchHero(canvasHeroBlock);
    heroContainer.classList.add('footer-sai-hero-canvas');
    heroContainer.replaceChildren(canvasHeroBlock);
  }

  [...block.classList]
    .filter((className) => className.startsWith('footer-sai-theme-'))
    .forEach((className) => block.classList.remove(className));
  block.classList.add('footer-sai-wrapper');
  if (selectedTheme) block.classList.add(`footer-sai-theme-${selectedTheme}`);
  wrapper.append(heroContainer, mainContentContainer);
  block.replaceChildren(wrapper);
}
