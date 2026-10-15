/**
 * Icon button decorator: icon-only <button>s (play, close, carousel controls, share, submit),
 * built on the button decorator so they share its views, types and states.
 */
import { decorateButton } from './button-decorator.js';

/**
 * Creates an icon-only <button>; the label is its accessible name and tooltip.
 * @param {Object} options
 * @param {string} options.label accessible name
 * @param {string} options.icon icon name from /icons, e.g. "play"
 * @param {string} [options.type] primary | secondary (default) | tertiary
 * @param {string} [options.className] extra class names
 * @param {string} [options.buttonType] button (default) | submit
 * @param {Function} [options.onClick] click handler
 * @returns {HTMLButtonElement}
 */
// eslint-disable-next-line import/prefer-default-export
export function createIconButton({
  label, icon, type = 'secondary', className = '', buttonType = 'button', onClick,
}) {
  const button = document.createElement('button');
  button.type = buttonType;
  if (className) button.className = className;
  button.setAttribute('aria-label', label);
  if (onClick) button.addEventListener('click', onClick);
  return decorateButton(button, {
    view: 'icon', type, icon, title: label,
  });
}
