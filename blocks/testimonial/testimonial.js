import { hideVisually } from '../../decorators/a11y-decorator.js';
import { fromCell } from '../../decorators/content-decorator.js';
import { buildHeading } from '../../decorators/heading-decorator.js';
import { pictureOf } from '../../decorators/image-decorator.js';
import { buildStats } from '../../decorators/stats-decorator.js';
import {
  isOn, optionOf, readProperties, textOf,
} from '../../utils/properties.js';

/*
 * Testimonial (blocks/testimonial/_testimonial.json): a key-value block. A section title,
 * then a centered eyebrow, the testimonial quote (Description), the author (Author text, image
 * and Designation & Location) and stats (Figma "Testimonial Block", 404-29822).
 */

const BG_COLORS = ['grey'];

function buildAuthor(props) {
  const author = document.createElement('div');
  author.className = 'testimonial-author';
  const picture = pictureOf(props.authorimage, props.authorimagealt);
  if (picture) {
    const image = document.createElement('div');
    image.className = 'testimonial-author-image';
    image.append(picture);
    author.append(image);
  }
  const text = document.createElement('div');
  text.className = 'testimonial-author-text';
  if (textOf(props.authorname)) {
    text.append(fromCell(props.authorname, 'p', 'testimonial-author-name'));
  }
  if (textOf(props.designationlocation)) {
    text.append(fromCell(props.designationlocation, 'div', 'testimonial-author-details'));
  }
  if (text.children.length) author.append(text);
  return author.children.length ? author : null;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const props = readProperties(block);
  const bgColor = optionOf(block, props.bgcolor, BG_COLORS);

  const title = buildHeading(props.title, props.titletype, 'testimonial-title');
  // Hide Title: kept for screen readers
  if (title && isOn(props.titlehidden)) hideVisually(title);

  const figure = document.createElement('figure');
  figure.className = 'testimonial-quote';
  if (!isOn(props.hideeyebrow) && textOf(props.eyebrow)) {
    figure.append(fromCell(props.eyebrow, 'p', 'testimonial-eyebrow'));
  }
  if (isOn(props.showdescription) && textOf(props.description)) {
    figure.append(fromCell(props.description, 'blockquote', 'testimonial-description'));
  }
  // Hide Author Details: the author, its image and designation are not shown
  const author = isOn(props.hideauthor) ? null : buildAuthor(props);
  if (author) {
    const caption = document.createElement('figcaption');
    caption.append(author);
    figure.append(caption);
  }

  const stats = buildStats(props.stats, 'testimonial');

  block.classList.remove(...BG_COLORS.map((color) => `bg-${color}`));
  if (bgColor) block.classList.add(`bg-${bgColor}`);
  block.replaceChildren(...[title, figure.children.length ? figure : null, stats].filter(Boolean));
}
