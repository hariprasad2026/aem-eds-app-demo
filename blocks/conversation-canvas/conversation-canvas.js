import { toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { buildImage } from '../../decorators/responsive-image-decorator.js';
import { getPageTags } from '../../utils/metadata.js';
import { getPages } from '../../utils/query-index.js';
import { getLocale } from '../../utils/site.js';
import { resolveTags } from '../../utils/taxonomy.js';
import { hideVisually } from '../../decorators/a11y-decorator.js';
import { createButton } from '../../decorators/button-decorator.js';
import { createIconButton } from '../../decorators/icon-button-decorator.js';
import {
  BUTTON_ALIGNMENTS, BUTTON_TYPES, BUTTON_VIEWS, readButtonOptions,
} from '../../utils/buttons.js';
import { normalizeKey as normalize, textOf } from '../../utils/properties.js';
import { toSitePath } from '../../utils/urls.js';
import { uniqueId } from '../../utils/ids.js';
import { fillPlaceholder, getPlaceholders } from '../../utils/placeholders.js';

// UI text from the placeholders sheet; English fallbacks until it's loaded in decorate()
let t = (key, fallback, values) => fillPlaceholder(fallback, values);

// conversation canvas properties (_conversation-canvas.json), keyed by their normalized row name;
// the alt texts collapse into their images (field collapse), so rows without keys have none
const FIELDS = [
  'classes', 'bgstyle', 'backgroundimage', 'icon', 'iconalt', 'eyebrow', 'title', 'titlesize',
  'text', 'menurootpath', 'menudepth', 'searchplaceholder', 'searchaudioicon',
  'searchaudioiconalt', 'searchbuttonstyle', 'searchbuttonlabel',
];
const COLLAPSED = ['classes', 'iconalt', 'searchaudioiconalt'];
const STYLES = ['primary', 'secondary'];
const TITLE_SIZES = ['bigger', 'medium'];

/**
 * Reads the key-value property rows and the Button List item rows of the block.
 * Falls back to one property per single-cell row, in model order, if rows have no keys.
 * @param {Element} block
 * @returns {{ config: Object<string, Element>, buttonRows: Element[] }}
 */
function readBlock(block) {
  const config = {};
  const buttonRows = [];
  const unkeyed = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = cells.length === 2 ? normalize(cells[0].textContent) : '';
    if (FIELDS.includes(key)) [, config[key]] = cells;
    else if (row.querySelector('a[href]')) buttonRows.push(row);
    else if (cells.length === 1) unkeyed.push(cells[0]);
  });
  if (!Object.keys(config).length) {
    FIELDS.filter((field) => !COLLAPSED.includes(field))
      .forEach((field, i) => { if (unkeyed[i]) config[field] = unkeyed[i]; });
  }
  return { config, buttonRows };
}

/**
 * Returns the image of an image property cell, with the given alt text (or one merged into it).
 * @returns {Element | null}
 */
function imageOf(cell, alt) {
  if (!cell) return null;
  let image = cell.querySelector('picture') || cell.querySelector('img');
  if (!image) {
    const src = cell.querySelector('a')?.href || textOf(cell);
    image = buildImage(src ? { src, alt: '' } : null);
  }
  if (!image) return null;
  const img = image.tagName === 'IMG' ? image : image.querySelector('img');
  if (alt !== undefined && alt !== '') img.alt = alt;
  else if (!img.hasAttribute('alt')) img.alt = '';
  return image;
}

/**
 * Builds a Button List item with the button decorator, from its Button properties:
 * the link (text, title and Type) plus Views and Icon values in the other cells.
 * @param {Element} row
 * @returns {Element | null} the list item
 */
function buildListButton(row) {
  const a = row.querySelector('a[href]');
  if (!a) return null;
  const values = [...row.children].filter((cell) => !cell.contains(a)).map(textOf).filter(Boolean)
    .map((value) => value.toLowerCase());
  const options = readButtonOptions(a);
  const view = values.find((v) => BUTTON_VIEWS.includes(v)) || options.view || 'button';
  const type = values.find((v) => BUTTON_TYPES.includes(v)) || options.type || 'primary';
  const known = [...BUTTON_VIEWS, ...BUTTON_TYPES, ...BUTTON_ALIGNMENTS];
  const icon = values.find((v) => !known.includes(v)) || options.icon;

  const li = document.createElement('li');
  moveInstrumentation(row, li);
  li.append(createButton({
    href: a.href,
    text: a.textContent.trim(),
    title: a.title && a.title !== a.textContent.trim() ? a.title : '',
    view,
    type,
    icon,
  }));
  return li;
}

