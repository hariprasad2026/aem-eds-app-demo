import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// Order in which content fields are persisted as rows in the block markup.
// Mirrors the model's field order (`tab` separators are UI-only and do not
// produce a row), used as a resilient fallback when `data-aue-prop` isn't
// present (e.g. on the published/preview site, outside the editor canvas).
const FIELD_ORDER = [
  'heroType',
  'overline',
  'title',
  'description',
  'image',
  'imageAlt',
  'link1Text',
  'link1Url',
  'link2Text',
  'link2Url',
  'titleType',
  'buttonText',
  'buttonUrl',
  'primaryButtonText',
  'primaryButtonUrl',
  'secondaryButtonText',
  'secondaryButtonUrl',
  'bannerLinkText',
  'bannerLinkUrl',
  'backgroundColor',
  'textColor',
  'buttonColor',
  'imagePosition',
  'buttonPosition',
];

// const STYLE_FIELDS = [
//   'backgroundColor',
//   'textColor',
//   'buttonColor',
//   'imagePosition',
//   'buttonPosition',
// ];

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
  const byProp = block.querySelector(`[data-aue-prop="${name}"]`);

  if (byProp) {
    return byProp;
  }

  const index = FIELD_ORDER.indexOf(name);

  if (index === -1) {
    return null;
  }

  const row = block.children[index];

  return row?.querySelector('p, h1, h2, h3, h4, h5, h6, a, img')
    || row?.firstElementChild
    || row
    || null;
}

function getText(block, name) {
  const field = getFieldElement(block, name);

  if (field) {
    return field.textContent?.trim() || '';
  }

  return '';
}

// function getStyleValue(block, fallbackIndex) {
//   return block.children[fallbackIndex]
//     ?.textContent
//     ?.trim();
// }

function buildLink(block, textName, urlName) {
  const textEl = getFieldElement(block, textName);
  const urlEl = getFieldElement(block, urlName);
  const text = textEl?.textContent?.trim();
  const url = urlEl?.textContent?.trim();

  if (!text && !url) return null;

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
  const titleEl = getFieldElement(block, 'title');
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
  const content = document.createElement('div');
  content.className = 'hero-content';

  const overline = getFieldElement(block, 'overline');
  if (overline?.textContent?.trim()) {
    overline.classList.add('hero-overline');
    content.append(overline);
  }

  const heading = buildHeading(block, titleType);
  if (heading) content.append(heading);

  const descriptionEl = getFieldElement(block, 'description');

  if (descriptionEl?.textContent?.trim()) {
    const description = document.createElement('div');
    description.className = 'hero-description';
    description.innerHTML = descriptionEl.innerHTML;

    moveInstrumentation(descriptionEl, description);
    content.append(description);
  }

  const links = [
    buildLink(block, 'link1Text', 'link1Url'),
    buildLink(block, 'link2Text', 'link2Url'),
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
  const content = document.createElement('div');
  content.className = 'hero-overlay-content';

  const heading = buildHeading(block, titleType);

  if (heading) {
    content.append(heading);
  }

  const descriptionEl = getFieldElement(block, 'description');

  if (descriptionEl?.textContent?.trim()) {
    const description = document.createElement('div');
    description.className = 'hero-description';
    description.innerHTML = descriptionEl.innerHTML;

    moveInstrumentation(descriptionEl, description);

    content.append(description);
  }

  const button = buildLink(block, 'buttonText', 'buttonUrl');

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
  const content = document.createElement('div');
  content.className = 'hero-centered-content';

  const heading = buildHeading(block, titleType);

  if (heading) {
    content.append(heading);
  }

  const descriptionEl = getFieldElement(block, 'description');

  if (descriptionEl?.textContent?.trim()) {
    const description = document.createElement('div');
    description.className = 'hero-description';
    description.innerHTML = descriptionEl.innerHTML;

    moveInstrumentation(descriptionEl, description);

    content.append(description);
  }

  const actions = document.createElement('div');
  actions.className = 'hero-actions';

  const primaryButton = buildLink(
    block,
    'primaryButtonText',
    'primaryButtonUrl',
  );

  const secondaryButton = buildLink(
    block,
    'secondaryButtonText',
    'secondaryButtonUrl',
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
  const content = document.createElement('div');
  content.className = 'hero-banner-content';

  const heading = buildHeading(block, titleType);

  if (heading) {
    content.append(heading);
  }

  const descriptionEl = getFieldElement(block, 'description');

  if (descriptionEl?.textContent?.trim()) {
    const description = document.createElement('div');
    description.className = 'hero-description';
    description.innerHTML = descriptionEl.innerHTML;

    moveInstrumentation(descriptionEl, description);

    content.append(description);
  }

  const link = document.createElement('a');

  const text = getText(block, 'bannerLinkText');
  const url = getText(block, 'bannerLinkUrl');

  link.className = 'hero-banner-link';
  link.href = url || '#';

  if (text) {
    link.innerHTML = `
        <span>${text}</span>
        <span>&rarr;</span>
      `;
  } else {
    link.innerHTML = `
        <span>&rarr;</span>
      `;
  }

  content.append(link);

  const picture = block.querySelector('picture');
  const img = picture?.querySelector('img');

  if (img) {
    block.style.backgroundImage = `url("${img.src}")`;
  }

  return [content];
}

export default function decorate(block) {
  const heroType = getText(block, 'heroType') || 'split';
  const titleType = getText(block, 'titleType') || 'h1';

  const textColor = getText(block, 'textColor');

  const backgroundColor = heroType === 'split'
    ? getText(block, 'backgroundColor')
    : null;

  const buttonColor = ['overlay', 'centered'].includes(heroType)
    ? getText(block, 'buttonColor')
    : null;

  const imagePosition = heroType === 'split'
    ? getText(block, 'imagePosition')
    : null;

  const buttonPosition = ['overlay', 'centered'].includes(heroType)
    ? getText(block, 'buttonPosition')
    : null;

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
    console.error('hero: failed to decorate variant', heroType, error);
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
