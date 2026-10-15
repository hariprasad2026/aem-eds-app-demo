import { toClassName } from '../../scripts/aem.js';
import { isOn, readProperties, textOf } from '../../utils/properties.js';

/*
 * Tab: an item of a Tabs section (blocks/tabs). It marks where a tab starts and holds its
 * Title, ID and Active tab; the components after it, up to the next Tab, are the tab's content.
 * The Tabs block builds the tab list from it, so on the page it shows nothing; in Universal
 * Editor it shows its title, to select it and edit its properties.
 */

const FIELDS = ['title', 'tabid', 'activetab'];

/**
 * Reads the properties of a Tab: key-value rows, or one row per field in dialog order.
 * Kept on the block, so they can be read again after decoration.
 * @param {Element} block The Tab block
 * @returns {{ title: string, id: string, active: boolean }}
 */
export function readTab(block) {
  if (!('tabTitle' in block.dataset)) {
    const properties = readProperties(block);
    const keyed = FIELDS.some((name) => name in properties);
    const [title, id, active] = keyed
      ? FIELDS.map((name) => properties[name])
      : [...block.children].map((row) => row.lastElementChild);
    block.dataset.tabTitle = textOf(title);
    block.dataset.tabId = toClassName(textOf(id));
    block.dataset.tabActive = isOn(active);
  }
  const { tabTitle, tabId, tabActive } = block.dataset;
  return { title: tabTitle, id: tabId, active: tabActive === 'true' };
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const tab = readTab(block);
  const label = document.createElement('p');
  label.className = 'tab-title';
  label.textContent = tab.title;
  block.replaceChildren(label);
  // a Tab re-rendered after an edit: its Tabs block updates the tab
  block.dispatchEvent(new CustomEvent('tabs:tab-update', { bubbles: true, detail: tab }));
}
