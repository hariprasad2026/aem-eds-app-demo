/* Unit tests of the Separator configuration (blocks/separator/separator-config.js): npm test */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALIGNMENTS, COLORS, LINE_STYLES, OPACITIES, THICKNESSES, VARIANTS, WIDTHS, analyticsEntry,
  classesOf, decorationsOf, hasRule, normalizeConfig, pick, sanitizeComponentId, validateConfig,
} from '../../blocks/separator/separator-config.js';

const config = (raw = {}) => normalizeConfig(raw);
const classes = (raw) => classesOf(config(raw));

describe('defaults', () => {
  it('decorative, default variant, auto theme, solid thin full width, centred, visible everywhere', () => {
    const c = config();
    assert.equal(c.mode, 'decorative');
    assert.equal(c.variant, 'default');
    assert.equal(c.theme, 'auto');
    assert.equal(c.lineStyle, 'solid');
    assert.equal(c.thickness, 'thin');
    assert.equal(c.color, 'default');
    assert.equal(c.opacity, '100');
    assert.equal(c.width, '100-percent');
    assert.equal(c.alignment, 'center');
    assert.equal(c.animation, 'none');
    assert.deepEqual(c.decorations, { start: 'none', center: 'none', end: 'none' });
    assert.ok(['desktop', 'tablet', 'mobile'].every((bp) => c.responsive[bp].show));
    assert.deepEqual(classes({}), ['decorative', 'variant-default', 'theme-auto', 'line-solid',
      'thickness-thin', 'color-default', 'opacity-100', 'width-100-percent', 'max-none',
      'align-center', 'respect-max']);
  });
  it('empty block markup: a default separator', () => {
    assert.ok(hasRule(config()));
  });
});

describe('component id', () => {
  it('keeps valid ids, sanitizes invalid ones, empty when nothing is left', () => {
    assert.equal(sanitizeComponentId('Case-Study_Break'), 'case-study_break');
    assert.equal(sanitizeComponentId('break <script>'), 'break-script');
    assert.equal(sanitizeComponentId('2026 break'), 'separator-2026-break');
    assert.equal(sanitizeComponentId('"><img onerror=x>'), 'img-onerror-x');
    assert.equal(sanitizeComponentId('!!!'), '');
    assert.equal(config({ componentid: '' }).componentId, '');
  });
});

describe('accessibility mode', () => {
  it('semantic keeps an accessible label; decorative drops it', () => {
    assert.equal(config({ accessibilitymode: 'semantic', accessiblelabel: 'End of the story' }).accessibleLabel, 'End of the story');
    assert.equal(config({ accessibilitymode: 'decorative', accessiblelabel: 'x' }).accessibleLabel, '');
  });
  it('missing or invalid: decorative', () => {
    assert.equal(config({ accessibilitymode: 'aria' }).mode, 'decorative');
  });
  it('no rule for a decorative separator without a line; a semantic one keeps it', () => {
    assert.equal(hasRule(config({ linestyle: 'none' })), false);
    assert.equal(hasRule(config({ linestyle: 'none', accessibilitymode: 'semantic' })), true);
    assert.deepEqual(validateConfig(config({ linestyle: 'none', accessibilitymode: 'semantic' })), ['invisible-semantic']);
  });
});

describe('variants and line settings', () => {
  VARIANTS.forEach((variant) => {
    it(`variant ${variant}`, () => {
      assert.ok(classes({ variant }).includes(`variant-${variant}`));
    });
  });
  it('variant presets, overridden by the Appearance settings', () => {
    assert.deepEqual(['lineStyle', 'thickness', 'color'].map((k) => config({ variant: 'branded' })[k]), ['solid', 'medium', 'primary']);
    assert.equal(config({ variant: 'dotted' }).lineStyle, 'dotted');
    assert.equal(config({ variant: 'full-width' }).width, 'full-bleed');
    assert.equal(config({ variant: 'branded', linecolor: 'accent' }).color, 'accent');
    assert.equal(config({ variant: 'gradient', linestyle: 'solid' }).lineStyle, 'solid');
  });
  [...THICKNESSES.map((v) => ['linethickness', v, `thickness-${v}`]),
    ...LINE_STYLES.map((v) => ['linestyle', v, `line-${v}`]),
    ...OPACITIES.map((v) => ['lineopacity', v, `opacity-${v}`]),
    ...COLORS.map((v) => ['linecolor', v, `color-${v}`])].forEach(([field, value, cls]) => {
    it(`${field} ${value}`, () => assert.ok(classes({ [field]: value }).includes(cls)));
  });
  it('unknown values fall back and never become classes', () => {
    const c = classes({
      variant: 'neon', linecolor: 'red;}', linethickness: '9px', linestyle: 'wavy', lineopacity: '33', theme: 'x',
    });
    assert.ok(c.includes('variant-default') && c.includes('color-default') && c.includes('thickness-thin'));
    assert.ok(c.includes('line-solid') && c.includes('opacity-100') && c.includes('theme-auto'));
    assert.ok(c.every((name) => /^[a-z0-9-]+$/.test(name)));
  });
});

