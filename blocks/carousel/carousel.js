import { moveInstrumentation } from '../../scripts/scripts.js';
import fetchPlaceholders from '../../scripts/placeholders.js';
import { decorateBlock, loadBlock } from '../../scripts/aem.js';

const CAROUSEL_TYPES = {
  slider: { controls: true, indicators: true },
  'slides-only': { controls: false, indicators: false, autoplay: true },
  'with-controls': { controls: true, indicators: false },
  'with-indicators': { controls: true, indicators: true },
  'with-captions': { controls: true, indicators: true },
};

const ITEM_TYPES = new Set(['hero-banner', 'card', 'image-text', 'video', 'testimonial', 'teaser']);
const NESTED_BLOCK_SELECTOR = '.block, [data-block-name], [data-aue-resource], .hero-banner, .cards, .video, .testimonial, .teaser-v1';
const MOTION_ROW_VALUES = new Set(['slide', 'fade', 'none']);
const BOOLEAN_TRUE_VALUES = new Set(['true', 'yes', '1', 'on']);
const HERO_MARKERS = new Set(['default', 'lotto', 'none', 'top', 'middle', 'bottom']);
const BREAKPOINTS = { tablet: 600, desktop: 900 };
const DEFAULT_OPTIONS = {
  transition: 'slide',
  autoplay: false,
  autoplayInterval: 5000,
  pauseOnHoverFocus: true,
  infiniteLoop: true,
  controls: true,
  indicators: true,
  playPauseControl: false,
  swipe: true,
  keyboardNavigation: true,
  mobileItems: 1,
  tabletItems: 1,
  desktopItems: 1,
  gap: 0,
  theme: 'default',
  alignment: 'center',
  aspectRatio: '',
  accessibleLabel: '',
};

const carouselState = new WeakMap();
let carouselId = 0;

function toBoolean(value, fallback = false) {
  if (value === null || value === undefined || value === '') return fallback;
  return BOOLEAN_TRUE_VALUES.has(String(value).trim().toLowerCase());
}

function toPositiveNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

function getOptions(block, config) {
  const options = { ...DEFAULT_OPTIONS };
  const typeFromConfig = config.type || block.dataset.carouselType;
  if (typeFromConfig && CAROUSEL_TYPES[typeFromConfig]) {
    options.controls = CAROUSEL_TYPES[typeFromConfig].controls;
    options.indicators = CAROUSEL_TYPES[typeFromConfig].indicators;
    options.autoplay = Boolean(CAROUSEL_TYPES[typeFromConfig].autoplay);
  }

  const transition = (config.transition || block.dataset.transition || '').toLowerCase();
  if (MOTION_ROW_VALUES.has(transition)) options.transition = transition;

  options.autoplay = toBoolean(block.dataset.autoplay, options.autoplay);
  options.autoplayInterval = Math.max(
    1000,
    toPositiveNumber(block.dataset.autoplayInterval, options.autoplayInterval),
  );
  options.pauseOnHoverFocus = toBoolean(
    block.dataset.pauseOnHoverFocus,
    options.pauseOnHoverFocus,
  );
  options.infiniteLoop = toBoolean(block.dataset.infiniteLoop, options.infiniteLoop);
  options.controls = toBoolean(block.dataset.controls, options.controls);
  options.indicators = toBoolean(block.dataset.indicators, options.indicators);
  options.playPauseControl = toBoolean(
    block.dataset.playPauseControl,
    options.playPauseControl,
  );
  options.swipe = toBoolean(block.dataset.swipe, options.swipe);
  options.keyboardNavigation = toBoolean(
    block.dataset.keyboardNavigation,
    options.keyboardNavigation,
  );
  options.mobileItems = Math.max(
    1,
    Math.floor(toPositiveNumber(block.dataset.mobileItems, options.mobileItems)),
  );
  options.tabletItems = Math.max(
    1,
    Math.floor(toPositiveNumber(block.dataset.tabletItems, options.tabletItems)),
  );
  options.desktopItems = Math.max(
    1,
    Math.floor(toPositiveNumber(block.dataset.desktopItems, options.desktopItems)),
  );
  options.gap = Math.max(0, toPositiveNumber(block.dataset.gap, options.gap));
  options.theme = (block.dataset.theme || options.theme).toLowerCase();
  options.alignment = (block.dataset.alignment || options.alignment).toLowerCase();
  options.aspectRatio = block.dataset.aspectRatio || options.aspectRatio;
  options.accessibleLabel = block.dataset.accessibleLabel || options.accessibleLabel;

  return options;
}