/**
 * Reads the Menu root path (default: the locale site, e.g. /de-de) and Menu depth properties.
 * @returns {{ root: string, depth: number }}
 */
function menuSettings(config) {
  const root = toSitePath(config.menurootpath?.querySelector('a')?.getAttribute('href')
    || textOf(config.menurootpath)) || getLocale().root;
  const depth = Math.max(1, parseInt(textOf(config.menudepth), 10) || 1);
  return { root, depth };
}

/**
 * Loads the site tree from the query index: pages under the root path, up to the depth.
 * Each node is { path, title, parent, children }; the returned node is the root.
 * @param {string} root Site path of the menu root
 * @param {number} depth Levels below the root
 * @returns {Promise<Object>}
 */
async function loadMenuTree(root, depth) {
  const base = root === '/' ? '' : root.replace(/\/$/, '');
  const tree = {
    path: base || '/', title: '', parent: null, children: [],
  };
  try {
    const data = await getPages();
    const levelOf = (path) => path.slice(base.length).split('/').filter(Boolean).length;
    const nodes = new Map([[tree.path, tree]]);
    data
      .filter(({ path }) => path.startsWith(`${base}/`) && levelOf(path) >= 1 && levelOf(path) <= depth)
      .sort((x, y) => levelOf(x.path) - levelOf(y.path) || x.path.localeCompare(y.path))
      .forEach(({ path, title }) => {
        const parent = nodes.get(path.slice(0, path.lastIndexOf('/')) || '/');
        if (!parent) return;
        const node = {
          path, title: title || path.split('/').pop().replace(/-/g, ' '), parent, children: [],
        };
        parent.children.push(node);
        nodes.set(path, node);
      });
  } catch { /* an empty tree is returned */ }
  return tree;
}

/**
 * Builds the popover menu list (Default and Secondary styles) from the site tree.
 * @returns {Promise<Element>}
 */
async function buildMenuList(root, depth) {
  const toList = (nodes) => {
    const list = document.createElement('ul');
    nodes.forEach((node) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = node.path;
      a.textContent = node.title;
      li.append(a);
      if (node.children.length) li.append(toList(node.children));
      list.append(li);
    });
    return list;
  };
  const tree = await loadMenuTree(root, depth);
  const list = toList(tree.children);
  if (!list.children.length) {
    const li = document.createElement('li');
    li.className = 'conversation-canvas-menu-empty';
    li.textContent = t('noPagesFound', 'No pages found');
    list.append(li);
  }
  return list;
}

/**
 * Builds the menu toggle button (round, with the menu icon).
 */
function buildMenuToggle(controls, label = t('menu', 'Menu')) {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'conversation-canvas-menu-toggle';
  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('aria-controls', controls);
  return toggle;
}

/**
 * Builds the search form: input with watermark, audio (speech input) and submit buttons.
 * Submitting dispatches a conversation-canvas:search event with the query.
 * @returns {HTMLFormElement}
 */
