export default function showSlide(block, nextIndex) {
  const slides = block.querySelectorAll('.carousel-slide');
  if (!slides.length) {
    return;
  }

  const safeIndex = Math.max(0, Math.min(nextIndex, slides.length - 1));
  block.dataset.activeSlide = String(safeIndex);

  slides.forEach((slide, index) => {
    const isActive = index === safeIndex;
    slide.setAttribute('aria-hidden', String(!isActive));
    slide.hidden = !isActive;
  });

  block.querySelectorAll('.carousel-slide-indicator button').forEach((button, index) => {
    const isActive = index === safeIndex;
    button.disabled = isActive;
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}
