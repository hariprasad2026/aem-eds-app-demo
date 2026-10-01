/* eslint-disable linebreak-style, eol-last -- Windows editor writes CRLF. */
function decorateLink(cell, className) {
  cell.classList.add(className);
  const link = cell.querySelector('a');
  if (link) link.classList.remove('button', 'secondary');
  return link;
}

export default function decorate(block) {
  let cardIndex = 0;

  [...block.children].forEach((row) => {
    const cells = [...row.children];

    if (cells.length === 2) {
      row.classList.add('industry-list-header');
      cells[0].classList.add('industry-list-heading');
      decorateLink(cells[1], 'industry-list-explore');
      return;
    }

    if (cells.length >= 4) {
      cardIndex += 1;
      row.classList.add('industry-list-card');
      cells[0].classList.add('industry-list-number');
      if (!cells[0].textContent.trim()) {
        const number = document.createElement('span');
        number.textContent = String(cardIndex).padStart(2, '0');
        cells[0].append(number);
      }
      cells[1].classList.add('industry-list-title');
      cells[2].classList.add('industry-list-description');
      const link = decorateLink(cells[3], 'industry-list-link');
      if (link && cells[1].textContent.trim()) {
        link.setAttribute('aria-label', cells[1].textContent.trim());
      }
    }
  });
}