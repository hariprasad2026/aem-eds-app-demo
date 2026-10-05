import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// Order in which content fields are persisted as rows in the block markup.
// Mirrors the model's field order (`tab` separators are UI-only and do not
// produce a row), used as a resilient fallback when `data-aue-prop` isn't
// present (e.g. on the published/preview site, outside the editor canvas).

// Every class that decorate() may add to the block based on authored style
// fields. Must be stripped before re-applying so that re-decorating the same
// block (e.g. editor live-preview updates) never leaves a stale variant or
// style class behind, which is what causes style/variation changes to stop
// visibly applying.
const DYNAMIC_CLASS_PATTERN = /^hero-(split|overlay|centered|banner|text-|bg-|button-color-|image-|button-)/;

function resetDynamicClasses(block) {
  [...block.classList].forEach((className) => {
    if (DYNAMIC_CLASS_PATTERN.test(className)) {
      block.classList.remove(className);
    }
  });
}

function getFieldElement(block, name) {
  return block.querySelector(`[data-aue-prop="${name}"]`);
}

function getText(block, name) {
  const field = getFieldElement(block, name);

  return field?.textContent?.trim() || '';
}

function getContent(block) {
  const rows = [...block.children];

  return {
    heroType: rows[0]?.textContent?.trim(),

    overline: rows[1]?.querySelector('[data-aue-prop="overline"]'),

    title: rows[2]?.querySelector('[data-aue-prop="title"]')
      || rows[2]?.querySelector('h1, h2, h3, h4, h5, h6'),
    titleType: rows[11]?.textContent?.trim(),

    description: rows[3]?.querySelector('p'),

    image: rows[4]?.querySelector('img'),

    link1Text: rows[5]?.querySelector('[data-aue-prop="link1Text"]')
      || rows[5]?.querySelector('p'),
    link1Url: rows[6]?.querySelector('a'),

    link2Text: rows[7]?.querySelector('[data-aue-prop="link2Text"]')
      || rows[7]?.querySelector('p'),
    link2Url: rows[8]?.querySelector('a'),

    buttonText: rows[9]?.querySelector('[data-aue-prop="buttonText"]')
      || rows[9]?.querySelector('p'),
    buttonUrl: rows[10]?.querySelector('a'),

    primaryButtonText: rows[11]?.querySelector('[data-aue-prop="primaryButtonText"]')
      || rows[11]?.querySelector('p'),
    primaryButtonUrl: rows[12]?.querySelector('a')
      || rows[12]?.querySelector('p'),

    secondaryButtonText: rows[13]?.querySelector('[data-aue-prop="secondaryButtonText"]')
      || rows[13]?.querySelector('p'),
    secondaryButtonUrl: rows[14]?.querySelector('a')
      || rows[14]?.querySelector('p'),

    bannerLinkText: block.querySelector(
      '[data-aue-prop="bannerLinkText"]',
    ) || rows[15]?.querySelector('p'),

    bannerLinkUrl: [...block.querySelectorAll('a')]
      .find((a) => a.closest('.button-container')),

    backgroundColor: rows[17]?.textContent?.trim(),
    textColor: rows[18]?.textContent?.trim(),
    buttonColor: rows[19]?.textContent?.trim(),
    imagePosition: rows[20]?.textContent?.trim(),
    buttonPosition: rows[21]?.textContent?.trim(),
  };
}

// function getStyleValue(block, fallbackIndex) {
//   return block.children[fallbackIndex]
//     ?.textContent
//     ?.trim();
// }

function buildLink(textEl, urlEl) {
  const text = textEl?.textContent?.trim();

  const url = urlEl?.href
    || urlEl?.textContent?.trim();

  if (!text && !url) {
    return null;
  }

  const link = document.createElement('a');

  link.className = 'hero-link';
  link.href = url || '#';

  link.innerHTML = `
    <span class="hero-link-label">${text || url}</span>
    <span class="hero-link-arrow" aria-hidden="true">&rarr;</span>
  `;

  if (textEl) {
    moveInstrumentation(textEl, link);
  }

  return link;
}

function buildHeading(block, titleType) {
  const titleEl = getFieldElement(block, 'title')
    || block.children[2]?.querySelector('h1, h2, h3, h4, h5, h6');
  if (!titleEl?.textContent?.trim()) return null;

  const tag = /^h[1-6]$/.test(titleType) ? titleType : 'h1';
  const heading = document.createElement(tag);
  heading.className = 'hero-title';
  heading.innerHTML = titleEl.innerHTML;
  moveInstrumentation(titleEl, heading);

  return heading;
}

/**
 * Variant 1: Split Hero
 * Layout: text column (overline, title, description, links) + image column
 */
function decorateSplitHero(block, titleType) {
  const fields = getContent(block);
  const content = document.createElement('div');
  content.className = 'hero-content';
  const overline = getFieldElement(block, 'overline');
  if (overline?.textContent?.trim()) {
    overline.classList.add('hero-overline');
    content.append(overline);
  }

  const heading = buildHeading(block, titleType);
  if (heading) content.append(heading);

  const descriptionEl = fields.description;

  if (descriptionEl?.textContent?.trim()) {
    const description = document.createElement('div');

    description.className = 'hero-description';
    description.innerHTML = descriptionEl.innerHTML;

    content.append(description);
  }

  const links = [
    buildLink(fields.link1Text, fields.link1Url),
    buildLink(fields.link2Text, fields.link2Url),
  ].filter(Boolean);

  if (links.length) {
    const linksWrapper = document.createElement('div');
    linksWrapper.className = 'hero-links';
    links.forEach((link) => linksWrapper.append(link));
    content.append(linksWrapper);
  }

  const media = document.createElement('div');
  media.className = 'hero-media';

  const picture = block.querySelector('picture');
  const pictureImg = picture?.querySelector('img');

  if (picture && pictureImg) {
    const alt = getText(block, 'imageAlt');

    const optimizedPicture = createOptimizedPicture(
      pictureImg.src,
      alt || pictureImg.alt || '',
      false,
      [{ width: '1200' }],
    );

    moveInstrumentation(
      pictureImg,
      optimizedPicture.querySelector('img'),
    );

    media.append(optimizedPicture);
  }

  return [content, media];
}

