/**
 * Scroller decorator: enhances a horizontally scrolling element (CSS overflow-x and scroll snap
 * do the scrolling) with previous / next buttons, a scroll indicator, mouse dragging and
 * keyboard steps. It only acts while the element actually scrolls (its CSS can switch between a
 * grid and a scroller per breakpoint): the buttons reflect the start / end, the element is a
 * keyboard-focusable region and data-overflow="true" is set on it. Without JavaScript the
 * content still scrolls natively.
 */
import { prefersReducedMotion } from '../utils/environment.js';

const EDGE = 2;

/**
 * @param {HTMLElement} viewport the scrolling element (overflow-x: auto in its scroll modes)
 * @param {Object} options
 * @param {HTMLElement} [options.list] the element holding the items (default: the viewport)
 * @param {HTMLButtonElement} [options.previous]
 * @param {HTMLButtonElement} [options.next]
 * @param {HTMLElement} [options.indicator] its first child is the thumb; sized with
 *   --scroller-thumb-size and --scroller-thumb-offset (0 to 1)
 * @param {'one-card'|'viewport'} [options.step]
 * @param {boolean} [options.loop] next at the end goes to the start (and previous at the start)
 * @param {boolean} [options.drag] mouse dragging
 * @param {boolean} [options.keyboard] arrow keys, Home and End on the focused region
 * @param {boolean} [options.reducedMotion] no smooth scrolling for prefers-reduced-motion
 * @param {number} [options.initialIndex] the item scrolled to first
 * @param {(direction: string) => void} [options.onNavigate] after a button or key step
 * @returns {{ update: Function, scrollToItem: Function, destroy: Function }}
 */
// eslint-disable-next-line import/prefer-default-export
export function createScroller(viewport, options = {}) {
  const {
    list = viewport, previous, next, indicator, step = 'one-card', loop = false, drag = true,
    keyboard = true, reducedMotion = true, initialIndex = 0, onNavigate,
  } = options;
  const items = () => [...list.children].filter((item) => item.offsetParent !== null);
  const behavior = () => (reducedMotion && prefersReducedMotion() ? 'auto' : 'smooth');
  const scrolls = () => /(auto|scroll)/.test(getComputedStyle(viewport).overflowX)
    && viewport.scrollWidth > viewport.clientWidth + EDGE;
  const maxScroll = () => viewport.scrollWidth - viewport.clientWidth;
  // the scroll position that brings an item to the start (the first item is at 0)
  const startOf = (item) => item.offsetLeft - (list.firstElementChild?.offsetLeft || 0);

  let frame = 0;
  function update() {
    frame = 0;
    const active = scrolls();
    viewport.dataset.overflow = String(active);
    if (active) viewport.tabIndex = 0;
    else viewport.removeAttribute('tabindex');
    const atStart = viewport.scrollLeft <= EDGE;
    const atEnd = viewport.scrollLeft >= maxScroll() - EDGE;
    if (previous) previous.disabled = !active || (!loop && atStart);
    if (next) next.disabled = !active || (!loop && atEnd);
    if (indicator) {
      const size = active ? viewport.clientWidth / viewport.scrollWidth : 1;
      const offset = active && maxScroll() ? viewport.scrollLeft / maxScroll() : 0;
      indicator.style.setProperty('--scroller-thumb-size', size.toFixed(4));
      indicator.style.setProperty('--scroller-thumb-offset', offset.toFixed(4));
    }
  }
  const schedule = () => {
    frame = frame || requestAnimationFrame(update);
  };

  function scrollToItem(index, instant = false) {
    const all = items();
    const item = all[Math.max(0, Math.min(index, all.length - 1))];
    if (!item) return;
    viewport.scrollTo({ left: startOf(item), behavior: instant ? 'auto' : behavior() });
  }

  function go(direction) {
    if (!scrolls()) return;
    const forward = direction === 'next';
    const left = viewport.scrollLeft;
    if (loop && forward && left >= maxScroll() - EDGE) {
      viewport.scrollTo({ left: 0, behavior: behavior() });
    } else if (loop && !forward && left <= EDGE) {
      viewport.scrollTo({ left: maxScroll(), behavior: behavior() });
    } else if (step === 'viewport') {
      viewport.scrollBy({ left: (forward ? 1 : -1) * viewport.clientWidth, behavior: behavior() });
    } else {
      const starts = items().map(startOf);
      const target = forward ? starts.find((start) => start > left + EDGE)
        : [...starts].reverse().find((start) => start < left - EDGE);
      viewport.scrollTo({ left: target ?? (forward ? maxScroll() : 0), behavior: behavior() });
    }
    onNavigate?.(direction);
  }

  const cleanups = [];
  const listen = (target, type, handler, opts) => {
    target.addEventListener(type, handler, opts);
    cleanups.push(() => target.removeEventListener(type, handler, opts));
  };

  listen(viewport, 'scroll', schedule, { passive: true });
  if (previous) listen(previous, 'click', () => go('previous'));
  if (next) listen(next, 'click', () => go('next'));

  if (keyboard) {
    listen(viewport, 'keydown', (e) => {
      if (e.target !== viewport || !scrolls()) return;
      const keys = {
        ArrowRight: () => go('next'),
        ArrowLeft: () => go('previous'),
        Home: () => scrollToItem(0),
        End: () => viewport.scrollTo({ left: maxScroll(), behavior: behavior() }),
      };
      if (!keys[e.key]) return;
      e.preventDefault();
      keys[e.key]();
    });
  }

  // mouse dragging (touch and pens scroll natively); a drag doesn't click the link under it
  if (drag) {
    let start = null;
    let dragged = false;
    listen(viewport, 'pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !scrolls()) return;
      start = { x: e.clientX, left: viewport.scrollLeft };
      dragged = false;
    });
    listen(window, 'pointermove', (e) => {
      if (!start) return;
      const distance = e.clientX - start.x;
      if (!dragged && Math.abs(distance) < 6) return;
      if (!dragged) {
        dragged = true;
        viewport.classList.add('is-dragging');
      }
      viewport.scrollLeft = start.left - distance;
    });
    listen(window, 'pointerup', () => {
      if (!start) return;
      start = null;
      viewport.classList.remove('is-dragging');
    });
    listen(viewport, 'click', (e) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    listen(viewport, 'dragstart', (e) => {
      if (start) e.preventDefault();
    });
  }

  // the initial item once the element first scrolls (it may not be laid out yet)
  let initialPending = initialIndex > 0;
  const resized = new ResizeObserver(() => {
    if (initialPending && scrolls()) {
      initialPending = false;
      scrollToItem(initialIndex, true);
    }
    schedule();
  });
  resized.observe(viewport);
  resized.observe(list);
  cleanups.push(() => resized.disconnect());
  update();

  return {
    update: schedule,
    scrollToItem,
    destroy: () => {
      cancelAnimationFrame(frame);
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