function buildSearchForm(config, id, block) {
  const form = document.createElement('form');
  form.className = 'conversation-canvas-search-form';
  const placeholder = textOf(config.searchplaceholder) || t('searchPlaceholder', 'Ask us a question');
  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.id = `${id}-q`;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  const label = hideVisually(document.createElement('label'));
  label.htmlFor = input.id;
  label.textContent = placeholder;

  // audio (speech input), only where the browser supports it
  const audio = document.createElement('button');
  audio.type = 'button';
  audio.className = 'conversation-canvas-audio';
  // the icon's alt text names the button (collapsed into the image; a separate row is read too)
  const audioAlt = textOf(config.searchaudioiconalt)
    || config.searchaudioicon?.querySelector('img')?.getAttribute('alt')?.trim();
  audio.setAttribute('aria-label', audioAlt || t('searchByVoice', 'Search by voice'));
  const audioImage = imageOf(config.searchaudioicon, '');
  // the button has the name, so the icon is decorative
  const audioImg = audioImage?.tagName === 'IMG' ? audioImage : audioImage?.querySelector('img');
  audioImg?.setAttribute('alt', '');
  if (audioImage) audio.append(audioImage);
  else audio.classList.add('conversation-canvas-audio-default');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Recognition) {
    let recognition = null;
    audio.setAttribute('aria-pressed', 'false');
    const stopListening = () => {
      recognition = null;
      audio.setAttribute('aria-pressed', 'false');
    };
    audio.addEventListener('click', () => {
      if (recognition) {
        recognition.stop();
        return;
      }
      recognition = new Recognition();
      recognition.lang = document.documentElement.lang || 'en';
      recognition.addEventListener('result', (e) => {
        input.value = e.results[0][0].transcript;
        input.focus();
      });
      recognition.addEventListener('end', stopListening);
      recognition.addEventListener('error', stopListening);
      try {
        recognition.start();
        audio.setAttribute('aria-pressed', 'true');
      } catch {
        stopListening();
      }
    });
  } else {
    audio.hidden = true;
  }

  // submit: an icon button from the button decorator (icon button types)
  const submitLabel = textOf(config.searchbuttonlabel) || t('submit', 'Submit');
  const submit = createIconButton({
    label: submitLabel,
    icon: 'arrow-right',
    type: textOf(config.searchbuttonstyle).toLowerCase() || 'primary',
    buttonType: 'submit',
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    // hand the query to whichever search experience is wired up on the page
    block.dispatchEvent(new CustomEvent('conversation-canvas:search', { bubbles: true, detail: { query } }));
  });

  form.append(label, input, audio, submit);
  return form;
}

/**
 * Builds the search row of the Default and Secondary styles: menu button with a popover menu
 * of the site tree, and the search form.
 */
function buildSearch(config, id, block) {
  const row = document.createElement('div');
  row.className = 'conversation-canvas-search';

  const menuToggle = buildMenuToggle(`${id}-menu`);
  menuToggle.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('nav');
  menu.className = 'conversation-canvas-menu';
  menu.id = `${id}-menu`;
  menu.setAttribute('aria-label', t('menu', 'Menu'));
  menu.hidden = true;
  const { root, depth } = menuSettings(config);
  let menuLoaded = false;
  const closeMenu = () => {
    menu.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
  };
  menuToggle.addEventListener('click', async () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', open);
    if (open && !menuLoaded) {
      menuLoaded = true;
      menu.append(await buildMenuList(root, depth));
    }
  });
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !row.contains(e.target)) closeMenu();
  });
  row.addEventListener('focusout', (e) => {
    if (!menu.hidden && e.relatedTarget && !row.contains(e.relatedTarget)) closeMenu();
  });

  row.append(menuToggle, menu, buildSearchForm(config, id, block));
  return row;
}

/*
 * Primary (sticky) dock: the whole canvas floats at the bottom of the viewport until the footer
 * (or a canvas showing its search row in place, e.g. in the footer) comes into view.
 * It holds the search row and, on desktop, the site navigation:
 * - home (the menu root): pills for the top-level sections
 * - a page with sub-pages: pills for its sub-pages; pills with their own sub-pages open a
 *   panel listing them, shown in place of the search row
 * - a page without sub-pages: suggestion pills (dynamic, or the page's Tags), or its
 *   parent's sub-pages when there are no suggestions
 * The menu button next to the search toggles the full menu (top-level sections); the back
 * button in the navigation goes up one level.
 */
const docks = new WeakMap();
const PANEL_COLUMNS_FROM = 6; // panel items from which the panel uses two columns

const normalizePath = (path) => path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

function findNode(tree, path) {
  if (tree.path === path) return tree;
  for (let i = 0; i < tree.children.length; i += 1) {
    const found = findNode(tree.children[i], path);
    if (found) return found;
  }
  return null;
}

const isWithin = (node, ancestor) => {
  for (let n = node; n; n = n.parent) if (n === ancestor) return true;
  return false;
};

/**
 * Builds the primary dock and returns it; its navigation renders once the site tree loads.
 */
