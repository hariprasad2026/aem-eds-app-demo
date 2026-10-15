import { fromCell } from '../../decorators/content-decorator.js';
import { buildHeading } from '../../decorators/heading-decorator.js';
import { pictureOf } from '../../decorators/image-decorator.js';
import { optionOf, readProperties, textOf } from '../../utils/properties.js';

/*
 * Quote (blocks/quote/_quote.json): a key-value block. Eyebrow and title above a quote card
 * with large quote marks, overlapping a portrait image (Figma "Text & Image Overlap"). The image
 * is on the right (or left) on desktop, above (or below) the quote on mobile.
 */

const BG_COLORS = ['grey'];
const IMAGE_POSITIONS = ['right', 'left'];
const IMAGE_POSITIONS_MOBILE = ['top', 'bottom'];

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const props = readProperties(block);
  const bgColor = optionOf(block, props.bgcolor, BG_COLORS);
  const imagePosition = optionOf(block, props.imageposition, IMAGE_POSITIONS) || 'right';
  const imagePositionMobile = optionOf(block, props.imagepositionmobile, IMAGE_POSITIONS_MOBILE)
    || 'top';

  const header = document.createElement('div');
  header.className = 'quote-header';
  if (textOf(props.eyebrow)) header.append(fromCell(props.eyebrow, 'p', 'quote-eyebrow'));
  const title = buildHeading(props.title, props.titletype, 'quote-title');
  if (title) header.append(title);

  const card = document.createElement('figure');
  card.className = 'quote-card';
  const text = document.createElement('div');
  text.className = 'quote-card-text';
  if (textOf(props.quote)) text.append(fromCell(props.quote, 'blockquote', 'quote-text'));
  if (textOf(props.author)) text.append(fromCell(props.author, 'figcaption', 'quote-author'));
  card.append(text);

  const body = document.createElement('div');
  body.className = 'quote-body';
  if (text.children.length) body.append(card);
  const picture = pictureOf(props.image, props.imagealt);
  if (picture) {
    const media = document.createElement('div');
    media.className = 'quote-media';
    media.append(picture);
    body.append(media);
  }

  block.classList.remove(...BG_COLORS.map((color) => `bg-${color}`));
  if (bgColor) block.classList.add(`bg-${bgColor}`);
  block.classList.toggle('quote-has-media', !!picture);
  block.classList.toggle('image-left', imagePosition === 'left');
  block.classList.toggle('image-bottom', imagePositionMobile === 'bottom');
  block.replaceChildren(...[header, body].filter((part) => part.children.length));
}
