/**
 * Masonry decorator: packs a CSS grid's items of different heights into columns, each item right
 * below the one above it. Items keep their DOM (reading) order across the columns (1, 2, 3, then
 * 4, 5, 6 below them), spanning as many of the grid's small rows as their height needs;
 * full-width items (grid-column: 1 / -1) start below every column and the next row starts in
 * the first column. The layout follows content, size and column changes and
 * items added later. Browsers with native masonry (grid-template-rows: masonry) lay the grid
 * out themselves.
 *
 * The grid's CSS sets a small row unit (grid-auto-rows, e.g. 0.25rem) and no row gap; the space
 * below each item is its margin-block-end. Items shouldn't stretch (align-self: start).
 */

const NATIVE = typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry');

/**
 * Lays out a grid as masonry and keeps it up to date.
 * @param {HTMLElement} grid
 * @returns {{ disconnect: Function }} stops following the grid
 */
// eslint-disable-next-line import/prefer-default-export
export function layoutMasonry(grid) {
  grid.classList.add(NATIVE ? 'masonry-native' : 'masonry-spans');
  if (NATIVE || typeof ResizeObserver === 'undefined') return { disconnect: () => {} };

  let frame = 0;
  const layout = () => {
    frame = 0;
    // not rendered (e.g. a section still loading): laid out once it shows (resize)
    if (!grid.getClientRects().length) return;
    const items = [...grid.children];
    // the grid's own columns, without the ones the placements would add
    items.forEach((item) => {
      item.style.gridColumn = '';
      item.style.gridRow = '';
    });
    const style = getComputedStyle(grid);
    const columns = style.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    const row = parseFloat(style.gridAutoRows) || 1;
    // the next free row line of each column
    const next = Array(columns).fill(1);
    let index = 0;
    items.forEach((item) => {
      const itemStyle = getComputedStyle(item);
      const span = Math.max(1, Math.ceil((item.getBoundingClientRect().height
        + (parseFloat(itemStyle.marginBlockEnd) || 0)) / row));
      const fullWidth = itemStyle.gridColumnEnd === '-1';
      if (fullWidth || columns === 1) {
        const start = Math.max(...next);
        item.style.gridRow = `${start} / span ${span}`;
        next.fill(start + span);
        index = 0;
        return;
      }
      const column = index % columns;
      index += 1;
      item.style.gridColumn = `${column + 1}`;
      item.style.gridRow = `${next[column]} / span ${span}`;
      next[column] += span;
    });
  };
  const schedule = () => {
    frame = frame || requestAnimationFrame(layout);
  };

  const resized = new ResizeObserver(schedule);
  const watch = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) resized.observe(node);
  };
  resized.observe(grid);
  [...grid.children].forEach(watch);
  const changed = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach(watch);
      record.removedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) resized.unobserve(node);
      });
    });
    schedule();
  });
  changed.observe(grid, { childList: true });
  schedule();
  return {
    disconnect: () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
      changed.disconnect();
    },
  };
}
