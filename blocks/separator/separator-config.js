/**
 * Separator configuration: the authored properties (lower-case keys, text values) normalized into
 * a safe configuration and the block classes that style it (no DOM; unit tested in
 * test/separator). Every value comes from a controlled list, so no authored text ever becomes a
 * class name, style or markup; unknown values fall back to the defaults.
 */

export const BREAKPOINTS = ['desktop', 'tablet', 'mobile'];
export const MODES = ['decorative', 'semantic'];
export const VARIANTS = ['default', 'subtle', 'strong', 'inset', 'full-width', 'dotted', 'dashed',
  'gradient', 'branded', 'custom-design'];
export const THEMES = ['auto', 'light', 'dark', 'brand'];
export const LINE_STYLES = ['solid', 'dashed', 'dotted', 'gradient', 'none'];
export const THICKNESSES = ['thin', 'medium', 'thick'];
export const COLORS = ['default', 'subtle', 'neutral', 'strong', 'primary', 'secondary', 'accent',
  'inverse'];
export const OPACITIES = ['25', '50', '75', '100'];
export const WIDTHS = ['auto', '25-percent', '50-percent', '75-percent', '100-percent',
  'content-width', 'full-bleed'];
export const MAX_WIDTHS = ['none', 'small', 'medium', 'large', 'extra-large', 'content-container'];
export const ALIGNMENTS = ['start', 'center', 'end'];
export const DECORATIONS = ['none', 'dot', 'square', 'diamond'];
export const CONTRASTS = ['standard', 'high'];
export const SPACINGS = ['default', 'none', '2xs', 'xs', 'small', 'medium', 'large', 'xl', '2xl'];
export const ANIMATIONS = ['none', 'fade', 'draw-from-start', 'draw-from-center'];
export const MOTION_FALLBACKS = ['static', 'fade'];
export const PRINT = ['show', 'hide'];

/**
 * What a variant sets when the matching Appearance field is "As the variant" (empty). An
 * extension point: a Figma variant is a row here and its classes in separator.css.
 */
const preset = (lineStyle, thickness, color, width) => ({
  lineStyle, thickness, color, width,
});
export const VARIANT_PRESETS = {
  default: preset('solid', 'thin', 'default', '100-percent'),
  subtle: preset('solid', 'thin', 'subtle', '100-percent'),
  strong: preset('solid', 'medium', 'strong', '100-percent'),
  inset: preset('solid', 'thin', 'default', '100-percent'),
  'full-width': preset('solid', 'thin', 'default', 'full-bleed'),
  dotted: preset('dotted', 'medium', 'default', '100-percent'),
  dashed: preset('dashed', 'thin', 'default', '100-percent'),
  gradient: preset('gradient', 'medium', 'primary', '100-percent'),
  branded: preset('solid', 'medium', 'primary', '100-percent'),
  'custom-design': preset('solid', 'thin', 'default', '100-percent'),
};

const YES = ['true', 'yes', 'on', '1', 'y'];
const NO = ['false', 'no', 'off', '0', 'n'];
const text = (value) => String(value ?? '').trim();
const key = (value) => text(value).toLowerCase().replace(/[\s_]+/g, '-');

/** an allowed value, or the fallback (also for legacy spellings: "50%", "50 percent") */
export function pick(value, allowed, fallback) {
  let v = key(value);
  if (/^\d+%$/.test(v)) v = `${v.slice(0, -1)}-percent`;
  return allowed.includes(v) ? v : fallback;
}

/** a boolean property: missing or unknown values keep the fallback */
export function flag(value, fallback) {
  const v = key(value);
  if (YES.includes(v)) return true;
  if (NO.includes(v)) return false;
  return fallback;
}

/**
 * A safe HTML id: letters, digits, - and _, starting with a letter; '' when nothing is left.
 * @param {string} value
 */
