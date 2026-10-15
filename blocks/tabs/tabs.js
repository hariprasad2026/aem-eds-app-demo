import { pushComponentEvent } from '../../utils/analytics.js';
import { toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { pick } from '../../utils/buttons.js';
import { isEditing } from '../../utils/environment.js';
import { availableId, uniqueId } from '../../utils/ids.js';
import { getPlaceholders } from '../../utils/placeholders.js';
import { isOn, normalizeKey, textOf } from '../../utils/properties.js';
import { loadFragment } from '../fragment/fragment.js';
import { readTab } from '../tab/tab.js';

/*
 * Tabs, like the Tabs core component of AEM, from two sources:
 * - the Tabs block (in a section): its properties (ID, Label, Style, Alignment, Orientation)
 *   and one Tab item per tab, with Title, ID, Active tab and a Fragment: a page whose content
 *   (any components, e.g. Columns) is shown in the tab
 * - a Tabs Container section (scripts.js buildTabsSections): its Tab items start the tabs, the
 *   components after a Tab (Columns, Title, Text, Image, Button), up to the next Tab, are its
 *   content; they keep their own markup, decoration and editor instrumentation
 * Both become a tab list and one panel per tab.
 *
 * Shown first: the tab shown before Universal Editor re-rendered the Tabs, else the tab the
 * page address names (#ID, a deep link), else the Active tab, else the first.
 */

// Tabs block properties (_tabs.json tabs-block), keyed by their normalized row name
const BLOCK_FIELDS = ['tabsid', 'tabsarialabel', 'tabsstyle', 'tabsalignment', 'tabsorientation'];
const STYLES = ['underline', 'boxed', 'pills'];
const ALIGNMENTS = ['left', 'center', 'stretch'];
const ORIENTATIONS = ['horizontal', 'vertical'];

// the tab shown per Tabs, so Tabs re-rendered after an edit show the same tab
const shownTabs = new Map();
let listeningToHash = false;

/** the panel the page address names (#ID), if it's a tab panel */
function panelOfHash() {
  const id = toClassName(decodeURIComponent(window.location.hash.slice(1)));
  const panel = id ? document.getElementById(id) : null;
  return panel?.matches('.tabs .tabs-panel') ? panel : null;
}

/** deep links: a link to a tab's ID (or back / forward to one) opens the tab and scrolls to it */
function openPanelOfHash() {
  const panel = panelOfHash();
  if (!panel) return;
  document.getElementById(panel.getAttribute('aria-labelledby'))?.click();
  panel.closest('.tabs').scrollIntoView();
}

function listenToHash() {
  if (listeningToHash) return;
  listeningToHash = true;
  window.addEventListener('hashchange', openPanelOfHash);
}

/**
 * @typedef {Object} TabGroup
 * @property {string} [title]
 * @property {string} [id]
 * @property {boolean} [active]
 * @property {Element[]} content the panel's content
 * @property {Element} [source] the authored Tab item, whose editor instrumentation moves to
 *   the panel
 */

/**
 * The tabs of a Tabs Container: each Tab item starts one, content before the first Tab starts
 * an untitled one.
 * @param {Element} block
 * @returns {TabGroup[]}
 */
function groupContainerTabs(block) {
  const groups = [];
  [...block.children].forEach((wrapper) => {
    const tab = wrapper.querySelector(':scope > .tab');
    if (tab || !groups.length) groups.push({ ...(tab ? readTab(tab) : {}), content: [] });
    groups[groups.length - 1].content.push(wrapper);
  });
  return groups;
}

/**
 * Reads the Tabs block's property rows (key | value) and applies them: the Styles options as
 * classes, the Label for the tab list.
 * @param {Element} block
 * @returns {{ id: string, items: Element[] }} the Tabs ID and the Tab item rows
 */
function readBlockProperties(block) {
  const properties = {};
  const items = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = cells.length === 2 ? normalizeKey(cells[0].textContent) : '';
    if (BLOCK_FIELDS.includes(key)) properties[key] = textOf(cells[1]);
    else items.push(row);
  });
  [
    pick(properties.tabsstyle, STYLES),
    pick(properties.tabsalignment, ALIGNMENTS),
    pick(properties.tabsorientation, ORIENTATIONS),
  ].filter(Boolean).forEach((name) => block.classList.add(name));
  if (properties.tabsarialabel) block.dataset.label = properties.tabsarialabel;
  return { id: toClassName(properties.tabsid || ''), items };
}

/**
 * The tab of a Tabs block item row: Title, ID, Active tab and Fragment cells. Items authored
 * when the Tab had Content fields have more cells: the Fragment is the last one.
 * @param {Element} row
 * @returns {Promise<TabGroup>}
 */