function isConfigRow(row) {
  const cells = row.querySelectorAll(':scope > div');
  return cells.length === 1
    && !cells[0].querySelector('picture, img, video, a[href], h1, h2, h3, h4, h5, h6');
}

function extractConfig(rows) {
  const config = {};
  if (!rows.length || !isConfigRow(rows[0])) return config;

  const firstValue = rows[0].textContent.trim().toLowerCase();
  if (CAROUSEL_TYPES[firstValue]) {
    config.type = firstValue;
    rows[0].remove();
    rows.shift();
  }

  if (rows.length && isConfigRow(rows[0])) {
    const transition = rows[0].textContent.trim().toLowerCase();
    if (MOTION_ROW_VALUES.has(transition)) {
      config.transition = transition;
      rows[0].remove();
      rows.shift();
    }
  }

  return config;
}

function isRenderableSlideRow(row) {
  const cells = Array.from(row.querySelectorAll(':scope > div'));
  if (!cells.length) return false;

  return cells.some((cell) => cell.querySelector('picture, img, video, a[href], [data-aue-resource], [data-block-name], .block')
    || cell.textContent.trim().length > 0);
}

function getSlideItemType(row, cells) {
  const explicit = row.querySelector('[data-aue-prop="itemType"]')?.textContent?.trim()?.toLowerCase();
  if (ITEM_TYPES.has(explicit)) return explicit;

  const firstValue = cells[0]?.textContent?.trim()?.toLowerCase();
  if (ITEM_TYPES.has(firstValue)) return firstValue;

  const textValues = cells.map((cell) => cell.textContent.trim().toLowerCase()).filter(Boolean);
  const hasHeroPattern = textValues.some((value) => HERO_MARKERS.has(value))
    && cells.some((cell) => cell.querySelector('picture, img'));
  if (hasHeroPattern) return 'hero-banner';

  if (cells.some((cell) => cell.querySelector('video, iframe'))) return 'video';
  if (row.querySelector('[data-aue-prop="quote"], [data-aue-prop="author"]')) return 'testimonial';
  return 'image-text';
}

function createHostSlide(slideIndex, carouselDomId) {
  const slide = document.createElement('li');
  slide.className = 'carousel-slide';
  slide.dataset.slideIndex = String(slideIndex);
  slide.setAttribute('id', `${carouselDomId}-slide-${slideIndex}`);
  slide.setAttribute('role', 'group');
  slide.setAttribute('aria-roledescription', 'slide');
  return slide;
}

function createHeroBlockFromRow(row) {
  const heroBlock = document.createElement('div');
  heroBlock.classList.add('block', 'hero-banner');
  heroBlock.dataset.blockName = 'hero-banner';

  Array.from(row.querySelectorAll(':scope > div')).forEach((cell) => {
    const fieldRow = document.createElement('div');
    fieldRow.append(cell);
    heroBlock.append(fieldRow);
  });

  return heroBlock;
}

function renderImageText(cells) {
  const article = document.createElement('article');
  article.className = 'carousel-item-renderer carousel-item-renderer-image-text';
  const media = cells.find((cell) => cell.querySelector('picture, img'));
  const content = cells.find((cell) => cell !== media && cell.textContent.trim().length > 0);

  if (media) {
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'carousel-renderer-media';
    mediaWrap.append(media);
    article.append(mediaWrap);
  }

  if (content) {
    const contentWrap = document.createElement('div');
    contentWrap.className = 'carousel-renderer-content';
    contentWrap.append(content);
    article.append(contentWrap);
  }

  return article;
}

