/**
 * Block options decorator: the "Additional" tab of every block dialog (classes_* fields, so they
 * arrive as block classes, never as content rows):
 * - Anchor ID: a class starting with anchor- (e.g. anchor-our-services) becomes the block's id,
 *   unique on the page (a duplicate gets a -2, -3, ... suffix), for #links
 * - Hide block (hideblock), padding (pl / pr / pt / pb-{token}) and margin (ml / mr / mt /
 *   mb-{token}; the --space-* tokens) are styled in styles.css; nothing to do here
 * Blocks with a Component ID of their own (List, Separator) use it, else this id.
 */
import { availableId } from '../utils/ids.js';

const ANCHOR = /^anchor-[a-z0-9][a-z0-9-]*$/;

/**
 * Applies the Additional options of the blocks in a container (once per block).
 * @param {Element} container e.g. main, a section or a fragment
 */
// eslint-disable-next-line import/prefer-default-export
export function applyBlockOptions(container) {
  const blocks = container.matches?.('.block') ? [container] : [...container.querySelectorAll('.block')];
  blocks.forEach((block) => {
    if (block.dataset.blockOptions) return;
    block.dataset.blockOptions = 'true';
    const anchor = [...block.classList].find((name) => ANCHOR.test(name));
    if (anchor && !block.id) block.id = availableId(anchor, block);
  });
}
