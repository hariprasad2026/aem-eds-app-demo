import { decorateButton } from '../../decorators/button-decorator.js';
import { createIconButton } from '../../decorators/icon-button-decorator.js';
import { pushComponentEvent } from '../../utils/analytics.js';
import { isEditing, prefersReducedMotion, scrollBehavior } from '../../utils/environment.js';
import { watchVisibility } from '../../utils/viewport.js';
import { uniqueId } from '../../utils/ids.js';
import { getPlaceholders } from '../../utils/placeholders.js';

/*
 * Gen Carousel: built by scripts.js from a Gen Carousel section. Every child of the block is a
 * slide, whatever it contains (a Hero, a Teaser or any other block the section allows), so the
 * carousel never depends on the markup of its slides.
 */

/* Navigation block options: manual | auto | manual-auto */
const NAVIGATION_MODES = ['manual', 'auto', 'manual-auto'];
const DEFAULT_INTERVAL = 5; // seconds
const MIN_INTERVAL = 2; // seconds

function readNavigation(block) {
  const mode = NAVIGATION_MODES.find((name) => block.classList.contains(name)) || 'manual';
  return { manual: mode !== 'auto', auto: mode !== 'manual' };
}

/** @returns {number} the autoplay interval in milliseconds */
function readInterval(block) {
  const seconds = Number(block.dataset.interval) || DEFAULT_INTERVAL;
  return Math.max(MIN_INTERVAL, seconds) * 1000;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const t = await getPlaceholders();
  const id = uniqueId('gen-carousel');
  const nav = readNavigation(block);
  const interval = readInterval(block);

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', t('carouselRole', 'carousel'));
  if (!block.hasAttribute('aria-label')) block.setAttribute('aria-label', t('carousel', 'Carousel'));

  // slides are groups (WAI-ARIA carousel pattern), so the track isn't a list
  const track = document.createElement('div');
  track.className = 'gen-carousel-slides';
  track.id = `${id}-slides`;
  track.setAttribute('aria-live', 'polite');

  const contents = [...block.children];
  const slides = contents.map((content, i) => {
    const slide = document.createElement('div');
    slide.className = 'gen-carousel-slide';
    slide.id = `${id}-slide-${i + 1}`;
    slide.dataset.cmpId = slide.id;
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', t('slideRole', 'slide'));
    slide.setAttribute('aria-label', t('slideOf', '{n} of {total}', { n: i + 1, total: contents.length }));
    slide.append(content);
    track.append(slide);
    return slide;
  });
  block.replaceChildren(track);

  if (slides.length < 2) {
    slides[0]?.classList.add('gen-carousel-slide-active');
    return;
  }

  let current = 0;
  const controls = document.createElement('div');
  controls.className = 'gen-carousel-controls';

  const dots = document.createElement('ul');
  dots.className = 'gen-carousel-dots';
  const dotButtons = slides.map((slide, i) => {
    const li = document.createElement('li');
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'gen-carousel-dot';
    dot.setAttribute('aria-label', t('showSlide', 'Show slide {n} of {total}', { n: i + 1, total: slides.length }));
    dot.setAttribute('aria-controls', slide.id);
    li.append(dot);
    dots.append(li);
    return dot;
  });

  const setCurrent = (index) => {
    // a change of slide in the data layer (not the first slide on load)
    if (index !== current && slides[index]) {
      pushComponentEvent('cmp:show', slides[index].dataset.cmpId, { position: index + 1 });
    }
    current = index;
    const editing = isEditing();
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('gen-carousel-slide-active', active);
      // keep keyboard focus out of slides that are scrolled out of view
      slide.inert = !active && !editing;
    });
    dotButtons.forEach((dot, i) => dot.setAttribute('aria-current', i === index ? 'true' : 'false'));
  };

  const goTo = (index) => {
    const i = (index + slides.length) % slides.length;
    track.scrollTo({ left: slides[i].offsetLeft, behavior: scrollBehavior() });
    setCurrent(i);
  };

  // autoplay: runs for Auto and Manual and Auto, pauses while the pointer is over the
  // slides, while keyboard focus is inside, off screen, in a hidden tab and in the editor
  let timer;
  let userPaused = !nav.auto || prefersReducedMotion();
  let hovered = false;
  let focused = false;
  let onScreen = true;
  let toggle;

  const playing = () => nav.auto && !userPaused;
  const stop = () => {
    clearTimeout(timer);
    timer = null;
  };
  const schedule = () => {
    stop();
    if (!playing() || hovered || focused || !onScreen || document.hidden) return;
    if (isEditing() || !block.isConnected) return;
    timer = setTimeout(() => {
      if (!block.isConnected) return;
      goTo(current + 1);
      schedule();
    }, interval);
  };

  const updateToggle = () => {
    const label = playing() ? t('pauseSlides', 'Pause slides') : t('playSlides', 'Play slides');
    toggle.setAttribute('aria-label', label);
    decorateButton(toggle, {
      view: 'icon', type: 'secondary', icon: playing() ? 'pause' : 'play', title: label,
    });
    // announce slide changes only when they are made by the user
    track.setAttribute('aria-live', playing() ? 'off' : 'polite');
  };

  if (nav.auto) {
    toggle = createIconButton({ className: 'gen-carousel-toggle', label: t('pauseSlides', 'Pause slides'), icon: 'pause' });
    toggle.dataset.cmpInteraction = 'pause';
    toggle.setAttribute('aria-controls', track.id);
    toggle.addEventListener('click', () => {
      userPaused = !userPaused;
      updateToggle();
      schedule();
    });
    controls.append(toggle);
    updateToggle();
  }

  if (nav.manual) {
    const prev = createIconButton({ className: 'gen-carousel-prev', label: t('previousSlide', 'Previous slide'), icon: 'chevron-left' });
    const next = createIconButton({ className: 'gen-carousel-next', label: t('nextSlide', 'Next slide'), icon: 'chevron-right' });
    prev.dataset.cmpInteraction = 'previous';
    next.dataset.cmpInteraction = 'next';
    prev.setAttribute('aria-controls', track.id);
    next.setAttribute('aria-controls', track.id);
    prev.addEventListener('click', () => { goTo(current - 1); schedule(); });
    next.addEventListener('click', () => { goTo(current + 1); schedule(); });
    controls.append(prev, dots, next);

    block.addEventListener('keydown', (e) => {
      // the arrow keys belong to the controls; widgets inside slides keep theirs
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key) || !e.target.closest('.gen-carousel-controls')) return;
      e.preventDefault();
      goTo(current + (e.key === 'ArrowLeft' ? -1 : 1));
      dotButtons[current].focus({ preventScroll: true });
    });
  } else {
    controls.append(dots);
  }
  block.append(controls);

  dotButtons.forEach((dot, i) => dot.addEventListener('click', () => {
    goTo(i);
    schedule();
  }));

  // follow swipes and scrolling: the slide that is mostly in view is the current one
  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setCurrent(slides.indexOf(entry.target));
    });
  }, { root: track, threshold: 0.6 });
  slides.forEach((slide) => slideObserver.observe(slide));

  watchVisibility(block, (visible) => {
    onScreen = visible;
    schedule();
  }, { threshold: 0.25 });

  track.addEventListener('pointerenter', () => { hovered = true; stop(); });
  track.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  block.addEventListener('focusin', (e) => {
    // pointer clicks on controls and the pause / play button don't pause the rotation
    focused = e.target !== toggle && e.target.matches(':focus-visible');
    schedule();
  });
  block.addEventListener('focusout', (e) => {
    if (block.contains(e.relatedTarget)) return;
    focused = false;
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);

  // Universal Editor: show the slide of the component selected in the editor
  block.addEventListener('aue:ui-select', (e) => {
    if (!e.detail?.selected) return;
    const index = slides.findIndex((slide) => slide.contains(e.target));
    if (index >= 0) goTo(index);
  });

  setCurrent(0);
  schedule();
}
