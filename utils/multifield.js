/**
 * Multifield utils: read composite multifields (Universal Editor "container" fields with
 * multi: true) the same way in every block.
 *
 * Items with a single element render as list items; items with several elements render as
 * runs of elements separated by <hr>s (https://www.aem.live/developer/component-model-definitions).
 */

/**
 * Splits a composite multifield cell into its items.
 * @param {Element} cell The property cell holding the multifield
 * @returns {Element[][]} the elements of each item, in field order
 */
// eslint-disable-next-line import/prefer-default-export
export function readMultifieldItems(cell) {
  if (!cell) return [];
  const list = cell.querySelector(':scope > ul');
  if (list) return [...list.children].map((li) => [li]);
  const items = [[]];
  [...cell.children].forEach((el) => {
    if (el.tagName === 'HR') items.push([]);
    else items[items.length - 1].push(el);
  });
  return items.filter((item) => item.length);
}
