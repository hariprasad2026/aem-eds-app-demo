import { moveInstrumentation } from '../../scripts/scripts.js';

function getOptions(block) {
  return [...block.classList].filter(
    (className) => !['block', 'table'].includes(className),
  );
}

/**
 * Read boolean options from the Universal Editor.
 *
 * Field order:
 * 1. Enable Sorting
 * 2. Enable Search
 * 3. Enable Sticky Header
 * 4. Enable Pagination
 */
function getBooleanOptions(block) {
  const booleanValues = [...block.children]
    .map((child) => child.textContent.trim().toLowerCase())
    .filter((value) => value === 'true' || value === 'false');

  return {
    sortable: booleanValues[0] === 'true',
    searchable: booleanValues[1] === 'true',
    stickyHeader: booleanValues[2] === 'true',
    pagination: booleanValues[3] === 'true',
  };
}

/**
 * Create the HTML table from the authored block.
 */
function createTable(block) {
  const table = document.createElement('table');
  table.setAttribute('role', 'table');

  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const noHeader = block.classList.contains('no-header');

  // Remove boolean configuration values from table rows.
  const rows = [...block.children].filter(
    (row) => !['true', 'false'].includes(
      row.textContent.trim().toLowerCase(),
    ),
  );

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');

    moveInstrumentation(row, tr);

    [...row.children].forEach((cell) => {
      const isHeader = rowIndex === 0 && !noHeader;
      const td = document.createElement(isHeader ? 'th' : 'td');

      if (isHeader) {
        td.setAttribute('scope', 'col');
      }

      td.innerHTML = cell.innerHTML;
      tr.append(td);
    });

    if (rowIndex === 0 && !noHeader) {
      thead.append(tr);
    } else {
      tbody.append(tr);
    }
  });

  table.append(thead, tbody);

  return table;
}

/**
 * Add sortable functionality.
 */
function enableSorting(table) {
  const headers = table.querySelectorAll('thead th');

  headers.forEach((header, columnIndex) => {
    header.classList.add('table-sortable-header');

    header.setAttribute('tabindex', '0');
    header.setAttribute('role', 'button');
    header.setAttribute('aria-sort', 'none');

    const indicator = document.createElement('span');

    indicator.className = 'table-sort-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.textContent = '↕';

    header.append(indicator);

    const sort = () => {
      const tbody = table.querySelector('tbody');

      if (!tbody) return;

      const rows = [...tbody.querySelectorAll('tr')];

      const currentDirection = header.dataset.sortDirection;

      const direction = currentDirection === 'ascending'
        ? 'descending'
        : 'ascending';

      headers.forEach((item) => {
        item.dataset.sortDirection = '';
        item.setAttribute('aria-sort', 'none');

        const itemIndicator = item.querySelector(
          '.table-sort-indicator',
        );

        if (itemIndicator) {
          itemIndicator.textContent = '↕';
        }
      });

      header.dataset.sortDirection = direction;
      header.setAttribute('aria-sort', direction);

      indicator.textContent = direction === 'ascending'
        ? '↑'
        : '↓';

      rows.sort((rowA, rowB) => {
        const cellA = rowA.children[columnIndex];
        const cellB = rowB.children[columnIndex];

        const valueA = cellA
          ? cellA.textContent.trim().toLowerCase()
          : '';

        const valueB = cellB
          ? cellB.textContent.trim().toLowerCase()
          : '';

        return direction === 'ascending'
          ? valueA.localeCompare(
            valueB,
            undefined,
            {
              numeric: true,
              sensitivity: 'base',
            },
          )
          : valueB.localeCompare(
            valueA,
            undefined,
            {
              numeric: true,
              sensitivity: 'base',
            },
          );
      });

      rows.forEach((row) => tbody.append(row));
    };

    header.addEventListener('click', sort);

    header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        sort();
      }
    });
  });
}

/**
 * Add searchable functionality.
 */
function enableSearch(block, table) {
  const searchWrapper = document.createElement('div');

  searchWrapper.className = 'table-search';

  const label = document.createElement('label');

  label.className = 'table-search-label';
  label.setAttribute('for', `table-search-${Date.now()}`);
  label.textContent = 'Search table';

  const input = document.createElement('input');

  input.type = 'search';
  input.id = label.htmlFor;
  input.className = 'table-search-input';
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search table');

  searchWrapper.append(label, input);

  block.prepend(searchWrapper);

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();

    table.querySelectorAll('tbody tr').forEach((row) => {
      const rowText = row.textContent.toLowerCase();

      row.hidden = query.length > 0 && !rowText.includes(query);
    });
  });
}

