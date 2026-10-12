import { moveInstrumentation } from '../../scripts/scripts.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';
import showSlide from '../../scripts/carousel-support.js';

const CAROUSEL_TYPES = {
  slider: { controls: true, indicators: true },
  'slides-only': { controls: false, indicators: false, autoplay: true },
  'with-controls': { controls: true, indicators: false },
  'with-indicators': { controls: true, indicators: true },
  'with-captions': { controls: true, indicators: true },
};

function isBlockLikeNode(node) {
  if (!node) return false;

  const blockSelectors = [
    '.block',
    '[data-aue-resource]',
    '[data-block-name]',
    '[data-aue-prop]',
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

  return node.matches?.(blockSelectors.join(', ')) || !!node.querySelector?.(blockSelectors.join(', '));
}

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = Number.parseInt(slide.dataset.slideIndex, 10);
  if (!block || Number.isNaN(slideIndex)) return;

  block.dataset.activeSlide = String(slideIndex);

  const slides = block.querySelectorAll('.carousel-slide');
  slides.forEach((aSlide, idx) => {
    const isActive = idx === slideIndex;
    aSlide.setAttribute('aria-hidden', String(!isActive));
    aSlide.hidden = !isActive;
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

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (slideIndicators) {
    slideIndicators.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', (e) => {
        const slideIndicator = e.currentTarget.parentElement;
        showSlide(block, Number.parseInt(slideIndicator.dataset.targetSlide, 10));
      });
    });
  }

  const prevBtn = block.querySelector('.slide-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      showSlide(block, Number.parseInt(block.dataset.activeSlide, 10) - 1);
    });
  }

  const nextBtn = block.querySelector('.slide-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      showSlide(block, Number.parseInt(block.dataset.activeSlide, 10) + 1);
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

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  const directChildren = Array.from(row.children);
  const nestedBlock = directChildren.find((child) => isBlockLikeNode(child));

  if (nestedBlock) {
    const contentNode = nestedBlock.matches?.('.block, [data-aue-resource], [data-block-name], [data-aue-prop], .hero-banner, .cards, .columns, .content-cards, .accordion, .cta, .fragment, .spotlight, .statistics-list, .teaser-v1, .table, .quote')
      ? nestedBlock
      : nestedBlock.querySelector('.block, [data-aue-resource], [data-block-name], [data-aue-prop], .hero-banner, .cards, .columns, .content-cards, .accordion, .cta, .fragment, .spotlight, .statistics-list, .teaser-v1, .table, .quote');

    if (contentNode) {
      contentNode.classList.add('carousel-slide-item');
      slide.append(contentNode);
      return slide;
    }
  }

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

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
  let carouselType = config.type || block.getAttribute('data-carousel-type') || 'slider';
  if (!CAROUSEL_TYPES[carouselType]) carouselType = 'slider';
  block.setAttribute('data-carousel-type', carouselType);
  const typeConfig = CAROUSEL_TYPES[carouselType];

  const isSingleSlide = rows.length < 2;
  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
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
        <button type="button" class="slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
        <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
      `;
      container.append(slideNavButtons);
    }
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    moveInstrumentation(row, slide);
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
    showSlide(block, 0);
    bindEvents(block);
  }
}