function renderVideo(cells) {
  const section = document.createElement('section');
  section.className = 'carousel-item-renderer carousel-item-renderer-video';
  const media = cells.find((cell) => cell.querySelector('video, iframe, a[href], picture, img'));
  const caption = cells.find((cell) => cell !== media && cell.textContent.trim().length > 0);

  if (media) section.append(media);
  if (caption) {
    const captionWrap = document.createElement('div');
    captionWrap.className = 'carousel-renderer-caption';
    captionWrap.append(caption);
    section.append(captionWrap);
  }
  return section;
}

function renderTestimonial(cells) {
  const figure = document.createElement('figure');
  figure.className = 'carousel-item-renderer carousel-item-renderer-testimonial';
  const quoteCell = cells.find(
    (cell) => cell.querySelector('blockquote') || cell.textContent.trim().length > 0,
  );
  if (quoteCell) {
    const quote = document.createElement('blockquote');
    quote.innerHTML = quoteCell.innerHTML;
    figure.append(quote);
  }
  const citationCell = cells.find(
    (cell) => cell !== quoteCell && cell.textContent.trim().length > 0,
  );
  if (citationCell) {
    const caption = document.createElement('figcaption');
    caption.innerHTML = citationCell.innerHTML;
    figure.append(caption);
  }
  return figure;
}

const rendererRegistry = {
  'image-text': (cells) => renderImageText(cells),
  video: (cells) => renderVideo(cells),
  testimonial: (cells) => renderTestimonial(cells),
  card: (cells) => renderImageText(cells),
  teaser: (cells) => renderImageText(cells),
};

function createSlideFromRow(row, slideIndex, carouselDomId, pendingBlocks) {
  const slide = createHostSlide(slideIndex, carouselDomId);
  const cells = Array.from(row.querySelectorAll(':scope > div'));
  const blockNode = row.querySelector(
    `:scope > div${NESTED_BLOCK_SELECTOR}, :scope > ${NESTED_BLOCK_SELECTOR}`,
  )
    || row.querySelector(NESTED_BLOCK_SELECTOR);

  if (blockNode) {
    const host = document.createElement('div');
    host.className = 'carousel-slide-item-host';
    host.append(blockNode);
    pendingBlocks.push(blockNode);
    slide.append(host);
    return slide;
  }

  const itemType = getSlideItemType(row, cells);
  slide.dataset.itemType = itemType;

  if (itemType === 'hero-banner') {
    const host = document.createElement('div');
    host.className = 'carousel-slide-item-host';
    const heroBlock = createHeroBlockFromRow(row);
    host.append(heroBlock);
    pendingBlocks.push(heroBlock);
    slide.append(host);
    return slide;
  }

  const renderer = rendererRegistry[itemType] || rendererRegistry['image-text'];
  slide.append(renderer(cells));
  return slide;
}

function getItemsPerView(options) {
  if (window.matchMedia(`(min-width: ${BREAKPOINTS.desktop}px)`).matches) {
    return options.desktopItems;
  }
  if (window.matchMedia(`(min-width: ${BREAKPOINTS.tablet}px)`).matches) {
    return options.tabletItems;
  }
  return options.mobileItems;
}

function getVisibleIndices(index, total, perView) {
  const indices = [];
  for (let i = 0; i < perView; i += 1) {
    indices.push((index + i) % total);
  }
  return indices;
}

function updateSlideA11y(slides, visibleIndices) {
  slides.forEach((slide, idx) => {
    const isVisible = visibleIndices.includes(idx);
    slide.setAttribute('aria-hidden', String(!isVisible));
    slide.querySelectorAll('a, button, input, select, textarea').forEach((node) => {
      if (!isVisible) {
        node.setAttribute('tabindex', '-1');
      } else {
        node.removeAttribute('tabindex');
      }
    });
  });
}

