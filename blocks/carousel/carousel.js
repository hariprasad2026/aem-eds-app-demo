import { moveInstrumentation } from '../../scripts/scripts.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';
import showSlide from '../../scripts/carousel-support.js';
import { decorateBlock, loadBlock } from '../../scripts/aem.js';

const CAROUSEL_TYPES = {
  slider: { controls: true, indicators: true },
  'slides-only': { controls: false, indicators: false, autoplay: true },
  'with-controls': { controls: true, indicators: false },
  'with-indicators': { controls: true, indicators: true },
  'with-captions': { controls: true, indicators: true },
};

const NESTED_BLOCK_SELECTORS = [
  '.block',
  '[data-aue-resource]',
  '[data-block-name]',
  '.hero-banner',
  '.cards',
  '.columns',
  '.content-cards',
  '.accordion',
  '.cta',
  '.fragment',
  '.spotlight',
  '.statistics-list',
  '.teaser-v1',
  '.table',
  '.quote',
];

const NESTED_BLOCK_SELECTOR = NESTED_BLOCK_SELECTORS.join(', ');
const DEFAULT_AUTOPLAY_INTERVAL = 5000;
const VALID_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify']);
const VALID_VERTICAL_ALIGNMENTS = new Set(['top', 'middle', 'bottom']);
const HERO_ALIGNMENT_VALUES = new Set(['top', 'middle', 'bottom']);
const HERO_BG_VALUES = new Set(['none', 'white', 'black']);
const MOTION_ROW_VALUES = new Set(['select', 'default', 'slide', 'fade']);
const SWIPE_THRESHOLD_PX = 40;

function isBlockLikeNode(node) {
  if (!node) return false;

  return node.matches?.(NESTED_BLOCK_SELECTOR) || !!node.querySelector?.(NESTED_BLOCK_SELECTOR);
}

function parseAutoplayInterval(rawMotion) {
  if (!rawMotion) return DEFAULT_AUTOPLAY_INTERVAL;
  const motion = rawMotion.trim().toLowerCase();

  if (/^\d+$/.test(motion)) {
    return Math.max(Number.parseInt(motion, 10), 1000);
  }

  if (/^\d+(\.\d+)?s$/.test(motion)) {
    return Math.max(Math.round(Number.parseFloat(motion) * 1000), 1000);
  }

  return DEFAULT_AUTOPLAY_INTERVAL;
}

function isHeroBannerSlide(row) {
  const cells = Array.from(row.querySelectorAll(':scope > div'));
  if (cells.length < 6) return false;

  if (row.querySelector('[data-aue-prop="heroImageType"], [data-aue-prop="heroImage"], [data-aue-prop="heroLottoImagePath"], [data-aue-prop="heroIcon"], [data-aue-prop="eyebrowText"], [data-aue-prop="bgColor"], [data-aue-prop="alignment"]')) {
    return true;
  }

  const values = cells
    .map((cell) => cell.textContent.trim().toLowerCase())
    .filter(Boolean);

  const hasImageType = values.includes('default') || values.includes('lotto');
  const hasAlignment = values.some((value) => HERO_ALIGNMENT_VALUES.has(value));
  const hasBgColor = values.some((value) => HERO_BG_VALUES.has(value));

  return hasImageType && hasAlignment && hasBgColor;
}

