/* eslint-disable linebreak-style -- Windows editor writes CRLF for this block. */

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
 * Add an accessible label to a spotlight card link.
 *
 * @param {Element} cell Link cell.
 * @param {Element} headline Headline cell.
 */
function enhanceCardLink(cell, headline) {
  const link = cell.querySelector('a');

  if (link && headline.textContent.trim()) {
    link.setAttribute(
      'aria-label',
      headline.textContent.trim(),
    );
  }
}

/**
 * Apply the Featured First variation.
 *
 * The first spotlight card becomes the featured card.
 *
 * @param {Element} block Spotlight block.
 */
function applyFeaturedFirst(block) {
  if (!block.classList.contains('featured-first')) {
    return;
  }

  const cards = block.querySelectorAll(
    '.spotlight-card',
  );

  if (cards.length > 0) {
    cards[0].classList.add(
      'spotlight-featured-card',
    );
  }
}

/**
 * Decorate Spotlight.
 *
 * @param {Element} block Spotlight block.
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const cells = [...row.children];

    /* Spotlight header */
    if (cells.length === 2) {
      row.classList.add('spotlight-header');

      cells[0].classList.add(
        'spotlight-heading',
      );

      decorateLink(
        cells[1],
        'spotlight-view-all',
      );

      return;
    }

    /* Spotlight card */
    if (cells.length >= 4) {
      row.classList.add('spotlight-card');

      /* Metadata container */
      const meta = document.createElement('div');

      meta.className = 'spotlight-meta';

      cells[0].classList.add(
        'spotlight-category',
      );

      cells[1].classList.add(
        'spotlight-eyebrow',
      );

      meta.append(
        cells[0],
        cells[1],
      );

      row.prepend(meta);

      /* Headline */
      cells[2].classList.add(
        'spotlight-headline',
      );

      /* Card link */
      const link = decorateLink(
        cells[3],
        'spotlight-card-link',
      );

      enhanceCardLink(
        cells[3],
        cells[2],
      );

      if (link) {
        link.setAttribute(
          'aria-label',
          cells[2].textContent.trim(),
        );
      }
    }
  });

  /*
   * Apply Featured First only when
   * that variation is selected.
   */
  applyFeaturedFirst(block);
}
