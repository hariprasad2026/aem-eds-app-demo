import {
  ROLES, STATES, assignRoles, resolveJourney,
} from './canvas-journey-state.js';

/*
 * Canvas journey controller: coordinates all Conversation Canvas instances of the page
 * (header, page sections, footer) so that at most one floats at a time, each docks in its own
 * place when it is in view, and the footer Canvas is the final stop. See README.md.
 *
 * It only observes and toggles classes: authored content stays in its own block (no DOM moves,
 * no copies), so the reading order, focus and Universal Editor instrumentation are unchanged.
 * Positions come from IntersectionObserver entries (no layout reads on scroll).
 */

const FLOATING = 'conversation-canvas-floating'; // on the row that floats (existing class)
const OWNER = 'conversation-canvas-floating-owner'; // on the block whose row floats
const DOCKED = 'conversation-canvas-docked'; // on the block docked in view
const NEAR_MARGIN = '0px 0px 25% 0px'; // "approaching": within a quarter viewport below

const entries = new Map(); // id -> instance
let ordered = []; // instances with roles, in DOM order
let result = { state: STATES.INITIAL, floatingId: null, dockedId: null };
const env = {
  enabled: true, navOpen: false, footerVisible: false, direction: 'down', focusedId: null,
};
let zoneObserver;
let nearObserver;
let footerObserver;
let resizeObserver;
let frame;
let lastScrollY = 0;
let zoneTop = 0;

const desktopNav = window.matchMedia('(min-width: 900px)');

/** the part of the viewport hidden under a fixed header (mobile/tablet nav bar) */
function headerObstruction() {
  const wrapper = document.querySelector('header .nav-wrapper');
  if (!wrapper || getComputedStyle(wrapper).position !== 'fixed') return 0;
  return Math.round(wrapper.getBoundingClientRect().bottom);
}

function apply(next) {
  const changed = next.state !== result.state || next.floatingId !== result.floatingId
    || next.dockedId !== result.dockedId;
  result = next;
  entries.forEach((entry) => {
    const floating = entry.id === next.floatingId;
    const wasFloating = entry.row.classList.contains(FLOATING);
    if (!entry.primary && floating && !wasFloating) {
      // keep the space of the row while it floats, so the page doesn't jump (read once)
      entry.slot.style.minHeight = `${entry.slot.offsetHeight}px`;
    }
    entry.row.classList.toggle(FLOATING, floating);
    if (!entry.primary && !floating) entry.slot.style.minHeight = '';
    // the Primary dock has no place in the page: hidden docks can't be reached
    if (entry.primary) entry.row.inert = !floating;
    entry.block.classList.toggle(OWNER, floating);
    entry.block.classList.toggle(DOCKED, entry.id === next.dockedId);
    entry.block.dataset.canvasRole = entry.role;
  });
  document.documentElement.dataset.canvasJourney = next.state;
  const root = document.documentElement.style;
  if (!next.floatingId) root.removeProperty('--canvas-floating-clearance');
  else if (changed) {
    // the row plus a gap above it (read once per hand-off; resizes come from the observer)
    root.setProperty('--canvas-floating-clearance', `${entries.get(next.floatingId).row.offsetHeight + 32}px`);
  }
  if (changed) {
    document.dispatchEvent(new CustomEvent('conversation-canvas:journey', { detail: { ...next } }));
  }
}

function update() {
  frame = null;
  // fragments (e.g. the footer's Canvas page) are decorated before they are attached:
  // their role and order are known once they are in the page
  const attached = [...entries.values()].filter((e) => !e.attached && e.block.isConnected);
  if (attached.length) {
    attached.forEach((entry) => {
      entry.attached = true;
      entry.inFooter = !!entry.block.closest('footer');
    });
    // eslint-disable-next-line no-use-before-define
    orderEntries();
  }
  apply(resolveJourney(ordered.map((id) => entries.get(id)), env, result));
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(update);
}

function trackDirection() {
  const y = window.scrollY;
  if (y !== lastScrollY) env.direction = y > lastScrollY ? 'down' : 'up';
  lastScrollY = y;
}

function onZone(observed) {
  trackDirection();
  observed.forEach((e) => {
    const entry = entries.get(e.target.dataset.canvasId);
    if (!entry) return;
    entry.visible = e.isIntersecting;
    // rootBounds is null in a cross-origin frame (e.g. Universal Editor): use the zone top
    const top = e.rootBounds ? e.rootBounds.top : zoneTop;
    entry.passed = !e.isIntersecting && e.boundingClientRect.bottom <= top;
  });
  schedule();
}

