/* eslint-disable linebreak-style, eol-last -- Windows editor writes CRLF. */

const MAX_CARDS = 4;

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
 * Add accessibility label to a table-list card link.
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
 * Apply the Featured Industry variation.
 *
 * The first table-list card becomes the featured card.
 *
 * @param {Element} block Table List block.
 */
function applyFeaturedIndustry(block) {
  if (!block.classList.contains('featured-industry')) {
    return;
  }

  const cards = block.querySelectorAll(
    '.table-list-card',
  );

  if (cards.length > 0) {
    cards[0].classList.add(
      'table-list-card-featured',
    );
  }
}

/**
 * Decorate Table List.
 *
 * Maximum 4 Table List Cards are allowed.
 *
 * @param {Element} block Table List block.
 */
export default function decorate(block) {
  let cardIndex = 0;
  let cardCount = 0;

  [...block.children].forEach((row) => {
    const cells = [...row.children];

    /* Table List header */
    if (cells.length === 2) {
      row.classList.add('table-list-header');

      cells[0].classList.add(
        'table-list-heading',
      );

      decorateLink(
        cells[1],
        'table-list-explore',
      );

      return;
    }

    /* Table List card */
    if (cells.length >= 4) {
      cardCount += 1;

      /*
       * Maximum 4 cards are allowed.
       * If a fifth card exists, remove it
       * from the rendered Table List.
       */
      if (cardCount > MAX_CARDS) {
        row.remove();
        return;
      }

      cardIndex += 1;

      row.classList.add(
        'table-list-card',
      );

      /* Number */
      cells[0].classList.add(
        'table-list-number',
      );

      /*
       * Automatically generate 01, 02, 03...
       * when the author leaves Number empty.
       */
      if (!cells[0].textContent.trim()) {
        const number = document.createElement('span');

        number.textContent = String(
          cardIndex,
        ).padStart(2, '0');

        cells[0].append(number);
      }

      /* Title / Brand */
      cells[1].classList.add(
        'table-list-title',
      );

      /* Description */
      cells[2].classList.add(
        'table-list-description',
      );

      /* Link */
      decorateLink(
        cells[3],
        'table-list-link',
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