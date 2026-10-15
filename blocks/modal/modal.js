/*
 * Modal (Block Collection): shows a fragment in a dialog.
 * https://www.aem.live/developer/block-collection/modal
 * Links to a /modals/ path open as a modal (scripts.js); other blocks can use createModal()
 * and openModal(). An authored Modal block renders its link as a button that opens the modal:
 * a <button>, not a link, so it opens the dialog in Universal Editor's preview too (the editor
 * navigates to the target of clicked links).
 * Adapted: close button and opener use the shared button decorator.
 */
import { loadFragment } from '../fragment/fragment.js';
import {
  buildBlock, decorateBlock, loadBlock, loadCSS,
} from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { decorateButton } from '../../decorators/button-decorator.js';
import { createIconButton } from '../../decorators/icon-button-decorator.js';
import { componentIdOf } from '../../decorators/data-layer-decorator.js';
import { pushComponentEvent } from '../../utils/analytics.js';
import { uniqueId } from '../../utils/ids.js';
import { getPlaceholders } from '../../utils/placeholders.js';

/**
 * Keeps the dialog in the visible part of the page. In a frame that is taller than what shows
 * (e.g. the page in Universal Editor) the viewport isn't what the visitor sees: the visible
 * part is where the page intersects the screen, reported by an IntersectionObserver. The
 * dialog is hidden until it's measured, and wheel scrolling outside it or past the end of its
 * content doesn't scroll the frame's container (which would move the dialog out of view).
 * At the top level the viewport is visible and CSS uses it.
 * @param {HTMLDialogElement} dialog
 * @returns {() => void} stops tracking
 */
function trackVisibleArea(dialog) {
  if (window.self === window.top || !('IntersectionObserver' in window)) return () => {};
  dialog.dataset.measuring = '';
  const observer = new IntersectionObserver(([entry]) => {
    const { top, height } = entry.intersectionRect;
    if (height >= 1) {
      dialog.style.setProperty('--modal-top', `${Math.round(top)}px`);
      dialog.style.setProperty('--modal-height', `${Math.round(height)}px`);
    }
    delete dialog.dataset.measuring;
  }, { threshold: Array.from({ length: 101 }, (_, i) => i / 100) });
  observer.observe(document.documentElement);

  const onWheel = (e) => {
    const {
      left, right, top, bottom,
    } = dialog.getBoundingClientRect();
    const outside = e.clientX < left || e.clientX > right || e.clientY < top || e.clientY > bottom;
    const atTop = e.deltaY < 0 && dialog.scrollTop <= 0;
    const atEnd = e.deltaY > 0
      && dialog.scrollTop + dialog.clientHeight >= dialog.scrollHeight - 1;
    if (outside || atTop || atEnd) e.preventDefault();
  };
  document.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    observer.disconnect();
    document.removeEventListener('wheel', onWheel);
  };
}

export async function createModal(contentNodes) {
  const t = await getPlaceholders();
  await loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);
  const dialog = document.createElement('dialog');
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('modal-content');
  dialogContent.append(...contentNodes);
  dialog.append(dialogContent);
  // the dialog's name: its first heading, else a generic one
  const heading = dialogContent.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.id = heading.id || uniqueId('modal-title');
    dialog.setAttribute('aria-labelledby', heading.id);
  } else {
    dialog.setAttribute('aria-label', t('dialog', 'Dialog'));
  }

  const closeButton = createIconButton({
    label: t('close', 'Close'),
    icon: 'close',
    type: 'tertiary',
    className: 'close-button',
    onClick: () => dialog.close(),
  });
  dialog.prepend(closeButton);

  const block = buildBlock('modal', '');
  document.querySelector('main').append(block);
  decorateBlock(block);
  await loadBlock(block);

  // close on a click on the backdrop (the dialog itself; keyboard clicks inside have no position)
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const {
      left, right, top, bottom,
    } = dialog.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) {
      dialog.close();
    }
  });

  let opener = null;
  let stopTracking = () => {};
  dialog.addEventListener('close', () => {
    stopTracking();
    document.body.classList.remove('modal-open');
    block.remove();
    opener?.focus();
  });

  block.replaceChildren(dialog);

  return {
    block,
    showModal: () => {
      opener = document.activeElement;
      stopTracking = trackVisibleArea(dialog);
      dialog.showModal();
      pushComponentEvent('cmp:show', componentIdOf(block), { interaction: 'dialog' });
      // reset scroll position
      setTimeout(() => { dialog.scrollTop = 0; }, 0);
      document.body.classList.add('modal-open');
    },
  };
}

export async function openModal(fragmentUrl) {
  const path = fragmentUrl.startsWith('http')
    ? new URL(fragmentUrl, window.location).pathname
    : fragmentUrl;

  const fragment = await loadFragment(path);
  if (!fragment) return;
  const { showModal } = await createModal(fragment.childNodes);
  showModal();
}

/**
 * Authored Modal block: its link (to a fragment page) becomes a button opening the page's
 * content in the modal.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  if (!link) return;
  const t = await getPlaceholders();
  const href = link.getAttribute('href');
  const text = link.textContent.trim();
  const button = document.createElement('button');
  button.type = 'button';
  // a link without its own text shows its URL
  button.textContent = text && text !== href ? text : t('open', 'Open');
  if (link.title && link.title !== text && link.title !== href) button.title = link.title;
  button.setAttribute('aria-haspopup', 'dialog');
  moveInstrumentation(link, button);
  decorateButton(button, { view: 'button', type: 'primary' });
  button.addEventListener('click', () => openModal(href));
  block.replaceChildren(button);
}
