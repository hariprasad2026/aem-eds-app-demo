/**
 * Accessibility decorator: shared helpers for content that must stay available to assistive
 * technology. The .visually-hidden class is defined once in styles/styles.css.
 */

/**
 * Hides an element visually while keeping it for screen readers.
 * @param {Element} el
 * @returns {Element} the same element
 */
export function hideVisually(el) {
  el?.classList.add('visually-hidden');
  return el;
}

/**
 * Creates a visually hidden text element, e.g. a label or a table header for screen readers.
 * @param {string} text
 * @param {string} [tagName]
 * @returns {Element}
 */
export function createHiddenText(text, tagName = 'span') {
  const el = document.createElement(tagName);
  el.textContent = text;
  return hideVisually(el);
}