function buildDock(config, id, block) {
  const dock = document.createElement('div');
  dock.className = 'conversation-canvas-dock';

  // panel for a pill's sub-pages, shown in place of the search row
  const panel = document.createElement('div');
  panel.className = 'conversation-canvas-nav-panel';
  panel.id = `${id}-panel`;
  panel.hidden = true;

  // search row: full menu toggle and search form
  const row = document.createElement('div');
  row.className = 'conversation-canvas-search';
  const menuToggle = buildMenuToggle(`${id}-nav`);
  const form = buildSearchForm(config, id, block);
  row.append(menuToggle, form);

  const nav = document.createElement('nav');
  nav.className = 'conversation-canvas-nav';
  nav.id = `${id}-nav`;
  nav.setAttribute('aria-label', t('siteNavigation', 'Site'));

  dock.append(panel, row, nav);

  const state = {
    tree: null, current: null, view: null, suggestions: [], collapsed: false,
  };
  const textOfNode = (node) => node.title.replace(/\s*\|.*$/, '');

  const closePanel = () => {
    panel.hidden = true;
    panel.replaceChildren();
    dock.classList.remove('conversation-canvas-panel-open');
    nav.querySelectorAll('[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  };

  const openPanel = (button, node) => {
    closePanel();
    const list = document.createElement('ul');
    list.className = 'conversation-canvas-nav-panel-list';
    const wide = node.children.length >= PANEL_COLUMNS_FROM;
    // balanced columns: the first column ends at item ceil(n / 2)
    const columnEnd = wide ? Math.ceil(node.children.length / 2) - 1 : -1;
    node.children.forEach((child, i) => {
      const li = document.createElement('li');
      li.className = 'conversation-canvas-nav-panel-item';
      if (i === columnEnd) li.classList.add('conversation-canvas-nav-panel-column-end');
      const a = document.createElement('a');
      a.href = child.path;
      a.className = 'conversation-canvas-nav-panel-link';
      a.textContent = textOfNode(child);
      if (state.current === child) a.setAttribute('aria-current', 'page');
      li.append(a);
      list.append(li);
    });
    panel.classList.toggle('conversation-canvas-nav-panel-wide', wide);
    panel.setAttribute('aria-label', textOfNode(node));
    panel.append(list);
    panel.hidden = false;
    dock.classList.add('conversation-canvas-panel-open');
    button.setAttribute('aria-expanded', 'true');
  };

  const defaultView = () => {
    const { tree, current } = state;
    if (!current || current === tree) return { type: 'root' };
    if (current.children.length) return { type: 'section', node: current };
    if (state.suggestions.length) return { type: 'suggestions' };
    return current.parent === tree ? { type: 'root' } : { type: 'section', node: current.parent };
  };

  const parentView = (view) => {
    const { tree, current } = state;
    if (view.type === 'suggestions') {
      return current.parent === tree ? { type: 'root' } : { type: 'section', node: current.parent };
    }
    if (view.type === 'section' && view.node.parent && view.node.parent !== tree) {
      return { type: 'section', node: view.node.parent };
    }
    return { type: 'root' };
  };

  const pill = (tag, text) => {
    const el = document.createElement(tag);
    el.className = 'conversation-canvas-nav-item';
    el.textContent = text;
    if (tag === 'button') el.type = 'button';
    return el;
  };

  // eslint-disable-next-line no-use-before-define
  const setView = (view) => { state.view = view; render(); };

  function render() {
    closePanel();
    const { tree, view } = state;
    const items = [];
    if (view.type !== 'root') {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'conversation-canvas-nav-back';
      back.setAttribute('aria-label', t('back', 'Back'));
      back.addEventListener('click', () => setView(parentView(view)));
      items.push(back);
    }
    if (view.type === 'suggestions') {
      state.suggestions.forEach((text) => {
        const item = pill('button', text);
        item.classList.add('conversation-canvas-nav-suggestion');
        item.addEventListener('click', () => {
          form.elements.q.value = text.replace(/^["“]|["”]$/g, '');
          form.requestSubmit();
        });
        items.push(item);
      });
    } else {
      const node = view.type === 'root' ? tree : view.node;
      node.children.forEach((child) => {
        let item;
        if (child.children.length && view.type === 'section') {
          item = pill('button', textOfNode(child));
          item.classList.add('conversation-canvas-nav-toggle');
          item.setAttribute('aria-expanded', 'false');
          item.setAttribute('aria-controls', panel.id);
          item.addEventListener('click', () => {
            if (item.getAttribute('aria-expanded') === 'true') closePanel();
            else openPanel(item, child);
          });
        } else {
          item = pill('a', textOfNode(child));
          item.href = child.path;
        }
        if (state.current && isWithin(state.current, child)) {
          item.classList.add('conversation-canvas-nav-current');
          item.setAttribute('aria-current', state.current === child ? 'page' : 'true');
        }
        items.push(item);
      });
    }
    const list = document.createElement('ul');
    list.className = 'conversation-canvas-nav-list';
    list.append(...items.map((item) => {
      const li = document.createElement('li');
      li.append(item);
      return li;
    }));
    nav.replaceChildren(list);
    nav.hidden = state.collapsed || !items.length;
    if (defaultView().type === 'root') {
      menuToggle.removeAttribute('aria-pressed');
      menuToggle.setAttribute('aria-expanded', String(!state.collapsed));
    } else {
      menuToggle.removeAttribute('aria-expanded');
      menuToggle.setAttribute('aria-pressed', String(view.type === 'root'));
    }
  }

  // menu button: full menu on / off (on home, where the full menu is the default: show / hide)
  menuToggle.addEventListener('click', () => {
    if (!state.tree) return;
    if (defaultView().type === 'root') {
      state.collapsed = !state.collapsed;
      render();
    } else {
      setView(state.view.type === 'root' ? defaultView() : { type: 'root' });
    }
  });

  dock.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || panel.hidden) return;
    const opener = nav.querySelector('[aria-expanded="true"]');
    closePanel();
    opener?.focus();
  });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !dock.contains(e.target)) closePanel();
  });

  const { root, depth } = menuSettings(config);
  // suggestions: the page's tags (Tags metadata), labelled from the taxonomy
  const tagLabels = resolveTags(getPageTags()).then((tags) => tags.map((tag) => tag.label));
  Promise.all([loadMenuTree(root, depth), tagLabels]).then(([tree, labels]) => {
    if (!state.suggestions.length) state.suggestions = labels;
    state.tree = tree;
    state.current = findNode(tree, normalizePath(window.location.pathname));
    setView(defaultView());
  });

  docks.set(block, {
    setSuggestions(suggestions) {
      state.suggestions = suggestions;
      if (state.tree) setView(defaultView());
    },
  });
  return dock;
}

