import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlock,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  toClassName,
  getMetadata,
} from './aem.js';
import { applyBlockOptions } from '../decorators/block-options-decorator.js';
import { trackBlocks, trackInteractions } from '../decorators/data-layer-decorator.js';
import { buildImage } from '../decorators/responsive-image-decorator.js';
import { decorateButton } from '../decorators/button-decorator.js';
import { decorateButtons } from '../decorators/content-buttons-decorator.js';
import { decorateHead } from '../decorators/seo-decorator.js';
import {
  DEFAULT_LOCALE, getLocale, localePagePath, resolvePagePath,
} from '../utils/site.js';

// re-exported for scripts that import it from here, e.g. editor-support.js
export { decorateButtons };

// section options (models/_section.json), keyed by their normalized section-metadata row name
const SECTION_OPTIONS = [
  'sectionwidth', 'roundededge', 'backgroundimage', 'backgroundimagealt', 'anchorname',
];
const BACKGROUND_BREAKPOINTS = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }];

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
 * Builds a section background from the Background Image option.
 * @param {{ text: string, cell?: Element }} option The option: a metadata cell, or a URL from
 *   the section's data attribute
 * @param {string} [alt] Image alt text; empty marks the image as decorative
 * @returns {Element | null} The picture or img element
 */
function buildSectionBackground(option, alt) {
  const { cell, text } = option;
  let image = cell?.querySelector('picture') || cell?.querySelector('img');
  if (!image) {
    const src = cell?.querySelector('a')?.href || text;
    image = buildImage(src ? { src, alt: '' } : null, BACKGROUND_BREAKPOINTS);
  }
  if (!image) return null;
  const img = image.tagName === 'IMG' ? image : image.querySelector('img');
  // the alt text field wins; otherwise keep an alt AEM may have merged into the image
  if (alt) img.alt = alt;
  else if (!img.hasAttribute('alt')) img.alt = '';
  return image;
}

/**
 * Wraps the content of a section, any blocks and default content its filter allows, in a
 * synthetic block (container sections like Gen Carousel and Tabs). The blocks keep their own
 * markup, decoration and editor instrumentation.
 * @param {Element} section The decorated section
 * @param {Element} block The synthetic block, with its options
 */
function wrapSectionContent(section, block) {
  const contents = [...section.children].filter((el) => !el.matches('.section-background'));
  const blockWrapper = document.createElement('div');
  blockWrapper.append(block);
  section.append(blockWrapper);
  // decorate the block while it's empty: decorateBlock() would treat its content as cells
  decorateBlock(block);

  // decorateBlocks() only finds blocks directly in a section, so decorate them here
  contents.forEach((wrapper) => {
    const child = wrapper.firstElementChild;
    if (!wrapper.classList.contains('default-content-wrapper') && child?.className) {
      decorateBlock(child);
    }
    block.append(wrapper);
  });
}

/**
 * Gen Carousel sections (blocks/gen-carousel/_gen-carousel.json): the section's content is
 * wrapped in a synthetic gen-carousel block that turns each piece of content into a slide;
 * the carousel options move from the section to the carousel block.
 * @param {Element} container The main element, or the parent of re-rendered sections
 */
function buildCarouselSections(container) {
  container.querySelectorAll(':scope > .section.gen-carousel-section').forEach((section) => {
    if (section.querySelector(':scope > .gen-carousel-wrapper')) return;
    const carousel = document.createElement('div');
    carousel.className = 'gen-carousel';
    const { carouselnavigation: navigation, carouselinterval: interval } = section.dataset;
    if (navigation) carousel.classList.add(toClassName(navigation));
    if (interval) carousel.dataset.interval = interval;
    wrapSectionContent(section, carousel);
  });
}

/**
 * Tabs sections (blocks/tabs/_tabs.json): the section's Tab items and the components after
 * them are wrapped in a synthetic tabs block that builds the tab list and panels; the Styles
 * options become block classes, the Accessibility label the tab list's label.
 * @param {Element} container The main element, or the parent of re-rendered sections
 */
