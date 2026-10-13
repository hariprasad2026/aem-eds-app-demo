const DEFAULT_SEARCH_WATERMARK = 'Search';

const CANVAS_FIELD_ORDER = [
  'canvasType',
  'canvasSearchWatermark',
  'canvasMicrophoneIcon',
  'canvasMenuIcon',
  'motionType',
  'canvasStyle',
  'canvasTitle',
  'canvasDescription',
  'showNavigation',
  'showMicrophone',
  'canvasNavRootPath',
  'canvasNavDepth',
  'enableSearch',
  'maximumOptions',
  'optionsType',
];

const FIELD_ALIASES = {
  canvastype: 'canvasType',
  canvassearchwatermark: 'canvasSearchWatermark',
  searchwatermark: 'canvasSearchWatermark',
  canvasmicrophoneicon: 'canvasMicrophoneIcon',
  microphoneicon: 'canvasMicrophoneIcon',
  searchicon: 'canvasMicrophoneIcon',
  canvasmenuicon: 'canvasMenuIcon',
  menuicon: 'canvasMenuIcon',
  motiontype: 'motionType',
  canvasstyle: 'canvasStyle',
  canvastitle: 'canvasTitle',
  canvasdescription: 'canvasDescription',
  shownavigation: 'showNavigation',
  showmicrophone: 'showMicrophone',
  enablesearch: 'enableSearch',
  maximumoptions: 'maximumOptions',
  optionstype: 'optionsType',
  canvasnavrootpath: 'canvasNavRootPath',
  navrootpath: 'canvasNavRootPath',
  canvasnavdepth: 'canvasNavDepth',
  navdepth: 'canvasNavDepth',
};

function normalizeFieldKey(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function extractCellValue(cell) {
  if (!cell) return '';

  const image = cell.querySelector('img');
  if (image) return image;

  const picture = cell.querySelector('picture');
  if (picture) {
    const pictureImage = picture.querySelector('img');
    if (pictureImage) return pictureImage;
  }

  const link = cell.querySelector('a');
  if (link) return link.href || link.textContent.trim();

  const checkbox = cell.querySelector('input[type="checkbox"]');
  if (checkbox) return checkbox.checked ? 'true' : 'false';

  return cell.textContent.trim();
}

function extractOptionValue(cell) {
  const link = cell?.querySelector('a');
  return link ? { label: link.textContent.trim(), url: link.href } : null;
}

function extractAuthoredOptions(optionRows) {
  return optionRows.map((option) => {
    const fields = {};
    [...option.children].forEach((row) => {
      const cells = [...row.children];
      if (cells.length < 2) return;
      const key = normalizeFieldKey(cells[0].textContent);
      if (['optionlabel', 'label', 'title'].includes(key)) {
        fields.label = extractOptionValue(cells[1])?.label || cells[1].textContent.trim();
      } else if (['optionlink', 'link', 'url', 'href'].includes(key)) {
        fields.url = extractCellValue(cells[1]);
      }
    });

    if (!fields.label || !fields.url) {
      const cells = [...option.children];
      if (!fields.label && cells[0]) {
        fields.label = extractOptionValue(cells[0])?.label || cells[0].textContent.trim();
      }
      if (!fields.url && cells[1]) {
        fields.url = extractOptionValue(cells[1])?.url || extractCellValue(cells[1]);
      }
    }

    return fields;
  }).filter((item) => item.label);
}

function extractData(block) {
  const data = {};
  let fieldIndex = 0;

  [...block.children].forEach((row) => {
    if (row.classList.contains('canvas-option')) return;

    const cells = [...row.children];
    if (!cells.length) return;

    const rawKey = cells[0]?.textContent?.trim() || '';
    const normalizedKey = normalizeFieldKey(rawKey);
    const explicitKey = FIELD_ALIASES[normalizedKey]
            || (CANVAS_FIELD_ORDER.includes(rawKey) ? rawKey : '');

    if (explicitKey && cells.length > 1) {
      data[explicitKey] = extractCellValue(cells[1]);
      return;
    }

    const fieldName = CANVAS_FIELD_ORDER[fieldIndex];
    fieldIndex += 1;
    if (fieldName) data[fieldName] = extractCellValue(cells[0]);
  });

  return data;
}

function asBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();

  if (['true', 'yes', 'on', '1'].includes(normalized)) return true;
  if (['false', 'no', 'off', '0'].includes(normalized)) return false;

  return fallback;
}

function toPositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(parsed, 0);
}

function normalizeMotionType(value) {
  const normalized = String(value || 'none').trim().toLowerCase().replace(/\s+/g, '-');
  return ['none', 'fade', 'slide-up'].includes(normalized) ? normalized : 'none';
}

function normalizeCanvasStyle(value) {
  const normalized = String(value || 'default').trim().toLowerCase().replace(/\s+/g, '-');
  return ['default', 'floating-sticky'].includes(normalized) ? normalized : 'default';
}

const floatingCanvasSearches = new Set();
let floatingSearchListenersAttached = false;

function updateFloatingCanvasSearches() {
  const entries = [...floatingCanvasSearches]
    .filter((entry) => {
      if (entry.block.isConnected) return true;
      entry.scrollTargets.forEach((target) => {
        target.removeEventListener('scroll', updateFloatingCanvasSearches);
      });
      floatingCanvasSearches.delete(entry);
      return false;
    })
    .sort((first, second) => {
      const relation = first.block.compareDocumentPosition(second.block);
      return relation === Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  const passedEntries = entries.filter((entry) => {
    const dockTop = window.innerHeight - entry.search.offsetHeight - 16;
    return entry.sentinel.getBoundingClientRect().top <= dockTop + 1;
  });
  const activeEntry = passedEntries.findLast((entry) => {
    const dockTop = window.innerHeight - entry.search.offsetHeight - 16;
    return entry.block.getBoundingClientRect().bottom > dockTop;
  }) || null;
  const exitingEntry = activeEntry
    ? null
    : passedEntries[passedEntries.length - 1] || null;

  entries.forEach((entry) => {
    const isFloating = entry === activeEntry;
    const isFadingOut = entry === exitingEntry;
    entry.anchor.classList.toggle('is-floating', isFloating);
    entry.anchor.classList.toggle('is-fading-out', isFadingOut);
    entry.anchor.style.height = isFloating ? `${entry.search.offsetHeight}px` : '';

    if (isFloating || isFadingOut) {
      entry.search.classList.toggle('is-floating', isFloating);
      entry.search.classList.toggle('is-fading-out', isFadingOut);
      if (entry.search.parentElement !== entry.block) entry.block.append(entry.search);
    } else {
      entry.search.classList.remove('is-floating', 'is-fading-out');
      if (entry.search.parentElement !== entry.anchor) entry.anchor.append(entry.search);
    }
  });
}

function attachCanvasEffects(block, search) {
  if (block.classList.contains('canvas-floating-sticky')) {
    const anchor = document.createElement('div');
    anchor.className = 'canvas-floating-anchor';
    const sentinel = document.createElement('span');
    sentinel.className = 'canvas-floating-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    search.before(anchor);
    anchor.append(sentinel, search);
    const entry = {
      block,
      anchor,
      search,
      sentinel,
      scrollTargets: [],
    };
    floatingCanvasSearches.add(entry);
    let ancestor = block.parentElement;
    while (ancestor && ancestor !== document.body) {
      const { overflowX, overflowY } = getComputedStyle(ancestor);
      if (/(auto|scroll)/.test(`${overflowX} ${overflowY}`)) {
        ancestor.addEventListener('scroll', updateFloatingCanvasSearches, {
          passive: true,
        });
        entry.scrollTargets.push(ancestor);
      }
      ancestor = ancestor.parentElement;
    }
    if (!floatingSearchListenersAttached) {
      document.addEventListener(
        'scroll',
        updateFloatingCanvasSearches,
        true,
      );
      window.addEventListener(
        'scroll',
        updateFloatingCanvasSearches,
        {
          passive: true,
        },
      );
      window.addEventListener('resize', updateFloatingCanvasSearches);
      floatingSearchListenersAttached = true;
    }
    updateFloatingCanvasSearches();
  }
}

function attachCanvasMotion(block) {
  if (block.dataset.motionType === 'none') return;

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      block.classList.add('is-motion-visible');
      observer.disconnect();
    }
  });
  observer.observe(block);
}