/**
 * Sets the suggestion pills of a primary (sticky) canvas, shown on pages without sub-pages,
 * e.g. AI prompts from a personalisation service. Clicking one searches for it.
 * @param {Element} block The conversation canvas block
 * @param {string[]} suggestions
 */
export function setConversationCanvasSuggestions(block, suggestions = []) {
  docks.get(block)?.setSuggestions(suggestions);
}

/*
 * Floating: across all canvases on the page at most one floats at the bottom of the viewport,
 * and none while any canvas shows its search row in place (e.g. the canvas in the footer).
 * - primary (sticky): the whole canvas (dock) floats until the footer comes into view
 * - default / secondary: the search row floats once it is scrolled past its place
 */
const floating = [];
let floatFrame;

function updateFloating() {
  const vh = window.innerHeight;
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh;
  };
  const footer = document.querySelector('footer');
  const footerVisible = !!footer && inView(footer);
  const inPlaceVisible = floating.some((c) => !c.primary && inView(c.slot));
  let assigned = false;
  floating.forEach((c) => {
    let float = false;
    if (!inPlaceVisible && !assigned) {
      float = c.primary ? !footerVisible : c.slot.getBoundingClientRect().bottom < 0;
    }
    if (float) assigned = true;
    if (c.primary) {
      // hidden docks can't be reached by keyboard or screen readers
      c.row.inert = !float;
    } else if (float && !c.row.classList.contains('conversation-canvas-floating')) {
      // keep the space of the row while it floats, so the page doesn't jump
      c.slot.style.minHeight = `${c.slot.offsetHeight}px`;
    }
    c.row.classList.toggle('conversation-canvas-floating', float);
    if (!float && !c.primary) c.slot.style.minHeight = '';
  });
}

function scheduleFloating() {
  cancelAnimationFrame(floatFrame);
  floatFrame = requestAnimationFrame(updateFloating);
}

/**
 * Adds a canvas to the floating logic; listeners are attached for the first one.
 */
function registerFloating(entry) {
  floating.push(entry);
  if (floating.length === 1) {
    window.addEventListener('scroll', scheduleFloating, { passive: true });
    window.addEventListener('resize', scheduleFloating);
    // the footer and other sections load later and move the page
    new ResizeObserver(scheduleFloating).observe(document.body);
  }
  scheduleFloating();
}

