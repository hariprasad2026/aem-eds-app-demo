/**
 * SEO decorator: applies the SEO and social columns of the bulk metadata sheet (see
 * utils/metadata.js) to the document head. The sheet publishes them as <meta name="og-title">
 * etc.; browsers and search engines that run JavaScript then get the standard tags:
 *
 * | Column                                   | Head                                     |
 * |------------------------------------------|------------------------------------------|
 * | meta-title                               | <title>                                  |
 * | meta-description, meta-keywords          | description, keywords                    |
 * | og-title, og-description, og-image, og-type | og:title, og:description, og:image, og:type |
 * | twitter-card, twitter-title, twitter-description, twitter-image | twitter:* |
 * | canonical-url                            | <link rel="canonical">, og:url           |
 * | language                                 | <html lang>                              |
 *
 * Social titles, descriptions and images fall back to the SEO ones (og-* to meta-*, twitter-*
 * to og-*). Robots is a standard metadata name and needs no code.
 */
import { getMetadata } from '../scripts/aem.js';
import { getPageLanguage } from '../utils/metadata.js';

const first = (...names) => names.map((name) => getMetadata(name)).find(Boolean) || '';

/** sets a <meta> (property="og:…" or name="…"), adding it when missing */
function setMeta(name, content) {
  if (!content) return;
  const attr = name.startsWith('og:') ? 'property' : 'name';
  let meta = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.append(meta);
  }
  meta.content = content;
}

/** an absolute URL, or '' for an invalid one */
function absoluteUrl(value) {
  if (!value) return '';
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return '';
  }
}

function setCanonical(href) {
  if (!href) return;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.append(link);
  }
  link.href = href;
  setMeta('og:url', href);
}

/** applies the page's SEO and social metadata to the document head */
// eslint-disable-next-line import/prefer-default-export
export function decorateHead() {
  document.documentElement.lang = getPageLanguage();

  const title = getMetadata('meta-title');
  if (title) document.title = title;
  setMeta('description', getMetadata('meta-description'));
  setMeta('keywords', getMetadata('meta-keywords'));

  setMeta('og:title', first('og-title', 'meta-title'));
  setMeta('og:description', first('og-description', 'meta-description'));
  setMeta('og:image', absoluteUrl(getMetadata('og-image')));
  setMeta('og:type', getMetadata('og-type'));

  setMeta('twitter:card', getMetadata('twitter-card'));
  setMeta('twitter:title', first('twitter-title', 'og-title', 'meta-title'));
  setMeta('twitter:description', first('twitter-description', 'og-description', 'meta-description'));
  setMeta('twitter:image', absoluteUrl(first('twitter-image', 'og-image')));

  setCanonical(absoluteUrl(getMetadata('canonical-url')));
}
