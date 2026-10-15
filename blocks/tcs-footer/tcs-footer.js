import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * SVG Chevron Icon Helper
 */
const getChevronSvg = () => `
  <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
`;

/**
 * SVG Left Arrow Icon Helper
 */
const getArrowLeftSvg = () => `
  <svg class="arrow-left-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
`;

/**
 * Resolves content paths cleanly to /[pagename] without .html extension
 */
function formatHtmlPath(path) {
  if (!path || path === '/') return path || '#';

  let resolvedPath = path.startsWith('/') ? path : `/${path}`;
  resolvedPath = resolvedPath.replace(/\.html$/, '');

  if (resolvedPath.includes('/content/')) {
    const parts = resolvedPath.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    resolvedPath = `/${lastPart}`;
  }

  return resolvedPath;
}

/**
 * Helper to determine current page level (L1, L2, or L3) and path segments
 */
function getCurrentPageInfo() {
  const path = window.location.pathname.replace(/\.html$/, '');
  const segments = path.split('/').filter(Boolean);

  let locale = '';
  if (segments[0] && segments[0].length === 2) {
    locale = segments.shift();
  }

  const contentIdx = segments.indexOf('content');
  if (contentIdx !== -1) {
    segments.splice(0, contentIdx + 4);
  }

  const depth = segments.length;
  let level = 'L1';
  if (depth === 2) level = 'L2';
  if (depth >= 3) level = 'L3';

  // Construct parent path for page redirection
  const parentPath = segments.length > 1
    ? formatHtmlPath(`/${locale ? `${locale}/` : ''}${segments.slice(0, -1).join('/')}`)
    : '/';

  return {
    level,
    depth,
    segments,
    locale,
    parentPath,
    l1Key: segments[0] || '',
    l2Key: segments[1] || '',
    l3Key: segments[2] || '',
  };
}

/**
 * Parses query-index.json into L1, L2, and L3 multi-level hierarchy
 */
