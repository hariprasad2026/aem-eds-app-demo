import { createOptimizedPicture } from '../../scripts/aem.js';

const CLASS_PREFIX = 'modal-v1';

function getText(element) {
  return element?.textContent?.trim() || '';
}

function getHTML(element) {
  return element?.innerHTML?.trim() || '';
}

function getLink(element) {
  if (!element) return '';

  if (element.tagName === 'A') {
    return element.getAttribute('href') || '';
  }

  return element.querySelector('a')?.getAttribute('href') || '';
}

function getLinkText(element) {
  if (!element) return '';

  if (element.tagName === 'A') {
    return getText(element);
  }

  const link = element.querySelector('a');

  return getText(link || element);
}

function createButton(text, href, secondary = false) {
  if (!text) return null;

  let button;

  if (href) {
    button = document.createElement('a');
    button.href = href;
  } else {
    button = document.createElement('button');
    button.type = 'button';
  }

  button.className = `${CLASS_PREFIX}-button${secondary ? ` ${CLASS_PREFIX}-button-secondary` : ''
  }`;

  button.textContent = text;

  return button;
}

function getVariantClass(variant) {
  switch (variant) {
    case 'image':
      return `${CLASS_PREFIX}-image-variant`;

    case 'video':
      return `${CLASS_PREFIX}-video-variant`;

    case 'content':
      return `${CLASS_PREFIX}-content-variant`;

    case 'small':
      return `${CLASS_PREFIX}-small`;

    case 'large':
      return `${CLASS_PREFIX}-large`;

    case 'full-screen':
      return `${CLASS_PREFIX}-full-screen`;

    case 'side':
      return `${CLASS_PREFIX}-side`;

    case 'cta':
      return `${CLASS_PREFIX}-cta`;

    case 'confirmation':
      return `${CLASS_PREFIX}-confirmation`;

    default:
      return '';
  }
}

function createImage(image, alt) {
  if (!image) return null;

  const wrapper = document.createElement('div');

  wrapper.className = `${CLASS_PREFIX}-image`;

  const picture = createOptimizedPicture(
    image,
    alt || '',
    false,
    [{ width: '1200' }],
  );

  wrapper.append(picture);

  return wrapper;
}

function createVideo(video) {
  if (!video) return null;

  const wrapper = document.createElement('div');

  wrapper.className = `${CLASS_PREFIX}-video`;

  const iframe = document.createElement('iframe');

  iframe.src = video;
  iframe.title = 'Modal video';
  iframe.loading = 'lazy';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;

  wrapper.append(iframe);

  return wrapper;
}

function createModalDOM(data) {
  const {
    variant,
    image,
    imageAlt,
    eyebrow,
    title,
    content,
    video,
    cta1Text,
    cta1,
    cta2Text,
    cta2,
    closeLabel,
  } = data;

  const overlay = document.createElement('div');

  overlay.className = `${CLASS_PREFIX}-overlay`;
  overlay.setAttribute('aria-hidden', 'true');

  const dialog = document.createElement('div');

  const variantClass = getVariantClass(variant);

  dialog.className = `${CLASS_PREFIX}-dialog${variantClass ? ` ${variantClass}` : ''
  }`;

  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const titleId = `${CLASS_PREFIX}-title-${Math.random()
    .toString(36)
    .slice(2, 9)}`;

  if (title) {
    dialog.setAttribute('aria-labelledby', titleId);
  }

  const closeButton = document.createElement('button');

  closeButton.type = 'button';
  closeButton.className = `${CLASS_PREFIX}-close`;
  closeButton.setAttribute(
    'aria-label',
    closeLabel || 'Close',
  );
  closeButton.innerHTML = '&times;';

  const body = document.createElement('div');

  body.className = `${CLASS_PREFIX}-body`;

  const imageElement = createImage(image, imageAlt);

  if (imageElement) {
    dialog.append(imageElement);
  }

  if (eyebrow) {
    const eyebrowElement = document.createElement('p');

    eyebrowElement.className = `${CLASS_PREFIX}-eyebrow`;
    eyebrowElement.textContent = eyebrow;

    body.append(eyebrowElement);
  }

  if (title) {
    const titleElement = document.createElement('h2');

    titleElement.className = `${CLASS_PREFIX}-title`;
    titleElement.id = titleId;
    titleElement.textContent = title;

    body.append(titleElement);
  }

  if (content) {
    const contentElement = document.createElement('div');

    contentElement.className = `${CLASS_PREFIX}-content`;
    contentElement.innerHTML = content;

    body.append(contentElement);
  }

  const videoElement = createVideo(video);

  if (videoElement) {
    body.append(videoElement);
  }

  if (cta1Text || cta2Text) {
    const actions = document.createElement('div');

    actions.className = `${CLASS_PREFIX}-actions`;

    const primaryButton = createButton(
      cta1Text,
      cta1,
    );

    if (primaryButton) {
      actions.append(primaryButton);
    }

    const secondaryButton = createButton(
      cta2Text,
      cta2,
      true,
    );

    if (secondaryButton) {
      actions.append(secondaryButton);
    }

    if (actions.children.length) {
      body.append(actions);
    }
  }

  dialog.append(closeButton, body);
  overlay.append(dialog);

  return {
    overlay,
    dialog,
    closeButton,
  };
}

