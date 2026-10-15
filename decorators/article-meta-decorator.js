/**
 * Article meta decorator: the parts of an article header shared by page-header and teaser
 * (Figma "L3 Header"): the published date, the reading time, the listen / download / share
 * actions and the author lockup. Class names take the block's prefix, e.g. page-header-date.
 */
import { decorateButton } from './button-decorator.js';
import { buildTime } from './date-decorator.js';
import { createIconButton } from './icon-button-decorator.js';
import { uniqueId } from '../utils/ids.js';

/**
 * The date with its label, e.g. "Published 01/12/26".
 * @param {string} date ISO date or authored date
 * @param {{ label?: string, format?: string, prefix: string }} options
 * @returns {HTMLParagraphElement|null}
 */
export function buildPublished(date, { label = '', format = 'dd/mm/yy', prefix }) {
  const time = buildTime(date, format);
  if (!time) return null;
  const p = document.createElement('p');
  p.className = `${prefix}-date`;
  if (label) p.append(`${label} `);
  p.append(time);
  return p;
}

/**
 * The reading time: a number becomes "{n} min read" (placeholder minRead), other text as is.
 * @param {string} value
 * @param {Function} t placeholders lookup
 * @param {string} prefix
 * @returns {HTMLParagraphElement|null}
 */
export function buildReadingTime(value, t, prefix) {
  const text = (value || '').trim();
  if (!text) return null;
  const p = document.createElement('p');
  p.className = `${prefix}-reading-time`;
  p.textContent = /^\d+$/.test(text) ? t('minRead', '{n} min read', { n: text }) : text;
  return p;
}

/**
 * Listen (an authored audio link), download (prints / saves as PDF) and share (the share
 * dialog, else the link copied to the clipboard) actions, as icon buttons.
 * @param {{ listen?: HTMLAnchorElement|null, download?: boolean, share?: boolean,
 *   title?: string, t: Function, prefix: string }} options
 * @returns {HTMLDivElement|null}
 */
export function buildPageActions({
  listen = null, download = false, share = false, title = document.title, t, prefix,
}) {
  const actions = document.createElement('div');
  actions.className = `${prefix}-actions`;
  const status = document.createElement('p');
  status.className = `${prefix}-status`;
  status.setAttribute('role', 'status');
  status.id = uniqueId(`${prefix}-status`);

  if (listen) {
    listen.textContent = t('listenToThisPage', 'Listen to this page');
    decorateButton(listen, { view: 'icon', type: 'tertiary', icon: 'headphones' });
    listen.dataset.cmpInteraction = 'listen';
    actions.append(listen);
  }
  if (download) {
    const button = createIconButton({
      label: t('downloadThisPage', 'Download this page'),
      icon: 'download',
      type: 'tertiary',
      onClick: () => window.print(),
    });
    button.dataset.cmpInteraction = 'download';
    actions.append(button);
  }
  if (share) {
    const shareButton = createIconButton({
      label: t('shareThisPage', 'Share this page'),
      icon: 'share',
      type: 'tertiary',
      onClick: async () => {
        const url = window.location.href;
        try {
          if (navigator.share) {
            await navigator.share({ title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          status.textContent = t('linkCopied', 'Link copied to clipboard');
          setTimeout(() => { status.textContent = ''; }, 3000);
        } catch {
          // share dialog dismissed, or the clipboard is unavailable
        }
      },
    });
    shareButton.dataset.cmpInteraction = 'share';
    actions.append(shareButton);
  }
  if (!actions.children.length) return null;
  actions.append(status);
  return actions;
}

/**
 * The author lockup: image, then name and designation.
 * @param {{ picture?: Element|null, name?: Element|null, designation?: Element|null,
 *   prefix: string }} parts
 * @returns {HTMLDivElement|null}
 */
export function buildAuthorLockup({
  picture = null, name = null, designation = null, prefix,
}) {
  const details = document.createElement('div');
  details.className = `${prefix}-author-details`;
  details.append(...[name, designation].filter(Boolean));
  if (!details.children.length) return null;
  const author = document.createElement('div');
  author.className = `${prefix}-author`;
  if (picture) {
    const wrapper = document.createElement('div');
    wrapper.className = `${prefix}-author-image`;
    wrapper.append(picture);
    author.append(wrapper);
  }
  author.append(details);
  return author;
}
