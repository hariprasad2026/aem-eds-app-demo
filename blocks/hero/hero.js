import { moveInstrumentation } from '../../scripts/scripts.js';
import { createAnimation } from '../../decorators/animation-decorator.js';
import { decorateButton } from '../../decorators/button-decorator.js';
import { readButtonOptions } from '../../utils/buttons.js';
import { isEditing, prefersReducedMotion } from '../../utils/environment.js';
import { NEW_WINDOW, readLinkItems } from '../../utils/links.js';
import { onVisible } from '../../utils/viewport.js';
import { isAnimation } from '../../utils/media.js';

/*
 * Hero (blocks/hero/_hero.json). Authored rows, in any order:
 * - content: icon, eyebrow, title (heading) and description (element group "content_")
 * - media: the hero image, or a link to a Lottie animation (.json) for the Lotto image type
 * - CTA List: a composite multifield, one link per item, each with an optional
 *   "new-window" Link Type value and a CTA Arrow (right | down; without one, links to the
 *   page's own sections point down); the CTA view is the link's bold (primary) / italic
 *   (secondary) formatting
 * Block options (TCS DS Figma "L1 Header" variations): lottie (Hero Image type Lotto),
 * media-contained (Hero View), motion-fade | motion-slide | motion-zoom (Motion Type),
 * align-top | align-middle | align-bottom (Vertical Alignment),
 * align-left | align-center | align-right (Horizontal Alignment, the content position),
 * text-left | text-center | text-right (Text Alignment, inside the content),
 * bg-light | bg-dark | bg-dark-subtle | bg-black (BG Color).
 */

const MOTIONS = ['motion-fade', 'motion-slide', 'motion-zoom'];
// CTA Arrow values, and every value a CTA List item holds besides its link
const ARROWS = ['right', 'down'];
const CTA_VALUES = [NEW_WINDOW, ...ARROWS];

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/**
 * Motion Type: the animation plays when the hero comes into view. Without it (none, reduced
 * motion, Universal Editor) the hero shows as is.
 */
function observeMotion(block) {
  if (!MOTIONS.some((motion) => block.classList.contains(motion))) return;
  if (isEditing() || prefersReducedMotion()) return;
  block.classList.add('motion-ready');
  onVisible(block, () => block.classList.add('is-visible'), { threshold: 0.1 });
}

/** a cell holding only links (and Link Type values): the CTA List */
function isCtaCell(cell) {
  const links = [...cell.querySelectorAll('a[href]')];
  if (!links.length || cell.querySelector(HEADINGS)) return false;
  const linkText = links.map((a) => a.textContent).join('');
  const rest = cell.cloneNode(true);
  rest.querySelectorAll('p, li, div, span').forEach((el) => {
    if (CTA_VALUES.includes(el.textContent.trim())) el.remove();
  });
  const text = rest.textContent.replace(new RegExp(NEW_WINDOW, 'g'), '');
  return text.replace(/\s/g, '') === linkText.replace(/\s/g, '');
}

/** a cell holding only the hero image or an animation link */
function isMediaCell(cell) {
  if (cell.querySelector(HEADINGS)) return false;
  const pictures = cell.querySelectorAll('picture');
  const links = [...cell.querySelectorAll('a[href]')];
  if (pictures.length === 1 && !cell.textContent.trim()) return true;
  return links.length === 1 && isAnimation(links[0].href)
    && cell.textContent.trim() === links[0].textContent.trim();
}

/** sorts the authored rows into content, media and CTA List cells */
function readCells(block) {
  const cells = { content: null, media: null, ctas: null };
  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    // media first: an animation link alone would also pass as a CTA List
    if (!cells.media && isMediaCell(cell)) cells.media = cell;
    else if (!cells.ctas && isCtaCell(cell)) cells.ctas = cell;
    else if (!cells.content) cells.content = cell;
    else cells.content.append(...cell.childNodes);
  });
  return cells;
}

function buildMedia(block, cell) {
  if (!cell) return null;
  const media = document.createElement('div');
  media.className = 'hero-media';
  const picture = cell.querySelector('picture');
  const link = cell.querySelector('a[href]');

  if (block.classList.contains('lottie') && link && isAnimation(link.href)) {
    const label = link.title && link.title !== link.textContent ? link.title : '';
    const animation = createAnimation(link.href, { label, className: 'hero-animation' });
    media.append(animation);
    // the pause / play button above the overlay and the content, in the block's corner
    block.append(animation.animationToggle);
  } else if (picture) {
    // the hero image is the LCP candidate when the hero opens the page
    const img = picture.querySelector('img');
    if (img && block.closest('main > .section:first-of-type')) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
    media.append(picture);
  } else {
    return null;
  }
  return media;
}

/** icon, eyebrow and title come before the heading, the description after it */
function buildContent(cell) {
  const content = document.createElement('div');
  content.className = 'hero-content';
  if (!cell) return content;

  const elements = [...cell.children];
  const heading = cell.querySelector(`:scope > :is(${HEADINGS})`);
  const headingIndex = elements.indexOf(heading);
  const description = document.createElement('div');
  description.className = 'hero-description';

  elements.forEach((el, i) => {
    const picture = el.matches('picture') ? el : el.querySelector(':scope > picture');
    const before = headingIndex < 0 || i < headingIndex;
    if (picture && before && !content.querySelector('.hero-icon')
      && !el.textContent.trim()) {
      const icon = document.createElement('div');
      icon.className = 'hero-icon';
      icon.append(picture);
      content.append(icon);
    } else if (el === heading) {
      el.classList.add('hero-title');
      content.append(el);
    } else if (before && headingIndex >= 0 && !content.querySelector('.hero-eyebrow')) {
      el.classList.add('hero-eyebrow');
      content.append(el);
    } else {
      description.append(el);
    }
  });
  if (description.children.length) content.append(description);
  return content;
}

function buildCtas(cell) {
  if (!cell) return null;
  const ctas = document.createElement('div');
  ctas.className = 'hero-ctas';
  readLinkItems(cell).forEach(({ link: a, newWindow, values }) => {
    // CTA view: Primary / Secondary buttons; Default is a text link with an arrow
    const { type } = readButtonOptions(a);
    decorateButton(a, {
      view: 'button',
      type: ['primary', 'secondary'].includes(type) ? type : 'tertiary',
      newWindow,
    });
    const arrow = values.find((value) => ARROWS.includes(value));
    if (arrow === 'down' || (!arrow && a.getAttribute('href').startsWith('#'))) {
      a.classList.add('hero-cta-down');
    }
    ctas.append(a);
  });
  return ctas.children.length ? ctas : null;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const cells = readCells(block);
  const media = buildMedia(block, cells.media);
  const content = buildContent(cells.content);
  const ctas = buildCtas(cells.ctas);
  if (ctas) content.append(ctas);
  // keep Universal Editor instrumentation of the authored cells
  if (media) moveInstrumentation(cells.media, media);
  if (cells.content) moveInstrumentation(cells.content, content);
  if (ctas) moveInstrumentation(cells.ctas, ctas);

  block.classList.toggle('hero-has-media', !!media);
  block.replaceChildren(...[media, content].filter(Boolean));
  observeMotion(block);
}
