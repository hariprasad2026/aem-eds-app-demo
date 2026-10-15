/**
 * Data layer decorator: the page, its blocks and their interactions in the Adobe Client Data
 * Layer (utils/analytics.js), following the AEM Core Components data layer, which Adobe Tags and
 * the Web SDK read (eventInfo maps to XDM web.webInteraction: name, URL, type).
 * - page: { page: { 'page-{hash}': { '@type', 'dc:title', 'xdm:language', 'xdm:template', ... } } }
 * - blocks: { component: { '{id}': { '@type': 'tcs-corp/components/{block}', parentId, ... } } }
 *   once they're decorated; the id is the block's id, else '{block}-{n}' (data-cmp-id)
 * - events: cmp:click (links and buttons), cmp:show / cmp:hide (accordion items, dialogs),
 *   cmp:media (play, pause, ended), cmp:submit (forms: their id and field names, no values),
 *   cmp:search (search forms), cmp:change (filters)
 * Blocks refine it with data attributes: data-cmp-id (a child component, e.g. a card),
 * data-cmp-interaction (e.g. next, filter), data-cmp-value, data-analytics="off" (no tracking,
 * e.g. a Separator with Analytics off) or "custom" (the block pushes its own state).
 */
import { pushComponentEvent, pushComponents, pushToDataLayer } from '../utils/analytics.js';
import { getPageLanguage, getPageMetadata, getPageTags } from '../utils/metadata.js';
import { currentBreakpoint } from '../utils/viewport.js';

