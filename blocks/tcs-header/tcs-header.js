import { createOptimizedPicture } from '../../scripts/aem.js';

function formatHtmlPath(path) {
  if (!path || path === '/') return path || '#';
  let resolvedPath = path;
  if (!resolvedPath.startsWith('/content/')) {
    resolvedPath = `/content/2026/39/briskdeer43959${
      resolvedPath.startsWith('/') ? '' : '/'
    }${resolvedPath}`;
  }
  return resolvedPath.endsWith('.html') ? resolvedPath : `${resolvedPath}.html`;
}

/**
* Helper to safely extract image elements or URLs identically for both logos
*/
function getLogoElement(block, propName, fallbackAlt) {
  const elem = block.querySelector(`[data-aue-prop="${propName}"]`);
  // 1. If an actual <picture> or <img> tag exists inside the block row (identical to tcsLogo)
  if (elem) {
    const pic = elem.querySelector('picture');
    if (pic) return pic.cloneNode(true);
    const img = elem.querySelector('img') || (elem.matches('img') ? elem : null);
    if (img && img.src && !img.src.includes('.html')) {
      return createOptimizedPicture(img.src, img.alt || fallbackAlt, false, [{ width: '160' }]);
    }
  }

  // 2. Scan block children rows directly
  const rows = [...block.children];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const text = row.textContent.toLowerCase();
    if (text.includes(propName.toLowerCase())) {
      const pic = row.querySelector('picture');
      if (pic) return pic.cloneNode(true);
      const img = row.querySelector('img');
      if (img && img.src) {
        return createOptimizedPicture(img.src, img.alt || fallbackAlt, false, [{ width: '160' }]);
      }
    }
  }

  return null;
}

function getProp(block, name, fallback = '') {
  const lower = name.toLowerCase();
  const fieldOrder = [
    'headerVariant',
    'tcsLogo',
    'tcsLogoAlt',
    'tcsLogoLink',
    'tataLogo',
    'tataLogoAlt',
    'tataLogoLink',
    'searchVariation',
    'searchPlaceholder',
    'motionType',
  ];

  const getValue = (element) => {
    if (!element) return '';
    const anchor = element.matches('a') ? element : element.querySelector('a');
    if (anchor && !anchor.querySelector('img')) return anchor.getAttribute('href') || anchor.textContent.trim();
    const input = element.matches('input, textarea, select')
      ? element
      : element.querySelector('input, textarea, select');
    return input?.value || element.dataset.value || element.getAttribute('value') || element.textContent.trim();
  };

  if (block.dataset[name] !== undefined && block.dataset[name] !== '') return block.dataset[name];
  if (block.dataset[lower] !== undefined && block.dataset[lower] !== '') return block.dataset[lower];

  const attrElem = block.querySelector(`[data-aue-prop="${name}"], [data-aue-prop="${lower}"]`);
  if (attrElem) {
    const val = getValue(attrElem);
    if (val) return val;
  }

  const rows = [...block.children];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const cols = [...row.children];
    if (cols.length >= 2) {
      const key = cols[0].textContent.trim().toLowerCase().replace(/[-_]/g, '');
      if (key === lower.replace(/[-_]/g, '')) {
        const val = getValue(cols[1]);
        if (val) return val;
      }
    }
  }

  const fieldIndex = fieldOrder.indexOf(name);
  if (fieldIndex >= 0 && rows[fieldIndex]) {
    const cols = [...rows[fieldIndex].children];
    const val = getValue(cols.length > 1 ? cols[1] : rows[fieldIndex]);
    if (val) return val;
  }

  return fallback;
}

