/*
 * Table Block (Block Collection): a table from rows of columns.
 * https://www.aem.live/developer/block-collection/table
 * Adapted: the first row is the column headers (unless No Header), the first column the row
 * headers (First Column Header); the heading just before the table names it; a table wider than
 * its container scrolls in a labelled region keyboard users can focus.
 */
import { moveInstrumentation } from '../../scripts/scripts.js';
import { uniqueId } from '../../utils/ids.js';
import { getPlaceholders } from '../../utils/placeholders.js';

/** the heading right before the block in its section, if any */
function headingBefore(block) {
  const wrapper = block.parentElement;
  let previous = wrapper?.previousElementSibling;
  if (previous?.classList.contains('default-content-wrapper')) previous = previous.lastElementChild;
  return previous?.matches('h1, h2, h3, h4, h5, h6') ? previous : null;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const t = await getPlaceholders();
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const header = !block.classList.contains('no-header');
  const rowHeader = block.classList.contains('row-header');

  [...block.children].forEach((row, i) => {
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);
    const inHead = i === 0 && header;
    [...row.children].forEach((cell, j) => {
      const th = inHead || (rowHeader && j === 0);
      const td = document.createElement(th ? 'th' : 'td');
      if (th) td.setAttribute('scope', inHead ? 'col' : 'row');
      moveInstrumentation(cell, td);
      td.append(...cell.childNodes);
      tr.append(td);
    });
    if (inHead) thead.append(tr);
    else tbody.append(tr);
  });
  table.append(...(thead.children.length ? [thead] : []), tbody);

  // the table's name: the heading before it
  const heading = headingBefore(block);
  if (heading) {
    heading.id = heading.id || uniqueId('table-title');
    table.setAttribute('aria-labelledby', heading.id);
  }
  block.replaceChildren(table);

  // wider than its container: a region keyboard users can focus to scroll it
  const label = heading?.textContent.trim() || t('table', 'Table');
  new ResizeObserver(() => {
    const scrolls = block.scrollWidth > block.clientWidth + 1;
    if (scrolls) {
      block.tabIndex = 0;
      block.setAttribute('role', 'region');
      block.setAttribute('aria-label', label);
    } else {
      block.removeAttribute('tabindex');
      block.removeAttribute('role');
      block.removeAttribute('aria-label');
    }
  }).observe(block);
}