export function sanitizeComponentId(value) {
  const id = text(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
  if (!id) return '';
  return /^[a-z]/.test(id) ? id : `separator-${id}`;
}

/**
 * Normalizes the authored properties.
 * @param {Object<string, string>} raw property values by lower-case name
 * @returns {Object} the configuration
 */
export function normalizeConfig(raw = {}) {
  const get = (name) => raw[name];
  const variant = pick(get('variant'), VARIANTS, 'default');
  const defaults = VARIANT_PRESETS[variant];
  const asVariant = (name, allowed, presetKey) => pick(get(name), allowed, defaults[presetKey]);
  const thickness = asVariant('linethickness', THICKNESSES, 'thickness');
  const width = asVariant('width', WIDTHS, 'width');
  const alignment = pick(get('alignment'), ALIGNMENTS, 'center');
  const responsive = {};
  BREAKPOINTS.forEach((bp) => {
    responsive[bp] = {
      show: flag(get(`show${bp}`), true),
      width: pick(get(`${bp}width`), ['inherit', ...WIDTHS], 'inherit'),
      thickness: pick(get(`${bp}thickness`), ['inherit', ...THICKNESSES], 'inherit'),
      alignment: pick(get(`${bp}alignment`), ['inherit', ...ALIGNMENTS], 'inherit'),
      top: pick(get(`${bp}topspacing`), SPACINGS, 'default'),
      bottom: pick(get(`${bp}bottomspacing`), SPACINGS, 'default'),
    };
  });
  const mode = pick(get('accessibilitymode'), MODES, 'decorative');
  return {
    componentId: sanitizeComponentId(get('componentid')),
    mode,
    accessibleLabel: mode === 'semantic' ? text(get('accessiblelabel')).slice(0, 120) : '',
    variant,
    theme: pick(get('theme'), THEMES, 'auto'),
    lineStyle: asVariant('linestyle', LINE_STYLES, 'lineStyle'),
    thickness,
    color: asVariant('linecolor', COLORS, 'color'),
    opacity: pick(get('lineopacity'), OPACITIES, '100'),
    width,
    maxWidth: pick(get('maxwidth'), MAX_WIDTHS, 'none'),
    alignment,
    decorations: {
      start: pick(get('startdecoration'), DECORATIONS, 'none'),
      center: pick(get('centerdecoration'), DECORATIONS, 'none'),
      end: pick(get('enddecoration'), DECORATIONS, 'none'),
    },
    contrast: pick(get('contrastmode'), CONTRASTS, 'standard'),
    responsive,
    useSectionPadding: flag(get('usesectionpadding'), false),
    stretch: flag(get('stretchtocontainer'), false),
    respectMaxWidth: flag(get('respectmaxwidth'), true),
    animation: pick(get('animateonview'), ANIMATIONS, 'none'),
    motionFallback: pick(get('reducedmotionfallback'), MOTION_FALLBACKS, 'static'),
    print: pick(get('printvisibility'), PRINT, 'show'),
    analytics: flag(get('analyticsenabled'), false),
    analyticsLabel: text(get('analyticslabel')).slice(0, 120),
  };
}

/**
 * Problems an author can fix (shown in the Universal Editor, never on the published page).
 * @param {Object} config
 * @returns {string[]} warning codes
 */
export function validateConfig(config) {
  const warnings = [];
  if (BREAKPOINTS.every((bp) => !config.responsive[bp].show)) warnings.push('hidden-everywhere');
  if (config.mode === 'semantic' && config.lineStyle === 'none') warnings.push('invisible-semantic');
  return warnings;
}

/** whether anything is drawn: no rule for a decorative separator without a line */
export const hasRule = (config) => config.mode === 'semantic' || config.lineStyle !== 'none';

/** decorations to render (none without a visible line) */
export const decorationsOf = (config) => (config.lineStyle === 'none' ? []
  : Object.entries(config.decorations).filter(([, shape]) => shape !== 'none'));

/**
 * The block classes of a configuration (each from a controlled list).
 * @param {Object} config
 * @returns {string[]}
 */
export function classesOf(config) {
  const classes = [
    config.mode,
    `variant-${config.variant}`,
    `theme-${config.theme}`,
    `line-${config.lineStyle}`,
    `thickness-${config.thickness}`,
    `color-${config.color}`,
    `opacity-${config.opacity}`,
    `width-${config.width}`,
    `max-${config.maxWidth}`,
    `align-${config.alignment}`,
  ];
  if (config.contrast === 'high') classes.push('contrast-high');
  if (config.useSectionPadding) classes.push('section-padding');
  if (config.stretch) classes.push('stretch');
  if (config.respectMaxWidth) classes.push('respect-max');
  if (config.print === 'hide') classes.push('print-hide');
  if (decorationsOf(config).length) classes.push('decorated');
  BREAKPOINTS.forEach((bp) => {
    const r = config.responsive[bp];
    if (!r.show) classes.push(`hide-${bp}`);
    if (r.width !== 'inherit') classes.push(`${bp}-width-${r.width}`);
    if (r.thickness !== 'inherit') classes.push(`${bp}-thickness-${r.thickness}`);
    if (r.alignment !== 'inherit') classes.push(`${bp}-align-${r.alignment}`);
    if (r.top !== 'default') classes.push(`${bp}-top-${r.top}`);
    if (r.bottom !== 'default') classes.push(`${bp}-bottom-${r.bottom}`);
  });
  if (BREAKPOINTS.every((bp) => !config.responsive[bp].show)) classes.push('hidden-all');
  if (config.animation !== 'none') classes.push(`animate-${config.animation}`, `motion-${config.motionFallback}`);
  return classes;
}

/** the data layer entry of a separator (Core Components schema) */
export const analyticsEntry = (config, id) => ({
  [id]: {
    '@type': 'tcs-corp/components/separator',
    'dc:title': config.analyticsLabel || undefined,
    'xdm:variant': config.variant,
    'xdm:accessibilityMode': config.mode,
    'xdm:theme': config.theme,
    'xdm:lineStyle': config.lineStyle,
    'xdm:visibility': BREAKPOINTS.filter((bp) => config.responsive[bp].show).join(',') || 'none',
  },
});
