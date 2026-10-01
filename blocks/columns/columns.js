export default function decorate(block) {
  const rows = [...block.children];

  if (!rows.length) {
    return;
  }

  const columnCount = rows[0].children.length;
  block.classList.add(`columns-${columnCount}-cols`);

  rows.forEach((row) => {
    const columns = [...row.children];

    columns.forEach((column) => {
      column.classList.add('columns-col');

      const picture = column.querySelector('picture');
      const heading = column.querySelector('h1, h2, h3, h4, h5, h6');
      const list = column.querySelector('ul, ol');

      if (picture) {
        const pictureWrapper = picture.closest('div');
        if (pictureWrapper && pictureWrapper.children.length === 1) {
          pictureWrapper.classList.add('columns-img-col');
        }
      }

      if (heading || list || column.querySelector('p')) {
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

    if (columns.length === 2) {
      const [firstCol, secondCol] = columns;
      const firstColumnHasImage = firstCol.querySelector('picture');
      const secondColumnHasHeading = secondCol.querySelector('h1, h2, h3, h4, h5, h6');
      const secondColumnHasList = secondCol.querySelector('ul, ol');
      const secondColumnHasTextAfterList = secondCol.querySelector('p:last-of-type');

      if (firstColumnHasImage && secondColumnHasHeading) {
        block.classList.add('columns-variant-image-copy');
      }

      if (secondColumnHasList && secondCol.querySelector('p')) {
        block.classList.add('columns-variant-content-links');
      }

      if (secondColumnHasList && secondColumnHasTextAfterList) {
        block.classList.add('columns-variant-followup-copy');
      }
    }
  });
}
