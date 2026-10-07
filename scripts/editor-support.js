import {
  decorateBlock,
  decorateBlocks,
  decorateIcons,
  decorateSections,
  loadBlock,
  loadScript,
  loadSections,
} from './aem.js';
import { decorateRichtext } from './editor-support-rte.js';
import { decorateButtons, decorateMain } from './scripts.js';

let promiseChanges$ = Promise.resolve();

const PLACEHOLDER_STYLE_ID = 'ue-block-placeholder-styles';
const PLACEHOLDER_CLASS = 'ue-block-placeholder';

function isAuthoringMode() {
  return window.self !== window.top && !!document.querySelector('[data-aue-resource]');
}

function getBlockName(block) {
  const [blockName] = [...block.classList].filter((className) => className !== 'block');
  return blockName || 'block';
}

function toDisplayName(blockName) {
  return blockName
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getPlaceholderLabel(blockName) {
  return toDisplayName(blockName);
}

function hasRenderableContent(block) {
  const contentNodes = [...block.childNodes].filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return !node.classList.contains(PLACEHOLDER_CLASS);
  });

  if (!contentNodes.length) return false;

  return contentNodes.some((node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
    if (node.matches('img,picture,video,iframe,svg,canvas,form,table,ul,ol,blockquote,pre,h1,h2,h3,h4,h5,h6,p,a,button')) {
      return true;
    }
    return !!node.textContent.trim() || node.children.length > 0;
  });
}

function injectPlaceholderStyles() {
  if (document.getElementById(PLACEHOLDER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PLACEHOLDER_STYLE_ID;
  style.textContent = `
    .block[data-ue-empty="true"] {
      position: relative;
      min-block-size: 3rem;
      border: 1px dashed var(--color-border-default, #cbd5e1);
      border-radius: 0.5rem;
      background: var(--color-bg-subtle, #f8fafc);
      padding: 0.75rem;
      overflow: hidden;
    }

    .block[data-ue-empty="true"]::before {
      content: attr(data-ue-placeholder);
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      inline-size: 100%;
      block-size: 100%;
      color: var(--color-text-secondary, #475569);
      font-size: 0.875rem;
      line-height: 1.4;
      text-align: center;
      pointer-events: none;
      padding: 0.75rem;
    }

    .block .${PLACEHOLDER_CLASS} {
      display: none !important;
    }
  `;
  document.head.append(style);
}

function applyBlockPlaceholders(container = document) {
  if (!isAuthoringMode()) return;
  injectPlaceholderStyles();

  container.querySelectorAll('.block').forEach((block) => {
    const existingPlaceholder = block.querySelector(`:scope > .${PLACEHOLDER_CLASS}`);
    if (hasRenderableContent(block)) {
      block.removeAttribute('data-ue-empty');
      block.removeAttribute('data-ue-placeholder');
      existingPlaceholder?.remove();
      return;
    }

    block.dataset.ueEmpty = 'true';
    block.dataset.uePlaceholder = getPlaceholderLabel(getBlockName(block));
    existingPlaceholder?.remove();
  });
}

async function applyChanges(event) {
  await promiseChanges$;

  // redecorate default content and blocks on patches (in the properties rail)
  const { detail } = event;

  const resource = detail?.request?.target?.resource // update, patch components
    || detail?.request?.target?.container?.resource // update, patch, add to sections
    || detail?.request?.to?.container?.resource; // move in sections
  if (!resource) return false;
  const updates = detail?.response?.updates;
  if (!updates.length) return false;
  const { content } = updates[0];
  if (!content) return false;

  // load dompurify
  await loadScript(`${window.hlx.codeBasePath}/scripts/dompurify.min.js`);

  const sanitizedContent = window.DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });
  const parsedUpdate = new DOMParser().parseFromString(sanitizedContent, 'text/html');
  const element = document.querySelector(`[data-aue-resource="${resource}"]`);

  if (element) {
    if (element.matches('main')) {
      const newMain = parsedUpdate.querySelector(`[data-aue-resource="${resource}"]`);
      if (!newMain) return false;
      newMain.style.display = 'none';
      element.insertAdjacentElement('afterend', newMain);
      decorateMain(newMain);
      decorateRichtext(newMain);
      applyBlockPlaceholders(newMain);
      await loadSections(newMain);
      element.remove();
      newMain.style.display = null;
      // eslint-disable-next-line no-use-before-define
      attachEventListeners(newMain);
      return true;
    }

    const block = element.parentElement?.closest('.block[data-aue-resource]') || element?.closest('.block[data-aue-resource]');
    if (block) {
      const blockResource = block.getAttribute('data-aue-resource');
      const newBlock = parsedUpdate.querySelector(`[data-aue-resource="${blockResource}"]`);
      if (newBlock) {
        newBlock.style.display = 'none';
        block.insertAdjacentElement('afterend', newBlock);
        decorateButtons(newBlock);
        decorateIcons(newBlock);
        decorateBlock(newBlock);
        decorateRichtext(newBlock);
        applyBlockPlaceholders(newBlock.parentElement || document);
        await loadBlock(newBlock);
        block.remove();
        newBlock.style.display = null;
        return true;
      }
    } else {
      // sections and default content, may be multiple in the case of richtext
      const newElements = parsedUpdate.querySelectorAll(`[data-aue-resource="${resource}"],[data-richtext-resource="${resource}"]`);
      if (newElements.length) {
        const { parentElement } = element;
        if (element.matches('.section')) {
          const [newSection] = newElements;
          newSection.style.display = 'none';
          element.insertAdjacentElement('afterend', newSection);
          decorateButtons(newSection);
          decorateIcons(newSection);
          decorateRichtext(newSection);
          decorateSections(parentElement);
          decorateBlocks(parentElement);
          applyBlockPlaceholders(parentElement);
          await loadSections(parentElement);
          element.remove();
          newSection.style.display = null;
        } else {
          element.replaceWith(...newElements);
          decorateButtons(parentElement);
          decorateIcons(parentElement);
          decorateRichtext(parentElement);
          applyBlockPlaceholders(parentElement);
        }
        return true;
      }
    }
  }

  return false;
}

function attachEventListeners(main) {
  [
    'aue:content-patch',
    'aue:content-update',
    'aue:content-add',
    'aue:content-move',
    'aue:content-remove',
    'aue:content-copy',
  ].forEach((eventType) => main?.addEventListener(eventType, async (event) => {
    event.stopPropagation();
    promiseChanges$ = applyChanges(event);
    const applied = await promiseChanges$;
    if (!applied) window.location.reload();
  }));
}

attachEventListeners(document.querySelector('main'));

// decorate rich text
// this has to happen after decorateMain(), and everythime decorateBlocks() is called
decorateRichtext();
applyBlockPlaceholders(document.querySelector('main') || document);
// in cases where the block decoration is not done in one synchronous iteration we need to listen
// for new richtext-instrumented elements. this happens for example when using experimentation.
const observer = new MutationObserver(() => {
  decorateRichtext();
  applyBlockPlaceholders(document.querySelector('main') || document);
});
observer.observe(document, { attributeFilter: ['data-richtext-prop'], childList: true, subtree: true });