function createImageElement(source, altText) {
  if (!source) return null;

  if (source instanceof Element) {
    const image = source.matches('img') ? source : source.querySelector('img');
    if (image) {
      image.alt = image.alt || altText || 'Canvas icon';
      image.setAttribute('loading', 'lazy');
      return image;
    }
    return null;
  }

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('<')) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = trimmed;
      const image = wrapper.querySelector('img');
      if (image) {
        image.alt = image.alt || altText || 'Canvas icon';
        image.setAttribute('loading', 'lazy');
        return image;
      }
      return null;
    }

    const isRelativeImagePath = /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(trimmed);
    if (trimmed.startsWith('/') || trimmed.startsWith('http') || trimmed.startsWith('data:') || isRelativeImagePath) {
      const image = document.createElement('img');
      image.src = new URL(trimmed, document.baseURI).href;
      image.alt = altText || 'Canvas icon';
      image.setAttribute('loading', 'lazy');
      return image;
    }
  }

  return null;
}

function createIconButton({
  className,
  label,
  iconSource,
  fallbackText,
}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);

  const icon = createImageElement(iconSource, label);

  if (icon) {
    button.appendChild(icon);
    return button;
  }

  const fallback = document.createElement('span');
  fallback.className = 'canvas-icon-fallback';
  fallback.textContent = fallbackText || label;
  button.appendChild(fallback);

  return button;
}

function normalizeNavigationPath(value = '') {
  if (!value) return '/';

  const candidate = String(value).trim();
  if (!candidate) return '/';

  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    try {
      return new URL(candidate).pathname || '/';
    } catch (error) {
      return '/';
    }
  }

  return candidate.startsWith('/')
    ? candidate.replace(/\/+$/, '') || '/'
    : `/${candidate.replace(/\/+$/, '')}`;
}

