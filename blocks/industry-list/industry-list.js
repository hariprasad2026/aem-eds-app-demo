/* eslint-disable linebreak-style, eol-last -- Windows editor writes CRLF. */

/**
 * Decorate a link cell.
 *
 * @param {Element} cell Link cell.
 * @param {string} className CSS class.
 * @returns {HTMLAnchorElement|null} Link element.
 */
function decorateLink(cell, className) {
  cell.classList.add(className);

  const link = cell.querySelector('a');

  if (link) {
    link.classList.remove('button', 'secondary');
  }

  return link;
}

/**
 * Add accessibility label to an industry link.
 *
 * @param {Element} cell Link cell.
 * @param {Element} titleCell Title cell.
 */
function enhanceCardLink(cell, titleCell) {
  const link = cell.querySelector('a');

  if (link && titleCell.textContent.trim()) {
    link.setAttribute(
      'aria-label',
      titleCell.textContent.trim(),
    );
  }
}

/**
 * Apply the featured industry styling.
 *
 * The first industry card becomes the featured card.
 *
 * @param {Element} block Industry list block.
 */
function applyFeaturedIndustry(block) {
  if (!block.classList.contains('featured-industry')) {
    return;
  }

  const cards = block.querySelectorAll(
    '.industry-list-card',
  );

  if (cards.length > 0) {
    cards[0].classList.add(
      'industry-list-card-featured',
    );
  }
}

/**
 * Decorate Industry List.
 *
 * @param {Element} block Industry list block.
 */
export default function decorate(block) {
  let cardIndex = 0;

  [...block.children].forEach((row) => {
    const cells = [...row.children];

    /* Industry list header */
    if (cells.length === 2) {
      row.classList.add('industry-list-header');

      cells[0].classList.add(
        'industry-list-heading',
      );

      decorateLink(
        cells[1],
        'industry-list-explore',
      );

      return;
    }

    /* Industry list card */
    if (cells.length >= 4) {
      cardIndex += 1;

      row.classList.add(
        'industry-list-card',
      );

      /* Number */
      cells[0].classList.add(
        'industry-list-number',
      );

      if (!cells[0].textContent.trim()) {
        const number = document.createElement('span');

        number.textContent = String(
          cardIndex,
        ).padStart(2, '0');

        cells[0].append(number);
      }

      /* Title */
      cells[1].classList.add(
        'industry-list-title',
      );

      /* Description */
      cells[2].classList.add(
        'industry-list-description',
      );

      /* Link */
      decorateLink(
        cells[3],
        'industry-list-link',
      );

      enhanceCardLink(
        cells[3],
        cells[1],
      );
    }
  });

  /*
   * Apply Featured Industry after all
   * cards have been decorated.
   */
  applyFeaturedIndustry(block);
}