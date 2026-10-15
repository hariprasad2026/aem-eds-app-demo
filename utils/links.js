/**
 * Links utils: read authored links and their Link Type ("Open in New Window") values.
 */
import { readMultifieldItems } from './multifield.js';

/** value of the "Open in New Window" Link Type option in the block models */
export const NEW_WINDOW = 'new-window';

/** the link of a single-link property (link + text collapsed into one anchor) */
export const linkOf = (cell) => cell?.querySelector('a[href]') || null;

/**
 * Reads a CTA List composite multifield cell: one link per item, each with an optional
 * "new-window" Link Type value and the item's other select values (e.g. an arrow direction).
 * @param {Element} cell
 * @returns {{ link: HTMLAnchorElement, newWindow: boolean, values: string[] }[]}
 */
export function readLinkItems(cell) {
  return readMultifieldItems(cell).map((item) => {
    const link = item.map((el) => (el.matches('a[href]') ? el : el.querySelector('a[href]')))
      .find(Boolean);
    // the values next to the link: elements of the item, or of its list item
    const parts = item.flatMap((el) => (link && el !== link && el.contains(link)
      && el.children.length > 1 ? [...el.children] : [el]));
    const values = parts.filter((el) => !link || !el.contains(link))
      .map((el) => el.textContent.trim()).filter(Boolean);
    const newWindow = values.includes(NEW_WINDOW) || item.some((el) => {
      const text = el.contains(link) ? el.textContent.replace(link.textContent, '') : el.textContent;
      return text.trim() === NEW_WINDOW;
    });
    return { link, newWindow, values };
  }).filter(({ link }) => link);
}