async function fetchHierarchicalNavData() {
  try {
    const response = await fetch('/query-index.json');
    if (!response.ok) return [];
    const json = await response.json();
    const data = json.data || json;

    if (!Array.isArray(data)) return [];

    const navTree = {};
    const excludedPages = [
      'footer', 'header', 'tcs-footer', 'tcs-header', 'blocks',
      'home', 'home-page', 'homepage', 'demo', 'nav', 'iconlist', 'qa', 'test',
    ];

    data.forEach((item) => {
      const rawPath = item?.path || '';
      if (!rawPath) return;

      const segments = rawPath.split('/').filter(Boolean);
      let locale = '';
      if (segments[0] && segments[0].length === 2) {
        locale = segments.shift();
      }

      if (segments.length === 0) return;

      const lastSegment = segments[segments.length - 1].toLowerCase().replace(/\s+/g, '-');
      if (excludedPages.includes(lastSegment)) return;

      const l1Key = segments[0];
      if (excludedPages.includes(l1Key.toLowerCase())) return;

      if (!navTree[l1Key]) {
        navTree[l1Key] = {
          key: l1Key,
          title: item.title && segments.length === 1 ? item.title : l1Key.replace(/-/g, ' '),
          path: formatHtmlPath(`/${locale ? `${locale}/` : ''}${l1Key}`),
          children: {},
        };
      }

      if (segments.length >= 2) {
        const l2Key = segments[1];
        if (excludedPages.includes(l2Key.toLowerCase())) return;

        if (!navTree[l1Key].children[l2Key]) {
          navTree[l1Key].children[l2Key] = {
            key: l2Key,
            title: item.title && segments.length === 2 ? item.title : l2Key.replace(/-/g, ' '),
            path: formatHtmlPath(`/${locale ? `${locale}/` : ''}${l1Key}/${l2Key}`),
            children: [],
          };
        }

        if (segments.length >= 3) {
          const l3Key = segments[2];
          if (excludedPages.includes(l3Key.toLowerCase())) return;

          navTree[l1Key].children[l2Key].children.push({
            key: l3Key,
            title: item.title || l3Key.replace(/-/g, ' '),
            path: formatHtmlPath(`/${locale ? `${locale}/` : ''}${l1Key}/${l2Key}/${l3Key}`),
          });
        }
      }
    });

    return Object.values(navTree).map((l1) => ({
      ...l1,
      children: Object.values(l1.children).map((l2) => ({
        ...l2,
        children: l2.children || [],
      })),
    }));
  } catch (error) {
    console.error('Failed to load navigation index:', error);
    return [];
  }
}

