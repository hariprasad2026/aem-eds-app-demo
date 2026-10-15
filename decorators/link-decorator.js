/**
 * Link decorator: link behavior shared by buttons, link lists and plain links.
 */
import { createHiddenText } from './a11y-decorator.js';

/**
 * Opens a link in a new tab (or back in the same tab).
 * @param {HTMLAnchorElement} a
 * @param {boolean} [newWindow]
 */
export function setLinkTarget(a, newWindow = true) {
  if (a?.tagName !== 'A') return;
  if (newWindow) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  } else {
    a.removeAttribute('target');
    a.removeAttribute('rel');
  }
}

/**
 * Tells screen reader users that a link opens in a new tab (WCAG 3.2.5): visually hidden text,
 * or added to the link's aria-label when it has one (which replaces its text).
 * @param {HTMLAnchorElement} a
 * @param {string} hint e.g. t('opensInNewTab', '(opens in a new tab)')
 */
export function announceNewTab(a, hint) {
  if (!a || !hint) return;
  const label = a.getAttribute('aria-label');
  if (label) a.setAttribute('aria-label', `${label} ${hint}`);
  else a.append(createHiddenText(` ${hint}`));
}
