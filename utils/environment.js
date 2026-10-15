/**
 * Environment utils: shared checks of the browsing context, so blocks respect reduced motion
 * and Universal Editor the same way.
 */

/** the visitor asked the system to reduce motion */
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** scroll behavior that respects reduced motion, for scrollTo / scrollIntoView */
export const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');

/** Universal Editor is in edit mode (not preview) */
export const isEditing = () => document.documentElement.classList.contains('adobe-ue-edit');

/**
 * The element is rendered in Universal Editor (it carries editor instrumentation),
 * whether in edit or preview mode.
 * @param {Element} el
 */
export const isInEditor = (el) => !!el?.closest('[data-aue-resource]');
