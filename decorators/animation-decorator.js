/**
 * Animation decorator: plays Lottie animations (the "Lotto" image type of hero, teaser, ...)
 * the same way in every block. The player (utils/lottie.js) loads when the animation comes
 * near the viewport and the browser is idle; the animation pauses off screen and shows its
 * first frame for reduced motion. A looping animation has a pause / play button (WCAG 2.2.2),
 * exposed as element.animationToggle for the block to place where it can be reached.
 */
import { decorateButton } from './button-decorator.js';
import { createIconButton } from './icon-button-decorator.js';
import { prefersReducedMotion } from '../utils/environment.js';
import { loadLottie } from '../utils/lottie.js';
import { getPlaceholders } from '../utils/placeholders.js';
import { onVisible, watchVisibility } from '../utils/viewport.js';

/**
 * Plays a Lottie animation in a container, after the page has rendered.
 * @param {Element} container
 * @param {string} path the animation file (.json)
 * @param {string} [fit] preserveAspectRatio: xMidYMid meet (contain) or slice (cover)
 * @param {{ paused: boolean, instance?: Object }} [state] shared with the pause / play button
 */
export function playAnimation(container, path, fit = 'xMidYMid meet', state = { paused: prefersReducedMotion() }) {
  const start = async () => {
    const lottie = await loadLottie();
    const animation = lottie.loadAnimation({
      container,
      path,
      renderer: 'svg',
      loop: true,
      autoplay: !state.paused,
      rendererSettings: { preserveAspectRatio: fit },
    });
    state.instance = animation;
    if (state.paused) animation.addEventListener('DOMLoaded', () => animation.goToAndStop(0, true));
    watchVisibility(container, (visible) => {
      if (visible && !state.paused) animation.play();
      else animation.pause();
    });
  };

  onVisible(container, () => {
    const idle = window.requestIdleCallback || ((callback) => setTimeout(callback, 200));
    idle(() => start().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('failed to play the Lottie animation', error);
    }));
  }, { rootMargin: '200px' });
}

/** the pause / play button of an animation (labels from the placeholders) */
function createToggle(state) {
  let t = (key, fallback) => fallback;
  const button = createIconButton({
    label: 'Pause animation', icon: 'pause', type: 'secondary', className: 'animation-toggle',
  });
  button.dataset.cmpInteraction = 'animation';
  const update = () => {
    const label = state.paused ? t('playAnimation', 'Play animation') : t('pauseAnimation', 'Pause animation');
    button.setAttribute('aria-label', label);
    decorateButton(button, {
      view: 'icon', type: 'secondary', icon: state.paused ? 'play' : 'pause', title: label,
    });
  };
  button.addEventListener('click', () => {
    state.paused = !state.paused;
    if (state.instance) {
      if (state.paused) state.instance.pause();
      else state.instance.play();
    }
    update();
  });
  update();
  getPlaceholders().then((placeholders) => {
    t = placeholders;
    update();
  }).catch(() => {});
  return button;
}

/**
 * An element playing a Lottie animation: an image named by the label, or decorative.
 * @param {string} path the animation file (.json)
 * @param {{ label?: string, className?: string, fit?: string, controls?: boolean }} [options]
 *   controls: the pause / play button (default), as element.animationToggle
 * @returns {HTMLDivElement}
 */
export function createAnimation(path, {
  label = '', className = '', fit, controls = true,
} = {}) {
  const animation = document.createElement('div');
  animation.className = className;
  if (label) {
    animation.setAttribute('role', 'img');
    animation.setAttribute('aria-label', label);
  } else {
    animation.setAttribute('aria-hidden', 'true');
  }
  const state = { paused: prefersReducedMotion() };
  playAnimation(animation, path, fit, state);
  if (controls) animation.animationToggle = createToggle(state);
  return animation;
}