function renderState(block) {
  const state = carouselState.get(block);
  if (!state) return;
  const {
    slides,
    track,
    indicators,
    options,
  } = state;
  const total = slides.length;
  if (!total) return;

  const perView = Math.min(getItemsPerView(options), total);
  const maxIndex = options.infiniteLoop ? total - 1 : Math.max(0, total - perView);
  if (!options.infiniteLoop) {
    state.activeIndex = Math.max(0, Math.min(state.activeIndex, maxIndex));
  }

  const offset = state.activeIndex;
  track.style.transform = `translate3d(calc((100% + var(--carousel-gap, 0px)) * ${-offset}), 0, 0)`;

  const visibleIndices = getVisibleIndices(state.activeIndex, total, perView);
  updateSlideA11y(slides, visibleIndices);

  indicators.forEach((button, idx) => {
    const current = idx === state.activeIndex;
    button.disabled = current;
    button.setAttribute('aria-current', String(current));
  });

  block.dataset.activeSlide = String(state.activeIndex);
}

function goToSlide(block, nextIndex) {
  const state = carouselState.get(block);
  if (!state) return;
  const total = state.slides.length;
  if (!total) return;

  if (state.options.infiniteLoop) {
    state.activeIndex = ((nextIndex % total) + total) % total;
  } else {
    const perView = Math.min(getItemsPerView(state.options), total);
    const maxIndex = Math.max(0, total - perView);
    state.activeIndex = Math.max(0, Math.min(nextIndex, maxIndex));
  }

  renderState(block);
}

function stopAutoplay(block) {
  const state = carouselState.get(block);
  if (!state || !state.timer) return;
  window.clearInterval(state.timer);
  state.timer = null;
}

function startAutoplay(block) {
  const state = carouselState.get(block);
  if (!state || !state.options.autoplay || state.timer) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  state.timer = window.setInterval(() => {
    if (state.paused || document.hidden) return;
    goToSlide(block, state.activeIndex + 1);
  }, state.options.autoplayInterval);
}

function bindEvents(block) {
  const state = carouselState.get(block);
  if (!state) return;

  const {
    options,
    controls,
    playPauseButton,
    indicators,
    track,
  } = state;
  const [prevButton, nextButton] = controls;

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      goToSlide(block, state.activeIndex - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      goToSlide(block, state.activeIndex + 1);
    });
  }

  indicators.forEach((button, idx) => {
    button.addEventListener('click', () => {
      goToSlide(block, idx);
    });
  });

  if (playPauseButton) {
    playPauseButton.addEventListener('click', () => {
      state.paused = !state.paused;
      playPauseButton.setAttribute('aria-pressed', String(state.paused));
      playPauseButton.classList.toggle('is-paused', state.paused);
      if (state.paused) stopAutoplay(block);
      else startAutoplay(block);
    });
  }

  if (options.keyboardNavigation) {
    block.addEventListener('keydown', (event) => {
      const { target } = event;
      if (target instanceof HTMLElement
        && target.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToSlide(block, state.activeIndex - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToSlide(block, state.activeIndex + 1);
      }
    });
  }

  if (options.swipe) {
    let startX = 0;
    let deltaX = 0;
    let isSwiping = false;

    track.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      isSwiping = true;
      startX = event.clientX;
      deltaX = 0;
    });

    track.addEventListener('pointermove', (event) => {
      if (!isSwiping) return;
      deltaX = event.clientX - startX;
    });

    track.addEventListener('pointerup', () => {
      if (!isSwiping) return;
      if (Math.abs(deltaX) > 40) {
        goToSlide(block, state.activeIndex + (deltaX < 0 ? 1 : -1));
      }
      isSwiping = false;
    });
    track.addEventListener('pointercancel', () => {
      isSwiping = false;
    });
  }

  if (options.pauseOnHoverFocus) {
    block.addEventListener('mouseenter', () => {
      state.paused = true;
    });
    block.addEventListener('mouseleave', () => {
      state.paused = false;
    });
    block.addEventListener('focusin', () => {
      state.paused = true;
    });
    block.addEventListener('focusout', (event) => {
      const { relatedTarget: next } = event;
      if (next instanceof Node && block.contains(next)) return;
      state.paused = false;
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) state.paused = true;
    else state.paused = false;
  });

  window.addEventListener('resize', () => renderState(block));
}

