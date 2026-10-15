import {
  buildAuthorLockup, buildPageActions, buildPublished, buildReadingTime,
} from '../../decorators/article-meta-decorator.js';
import { decorateButton } from '../../decorators/button-decorator.js';
import { announceNewTab, setLinkTarget } from '../../decorators/link-decorator.js';
import { buildImage } from '../../decorators/responsive-image-decorator.js';
import { buildTagList } from '../../decorators/tag-decorator.js';
import { getAuthor } from '../../utils/data.js';
import { readLinkItems } from '../../utils/links.js';
import { getPageMetadata } from '../../utils/metadata.js';
import { getPlaceholders } from '../../utils/placeholders.js';
import { optionOf, readProperties } from '../../utils/properties.js';
import { resolveTags } from '../../utils/taxonomy.js';

/*
 * Page Header (blocks/page-header/_page-header.json): the header of a page, its content from
 * the page's metadata (set on the page or by the locale's bulk metadata sheet): Title,
 * Description, Tags (labels from the locale's taxonomy), content-type, publish-date,
 * reading-time, author-id (name, image, designation and LinkedIn from the locale's Authors
 * data sheet, or the Author metadata), featured-image and listen-link. Share and download come
 * from code; only the Layout and the CTA List are authored. Layouts (TCS DS Figma
 * "Secondary Page Header" / "L3 Header"):
 * - landing: content type eyebrow, large title, description and CTAs; the featured image
 * - secondary: content type eyebrow above both columns; title | description and CTAs
 * - article: meta row (tags, content type | date, reading time, listen / download / share);
 *   title and author | description and CTAs
 * - display: tags eyebrow and a display title | description and CTAs
 * Default: landing for the landing and listing page types, else article.
 */

const LAYOUTS = ['landing', 'secondary', 'article', 'display'];
const LANDING_TEMPLATES = ['landing', 'listing'];
const CTA_STYLES = ['primary', 'secondary'];
const IMAGE_BREAKPOINTS = [{ media: '(min-width: 900px)', width: '1200' }, { width: '750' }];

/** the layout: the block's Layout, or from the Page Type */
function layoutOf(block, props, pageType) {
  return optionOf(block, props.classes, LAYOUTS)
    || (LANDING_TEMPLATES.includes(pageType.toLowerCase()) ? 'landing' : 'article');
}

const textElement = (tagName, className, text) => {
  if (!text) return null;
  const el = document.createElement(tagName);
  if (className) el.className = className;
  el.textContent = text;
  return el;
};

function buildDescription(text) {
  if (!text) return null;
  const el = document.createElement('div');
  el.className = 'page-header-description';
  el.append(textElement('p', '', text));
  return el;
}

/** the CTA List: each CTA in its CTA Link Style (Text link, Primary or Secondary Button) */
function buildCtas(cell) {
  const ctas = document.createElement('div');
  ctas.className = 'page-header-ctas';
  readLinkItems(cell).forEach(({ link, newWindow, values }) => {
    const type = values.find((value) => CTA_STYLES.includes(value)) || 'tertiary';
    decorateButton(link, { view: 'button', type, newWindow });
    ctas.append(link);
  });
  return ctas.children.length ? ctas : null;
}

/** the author name, linked to the author's LinkedIn profile when the Authors sheet has one */
function buildAuthorName(metadata, author, t) {
  const text = author?.name || metadata.author;
  if (!text) return null;
  const name = document.createElement('p');
  name.className = 'page-header-author-name';
  if (author?.linkedin) {
    const a = document.createElement('a');
    a.href = author.linkedin;
    a.textContent = text;
    setLinkTarget(a);
    announceNewTab(a, t('opensInNewTab', '(opens in a new tab)'));
    name.append(a);
  } else {
    name.textContent = text;
  }
  return name;
}

