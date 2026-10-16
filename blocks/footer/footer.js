import { moveInstrumentation } from '../../scripts/scripts.js';
import { removeButtonDecoration } from '../../decorators/button-decorator.js';
import { fromCell } from '../../decorators/content-decorator.js';
import { setLinkTarget } from '../../decorators/link-decorator.js';
import { buildSocialLinks } from '../../decorators/social-links-decorator.js';
import { getSocialLinks } from '../../utils/data.js';
import { getLayoutConfig, loadLayoutCanvas, loadLayoutFragment } from '../../utils/layout.js';
import { readLinkItems } from '../../utils/links.js';
import { getPlaceholders } from '../../utils/placeholders.js';

/*
 * Footer: two roles with one block name.
 * - The page footer (built by aem.js in <footer>): the shell. Loads the shared footer page of
 *   the page's template (utils/layout.js: the page's own Footer property where allowed, else
 *   the template's, a parent page's, the locale's references/footer or the default locale's)
 *   as a fragment, applies the template's footer variation and adds the Social Links.
 * - The authored Footer block on that footer page (blocks/footer/_footer.json): the content.
 *   The Conversation Canvas Page (an independent conversation-canvas page, the final stop of the
 *   Canvas journey; the template's Footer Canvas replaces or switches it off) above the bottom
 *   bar with the Copyright Text (rich text; {year} becomes the current year) and the Link List
 *   (Link Title, Link Path, Link Type: Default / Open in new window).
 * Figma "Footer - Desktop / Tablet / Mobile" (2496-91965, 4347-44552, 4347-44593). README.md.
 */

/** replaces {year} in the copyright text with the current year */
function fillYear(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const year = String(new Date().getFullYear());
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeValue.includes('{year}')) node.nodeValue = node.nodeValue.replaceAll('{year}', year);
  }
}

function buildLinkList(cell, label) {
  const items = readLinkItems(cell);
  if (!items.length) return null;
  const nav = document.createElement('nav');
  nav.className = 'footer-links';
  nav.setAttribute('aria-label', label);
  const list = document.createElement('ul');
  items.forEach(({ link, newWindow }) => {
    // footer links are plain links, not the buttons standalone content links become
    removeButtonDecoration(link);
    setLinkTarget(link, newWindow);
    const li = document.createElement('li');
    li.append(link);
    list.append(li);
  });
  nav.append(list);
  return nav;
}

// a canvas page is loaded by one footer bar at a time: a canvas page that contains a Footer
// block (e.g. the footer page itself) doesn't load its canvas again
let loadingCanvas = false;

/**
 * The footer canvas page as a fragment: the template's Footer Canvas, else the Conversation
 * Canvas Page property; "none" in the template switches it off.
 */
async function buildCanvas(cell) {
  if (loadingCanvas) return null;
  const authored = cell?.querySelector('a[href]')?.getAttribute('href') || cell?.textContent.trim();
  loadingCanvas = true;
  let fragment;
  try {
    const { footerCanvas } = await getLayoutConfig();
    fragment = await loadLayoutCanvas(footerCanvas, authored || '');
  } finally {
    loadingCanvas = false;
  }
  if (!fragment) return null;
  const canvas = document.createElement('div');
  canvas.className = 'footer-canvas';
  moveInstrumentation(cell, canvas);
  canvas.append(...fragment.children);
  return canvas;
}

/**
 * The authored Footer block: rows Conversation Canvas Page, Copyright Text and Link List.
 * @param {Element} block
 */
async function decorateFooterBar(block) {
  const [canvasRow, copyrightRow, linksRow] = [...block.children];
  const [t, canvas] = await Promise.all([
    getPlaceholders(), buildCanvas(canvasRow?.firstElementChild),
  ]);
  const bar = document.createElement('div');
  bar.className = 'footer-bar';

  const copyrightCell = copyrightRow?.firstElementChild;
  if (copyrightCell?.textContent.trim()) {
    const copyright = fromCell(copyrightCell, 'div', 'footer-copyright');
    fillYear(copyright);
    bar.append(copyright);
  }
  const links = buildLinkList(linksRow?.firstElementChild, t('footerLinks', 'Footer links'));
  if (links) bar.append(links);

  // an empty bar (no copyright, no links) isn't rendered
  block.replaceChildren(...[canvas, bar.children.length ? bar : null].filter(Boolean));
}

/**
 * The page footer: the footer page as a fragment, plus the locale's Social Links.
 * @param {Element} block
 */
async function decoratePageFooter(block) {
  const [{
    config, disabled, source, fragment,
  }, socialLinks, t] = await Promise.all([
    loadLayoutFragment('footer'), getSocialLinks(), getPlaceholders(),
  ]);

  block.textContent = '';
  block.dataset.layoutSource = source;
  // switched off by the template (Show Footer: no) or the page (Footer: none)
  if (disabled) {
    block.closest('footer')?.setAttribute('hidden', '');
    return;
  }
  block.closest('footer')?.classList.add(`footer-${config.footerVariation}`);
  const footer = document.createElement('div');
  while (fragment?.firstElementChild) footer.append(fragment.firstElementChild);

  // the locale's Social Links data sheet, in Sort Order
  const social = buildSocialLinks(
    socialLinks,
    'footer-social',
    (platform) => t('followUsOn', 'Follow us on {platform}', { platform }),
  );
  if (social) footer.append(social);

  block.append(footer);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // the page footer is the block aem.js puts directly into <footer>
  if (block.parentElement?.tagName === 'FOOTER') await decoratePageFooter(block);
  else await decorateFooterBar(block);
}