/**
 * Add responsive card presentation.
 */
function enableResponsiveCards(table) {
  const headers = [...table.querySelectorAll('thead th')]
    .map((header) => header.textContent.trim());

  table.querySelectorAll('tbody tr').forEach((row) => {
    [...row.children].forEach((cell, index) => {
      if (headers[index]) {
        cell.setAttribute('data-label', headers[index]);
      }
    });
  });
}

/**
 * Add accessibility metadata.
 */
function enhanceAccessibility(table) {
  const headers = table.querySelectorAll('thead th');

  headers.forEach((header) => {
    if (!header.id) {
      header.id = `table-header-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
    }
  });
}

/**
 * Enable sticky table header.
 */
function enableStickyHeader(table) {
  const wrapper = document.createElement('div');

  wrapper.className = 'table-scroll-container';

  table.parentNode.insertBefore(wrapper, table);
  wrapper.append(table);

  table.classList.add('table-sticky-header');
}

/**
 * Add pagination functionality.
 */
function enablePagination(block, table) {
  const tbody = table.querySelector('tbody');

  if (!tbody) return;

  const rows = [...tbody.querySelectorAll('tr')];
  const rowsPerPage = 5;

  // Do not show pagination when all rows fit on one page.
  if (rows.length <= rowsPerPage) return;

  let currentPage = 1;

  const totalPages = Math.ceil(rows.length / rowsPerPage);

  const pagination = document.createElement('div');
  pagination.className = 'table-pagination';

  const info = document.createElement('div');
  info.className = 'table-pagination-info';

  const controls = document.createElement('div');
  controls.className = 'table-pagination-controls';

  const previousButton = document.createElement('button');

  previousButton.type = 'button';
  previousButton.className = 'table-pagination-button';
  previousButton.textContent = 'Previous';

  const nextButton = document.createElement('button');

  nextButton.type = 'button';
  nextButton.className = 'table-pagination-button';
  nextButton.textContent = 'Next';

  const pageNumbers = document.createElement('div');
  pageNumbers.className = 'table-pagination-pages';

  controls.append(
    previousButton,
    pageNumbers,
    nextButton,
  );

  pagination.append(
    info,
    controls,
  );

  block.append(pagination);

  function renderPage() {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    rows.forEach((row, index) => {
      row.hidden = index < start || index >= end;
    });

    info.textContent = `Showing ${start + 1}-${Math.min(
      end,
      rows.length,
    )} of ${rows.length}`;

    pageNumbers.replaceChildren();

    for (let page = 1; page <= totalPages; page += 1) {
      const pageButton = document.createElement('button');

      pageButton.type = 'button';
      pageButton.className = 'table-pagination-button';
      pageButton.textContent = String(page);

      pageButton.setAttribute(
        'aria-label',
        `Go to page ${page}`,
      );

      if (page === currentPage) {
        pageButton.classList.add('active');
        pageButton.setAttribute(
          'aria-current',
          'page',
        );
      }

      pageButton.dataset.page = String(page);
      pageNumbers.append(pageButton);
    }

    previousButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
  }
  pageNumbers.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page');
    if (!button) return;
    currentPage = Number(button.dataset.page);
    renderPage();
  });

  previousButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderPage();
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      renderPage();
    }
  });

  renderPage();
}

/**
 * Main table decorator.
 *
 * @param {Element} block
 */
export default async function decorate(block) {
  const options = getOptions(block);
  const booleanOptions = getBooleanOptions(block);

  const table = createTable(block);

  block.replaceChildren(table);

  enhanceAccessibility(table);

  // Enable sorting when the Universal Editor toggle is ON.
  if (booleanOptions.sortable) {
    enableSorting(table);
  }

  // Enable search when the Universal Editor toggle is ON.
  if (booleanOptions.searchable) {
    enableSearch(block, table);
  }

  // Enable sticky header when the Universal Editor toggle is ON.
  if (booleanOptions.stickyHeader) {
    enableStickyHeader(table);
  }

  // Enable pagination when the Universal Editor toggle is ON.
  if (booleanOptions.pagination) {
    enablePagination(block, table);
  }

  // Enable responsive cards when selected as a table variation.
  if (options.includes('responsive-cards')) {
    enableResponsiveCards(table);
  }
}
