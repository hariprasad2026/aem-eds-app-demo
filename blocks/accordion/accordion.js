/*
 * Accordion Block (Block Collection): collapsible items built on <details>.
 * https://www.aem.live/developer/block-collection/accordion
 */
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [label, body] = row.children;
    if (!label) return;
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    const panel = body || document.createElement('div');
    panel.className = 'accordion-item-body';

    const details = document.createElement('details');
    moveInstrumentation(row, details);
    details.className = 'accordion-item';
    details.append(summary, panel);
    row.replaceWith(details);
  });
}
