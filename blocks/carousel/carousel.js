import { moveInstrumentation } from '../../scripts/scripts.js';
<<<<<<< HEAD
import fetchPlaceholders from '../../scripts/placeholders.js';
import showSlide from '../../scripts/carousel-support.js';

=======
import { fetchPlaceholders } from '../../scripts/placeholders.js';
import showSlide from '../../scripts/carousel-support.js';
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;
<<<<<<< HEAD

  const slides = block.querySelectorAll('.carousel-slide');

=======
 
  const slides = block.querySelectorAll('.carousel-slide');
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
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
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
    }
  });
}
<<<<<<< HEAD

export { showSlide };

=======
 
export { showSlide };
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
function getActiveSlideIndex(block) {
  const activeSlide = Number.parseInt(block.dataset.activeSlide, 10);
  return Number.isNaN(activeSlide) ? 0 : activeSlide;
}
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
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
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
  const prevBtn = block.querySelector('.slide-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      showSlide(block, getActiveSlideIndex(block) - 1);
    });
  }
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
  const nextBtn = block.querySelector('.slide-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      showSlide(block, getActiveSlideIndex(block) + 1);
    });
  }
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
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
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');
<<<<<<< HEAD

  const columns = Array.from(row.querySelectorAll(':scope > div'));

=======
 
  const columns = Array.from(row.querySelectorAll(':scope > div'));
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
  if (columns.length > 0) {
    columns.forEach((column, colIdx) => {
      const isImage = colIdx === 0;
      column.classList.add(`carousel-slide-${isImage ? 'image' : 'content'}`);
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
      if (!isImage) {
        const allElements = column.querySelectorAll('*');
        allElements.forEach((el) => {
          const text = el.textContent.trim().toLowerCase();
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
          // Standard Horizontal Alignment
          if (text === 'left' || text === 'center' || text === 'right') {
            column.setAttribute('data-align', text);
            slide.setAttribute('data-align', text);
            el.remove();
          }
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
          // Standard Vertical Alignment
          if (text === 'top' || text === 'middle' || text === 'bottom') {
            column.setAttribute('data-valign', text);
            el.remove();
          }
        });
      }
<<<<<<< HEAD

      slide.append(column);
    });
  }

=======
 
      slide.append(column);
    });
  }
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }
<<<<<<< HEAD

  return slide;
}

=======
 
  return slide;
}
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
<<<<<<< HEAD

  // Extract Carousel parent properties if present
  const carouselType = block.getAttribute('data-carousel-type') || 'slider';
  block.setAttribute('data-carousel-type', carouselType);

  const motionType = block.getAttribute('data-motion-type');
  if (motionType) block.setAttribute('data-motion', motionType);

  const rows = Array.from(block.querySelectorAll(':scope > div'));
  const isSingleSlide = rows.length < 2;

  const placeholders = await fetchPlaceholders();

=======
 
  // Extract Carousel parent properties if present
  const carouselType = block.getAttribute('data-carousel-type') || 'slider';
  block.setAttribute('data-carousel-type', carouselType);
 
  const motionType = block.getAttribute('data-motion-type');
  if (motionType) block.setAttribute('data-motion', motionType);
 
  const rows = Array.from(block.querySelectorAll(':scope > div'));
  const isSingleSlide = rows.length < 2;
 
  const placeholders = await fetchPlaceholders();
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
  block.setAttribute('role', 'region');
  block.setAttribute(
    'aria-roledescription',
    placeholders.carousel || 'Carousel',
  );
<<<<<<< HEAD

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');

=======
 
  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');
 
  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
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
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class="slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
    `;
<<<<<<< HEAD

    container.append(slideNavButtons);
  }

=======
 
    container.append(slideNavButtons);
  }
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    moveInstrumentation(row, slide);
    slidesWrapper.append(slide);
<<<<<<< HEAD

=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });
<<<<<<< HEAD

  container.append(slidesWrapper);
  block.prepend(container);

=======
 
  container.append(slidesWrapper);
  block.prepend(container);
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
  if (!isSingleSlide) {
    updateActiveSlide(slidesWrapper.querySelector('.carousel-slide'));
    bindEvents(block);
  }
}
<<<<<<< HEAD
=======
 
>>>>>>> 36838076e3cfaf3483b3dc37e215a0e9e50db3a4
