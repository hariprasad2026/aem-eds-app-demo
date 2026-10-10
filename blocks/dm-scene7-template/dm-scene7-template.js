/**
 * Dynamic Media Scene7 image template (is/image/…) as a plain img with src (Approach B).
 * URL comes from a text field so hosts that rewrite Scene7 anchor tags are unaffected.
 */

function getFieldText(block, propName, positionalRow) {
  const ueRow = block.querySelector(`[data-aue-prop="${propName}"]`);
  if (ueRow) {
    return ueRow.textContent?.trim() || '';
  }
  return positionalRow?.querySelector('div')?.textContent?.trim() || '';
}

function getFirstUrlFromText(text) {
  if (!text) return '';
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0] : '';
}

/**
 * @param {Element | null | undefined} row
 * @returns {string}
 */
function getUrlFromRow(row) {
  if (!row) return '';
  const anchor = row.querySelector('a[href]');
  if (anchor?.href) return anchor.href;
  const img = row.querySelector('img[src]');
  if (img?.src) return img.src;
  return getFirstUrlFromText(row.textContent?.trim());
}

/**
 * Prefer pasted text (`image`); else link/img in row (no dm-sdk-loader dependency).
 * @param {Element} block
 * @param {Element | undefined} urlRow
 * @returns {string}
 */
function getTemplateUrl(block, urlRow) {
  const ueRow = block.querySelector('[data-aue-prop="image"]');
  const authoredUrl = getUrlFromRow(ueRow);
  if (authoredUrl) return authoredUrl;

  const pasted = getFirstUrlFromText(getFieldText(block, 'image', urlRow));
  if (pasted) return pasted;

  return getUrlFromRow(urlRow) || '';
}

/**
 * @param {string} href
 * @returns {boolean}
 */
function isScene7IsImageUrl(href) {
  try {
    const u = new URL(href, window.location.href);
    return /\.scene7\.com$/i.test(u.hostname) && /\/is\/image\//i.test(u.pathname);
  } catch {
    return false;
  }
}

/**
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const urlRow = rows[0];
  const templateUrl = getTemplateUrl(block, urlRow);
  const altText = getFieldText(block, 'imageAlt', rows[1]);

  if (!templateUrl || !isScene7IsImageUrl(templateUrl)) {
    return;
  }

  const noscript = document.createElement('noscript');
  const fallbackLink = document.createElement('a');
  fallbackLink.href = templateUrl;
  fallbackLink.textContent = altText || 'Dynamic Media template';
  noscript.append(fallbackLink);

  const img = document.createElement('img');
  img.src = templateUrl;
  img.alt = altText || '';
  img.loading = 'lazy';
  img.decoding = 'async';

  block.textContent = '';
  block.append(noscript, img);
}