/** variant-2 */
function decorateOverlayHero(block, titleType) {
  const fields = getContent(block);

  const content = document.createElement('div');
  content.className = 'hero-overlay-content';

  const heading = buildHeading(block, titleType);

  if (heading) {
    content.append(heading);
  }

  const descriptionEl = fields.description;

  if (descriptionEl?.textContent?.trim()) {
    const description = document.createElement('div');

    description.className = 'hero-description';
    description.innerHTML = descriptionEl.innerHTML;

    content.append(description);
  }

  const button = buildLink(
    fields.buttonText,
    fields.buttonUrl,
  );

  if (button) {
    button.classList.add('hero-button');
    content.append(button);
  }

  const picture = block.querySelector('picture');
  const img = picture?.querySelector('img');

  if (img) {
    block.style.backgroundImage = `url("${img.src}")`;
  }

  return [content];
}

/** variant-3 */
function decorateCenteredHero(block, titleType) {
  const fields = getContent(block);
  const content = document.createElement('div');
  content.className = 'hero-centered-content';

  const heading = buildHeading(block, titleType);

  if (heading) {
    content.append(heading);
  }

  const descriptionEl = fields.description;

  if (descriptionEl?.textContent?.trim()) {
    const description = document.createElement('div');
    description.className = 'hero-description';
    description.innerHTML = descriptionEl.innerHTML;

    content.append(description);
  }

  const actions = document.createElement('div');
  actions.className = 'hero-actions';

  const primaryButton = buildLink(
    fields.primaryButtonText,
    fields.primaryButtonUrl,
  );

  const secondaryButton = buildLink(
    fields.secondaryButtonText,
    fields.secondaryButtonUrl,
  );

  if (primaryButton) {
    primaryButton.classList.add(
      'hero-button',
      'hero-button-primary',
    );

    actions.append(primaryButton);
  }

  if (secondaryButton) {
    secondaryButton.classList.add(
      'hero-button',
      'hero-button-secondary',
    );

    actions.append(secondaryButton);
  }

  if (actions.children.length) {
    content.append(actions);
  }

  const picture = block.querySelector('picture');
  const img = picture?.querySelector('img');

  if (img) {
    block.style.backgroundImage = `url("${img.src}")`;
  }

  return [content];
}

/** variant-4 */
function decorateBannerHero(block, titleType) {
  const fields = getContent(block);
  const content = document.createElement('div');
  content.className = 'hero-banner-content';

  const heading = buildHeading(block, titleType);

  if (heading) {
    content.append(heading);
  }

  const descriptionEl = fields.description;

  if (descriptionEl?.textContent?.trim()) {
    const description = document.createElement('div');
    description.className = 'hero-description';
    description.innerHTML = descriptionEl.innerHTML;

    content.append(description);
  }

  const text = fields.bannerLinkText?.textContent?.trim();
  const url = fields.bannerLinkUrl?.href;

  const link = document.createElement('a');

  link.className = 'hero-banner-link';
  link.href = url || '#';

  link.innerHTML = `
    <span>${text || 'Link'}</span>
    <span>&rarr;</span>
  `;

  content.append(link);

  const picture = block.querySelector('picture');
  const img = picture?.querySelector('img');

  if (img) {
    block.style.backgroundImage = `url("${img.src}")`;
  }

  return [content];
}

export default function decorate(block) {
  const fields = getContent(block);
  const heroType = fields.heroType || 'split';
  const titleType = fields.titleType || 'h1';

  const { textColor } = fields;

  const { backgroundColor } = fields;
  const { buttonColor } = fields;
  const { imagePosition } = fields;
  const { buttonPosition } = fields;

  // Additional variants (variant 2, variant 3, ...) can branch here based on heroType.
  let fragments;

  try {
    switch (heroType) {
      case 'banner':
        fragments = decorateBannerHero(block, titleType);
        break;

      case 'centered':
        fragments = decorateCenteredHero(block, titleType);
        break;

      case 'overlay':
        fragments = decorateOverlayHero(block, titleType);
        break;

      case 'split':
      default:
        fragments = decorateSplitHero(block, titleType);
    }
  } catch (error) {
    // Never leave the raw authoring markup (e.g. an oversized, unstyled
    // image) on the page if a single field is malformed/unexpected.
    // eslint-disable-next-line no-console
    fragments = [];
  }

  // Always clear previously applied variant/style classes first so that
  // re-decorating an already-decorated block (e.g. editor style/variation

  // changes) reflects the newly authored values instead of stacking on top
  // of stale ones.

  resetDynamicClasses(block);

  block.textContent = '';

  block.classList.add(`hero-${heroType}`);

  if (textColor) block.classList.add(textColor);
  if (backgroundColor) block.classList.add(backgroundColor);
  if (buttonColor) block.classList.add(buttonColor);
  if (imagePosition) block.classList.add(imagePosition);
  if (buttonPosition) block.classList.add(buttonPosition);
  block.append(...fragments);
}
