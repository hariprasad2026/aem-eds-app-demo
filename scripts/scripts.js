import {
  decorateBlock,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  getMetadata,
  loadBlock,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';
import loadGoogleFonts from './google-fonts.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads an authored block from a fragment page into a page landmark (header/footer).
 * The path comes from page metadata (e.g. "header" / "footer") or falls back to a site default,
 * and is always resolved from the site root so nested pages load the same fragment.
 * @param {Element} container the <header> or <footer> element
 * @param {string} metaName metadata name that can override the fragment path
 * @param {string} defaultPath site-root path of the fragment page
 * @param {string} blockName name of the block inside the fragment
 */
async function loadFragmentBlock(container, metaName, defaultPath, blockName) {
  if (!container) return;
  const metaPath = getMetadata(metaName);
  const path = new URL(metaPath || defaultPath, window.location).pathname
    .replace(/(\.plain)?\.html$/, '');

  const resp = await fetch(`${path}.plain.html`);
  if (!resp.ok) return;

  const fragment = new DOMParser().parseFromString(await resp.text(), 'text/html');
  const sourceBlock = fragment.querySelector(`.${blockName}`);
  if (!sourceBlock) return;

  // fragment media is referenced relative to the fragment page
  const fragmentUrl = new URL(path, window.location);
  sourceBlock.querySelectorAll('img[src^="./media_"], source[srcset^="./media_"]').forEach((el) => {
    const attr = el.tagName === 'IMG' ? 'src' : 'srcset';
    el.setAttribute(attr, new URL(el.getAttribute(attr), fragmentUrl).href);
  });

  const block = document.importNode(sourceBlock, true);
  container.replaceChildren(block);
  decorateBlock(block);
  await loadBlock(block);
}

/**
 * Loads the site header (tcs-header block) from the header fragment.
 * @param {Element} header header element
 */
function loadHeader(header) {
  return loadFragmentBlock(header, 'header', '/blocks/tcs-header', 'tcs-header');
}

/**
 * Loads the site footer (tcs-footer block) from the footer fragment,
 * unless the page authors its own footer block.
 * @param {Element} footer footer element
 */
function loadFooter(footer) {
  if (document.querySelector('main .tcs-footer')) return Promise.resolve();
  return loadFragmentBlock(footer, 'footer', '/tcs-footer', 'tcs-footer');
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
export function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  loadGoogleFonts();
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
