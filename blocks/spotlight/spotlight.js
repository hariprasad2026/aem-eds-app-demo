/* eslint-disable linebreak-style -- Windows editor writes CRLF for this block. */
function decorateLink(cell, className) {
  cell.classList.add(className);
  const link = cell.querySelector('a');
  if (link) link.classList.remove('button', 'secondary');
  return link;
}

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const cells = [...row.children];

    if (cells.length === 2) {
      row.classList.add('spotlight-header');
      cells[0].classList.add('spotlight-heading');
      decorateLink(cells[1], 'spotlight-view-all');
      return;
    }

    if (cells.length >= 4) {
      row.classList.add('spotlight-card');
      const meta = document.createElement('div');
      meta.className = 'spotlight-meta';
      cells[0].classList.add('spotlight-category');
      cells[1].classList.add('spotlight-eyebrow');
      meta.append(cells[0], cells[1]);
      row.prepend(meta);

      cells[2].classList.add('spotlight-headline');
      const link = decorateLink(cells[3], 'spotlight-card-link');
      if (link && cells[2].textContent.trim()) {
        link.setAttribute('aria-label', cells[2].textContent.trim());
      }
    }
  });
}
