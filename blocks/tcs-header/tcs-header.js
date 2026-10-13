import { createOptimizedPicture } from '../../scripts/aem.js';

const getChevronSvg = () => `
<svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
<polyline points="6 9 12 15 18 9"></polyline>
</svg>

`;

// TATA Brand SVG Vector Fallback (Ensures Logo Renders Even If Dynamic Media URL fails)

const getTataLogoSvg = () => `
<svg width="50" height="34" viewBox="0 0 100 68" fill="#000000" xmlns="http://www.w3.org/2000/svg">
<path d="M50 0C22.386 0 0 22.386 0 50h18c0-17.673 14.327-32 32-32s32 14.327 32 32h18C100 22.386 77.614 0 50 0z"/>
<path d="M50 20c-16.569 0-30 13.431-30 30h12c0-9.941 8.059-18 18-18s18 8.059 18 18h12c0-16.569-13.431-30-30-30z"/>
<text x="50%" y="64" font-family="Inter, sans-serif" font-weight="700" font-size="14" text-anchor="middle" letter-spacing="2">TATA</text>
</svg>

`;

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

/**

* FIXED getProp: Ensures Image properties only accept valid image paths/URLs

*/

function getProp(block, name, fallback = '') {
  const lower = name.toLowerCase();

  const isImageProp = lower.includes('logo') && !lower.includes('alt') && !lower.includes('link');

  const isValidImgUrl = (url) => {
    if (!url || typeof url !== 'string') return false;

    const clean = url.trim().toLowerCase();

    if (clean === 'both' || clean === 'text-only' || clean === 'voice-only') return false;

    return clean.startsWith('/') || clean.startsWith('http') || clean.includes('/dam/') || clean.match(/\.(png|jpg|jpeg|svg|webp)/);
  };

  const getValue = (element) => {
    if (!element) return '';

    const image = element.matches('img') ? element : element.querySelector('picture img, img');

    if (image) return image.getAttribute('src') || image.src;

    const anchor = element.matches('a') ? element : element.querySelector('a');

    if (anchor) return anchor.getAttribute('href') || anchor.textContent.trim();

    const input = element.matches('input, textarea, select')

      ? element

      : element.querySelector('input, textarea, select');

    return input?.value || element.dataset.value || element.getAttribute('value') || element.textContent.trim();
  };

  // 1. Direct Dataset Lookup

  if (block.dataset[name] && (!isImageProp || isValidImgUrl(block.dataset[name]))) {
    return block.dataset[name];
  }

  if (block.dataset[lower] && (!isImageProp || isValidImgUrl(block.dataset[lower]))) {
    return block.dataset[lower];
  }

  // 2. Query selector lookup by attribute

  const attrElem = block.querySelector(`[data-aue-prop="${name}"], [data-aue-prop="${lower}"]`);

  if (attrElem) {
    const val = getValue(attrElem);

    if (val && (!isImageProp || isValidImgUrl(val))) return val;
  }

  // 3. Scan rows for matching column keys

  const rows = [...block.children];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    const cols = [...row.children];

    if (cols.length >= 2) {
      const key = cols[0].textContent.trim().toLowerCase().replace(/[-_]/g, '');

      if (key === lower.replace(/[-_]/g, '')) {
        const val = getValue(cols[1]);

        if (val && (!isImageProp || isValidImgUrl(val))) return val;
      }
    }
  }

  return fallback;
}