function buildTabsSections(container) {
  container.querySelectorAll(':scope > .section.tabs-section').forEach((section) => {
    if (section.querySelector(':scope > .tabs-wrapper')) return;
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    tabs.dataset.source = 'section';
    const {
      tabsstyle, tabsalignment, tabsorientation, tabsarialabel,
    } = section.dataset;
    [tabsstyle, tabsalignment, tabsorientation].map((value) => toClassName(value || ''))
      .filter(Boolean).forEach((name) => tabs.classList.add(name));
    if (tabsarialabel?.trim()) tabs.dataset.label = tabsarialabel.trim();
    wrapSectionContent(section, tabs);
  });
}

/**
 * Reads the section options of a section before it is decorated. AEM authoring delivers the
 * section properties as data attributes of the section (data-anchorname, data-style, ...);
 * documents use a section-metadata block. decorateSections() keeps only the URL of a metadata
 * image, so the option rows are read and removed first.
 * @param {Element} section The undecorated section
 * @returns {{ section: Element, style: string, rows: Object }} rows: option name to
 *   { text, cell } (cell for metadata rows)
 */
function readSectionOptions(section) {
  const rows = {};
  SECTION_OPTIONS.forEach((key) => {
    const value = section.dataset[key];
    if (value) rows[key] = { text: value.trim() };
  });
  const meta = section.querySelector(':scope > .section-metadata');
  [...(meta?.children || [])].forEach((row) => {
    const key = toClassName(row.children[0]?.textContent || '').replace(/-/g, '');
    if (SECTION_OPTIONS.includes(key)) {
      const cell = row.children[1];
      rows[key] = { text: cell?.textContent.trim() || '', cell };
      row.remove();
    }
  });
  // Style of AEM authoring sections (a section-metadata Style is applied by decorateSections)
  return { section, style: section.dataset.style || '', rows };
}

/**
 * Decorates sections, including the section options: Style, Width Type, Rounded edge,
 * Background Image, Image alt text and Anchor name.
 * @param {Element} container The main element, or the parent of re-rendered sections
 */
