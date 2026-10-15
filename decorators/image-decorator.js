/**
 * Image decorator: authored images with their alt text field applied.
 */
import { moveInstrumentation } from '../scripts/scripts.js';
import { textOf } from '../utils/properties.js';

/**
 * The picture of an image property, with the alt text field applied
 * (an empty alt marks the image as decorative).
 * @param {Element} cell the image cell
 * @param {Element} [altCell] the alt text cell
 * @returns {HTMLPictureElement | null}
 */
// eslint-disable-next-line import/prefer-default-export
export function pictureOf(cell, altCell) {
  const picture = cell?.querySelector('picture');
  if (!picture) return null;
  const img = picture.querySelector('img');
  const alt = textOf(altCell);
  if (img && alt) img.alt = alt;
  else if (img && !img.hasAttribute('alt')) img.alt = '';
  moveInstrumentation(cell, picture);
  return picture;
}