describe('width and alignment', () => {
  WIDTHS.forEach((width) => {
    ALIGNMENTS.forEach((alignment) => {
      it(`${width} ${alignment}`, () => {
        const c = classes({ width, alignment });
        assert.ok(c.includes(`width-${width}`) && c.includes(`align-${alignment}`));
      });
    });
  });
  it('legacy spellings of widths', () => {
    assert.equal(pick('50%', WIDTHS, '100-percent'), '50-percent');
    assert.equal(pick('75 Percent', WIDTHS, '100-percent'), '75-percent');
    assert.equal(pick('33%', WIDTHS, '100-percent'), '100-percent');
  });
  it('maximum width, stretch and content limit', () => {
    const c = classes({ maxwidth: 'medium', stretchtocontainer: 'true', respectmaxwidth: 'false' });
    assert.ok(c.includes('max-medium') && c.includes('stretch') && !c.includes('respect-max'));
  });
});

describe('responsive', () => {
  const bps = ['desktop', 'tablet', 'mobile'];
  [[1, 1, 1], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [0, 0, 0]].forEach((shown) => {
    it(`visibility desktop/tablet/mobile = ${shown.join('/')}`, () => {
      const raw = {};
      bps.forEach((bp, i) => { raw[`show${bp}`] = shown[i] ? 'true' : 'false'; });
      const c = classes(raw);
      bps.forEach((bp, i) => assert.equal(c.includes(`hide-${bp}`), !shown[i]));
      assert.equal(c.includes('hidden-all'), shown.every((v) => !v));
      assert.equal(validateConfig(config(raw)).includes('hidden-everywhere'), shown.every((v) => !v));
    });
  });
  it('width, thickness, alignment and spacing per breakpoint', () => {
    const c = classes({
      desktopwidth: '50-percent', tabletwidth: 'full-bleed', mobilewidth: '100%', desktopthickness: 'thick', mobilealignment: 'start', desktoptopspacing: 'xl', mobilebottomspacing: 'none',
    });
    ['desktop-width-50-percent', 'tablet-width-full-bleed', 'mobile-width-100-percent', 'desktop-thickness-thick', 'mobile-align-start', 'desktop-top-xl', 'mobile-bottom-none']
      .forEach((name) => assert.ok(c.includes(name), name));
  });
  it('inherit and invalid responsive values add nothing', () => {
    const c = classes({ desktopwidth: 'inherit', tabletthickness: 'huge', mobiletopspacing: '7px' });
    assert.ok(!c.some((name) => /^(desktop|tablet|mobile)-/.test(name)));
  });
  it('section padding', () => assert.ok(classes({ usesectionpadding: 'true' }).includes('section-padding')));
});

describe('decorations', () => {
  it('start, center and end shapes; none without a line', () => {
    assert.deepEqual(decorationsOf(config({ startdecoration: 'dot', centerdecoration: 'diamond' })), [['start', 'dot'], ['center', 'diamond']]);
    assert.deepEqual(decorationsOf(config({ startdecoration: 'dot', linestyle: 'none' })), []);
    assert.deepEqual(decorationsOf(config({ enddecoration: '<svg>' })), []);
    assert.ok(classes({ enddecoration: 'square' }).includes('decorated'));
  });
});

describe('animation, print and analytics', () => {
  it('no animation by default; the chosen one with its fallback', () => {
    assert.ok(!classes({}).some((name) => name.startsWith('animate-')));
    assert.ok(classes({ animateonview: 'draw-from-center' }).includes('animate-draw-from-center'));
    assert.ok(classes({ animateonview: 'fade', reducedmotionfallback: 'fade' }).includes('motion-fade'));
    assert.equal(config({ animateonview: 'bounce' }).animation, 'none');
  });
  it('print visibility', () => assert.ok(classes({ printvisibility: 'hide' }).includes('print-hide')));
  it('analytics off by default; the entry describes the separator', () => {
    assert.equal(config().analytics, false);
    const entry = analyticsEntry(config({ analyticsenabled: 'true', analyticslabel: 'Story end', showmobile: 'false' }), 'sep-1');
    assert.deepEqual(entry['sep-1'], {
      '@type': 'tcs-corp/components/separator',
      'dc:title': 'Story end',
      'xdm:variant': 'default',
      'xdm:accessibilityMode': 'decorative',
      'xdm:theme': 'auto',
      'xdm:lineStyle': 'solid',
      'xdm:visibility': 'desktop,tablet',
    });
  });
});
