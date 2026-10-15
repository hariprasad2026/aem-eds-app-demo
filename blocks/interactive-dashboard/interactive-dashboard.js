/*
 * Interactive Dashboard: placeholder. The dialog and logic will be added later.
 * The block renders nothing on the site; Universal Editor shows a labelled placeholder.
 */

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  block.replaceChildren();
  block.dataset.placeholder = 'Interactive Dashboard';
}