function buildAuthor(metadata, author, t) {
  const designation = [author?.designation, author?.region].filter(Boolean).join(', ');
  return buildAuthorLockup({
    picture: buildImage(author?.image ? { src: author.image, alt: '' } : null),
    name: buildAuthorName(metadata, author, t),
    designation: textElement('p', 'page-header-author-designation', designation),
    prefix: 'page-header',
  });
}

/** article: tags and content type | date, reading time and listen / download / share */
function buildMetaRow(metadata, tags, t) {
  const row = document.createElement('div');
  row.className = 'page-header-meta-row';
  const labels = document.createElement('div');
  labels.className = 'page-header-labels';
  labels.append(...[
    tags,
    textElement('p', 'page-header-collection', metadata.contentType),
  ].filter(Boolean));

  const prefix = 'page-header';
  const info = document.createElement('div');
  info.className = 'page-header-info';
  const listen = metadata.listenLink ? document.createElement('a') : null;
  if (listen) listen.href = metadata.listenLink;
  info.append(...[
    buildPublished(metadata.publishDate, { label: t('published', 'Published'), prefix }),
    buildReadingTime(metadata.readingTime, t, prefix),
    buildPageActions({
      listen, download: true, share: true, title: metadata.title, t, prefix,
    }),
  ].filter(Boolean));

  row.append(...[labels, info].filter((part) => part.children.length));
  return row.children.length ? row : null;
}

/** landing: the featured image, the page's LCP candidate */
function buildMedia(metadata) {
  const picture = buildImage(
    metadata.featuredImage ? { src: metadata.featuredImage, alt: '' } : null,
    IMAGE_BREAKPOINTS,
  );
  if (!picture) return null;
  const img = picture.querySelector('img');
  if (img) {
    img.loading = 'eager';
    img.fetchPriority = 'high';
  }
  const media = document.createElement('div');
  media.className = 'page-header-media';
  media.append(picture);
  return media;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const props = readProperties(block);
  const metadata = getPageMetadata();
  const [t, pageTags, author] = await Promise.all([
    getPlaceholders(), resolveTags(metadata.tags), getAuthor(metadata.authorId),
  ]);
  const layout = layoutOf(block, props, metadata.pageType);

  const title = textElement('h1', 'page-header-title', metadata.title);
  const tags = buildTagList(pageTags, 'page-header-tags');
  // the eyebrow: the content type (e.g. Industry), else the tags; the tags on Display
  const eyebrow = layout === 'display' ? tags
    : textElement('p', 'page-header-eyebrow', metadata.contentType) || tags;
  const description = buildDescription(metadata.description);
  const ctas = buildCtas(props.ctas);

  // intro: the title side; summary: the description side
  const intro = document.createElement('div');
  intro.className = 'page-header-intro';
  const summary = document.createElement('div');
  summary.className = 'page-header-summary';
  summary.append(...[description, ctas].filter(Boolean));
  const columns = document.createElement('div');
  columns.className = 'page-header-columns';

  const parts = [];
  let media = null;
  if (layout === 'landing') {
    // Figma 637-43570: all text on the left, the featured image on the right
    intro.append(...[eyebrow, title, description, ctas].filter(Boolean));
    media = buildMedia(metadata);
    parts.push(intro, media);
  } else if (layout === 'secondary') {
    if (title) intro.append(title);
    columns.append(...[intro, summary].filter((part) => part.children.length));
    parts.push(eyebrow, columns);
  } else if (layout === 'display') {
    intro.append(...[eyebrow, title].filter(Boolean));
    columns.append(...[intro, summary].filter((part) => part.children.length));
    parts.push(columns);
  } else {
    intro.append(...[title, buildAuthor(metadata, author, t)].filter(Boolean));
    columns.append(...[intro, summary].filter((part) => part.children.length));
    parts.push(buildMetaRow(metadata, tags, t), columns);
  }

  block.classList.remove(...LAYOUTS);
  block.classList.add(layout);
  block.classList.toggle('page-header-has-image', !!media);
  block.replaceChildren(...parts.filter((part) => part && (part.children.length
    || part.textContent)));
}
