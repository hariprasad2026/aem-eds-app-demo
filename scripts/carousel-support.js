export default function showSlide(block, nextIndex) {
  const slides = block.querySelectorAll('.carousel-slide');
  if (!slides.length) {
    return;
  }

  const safeIndex = Math.max(0, Math.min(nextIndex, slides.length - 1));
  block.dataset.activeSlide = String(safeIndex);
  const activeSlide = slides[safeIndex];
  const slidesWrapper = activeSlide.parentElement;
  const wrapperRect = slidesWrapper.getBoundingClientRect();
  const slideRect = activeSlide.getBoundingClientRect();
  const scrollLeft = slidesWrapper.scrollLeft + slideRect.left - wrapperRect.left;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  slidesWrapper.scrollTo({
    left: scrollLeft,
    behavior: reducedMotion ? 'instant' : 'smooth',
  });

  slides.forEach((slide, index) => {
    const isActive = index === safeIndex;
    slide.setAttribute('aria-hidden', String(!isActive));
    slide.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((control) => {
      if (isActive) {
        control.removeAttribute('tabindex');
      } else {
        control.setAttribute('tabindex', '-1');
      }
    });
  });

  block.querySelectorAll('.carousel-slide-indicator button').forEach((button, index) => {
    const isActive = index === safeIndex;
    button.disabled = isActive;
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}
