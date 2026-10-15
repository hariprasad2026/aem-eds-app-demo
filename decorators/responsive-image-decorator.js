/**
 * Responsive image decorator: images built from a URL (e.g. a section background or an
 * image property value). Kept free of scripts.js imports so scripts.js can use it.
 */
import { createOptimizedPicture } from '../scripts/aem.js';

/**
 * Builds an image from a URL: site media is optimized (responsive <picture>), other URLs are
 * used as they are.
 * @param {{ src: string, alt?: string } | null} img
 * @param {Array} [breakpoints] widths passed to createOptimizedPicture
 * @returns {Element | null}
 */
// eslint-disable-next-line import/prefer-default-export
export function buildImage(img, breakpoints = [{ width: '750' }]) {
  if (!img?.src) return null;
  const url = new URL(img.src, window.location.href);
  if (url.origin === window.location.origin && url.pathname.includes('/media_')) {
    return createOptimizedPicture(url.href, img.alt || '', false, breakpoints);
  }
  const el = document.createElement('img');
  el.src = url.href;
  el.alt = img.alt || '';
  el.loading = 'lazy';
  return el;
}
