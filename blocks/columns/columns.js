export default function decorate(block) {
  // 1. Get layout property from XWalk dataset attribute or fallback to inner text

  const layoutAttr = block.dataset.layout || '';

  if (layoutAttr) {
    const layoutClass = `columns-variant-${layoutAttr.toLowerCase().trim()}`;

    block.classList.add(layoutClass);
  }

  const rows = [...block.children];

  if (!rows.length) return;

  const columnCount = rows[0].children.length;

  block.classList.add(`columns-${columnCount}-cols`);

  rows.forEach((row) => {
    row.classList.add('columns-row');

    const columns = [...row.children];

    columns.forEach((column) => {
      column.classList.add('columns-col');

      const picture = column.querySelector('picture');

      const heading = column.querySelector('h1, h2, h3, h4, h5, h6');

      const list = column.querySelector('ul, ol');

      const hasBlock = column.querySelector('[class*="block"]');

      if (picture && column.children.length === 1) {
        column.classList.add('columns-img-col');
      }

      if (heading || list || hasBlock || column.querySelector('p')) {
        column.classList.add('columns-text-col');
      }

      if (list) {
        list.classList.add('columns-link-list');

        [...list.querySelectorAll('a')].forEach((link) => {
          link.classList.add('columns-link');

          if (!link.querySelector('.columns-link-arrow')) {
            const arrow = document.createElement('span');

            arrow.className = 'columns-link-arrow';

            arrow.setAttribute('aria-hidden', 'true');

            arrow.textContent = '→';

            link.appendChild(arrow);
          }
        });
      }
    });

    // Handle standard two-column automatic variant detection if no explicit layout selected

    if (columns.length === 2 && !layoutAttr) {
      const [firstCol, secondCol] = columns;

      const firstColumnHasImage = firstCol.querySelector('picture');

      const secondColumnHasHeading = secondCol.querySelector('h1, h2, h3, h4, h5, h6');

      const secondColumnHasList = secondCol.querySelector('ul, ol');

      if (firstColumnHasImage && secondColumnHasHeading) {
        block.classList.add('columns-variant-image-copy');
      }

      if (secondColumnHasList && secondCol.querySelector('p')) {
        block.classList.add('columns-variant-content-links');
      }
    }
  });
}
