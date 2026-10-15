import { loadFragment } from '../fragment/fragment.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { removeButtonDecoration } from '../../decorators/button-decorator.js';
import { fromCell } from '../../decorators/content-decorator.js';
import { setLinkTarget } from '../../decorators/link-decorator.js';
import { buildSocialLinks } from '../../decorators/social-links-decorator.js';
import { getSocialLinks } from '../../utils/data.js';
import { getInheritedMetadata } from '../../utils/inherited-metadata.js';
import { readLinkItems } from '../../utils/links.js';
import { getPlaceholders } from '../../utils/placeholders.js';
import { resolvePagePath } from '../../utils/site.js';

/*
 * Footer: two roles with one block name.
 * - The page footer (built by aem.js in <footer>): loads the footer page (references/footer by
 *   default, see below) as a fragment.
 * - The authored Footer block on that footer page (blocks/footer/_footer.json): the
 *   Conversation Canvas Page (a page with the conversation-canvas block, loaded as a fragment)
 *   above the bottom bar with the Copyright Text (rich text; {year} becomes the current year)
 *   and the Link List (Link Title, Link Path, Link Type: Default / Open in new window).
 * Figma "Footer - Desktop / Tablet / Mobile" (2496-91965, 2496-94560, 2496-94602).
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

/** the conversation canvas page of the Conversation Canvas Page property, as a fragment */
async function buildCanvas(cell) {
  const value = cell?.querySelector('a[href]')?.getAttribute('href') || cell?.textContent.trim();
  if (!value) return null;
  const fragment = await loadFragment(resolvePagePath(value, ''));
  if (!fragment?.children.length) return null;
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

  block.replaceChildren(...[canvas, bar].filter(Boolean));
}

/**
 * The page footer: the footer page as a fragment, plus the locale's Social Links.
 * @param {Element} block
 */
async function decoratePageFooter(block) {
  // the Footer page property of the page or, inherited, of its nearest parent page up to Home
  // (or the metadata sheet's footer column), else the locale's references/footer
  const footerPath = resolvePagePath(await getInheritedMetadata('footer'), 'references/footer');
  const [fragment, socialLinks, t] = await Promise.all([
    loadFragment(footerPath), getSocialLinks(), getPlaceholders(),
  ]);

  block.textContent = '';
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
