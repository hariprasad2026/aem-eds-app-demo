import { moveInstrumentation } from '../../scripts/scripts.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';
import showSlide from '../../scripts/carousel-support.js';
import { extractZipImages, getExtension } from '../hero-banner/hero-banner.js';

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
    showSlide(block, active + 1);
  }, AUTOPLAY_INTERVAL);
}

const HORIZONTAL_ALIGNMENTS = ['left', 'center', 'right'];
const VERTICAL_ALIGNMENTS = ['top', 'middle', 'bottom'];

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

// Hero banner slide cells, in model order (the icon alt text is collapsed into the icon image).
const HERO_FIELDS = [
  'icon',
  'heroImageType',
  'heroLottoImagePath',
  'heroImageAlt',
  'heroView',
  'eyebrow',
  'title',
  'description',
  'ctaTitle',
  'ctaLink',
  'ctaLinkType',
  'ctaView',
  'alignment',
  'bgColor',
  'motionType',
];

function isHeroRow(row, columns) {
  return row.dataset.aueModel === 'hero-banner-item' || columns.length > 2;
}

function getHeroFields(columns) {
  const fields = {};
  columns.forEach((column, idx) => {
    const name = column.dataset.aueProp
      || column.querySelector('[data-aue-prop]')?.dataset.aueProp
      || HERO_FIELDS[idx];
    if (name) fields[name] = column;
  });
  return fields;
}

function getAssetUrl(cell) {
  if (!cell) return '';
  const node = cell.querySelector('img[src], a[href]');
  if (node) return node.getAttribute(node.tagName === 'A' ? 'href' : 'src') || '';
  return cell.textContent.trim();
}

function isSafeUrl(url) {
  try {
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(url, window.location.href).protocol);
  } catch (e) {
    return false;
  }
}

async function renderHeroBackground(container, url, alt) {
  try {
    const urls = getExtension(url) === 'zip' ? await extractZipImages(url) : [url];
    urls.forEach((src) => {
      const img = document.createElement('img');
      img.className = 'hero-bg-layer';
      img.src = src;
      img.alt = urls.length === 1 ? alt : '';
      if (urls.length > 1) img.setAttribute('aria-hidden', 'true');
      container.append(img);
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('carousel: failed to render hero slide background', e);
  }
}

function createHeroSlideContent(slide, columns) {
  const fields = getHeroFields(columns);
  const text = (name) => fields[name]?.textContent.trim() || '';

  const image = document.createElement('div');
  image.className = 'carousel-slide-image';
  const backgroundUrl = getAssetUrl(fields.heroLottoImagePath);
  if (backgroundUrl) renderHeroBackground(image, backgroundUrl, text('heroImageAlt'));

  const content = document.createElement('div');
  content.className = 'carousel-slide-content hero-slide-content';

  const iconImg = fields.icon?.querySelector('img');
  if (iconImg) {
    const icon = document.createElement('img');
    icon.className = 'hero-icon';
    icon.src = iconImg.getAttribute('src');
    icon.alt = iconImg.getAttribute('alt') || '';
    content.append(icon);
  }

  if (text('eyebrow')) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'hero-eyebrow';
    eyebrow.textContent = text('eyebrow');
    content.append(eyebrow);
  }

  if (text('title')) {
    const title = document.createElement('h2');
    title.className = 'hero-title';
    title.textContent = text('title');
    content.append(title);
  }

  if (fields.description && text('description')) {
    const description = document.createElement('div');
    description.className = 'hero-description';
    description.append(...fields.description.childNodes);
    content.append(description);
  }

  const ctaUrl = getAssetUrl(fields.ctaLink);
  if (text('ctaTitle') && ctaUrl && isSafeUrl(ctaUrl)) {
    const cta = document.createElement('a');
    cta.className = 'hero-cta';
    cta.href = ctaUrl;
    cta.textContent = text('ctaTitle');
    cta.classList.add(`button-${text('ctaLinkType') === 'secondary' ? 'secondary' : 'primary'}`);
    if (text('ctaView') === 'link') cta.classList.add('hero-cta-link');
    content.append(cta);
  }

  const alignment = text('alignment').toLowerCase();
  if (HORIZONTAL_ALIGNMENTS.includes(alignment)) {
    content.dataset.align = alignment;
    slide.dataset.align = alignment;
  }
  if (text('bgColor')) slide.dataset.bg = text('bgColor').toLowerCase();
  if (text('motionType')) slide.dataset.motion = text('motionType');

  slide.classList.add('carousel-slide-hero');
  slide.append(image, content);
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  const columns = Array.from(row.querySelectorAll(':scope > div'));

  if (isHeroRow(row, columns)) {
    createHeroSlideContent(slide, columns);
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
    updateActiveSlide(slidesWrapper.querySelector('.carousel-slide'));
    bindEvents(block);
    const autoplay = typeConfig.autoplay || /autoplay/i.test(motionType || '');
    if (autoplay && !document.documentElement.classList.contains('adobe-ue-edit')) {
      startAutoplay(block);
    }
  }
}
