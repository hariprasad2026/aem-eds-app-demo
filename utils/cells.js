/**
 * Cells utils: read the cells of block item rows (one cell per model field) when AEM may leave
 * out fields that were never set.
 */

const isEmpty = (cell) => !cell?.textContent.trim() && !cell?.querySelector('img, picture, a[href]');

/**
 * Matches the cells of a row to its model fields: a row with a cell per field is read in field
 * order; otherwise an empty cell keeps its field's place and a cell with a value goes to the
 * next field it fits (a field AEM left out is skipped).
 * @param {Element[]} cells
 * @param {string[]} fields the model's fields, in order (grouped fields count once)
 * @param {Object<string, (cell: Element) => boolean>} matchers what a value of each field is like
 * @returns {Object<string, Element>} the cell of each field found
 */
// eslint-disable-next-line import/prefer-default-export
export function matchCells(cells, fields, matchers) {
  const matched = {};
  if (cells.length === fields.length) {
    fields.forEach((field, i) => {
      if (!isEmpty(cells[i])) matched[field] = cells[i];
    });
    return matched;
  }
  let next = 0;
  cells.forEach((cell) => {
    if (next >= fields.length) return;
    if (isEmpty(cell)) {
      next += 1;
      return;
    }
    const index = fields.findIndex((field, i) => i >= next && (matchers[field]?.(cell) ?? true));
    if (index < 0) return;
    matched[fields[index]] = cell;
    next = index + 1;
  });
  return matched;
}