async function readItem(row) {
  const cells = [...row.children];
  const [title, id, active] = cells;
  const fragmentCell = cells.length > 3 ? cells[cells.length - 1] : null;
  const path = fragmentCell?.querySelector('a')?.getAttribute('href') || textOf(fragmentCell);
  const fragment = path ? await loadFragment(path) : null;
  const content = [];
  if (fragment) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tabs-fragment';
    wrapper.append(...fragment.childNodes);
    content.push(wrapper);
  }
  return {
    title: textOf(title),
    id: toClassName(textOf(id)),
    active: isOn(active),
    content,
    source: row,
  };
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const t = await getPlaceholders();
  const container = block.dataset.source === 'section';
  const section = block.closest('.section');
  let groups;
  let baseId;
  let key;
  if (container) {
    groups = groupContainerTabs(block);
    baseId = section?.id;
    key = section?.dataset.aueResource;
  } else {
    const { id, items } = readBlockProperties(block);
    groups = await Promise.all(items.map(readItem));
    baseId = id;
    key = block.dataset.aueResource;
  }
  baseId = baseId || uniqueId('tabs');
  key = key || baseId;
  const vertical = block.classList.contains('vertical');

  if (!groups.length) {
    block.replaceChildren();
    if (isEditing()) {
      const hint = document.createElement('p');
      hint.className = 'tabs-empty';
      hint.textContent = container
        ? t('tabsEmpty', 'Add a Tab, then the components of the tab after it.')
        : t('tabsBlockEmpty', 'Add a Tab, then choose the Fragment it shows in the Tab properties.');
      block.append(hint);
    }
    return;
  }

  const list = document.createElement('div');
  list.className = 'tabs-list';
  list.setAttribute('role', 'tablist');
  if (vertical) list.setAttribute('aria-orientation', 'vertical');
  list.setAttribute('aria-label', block.dataset.label || t('tabs', 'Tabs'));

  const tabs = groups.map(({
    title, id, active, content, source,
  }, i) => {
    const panel = document.createElement('div');
    if (source) moveInstrumentation(source, panel);
    panel.className = 'tabs-panel';
    panel.id = availableId(id || `${baseId}-item-${i + 1}`);
    panel.setAttribute('role', 'tabpanel');
    panel.tabIndex = 0;
    panel.append(...content);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-tab';
    button.id = `${panel.id}-tab`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    button.textContent = title || t('tabNumber', 'Tab {n}', { n: i + 1 });
    panel.setAttribute('aria-labelledby', button.id);
    list.append(button);
    return { button, panel, active };
  });
  block.replaceChildren(list, ...tabs.map(({ panel }) => panel));

  const select = (index, { focus = false, notify = true } = {}) => {
    tabs.forEach(({ button, panel }, i) => {
      const selected = i === index;
      button.setAttribute('aria-selected', selected);
      button.tabIndex = selected ? 0 : -1;
      panel.hidden = !selected;
    });
    if (focus) tabs[index].button.focus();
    const changed = shownTabs.get(key) !== index;
    shownTabs.set(key, index);
    if (!notify || !changed) return;
    const { panel, button } = tabs[index];
    const detail = { index, id: panel.id, title: button.textContent };
    block.dispatchEvent(new CustomEvent('tabs:change', { bubbles: true, detail }));
    // Adobe Client Data Layer (like the core component)
    pushComponentEvent('cmp:show', panel.id, { 'dc:title': button.textContent.trim() });
  };

  tabs.forEach(({ button }, i) => button.addEventListener('click', () => select(i)));
  list.addEventListener('keydown', (e) => {
    const current = tabs.findIndex(({ button }) => button === document.activeElement);
    if (current < 0) return;
    const last = tabs.length - 1;
    const previous = current === 0 ? last : current - 1;
    const next = current === last ? 0 : current + 1;
    const index = {
      ArrowLeft: previous,
      ArrowUp: previous,
      ArrowRight: next,
      ArrowDown: next,
      Home: 0,
      End: last,
    }[e.key];
    if (index === undefined) return;
    e.preventDefault();
    select(index, { focus: true });
  });

  // Universal Editor: show the tab of the component selected in the editor
  block.addEventListener('aue:ui-select', (e) => {
    const panel = e.detail?.selected && e.target.closest('.tabs-panel');
    const index = tabs.findIndex((tab) => tab.panel === panel);
    if (index >= 0) select(index);
  });
  // a Tab edited in Universal Editor: update its tab
  block.addEventListener('tabs:tab-update', (e) => {
    const tab = tabs.find(({ panel }) => panel.contains(e.target));
    if (tab && e.detail.title) tab.button.textContent = e.detail.title;
  });

  const linked = panelOfHash();
  const shown = [
    shownTabs.get(key) ?? -1,
    tabs.findIndex(({ panel }) => panel === linked),
    tabs.findIndex(({ active }) => active),
  ].find((index) => index >= 0 && index < tabs.length);
  select(shown ?? 0, { notify: false });

  listenToHash();
  // a page opened at a tab's ID: scroll to it once the page has its layout
  if (linked && tabs.some(({ panel }) => panel === linked)) {
    if (document.readyState === 'complete') requestAnimationFrame(openPanelOfHash);
    else window.addEventListener('load', openPanelOfHash, { once: true });
  }
}
