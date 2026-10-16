// Template-managed header and footer references: node --test (npm test)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePath, resolveCandidates, resolveTemplateConfig,
} from '../../utils/layout-config.js';

// a Page Templates sheet (data/page-templates) as published: one row per Page Type
const SHEET = [
  {
    'page-type': 'default', nav: '/en/references/nav', footer: '/en/references/footer', 'footer-canvas': '',
  },
  {
    'page-type': 'home', 'footer-canvas': '/en/references/canvas-home', 'header-variation': 'Overlay',
  },
  {
    'page-type': 'press-release', footer: '/en/references/footer-compact', 'footer-variation': 'plain', 'page-override': 'not allowed',
  },
  {
    'Page-Type': 'Campaign', Nav: '/en/campaign/nav', Footer: 'none', 'Show-Header': 'yes',
  },
];

describe('template config', () => {
  it('uses the default row for pages without a Page Type', () => {
    const config = resolveTemplateConfig(SHEET, '');
    assert.equal(config.template, 'default');
    assert.equal(config.nav, '/en/references/nav');
    assert.equal(config.footer, '/en/references/footer');
    assert.equal(config.headerVariation, 'default');
    assert.equal(config.allowOverride, true);
  });

  it('merges the Page Type row over the default row', () => {
    const config = resolveTemplateConfig(SHEET, 'home');
    assert.equal(config.template, 'home');
    assert.equal(config.nav, '/en/references/nav');
    assert.equal(config.footerCanvas, '/en/references/canvas-home');
    assert.equal(config.headerVariation, 'overlay');
  });

  it('reads the override policy and variations', () => {
    const config = resolveTemplateConfig(SHEET, 'press-release');
    assert.equal(config.footer, '/en/references/footer-compact');
    assert.equal(config.footerVariation, 'plain');
    assert.equal(config.allowOverride, false);
  });

  it('matches columns and Page Types case-insensitively', () => {
    const config = resolveTemplateConfig(SHEET, 'campaign');
    assert.equal(config.nav, '/en/campaign/nav');
    assert.equal(config.footer, 'none');
    assert.equal(config.showHeader, true);
  });

  it('falls back to the default row for an unknown Page Type and to defaults without a sheet', () => {
    assert.equal(resolveTemplateConfig(SHEET, 'blog').template, 'default');
    const empty = resolveTemplateConfig([], 'home');
    assert.equal(empty.nav, '');
    assert.equal(empty.showFooter, true);
    assert.equal(empty.footerVariation, 'default');
  });

  it('ignores unknown variations', () => {
    const rows = [{ 'page-type': 'default', 'header-variation': 'neon', 'show-footer': 'No' }];
    const config = resolveTemplateConfig(rows, '');
    assert.equal(config.headerVariation, 'default');
    assert.equal(config.showFooter, false);
  });
});

describe('reference resolution', () => {
  const defaults = {
    localeDefault: '/en/references/footer',
    projectDefault: '/en/references/footer',
    currentPath: '/en/about',
  };

  it('uses the template reference before parents and locale defaults', () => {
    const r = resolveCandidates({
      ...defaults, template: '/en/references/footer-compact', inherited: '/en/careers/footer',
    });
    assert.equal(r.source, 'template');
    assert.deepEqual(r.candidates, [
      '/en/references/footer-compact', '/en/careers/footer', '/en/references/footer',
    ]);
    assert.deepEqual(r.origins, ['template', 'parent', 'locale']);
  });

  it('puts an allowed page override first', () => {
    const r = resolveCandidates({ ...defaults, own: '/en/campaign/footer', template: '/en/references/footer' });
    assert.equal(r.source, 'page');
    assert.equal(r.candidates[0], '/en/campaign/footer');
  });

  it('ignores the page value when the template doesn\'t allow overrides', () => {
    const r = resolveCandidates({
      ...defaults, own: '/en/campaign/footer', template: '/en/references/footer-compact', allowOverride: false,
    });
    assert.equal(r.source, 'template');
    assert.ok(!r.candidates.includes('/en/campaign/footer'));
  });

  it('falls back to the site, then the project default', () => {
    const r = resolveCandidates({
      localeDefault: '/de-de/references/footer', projectDefault: '/en/references/footer',
    });
    assert.deepEqual(r.origins, ['locale', 'project']);
  });

  it('switches off with "none" (page where allowed, or template)', () => {
    assert.equal(resolveCandidates({ ...defaults, own: 'None' }).disabled, true);
    assert.equal(resolveCandidates({ ...defaults, template: 'none' }).disabled, true);
    assert.equal(resolveCandidates({ ...defaults, enabled: false }).disabled, true);
    // not allowed: the page can't switch it off
    assert.equal(resolveCandidates({ ...defaults, own: 'none', allowOverride: false }).disabled, false);
  });

  it('never loads the page itself (no recursive reference)', () => {
    const r = resolveCandidates({
      ...defaults, own: '/en/about.html', currentPath: '/en/about.html',
    });
    assert.ok(!r.candidates.includes('/en/about'));
  });

  it('drops invalid references and duplicates', () => {
    const r = resolveCandidates({
      ...defaults,
      own: 'https://evil.example/footer',
      template: '//cdn.example/footer',
      inherited: '/en/../secret',
    });
    assert.deepEqual(r.candidates, ['/en/references/footer']);
  });

  it('resolves to the minimal fallback without references', () => {
    const r = resolveCandidates({});
    assert.equal(r.source, 'fallback');
    assert.deepEqual(r.candidates, []);
  });

  it('gives every page of a template the same shared reference', () => {
    const pages = ['/en/news/a', '/en/news/b', '/en/news/c'].map((currentPath) => resolveCandidates({
      ...defaults, currentPath, template: '/en/references/footer-compact',
    }).candidates[0]);
    assert.deepEqual(new Set(pages), new Set(['/en/references/footer-compact']));
  });
});

describe('paths', () => {
  it('normalizes page paths', () => {
    assert.equal(normalizePath('/en/references/nav.plain.html'), '/en/references/nav');
    assert.equal(normalizePath('/content/aem-eds-xwalk/us/en/references/nav.html'), '/content/aem-eds-xwalk/us/en/references/nav');
    assert.equal(normalizePath('/en/'), '/en');
    assert.equal(normalizePath('/'), '/');
    assert.equal(normalizePath('references/nav'), '');
    assert.equal(normalizePath('/en/nav?x=1'), '');
  });
});