export default function decorate(block) {
  // Extract Logo Elements Directly from DOM before clearing block content
  const tcsPicture = getLogoElement(block, 'tcsLogo', 'Tata Consultancy Services');
  const tataPicture = getLogoElement(block, 'tataLogo', 'TATA Group');

  const config = {
    headerVariant: getProp(block, 'headerVariant', 'standard'),
    tcsLogoAlt: getProp(block, 'tcsLogoAlt', 'Tata Consultancy Services'),
    tcsLogoLink: getProp(block, 'tcsLogoLink', '/'),
    tataLogoAlt: getProp(block, 'tataLogoAlt', 'TATA Group'),
    tataLogoLink: getProp(block, 'tataLogoLink', 'https://www.tata.com'),
  };

  block.textContent = '';
  block.classList.add(`variant-${config.headerVariant}`);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'tcs-nav-wrapper';

  const nav = document.createElement('nav');
  nav.id = 'tcs-nav';

  // 1. TCS Logo (Rendered using direct picture clone or text fallback)
  const brandPrimary = document.createElement('div');
  brandPrimary.className = 'nav-brand-primary';
  const primaryAnchor = document.createElement('a');
  primaryAnchor.href = config.tcsLogoLink;
  if (tcsPicture) {
    primaryAnchor.append(tcsPicture);
  } else {
    primaryAnchor.textContent = 'TCS';
  }
  brandPrimary.append(primaryAnchor);

  // 2. TATA Logo (Rendered using identical picture clone logic as TCS logo)
  const brandSecondary = document.createElement('div');
  brandSecondary.className = 'nav-brand-secondary';
  const secondaryAnchor = document.createElement('a');
  secondaryAnchor.href = config.tataLogoLink;
  secondaryAnchor.target = '_blank';
  secondaryAnchor.rel = 'noopener noreferrer';

  if (tataPicture) {
    secondaryAnchor.append(tataPicture);
  } else {
    secondaryAnchor.textContent = 'TATA';
  }
  brandSecondary.append(secondaryAnchor);

  // Header Hamburger Trigger
  const headerHamburgerWrapper = document.createElement('div');
  headerHamburgerWrapper.className = 'nav-hamburger';
  const headerHamburgerBtn = document.createElement('button');
  headerHamburgerBtn.className = 'tcs-header-hamburger';
  headerHamburgerBtn.setAttribute('aria-label', 'Open navigation menu');
  headerHamburgerBtn.innerHTML = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
<line x1="3" y1="6" x2="21" y2="6"></line>
<line x1="3" y1="12" x2="21" y2="12"></line>
<line x1="3" y1="18" x2="21" y2="18"></line>
</svg>
  `;
  headerHamburgerWrapper.append(headerHamburgerBtn);

  nav.append(brandPrimary, brandSecondary, headerHamburgerWrapper);
  navWrapper.append(nav);
  block.append(navWrapper);

  // Mobile/Tablet Fullscreen Overlay
  const overlay = document.createElement('div');
  overlay.className = 'tcs-mobile-nav-overlay hidden';

  overlay.innerHTML = `
<div class="tcs-mobile-nav-header">
<div class="tcs-mobile-logos"></div>
<button class="tcs-mobile-close-btn" aria-label="Close menu">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
<line x1="18" y1="6" x2="6" y2="18"></line>
<line x1="6" y1="6" x2="18" y2="18"></line>
</svg>
</button>
</div>
<div class="tcs-mobile-nav-body">
<div class="tcs-mobile-title-row">
<button class="tcs-mobile-back-btn hidden" aria-label="Go back">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
<line x1="19" y1="12" x2="5" y2="12"></line>
<polyline points="12 19 5 12 12 5"></polyline>
</svg>
</button>
<h2 class="tcs-mobile-title">Menu</h2>
</div>
<div class="tcs-mobile-list-container">
<ul class="tcs-mobile-list"></ul>
</div>
</div>
  `;

  document.body.append(overlay);

  const mobileLogos = overlay.querySelector('.tcs-mobile-logos');
  mobileLogos.append(brandPrimary.cloneNode(true), brandSecondary.cloneNode(true));

  const closeBtn = overlay.querySelector('.tcs-mobile-close-btn');
  const backBtn = overlay.querySelector('.tcs-mobile-back-btn');
  const titleEl = overlay.querySelector('.tcs-mobile-title');
  const listEl = overlay.querySelector('.tcs-mobile-list');

  let navTreeData = null;
  let navHistory = [];

  const renderMobileLevel = (items, title, isRoot = false) => {
    titleEl.textContent = title;
    listEl.innerHTML = '';

    if (isRoot) {
      backBtn.classList.add('hidden');
    } else {
      backBtn.classList.remove('hidden');
    }

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'tcs-mobile-item';

      const hasChildren = item.children && item.children.length > 0;

      if (hasChildren) {
        const btn = document.createElement('button');
        btn.className = 'tcs-mobile-item-btn';
        btn.innerHTML = `
<span>${item.title}</span>
<span class="arrow">→</span>
        `;
        btn.addEventListener('click', () => {
          navHistory.push({ items, title });
          renderMobileLevel(item.children, item.title, false);
        });
        li.append(btn);
      } else {
        const a = document.createElement('a');
        a.className = 'tcs-mobile-item-link';
        a.href = item.path;
        a.textContent = item.title;
        li.append(a);
      }

      listEl.append(li);
    });
  };

  const openMobileNav = async () => {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (!navTreeData) {
      navTreeData = await fetchHierarchicalNavData();
    }

    navHistory = [];
    renderMobileLevel(navTreeData, 'Menu', true);
  };

  const closeMobileNav = () => {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  };

  headerHamburgerBtn.addEventListener('click', openMobileNav);
  closeBtn.addEventListener('click', closeMobileNav);

  backBtn.addEventListener('click', () => {
    if (navHistory.length > 0) {
      const prev = navHistory.pop();
      renderMobileLevel(prev.items, prev.title, navHistory.length === 0);
    }
  });
}
