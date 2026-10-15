import { pushComponents } from '../../utils/analytics.js';
import { isEditing, prefersReducedMotion } from '../../utils/environment.js';
import { uniqueId } from '../../utils/ids.js';
import { getPlaceholders } from '../../utils/placeholders.js';
import { readProperties, textOf } from '../../utils/properties.js';
import {
  classesOf, decorationsOf, hasRule, normalizeConfig, validateConfig, analyticsEntry,
} from './separator-config.js';

/*
 * Separator (blocks/separator/_separator.json): the AEM Core Components Separator for Edge
 * Delivery Services. One native <hr> (semantic: a thematic break; decorative: aria-hidden), with
 * the variant, theme, line, width, alignment, decorations, spacing and per-breakpoint settings
 * as block classes (./separator-config.js); CSS does all of the layout and responsive behaviour
 * (media queries), so the script only reads the settings once. Optional: decorations, an
 * animation on view, the Adobe Data Layer, and an editor placeholder when hidden everywhere.
 */

const debug = (...args) => {
  if (/[?&]debug=separator\b/.test(window.location.search)) console.debug('[separator]', ...args); // eslint-disable-line no-console
};

/** the authored properties: key-value rows (other rows, e.g. an authored <hr>, are ignored) */
export function readBlockConfig(block) {
  const raw = {};
  Object.entries(readProperties(block)).forEach(([key, cell]) => {
    raw[key] = textOf(cell);
  });
  return raw;
}

/** the separator's id: the authored one (suffixed when taken), else a generated one */
function idOf(config, block) {
  // the Component ID, else the Anchor ID (Additional tab), else generated
  if (!config.componentId) return block.id || uniqueId('separator');
  if (!document.getElementById(config.componentId)) return config.componentId;
  debug(`component id "${config.componentId}" is used twice`);
  return `${config.componentId}-${uniqueId('dup').split('-').pop()}`;
}

/** one <hr>: an authored one when there is one, else a new one */
function ruleOf(block) {
  const hr = block.querySelector('hr') || document.createElement('hr');
  hr.className = 'separator-rule';
  [...hr.attributes].filter((a) => !['class'].includes(a.name)).forEach((a) => hr.removeAttribute(a.name));
  return hr;
}

/** semantic: a native thematic break (an optional name); decorative: hidden from assistive tech */
function applyAccessibilityMode(line, rule, config) {
  if (config.mode === 'semantic') {
    if (config.accessibleLabel) rule.setAttribute('aria-label', config.accessibleLabel);
  } else {
    line.setAttribute('aria-hidden', 'true');
  }
}

/** start / center / end shapes, visual only */
function renderDecorations(line, config) {
  decorationsOf(config).forEach(([position, shape]) => {
    const span = document.createElement('span');
    span.className = `separator-decoration separator-decoration-${position} separator-decoration-${shape}`;
    span.setAttribute('aria-hidden', 'true');
    line.append(span);
  });
}

/** draws or fades the line in once when it scrolls into view (never hides it otherwise) */
function initializeAnimation(block, config) {
  if (config.animation === 'none') return;
  const reduced = prefersReducedMotion();
  if ((reduced && config.motionFallback === 'static') || typeof IntersectionObserver === 'undefined') return;
  try {
    block.classList.add('animate-ready');
    if (reduced) block.classList.add('reduced-motion');
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      block.classList.add('is-visible');
      observer.disconnect();
    }, { threshold: 0.1 });
    observer.observe(block);
  } catch {
    block.classList.remove('animate-ready');
  }
}

/** the separator in the Adobe Data Layer (state only: a separator has no interactions) */
function initializeAnalytics(block, config, id) {
  block.dataset.analytics = config.analytics ? 'custom' : 'off';
  if (!config.analytics) return;
  try {
    pushComponents(analyticsEntry(config, id));
  } catch {
    // analytics never affects rendering
  }
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  if (block.dataset.separatorReady) return;
  block.dataset.separatorReady = 'true';

  const config = normalizeConfig(readBlockConfig(block));
  const warnings = validateConfig(config);
  debug(config, warnings);
  const id = idOf(config, block);
  block.id = id;
  block.classList.add(...classesOf(config));

  const parts = [];
  if (hasRule(config)) {
    const line = document.createElement('div');
    line.className = 'separator-line';
    const rule = ruleOf(block);
    line.append(rule);
    renderDecorations(line, config);
    applyAccessibilityMode(line, rule, config);
    parts.push(line);
  }

  // hidden on every breakpoint: nothing on the page; a placeholder to select it in the editor
  if (isEditing() && warnings.length) {
    const t = await getPlaceholders();
    const messages = {
      'hidden-everywhere': t('separatorHidden', 'Separator hidden on all devices'),
      'invisible-semantic': t('separatorInvisible', 'Semantic separator without a line: screen readers announce a break nobody sees'),
    };
    const note = document.createElement('p');
    note.className = 'separator-editor-note';
    note.textContent = warnings.map((code) => messages[code]).join('. ');
    parts.push(note);
  }

  block.replaceChildren(...parts);
  initializeAnimation(block, config);
  initializeAnalytics(block, config, id);
}
