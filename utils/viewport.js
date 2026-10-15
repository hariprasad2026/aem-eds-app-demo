/**
 * Viewport utils: defer work until content is on screen, and follow it on and off screen.
 */

/**
 * Runs a callback once, the first time an element comes near the viewport.
 * @param {Element} el
 * @param {Function} callback
 * @param {IntersectionObserverInit} [options]
 * @returns {IntersectionObserver}
 */
export function onVisible(el, callback, options = {}) {
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    callback();
  }, options);
  observer.observe(el);
  return observer;
}

/**
 * Calls back whenever an element enters or leaves the viewport.
 * @param {Element} el
 * @param {(visible: boolean) => void} callback
 * @param {IntersectionObserverInit} [options]
 * @returns {IntersectionObserver}
 */
export function watchVisibility(el, callback, options = {}) {
  const observer = new IntersectionObserver(([entry]) => callback(entry.isIntersecting), options);
  observer.observe(el);
  return observer;
}

/**
 * The current breakpoint (the project's: mobile < 600px, tablet 600-1199px, desktop >= 1200px).
 * @returns {'desktop'|'tablet'|'mobile'}
 */
export function currentBreakpoint() {
  if (window.matchMedia('(min-width: 1200px)').matches) return 'desktop';
  return window.matchMedia('(min-width: 600px)').matches ? 'tablet' : 'mobile';
}