export function decorateSectionsWithOptions(container) {
  const options = [...container.querySelectorAll(':scope > div:not([data-section-status])')]
    .map(readSectionOptions);

  decorateSections(container);

  options.forEach(({ section, style, rows }) => {
    style.split(',').map((value) => toClassName(value.trim())).filter(Boolean)
      .forEach((name) => section.classList.add(name));
    // full width is the default and needs no class
    if (toClassName(rows.sectionwidth?.text || '') === 'fixed-width') {
      section.classList.add('fixed-width');
    }
    if (rows.roundededge?.text.toLowerCase() === 'true') {
      section.classList.add('rounded');
    }
    // Anchor name: the id Anchor List links jump to
    const anchor = toClassName(rows.anchorname?.text.replace(/^#/, '') || '');
    if (anchor && !document.getElementById(anchor)) section.id = anchor;
    const background = rows.backgroundimage
      && buildSectionBackground(rows.backgroundimage, rows.backgroundimagealt?.text);
    if (background) {
      const wrapper = document.createElement('div');
      wrapper.className = 'section-background';
      wrapper.append(background);
      section.prepend(wrapper);
      section.classList.add('has-background');
    }
  });

  buildCarouselSections(container);
  buildTabsSections(container);
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSectionsWithOptions(main);
  decorateBlocks(main);
  applyBlockOptions(main);
  decorateButtons(main);
}

/**
 * Loads the content of an authored page into main.
 * @param {Element} main The main element
 * @param {string} path The page path
 * @returns {Promise<boolean>} whether the page was loaded
 */
async function loadPageContent(main, path) {
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return false;
    main.innerHTML = await resp.text();
    // media of the page is relative to it
    main.querySelectorAll('img[src^="./media_"], source[srcset^="./media_"]').forEach((el) => {
      const attr = el.tagName === 'IMG' ? 'src' : 'srcset';
      el.setAttribute(attr, new URL(el.getAttribute(attr), new URL(path, window.location)).href);
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * The 404 page (404.html), authorable and locale specific. The first page that loads is shown:
 * 1. the 404 Page (error-page) of the missing page's nearest parent page up to Home (page
 *    property, or the metadata sheet's error-page column), like an inherited page property
 * 2. the locale's error-pages/404 (e.g. /de-de/error-pages/404 for /de-de/...)
 * 3. the default locale's /en/error-pages/404
 * Content from another locale is marked as its language.
 * else the built-in content stays. 403 and 500 are served by the CDN, not by code.
 * @param {Element} main The main element
 */
async function loadErrorPage(main) {
  // the built-in Go home button leads to the locale's home page
  main.querySelector('.error-button-home')?.setAttribute('href', localePagePath(''));
  if (window.errorCode && window.errorCode !== '404') return;
  // loaded on 404 pages only
  const { getInheritedMetadata } = await import('../utils/inherited-metadata.js');
  const configured = await getInheritedMetadata('error-page');
  const paths = [
    configured && resolvePagePath(configured, 'error-pages/404'),
    localePagePath('error-pages/404'),
    localePagePath('error-pages/404', `/${DEFAULT_LOCALE.code}/`),
  ].filter((path, i, all) => path && all.indexOf(path) === i);
  const { code } = getLocale();
  // eslint-disable-next-line no-restricted-syntax
  for (const path of paths) {
    // eslint-disable-next-line no-await-in-loop
    if (await loadPageContent(main, path)) {
      main.classList.add('error-authored');
      // content of another locale (e.g. the /en/ fallback) is marked as its language
      const source = getLocale(path);
      if (source.code !== code) main.lang = source.lang;
      return;
    }
  }
}

/**
 * Adds "Go back" to a 404 page reached from a page of the site: next to the page's first
 * buttons (the built-in Go home, or a button paragraph of an authored error page's text, not one
 * inside a block), else below the content. Runs once the content is decorated, so it finds the
 * authored page's buttons.
 * @param {Element} main The main element
 */
async function addErrorBackButton(main) {
  if (!window.isErrorPage || !document.referrer) return;
  const { origin, pathname } = new URL(document.referrer);
  if (origin !== window.location.origin) return;
  const { getPlaceholders } = await import('../utils/placeholders.js');
  const t = await getPlaceholders();
  const back = document.createElement('a');
  back.href = pathname;
  back.textContent = t('goBack', 'Go back');
  decorateButton(back, { view: 'button', type: 'primary' });
  back.classList.add('error-button-back');
  let wrapper = main.querySelector('.default-content-wrapper > .button-wrapper, .button-container');
  if (!wrapper) {
    wrapper = document.createElement('p');
    wrapper.className = 'button-wrapper';
    const sections = main.querySelectorAll('.section');
    const last = sections[sections.length - 1];
    (last?.querySelector('.default-content-wrapper') || last || main).append(wrapper);
  }
  wrapper.append(back);
}

// Site Global Templates (/content/tcs-corp/site-global-templates) with template code in
// templates/{name}/: the page's Page Type (page properties or the metadata sheet's page-type)
const TEMPLATES = ['home', 'article', 'blog', 'press-release'];

/** the Page Type (page properties or the metadata sheet), else the Template metadata */
const pageTypeOf = () => toClassName(getMetadata('page-type') || getMetadata('template'));

/**
 * Adds the Page Type as a body class, like Template and Theme.
 */
function decoratePageType() {
  const pageType = toClassName(getMetadata('page-type'));
  if (pageType) document.body.classList.add(pageType);
}

/**
 * Loads the template of the Page Type (templates/{name}/{name}.js and .css) and lets it add
 * its structure to main before main is decorated.
 * @param {Element} main The main element
 */
async function loadTemplate(main) {
  const name = pageTypeOf();
  if (!TEMPLATES.includes(name)) return;
  try {
    const base = `${window.hlx.codeBasePath}/templates/${name}/${name}`;
    const [template] = await Promise.all([import(`${base}.js`), loadCSS(`${base}.css`)]);
    if (template.default) await template.default(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`failed to load template ${name}`, error);
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  decorateHead();
  trackInteractions();
  decorateTemplateAndTheme();
  decoratePageType();
  const main = doc.querySelector('main');
  if (main) {
    if (window.isErrorPage) await loadErrorPage(main);
    else await loadTemplate(main);
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
/**
 * Opens links to a /modals/ page as a modal (blocks/modal).
 * @param {Document} doc
 */
function autolinkModals(doc) {
  doc.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    // links already handled (e.g. by the Modal block) are skipped
    if (!e.defaultPrevented && origin?.href && new URL(origin.href).pathname.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

async function loadLazy(doc) {
  autolinkModals(doc);
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);
  trackBlocks(main);
  addErrorBackButton(main);

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
  window.setTimeout(() => {
    // header, footer and blocks loaded later (e.g. modals)
    trackBlocks(document);
    import('./delayed.js');
  }, 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
