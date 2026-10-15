/**
 * Author bio decorator: an "about the author" card from an Authors data sheet entry
 * (utils/data.js getAuthor).
 */
import { setLinkTarget } from './link-decorator.js';
import { buildImage } from './responsive-image-decorator.js';

const textElement = (tagName, className, text) => {
  const el = document.createElement(tagName);
  el.className = className;
  el.textContent = text;
  return el;
};

/**
 * Builds the author bio card.
 * @param {{ name: string, designation: string, region: string, bio: string, image: string,
 *   linkedin: string } | null} author
 * @param {{ heading: string, linkedinLabel: string }} labels
 * @returns {Element | null}
 */
// eslint-disable-next-line import/prefer-default-export
export function buildAuthorBio(author, { heading, linkedinLabel }) {
  if (!author?.name) return null;
  const card = document.createElement('div');
  card.className = 'author-bio';

  const picture = buildImage(author.image ? { src: author.image, alt: '' } : null);
  if (picture) {
    const media = document.createElement('div');
    media.className = 'author-bio-image';
    media.append(picture);
    card.append(media);
  }

  const body = document.createElement('div');
  body.className = 'author-bio-body';
  body.append(textElement('h2', 'author-bio-heading', heading));
  body.append(textElement('p', 'author-bio-name', author.name));
  const designation = [author.designation, author.region].filter(Boolean).join(', ');
  if (designation) body.append(textElement('p', 'author-bio-designation', designation));
  if (author.bio) body.append(textElement('p', 'author-bio-text', author.bio));
  if (author.linkedin) {
    const p = document.createElement('p');
    const a = textElement('a', 'author-bio-linkedin', linkedinLabel);
    a.href = author.linkedin;
    setLinkTarget(a);
    p.append(a);
    body.append(p);
  }
  card.append(body);
  return card;
}