export default function decorate(block) {
  const config = {

    headerVariant: getProp(block, 'headerVariant', 'standard'),

    tcsLogo: getProp(block, 'tcsLogo'),

    tcsLogoAlt: getProp(block, 'tcsLogoAlt', 'Tata Consultancy Services'),

    tcsLogoLink: getProp(block, 'tcsLogoLink', '/'),

    tataLogo: getProp(block, 'tataLogo'),

    tataLogoAlt: getProp(block, 'tataLogoAlt', 'TATA Group'),

    tataLogoLink: getProp(block, 'tataLogoLink', 'https://www.tata.com'),

    searchVariation: getProp(block, 'searchVariation', 'both'),

    searchPlaceholder: getProp(block, 'searchPlaceholder', 'Ask Canvas Search'),

  };

  block.textContent = '';

  block.classList.add(`variant-${config.headerVariant}`);

  const navWrapper = document.createElement('div');

  navWrapper.className = 'tcs-nav-wrapper';

  const nav = document.createElement('nav');

  nav.id = 'tcs-nav';

  // 1. TCS Primary Logo

  const brandPrimary = document.createElement('div');

  brandPrimary.className = 'nav-brand-primary';

  const primaryAnchor = document.createElement('a');

  primaryAnchor.href = config.tcsLogoLink;

  if (config.tcsLogo) {
    primaryAnchor.append(createOptimizedPicture(config.tcsLogo, config.tcsLogoAlt, false, [{ width: '300' }]));
  } else {
    primaryAnchor.textContent = 'TCS';
  }

  brandPrimary.append(primaryAnchor);

  // 2. FIXED: TATA Secondary Logo Rendering Logic

  const brandSecondary = document.createElement('div');

  brandSecondary.className = 'nav-brand-secondary';

  const secondaryAnchor = document.createElement('a');

  secondaryAnchor.href = config.tataLogoLink;

  secondaryAnchor.target = '_blank';

  secondaryAnchor.rel = 'noopener noreferrer';

  const isTataImgValid = config.tataLogo && (

    config.tataLogo.startsWith('/')

    || config.tataLogo.startsWith('http')

    || config.tataLogo.includes('/dam/')

    || config.tataLogo.match(/\.(png|jpg|jpeg|svg|webp)/i)

  ) && !config.tataLogo.endsWith('tata.com') && !config.tataLogo.endsWith('tata.com/');

  if (isTataImgValid) {
    secondaryAnchor.append(createOptimizedPicture(config.tataLogo, config.tataLogoAlt, false, [{ width: '160' }]));
  } else {
    secondaryAnchor.innerHTML = getTataLogoSvg();
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

  // FLOATING CONTROL BAR

  const floatingControlBar = document.createElement('div');

  floatingControlBar.className = 'tcs-floating-control-bar is-fixed';

  const subMenuPanel = document.createElement('div');

  subMenuPanel.className = 'tcs-submenu-panel hidden';

  const searchRow = document.createElement('div');

  searchRow.className = 'tcs-search-row';

  const desktopHamburgerWrapper = document.createElement('div');

  desktopHamburgerWrapper.className = 'tcs-hamburger-wrapper';

  const desktopFloatingHamburgerBtn = document.createElement('button');

  desktopFloatingHamburgerBtn.className = 'tcs-floating-hamburger';

  desktopFloatingHamburgerBtn.setAttribute('aria-label', 'Open navigation menu');

  desktopFloatingHamburgerBtn.innerHTML = `
<span class="icon-hamburger">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
<line x1="3" y1="6" x2="21" y2="6"></line>
<line x1="3" y1="12" x2="21" y2="12"></line>
<line x1="3" y1="18" x2="21" y2="18"></line>
</svg>
</span>
<span class="icon-close hidden">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
<line x1="18" y1="6" x2="6" y2="18"></line>
<line x1="6" y1="6" x2="18" y2="18"></line>
</svg>
</span>

  `;

  desktopHamburgerWrapper.append(desktopFloatingHamburgerBtn);

  const searchVariation = config.searchVariation.toLowerCase();

  const searchBox = document.createElement('div');

  searchBox.className = `tcs-search-box mode-${searchVariation}`;

  let searchHtml = '<form class="tcs-search-form" action="#">';

  if (searchVariation !== 'voice-only') {
    searchHtml += `<input type="text" class="tcs-search-input" placeholder="${config.searchPlaceholder}" aria-label="Search site">`;
  }

  searchHtml += '<div class="tcs-search-actions">';

  if (searchVariation === 'both' || searchVariation === 'voice-only') {
    searchHtml += `
<button type="button" class="mic-btn" aria-label="Voice Search">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
<line x1="12" y1="19" x2="12" y2="23"></line>
<line x1="8" y1="23" x2="16" y2="23"></line>
</svg>
</button>`;
  }

  searchHtml += `
<button type="submit" class="submit-btn" aria-label="Submit Search">
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
<line x1="5" y1="12" x2="19" y2="12"></line>
<polyline points="12 5 19 12 12 19"></polyline>
</svg>
</button>
</div>
</form>`;

  searchBox.innerHTML = searchHtml;

  searchRow.append(desktopHamburgerWrapper, searchBox);

  const desktopPillsContainer = document.createElement('div');

  desktopPillsContainer.className = 'tcs-desktop-pills-container hidden';

  const navPillsRow = document.createElement('div');

  navPillsRow.className = 'tcs-nav-pills-row';

  desktopPillsContainer.append(navPillsRow);

  floatingControlBar.append(subMenuPanel, searchRow, desktopPillsContainer);

  document.body.append(floatingControlBar);

  let isDesktopNavOpen = false;

  const renderDesktopSubmenuCard = (items) => {
    if (!items || items.length === 0) {
      subMenuPanel.classList.add('hidden');

      return;
    }

    subMenuPanel.innerHTML = `
<div class="tcs-submenu-grid">

        ${items

    .map(

      (item) => `
<a href="${item.path}" class="tcs-submenu-item">
<span>${item.title}</span>
<span class="arrow">→</span>
</a>

          `,

    )

    .join('')}
</div>

    `;

    subMenuPanel.classList.remove('hidden');
  };

  const renderDesktopL1Navigation = async () => {
    navPillsRow.innerHTML = '';

    subMenuPanel.classList.add('hidden');

    if (!navTreeData) {
      navTreeData = await fetchHierarchicalNavData();
    }

    if (!navTreeData || navTreeData.length === 0) return;

    navTreeData.forEach((l1, idx) => {
      const l1Pill = document.createElement('div');

      l1Pill.className = `tcs-nav-pill ${idx === 0 ? 'active' : ''}`;

      const hasL2 = l1.children && l1.children.length > 0;

      l1Pill.innerHTML = `
<a href="${l1.path}" class="tcs-pill-link">${l1.title}</a>

        ${hasL2 ? `<button class="chevron-btn" aria-label="Expand subpages">${getChevronSvg()}</button>` : ''}

      `;

      l1Pill.addEventListener('mouseenter', () => {
        navPillsRow.querySelectorAll('.tcs-nav-pill').forEach((p) => p.classList.remove('active'));

        l1Pill.classList.add('active');

        if (hasL2) renderDesktopSubmenuCard(l1.children);
      });

      navPillsRow.append(l1Pill);
    });

    if (navTreeData[0] && navTreeData[0].children && navTreeData[0].children.length > 0) {
      renderDesktopSubmenuCard(navTreeData[0].children);
    }
  };

  desktopFloatingHamburgerBtn.addEventListener('click', async () => {
    const iconHamburger = desktopFloatingHamburgerBtn.querySelector('.icon-hamburger');

    const iconClose = desktopFloatingHamburgerBtn.querySelector('.icon-close');

    if (!isDesktopNavOpen) {
      isDesktopNavOpen = true;

      iconHamburger.classList.add('hidden');

      iconClose.classList.remove('hidden');

      desktopPillsContainer.classList.remove('hidden');

      await renderDesktopL1Navigation();
    } else {
      isDesktopNavOpen = false;

      iconHamburger.classList.remove('hidden');

      iconClose.classList.add('hidden');

      desktopPillsContainer.classList.add('hidden');

      subMenuPanel.classList.add('hidden');
    }
  });

  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const footerElem = document.querySelector('.tcs-footer, footer');

        if (footerElem) {
          const footerRect = footerElem.getBoundingClientRect();

          const windowHeight = window.innerHeight;

          if (footerRect.top < windowHeight - 120) {
            floatingControlBar.classList.remove('is-fixed');
          } else {
            floatingControlBar.classList.add('is-fixed');
          }
        } else {
          floatingControlBar.classList.add('is-fixed');
        }

        ticking = false;
      });

      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  handleScroll();
}
