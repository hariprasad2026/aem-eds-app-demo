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

async function fetchQueryIndex() {
  try {
    const response = await fetch('/query-index.json');
    if (!response.ok) return [];
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    return [];
  }
}

function buildTaxonomyFromIndex(indexData, rootPath = '/', maxDepth = 3) {
  const normalizedRoot = normalizeRootPath(rootPath);
  const maxDepthValue = normalizeDepth(maxDepth, 3, 1, 3);

  const validItems = indexData.filter((item) => {
    if (!item.path || item.hideInNav === 'true') return false;
    if (normalizedRoot === '/') return true;
    return item.path === normalizedRoot || item.path.startsWith(`${normalizedRoot}/`);
  });

  const getRelativeDepth = (path) => {
    if (normalizedRoot === '/') return path.split('/').filter(Boolean).length;
    const relativePath = path.startsWith(normalizedRoot)
      ? path.slice(normalizedRoot.length).replace(/^\/+/, '')
      : path;
    return relativePath ? relativePath.split('/').filter(Boolean).length : 0;
  };

  const l1Items = validItems
    .filter((item) => getRelativeDepth(item.path) === 1)
    .sort((a, b) => (Number(a.navOrder) || 99) - (Number(b.navOrder) || 99));

  return l1Items.map((l1) => {
    const l2Items = validItems
      .filter((item) => getRelativeDepth(item.path) === 2 && item.path.startsWith(`${l1.path}/`))
      .sort((a, b) => (Number(a.navOrder) || 99) - (Number(b.navOrder) || 99));

    const l2Children = (maxDepthValue >= 2 ? l2Items : []).map((l2) => {
      const l3Items = validItems
        .filter((item) => getRelativeDepth(item.path) === 3 && item.path.startsWith(`${l2.path}/`))
        .sort((a, b) => (Number(a.navOrder) || 99) - (Number(b.navOrder) || 99))
        .map((l3) => ({
          label: l3.title || l3.path.split('/').pop(),
          link: { href: l3.path },
          children: [],
        }));

      return {
        label: l2.title || l2.path.split('/').pop(),
        link: { href: l2.path },
        children: maxDepthValue >= 3 ? l3Items : [],
      };
    });

    return {
      label: l1.title || l1.path.split('/').pop(),
      link: { href: l1.path },
      children: l2Children,
    };
  });
}

function getActiveFromCurrentPath(items, currentPath) {
  const l1Match = items.find((l1) => currentPath === l1.link.href || currentPath.startsWith(`${l1.link.href}/`));
  if (!l1Match) return { activeL1: null, activeL2: null };

  const l2Match = l1Match.children.find((l2) => currentPath === l2.link.href || currentPath.startsWith(`${l2.link.href}/`));
  return { activeL1: l1Match, activeL2: l2Match || null };
}

function createCanvasForm(config) {
  const form = document.createElement('form');
  form.className = 'dock-canvas-form';
  form.action = config.canvasActionUrl;
  form.method = 'GET';

  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'q';
  input.className = 'dock-canvas-input';
  input.placeholder = config.canvasPlaceholder || 'Ask us a question';

  const actions = document.createElement('div');
  actions.className = 'dock-canvas-actions';

  const micBtn = document.createElement('button');
  micBtn.type = 'button';
  micBtn.className = 'dock-mic-btn';
  micBtn.setAttribute('aria-label', 'Voice Search');
  micBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
  `;

  if (config.showCanvasSearchIcon) {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      micBtn.addEventListener('click', () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.onresult = (event) => {
          input.value = event.results[0][0].transcript;
        };
        recognition.start();
      });
    } else {
      micBtn.setAttribute('aria-disabled', 'true');
      micBtn.disabled = true;
      micBtn.title = 'Voice search unavailable in this browser';
      micBtn.style.opacity = '0.6';
    }
  } else {
    micBtn.remove();
  }

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'dock-submit-btn';
  submitBtn.setAttribute('aria-label', 'Submit');
  submitBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  `;

  actions.append(micBtn, submitBtn);
  form.append(input, actions);
  return form;
}

function createLink(item, className) {
  const link = document.createElement(item.link ? 'a' : 'span');
  link.className = className;
  link.textContent = item.label;
  if (item.link) {
    link.href = item.link.href;
  }
  return link;
}