export default async function decorate(block) {
  if (block.dataset.carouselReady === 'true') return;

  carouselId += 1;
  const carouselDomId = `carousel-${carouselId}`;
  block.setAttribute('id', carouselDomId);

  const rows = Array.from(block.querySelectorAll(':scope > div'));
  const config = extractConfig(rows);
  const options = getOptions(block, config);
  const slideRows = rows.filter((row) => isRenderableSlideRow(row));
  const placeholders = await fetchPlaceholders();

  block.classList.add('carouselblock');
  block.dataset.transition = options.transition;
  block.dataset.theme = options.theme;
  block.style.setProperty('--carousel-gap', `${options.gap}px`);
  block.style.setProperty('--carousel-mobile-items', String(options.mobileItems));
  block.style.setProperty('--carousel-tablet-items', String(options.tabletItems));
  block.style.setProperty('--carousel-desktop-items', String(options.desktopItems));
  if (options.aspectRatio) block.style.setProperty('--carousel-aspect-ratio', options.aspectRatio);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', options.accessibleLabel || placeholders.carousel || 'Carousel');
  block.setAttribute('aria-live', options.autoplay ? 'off' : 'polite');
  block.setAttribute('tabindex', '0');

  const container = document.createElement('div');
  container.className = 'carousel-slides-container';

  const track = document.createElement('ul');
  track.className = 'carousel-slides';
  track.setAttribute('id', `${carouselDomId}-track`);

  const indicators = [];
  const pendingBlocks = [];

  slideRows.forEach((row, index) => {
    const slide = createSlideFromRow(row, index, carouselDomId, pendingBlocks);
    slide.setAttribute('aria-label', `${index + 1} ${placeholders.of || 'of'} ${slideRows.length}`);
    moveInstrumentation(row, slide);
    track.append(slide);
    row.remove();
  });

  container.append(track);

  const controls = [];
  if (options.controls && slideRows.length > 1) {
    const nav = document.createElement('div');
    nav.className = 'carousel-navigation-buttons';

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'slide-prev';
    prevButton.setAttribute('aria-label', placeholders.previousSlide || 'Previous Slide');
    prevButton.setAttribute('aria-controls', `${carouselDomId}-track`);

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'slide-next';
    nextButton.setAttribute('aria-label', placeholders.nextSlide || 'Next Slide');
    nextButton.setAttribute('aria-controls', `${carouselDomId}-track`);

    nav.append(prevButton, nextButton);
    container.append(nav);
    controls.push(prevButton, nextButton);
  }

  let playPauseButton = null;
  if (options.playPauseControl && slideRows.length > 1) {
    playPauseButton = document.createElement('button');
    playPauseButton.type = 'button';
    playPauseButton.className = 'carousel-play-pause';
    playPauseButton.setAttribute('aria-label', placeholders.pauseCarousel || 'Pause Carousel');
    playPauseButton.setAttribute('aria-pressed', 'false');
    container.append(playPauseButton);
  }

  block.prepend(container);

  if (options.indicators && slideRows.length > 1) {
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
    const list = document.createElement('ol');
    list.className = 'carousel-slide-indicators';

    slideRows.forEach((_, index) => {
      const item = document.createElement('li');
      item.className = 'carousel-slide-indicator';
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `${placeholders.showSlide || 'Show Slide'} ${index + 1} ${placeholders.of || 'of'} ${slideRows.length}`);
      item.append(button);
      list.append(item);
      indicators.push(button);
    });

    nav.append(list);
    block.append(nav);
  }

  const state = {
    activeIndex: 0,
    slides: Array.from(track.children),
    track,
    options,
    controls,
    indicators,
    playPauseButton,
    paused: false,
    timer: null,
  };
  carouselState.set(block, state);

  const uniqueNestedBlocks = [...new Set(pendingBlocks)];
  uniqueNestedBlocks.forEach((nestedBlock) => decorateBlock(nestedBlock));
  await Promise.all(uniqueNestedBlocks.map((nestedBlock) => loadBlock(nestedBlock)));

  renderState(block);
  bindEvents(block);
  if (
    options.autoplay
    && slideRows.length > 1
    && !document.documentElement.classList.contains('adobe-ue-edit')
  ) {
    startAutoplay(block);
  }

  block.dataset.carouselReady = 'true';
}
