import { moveInstrumentation } from '../../scripts/scripts.js';
import fetchPlaceholders from '../../scripts/placeholders.js';
import showSlide from '../../scripts/carousel-support.js';
import { decorateBlock, loadBlock } from '../../scripts/aem.js';

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
    }
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

function normalizeConfigValue(value = '') {
  return String(value).trim().toLowerCase();
}

function getTopLevelRow(element, block) {
  let current = element;
  while (current?.parentElement && current.parentElement !== block) {
    current = current.parentElement;
  }

  return current?.parentElement === block ? current : null;
}

function readNamedConfig(block, name) {
  const field = block.querySelector(`[data-aue-prop="${name}"]`);
  if (!field) return '';
  return field.textContent.trim();
}

function readLabeledConfig(rows, label) {
  const normalizedLabel = normalizeConfigValue(label).replace(/[^a-z0-9]/g, '');
  const matchingRow = rows.find((row) => {
    const cells = Array.from(row.querySelectorAll(':scope > div'));
    if (cells.length < 2) return false;
    const key = normalizeConfigValue(cells[0].textContent).replace(/[^a-z0-9]/g, '');
    return key === normalizedLabel;
  });

  if (!matchingRow) return '';
  const cells = Array.from(matchingRow.querySelectorAll(':scope > div'));
  return cells[1]?.textContent?.trim() || '';
}

function isConfigRow(row) {
  const cells = row.querySelectorAll(':scope > div');
  return cells.length === 1 && !cells[0].querySelector('picture, img, a, h1, h2, h3, h4, h5, h6');
}