function setupModal(modal, trigger) {
  const {
    overlay,
    dialog,
    closeButton,
  } = modal;

  let previousFocus = null;

  function openModal() {
    previousFocus = document.activeElement;

    document.body.classList.add(
      `${CLASS_PREFIX}-open`,
    );

    overlay.classList.add(
      `${CLASS_PREFIX}-is-open`,
    );

    overlay.setAttribute(
      'aria-hidden',
      'false',
    );

    trigger?.setAttribute(
      'aria-expanded',
      'true',
    );

    requestAnimationFrame(() => {
      closeButton.focus();
    });
  }

  function closeModal() {
    overlay.classList.remove(
      `${CLASS_PREFIX}-is-open`,
    );

    overlay.setAttribute(
      'aria-hidden',
      'true',
    );

    document.body.classList.remove(
      `${CLASS_PREFIX}-open`,
    );

    trigger?.setAttribute(
      'aria-expanded',
      'false',
    );

    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }
  }

  function handleKeyDown(event) {
    if (
      !overlay.classList.contains(
        `${CLASS_PREFIX}-is-open`,
      )
    ) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = dialog.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );

    if (!focusableElements.length) {
      return;
    }

    const firstElement = focusableElements[0];

    const lastElement = focusableElements[focusableElements.length - 1];

    if (
      event.shiftKey
      && document.activeElement === firstElement
    ) {
      event.preventDefault();
      lastElement.focus();
    } else if (
      !event.shiftKey
      && document.activeElement === lastElement
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  trigger?.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      openModal();
    },
  );

  closeButton.addEventListener(
    'click',
    closeModal,
  );

  overlay.addEventListener(
    'click',
    (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    },
  );

  document.addEventListener(
    'keydown',
    handleKeyDown,
  );
}

export default function decorate(block) {
  const rows = [...block.children];

  const variantElement = rows[0]?.querySelector(':scope > div');

  const imageElement = rows[1]?.querySelector(
    ':scope > div picture img',
  );

  const imageAltElement = rows[1]?.querySelector(
    ':scope > div picture img[alt]',
  );

  const eyebrowElement = rows[2]?.querySelector(':scope > div');

  const titleElement = rows[3]?.querySelector(':scope > div');

  const contentElement = rows[4]?.querySelector(':scope > div');

  const videoElement = rows[5]?.querySelector(':scope > div');

  const cta1Container = rows[6]?.querySelector(':scope > div');

  const cta1Element = cta1Container?.querySelector('a');

  const cta2Container = rows[7]?.querySelector(':scope > div');

  const cta2Element = cta2Container?.querySelector('a');

  const closeLabelElement = rows[8]?.querySelector(':scope > div');

  const triggerElement = rows[9]?.querySelector(':scope > div');

  const variant = getText(variantElement) || 'default';

  const image = imageElement?.getAttribute('src') || '';

  const imageAlt = imageAltElement?.getAttribute('alt') || '';

  const eyebrow = getText(eyebrowElement);

  const title = getText(titleElement);

  const content = getHTML(contentElement);

  const video = getText(videoElement);

  const cta1Text = getLinkText(cta1Container);

  const cta1 = getLink(cta1Element || cta1Container);

  const cta2Text = getLinkText(cta2Container);

  const cta2 = getLink(cta2Element || cta2Container);

  const closeLabel = getText(closeLabelElement) || 'Close';

  const triggerText = getText(triggerElement) || 'Open Modal';

  const data = {
    variant,
    image,
    imageAlt,
    eyebrow,
    title,
    content,
    video,
    cta1Text,
    cta1,
    cta2Text,
    cta2,
    closeLabel,
  };

  const triggerWrapper = document.createElement('div');

  triggerWrapper.className = `${CLASS_PREFIX}-trigger-wrapper`;

  const trigger = document.createElement('button');

  trigger.type = 'button';
  trigger.className = `${CLASS_PREFIX}-trigger`;

  trigger.textContent = triggerText;

  trigger.setAttribute(
    'aria-haspopup',
    'dialog',
  );

  trigger.setAttribute(
    'aria-expanded',
    'false',
  );

  triggerWrapper.append(trigger);

  const modal = createModalDOM(data);

  block.replaceChildren(
    triggerWrapper,
    modal.overlay,
  );

  setupModal(
    modal,
    trigger,
  );
}