const TYPE = 'tcs-corp/components';
const FILE = /\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt|mp3|mp4)(\?|#|$)/i;
const counters = {};
let pageId = '';

const hash = (value) => {
  let h = 5381;
  [...String(value)].forEach((c) => {
    h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; // eslint-disable-line no-bitwise
  });
  return h.toString(36);
};
const text = (el) => (el?.getAttribute?.('aria-label') || el?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
const tracked = (el) => !el.closest('[data-analytics="off"]');

/** the block element of an element (its .block, or the header / footer) */
const blockOf = (el) => el.closest('.block');
const nameOf = (block) => block.dataset.blockName || block.classList[0] || 'block';

/** a stable component id: the block's id, else {block}-{n} in page order */
export function componentIdOf(block) {
  if (!block.dataset.cmpId) {
    const name = nameOf(block);
    counters[name] = (counters[name] || 0) + 1;
    block.dataset.cmpId = block.id || `${name}-${counters[name]}`;
  }
  return block.dataset.cmpId;
}

/** the page entry, once */
export function trackPage() {
  if (pageId) return pageId;
  pageId = `page-${hash(window.location.pathname)}`;
  const metadata = getPageMetadata();
  pushToDataLayer({
    page: {
      [pageId]: {
        '@type': `${TYPE}/page`,
        'dc:title': metadata.title || document.title,
        'xdm:language': getPageLanguage(),
        'xdm:template': metadata.pageType || undefined,
        'xdm:tags': getPageTags(),
        'repo:path': window.location.pathname,
      },
    },
  });
  return pageId;
}

/**
 * Adds the blocks of a container to the data layer (state, once per block).
 * @param {Element|Document} container
 */
export function trackBlocks(container = document) {
  const components = {};
  container.querySelectorAll('.block').forEach((block) => {
    if (block.dataset.cmpTracked || block.closest('[data-analytics]')) return;
    block.dataset.cmpTracked = 'true';
    const id = componentIdOf(block);
    const parent = block.parentElement?.closest('.block');
    components[id] = {
      '@type': `${TYPE}/${nameOf(block)}`,
      parentId: parent ? componentIdOf(parent) : trackPage(),
      'dc:title': text(block.querySelector('h1, h2, h3, h4, h5, h6')) || undefined,
    };
  });
  if (Object.keys(components).length) pushComponents(components);
}

/** the component of an element: the nearest data-cmp-id, else its block */
function componentOf(el) {
  const own = el.closest('[data-cmp-id]');
  const block = blockOf(el);
  if (own && (!block || block.contains(own))) return own.dataset.cmpId;
  return block ? componentIdOf(block) : trackPage();
}

const linkType = (a) => {
  if (!a?.href) return 'other';
  if (a.hasAttribute('download') || FILE.test(a.href)) return 'download';
  return new URL(a.href, window.location.href).origin === window.location.origin ? 'other' : 'exit';
};

function onClick(e) {
  const el = e.target.closest('a[href], button, summary, [role="tab"], [role="button"]');
  if (!el || !tracked(el) || el.matches('summary')) return;
  const a = el.closest('a[href]');
  // outside the blocks, the links of the page's text (as the page's clicks)
  if (!blockOf(el) && !(a && a.closest('main'))) return;
  pushComponentEvent('cmp:click', componentOf(el), {
    interaction: el.dataset.cmpInteraction || (a ? 'link' : 'button'),
    'dc:title': text(el),
    'xdm:linkURL': a?.href || undefined,
    'xdm:linkType': linkType(a),
    value: el.dataset.cmpValue || undefined,
    position: el.dataset.cmpPosition ? Number(el.dataset.cmpPosition) : undefined,
    breakpoint: currentBreakpoint(),
  });
}

// accordion items (<details>) and dialogs: toggle and close don't bubble, so capture them
function onToggle(e) {
  const el = e.target;
  if (!(el instanceof HTMLDetailsElement) || !blockOf(el) || !tracked(el)) return;
  pushComponentEvent(el.open ? 'cmp:show' : 'cmp:hide', componentOf(el), {
    'dc:title': text(el.querySelector('summary')),
  });
}

function onClose(e) {
  if (!(e.target instanceof HTMLDialogElement) || !tracked(e.target)) return;
  pushComponentEvent('cmp:hide', componentOf(e.target), { interaction: 'dialog' });
}

function onMedia(e) {
  const media = e.target;
  if (!(media instanceof HTMLMediaElement) || !blockOf(media) || !tracked(media)) return;
  // background videos (muted, looping, no controls) aren't interactions
  if (!media.controls && media.loop && media.muted) return;
  pushComponentEvent('cmp:media', componentOf(media), {
    interaction: e.type,
    'xdm:mediaURL': media.currentSrc || undefined,
    position: Math.round(media.currentTime),
  });
}

function onSubmit(e) {
  const form = e.target;
  if (!(form instanceof HTMLFormElement) || !blockOf(form) || !tracked(form)) return;
  const search = form.matches('[role="search"]') || !!form.querySelector('input[type="search"]');
  if (search) {
    const input = form.querySelector('input[type="search"], input[name="q"], input[type="text"]');
    pushComponentEvent('cmp:search', componentOf(form), { 'xdm:searchTerm': (input?.value || '').trim().slice(0, 100) });
    return;
  }
  // field names only: no values (personal data)
  const fields = [...new Set([...form.elements].map((field) => field.name).filter(Boolean))];
  pushComponentEvent('cmp:submit', componentOf(form), {
    'dc:title': form.getAttribute('aria-label') || form.id || nameOf(blockOf(form)),
    fields,
  });
}

function onChange(e) {
  const el = e.target.closest('[data-cmp-interaction]');
  if (!el || !blockOf(el) || !tracked(el) || !el.matches('input, select')) return;
  pushComponentEvent('cmp:change', componentOf(el), {
    interaction: el.dataset.cmpInteraction,
    value: el.dataset.cmpValue || el.value,
    checked: el.type === 'checkbox' ? el.checked : undefined,
  });
}

let listening = false;

/** listens for the interactions of the whole document (once) */
export function trackInteractions() {
  if (listening) return;
  listening = true;
  trackPage();
  document.addEventListener('click', onClick, true);
  document.addEventListener('toggle', onToggle, true);
  document.addEventListener('close', onClose, true);
  ['play', 'pause', 'ended'].forEach((type) => document.addEventListener(type, onMedia, true));
  document.addEventListener('submit', onSubmit, true);
  document.addEventListener('change', onChange, true);
}
