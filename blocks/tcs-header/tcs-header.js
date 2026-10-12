import { createOptimizedPicture } from '../../scripts/aem.js';

function getProp(block, name, fallback = '') {
  const normalizeKey = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

  const propertyLabels = {
    headerVariant: 'Header Variant',
    tcsLogo: 'TCS Logo Image',
    tcsLogoLink: 'TCS Logo Target URL',
    tataLogo: 'Tata Logo Image',
    tataLogoLink: 'Tata Logo Target URL',
    tcsLogoAlt: 'TCS Logo Alt Text',
    tataLogoAlt: 'Tata Logo Alt Text',
  };

  const targetKey = normalizeKey(name);
  const targetLabelKey = normalizeKey(propertyLabels[name] || '');

  const getValue = (element) => {
    if (!element) return '';

    const image = element.matches('img') ? element : element.querySelector('picture img, img');
    if (image) return image.getAttribute('src') || image.src;

    const source = element.querySelector('source');
    if (source) return source.getAttribute('srcset')?.split(' ')[0] || '';

    const anchor = element.matches('a') ? element : element.querySelector('a');
    if (anchor) return anchor.getAttribute('href') || anchor.textContent.trim();

    if (element.dataset.auePropValue) return element.dataset.auePropValue;
    if (element.dataset.value) return element.dataset.value;

    return element.textContent.trim();
  };

  if (block.dataset[name] !== undefined) return block.dataset[name];
  if (block.dataset[name.toLowerCase()] !== undefined) return block.dataset[name.toLowerCase()];

  const attrElem = [...block.querySelectorAll('[data-aue-prop]')].find((element) => {
    const propVal = normalizeKey(element.dataset.aueProp);
    return propVal === targetKey || propVal === targetLabelKey;
  });
  if (attrElem) {
    const val = getValue(attrElem);
    if (val) return val;
  }

  const rows = [...block.children];
  for (let index = 0; index < rows.length; index += 1) {
    const cols = [...rows[index].children];
    if (cols.length >= 2) {
      const key = normalizeKey(cols[0].textContent.trim());
      if (key === targetKey || key === targetLabelKey) {
        const val = getValue(cols[1]);
        if (val) return val;
      }
    }
  }

  return fallback;
}

function normalizeVariant(value) {
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '-');
  return ['standard', 'compact', 'dark', 'centered'].includes(normalized) ? normalized : 'standard';
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
  };

  block.textContent = '';
  block.classList.remove('variant-standard', 'variant-compact', 'variant-dark', 'variant-centered');
  block.classList.add(`variant-${config.headerVariant}`);
  block.dataset.variant = config.headerVariant;
  block.dataset.navigationMotion = 'none';
  block.dataset.canvasMotion = 'none';

  const navWrapper = document.createElement('div');
  navWrapper.className = 'tcs-nav-wrapper';

  const navPlaceholder = document.createElement('div');
  navPlaceholder.className = 'tcs-nav-placeholder';

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
  block.append(navPlaceholder, navWrapper);
}
