/*
 * Button decorator: the single place for the site's button views, types, alignment and states,
 * so any block can render buttons the same way (TCS.com DS Figma "Buttons" page).
 *
 * Views: button | icon | link
 * Types (button and icon views): primary | secondary | tertiary
 * States: default and hover are styled in styles/styles.css; disabled is set in code with
 * setButtonDisabled() or the `disabled` option, and styled for every view and type.
 * Alignment: left | center | right, applied to the element containing the button.
 *
 * Related: icon-button-decorator.js (icon-only buttons), content-buttons-decorator.js
 * (authored links in content), utils/buttons.js (vocabulary and reading options).
 */
import {
  BUTTON_ALIGNMENTS, BUTTON_TYPES, BUTTON_VIEWS, pick,
} from '../utils/buttons.js';
import { setLinkTarget } from './link-decorator.js';

const BUTTON_CLASSES = ['button', 'icon-button', 'link-button', ...BUTTON_TYPES];
const ALIGNMENT_CLASSES = BUTTON_ALIGNMENTS.map((alignment) => `button-align-${alignment}`);

function preventWhenDisabled(e) {
  if (e.currentTarget.getAttribute('aria-disabled') === 'true') {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}

/**
 * Sets or clears the disabled state of a button or link button.
 * Anchors keep their href so they stay styled, but can't be clicked or tabbed to.
 * @param {HTMLAnchorElement|HTMLButtonElement} button
 * @param {boolean} [disabled]
 */
export function setButtonDisabled(button, disabled = true) {
  if (button.tagName === 'BUTTON') {
    button.disabled = disabled;
    return;
  }
  if (disabled) {
    button.setAttribute('aria-disabled', 'true');
    button.tabIndex = -1;
    button.addEventListener('click', preventWhenDisabled);
  } else {
    button.removeAttribute('aria-disabled');
    button.removeAttribute('tabindex');
  }
}

/**
 * Aligns the buttons inside a container (e.g. a paragraph or a block cell).
 * @param {Element} container
 * @param {string} alignment left | center | right
 */
export function setButtonAlignment(container, alignment) {
  const value = pick(alignment, BUTTON_ALIGNMENTS);
  if (!container || !value) return;
  container.classList.remove(...ALIGNMENT_CLASSES);
  container.classList.add(`button-align-${value}`);
}

/**
 * Turns a decorated button back into a plain link (e.g. a logo link in the header):
 * removes the view, type and icon, and the wrapper and alignment classes of its paragraph.
 * @param {HTMLAnchorElement|HTMLButtonElement} button
 */
export function removeButtonDecoration(button) {
  if (!button) return;
  button.classList.remove(...BUTTON_CLASSES);
  button.style.removeProperty('--icon-url');
  if (!button.classList.length) button.removeAttribute('class');
  const wrapper = button.closest('.button-wrapper');
  if (wrapper) {
    wrapper.classList.remove('button-wrapper', ...ALIGNMENT_CLASSES);
    if (!wrapper.classList.length) wrapper.removeAttribute('class');
  }
}

/**
 * Makes a button icon-only: the icon is drawn from /icons/<name>.svg and the text,
 * if any, becomes the accessible name.
 */
function applyIcon(button, iconName) {
  const span = button.querySelector(':scope > span.icon');
  const name = iconName
    || [...(span?.classList || [])].find((c) => c.startsWith('icon-'))?.substring(5);
  if (!name) return;
  const label = button.getAttribute('aria-label') || button.textContent.trim()
    || button.title || name.replace(/-/g, ' ');
  // keep text for assistive technology only; spans are hidden in icon buttons
  [...button.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
    .forEach((node) => {
      const hidden = document.createElement('span');
      hidden.textContent = node.textContent;
      node.replaceWith(hidden);
    });
  button.classList.add('icon-button');
  button.setAttribute('aria-label', label);
  if (!button.title) button.title = label;
  button.style.setProperty('--icon-url', `url('${window.hlx.codeBasePath}/icons/${name}.svg')`);
}

/**
 * Applies a view, type and state to an existing link or button element.
 * @param {HTMLAnchorElement|HTMLButtonElement} button
 * @param {Object} [options]
 * @param {string} [options.view] button (default) | icon | link
 * @param {string} [options.type] primary (default) | secondary | tertiary; ignored for link
 * @param {string} [options.icon] icon name for the icon view, e.g. "search"
 * @param {string} [options.title] tooltip / title
 * @param {boolean} [options.newWindow] open the link in a new tab
 * @param {boolean} [options.disabled] render the disabled state
 * @returns {HTMLAnchorElement|HTMLButtonElement} the same element
 */
export function decorateButton(button, options = {}) {
  const view = pick(options.view, BUTTON_VIEWS, 'button');
  const type = pick(options.type, BUTTON_TYPES, 'primary');

  button.classList.remove(...BUTTON_CLASSES);
  button.style.removeProperty('--icon-url');
  if (view === 'link') {
    button.classList.add('link-button');
  } else {
    button.classList.add('button', type);
    if (view === 'icon') applyIcon(button, options.icon);
  }

  if (options.title) button.title = options.title;
  if (options.newWindow) setLinkTarget(button);
  if (options.disabled !== undefined) setButtonDisabled(button, options.disabled);
  return button;
}

/**
 * Creates a link styled as a button, icon button or link button.
 * @param {Object} options decorateButton() options, plus:
 * @param {string} options.href link target
 * @param {string} [options.text] visible text (the accessible name for the icon view)
 * @returns {HTMLAnchorElement}
 */
export function createButton({ href, text = '', ...options }) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text || href;
  return decorateButton(a, options);
}
