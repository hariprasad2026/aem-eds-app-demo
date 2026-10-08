/**
 * Executes a search against the JSON query index.
 * @param {string} query
 * @param {Array} indexData
 * @returns {Array} Matched results
 */
function filterIndex(query, indexData) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return indexData.filter((item) => {
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const path = (item.path || '').toLowerCase();
    const keywords = (item.keywords || '').toLowerCase();
    return title.includes(q) || description.includes(q) || path.includes(q) || keywords.includes(q);
  });
}

/**
 * Renders result items in HTML format.
 * @param {Array} results
 * @returns {string} HTML string
 */
function renderResults(results) {
  if (results.length === 0) {
    return '<p class="search-no-results">No results found.</p>';
  }

  const items = results.slice(0, 10).map((res) => {
    const title = res.title || res.path;
    const desc = res.description ? `<p class="search-result-description">${res.description}</p>` : '';
    return `<li class="search-result-item"><a href="${res.path}" class="search-result-link"><span class="search-result-title">${title}</span>${desc}</a></li>`;
  }).join('');

  return `<ul class="search-results-list">${items}</ul>`;
}

/**
 * Main decorator function for the Search block.
 * @param {Element} block
 */
export default async function decorate(block) {
  // Extract values from DOM populated by Edge Delivery Services
  const indexCell = block.querySelector(':scope > div:nth-child(1) > div');
  const indexUrl = indexCell ? indexCell.textContent.trim() : '/query-index.json';

  // Clear existing raw markup
  block.innerHTML = '';

  // Create UI elements
  const container = document.createElement('div');
  container.className = 'search-input-wrapper';

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search...';
  input.className = 'search-input';
  input.setAttribute('aria-label', 'Search input');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'search-button';
  button.innerHTML = '<span class="search-icon">&#128269;</span>';
  button.setAttribute('aria-label', 'Search');

  const resultsWrapper = document.createElement('div');
  resultsWrapper.className = 'search-results';

  container.appendChild(input);
  container.appendChild(button);
  block.appendChild(container);
  block.appendChild(resultsWrapper);

  // Modal variation structure adjustments
  if (block.classList.contains('modal-search')) {
    const backdrop = document.createElement('div');
    backdrop.className = 'search-modal-backdrop';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'search-modal-close';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.setAttribute('aria-label', 'Close modal search');

    container.prepend(closeBtn);
    block.appendChild(backdrop);

    const toggleModal = (show) => {
      block.classList.toggle('is-active', show);
      if (show) input.focus();
    };

    closeBtn.addEventListener('click', () => toggleModal(false));
    backdrop.addEventListener('click', () => toggleModal(false));
  }

  // State management for index fetching
  let indexData = null;
  const fetchIndex = async () => {
    if (!indexData) {
      try {
        const resp = await fetch(indexUrl);
        if (resp.ok) {
          const json = await resp.json();
          indexData = json.data || json;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load search index:', err);
      }
    }
  };

  // Perform search handler
  const handleSearch = async () => {
    await fetchIndex();
    if (!indexData) return;
    const query = input.value;
    const matches = filterIndex(query, indexData);
    resultsWrapper.innerHTML = renderResults(matches);
  };

  // Event Listeners
  input.addEventListener('focus', fetchIndex);
  input.addEventListener('input', () => {
    if (input.value.length >= 2 || input.value.length === 0) {
      handleSearch();
    }
  });

  button.addEventListener('click', handleSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  });
}