function createPill(item, onSelect, isExpanded = false) {
  const button = document.createElement('button');
  button.className = 'dock-pill-btn';
  button.type = 'button';
  button.setAttribute('aria-expanded', String(isExpanded));
  button.textContent = item.label;
  button.addEventListener('click', () => onSelect(item, button));

  const chevron = document.createElement('span');
  chevron.className = 'dock-chevron-icon';
  chevron.setAttribute('aria-hidden', 'true');
  button.append(chevron);
  return button;
}

function createLevel(items, className, onSelect, expandedItem = null) {
  const list = document.createElement('ul');
  list.className = `dock-list ${className}`;

  items.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.className = 'dock-item';
    if (item.children.length) {
      listItem.append(createPill(item, onSelect, item === expandedItem));
    } else if (item.link) {
      listItem.append(createLink(item, 'dock-pill-btn single-link'));
    } else {
      const label = document.createElement('span');
      label.className = 'dock-pill-btn single-link';
      label.textContent = item.label;
      listItem.append(label);
    }
    list.append(listItem);
  });

  return list;
}

function createThirdLevelPanel(item) {
  const panel = document.createElement('div');
  panel.className = 'dock-megamenu-panel';
  panel.setAttribute('aria-label', `${item.label} links`);

  const list = document.createElement('ul');
  list.className = 'dock-l3-grid';
  item.children.forEach((child) => {
    const listItem = document.createElement('li');
    listItem.className = 'dock-l3-item';
    const link = createLink(child, 'dock-l3-link');
    listItem.append(link);
    list.append(listItem);
  });

  panel.append(list);
  return panel;
}

/**
 * The floating canvas dock should remain visible while scrolling, matching the required UX.
 * The previous hide-on-scroll behavior is intentionally disabled.
 */
function setupScrollDockObserver() {
  // Intentionally no-op to keep the dock fixed and floating while the page scrolls.
}

function decorateNavigationDock(container, taxonomy, config) {
  const currentPath = window.location.pathname;
  const {
    activeL1: initialActiveL1,
    activeL2: initialActiveL2,
  } = getActiveFromCurrentPath(taxonomy, currentPath);

  let activeL1 = initialActiveL1;
  let activeL2 = initialActiveL2;

  container.className = 'navigation-dock-wrapper floating-bottom-dock';
  container.dataset.motionType = config.navigationMotion;

  const dock = document.createElement('div');
  dock.className = 'dock-inner-wrapper';

  const hamburger = document.createElement('button');
  hamburger.className = 'dock-hamburger-btn';
  hamburger.type = 'button';
  hamburger.setAttribute('aria-label', 'Toggle Menu');
  hamburger.setAttribute('aria-expanded', String(Boolean(activeL1)));
  hamburger.innerHTML = '<span aria-hidden="true"></span>';

  const canvasForm = createCanvasForm(config);

  const nav = document.createElement('nav');
  nav.className = 'dock-navigation';
  nav.setAttribute('aria-label', 'Primary navigation');

  const render = () => {
    nav.replaceChildren();

    if (!activeL1) {
      nav.append(createLevel(taxonomy, 'dock-level-one', (item, button) => {
        activeL1 = item;
        activeL2 = null;
        render();
        button.blur();
      }));
      return;
    }

    const levelTwoItems = document.createElement('div');
    levelTwoItems.className = 'dock-level-two-row';
    levelTwoItems.append(createLevel(activeL1.children, 'dock-level-two', (item, button) => {
      activeL2 = activeL2 === item ? null : item;
      render();
      button.blur();
    }, activeL2));

    if (activeL2?.children.length) {
      const panel = createThirdLevelPanel(activeL2);
      panel.id = 'navigation-third-level-panel';
      levelTwoItems.prepend(panel);
    }

    nav.append(levelTwoItems);
  };

  hamburger.addEventListener('click', () => {
    activeL1 = activeL1 ? null : taxonomy[0];
    activeL2 = null;
    hamburger.setAttribute('aria-expanded', String(Boolean(activeL1)));
    render();
  });

  dock.append(hamburger, canvasForm);
  container.append(dock, nav);
  render();

  setupScrollDockObserver();
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

  const navDockContainer = document.createElement('div');
  block.append(navDockContainer);

  const rawIndex = await fetchQueryIndex();
  const taxonomy = buildTaxonomyFromIndex(rawIndex, config.navRootPath, config.navDepth);

  decorateNavigationDock(navDockContainer, taxonomy, config);
}
