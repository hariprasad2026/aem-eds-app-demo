/**
 * Metadata utils: the page's metadata, set on the page (Title, Description, Keywords, Tags)
 * or by the locale's bulk metadata spreadsheet (e.g. /de-de/metadata.json, applied once listed
 * in the site configuration's metadata.source). Every sheet column is published as a <meta>
 * named after it:
 *
 * url (the pattern of the pages a row applies to), page-type, meta-title, meta-description,
 * meta-keywords, author-id, publish-date, modified-date, reading-time, og-title,
 * og-description, og-image, og-type, twitter-card, twitter-title, twitter-description,
 * twitter-image, canonical-url, robots, region, country, language, persona, thumbnail-image,
 * featured-image, campaign-id, content-type, featured, priority, listen-link
 *
 * The SEO and social columns are applied to the document head by decorators/seo-decorator.js.
 */
import { getMetadata } from '../scripts/aem.js';
import { getLocale } from './site.js';

/** the first non-empty metadata value of the names */
const metaOf = (...names) => names.map((name) => getMetadata(name)).find(Boolean) || '';

// the page title and description as authored, read when the module loads: the SEO decorator
// replaces document.title and the description <meta> with meta-title / meta-description
const AUTHORED = {
  title: getMetadata('og:title') || document.title,
  description: getMetadata('description'),
};

/** true for yes / true / 1 / on */
const isYes = (value) => ['yes', 'true', '1', 'on', 'y'].includes(value.trim().toLowerCase());

/**
 * The page tags: each Tags value is published as <meta property="article:tag">.
 * @returns {string[]} tag IDs (e.g. tcs:topics/cloud) or titles, as authored
 */
export function getPageTags() {
  const tags = [...document.head.querySelectorAll('meta[property="article:tag"]')]
    .map((meta) => meta.content.trim());
  // a "tags" meta (comma separated) as a fallback, e.g. from the bulk metadata sheet
  const list = tags.length ? tags : getMetadata('tags').split(',');
  return [...new Set(list.map((tag) => tag.trim()).filter(Boolean))];
}

/**
 * The page language: the Language metadata when it's a language code (e.g. en, en-US),
 * otherwise the language tag of the locale site (e.g. de-DE).
 * @returns {string}
 */
export function getPageLanguage() {
  const language = getMetadata('language');
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(language) ? language : getLocale().lang;
}

/**
 * The page's metadata as typed values.
 * @returns {{
 *   title: string, description: string, image: string, pageType: string, contentType: string,
 *   category: string, tags: string[], authorId: string, author: string, publishDate: string,
 *   modifiedDate: string, readingTime: string, thumbnailImage: string, featuredImage: string,
 *   listenLink: string,
 *   region: string, country: string, language: string, persona: string, campaignId: string,
 *   featured: boolean, priority: number | null
 * }}
 */
export function getPageMetadata() {
  const priority = parseFloat(getMetadata('priority'));
  return {
    title: AUTHORED.title,
    description: AUTHORED.description,
    image: metaOf('featured-image', 'og:image'),
    // Page Type; the standard Template metadata as a fallback
    pageType: metaOf('page-type', 'template'),
    contentType: getMetadata('content-type'),
    category: getMetadata('category'),
    tags: getPageTags(),
    authorId: getMetadata('author-id'),
    // the standard Author metadata, for pages without an Author ID
    author: getMetadata('author'),
    publishDate: metaOf('publish-date', 'publication-date'),
    modifiedDate: getMetadata('modified-date'),
    readingTime: getMetadata('reading-time'),
    // an audio version of the page (the page header's listen action)
    listenLink: getMetadata('listen-link'),
    thumbnailImage: getMetadata('thumbnail-image'),
    featuredImage: getMetadata('featured-image'),
    region: getMetadata('region'),
    country: getMetadata('country') || getLocale().country,
    language: getPageLanguage(),
    persona: getMetadata('persona'),
    campaignId: getMetadata('campaign-id'),
    featured: isYes(getMetadata('featured')),
    priority: Number.isNaN(priority) ? null : priority,
  };
}
