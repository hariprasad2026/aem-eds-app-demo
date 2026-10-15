import { toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { isEditing, scrollBehavior } from '../../utils/environment.js';
import { readMultifieldItems } from '../../utils/multifield.js';
import { isOn, readProperties } from '../../utils/properties.js';
import { getPlaceholders } from '../../utils/placeholders.js';

/*
 * Anchor List (blocks/anchor-list/_anchor-list.json): chapter navigation. Each link jumps to
 * the section whose Anchor name (Section properties) matches, or to an element with that id.
 * The link of the section in view is marked current (Figma "Chapter Nav"). With Sticky, the
 * list is pinned to the top of the screen once it scrolls up to it, for the rest of the page.
 */

/**
 * Reads the Links composite multifield: items are runs of elements between <hr>s (or list
 * items), each with a Link Title and an Anchor Name.
 * @returns {{ label: string, anchor: string }[]}
 */
function readAnchors(cell) {
  return readMultifieldItems(cell).map((item) => {
    const texts = item.map((el) => el.textContent.trim()).filter(Boolean);
    const [label, anchor] = texts;
    // an anchor name may be typed with or without "#"; fall back to the title
    return { label, anchor: toClassName((anchor || label || '').replace(/^#/, '')) };
  }).filter(({ label, anchor }) => label && anchor);
}

const targetOf = (anchor) => document.getElementById(anchor);

/** the height of the site header when it stays on screen (fixed on mobile), else 0 */
function headerHeight() {
  const header = document.querySelector('header .nav-wrapper');
  const fixed = header && ['fixed', 'sticky'].includes(getComputedStyle(header).position);
  return fixed ? header.getBoundingClientRect().height : 0;
}

/** space to leave above a target: below the list when it is sticky, else below the header */
function scrollOffset(block) {
  const list = block.classList.contains('sticky') ? block.offsetHeight : 0;
  return Math.ceil(headerHeight() + list + 16);
}

/**
 * Sticky: pins the list to the top of the screen (below a fixed header) once its place has
 * scrolled up to it, for the rest of the page. A position: sticky element would only stay
 * within its section and main, so a short section or page lets it scroll away. The wrapper
 * keeps the list's height while it is pinned, so the page doesn't jump. Not pinned while
 * editing in Universal Editor, so it doesn't cover the content being edited.
 */
function pinWhenScrolled(block) {
  const slot = block.parentElement;
  let frame = 0;
  const update = () => {
    frame = 0;
    const top = headerHeight();
    const pinned = !isEditing() && slot.getBoundingClientRect().top <= top;
    slot.style.minHeight = pinned ? `${block.offsetHeight}px` : '';
    block.style.top = pinned ? `${top}px` : '';
    block.classList.toggle('anchor-list-pinned', pinned);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  // the header, sections and footer load later and move the list's place
  new ResizeObserver(schedule).observe(document.body);
  // Universal Editor switches between edit and preview mode with a class on <html>
  new MutationObserver(schedule).observe(document.documentElement, {
    attributes: true, attributeFilter: ['class'],
  });
  update();
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const t = await getPlaceholders();
  const props = readProperties(block);
  const anchors = readAnchors(props.anchors);
  block.classList.toggle('sticky', isOn(props.sticky));

  const nav = document.createElement('nav');
  nav.className = 'anchor-list-nav';
  nav.setAttribute('aria-label', t('onThisPage', 'On this page'));
  const list = document.createElement('ul');
  list.className = 'anchor-list-items';
  if (props.anchors) moveInstrumentation(props.anchors, list);

  // the current chapter; set by the scroll position, and right away by a click
  let current = null;
  // while a clicked chapter scrolls into view, the scroll position doesn't change the current one
  let lockedUntil = 0;
  const setCurrent = (link) => {
    if (link === current) return;
    current?.removeAttribute('aria-current');
    current = link;
    if (!link) return;
    link.setAttribute('aria-current', 'location');
    // keep the current link visible when the list scrolls sideways
    const left = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2;
    list.scrollTo({ left, behavior: scrollBehavior() });
  };

  const links = anchors.map(({ label, anchor }) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'anchor-list-link';
    a.href = `#${anchor}`;
    a.textContent = label;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setCurrent(a);
      // until the scroll to the chapter ends (scrollend), with a fallback for older browsers
      lockedUntil = Date.now() + 3000;
      const target = targetOf(anchor);
      // no target on this page (e.g. the block library): only the link is marked current
      if (!target) return;
      target.style.scrollMarginTop = `${scrollOffset(block)}px`;
      target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      window.history.replaceState(null, '', `#${anchor}`);
      // move keyboard focus to the chapter without scrolling again
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
    li.append(a);
    list.append(li);
    return a;
  });
  nav.append(list);
  block.replaceChildren(nav);
  if (!links.length) return;
  if (block.classList.contains('sticky')) pinWhenScrolled(block);

  // current chapter: the last target whose top has scrolled past the offset
  let frame = 0;
  const update = () => {
    frame = 0;
    if (Date.now() < lockedUntil) return;
    const offset = scrollOffset(block) + 1;
    const visible = anchors.map(({ anchor }, i) => ({ target: targetOf(anchor), link: links[i] }))
      // skip missing targets and sections that are still hidden while the page loads
      .filter(({ target }) => target?.getClientRects().length);
    let active = null;
    visible.forEach(({ target, link }) => {
      if (target.getBoundingClientRect().top <= offset) active = link;
    });
    // at the end of the page the last chapter may never reach the top
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd && visible.length && window.scrollY > 0) active = visible[visible.length - 1].link;
    // without targets on the page, keep the clicked (or first) link
    if (!visible.length) {
      if (!current) setCurrent(links[0]);
      return;
    }
    setCurrent(active || links[0]);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  // the clicked chapter has scrolled into view: it stays current until the next scroll (near the
  // end of the page the scroll position could point to a later chapter)
  window.addEventListener('scrollend', () => { lockedUntil = 0; });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  // sections are shown as they load: check again once they are visible
  new ResizeObserver(schedule).observe(document.body);

  // the page address names a chapter (a link to it, back / forward, or a page opened at
  // #anchor): its link is current, also when the chapter isn't on the page
  const fromHash = () => {
    const anchor = toClassName(decodeURIComponent(window.location.hash.slice(1)));
    const index = anchor ? anchors.findIndex((item) => item.anchor === anchor) : -1;
    if (index < 0) return false;
    setCurrent(links[index]);
    lockedUntil = Date.now() + 3000;
    return true;
  };
  window.addEventListener('hashchange', fromHash);
  if (!fromHash()) update();
}