function formatNavigationTitle(value, path) {
  const authoredTitle = String(value || '').trim();
  if (authoredTitle) return authoredTitle;
  const pathTitle = path.split('/').filter(Boolean).pop() || '';
  return pathTitle
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildNavigationTree(indexData, rootPath, depth = 3) {
  const normalizedRoot = normalizeNavigationPath(rootPath);
  const maxDepth = Math.min(3, Math.max(1, toPositiveInt(depth, 3)));
  const excludedPaths = new Set(['/', '/footer', '/nav']);
  const excludedPrefixes = ['/blocks'];
  const entriesByPath = new Map(indexData
    .filter((item) => item.path && String(item.hideInNav).toLowerCase() !== 'true')
    .map((item) => {
      const href = normalizeNavigationPath(item.path);
      return [href, {
        href,
        title: formatNavigationTitle(item.title, href),
        navOrder: Number(item.navOrder) || 99,
      }];
    })
    .filter(([href]) => !excludedPaths.has(href)
      && !excludedPrefixes.some((prefix) => href === prefix || href.startsWith(`${prefix}/`)))
    .filter(([href]) => normalizedRoot === '/'
      || href === normalizedRoot
      || href.startsWith(`${normalizedRoot}/`)));
  const treeNodes = new Map();

  entriesByPath.forEach((entry) => {
    const relativePath = normalizedRoot === '/'
      ? entry.href.slice(1)
      : entry.href.slice(normalizedRoot.length).replace(/^\/+/, '');
    const segments = relativePath.split('/').filter(Boolean).slice(0, maxDepth);
    let parent = null;

    segments.forEach((segment, index) => {
      const href = `${normalizedRoot === '/' ? '' : normalizedRoot}/${segments.slice(0, index + 1).join('/')}` || '/';
      const indexedPage = entriesByPath.get(href);
      let node = treeNodes.get(href);
      if (!node) {
        node = {
          href,
          title: indexedPage?.title || formatNavigationTitle('', href),
          navOrder: indexedPage?.navOrder ?? entry.navOrder,
          children: [],
          parentHref: parent?.href || null,
        };
        treeNodes.set(href, node);
        if (parent) parent.children.push(node);
      } else if (indexedPage) {
        node.title = indexedPage.title;
        node.navOrder = indexedPage.navOrder;
      }
      parent = node;
    });
  });

  const sortTree = (nodes) => nodes
    .sort((first, second) => first.navOrder - second.navOrder
      || first.title.localeCompare(second.title))
    .map((node) => ({
      title: node.title,
      href: node.href,
      children: sortTree(node.children),
    }));

  const rootNodes = [...treeNodes.values()].filter((node) => !node.parentHref);
  return sortTree(rootNodes);
}

async function fetchNavigationData(rootPath, depth = 3) {
  try {
    const response = await fetch('/query-index.json', { cache: 'no-store' });
    if (!response.ok) return [];
    const payload = await response.json();
    const indexData = Array.isArray(payload) ? payload : payload.data || [];
    return buildNavigationTree(indexData, rootPath, depth);
  } catch (error) {
    return [];
  }
}

async function renderNavigationMenu(menuButton, data) {
  const items = await fetchNavigationData('/', 3);
  const wrapper = menuButton.closest('.canvas-search');
  const toolbar = wrapper.querySelector('.canvas-search-toolbar');
  const panel = document.createElement('div');
  panel.className = 'canvas-nav-panel';

  const submenu = document.createElement('div');
  submenu.className = 'canvas-nav-submenu';
  submenu.setAttribute('aria-live', 'polite');

  const navRow = document.createElement('div');
  navRow.className = 'canvas-nav-row';
  panel.append(submenu, navRow);

  const state = {
    level: 'l1',
    activeL1: null,
    activeL2: null,
  };

  let closeNavigation;

  const onOutsideClick = (event) => {
    if (!wrapper.contains(event.target)) closeNavigation();
  };

  closeNavigation = () => {
    panel.remove();
    menuButton.classList.remove('is-close');
    menuButton.setAttribute('aria-label', 'Open navigation');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.replaceChildren();
    const icon = createImageElement(data.canvasMenuIcon || data.menuIcon, 'Open navigation');
    if (icon) menuButton.appendChild(icon);
    else {
      const fallback = document.createElement('span');
      fallback.className = 'canvas-icon-fallback';
      fallback.textContent = 'Menu';
      menuButton.appendChild(fallback);
    }
    menuButton.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await renderNavigationMenu(menuButton, data);
    };
    toolbar.prepend(menuButton);
    document.removeEventListener('click', onOutsideClick);
  };

  const setToggle = () => {
    menuButton.replaceChildren();
    const isL1 = state.level === 'l1';
    menuButton.setAttribute('aria-label', isL1 ? 'Close navigation' : 'Show L1 navigation');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.classList.toggle('is-close', isL1);

    if (isL1) {
      menuButton.textContent = '×';
    } else {
      const icon = createImageElement(data.canvasMenuIcon || data.menuIcon, '');
      if (icon) menuButton.appendChild(icon);
      else menuButton.textContent = '☰';
    }
  };

  const makeLink = (item, className) => {
    const link = document.createElement('a');
    link.className = className;
    link.href = item.href || '#';
    link.textContent = item.title;
    if (!item.href) link.setAttribute('aria-disabled', 'true');
    return link;
  };

  const makeLevelButton = (item, className, onActivate, {
    expanded = false,
    activateOnHover = false,
  } = {}) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.classList.add('has-children');
    const label = document.createElement('span');
    label.className = 'canvas-nav-label';
    label.textContent = item.title;
    const chevron = document.createElement('span');
    chevron.className = 'canvas-nav-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    button.append(label, chevron);
    button.dataset.navHref = item.href;
    button.setAttribute('aria-expanded', String(expanded));
    if (activateOnHover) {
      button.addEventListener('mouseenter', onActivate);
      button.addEventListener('focus', onActivate);
    }
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onActivate();
    });
    return button;
  };

  const renderSubmenu = () => {
    submenu.replaceChildren();
    submenu.classList.remove('is-open');
    if (!state.activeL2) return;

    const list = document.createElement('ul');
    list.className = 'canvas-nav-list';
    state.activeL2.children.forEach((item) => {
      const entry = document.createElement('li');
      const link = makeLink(item, 'canvas-nav-l3');
      const arrow = document.createElement('span');
      arrow.className = 'canvas-nav-link-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '\u2192';
      link.appendChild(arrow);
      entry.appendChild(link);
      list.appendChild(entry);
    });
    submenu.appendChild(list);
    submenu.classList.add('is-open');
  };

  const render = () => {
    navRow.replaceChildren();
    setToggle();

    if (state.level === 'l1') {
      navRow.appendChild(menuButton);
      if (!items.length) {
        const emptyState = document.createElement('span');
        emptyState.className = 'canvas-nav-empty';
        emptyState.setAttribute('role', 'status');
        emptyState.textContent = 'No navigation pages are available.';
        navRow.appendChild(emptyState);
      }
      items.forEach((item) => {
        if (item.children.length) {
          navRow.appendChild(makeLevelButton(item, 'canvas-nav-item canvas-nav-l1', () => {
            state.level = 'l2';
            state.activeL1 = item;
            state.activeL2 = null;
            render();
          }));
        } else {
          navRow.appendChild(makeLink(item, 'canvas-nav-item canvas-nav-l1'));
        }
      });
      renderSubmenu();
      return;
    }

    navRow.appendChild(menuButton);
    const activeL1Button = document.createElement('button');
    activeL1Button.type = 'button';
    activeL1Button.className = 'canvas-nav-item canvas-nav-l1 is-active';
    activeL1Button.textContent = state.activeL1.title;
    activeL1Button.setAttribute('aria-label', `Show ${state.activeL1.title} subnavigation`);
    activeL1Button.addEventListener('click', () => {
      state.level = 'l1';
      state.activeL1 = null;
      state.activeL2 = null;
      render();
    });
    navRow.appendChild(activeL1Button);

    state.activeL1.children.forEach((item) => {
      const activateL2 = () => {
        state.activeL2 = item.children.length ? item : null;
        navRow.querySelectorAll('.canvas-nav-l2.has-children').forEach((button) => {
          const isActive = state.activeL2?.href === button.dataset.navHref;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-expanded', String(isActive));
        });
        renderSubmenu();
      };
      if (item.children.length) {
        const button = makeLevelButton(
          item,
          'canvas-nav-item canvas-nav-l2',
          activateL2,
          { expanded: state.activeL2 === item, activateOnHover: true },
        );
        if (state.activeL2 === item) {
          button.classList.add('is-active');
        }
        navRow.appendChild(button);
      } else {
        navRow.appendChild(makeLink(item, 'canvas-nav-item canvas-nav-l2'));
      }
    });
    renderSubmenu();
  };

  menuButton.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (state.level === 'l1') {
      closeNavigation();
      return;
    }
    state.level = 'l1';
    state.activeL1 = null;
    state.activeL2 = null;
    render();
  };

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNavigation();
    }
  });

  panel.addEventListener('mouseleave', () => {
    if (!state.activeL2) return;
    state.activeL2 = null;
    navRow.querySelectorAll('.canvas-nav-l2.has-children').forEach((button) => {
      button.classList.remove('is-active');
      button.setAttribute('aria-expanded', 'false');
    });
    renderSubmenu();
  });

  wrapper.appendChild(panel);
  document.addEventListener('click', onOutsideClick);
  render();
}