async function fetchHierarchicalNavData() {
  try {
    const response = await fetch('/query-index.json');
    if (!response.ok) return [];
    const json = await response.json();
    const data = json.data || json;

    if (!Array.isArray(data)) return [];

    const navTree = {};
    const excludedPages = [
      'footer',
      'header',
      'tcs-footer',
      'tcs-header',
      'blocks',
      'home',
      'home-page',
      'homepage',
      'demo',
      'nav',
      'iconlist',
      'qa',
      'test',
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

      const lastSegment = segments[segments.length - 1]
        .toLowerCase()
        .replace(/\s+/g, '-');
      if (excludedPages.includes(lastSegment)) return;

      const l1Key = segments[0];
      if (excludedPages.includes(l1Key.toLowerCase())) return;

      if (!navTree[l1Key]) {
        const titleVal = item.title && segments.length === 1
          ? item.title
          : l1Key.replace(/-/g, ' ');

        navTree[l1Key] = {
          key: l1Key,
          title: titleVal,
          path: formatHtmlPath(`/${locale ? `${locale}/` : ''}${l1Key}`),
          children: {},
        };
      }

      if (segments.length >= 2) {
        const l2Key = segments[1];
        if (excludedPages.includes(l2Key.toLowerCase())) return;

        if (!navTree[l1Key].children[l2Key]) {
          const l2TitleVal = item.title && segments.length === 2
            ? item.title
            : l2Key.replace(/-/g, ' ');

          navTree[l1Key].children[l2Key] = {
            key: l2Key,
            title: l2TitleVal,
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
            path: formatHtmlPath(
              `/${locale ? `${locale}/` : ''}${l1Key}/${l2Key}/${l3Key}`,
            ),
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
    // eslint-disable-next-line no-console
    console.error('Failed to load navigation index:', error);
    return [];
  }
}

export default function decorate(block) {
  const blockRows = [...block.children];

  // Heading Title
  const mainTitleRow = blockRows.shift();
  const rawTitle = mainTitleRow?.textContent.trim();
  const titleText = rawTitle
    ? rawTitle.replace("Let's build the future together", "Let's build the<br>future together")
    : "Let's build the<br>future together";

  const footerContainer = document.createElement('div');
  footerContainer.className = 'tcs-footer-container';

  const heading = document.createElement('h3');
  heading.className = 'tcs-footer-heading';
  heading.innerHTML = titleText;
  footerContainer.append(heading);

  // Floating Control Bar Containers
  const floatingNav = document.createElement('nav');
  floatingNav.className = 'tcs-footer-floating-nav';
  floatingNav.setAttribute('aria-label', 'Footer Navigation');

  const navAnchorNode = document.createElement('div');
  navAnchorNode.className = 'tcs-footer-nav-anchor';
  footerContainer.append(navAnchorNode);

  const searchRow = document.createElement('div');
  searchRow.className = 'tcs-footer-search-row';

  const navPillsRow = document.createElement('div');
  navPillsRow.id = 'tcs-footer-nav-pills';
  navPillsRow.className = 'tcs-footer-nav-pills-row hidden';

  const subMenuPanel = document.createElement('div');
  subMenuPanel.className = 'tcs-footer-submenu-panel hidden';

  const ctaRow = document.createElement('div');
  ctaRow.className = 'tcs-footer-cta-row';

  const bottomRow = document.createElement('div');
  bottomRow.className = 'tcs-footer-bottom-row';

  const legalNav = document.createElement('div');
  legalNav.className = 'tcs-footer-legal-nav';

  let hamburgerWrapperNode = null;
  let hamburgerBtnNode = null;
  let searchBoxWrapperNode = null;
  let isNavOpen = false;
  let navTreeData = null;

  let searchQueryVariable = '';

  const getModelType = (row, index) => {
    const explicitModel = row.getAttribute('data-aue-model') || row.dataset?.aueModel;
    if (explicitModel) return explicitModel;

    const text = row.textContent.trim().toLowerCase();

    if (
      text.includes('both')
      || text.includes('text-only')
      || text.includes('voice-only')
      || text.includes('ask canvas')
      || text.includes('ask us')
    ) {
      return 'tcs-footer-search';
    }
    if (
      text.includes('©')
      || text.includes('tata consultancy')
      || text.includes('all rights reserved')
    ) {
      return 'tcs-footer-copyright';
    }
    if (
      text.includes('privacy')
      || text.includes('terms')
      || text.includes('cookie')
      || text.includes('legal')
    ) {
      return 'tcs-footer-legal-item';
    }

    if (index === 0) return 'tcs-footer-hamburger';
    if (index === 1) return 'tcs-footer-search';
    if (index === 2) return 'tcs-footer-cta';
    if (index === 3) return 'tcs-footer-copyright';
    if (index === 4) return 'tcs-footer-legal-item';

    return 'tcs-footer-cta';
  };

  // Process Authored Rows
  blockRows.forEach((row, index) => {
    const model = getModelType(row, index);
    const cells = [...row.children];

    if (model === 'tcs-footer-hamburger' && !hamburgerWrapperNode) {
      const authoredImg = cells[0]?.querySelector('img');
      const authoredIconSrc = authoredImg ? authoredImg.src : cells[0]?.textContent.trim();
      const ariaLabel = cells[1]?.textContent.trim()
        || cells[0]?.textContent.trim()
        || 'Open navigation menu';

      const isExternalOrPath = authoredIconSrc
        && (authoredImg || authoredIconSrc.startsWith('/') || authoredIconSrc.startsWith('http'));

      const hamburgerIconContent = authoredIconSrc && isExternalOrPath
        ? `<img src="${authoredIconSrc}" alt="" class="custom-hamburger-icon" />`
        : `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        `;

      row.className = 'tcs-footer-hamburger-wrapper';
      row.innerHTML = `
        <button class="tcs-footer-hamburger" aria-label="${ariaLabel}" aria-expanded="false" aria-controls="tcs-footer-nav-pills">
          <span class="icon-hamburger">
            ${hamburgerIconContent}
          </span>
          <span class="icon-close hidden">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </span>
        </button>
      `;
      hamburgerWrapperNode = row;
      hamburgerBtnNode = row.querySelector('.tcs-footer-hamburger');
    } else if (model === 'tcs-footer-search' && !searchBoxWrapperNode) {
      const variation = cells[0]?.textContent.trim().toLowerCase() || 'both';
      const placeholder = cells[1]?.textContent.trim() || 'Ask Canvas Search';

      row.className = `tcs-footer-search-box mode-${variation}`;
      searchBoxWrapperNode = row;

      const formEl = document.createElement('form');
      formEl.className = 'tcs-search-form';
      formEl.action = '#';
      formEl.setAttribute('role', 'search');

      let contentHtml = '';

      if (variation !== 'voice-only') {
        contentHtml += `<input type="text" class="tcs-search-input" placeholder="${placeholder}" aria-label="${placeholder}">`;
      }

      contentHtml += '<div class="tcs-footer-search-actions">';

      if (variation === 'both' || variation === 'voice-only') {
        contentHtml += `
          <button type="button" class="mic-btn" aria-label="Voice Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>`;
      }

      contentHtml += `
        <button type="submit" class="submit-btn" aria-label="Submit Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button></div>`;

      formEl.innerHTML = contentHtml;
      row.innerHTML = '';
      row.append(formEl);

      const inputEl = formEl.querySelector('.tcs-search-input');
      const micBtn = formEl.querySelector('.mic-btn');

      if (inputEl) {
        inputEl.addEventListener('input', (e) => {
          searchQueryVariable = e.target.value;
        });
      }

      formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        if (inputEl) searchQueryVariable = inputEl.value;
        // eslint-disable-next-line no-console
        console.log('Search Query Variable:', searchQueryVariable);
      });

      if (micBtn && inputEl) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;

          micBtn.addEventListener('click', (e) => {
            e.preventDefault();
            micBtn.classList.add('listening');
            try {
              recognition.start();
            } catch (err) {
              micBtn.classList.remove('listening');
            }
          });

          const stopListening = () => micBtn.classList.remove('listening');

          recognition.onresult = (e) => {
            stopListening();
            const { transcript } = e.results[0][0];
            inputEl.value = transcript;
            searchQueryVariable = transcript;
          };

          recognition.onerror = stopListening;
          recognition.onend = stopListening;
        } else {
          micBtn.style.display = 'none';
        }
      }
    } else if (model === 'tcs-footer-cta') {
      const label = cells[0]?.textContent.trim() || 'Click here';
      const link = formatHtmlPath(cells[1]?.querySelector('a')?.href || '#');
      const target = cells[2]?.textContent.trim() || '_self';

      row.className = 'tcs-footer-cta-item';
      const ctaBtn = document.createElement('a');
      ctaBtn.className = 'tcs-footer-cta-btn';
      ctaBtn.href = link;
      ctaBtn.target = target;
      ctaBtn.innerHTML = `<span>${label}</span><span class="arrow" aria-hidden="true">→</span>`;

      if (cells[0]) moveInstrumentation(cells[0], ctaBtn);
      row.innerHTML = '';
      row.append(ctaBtn);
      ctaRow.append(row);
    } else if (model === 'tcs-footer-copyright') {
      row.className = 'tcs-footer-copyright';
      row.innerHTML = cells[0]?.innerHTML || '©TATA Consultancy Services';
      bottomRow.prepend(row);
    } else if (model === 'tcs-footer-legal-item') {
      const label = cells[0]?.textContent.trim() || 'Privacy & Terms';
      const link = formatHtmlPath(cells[1]?.querySelector('a')?.href || '#');
      const target = cells[2]?.textContent.trim() || '_self';

      row.className = 'tcs-footer-legal-item-wrapper';
      const legalLink = document.createElement('a');
      legalLink.className = 'tcs-footer-legal-link';
      legalLink.href = link;
      legalLink.target = target;
      legalLink.textContent = label;

      if (cells[0]) moveInstrumentation(cells[0], legalLink);
      row.innerHTML = '';
      row.append(legalLink);
      legalNav.append(row);
    }
  });

  if (subMenuPanel) floatingNav.append(subMenuPanel);
  if (hamburgerWrapperNode) searchRow.append(hamburgerWrapperNode);
  if (searchBoxWrapperNode) searchRow.append(searchBoxWrapperNode);

  if (searchRow.children.length > 0) floatingNav.append(searchRow);
  floatingNav.append(navPillsRow);

  if (floatingNav.children.length > 0) {
    navAnchorNode.append(floatingNav);
  }

  if (ctaRow.children.length > 0) footerContainer.append(ctaRow);
  if (legalNav.children.length > 0) bottomRow.append(legalNav);
  if (bottomRow.children.length > 0) footerContainer.append(bottomRow);

  block.textContent = '';
  block.append(footerContainer);

  /**
   * Updates button states
   */
  const updateButtonStateAndPosition = (level) => {
    if (!hamburgerBtnNode || !hamburgerWrapperNode) return;

    const hamburgerIcon = hamburgerBtnNode.querySelector('.icon-hamburger');
    const closeIcon = hamburgerBtnNode.querySelector('.icon-close');

    if (level === 'L1') {
      hamburgerWrapperNode.classList.remove('hidden');
      searchRow.prepend(hamburgerWrapperNode);
      if (hamburgerIcon) hamburgerIcon.classList.add('hidden');
      if (closeIcon) closeIcon.classList.remove('hidden');
    } else if (level === 'L2') {
      hamburgerWrapperNode.classList.remove('hidden');
      navPillsRow.prepend(hamburgerWrapperNode);
      if (hamburgerIcon) hamburgerIcon.classList.remove('hidden');
      if (closeIcon) closeIcon.classList.add('hidden');
    } else if (level === 'L3') {
      hamburgerWrapperNode.classList.add('hidden');
    }

    if (searchBoxWrapperNode) {
      searchBoxWrapperNode.classList.remove('hidden');
    }
  };

  /**
   * Submenu Panel Renderer (Displays L3 Options on L2 Hover/Selection)
   */
  const renderSubmenuCard = (items) => {
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
            <span class="arrow" aria-hidden="true">→</span>
          </a>
        `,
    )
    .join('')}
      </div>
    `;

    subMenuPanel.classList.remove('hidden');

    subMenuPanel.querySelectorAll('.tcs-submenu-item').forEach((link) => {
      link.addEventListener('click', () => {
        subMenuPanel.classList.add('hidden');
      });
    });
  };

  /**
   * Requirement 2: L2 Navigation View
   */
  const renderL2SubNavigation = (l1Data) => {
    navPillsRow.innerHTML = '';
    subMenuPanel.classList.add('hidden');
    updateButtonStateAndPosition('L2');

    const l2Group = document.createElement('div');
    l2Group.className = 'tcs-l2-pills-group';

    l1Data.children.forEach((l2) => {
      const l2Pill = document.createElement('div');
      l2Pill.className = 'tcs-nav-pill l2-pill';
      const hasL3 = l2.children && l2.children.length > 0;

      const chevIconHtml = hasL3
        ? `<button class="chevron-btn" aria-label="Expand subpages for ${l2.title}">${getChevronSvg()}</button>`
        : '';

      l2Pill.innerHTML = `
        <a href="${l2.path}" class="tcs-pill-link">${l2.title}</a>
        ${chevIconHtml}
      `;

      const toggleSubmenu = (e) => {
        if (hasL3) {
          e?.preventDefault();
          const isActive = l2Pill.classList.contains('active');
          l2Group
            .querySelectorAll('.tcs-nav-pill')
            .forEach((p) => p.classList.remove('active'));

          if (isActive) {
            subMenuPanel.classList.add('hidden');
          } else {
            l2Pill.classList.add('active');
            renderSubmenuCard(l2.children);
          }
        }
      };

      l2Pill.addEventListener('mouseenter', () => {
        if (hasL3) {
          l2Group.querySelectorAll('.tcs-nav-pill').forEach((p) => p.classList.remove('active'));
          l2Pill.classList.add('active');
          renderSubmenuCard(l2.children);
        }
      });

      l2Pill.addEventListener('click', (e) => {
        if (hasL3 && !e.target.closest('a')) {
          toggleSubmenu(e);
        }
      });

      const chevronBtn = l2Pill.querySelector('.chevron-btn');
      if (chevronBtn) {
        chevronBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSubmenu(e);
        });
      }

      l2Group.append(l2Pill);
    });

    navPillsRow.append(l2Group);
    navPillsRow.classList.remove('hidden');
  };

  /**
   * Requirement 1: L1 Navigation View
   */
  const renderL1ParentNavigation = async () => {
    navPillsRow.innerHTML = '';
    subMenuPanel.classList.add('hidden');
    updateButtonStateAndPosition('L1');

    if (!navTreeData) {
      navTreeData = await fetchHierarchicalNavData();
    }

    navTreeData.forEach((l1) => {
      const l1Pill = document.createElement('div');
      l1Pill.className = 'tcs-nav-pill';

      l1Pill.innerHTML = `<a href="${l1.path}" class="tcs-pill-link">${l1.title}</a>`;

      const linkEl = l1Pill.querySelector('.tcs-pill-link');
      if (linkEl) {
        linkEl.addEventListener('click', () => {
          window.location.href = l1.path;
        });
      }

      navPillsRow.append(l1Pill);
    });

    navPillsRow.classList.remove('hidden');
  };

  /**
   * Requirement 3: L3 Page Behavior
   * - Places Back Arrow horizontally beside suggestion pills in the same row (fig-2)
   */
  const renderL3SuggestionsView = (suggestionsList = []) => {
    navPillsRow.innerHTML = '';
    subMenuPanel.classList.add('hidden');
    updateButtonStateAndPosition('L3');

    const l3Container = document.createElement('div');
    l3Container.className = 'tcs-l3-suggestions-wrapper';
    l3Container.style.display = 'flex';
    l3Container.style.alignItems = 'center';
    l3Container.style.justifyContent = 'center';
    l3Container.style.gap = '12px';

    const backBtn = document.createElement('button');
    backBtn.className = 'tcs-nav-back-btn';
    backBtn.setAttribute('aria-label', 'Return to parent page');
    backBtn.innerHTML = getArrowLeftSvg();

    backBtn.addEventListener('click', () => {
      const pageInfo = getCurrentPageInfo();
      if (pageInfo.parentPath) {
        window.location.href = pageInfo.parentPath;
      } else {
        window.history.back();
      }
    });

    l3Container.append(backBtn);

    const pillsGroup = document.createElement('div');
    pillsGroup.className = 'tcs-l3-pills-group';
    pillsGroup.style.display = 'flex';
    pillsGroup.style.alignItems = 'center';
    pillsGroup.style.gap = '8px';

    suggestionsList.forEach((suggestion) => {
      const sugText = typeof suggestion === 'string' ? suggestion : (suggestion.title || suggestion.key || '');
      if (!sugText) return;

      const sugPill = document.createElement('button');
      sugPill.className = 'tcs-nav-pill l3-suggestion-pill';
      sugPill.type = 'button';
      sugPill.textContent = sugText;

      sugPill.addEventListener('click', () => {
        const searchInput = searchBoxWrapperNode?.querySelector('.tcs-search-input');
        if (searchInput) {
          searchInput.value = sugText;
          searchQueryVariable = sugText;
          searchInput.focus();
        }
      });

      pillsGroup.append(sugPill);
    });

    l3Container.append(pillsGroup);
    navPillsRow.append(l3Container);
    navPillsRow.classList.remove('hidden');
  };

  /**
   * Auto-detect level and render corresponding navigation view based on URL path
   */
  const renderCurrentPageNavigation = async () => {
    if (!navTreeData) {
      navTreeData = await fetchHierarchicalNavData();
    }

    const { depth, l1Key, l2Key } = getCurrentPageInfo();

    if (depth >= 3) {
      const matchedL1 = navTreeData.find((l1) => l1.key === l1Key) || navTreeData[0];
      let suggestions = [];

      if (matchedL1) {
        const matchedL2 = matchedL1.children.find((l2) => l2.key === l2Key)
          || matchedL1.children[0];
        if (matchedL2 && matchedL2.children && matchedL2.children.length > 0) {
          suggestions = matchedL2.children;
        } else if (matchedL1.children && matchedL1.children.length > 0) {
          suggestions = matchedL1.children;
        }
      }

      renderL3SuggestionsView(suggestions);
    } else if (depth === 1 || depth === 2) {
      const matchedL1 = navTreeData.find((l1) => l1.key === l1Key) || navTreeData[0];
      if (matchedL1 && matchedL1.children && matchedL1.children.length > 0) {
        renderL2SubNavigation(matchedL1);
      } else {
        await renderL1ParentNavigation();
      }
    } else {
      await renderL1ParentNavigation();
    }
  };

  const closeAllNavigation = () => {
    isNavOpen = false;

    if (hamburgerWrapperNode) {
      searchRow.prepend(hamburgerWrapperNode);
    }
    if (searchBoxWrapperNode) searchBoxWrapperNode.classList.remove('hidden');

    if (hamburgerBtnNode) {
      hamburgerBtnNode.setAttribute('aria-expanded', 'false');
      hamburgerBtnNode.querySelector('.icon-hamburger')?.classList.remove('hidden');
      hamburgerBtnNode.querySelector('.icon-close')?.classList.add('hidden');
    }

    navPillsRow.classList.add('hidden');
    subMenuPanel.classList.add('hidden');
  };

  if (hamburgerBtnNode) {
    hamburgerBtnNode.addEventListener('click', async () => {
      const { depth, parentPath } = getCurrentPageInfo();

      if (depth >= 1 && isNavOpen) {
        window.location.href = parentPath;
        return;
      }

      if (!isNavOpen) {
        isNavOpen = true;
        hamburgerBtnNode.setAttribute('aria-expanded', 'true');
        await renderCurrentPageNavigation();
      } else {
        closeAllNavigation();
      }
    });
  }

  const initAutoNav = async () => {
    const { depth } = getCurrentPageInfo();
    if (depth >= 1) {
      isNavOpen = true;
      if (hamburgerBtnNode) hamburgerBtnNode.setAttribute('aria-expanded', 'true');
      await renderCurrentPageNavigation();
    }
  };
  initAutoNav();

  floatingNav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isNavOpen) {
      closeAllNavigation();
      hamburgerBtnNode?.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!floatingNav.contains(e.target)) {
      subMenuPanel.classList.add('hidden');
      navPillsRow
        .querySelectorAll('.tcs-nav-pill')
        .forEach((p) => p.classList.remove('active'));
    }
  });

  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const windowHeight = window.innerHeight;

        const heroSlotEl = document.querySelector('.hero-banner-sticky');
        const canvasSlotEl = document.querySelector('.canvas-block-search-slot');

        const isSlotVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.top < windowHeight && rect.bottom > 80;
        };

        const isHeroDocked = isSlotVisible(heroSlotEl);
        const isCanvasDocked = !isHeroDocked && isSlotVisible(canvasSlotEl);

        const footerRect = block.getBoundingClientRect();
        const isAtFooter = footerRect.top < windowHeight - 140;

        if (isHeroDocked && heroSlotEl) {
          if (floatingNav.parentElement !== heroSlotEl) {
            heroSlotEl.append(floatingNav);
          }
          floatingNav.classList.remove('is-fixed');
          floatingNav.classList.add('is-docked-slot');
        } else if (isCanvasDocked && canvasSlotEl) {
          if (floatingNav.parentElement !== canvasSlotEl) {
            canvasSlotEl.append(floatingNav);
          }
          floatingNav.classList.remove('is-fixed');
          floatingNav.classList.add('is-docked-slot');
        } else if (isAtFooter) {
          if (floatingNav.parentElement !== navAnchorNode) {
            navAnchorNode.append(floatingNav);
          }
          floatingNav.classList.remove('is-fixed', 'is-docked-slot');
        } else {
          if (floatingNav.parentElement !== navAnchorNode) {
            navAnchorNode.append(floatingNav);
          }
          floatingNav.classList.add('is-fixed');
          floatingNav.classList.remove('is-docked-slot');
        }

        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}
