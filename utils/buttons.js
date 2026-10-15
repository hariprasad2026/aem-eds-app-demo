/**
 * Buttons utils: the button vocabulary (views, types, alignments) and reading button options
 * from authored link markup. The decorators in decorators/button-decorator.js apply them.
 */

export const BUTTON_VIEWS = ['button', 'icon', 'link'];
export const BUTTON_TYPES = ['primary', 'secondary', 'tertiary'];
export const BUTTON_ALIGNMENTS = ['left', 'center', 'right'];

/**
 * A value from an allowed list, normalized to lowercase.
 * @param {string} value
 * @param {string[]} allowed
 * @param {string} [fallback]
 */
export const pick = (value, allowed, fallback = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
};

/**
 * Reads the view, type, icon and alignment of an authored link from its markup:
 * - bold / italic / bold + italic formatting: primary / secondary / tertiary
 * - a link containing only an icon: icon view
 * - values from the Button component properties, as data attributes or classes of the link
 *   or its paragraph: a type class (primary), view-<view> and align-<alignment> classes, or
 *   view / type / alignment data values. A bare "button" class is not read as a view.
 * @param {HTMLAnchorElement} a
 * @returns {{ view: string, type: string, icon: string, alignment: string }}
 */
export function readButtonOptions(a) {
  const wrapper = a.closest('p');
  const classes = [...a.classList, ...(wrapper?.classList || [])].map((c) => c.toLowerCase());
  // skip Universal Editor instrumentation (data-aue-*, data-richtext-*), e.g. data-aue-label
  const data = [...Object.entries(a.dataset), ...Object.entries(wrapper?.dataset || {})]
    .filter(([key]) => !/^(aue|richtext)/.test(key))
    .map(([, value]) => String(value).trim().toLowerCase());
  const find = (allowed, prefix) => allowed.find((value) => data.includes(value)
    || classes.includes(prefix ? `${prefix}-${value}` : value)) || '';

  const strong = a.closest('strong');
  const em = a.closest('em');
  let formatted = '';
  if (strong && em) formatted = 'tertiary';
  else if (strong) formatted = 'primary';
  else if (em) formatted = 'secondary';

  const iconSpan = !a.textContent.trim() && a.children.length === 1
    && a.querySelector(':scope > span.icon');
  const icon = [...(iconSpan?.classList || [])].find((c) => c.startsWith('icon-'))?.substring(5)
    || a.dataset.buttonIcon || wrapper?.dataset.buttonIcon || '';

  return {
    view: find(BUTTON_VIEWS, 'view'),
    type: find(BUTTON_TYPES) || formatted,
    icon,
    alignment: find(BUTTON_ALIGNMENTS, 'align'),
  };
}
