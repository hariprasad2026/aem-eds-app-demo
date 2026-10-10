import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Resolves content paths for AEM authoring/publishing environments
 * E.g., /praneeth/dummy-1 -> /content/2026/39/briskdeer43959/praneeth/dummy-1.html
 */
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
 * Parses query-index.json into a flexible multi-level tree structure.
 * Filters out utility, test, block, header, and home pages.
 */
async function fetchHierarchicalNavData() {
  try {
    const response = await fetch('/query-index.json');
    if (!response.ok) return [];
    const json = await response.json();
    const data = json.data || json;

    const navTree = {};
    const excludedPages = [
      'footer',
      'header',
      'tcs-footer',
      'tcs-header',
      'blocks',
      'test',
      'home',
      'home-page',
      'homepage',
      'demo',
      'nav',
      'iconlist',
    ];

    data.forEach((item) => {
      const rawPath = item.path || '';
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
    // eslint-disable-next-line no-console
    console.error('Failed to load navigation index:', error);
    return [];
  }
}

export default function decorate(block) {
  const blockRows = [...block.children];

  // 1. Heading Title
  const mainTitleRow = blockRows.shift();
  const titleText = mainTitleRow?.textContent.trim() || "Let's build the future together";

  const footerContainer = document.createElement('div');
  footerContainer.className = 'tcs-footer-container';

  const heading = document.createElement('h2');
  heading.className = 'tcs-footer-heading';
  heading.textContent = titleText;
  footerContainer.append(heading);

  // Floating Control Bar
  const floatingNav = document.createElement('div');
  floatingNav.className = 'tcs-footer-floating-nav';

  const searchRow = document.createElement('div');
  searchRow.className = 'tcs-footer-search-row';

  // Navigation Pill Row
  const navPillsRow = document.createElement('div');
  navPillsRow.className = 'tcs-footer-nav-pills-row hidden';

  // Submenu Panel
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

  let currentViewLevel = 'L1';
  let searchQueryVariable = '';

  const getModelType = (row) => {
    const model = row.getAttribute('data-aue-model') || row.dataset.aueModel;
    if (model) return model;

    const cells = row.children.length;
    if (cells === 1) {
      if (row.textContent.includes('©') || row.querySelector('p')) return 'tcs-footer-copyright';
      return 'tcs-footer-hamburger';
    }
    if (cells === 2) {
      const val = row.textContent.toLowerCase();
      if (val.includes('both') || val.includes('text-only') || val.includes('voice-only')) {
        return 'tcs-footer-search';
      }
      return 'tcs-footer-legal-item';
    }
    if (cells >= 3) {
      const firstCellVal = cells[0]?.textContent.trim().toLowerCase() || '';
      if (firstCellVal.includes('http') || firstCellVal.includes('/') || cells.length === 3) {
        return 'tcs-footer-legal-item';
      }
      return 'tcs-footer-cta';
    }
    return null;
  };

  // 2. Process Authored Items
  blockRows.forEach((row) => {
    const model = getModelType(row);
    const cells = [...row.children];

    if (model === 'tcs-footer-hamburger') {
      const ariaLabel = cells[0]?.textContent.trim() || 'Open navigation menu';
      row.className = 'tcs-footer-hamburger-wrapper';
      row.innerHTML = `
        <button class="tcs-footer-hamburger" aria-label="${ariaLabel}" aria-expanded="false">
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
        </button>
      `;
      hamburgerWrapperNode = row;
      hamburgerBtnNode = row.querySelector('.tcs-footer-hamburger');
      searchRow.prepend(row);
    } else if (model === 'tcs-footer-search') {
      const variation = cells[0]?.textContent.trim().toLowerCase() || 'both';
      const placeholder = cells[1]?.textContent.trim() || 'Ask Canvas Search';

      row.className = `tcs-footer-search-box mode-${variation}`;
      searchBoxWrapperNode = row;

      const formEl = document.createElement('form');
      formEl.className = 'tcs-search-form';
      formEl.action = '#';

      let contentHtml = '';

      if (variation !== 'voice-only') {
        contentHtml += `<input type="text" class="tcs-search-input" placeholder="${placeholder}" aria-label="Ask Canvas Search">`;
      }

      contentHtml += '<div class="tcs-footer-search-actions">';

      if (variation === 'both' || variation === 'voice-only') {
        contentHtml += `
          <button type="button" class="mic-btn" aria-label="Voice Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>`;
      }

      contentHtml += `
        <button type="submit" class="submit-btn" aria-label="Submit Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
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

        if (inputEl) {
          searchQueryVariable = inputEl.value;
        }

        // eslint-disable-next-line no-console
        console.log('Search Query Variable:', searchQueryVariable);

        window.location.hash = '#';
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
            recognition.start();
          });

          recognition.onresult = (e) => {
            micBtn.classList.remove('listening');
            const { transcript } = e.results[0][0];
            inputEl.value = transcript;
            searchQueryVariable = transcript;

            // eslint-disable-next-line no-console
            console.log('Search Query Variable (Voice):', searchQueryVariable);

            window.location.hash = '#';
          };

          recognition.onerror = () => {
            micBtn.classList.remove('listening');
          };

          recognition.onend = () => {
            micBtn.classList.remove('listening');
          };
        }
      }

      searchRow.append(row);
    } else if (model === 'tcs-footer-cta') {
      const label = cells[0]?.textContent.trim() || 'Click here';
      const link = formatHtmlPath(cells[1]?.querySelector('a')?.href || '#');
      const target = cells[2]?.textContent.trim() || '_self';

      row.className = 'tcs-footer-cta-item';
      const ctaBtn = document.createElement('a');
      ctaBtn.className = 'tcs-footer-cta-btn';
      ctaBtn.href = link;
      ctaBtn.target = target;
      ctaBtn.innerHTML = `<span>${label}</span><span class="arrow">→</span>`;

      moveInstrumentation(cells[0], ctaBtn);
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

      moveInstrumentation(cells[0], legalLink);
      row.innerHTML = '';
      row.append(legalLink);
      legalNav.append(row);
    }
  });

  // Assemble floating structure
  if (searchRow.children.length > 0) floatingNav.append(searchRow);
  floatingNav.append(navPillsRow);
  if (ctaRow.children.length > 0) floatingNav.append(ctaRow);

  if (floatingNav.children.length > 0) {
    footerContainer.append(subMenuPanel);
    footerContainer.append(floatingNav);
  }

  if (legalNav.children.length > 0) bottomRow.append(legalNav);
  if (bottomRow.children.length > 0) footerContainer.append(bottomRow);

  block.textContent = '';
  block.append(footerContainer);

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
            <span class="arrow">→</span>
          </a>
        `,
    )
    .join('')}
      </div>
    `;
    subMenuPanel.classList.remove('hidden');
  };

  const updateButtonStateAndPosition = (level) => {
    currentViewLevel = level;
    const hamburgerIcon = hamburgerBtnNode.querySelector('.icon-hamburger');
    const closeIcon = hamburgerBtnNode.querySelector('.icon-close');

    if (level === 'L1') {
      searchRow.prepend(hamburgerWrapperNode);
      if (searchBoxWrapperNode) searchBoxWrapperNode.classList.remove('hidden');
      hamburgerIcon.classList.add('hidden');
      closeIcon.classList.remove('hidden');
    } else {
      navPillsRow.prepend(hamburgerWrapperNode);
      if (searchBoxWrapperNode) searchBoxWrapperNode.classList.add('hidden');
      hamburgerIcon.classList.remove('hidden');
      closeIcon.classList.add('hidden');
    }
  };

  const renderL2SubNavigation = (l1Data) => {
    navPillsRow.innerHTML = '';
    updateButtonStateAndPosition('L2');

    const l2Group = document.createElement('div');
    l2Group.className = 'tcs-l2-pills-group';

    l1Data.children.forEach((l2) => {
      const l2Pill = document.createElement('div');
      l2Pill.className = 'tcs-nav-pill l2-pill';
      const hasL3 = l2.children && l2.children.length > 0;

      l2Pill.innerHTML = `
        <a href="${l2.path}" class="tcs-pill-link">${l2.title}</a>
        ${hasL3 ? '<button class="chevron-btn" aria-label="Expand subpages">∨</button>' : ''}
      `;

      const triggerL3View = (e) => {
        if (e) e.stopPropagation();
        l2Group.querySelectorAll('.tcs-nav-pill').forEach((p) => p.classList.remove('active'));
        l2Pill.classList.add('active');

        if (hasL3) {
          renderSubmenuCard(l2.children);
        } else {
          subMenuPanel.classList.add('hidden');
        }
      };

      l2Pill.addEventListener('mouseenter', triggerL3View);

      const chevronBtn = l2Pill.querySelector('.chevron-btn');
      if (chevronBtn) {
        chevronBtn.addEventListener('click', triggerL3View);
      }

      l2Group.append(l2Pill);
    });

    navPillsRow.append(l2Group);
    navPillsRow.classList.remove('hidden');
  };

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
      const hasL2 = l1.children && l1.children.length > 0;

      l1Pill.innerHTML = `
        <a href="${l1.path}" class="tcs-pill-link">${l1.title}</a>
        ${hasL2 ? '<button class="chevron-btn" aria-label="Expand subpages">∨</button>' : ''}
      `;

      const enterSubPageNavigation = (e) => {
        if (e) e.stopPropagation();
        if (!hasL2) return;

        renderL2SubNavigation(l1);
      };

      l1Pill.addEventListener('mouseenter', () => {
        if (hasL2) renderSubmenuCard(l1.children);
      });

      const chevronBtn = l1Pill.querySelector('.chevron-btn');
      if (chevronBtn) {
        chevronBtn.addEventListener('click', enterSubPageNavigation);
      }

      navPillsRow.append(l1Pill);
    });

    navPillsRow.classList.remove('hidden');
  };

  const closeAllNavigation = () => {
    isNavOpen = false;
    currentViewLevel = 'L1';

    searchRow.prepend(hamburgerWrapperNode);
    if (searchBoxWrapperNode) searchBoxWrapperNode.classList.remove('hidden');
    hamburgerBtnNode.setAttribute('aria-expanded', 'false');
    hamburgerBtnNode.querySelector('.icon-hamburger').classList.remove('hidden');
    hamburgerBtnNode.querySelector('.icon-close').classList.add('hidden');

    navPillsRow.classList.add('hidden');
    subMenuPanel.classList.add('hidden');
  };

  if (hamburgerBtnNode) {
    hamburgerBtnNode.addEventListener('click', async () => {
      if (currentViewLevel === 'L2' || currentViewLevel === 'L3') {
        await renderL1ParentNavigation();
        return;
      }

      if (!isNavOpen) {
        isNavOpen = true;
        hamburgerBtnNode.setAttribute('aria-expanded', 'true');
        await renderL1ParentNavigation();
      } else {
        closeAllNavigation();
      }
    });
  }

  footerContainer.addEventListener('mouseleave', () => {
    subMenuPanel.classList.add('hidden');
    navPillsRow.querySelectorAll('.tcs-nav-pill').forEach((p) => p.classList.remove('active'));
  });

  const handleScroll = () => {
    const footerRect = block.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    if (footerRect.top < windowHeight - 140) {
      floatingNav.classList.remove('is-fixed');
      subMenuPanel.classList.remove('is-fixed');
    } else {
      floatingNav.classList.add('is-fixed');
      subMenuPanel.classList.add('is-fixed');
    }
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll();
}