function setupVoiceSearch(button, input) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.title = 'Voice search is not supported in this browser';
    return;
  }

  let recognition;
  let isListening = false;
  let recognitionErrorMessage = '';

  const setListening = (listening) => {
    isListening = listening;
    button.classList.toggle('is-listening', listening);
    button.setAttribute('aria-pressed', String(listening));
    button.setAttribute(
      'aria-label',
      listening ? 'Stop voice search' : recognitionErrorMessage || 'Use microphone',
    );
    button.title = listening ? 'Listening...' : recognitionErrorMessage || 'Use microphone';
  };

  button.addEventListener('click', () => {
    if (isListening) {
      recognition.stop();
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang || navigator.language || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => {
      recognitionErrorMessage = '';
      button.title = 'Listening...';
      setListening(true);
    };
    recognition.onresult = (event) => {
      const transcriptParts = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const resultText = result?.[0]?.transcript?.trim();
        if (resultText) transcriptParts.push(resultText);
      }
      const transcript = transcriptParts.join(' ').trim();
      if (transcript) {
        input.value = transcript;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    recognition.onerror = (event) => {
      const messages = {
        'not-allowed': 'Microphone access is blocked. Allow microphone access for this site and try again.',
        'service-not-allowed': 'Microphone access is blocked by the browser or embedding page.',
        'audio-capture': 'No microphone is available to the browser.',
        'no-speech': 'No speech was detected. Try again.',
        network: 'Voice recognition is unavailable because of a network error.',
      };
      recognitionErrorMessage = messages[event.error] || 'Voice recognition failed. Try again.';
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
    } catch (error) {
      recognitionErrorMessage = error.name === 'NotAllowedError'
        ? 'Microphone access is blocked. Allow microphone access for this site and try again.'
        : 'Voice recognition could not start. Try again.';
      setListening(false);
      button.title = recognitionErrorMessage;
    }
  });
}

function createSearchBar({
  watermark,
  showMicrophone,
  showNavigation,
  menuIcon,
  microphoneIcon,
  data,
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'canvas-search';

  const toolbar = document.createElement('div');
  toolbar.className = 'canvas-search-toolbar';

  if (showNavigation) {
    const menuButton = createIconButton({
      className: 'canvas-menu-btn',
      label: 'Open navigation',
      iconSource: menuIcon,
      fallbackText: 'Menu',
    });

    menuButton.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await renderNavigationMenu(menuButton, data);
    };

    toolbar.append(menuButton);
  }

  const container = document.createElement('div');
  container.className = 'canvas-search-container';

  const searchInput = document.createElement('div');
  searchInput.className = 'canvas-search-input';

  const searchField = document.createElement('input');
  searchField.type = 'search';
  searchField.className = 'canvas-search-field';
  searchField.placeholder = watermark || DEFAULT_SEARCH_WATERMARK;
  searchField.setAttribute('aria-label', watermark || DEFAULT_SEARCH_WATERMARK);
  searchInput.appendChild(searchField);

  const controls = document.createElement('div');
  controls.className = 'canvas-controls';

  if (showMicrophone) {
    const microphoneButton = createIconButton({
      className: 'canvas-mic-btn',
      label: 'Use microphone',
      iconSource: microphoneIcon,
      fallbackText: 'Mic',
    });
    setupVoiceSearch(microphoneButton, searchField);
    controls.append(microphoneButton);
  }

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'canvas-submit-btn';
  submit.setAttribute('aria-label', 'Submit search');
  const submitArrow = document.createElement('span');
  submitArrow.className = 'canvas-submit-arrow';
  submitArrow.setAttribute('aria-hidden', 'true');
  submit.appendChild(submitArrow);
  controls.appendChild(submit);

  searchInput.appendChild(controls);
  container.appendChild(searchInput);
  toolbar.appendChild(container);
  wrapper.appendChild(toolbar);

  return wrapper;
}

function renderSearchCanvas(block, data) {
  const titleText = data.canvasTitle || data.canvastitle || '';
  const descriptionText = data.canvasDescription || data.canvasdescription || '';

  if (titleText || descriptionText) {
    const intro = document.createElement('div');
    intro.className = 'canvas-search-intro';

    if (titleText) {
      const title = document.createElement('h2');
      title.className = 'canvas-title';
      title.textContent = titleText;
      intro.appendChild(title);
    }

    if (descriptionText) {
      const description = document.createElement('div');
      description.className = 'canvas-description';
      description.innerHTML = descriptionText;
      intro.appendChild(description);
    }

    block.appendChild(intro);
  }

  const search = createSearchBar({
    watermark: data.canvasSearchWatermark || data.searchWatermark || '',
    showNavigation: asBoolean(data.showNavigation, true),
    showMicrophone: asBoolean(data.showMicrophone, true),
    menuIcon: data.canvasMenuIcon || data.menuIcon,
    microphoneIcon: data.canvasMicrophoneIcon || data.microphoneIcon || data.searchIcon,
    data,
  });

  block.appendChild(search);
  attachCanvasEffects(block, search);
  attachCanvasMotion(block);
}

async function fetchIntentOptions(maxOptions = 5) {
  try {
    const response = await fetch('/blocks/canvas/dummy.json');

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return (data.options || []).slice(0, maxOptions);
  } catch (error) {
    return [];
  }
}

async function renderIntentCanvas(block, data, authoredOptions) {
  const section = document.createElement('section');
  section.className = 'canvas-intent';

  const glowYellow = document.createElement('div');
  glowYellow.className = 'canvas-glow canvas-glow-yellow';
  const glowBlue = document.createElement('div');
  glowBlue.className = 'canvas-glow canvas-glow-blue';
  section.append(glowYellow, glowBlue);

  const content = document.createElement('div');
  content.className = 'canvas-intent-content';
  const optionsFrame = document.createElement('div');
  optionsFrame.className = 'canvas-intent-options-frame';

  const titleText = data.canvasTitle || data.canvastitle || '';
  if (titleText) {
    const title = document.createElement('h2');
    title.className = 'canvas-title';
    title.textContent = titleText;
    content.appendChild(title);
  }

  const descriptionText = data.canvasDescription || data.canvasdescription || '';
  if (descriptionText) {
    const description = document.createElement('div');
    description.className = 'canvas-description';
    description.innerHTML = descriptionText;
    content.appendChild(description);
  }

  const searchSlot = document.createElement('div');
  searchSlot.className = 'canvas-search-slot';

  if (asBoolean(data.enableSearch, true)) {
    searchSlot.append(
      createSearchBar({
        watermark: data.canvasSearchWatermark || data.searchWatermark || '',
        showNavigation: asBoolean(data.showNavigation, true),
        showMicrophone: asBoolean(data.showMicrophone, true),
        menuIcon: data.canvasMenuIcon || data.menuIcon,
        microphoneIcon: data.canvasMicrophoneIcon || data.microphoneIcon || data.searchIcon,
        data,
      }),
    );
  }

  content.appendChild(searchSlot);

  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'canvas-options';

  const maxOptions = Math.min(
    5,
    toPositiveInt(data.maximumOptions || data.maximumoptions, 5),
  );

  const configuredOptions = extractAuthoredOptions(authoredOptions);
  const optionsType = String(data.optionsType || data.optionstype || 'default')
    .trim()
    .toLowerCase();
  const fallbackOptions = optionsType === 'default'
    ? await fetchIntentOptions(maxOptions)
    : [];
  const options = (configuredOptions.length ? configuredOptions : fallbackOptions)
    .slice(0, maxOptions);

  options.forEach((item, index) => {
    const option = document.createElement('a');

    option.className = 'canvas-option-pill';
    option.href = item.url || '#';
    option.textContent = item.label || '';

    const rowIndex = Math.floor(index / 3);
    let row = optionsContainer.children[rowIndex];
    if (!row) {
      row = document.createElement('div');
      row.className = 'canvas-options-row';
      optionsContainer.appendChild(row);
    }
    row.appendChild(option);
  });

  optionsFrame.appendChild(optionsContainer);
  section.appendChild(content);
  section.appendChild(optionsFrame);
  block.appendChild(section);

  const search = searchSlot.querySelector('.canvas-search');
  if (search) attachCanvasEffects(block, search);
  attachCanvasMotion(block);
}

export default function decorate(block) {
  const data = extractData(block);
  const optionList = [...block.querySelectorAll('.canvas-option')];

  block.innerHTML = '';

  const canvasType = String(data.canvasType || data.canvastype || 'search').trim().toLowerCase();
  const normalizedType = canvasType === 'intent' ? 'intent' : 'search';
  const canvasStyle = normalizeCanvasStyle(data.canvasStyle || data.canvasstyle);
  const motionType = normalizeMotionType(data.motionType || data.motiontype);

  block.classList.add('canvas');
  block.classList.add(`canvas-${normalizedType}`);
  block.dataset.motionType = motionType;

  block.dataset.canvasStyle = canvasStyle;
  block.classList.remove('canvas-default', 'canvas-floating-sticky');
  block.classList.add(`canvas-${canvasStyle}`);

  if (normalizedType === 'intent') {
    renderIntentCanvas(block, data, optionList);
    return;
  }

  renderSearchCanvas(block, data);
}
