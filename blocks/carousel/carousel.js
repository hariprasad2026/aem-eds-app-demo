import { moveInstrumentation } from '../../scripts/scripts.js';
import { loadCSS } from '../../scripts/aem.js';
import fetchPlaceholders from '../../scripts/placeholders.js';
import showSlide from '../../scripts/carousel-support.js';
import decorateHeroBanner from '../hero-banner/hero-banner.js';

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  slides.forEach((aSlide, idx) => {
    const isActive = idx === slideIndex;
    aSlide.setAttribute('aria-hidden', String(!isActive));
    aSlide.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((link) => {
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
    const isActive = idx === slideIndex;
    button.disabled = isActive;
    button.setAttribute('aria-current', String(isActive));
  });
}

export { showSlide };

function getActiveSlideIndex(block) {
  const activeSlide = Number.parseInt(block.dataset.activeSlide, 10);
  return Number.isNaN(activeSlide) ? 0 : activeSlide;
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (slideIndicators) {
    slideIndicators.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', (e) => {
        const slideIndicator = e.currentTarget.parentElement;
        showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
      });
    });
  }

  const prevBtn = block.querySelector('.slide-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      showSlide(block, getActiveSlideIndex(block) - 1);
    });
  }

  const nextBtn = block.querySelector('.slide-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      showSlide(block, getActiveSlideIndex(block) + 1);
    });
  }

  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) updateActiveSlide(entry.target);
      });
    },
    { threshold: 0.5 },
  );
  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

const CAROUSEL_TYPES = {
  slider: { controls: true, indicators: true },
  'slides-only': { controls: false, indicators: false, autoplay: true },
  'with-controls': { controls: true, indicators: false },
  'with-indicators': { controls: true, indicators: true },
  'with-captions': { controls: true, indicators: true },
};

const AUTOPLAY_INTERVAL = 5000;

function isConfigRow(row) {
  const cells = row.querySelectorAll(':scope > div');
  return cells.length === 1 && !cells[0].querySelector('picture, img, a, h1, h2, h3, h4, h5, h6');
}

// Authored carouselType/motionType fields are rendered as leading rows; consume them.
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
      if (rows.length && isConfigRow(rows[0])) {
        config.motion = rows[0].textContent.trim();
        rows[0].remove();
        rows.shift();
      }
    }
  }
  return config;
}

function startAutoplay(block) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let paused = false;
  let visible = true;
  ['mouseenter', 'focusin'].forEach((evt) => block.addEventListener(evt, () => { paused = true; }));
  ['mouseleave', 'focusout'].forEach((evt) => block.addEventListener(evt, () => { paused = false; }));

  // Pause while the carousel is scrolled off-screen.
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }, { threshold: 0.25 });
  visibilityObserver.observe(block);

  const timer = setInterval(() => {
    // Stop for good once the block has been removed from the page.
    if (!block.isConnected) {
      clearInterval(timer);
      visibilityObserver.disconnect();
      return;
    }
    if (paused || !visible || document.hidden) return;
    const active = Number.parseInt(block.dataset.activeSlide, 10) || 0;
    const slideCount = block.querySelectorAll('.carousel-slide').length;
    if (slideCount) showSlide(block, (active + 1) % slideCount);
  }, AUTOPLAY_INTERVAL);
}

const HORIZONTAL_ALIGNMENTS = ['left', 'center', 'right'];
const VERTICAL_ALIGNMENTS = ['top', 'middle', 'bottom'];
const HERO_IMAGE_TYPES = ['default', 'lotto'];

/**
 * Alignment values are authored as the trailing plain paragraphs of the content cell.
 * Only those are consumed, so real content that happens to read "left", "top", etc.
 * elsewhere in the cell (or in a heading) is left untouched.
 */
function extractAlignment(column, slide) {
  [...column.children].slice(-2).reverse().forEach((el) => {
    if (!['P', 'DIV'].includes(el.tagName) || el.children.length) return;
    const text = el.textContent.trim().toLowerCase();

    if (!column.dataset.align && HORIZONTAL_ALIGNMENTS.includes(text)) {
      column.dataset.align = text;
      slide.dataset.align = text;
      el.remove();
    } else if (!column.dataset.valign && VERTICAL_ALIGNMENTS.includes(text)) {
      column.dataset.valign = text;
      el.remove();
    }
  });
}

function isHeroBannerRow(row) {
  if (['hero-banner-item', 'hero-banner'].includes(row.dataset.aueModel)) return true;

  if (row.querySelector(
    '[data-aue-prop="heroIcon"], [data-aue-prop="heroImageType"], '
    + '[data-aue-prop="heroImage"], [data-aue-prop="heroLottoImagePath"]',
  )) return true;

  const columns = [...row.querySelectorAll(':scope > div')];
  const hasHeroImageType = columns.some((column) => (
    !column.querySelector('img, picture, a[href]')
    && HERO_IMAGE_TYPES.includes(column.textContent.trim().toLowerCase())
  ));
  const hasHeroImage = columns.some((column) => column.querySelector('img, picture, a[href]'));

  return columns.length >= 8 && hasHeroImageType && hasHeroImage;
}