/**
 * Renders filter tags into the conversation canvas filter list (Secondary style). The tags are
 * dynamic, so the list is empty until a script supplies them, e.g. from a personalisation service.
 * @param {Element} block The conversation canvas block
 * @param {Array<{ label: string, href?: string, active?: boolean }>} tags
 */
export function setConversationCanvasFilters(block, tags = []) {
  const list = block.querySelector('.conversation-canvas-filters');
  if (!list) return;
  list.replaceChildren(...tags.map(({ label, href, active }) => {
    const li = document.createElement('li');
    const tag = document.createElement(href ? 'a' : 'button');
    tag.className = `tag tag-filter${active ? ' active' : ''}`;
    tag.textContent = label;
    if (href) {
      tag.href = href;
      if (active) tag.setAttribute('aria-current', 'true');
    } else {
      tag.type = 'button';
      tag.setAttribute('aria-pressed', String(!!active));
    }
    tag.dataset.cmpInteraction = 'filter';
    tag.dataset.cmpValue = label;
    li.append(tag);
    return li;
  }));
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  t = await getPlaceholders();
  const id = uniqueId('conversation-canvas');
  const { config, buttonRows } = readBlock(block);

  // style options
  const style = normalize(textOf(config.classes));
  if (STYLES.includes(style)) block.classList.add(style);
  const primary = block.classList.contains('primary');
  block.classList.add(`conversation-canvas-bg-${toClassName(textOf(config.bgstyle)) || 'default'}`);
  const titleSize = normalize(textOf(config.titlesize));
  if (TITLE_SIZES.includes(titleSize)) block.classList.add(`conversation-canvas-title-${titleSize}`);

  // primary (sticky): only the floating dock (search row and site navigation)
  if (primary) {
    const dock = buildDock(config, id, block);
    block.replaceChildren(dock);
    registerFloating({ row: dock, slot: null, primary });
    return;
  }

  const content = document.createElement('div');
  content.className = 'conversation-canvas-content';

  // background image
  const background = imageOf(config.backgroundimage, '');
  if (background) {
    const bg = document.createElement('div');
    bg.className = 'conversation-canvas-background';
    bg.append(background);
    block.classList.add('conversation-canvas-has-background');
    block.append(bg);
  }

  // icon, eyebrow, title, text
  const intro = document.createElement('div');
  intro.className = 'conversation-canvas-intro';
  const icon = imageOf(config.icon, textOf(config.iconalt));
  if (icon) {
    const iconWrap = document.createElement('div');
    iconWrap.className = 'conversation-canvas-icon';
    iconWrap.append(icon);
    intro.append(iconWrap);
  }
  if (textOf(config.eyebrow)) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'conversation-canvas-eyebrow';
    eyebrow.textContent = textOf(config.eyebrow);
    intro.append(eyebrow);
  }
  if (textOf(config.title)) {
    const title = document.createElement('h2');
    title.className = 'conversation-canvas-title';
    title.textContent = textOf(config.title);
    intro.append(title);
  }
  if (config.text && textOf(config.text)) {
    const text = document.createElement('div');
    text.className = 'conversation-canvas-text';
    text.append(...config.text.childNodes);
    intro.append(text);
  }
  if (intro.children.length) content.append(intro);

  // search row, in place; floats once scrolled past
  const slot = document.createElement('div');
  slot.className = 'conversation-canvas-search-slot';
  const row = buildSearch(config, id, block);
  slot.append(row);
  content.append(slot);

  // filter tags (secondary): markup only, filled by setConversationCanvasFilters()
  if (block.classList.contains('secondary')) {
    const filters = document.createElement('ul');
    filters.className = 'conversation-canvas-filters';
    filters.setAttribute('aria-label', t('suggestions', 'Suggestions'));
    content.append(filters);
  }

  // button list
  const buttons = buttonRows.map(buildListButton).filter(Boolean);
  if (buttons.length) {
    const list = document.createElement('ul');
    list.className = 'conversation-canvas-buttons';
    list.append(...buttons);
    content.append(list);
  }

  block.replaceChildren(...block.querySelectorAll(':scope > .conversation-canvas-background'), content);
  registerFloating({ row, slot, primary });
}
