import { moveInstrumentation } from '../../scripts/scripts.js';
import fetchPlaceholders from '../../scripts/placeholders.js';
import showSlide from '../../scripts/carousel-support.js';
import { createOptimizedPicture } from '../../scripts/aem.js';

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

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

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

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

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    const isImage = colIdx === 0;
    column.classList.add(`carousel-slide-${isImage ? 'image' : 'content'}`);

    if (!isImage) {
      const allElements = column.querySelectorAll('*');
      allElements.forEach((el) => {
        const text = el.textContent.trim().toLowerCase();

        if (text === 'left' || text === 'center' || text === 'right') {
          column.setAttribute('data-align', text);
          el.remove();
        }

        if (text === 'top' || text === 'middle' || text === 'bottom') {
          column.setAttribute('data-valign', text);
          el.remove();
        }
      });
    }

    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

function getFieldCell(row, fieldName) {
  const fieldElement = row.querySelector(`[data-aue-prop="${fieldName}"]`);
  if (fieldElement) return fieldElement;

  const targetName = normalize(fieldName);
  const labeledRow = [...row.children].find((child) => {
    const columns = [...child.children];
    if (columns.length < 2) return false;
    return normalize(columns[0].textContent) === targetName;
  });
  if (labeledRow?.children[1]) return labeledRow.children[1];

  return null;
}

function getFieldText(row, fieldName) {
  const cell = getFieldCell(row, fieldName);
  if (!cell) return '';
  return cell.textContent.trim();
}

function getFieldImage(row, fieldName) {
  const cell = getFieldCell(row, fieldName);
  if (!cell) return null;
  return cell.querySelector('img');
}

function getFieldLink(row, fieldName) {
  const cell = getFieldCell(row, fieldName);
  if (!cell) return null;
  const link = cell.querySelector('a[href]');
  if (link?.href) return link.href;
  const raw = cell.textContent.trim();
  return raw.startsWith('/') || raw.startsWith('http') ? raw : '';
}

function getFieldRichText(row, fieldName) {
  const cell = getFieldCell(row, fieldName);
  if (!cell) return '';
  return cell.innerHTML;
}

function isHeroSlide(row) {
  if (row.querySelector('[data-aue-prop="heroLottoImagePath"]')) return true;
  if (row.querySelector('[data-aue-prop="eyebrowText"]')) return true;
  return !!getFieldCell(row, 'heroLottoImagePath');
}

function createHeroSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide', 'carousel-slide-hero');

  const heroBackgroundImage = getFieldImage(row, 'heroLottoImagePath');
  if (heroBackgroundImage?.src) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'carousel-slide-image';
    const image = createOptimizedPicture(
      heroBackgroundImage.src,
      getFieldText(row, 'heroImageAlt') || heroBackgroundImage.alt || '',
      false,
      [{ width: '2000' }],
    );
    imageWrap.append(image);
    slide.append(imageWrap);
  }

  const content = document.createElement('div');
  content.className = 'carousel-slide-content carousel-hero-content';
  content.dataset.align = 'center';

  const verticalAlign = getFieldText(row, 'alignment').toLowerCase();
  content.dataset.valign = ['top', 'middle', 'bottom'].includes(verticalAlign)
    ? verticalAlign
    : 'middle';

  const heroIcon = getFieldImage(row, 'heroIcon');
  if (heroIcon?.src) {
    const icon = createOptimizedPicture(
      heroIcon.src,
      getFieldText(row, 'heroIconAlt') || heroIcon.alt || '',
      false,
      [{ width: '128' }],
    );
    icon.className = 'carousel-hero-icon';
    content.append(icon);
  }

  const eyebrow = getFieldText(row, 'eyebrowText');
  if (eyebrow) {
    const eyebrowElement = document.createElement('p');
    eyebrowElement.className = 'carousel-hero-eyebrow';
    eyebrowElement.textContent = eyebrow;
    content.append(eyebrowElement);
  }

  const title = getFieldText(row, 'title');
  if (title) {
    const titleElement = document.createElement('h2');
    titleElement.className = 'carousel-hero-title';
    titleElement.textContent = title;
    content.append(titleElement);
  }

  const description = getFieldRichText(row, 'description');
  if (description) {
    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'carousel-hero-description';
    descriptionElement.innerHTML = description;
    content.append(descriptionElement);
  }

  const ctaTitle = getFieldText(row, 'ctaTitle');
  if (ctaTitle) {
    const ctaLink = getFieldLink(row, 'ctaLink');
    const cta = document.createElement(ctaLink ? 'a' : 'span');
    cta.className = 'carousel-hero-cta';
    if (ctaLink) {
      cta.href = ctaLink;
      if (getFieldText(row, 'ctaLinkType') === 'new-window') {
        cta.target = '_blank';
        cta.rel = 'noopener noreferrer';
      }
    }

    const label = document.createElement('span');
    label.textContent = ctaTitle;

    const arrow = document.createElement('span');
    arrow.className = 'carousel-hero-cta-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';

    cta.append(label, arrow);
    content.append(cta);
  }

  slide.append(content);

  const labeledBy = content.querySelector('h1, h2, h3, h4, h5, h6');
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
  const rows = block.querySelectorAll(':scope > div');
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
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute(
      'aria-label',
      placeholders.carouselSlideControls || 'Carousel Slide Controls',
    );
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class="slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
    `;

    container.append(slideNavButtons);
  }

  rows.forEach((row, idx) => {
    const slide = isHeroSlide(row)
      ? createHeroSlide(row, idx, carouselId)
      : createSlide(row, idx, carouselId);
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
    bindEvents(block);
  }
}