function copyHeroStyleClasses(from, to) {
  const allowedClass = /^(hero-banner-slide|icon-color-(black|white|blue)|title-color-(black|white|grey)|description-color-(black|white|grey)|hero-banner-align-(top|middle|bottom)|hero-banner-bg-(white|black)|hero-banner-bg-opacity-(80|60))$/;
  from.classList.forEach((className) => {
    if (allowedClass.test(className)) to.classList.add(className);
  });
}

function getHeroProperty(column) {
  if (column.dataset.aueProp) return column.dataset.aueProp;
  return column.querySelector('[data-aue-prop]')?.dataset.aueProp || '';
}

function getHeroPropertyValue(column) {
  const field = column.matches('[data-aue-prop]')
    ? column
    : column.querySelector('[data-aue-prop]');
  return field?.dataset.value || field?.getAttribute('value') || field?.textContent.trim()
    || column.textContent.trim();
}

function applyHeroStyleFields(columns, heroBanner) {
  const styleProperties = new Set([
    'styleSection',
    'alignment',
    'classes_iconColor',
    'classes_titleColor',
    'classes_descriptionColor',
    'bgColor',
    'bgOpacity',
  ]);
  const classProperties = {
    classes_iconColor: /^(icon-color-(black|white|blue))$/,
    classes_titleColor: /^(title-color-(black|white|grey))$/,
    classes_descriptionColor: /^(description-color-(black|white|grey))$/,
  };

  return columns.filter((column) => {
    const property = getHeroProperty(column);
    if (!styleProperties.has(property)) return true;

    const value = getHeroPropertyValue(column).toLowerCase();
    const valuePattern = classProperties[property];
    if (valuePattern?.test(value)) heroBanner.classList.add(value);
    if (property === 'alignment' && ['top', 'middle', 'bottom'].includes(value)) {
      heroBanner.classList.add(`hero-banner-align-${value}`);
    }
    if (property === 'bgColor' && ['white', 'black'].includes(value)) {
      heroBanner.classList.add(`hero-banner-bg-${value}`);
    }
    if (property === 'bgOpacity' && ['80%', '60%', '80', '60'].includes(value)) {
      heroBanner.classList.add(`hero-banner-bg-opacity-${value.replace('%', '')}`);
    }
    return false;
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  const columns = Array.from(row.querySelectorAll(':scope > div'));
  const isHeroBanner = isHeroBannerRow(row);
  moveInstrumentation(row, slide);

  if (isHeroBanner) {
    const heroBanner = document.createElement('div');
    heroBanner.className = 'hero-banner';
    heroBanner.style.alignSelf = 'stretch';
    copyHeroStyleClasses(row, heroBanner);
    applyHeroStyleFields(columns, heroBanner).forEach((column) => heroBanner.append(column));
    decorateHeroBanner(heroBanner);
    slide.append(heroBanner);
  } else {
    columns.forEach((column, colIdx) => {
      const isImage = colIdx === 0;
      column.classList.add(`carousel-slide-${isImage ? 'image' : 'content'}`);
      if (!isImage) extractAlignment(column, slide);
      slide.append(column);
    });
  }

  // Headings are not guaranteed to have an id, so assign one before referencing it.
  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    if (!labeledBy.id) labeledBy.id = `${slide.id}-heading`;
    slide.setAttribute('aria-labelledby', labeledBy.id);
  }

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);

  const rows = Array.from(block.querySelectorAll(':scope > div'));

  if (rows.some(isHeroBannerRow)) {
    await loadCSS(`${window.hlx.codeBasePath}/blocks/hero-banner/hero-banner.css`);
  }

  // Extract Carousel parent properties if present
  const config = extractConfig(block, rows);
  let carouselType = config.type || block.getAttribute('data-carousel-type') || 'slider';
  if (!CAROUSEL_TYPES[carouselType]) carouselType = 'slider';
  block.setAttribute('data-carousel-type', carouselType);
  const typeConfig = CAROUSEL_TYPES[carouselType];

  const motionType = config.motion || block.getAttribute('data-motion-type');
  if (motionType) block.setAttribute('data-motion', motionType);

  const isSingleSlide = rows.length < 2;

  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute(
    'aria-roledescription',
    placeholders.carousel || 'Carousel',
  );

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');

  let slideIndicators;
  if (!isSingleSlide) {
    if (typeConfig.indicators) {
      const slideIndicatorsNav = document.createElement('nav');
      slideIndicatorsNav.setAttribute(
        'aria-label',
        placeholders.carouselSlideControls || 'Carousel Slide Controls',
      );
      slideIndicators = document.createElement('ol');
      slideIndicators.classList.add('carousel-slide-indicators');
      slideIndicatorsNav.append(slideIndicators);
      block.append(slideIndicatorsNav);
    }

    if (typeConfig.controls) {
      const slideNavButtons = document.createElement('div');
      slideNavButtons.classList.add('carousel-navigation-buttons');
      slideNavButtons.innerHTML = `
        <button type="button" class="slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
        <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
      `;

      container.append(slideNavButtons);
    }
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    updateActiveSlide(slidesWrapper.querySelector('.carousel-slide'));
    bindEvents(block);
    const autoplay = typeConfig.autoplay || /autoplay/i.test(motionType || '');
    if (autoplay && !document.documentElement.classList.contains('adobe-ue-edit')) {
      startAutoplay(block);
    }
  }
}
