import { loadFragment } from '../fragment/fragment.js';
import { removeButtonDecoration } from '../../decorators/button-decorator.js';
import { createIdFactory } from '../../utils/ids.js';
import { fillPlaceholder, getPlaceholders } from '../../utils/placeholders.js';
import { getInheritedMetadata } from '../../utils/inherited-metadata.js';
import { resolvePagePath } from '../../utils/site.js';

/*
 * Header: the Navigation page (the page's Navigation property, inherited from its parent pages,
 * else the locale's references/nav) as brand, sections and tools. Mobile: a menu button opens the
 * sections; desktop: each section with a sub-list opens it as a dropdown. The controls are
 * buttons with aria-expanded / aria-controls; the open state is data-expanded for the CSS.
 */

// UI text from the placeholders sheet; English fallbacks until it's loaded in decorate()
let t = (key, fallback, values) => fillPlaceholder(fallback, values);

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

const dropsOf = (navSections) => [...(navSections?.querySelectorAll('.nav-drop') || [])];

/** opens or closes a dropdown (its toggle button and the item's data-expanded) */
function setDrop(drop, expanded) {
  drop.dataset.expanded = String(expanded);
  drop.querySelector(':scope > .nav-drop-toggle')?.setAttribute('aria-expanded', String(expanded));
}

/**
 * Opens or closes all the dropdowns
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether they should be expanded
 */
function toggleAllNavSections(sections, expanded = false) {
  dropsOf(sections).forEach((drop) => setDrop(drop, expanded));
}

/**
 * Opens or closes the whole nav (mobile menu)
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional: force the nav open (true) or closed (false)
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.dataset.expanded === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.dataset.expanded = expanded ? 'false' : 'true';
  // mobile: the sections are open in the menu; desktop: dropdowns start closed
  toggleAllNavSections(navSections, !expanded && !isDesktop.matches);
  button.setAttribute('aria-expanded', String(!expanded && !isDesktop.matches));
  button.setAttribute('aria-label', expanded ? t('openNavigation', 'Open navigation') : t('closeNavigation', 'Close navigation'));
}

/** Escape closes an open dropdown (desktop) or the menu (mobile), focus back on its button */
function closeOnEscape(e) {
  if (e.key !== 'Escape') return;
  const nav = document.getElementById('nav');
  const navSections = nav?.querySelector('.nav-sections');
  if (!nav) return;
  if (isDesktop.matches) {
    const open = dropsOf(navSections).find((drop) => drop.dataset.expanded === 'true');
    if (!open) return;
    toggleAllNavSections(navSections);
    open.querySelector(':scope > .nav-drop-toggle')?.focus();
  } else if (nav.dataset.expanded === 'true') {
    toggleMenu(nav, navSections, false);
    nav.querySelector('.nav-hamburger button')?.focus();
  }
}

/** focus leaving the nav closes the dropdowns (desktop) or the menu (mobile) */
function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (nav.contains(e.relatedTarget)) return;
  const navSections = nav.querySelector('.nav-sections');
  if (isDesktop.matches) toggleAllNavSections(navSections, false);
  else if (nav.dataset.expanded === 'true') toggleMenu(nav, navSections, false);
}

/**
 * A section with a sub-list: its label becomes the dropdown's toggle button (a linked label
 * keeps its link and gets a toggle button next to it).
 */
function decorateDrop(drop, nextId) {
  drop.classList.add('nav-drop');
  const submenu = drop.querySelector(':scope > ul');
  const label = [...drop.childNodes].find((node) => node !== submenu
    && (node.nodeType === Node.ELEMENT_NODE || node.textContent.trim()));
  const text = label?.textContent.trim() || '';
  submenu.id = submenu.id || nextId(text);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-drop-toggle';
  toggle.setAttribute('aria-controls', submenu.id);
  toggle.setAttribute('aria-expanded', 'false');
  if (label?.nodeType === Node.ELEMENT_NODE && label.querySelector('a[href]')) {
    toggle.setAttribute('aria-label', t('showSubmenu', 'Show {label} menu', { label: text }));
    label.after(toggle);
  } else {
    toggle.textContent = text;
    label?.replaceWith(toggle);
    if (!label) drop.prepend(toggle);
  }
  drop.dataset.expanded = 'false';
  toggle.addEventListener('click', () => {
    const expanded = drop.dataset.expanded === 'true';
    if (isDesktop.matches) toggleAllNavSections(drop.closest('.nav-sections'));
    setDrop(drop, !expanded);
  });
}

/** the menu button (mobile), drawn by the CSS (an animated icon) */
function buildHamburger(nav, navSections) {
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-controls', 'nav-sections');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', t('openNavigation', 'Open navigation'));
  const icon = document.createElement('span');
  icon.className = 'nav-hamburger-icon';
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon);
  button.addEventListener('click', () => toggleMenu(nav, navSections));
  hamburger.append(button);
  return hamburger;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  t = await getPlaceholders();
  // load nav as fragment: the Navigation page property of the page or, inherited, of its nearest
  // parent page up to Home (or the metadata sheet's nav column), else the locale's references/nav
  const navPath = resolvePagePath(await getInheritedMetadata('nav'), 'references/nav');
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  // no nav page published (e.g. a new locale): leave the header empty
  if (!fragment) return;
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', t('mainNavigation', 'Main navigation'));
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // the logo link is a plain link, not a button
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) removeButtonDecoration(navBrand.querySelector('.button, .link-button'));

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.id = 'nav-sections';
    const nextId = createIdFactory('nav-submenu');
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector(':scope > ul')) decorateDrop(navSection, nextId);
    });
  }

  nav.prepend(buildHamburger(nav, navSections));
  nav.dataset.expanded = 'false';
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));
  window.addEventListener('keydown', closeOnEscape);
  nav.addEventListener('focusout', closeOnFocusLost);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
