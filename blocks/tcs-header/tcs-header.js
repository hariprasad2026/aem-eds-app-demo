import { createOptimizedPicture } from '../../scripts/aem.js';

function getProp(block, name, fallback = '') {
  const lower = name.toLowerCase();
  const fieldOrder = [
    'headerVariant',
    'tcsLogo',
    'tcsLogoLink',
    'tataLogo',
    'tataLogoLink',
    'tcsLogoAlt',
    'tataLogoAlt',
    'navigationMotion',
    'navRootPath',
    'navDepth',
    'canvasPlaceholder',
    'showCanvasSearchIcon',
    'canvasActionUrl',
    'canvasNavRootPath',
    'canvasNavDepth',
    'canvasMotion',
  ];

  const getValue = (element) => {
    if (!element) return '';
    const image = element.matches('img') ? element : element.querySelector('picture img, img');
    if (image) return image.getAttribute('src') || image.src;
    const anchor = element.matches('a') ? element : element.querySelector('a');
    if (anchor) return anchor.getAttribute('href') || anchor.textContent.trim();
    return element.dataset.value || element.textContent.trim();
  };

  if (block.dataset[name] !== undefined) return block.dataset[name];
  if (block.dataset[lower] !== undefined) return block.dataset[lower];
  const attrElem = block.querySelector(`[data-aue-prop="${name}"], [data-aue-prop="${lower}"]`);
  if (attrElem) return getValue(attrElem);

  const rows = [...block.children];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const cols = [...row.children];
    if (cols.length >= 2) {
      const key = cols[0].textContent.trim().toLowerCase().replace(/[-_]/g, '');
      if (key === lower.replace(/[-_]/g, '')) {
        return getValue(cols[1]);
      }
    }
  }

  const fieldIndex = fieldOrder.indexOf(name);
  if (fieldIndex >= 0 && rows[fieldIndex]) {
    const cols = [...rows[fieldIndex].children];
    return getValue(cols.length > 1 ? cols[1] : rows[fieldIndex]) || fallback;
  }

  return fallback;
}

function normalizeVariant(value) {
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '-');
  return ['standard', 'compact', 'dark', 'centered'].includes(normalized) ? normalized : 'standard';
}

function normalizeMotionType(value, fallback = 'slide') {
  const normalized = String(value || fallback).trim().toLowerCase();
  return ['none', 'slide', 'fade'].includes(normalized) ? normalized : fallback;
}

function normalizeRootPath(value) {
  const candidate = String(value || '/').trim();
  if (!candidate || candidate === '/') return '/';
  const normalized = candidate.startsWith('/') ? candidate : `/${candidate}`;
  return normalized.replace(/\/+$/, '') || '/';
}

function normalizeDepth(value, fallback = 3, min = 1, max = 3) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export default async function decorate(block) {
  const config = {
    headerVariant: normalizeVariant(getProp(block, 'headerVariant', 'standard')),
    tcsLogo: getProp(block, 'tcsLogo'),
    tcsLogoLink: getProp(block, 'tcsLogoLink', '/'),
    tataLogo: getProp(block, 'tataLogo'),
    tataLogoLink: getProp(block, 'tataLogoLink', 'https://www.tata.com'),
    tcsLogoAlt: getProp(block, 'tcsLogoAlt', 'Tata Consultancy Services'),
    tataLogoAlt: getProp(block, 'tataLogoAlt', 'TATA Group'),
    navigationMotion: normalizeMotionType(getProp(block, 'navigationMotion', 'slide')),
    navRootPath: normalizeRootPath(getProp(block, 'navRootPath', '/')),
    navDepth: normalizeDepth(getProp(block, 'navDepth', 3), 3, 1, 3),
    canvasPlaceholder: getProp(block, 'canvasPlaceholder', 'Ask us a question'),
    showCanvasSearchIcon: String(getProp(block, 'showCanvasSearchIcon', 'true')).toLowerCase() !== 'false',
    canvasActionUrl: getProp(block, 'canvasActionUrl', '/search'),
    canvasNavRootPath: normalizeRootPath(getProp(block, 'canvasNavRootPath', '/')),
    canvasNavDepth: normalizeDepth(getProp(block, 'canvasNavDepth', 3), 3, 1, 3),
    canvasMotion: normalizeMotionType(getProp(block, 'canvasMotion', 'slide')),
  };

  block.textContent = '';
  block.classList.remove('variant-standard', 'variant-compact', 'variant-dark', 'variant-centered');
  block.classList.add(`variant-${config.headerVariant}`);
  block.dataset.variant = config.headerVariant;
  block.dataset.navigationMotion = config.navigationMotion;
  block.dataset.canvasMotion = config.canvasMotion;

  const navWrapper = document.createElement('div');
  navWrapper.className = 'tcs-nav-wrapper';

  const nav = document.createElement('nav');
  nav.id = 'tcs-nav';

  const brandPrimary = document.createElement('div');
  brandPrimary.className = 'nav-brand-primary';
  const primaryAnchor = document.createElement('a');
  primaryAnchor.href = config.tcsLogoLink;

  if (config.tcsLogo) {
    primaryAnchor.append(createOptimizedPicture(config.tcsLogo, config.tcsLogoAlt || 'TCS', false, [{ width: '300' }]));
  } else {
    primaryAnchor.textContent = 'TCS';
  }
  brandPrimary.append(primaryAnchor);

  const brandSecondary = document.createElement('div');
  brandSecondary.className = 'nav-brand-secondary';
  const secondaryAnchor = document.createElement('a');
  secondaryAnchor.href = config.tataLogoLink;
  secondaryAnchor.target = '_blank';
  secondaryAnchor.rel = 'noopener noreferrer';

  if (config.tataLogo) {
    secondaryAnchor.append(createOptimizedPicture(config.tataLogo, config.tataLogoAlt || 'TATA', false, [{ width: '160' }]));
  } else {
    secondaryAnchor.textContent = 'TATA';
  }
  brandSecondary.append(secondaryAnchor);

  nav.append(brandPrimary, brandSecondary);
  navWrapper.append(nav);
  block.append(navWrapper);
}
