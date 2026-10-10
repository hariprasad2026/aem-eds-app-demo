/*
 * Fragment Block
 */

import {
  decorateMain,
} from '../../scripts/scripts.js';

import {
  loadSections,
} from '../../scripts/aem.js';

const FIELD_ORDER = [
  'fragmentType',
  'reference',
  'heroLayout',
  'imagePosition',
];

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

  return row?.firstElementChild || row || null;
}

function getText(block, name) {
  return getFieldElement(block, name)?.textContent?.trim() || '';
}

/**
 * Loads a fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    const fragmentPath = path.replace(/(\.plain)?\.html/, '');

    const resp = await fetch(`${fragmentPath}.plain.html`);

    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(
            elem.getAttribute(attr),
            new URL(fragmentPath, window.location),
          ).href;
        });
      };

      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);

      return main;
    }
  }

  return null;
}

/**
 * Standard Fragment
 */
function decorateStandardFragment(block, fragment) {
  const fragmentSection = fragment.querySelector(':scope .section');

  if (fragmentSection) {
    block.classList.add(...fragmentSection.classList);
    block.classList.remove('section');
    block.replaceChildren(...fragmentSection.childNodes);
  }
}

// Classes set by the hero block's Style tab (background/text/button color).
// The image-text, without-media and text-only layouts rebuild the DOM from
// individual cloned fields, so these classes must be copied across
// explicitly, otherwise the authored style choices are silently lost.
const HERO_STYLE_CLASS_PREFIXES = ['hero-bg-', 'hero-text-', 'hero-button-color-'];

function applyHeroStyleClasses(block, hero) {
  const styleClasses = [...hero.classList].filter(
    (cls) => HERO_STYLE_CLASS_PREFIXES.some((prefix) => cls.startsWith(prefix)),
  );
  block.classList.add(...styleClasses);
}

function getHeroRow(block, index) {
  return block.children[index]?.firstElementChild
    || block.children[index]
    || null;
}

/**
 * Full Hero
 */
function renderFullHero(block, fragment) {
  decorateStandardFragment(block, fragment);
}

/**
 * Image + Text
 */
function renderImageTextHero(block, fragment, imagePosition) {
  const hero = fragment.querySelector('.hero');

  if (!hero) {
    return;
  }

  applyHeroStyleClasses(block, hero);

  const image = hero.querySelector('picture')
    || hero.querySelector('img');

  const bgImage = hero.style.backgroundImage;

  const title = getHeroRow(hero, 2)?.querySelector('h1')
    || hero.querySelector('.hero-title');

  const description = hero.querySelector('.hero-description')
    || hero.querySelector('p');

  const ctas = hero.querySelectorAll(
    '.hero-link, .hero-button-primary, .hero-button-secondary, .hero-banner-link, a',
  );

  const wrapper = document.createElement('div');
  wrapper.className = 'hero-fragment-image-text';

  const media = document.createElement('div');
  media.className = 'hero-fragment-media';

  if (image) {
    media.append(image.cloneNode(true));
  } else if (bgImage) {
    media.style.backgroundImage = bgImage;
    media.classList.add('hero-fragment-bg-image');
  }

  const content = document.createElement('div');
  content.className = 'hero-fragment-content';

  if (title) {
    content.append(title.cloneNode(true));
  }

  if (description) {
    content.append(description.cloneNode(true));
  }

  ctas.forEach((cta) => {
    content.append(cta.cloneNode(true));
  });

  if (imagePosition === 'right') {
    wrapper.append(content);
    wrapper.append(media);
  } else {
    wrapper.append(media);
    wrapper.append(content);
  }

  block.replaceChildren(wrapper);
}
/**
 * Without Media
 */

function renderWithoutMediaHero(block, fragment) {
  const hero = fragment.querySelector('.hero');

  if (!hero) {
    return;
  }

  applyHeroStyleClasses(block, hero);

  const title = getHeroRow(hero, 2)?.querySelector('h1')
    || hero.querySelector('.hero-title');

  const description = hero.querySelector('.hero-description')
    || hero.querySelector('p');

  const ctas = hero.querySelectorAll(
    '.hero-link, .hero-button-primary, .hero-button-secondary, .hero-banner-link, a',
  );

  const wrapper = document.createElement('div');
  wrapper.className = 'hero-fragment-without-media';

  if (title) {
    wrapper.append(title.cloneNode(true));
  }

  if (description) {
    wrapper.append(description.cloneNode(true));
  }

  ctas.forEach((cta) => {
    wrapper.append(cta.cloneNode(true));
  });

  block.replaceChildren(wrapper);
}
/**
 * Text Only
 */
function renderTextOnlyHero(block, fragment) {
  const hero = fragment.querySelector('.hero');

  if (!hero) {
    return;
  }

  applyHeroStyleClasses(block, hero);

  const title = getHeroRow(hero, 2)?.querySelector('h1')
    || hero.querySelector('.hero-title');

  const description = hero.querySelector('.hero-description')
    || hero.querySelector('p');

  const wrapper = document.createElement('div');
  wrapper.className = 'hero-fragment-text-only';

  if (title) {
    wrapper.append(title.cloneNode(true));
  }

  if (description) {
    wrapper.append(description.cloneNode(true));
  }

  block.replaceChildren(wrapper);
}

/**
 * Hero Fragment
 */
function decorateHeroFragment(block, fragment, heroLayout, imagePosition) {
  switch (heroLayout) {
    case 'image-text':
      block.classList.add('hero-fragment', 'hero-fragment-image-text-layout');
      renderImageTextHero(block, fragment, imagePosition);
      break;

    case 'without-media':
      block.classList.add(
        'hero-fragment',
        'hero-fragment-without-media-layout',
      );
      renderWithoutMediaHero(block, fragment);
      break;

    case 'text-only':
      block.classList.add('hero-fragment', 'hero-fragment-text-only-layout');
      renderTextOnlyHero(block, fragment);
      break;

    case 'full':
    default:
      block.classList.add('hero-fragment', 'hero-fragment-full-layout');
      renderFullHero(block, fragment);
      break;
  }
}

export default async function decorate(block) {
  const fragmentType = getText(block, 'fragmentType') || 'standard';

  const heroLayout = getText(block, 'heroLayout') || 'full';

  const referenceEl = getFieldElement(block, 'reference');

  const link = referenceEl?.querySelector('a');

  const imagePosition = getText(block, 'imagePosition') || 'left';

  const path = link
    ? link.getAttribute('href')
    : getText(block, 'reference');

  const fragment = await loadFragment(path);

  if (!fragment) {
    return;
  }

  switch (fragmentType) {
    case 'hero':
      decorateHeroFragment(
        block,
        fragment,
        heroLayout,
        imagePosition,
      );
      break;

    case 'standard':
    default:
      decorateStandardFragment(block, fragment);
      break;
  }
}