function onNear(observed) {
  observed.forEach((e) => {
    const entry = entries.get(e.target.dataset.canvasId);
    if (entry) entry.near = e.isIntersecting;
  });
  schedule();
}

function observeFooter() {
  footerObserver?.disconnect();
  const footer = document.querySelector('footer');
  if (!footer) return;
  footerObserver = new IntersectionObserver(([e]) => {
    trackDirection();
    env.footerVisible = e.isIntersecting;
    schedule();
  });
  footerObserver.observe(footer);
}

/** (re)creates the docking zone observers, e.g. when the fixed header height changes */
function observeZones() {
  zoneTop = headerObstruction();
  zoneObserver?.disconnect();
  nearObserver?.disconnect();
  zoneObserver = new IntersectionObserver(onZone, { rootMargin: `-${zoneTop}px 0px 0px 0px` });
  nearObserver = new IntersectionObserver(onNear, { rootMargin: NEAR_MARGIN });
  entries.forEach((entry) => {
    if (!entry.slot) return;
    zoneObserver.observe(entry.slot);
    nearObserver.observe(entry.slot);
  });
}

/** the floating row's height, so focused content can be scrolled clear of it */
function onRowResize(observed) {
  observed.forEach((e) => {
    const entry = entries.get(e.target.dataset.canvasId);
    if (entry?.id !== result.floatingId) return;
    const height = Math.ceil(e.borderBoxSize?.[0]?.blockSize ?? e.contentRect.height);
    // the row plus a gap above it
    document.documentElement.style.setProperty('--canvas-floating-clearance', `${height + 32}px`);
  });
}

function orderEntries() {
  const list = [...entries.values()].filter((entry) => entry.attached).sort((a, b) => (
    // eslint-disable-next-line no-bitwise
    a.block.compareDocumentPosition(b.block) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  assignRoles(list).forEach(({ id, role }) => { entries.get(id).role = role; });
  ordered = list.map((entry) => entry.id);
}

/** drops instances whose block left the page (e.g. re-rendered by Universal Editor) */
function prune() {
  entries.forEach((entry, id) => {
    if (!entry.attached || entry.block.isConnected) return;
    if (entry.slot) {
      zoneObserver?.unobserve(entry.slot);
      nearObserver?.unobserve(entry.slot);
    }
    resizeObserver?.unobserve(entry.row);
    entries.delete(id);
  });
}

function init() {
  resizeObserver = new ResizeObserver(onRowResize);
  observeZones();
  observeFooter();
  // the header and footer load after the main content: watch for the footer once it exists
  if (!document.querySelector('footer')) {
    document.addEventListener('DOMContentLoaded', observeFooter, { once: true });
  }
  desktopNav.addEventListener('change', () => {
    env.navOpen = false;
    observeZones();
  });
  // the header's mobile menu covers the page: the floating Canvas steps aside meanwhile
  document.addEventListener('header:nav-toggle', (e) => {
    env.navOpen = !!e.detail?.expanded && !desktopNav.matches;
    schedule();
  });
}

/**
 * Adds a Canvas instance to the journey (once per block).
 * @param {Object} instance
 * @param {Element} instance.block the conversation canvas block
 * @param {Element} instance.row the element that floats (search row, or the Primary dock)
 * @param {Element | null} instance.slot its place in the page (none for the Primary dock)
 * @param {string} instance.id unique id of the instance
 * @param {boolean} instance.primary Primary (sticky) style
 */
export function registerCanvas({
  block, row, slot, id, primary,
}) {
  if (block.dataset.canvasId) return;
  if (!zoneObserver) init();
  prune();
  block.dataset.canvasId = id;
  row.dataset.canvasId = id;
  if (slot) slot.dataset.canvasId = id;
  entries.set(id, {
    id,
    block,
    row,
    slot,
    primary,
    attached: block.isConnected,
    inFooter: !!block.closest('footer'),
    stayInPlace: block.classList.contains('canvas-static'),
    visible: false,
    near: false,
    passed: false,
  });
  orderEntries();
  if (slot) {
    zoneObserver.observe(slot);
    nearObserver.observe(slot);
  }
  resizeObserver.observe(row);
  // keyboard focus on the floating controls keeps them where they are
  row.addEventListener('focusin', () => { env.focusedId = id; });
  row.addEventListener('focusout', (e) => {
    if (row.contains(e.relatedTarget)) return;
    env.focusedId = null;
    schedule();
  });
  schedule();
}

/** the current journey state, e.g. for analytics or tests in the browser */
export function getCanvasJourney() {
  return {
    ...result,
    instances: ordered.map((id) => {
      const { role, visible, passed } = entries.get(id);
      return {
        id, role, visible, passed,
      };
    }),
  };
}

export { ROLES, STATES };