function createHeroBannerBlock(row) {
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

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = Number.parseInt(slide.dataset.slideIndex, 10);
  if (!block || Number.isNaN(slideIndex)) return;

  block.dataset.activeSlide = String(slideIndex);

  const slides = block.querySelectorAll('.carousel-slide');
  slides.forEach((aSlide, idx) => {
    const isActive = idx === slideIndex;
    aSlide.classList.toggle('is-active', isActive);
    aSlide.setAttribute('aria-hidden', String(!isActive));
    aSlide.querySelectorAll('a').forEach((link) => {
      if (!isActive) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (!button) return;
    if (idx !== slideIndex) {
      button.removeAttribute('disabled');
      button.setAttribute('aria-current', 'false');
    } else {
      button.setAttribute('disabled', 'true');
      button.setAttribute('aria-current', 'true');
    }
  });
}

function getSlides(block) {
  return Array.from(block.querySelectorAll('.carousel-slide'));
}

function getActiveSlideIndex(block) {
  const current = Number.parseInt(block.dataset.activeSlide, 10);
  return Number.isNaN(current) ? 0 : current;
}

function goToSlide(block, targetIndex, behavior = 'smooth') {
  const slides = getSlides(block);
  if (!slides.length) return;

  let nextIndex = targetIndex;
  if (targetIndex < 0) nextIndex = slides.length - 1;
  if (targetIndex >= slides.length) nextIndex = 0;

  showSlide(block, nextIndex, behavior);
  updateActiveSlide(slides[nextIndex]);
}

function isKeyboardEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export { showSlide };

function isConfigRow(row) {
  const cells = row.querySelectorAll(':scope > div');
  if (cells.length !== 1) return false;

  const cell = cells[0];
  if (!cell) return false;
  if (isBlockLikeNode(cell)) {
    return false;
  }
  if (cell.matches?.('picture, img, a[href], h1, h2, h3, h4, h5, h6')
    || cell.querySelector('picture, img, a[href], h1, h2, h3, h4, h5, h6')) {
    return false;
  }

  const value = cell.textContent.trim().toLowerCase();
  return value && !value.includes(' ') && !!CAROUSEL_TYPES[value];
}

function isMotionRow(row) {
  const cells = row.querySelectorAll(':scope > div');
  if (cells.length !== 1) return false;

  const cell = cells[0];
  if (!cell || isBlockLikeNode(cell)) return false;
  if (cell.matches?.('picture, img, a[href], h1, h2, h3, h4, h5, h6')
    || cell.querySelector('picture, img, a[href], h1, h2, h3, h4, h5, h6')) {
    return false;
  }

  const value = cell.textContent.trim().toLowerCase();
  return Boolean(value)
    && (MOTION_ROW_VALUES.has(value) || /^\d+(\.\d+)?s?$/.test(value));
}

function isRenderableSlideRow(row) {
  const cells = Array.from(row.querySelectorAll(':scope > div'));
  if (!cells.length) return false;
  if (isConfigRow(row) || isMotionRow(row)) return false;
  if (isHeroBannerSlide(row)) return true;
  if (cells.some((cell) => isBlockLikeNode(cell))) return true;
  if (cells.length > 1) return true;

  return cells[0].textContent.trim().length > 0;
}

function extractConfig(block, rows) {
  const config = {};
  const classType = Object.keys(CAROUSEL_TYPES).find((type) => block.classList.contains(type));
  if (classType) config.type = classType;

  if (rows.length && isConfigRow(rows[0])) {
    const value = rows[0].textContent.trim().toLowerCase();
    if (CAROUSEL_TYPES[value]) {
      config.type = value;
      rows[0].remove();
      rows.shift();
      if (rows.length && isMotionRow(rows[0])) {
        config.motion = rows[0].textContent.trim();
        rows[0].remove();
        rows.shift();
      }
    }
  }

  if (rows.length && isMotionRow(rows[0])) {
    config.motion = rows[0].textContent.trim();
    rows[0].remove();
    rows.shift();
  }

  return config;
}

function bindEvents(block) {
  const slides = block.querySelectorAll('.carousel-slide');
  if (slides.length < 2) return;

  const slidesWrapper = block.querySelector('.carousel-slides');

  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (slideIndicators) {
    slideIndicators.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', (e) => {
        const slideIndicator = e.currentTarget.parentElement;
        goToSlide(block, Number.parseInt(slideIndicator.dataset.targetSlide, 10));
      });
    });
  }

  const prevBtn = block.querySelector('.slide-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      goToSlide(block, getActiveSlideIndex(block) - 1);
    });
  }

  const nextBtn = block.querySelector('.slide-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      goToSlide(block, getActiveSlideIndex(block) + 1);
    });
  }

  block.addEventListener('keydown', (event) => {
    if (isKeyboardEditableTarget(event.target)) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToSlide(block, getActiveSlideIndex(block) - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToSlide(block, getActiveSlideIndex(block) + 1);
    }
  });

  if (slidesWrapper) {
    let pointerStartX = 0;
    let pointerDeltaX = 0;
    let trackingPointer = false;

    const resetPointer = () => {
      trackingPointer = false;
      pointerStartX = 0;
      pointerDeltaX = 0;
    };

    slidesWrapper.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      trackingPointer = true;
      pointerStartX = event.clientX;
      pointerDeltaX = 0;
    });

    slidesWrapper.addEventListener('pointermove', (event) => {
      if (!trackingPointer) return;
      pointerDeltaX = event.clientX - pointerStartX;
    });

    slidesWrapper.addEventListener('pointerup', () => {
      if (!trackingPointer) return;

      if (Math.abs(pointerDeltaX) >= SWIPE_THRESHOLD_PX) {
        const direction = pointerDeltaX < 0 ? 1 : -1;
        goToSlide(block, getActiveSlideIndex(block) + direction);
      }

      resetPointer();
    });

    slidesWrapper.addEventListener('pointercancel', resetPointer);
    slidesWrapper.addEventListener('pointerleave', resetPointer);
  }

  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) updateActiveSlide(entry.target);
      });
    },
    { threshold: 0.5 },
  );

  slides.forEach((slide) => {
    slideObserver.observe(slide);
  });

  if (block.dataset.autoplay === 'true') {
    const autoplayInterval = Number.parseInt(block.dataset.autoplayInterval, 10)
      || DEFAULT_AUTOPLAY_INTERVAL;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let autoplayTimer;

    const startAutoplay = () => {
      if (autoplayTimer || prefersReducedMotion || document.hidden) return;
      autoplayTimer = window.setInterval(() => {
        goToSlide(block, getActiveSlideIndex(block) + 1);
      }, autoplayInterval);
    };

    const stopAutoplay = () => {
      if (!autoplayTimer) return;
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    };

    startAutoplay();
    block.addEventListener('mouseenter', stopAutoplay);
    block.addEventListener('mouseleave', startAutoplay);
    block.addEventListener('focusin', stopAutoplay);
    block.addEventListener('focusout', (event) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && block.contains(nextTarget)) return;
      startAutoplay();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });
  }
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  const slidePanel = document.createElement('div');

  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');
  slidePanel.classList.add('carousel-slide-panel');
  slide.append(slidePanel);

  const directChildren = Array.from(row.children);
  const nestedBlock = directChildren.find((child) => isBlockLikeNode(child));

  if (nestedBlock) {
    const contentNode = nestedBlock.matches?.(NESTED_BLOCK_SELECTOR)
      ? nestedBlock
      : nestedBlock.querySelector(NESTED_BLOCK_SELECTOR);

    if (contentNode) {
      slidePanel.append(contentNode);
      return slide;
    }
  }

  if (isHeroBannerSlide(row)) {
    slidePanel.append(createHeroBannerBlock(row));
    return slide;
  }

  const columns = row.querySelectorAll(':scope > div');

  columns.forEach((column, colIdx) => {
    if (colIdx === 0) {
      column.classList.add('carousel-slide-image');
    } else if (colIdx === 1) {
      column.classList.add('carousel-slide-content');
    } else {
      column.classList.add('carousel-slide-meta');
      column.hidden = true;
    }

    slidePanel.append(column);
  });

  const align = columns[2]?.textContent?.trim().toLowerCase();
  const valign = columns[3]?.textContent?.trim().toLowerCase();
  if (VALID_ALIGNMENTS.has(align)) slide.dataset.align = align;
  if (VALID_VERTICAL_ALIGNMENTS.has(valign)) slide.dataset.valign = valign;

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);

  const rows = Array.from(block.querySelectorAll(':scope > div'));
  const config = extractConfig(block, rows);
  const slideRows = rows.filter((row) => isRenderableSlideRow(row));
  let carouselType = config.type || block.getAttribute('data-carousel-type') || 'slider';
  if (!CAROUSEL_TYPES[carouselType]) carouselType = 'slider';
  block.setAttribute('data-carousel-type', carouselType);
  const typeConfig = CAROUSEL_TYPES[carouselType];

  const isSingleSlide = slideRows.length < 2;
  const placeholders = await fetchPlaceholders();
  const isAutoplay = Boolean(typeConfig.autoplay);
  const autoplayInterval = parseAutoplayInterval(config.motion);

  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', placeholders.carousel || 'Carousel');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');
  block.setAttribute('aria-live', isAutoplay ? 'off' : 'polite');
  block.setAttribute('tabindex', '0');
  block.dataset.autoplay = String(isAutoplay);
  block.dataset.autoplayInterval = String(autoplayInterval);

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.setAttribute('id', `carousel-${carouselId}-slides`);
  slidesWrapper.classList.add('carousel-slides');

  let slideIndicators;
  if (!isSingleSlide) {
    if (typeConfig.indicators) {
      const slideIndicatorsNav = document.createElement('nav');
      slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
      slideIndicators = document.createElement('ol');
      slideIndicators.classList.add('carousel-slide-indicators');
      slideIndicatorsNav.append(slideIndicators);
      block.append(slideIndicatorsNav);
    }

    if (typeConfig.controls) {
      const slideNavButtons = document.createElement('div');
      slideNavButtons.classList.add('carousel-navigation-buttons');
      slideNavButtons.innerHTML = `
        <button type="button" class="slide-prev" aria-controls="carousel-${carouselId}-slides" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
        <button type="button" class="slide-next" aria-controls="carousel-${carouselId}-slides" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
      `;
      container.append(slideNavButtons);
    }
  }

  slideRows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${idx + 1} ${placeholders.of || 'of'} ${slideRows.length}`);
    moveInstrumentation(row, slide);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${slideRows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  const nestedBlocks = Array.from(block.querySelectorAll('.carousel-slide .block'));
  nestedBlocks.forEach((nestedBlock) => {
    decorateBlock(nestedBlock);
  });
  await Promise.all(
    nestedBlocks.map((nestedBlock) => loadBlock(nestedBlock)),
  );

  if (!isSingleSlide) {
    goToSlide(block, 0, 'auto');
    bindEvents(block);
  } else {
    const singleSlide = block.querySelector('.carousel-slide');
    if (singleSlide) updateActiveSlide(singleSlide);
  }
}