// Authored carouselType/motionType fields are rendered as leading rows; consume them.
function extractConfig(block, rows) {
  const config = {};
  const classType = Object.keys(CAROUSEL_TYPES).find((type) => block.classList.contains(type));
  if (classType) config.type = classType;

  const namedType = normalizeConfigValue(readNamedConfig(block, 'carouselType'));
  if (CAROUSEL_TYPES[namedType]) {
    config.type = namedType;
    const typeField = block.querySelector('[data-aue-prop="carouselType"]');
    const typeRow = getTopLevelRow(typeField, block);
    if (typeRow) {
      typeRow.remove();
      const index = rows.indexOf(typeRow);
      if (index >= 0) rows.splice(index, 1);
    }
  }

  const namedMotion = readNamedConfig(block, 'motionType');
  if (namedMotion) {
    config.motion = namedMotion;
    const motionField = block.querySelector('[data-aue-prop="motionType"]');
    const motionRow = getTopLevelRow(motionField, block);
    if (motionRow) {
      motionRow.remove();
      const index = rows.indexOf(motionRow);
      if (index >= 0) rows.splice(index, 1);
    }
  }

  if (!config.type) {
    const labeledType = normalizeConfigValue(readLabeledConfig(rows, 'carouselType') || readLabeledConfig(rows, 'carousel type'));
    if (CAROUSEL_TYPES[labeledType]) {
      config.type = labeledType;
    }
  }

  if (!config.motion) {
    config.motion = readLabeledConfig(rows, 'motionType') || readLabeledConfig(rows, 'motion type') || '';
  }

  if (rows.length && isConfigRow(rows[0])) {
    const value = normalizeConfigValue(rows[0].textContent);
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

function isSlideRow(row) {
  const columns = Array.from(row.querySelectorAll(':scope > div'));
  if (!columns.length) return false;

  if (columns.length >= 2) {
    const key = normalizeConfigValue(columns[0].textContent).replace(/[^a-z0-9]/g, '');
    if (['carouseltype', 'motiontype'].includes(key)) {
      return false;
    }
  }

  const rowText = row.textContent.trim().toLowerCase();
  const isTypeRow = Object.keys(CAROUSEL_TYPES).includes(rowText);
  if (isTypeRow) return false;

  const hasRenderableContent = columns.some((column) => column.querySelector(
    'picture, img, a, h1, h2, h3, h4, h5, h6, [data-aue-prop], div[class]',
  ));

  if (hasRenderableContent) return true;

  const hasMeaningfulText = columns.some((column) => column.textContent.trim().length > 0);
  return hasMeaningfulText && columns.length > 1;
}

function startAutoplay(block) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let paused = false;
  ['mouseenter', 'focusin'].forEach((evt) => block.addEventListener(evt, () => { paused = true; }));
  ['mouseleave', 'focusout'].forEach((evt) => block.addEventListener(evt, () => { paused = false; }));
  setInterval(() => {
    if (paused || document.hidden) return;
    const active = Number.parseInt(block.dataset.activeSlide, 10) || 0;
    showSlide(block, active + 1);
  }, AUTOPLAY_INTERVAL);
}

function isLegacyHero2Row(row) {
  const heroFields = [
    'heroImageType',
    'heroLottoImagePath',
    'heroImage',
    'heroIcon',
    'icon',
    'eyebrowText',
    'eyebrow',
    'ctaTitle',
  ];

  const hasNamedHeroField = heroFields.some(
    (field) => row.querySelector(`[data-aue-prop="${field}"]`),
  );
  if (hasNamedHeroField) return true;

  const columns = Array.from(row.querySelectorAll(':scope > div'));
  const hasMedia = columns.some((column) => column.querySelector('picture, img'));
  return columns.length >= 8 && hasMedia;
}

function getNestedBlocks(column) {
  return Array.from(column.querySelectorAll(':scope > div[class]'));
}

function createLegacyHero2Block(row) {
  const heroBlock = document.createElement('div');
  heroBlock.className = 'hero-2';

  Array.from(row.children).forEach((cell) => heroBlock.append(cell));
  return heroBlock;
}

function createSlide(row, slideIndex, carouselId, pendingBlocks) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  if (isLegacyHero2Row(row)) {
    const content = document.createElement('div');
    content.className = 'carousel-slide-content carousel-slide-content-block';

    const heroBlock = createLegacyHero2Block(row);
    content.append(heroBlock);
    slide.append(content);
    pendingBlocks.push(heroBlock);
    return slide;
  }

  const columns = Array.from(row.querySelectorAll(':scope > div'));

  if (columns.length > 0) {
    columns.forEach((column, colIdx) => {
      const nestedBlocks = getNestedBlocks(column);
      if (nestedBlocks.length) {
        column.classList.add('carousel-slide-content', 'carousel-slide-content-block');
        nestedBlocks.forEach((nestedBlock) => pendingBlocks.push(nestedBlock));
        slide.append(column);
        return;
      }

      const isImage = colIdx === 0;
      column.classList.add(`carousel-slide-${isImage ? 'image' : 'content'}`);

      if (!isImage) {
        const allElements = column.querySelectorAll('*');
        allElements.forEach((el) => {
          const text = el.textContent.trim().toLowerCase();

          // Standard Horizontal Alignment
          if (text === 'left' || text === 'center' || text === 'right') {
            column.setAttribute('data-align', text);
            slide.setAttribute('data-align', text);
            el.remove();
          }

          // Standard Vertical Alignment
          if (text === 'top' || text === 'middle' || text === 'bottom') {
            column.setAttribute('data-valign', text);
            el.remove();
          }
        });
      }

      slide.append(column);
    });
  }

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

  // Extract Carousel parent properties if present
  const config = extractConfig(block, rows);
  const slideRows = rows.filter((row) => isSlideRow(row));
  let carouselType = config.type || block.getAttribute('data-carousel-type') || 'slider';
  if (!CAROUSEL_TYPES[carouselType]) carouselType = 'slider';
  block.setAttribute('data-carousel-type', carouselType);
  const typeConfig = CAROUSEL_TYPES[carouselType];

  const motionType = config.motion || block.getAttribute('data-motion-type');
  if (motionType) block.setAttribute('data-motion', motionType);

  const isSingleSlide = slideRows.length < 2;

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
  const pendingBlocks = [];
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

  slideRows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId, pendingBlocks);
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

  const uniqueNestedBlocks = [...new Set(pendingBlocks)];
  uniqueNestedBlocks.forEach((nestedBlock) => decorateBlock(nestedBlock));
  await Promise.all(uniqueNestedBlocks.map((nestedBlock) => loadBlock(nestedBlock)));

  if (!isSingleSlide) {
    updateActiveSlide(slidesWrapper.querySelector('.carousel-slide'));
    bindEvents(block);
    if (typeConfig.autoplay && !document.documentElement.classList.contains('adobe-ue-edit')) {
      startAutoplay(block);
    }
  }
}
