/**
 * Content buttons decorator: turns standalone authored links in page content into buttons,
 * reading the button options from the authored markup (utils/buttons.js).
 */
import { readButtonOptions } from '../utils/buttons.js';
import { decorateButton, setButtonAlignment } from './button-decorator.js';

/**
 * Turns standalone authored links into buttons:
 * - formatted links (bold / italic / bold + italic) or links with a Type: buttons
 * - icon-only formatted links: icon buttons (unformatted icon links stay plain)
 * - other standalone links: link buttons
 * Inline links, links showing their own URL and image links are left alone.
 * @param {Element} container
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateButtons(container) {
  container.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();
    const options = readButtonOptions(a);

    // quick structural checks
    if ((a.querySelector('img') && !options.icon) || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (!options.icon && new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // unformatted icon-only links stay plain
    if (options.icon && !options.type && !options.view) return;

    const view = options.view || (options.icon && 'icon') || (options.type ? 'button' : 'link');

    // drop the bold / italic formatting that encoded the type
    const formatting = [a.closest('strong'), a.closest('em')]
      .filter((el) => el && p.contains(el))
      .sort((x, y) => (x.contains(y) ? -1 : 1))[0];
    if (formatting) formatting.replaceWith(a);

    p.className = 'button-wrapper';
    setButtonAlignment(p, options.alignment);
    decorateButton(a, { view, type: options.type, icon: options.icon });
  });
}
