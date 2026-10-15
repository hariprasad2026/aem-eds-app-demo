/* Unit tests of the List block's data (blocks/list/list-data.js): run with npm test */
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEM_FIELDS, applyOverrides, applyTagMatching, buildCards, deduplicateCards, isSafeUrl, kindOf, limitCards,
  normalizeConfig, normalizePageToCard, resolveFixedItems, resolveParentPages, sortCards, toSafeId,
  validateConfig, withIds,
} from '../../blocks/list/list-data.js';
import { matchCells } from '../../utils/cells.js';
import { resolveRedirect } from '../../utils/redirects.js';
import { PAGES } from './fixtures.mjs';

const paths = (cards) => cards.map((card) => card.sourcePath || card.url);
const config = (raw = {}) => normalizeConfig(raw);
const byPath = new Map(PAGES.map((page) => [page.path, page]));

describe('configuration', () => {
  it('defaults: fixed, manual order, all items, grid everywhere', () => {
    const c = config();
    assert.equal(c.source, 'fixed');
    assert.equal(c.orderBy, 'manual');
    assert.equal(c.maxItems, Infinity);
    assert.deepEqual(['desktop', 'tablet', 'mobile'].map((bp) => c.responsive[bp].mode), ['grid', 'grid', 'grid']);
  });
  it('has no search source', () => {
    assert.equal(config({ source: 'search' }).source, 'fixed');
  });
  it('empty and invalid maximum items mean all items', () => {
    assert.equal(config({ maxitems: '' }).maxItems, Infinity);
    assert.equal(config({ maxitems: 'abc' }).maxItems, Infinity);
    assert.equal(config({ maxitems: '-3' }).maxItems, Infinity);
    assert.equal(config({ maxitems: '2' }).maxItems, 2);
  });
  it('makes component ids safe', () => {
    assert.equal(toSafeId('My List!'), 'my-list');
    assert.equal(toSafeId('2026 news'), 'list-2026-news');
    assert.equal(toSafeId(''), '');
  });
  it('clamps invalid responsive values', () => {
    const c = config({
      desktopcolumns: '99', mobilegap: '-4', tabletvisible: 'x', mobilecardwidth: '50', desktopmode: 'carousel',
    });
    assert.equal(c.responsive.desktop.columns, 6);
    assert.equal(c.responsive.mobile.gap, 0);
    assert.equal(c.responsive.tablet.visible, 3.3);
    assert.equal(c.responsive.mobile.cardWidth, 0);
    assert.equal(c.responsive.desktop.mode, 'grid');
  });
  it('reports what an author can fix', () => {
    assert.deepEqual(validateConfig(config({ source: 'tags' })), ['tags-missing']);
    assert.deepEqual(validateConfig(config({ source: 'fixed' }), { fixedCount: 0 }), ['items-missing']);
    assert.deepEqual(validateConfig(config({ source: 'parent', parentusecurrentpage: 'false' })), ['parent-missing']);
  });

  const MODES = { g: 'grid', s: 'horizontal-scroll' };
  ['ggg', 'sss', 'sgg', 'gsg', 'ggs', 'ssg', 'sgs', 'gss'].forEach((combo) => {
    it(`responsive combination desktop/tablet/mobile = ${combo}`, () => {
      const [d, t, m] = [...combo].map((c) => MODES[c]);
      const c = config({ desktopmode: d, tabletmode: t, mobilemode: m });
      assert.deepEqual([c.responsive.desktop.mode, c.responsive.tablet.mode, c.responsive.mobile.mode], [d, t, m]);
    });
  });
});

describe('parent / child pages', () => {
  it('lists the direct children of an explicit parent, not the parent or hidden pages', () => {
    const cards = buildCards(config({ source: 'parent', parentpath: '/en/insights' }), { pages: PAGES });
    assert.deepEqual(paths(cards), ['/en/insights/2026', '/en/insights/agentic-bank',
      '/en/insights/ai-report', '/en/insights/cloud-scale']);
  });
  it('falls back to the current page', () => {
    const cards = buildCards(config({ source: 'parent' }), { pages: PAGES, currentPath: '/en/insights/2026.html' });
    assert.deepEqual(paths(cards), ['/en/insights/2026/deep-dive']);
  });
  it('respects the child depth', () => {
    const depth2 = resolveParentPages(PAGES, '/en/insights', 2).map((p) => p.path);
    assert.ok(depth2.includes('/en/insights/2026/deep-dive'));
    assert.ok(!resolveParentPages(PAGES, '/en/insights', 1).map((p) => p.path).includes('/en/insights/2026/deep-dive'));
    const c = config({ source: 'parent', parentpath: '/en/insights', directchildrenonly: 'false', childdepth: '2' });
    assert.equal(c.childDepth, 2);
  });
  it('lists nothing for a missing parent', () => {
    assert.deepEqual(buildCards(config({ source: 'parent', parentpath: '/en/missing' }), { pages: PAGES }), []);
  });
});

describe('page metadata', () => {
  it('uses card metadata first, then the page metadata', () => {
    const card = normalizePageToCard(byPath.get('/en/insights/cloud-scale'), config());
    assert.equal(card.title, 'Cloud, at scale');
    assert.equal(card.description, 'How the cloud scales.');
    assert.equal(card.image, '/en/media/cloud-card.jpg');
    assert.equal(card.imageAlt, 'A data centre');
    assert.equal(card.eyebrow, 'Perspective');
    assert.equal(card.dateISO, '2026-08-01');
    assert.equal(card.date, '01 Aug 26');
  });
  it('skips the default social image and falls back to the thumbnail', () => {
    const card = normalizePageToCard(byPath.get('/en/insights/agentic-bank'), config());
    assert.equal(card.image, '/en/media/agentic.jpg');
    assert.equal(normalizePageToCard(byPath.get('/en/insights/2026'), config()).image, '');
  });
  it('keeps optional fields empty when missing, and parses dates safely', () => {
    const card = normalizePageToCard(byPath.get('/en/insights/2026'), config({ dateformat: 'dd-mm-yyyy' }));
    assert.equal(card.description, '');
    assert.equal(card.eyebrow, '');
    assert.deepEqual(card.tagIds, []);
    assert.match(card.dateISO, /^\d{4}-\d{2}-\d{2}$/);
  });
  it('links to the redirect target', () => {
    const redirects = new Map([['/en/insights/agentic-bank', '/en/insights/the-agentic-bank']]);
    const card = normalizePageToCard(byPath.get('/en/insights/agentic-bank'), config(), {
      resolveUrl: (path) => resolveRedirect(redirects, path),
    });
    assert.equal(card.url, '/en/insights/the-agentic-bank');
  });
  it('follows redirect chains without looping', () => {
    const map = new Map([['/a', '/b'], ['/b', '/c'], ['/c', '/a']]);
    assert.equal(resolveRedirect(map, '/a'), '/a');
    assert.equal(resolveRedirect(new Map([['/a', '/b'], ['/b', 'https://x.example/']]), '/a'), 'https://x.example/');
  });
});

describe('fixed list', () => {
  const origin = 'https://www.tcs.com';
  it('an internal page takes its metadata', () => {
    const [card] = resolveFixedItems([{ href: '/en/insights/agentic-bank' }], byPath, config(), { origin });
    assert.equal(card.title, 'The agentic bank');
    assert.equal(card.external, false);
  });
  it('an external URL keeps its link text, and is marked external', () => {
    const [card] = resolveFixedItems([{ href: 'https://example.com/report', linkText: 'Partner report' }], byPath, config(), { origin });
    assert.equal(card.title, 'Partner report');
    assert.equal(card.url, 'https://example.com/report');
    assert.equal(card.external, true);
    assert.equal(card.openInNewTab, false);
  });
  it('opens in a new tab when the item or the list says so', () => {
    const [own] = resolveFixedItems([{ href: '/en/x', linkText: 'X', newTab: 'true' }], byPath, config(), { origin });
    assert.equal(own.openInNewTab, true);
    const [list] = resolveFixedItems([{ href: '/en/x', linkText: 'X' }], byPath, config({ openinnewtab: 'true' }), { origin });
    assert.equal(list.openInNewTab, true);
    const [off] = resolveFixedItems([{ href: '/en/x', linkText: 'X', newTab: 'false' }], byPath, config({ openinnewtab: 'true' }), { origin });
    assert.equal(off.openInNewTab, false);
  });
  it('item overrides win over the page metadata', () => {
    const [card] = resolveFixedItems([{
      href: '/en/insights/agentic-bank', title: 'Custom title', description: 'Custom text', image: '/en/media/own.jpg', imageAlt: 'Own', eyebrow: 'Case study', tags: ['tcs:topic/x'], ctaLabel: 'Read', analyticsLabel: 'promo', accessibilityLabel: 'Read the agentic bank',
    }], byPath, config(), { origin });
    assert.equal(card.title, 'Custom title');
    assert.equal(card.description, 'Custom text');
    assert.equal(card.image, '/en/media/own.jpg');
    assert.equal(card.imageAlt, 'Own');
    assert.equal(card.eyebrow, 'Case study');
    assert.deepEqual(card.tagIds, ['tcs:topic/x']);
    assert.equal(card.ctaLabel, 'Read');
    assert.equal(card.analyticsLabel, 'promo');
    assert.equal(card.accessibilityLabel, 'Read the agentic bank');
  });
  it('skips unsafe links and links without a title', () => {
    // eslint-disable-next-line no-script-url
    const unsafe = 'javascript:alert(1)';
    const cards = resolveFixedItems([{ href: unsafe, linkText: 'x' }, { href: 'https://example.com' }, { href: '' }], byPath, config(), { origin });
    assert.deepEqual(cards, []);
    assert.equal(isSafeUrl('data:text/html,x'), false);
    assert.equal(isSafeUrl('/en/a'), true);
    assert.equal(isSafeUrl('mailto:a@b.c'), true);
  });
  it('reads absolute links to this site as pages', () => {
    const [card] = resolveFixedItems([{ href: `${origin}/en/insights/ai-report` }], byPath, config(), { origin });
    assert.equal(card.title, 'AI report');
    assert.equal(card.url, '/en/insights/ai-report');
  });
  it('keeps the authored order with manual ordering', () => {
    const items = [{ href: '/en/insights/cloud-scale' }, { href: '/en/insights/agentic-bank' }, { href: '/en/insights/ai-report' }];
    const cards = buildCards(config({ source: 'fixed' }), { pages: PAGES, items, origin });
    assert.deepEqual(paths(cards), ['/en/insights/cloud-scale', '/en/insights/agentic-bank', '/en/insights/ai-report']);
  });
});

describe('tag-based pages', () => {
  it('any: pages with at least one tag (and child tags)', () => {
    const cards = buildCards(config({ source: 'tags', rootpath: '/en', tags: 'tcs:topic/ai, tcs:industry/banking' }), { pages: PAGES });
    assert.deepEqual(paths(cards).sort(), ['/en/industries/banking', '/en/insights/2026/deep-dive',
      '/en/insights/agentic-bank', '/en/insights/ai-report']);
  });
  it('all: pages with every tag', () => {
    const cards = buildCards(config({
      source: 'tags', rootpath: '/en', tags: 'tcs:topic/ai, tcs:topic/cloud', tagmatch: 'all',
    }), { pages: PAGES });
    assert.deepEqual(paths(cards), ['/en/insights/ai-report']);
  });
  it('children of the root only, or down to the maximum depth', () => {
    const direct = buildCards(config({
      source: 'tags', rootpath: '/en/insights', tags: 'tcs:topic/ai', includedescendants: 'false',
    }), { pages: PAGES });
    assert.ok(!paths(direct).includes('/en/insights/2026/deep-dive'));
    const deep = buildCards(config({ source: 'tags', rootpath: '/en/insights', tags: 'tcs:topic/ai', maxdepth: '2' }), { pages: PAGES });
    assert.ok(paths(deep).includes('/en/insights/2026/deep-dive'));
  });
  it('no tags or no matches: no cards', () => {
    assert.deepEqual(buildCards(config({ source: 'tags', rootpath: '/en' }), { pages: PAGES }), []);
    assert.deepEqual(buildCards(config({ source: 'tags', rootpath: '/en', tags: 'tcs:topic/none' }), { pages: PAGES }), []);
    assert.deepEqual(applyTagMatching(PAGES, [], 'any'), []);
  });
  it('uses the current page as the root when empty', () => {
    const cards = buildCards(config({ source: 'tags', tags: 'tcs:industry/banking' }), { pages: PAGES, currentPath: '/en/industries' });
    assert.deepEqual(paths(cards), ['/en/industries/banking']);
  });
});

describe('deduplicate, sort and limit', () => {
  const cards = ['/en/insights/agentic-bank', '/en/insights/cloud-scale', '/en/insights/ai-report']
    .map((path) => normalizePageToCard(byPath.get(path), config(), { sourceType: 'parent' }));
  it('removes duplicate destinations, keeping the first', () => {
    const fixed = resolveFixedItems([{ href: '/en/insights/ai-report' }, { href: '/en/insights/ai-report.html' }, { href: '/en/insights/ai-report/' }], byPath, config());
    assert.equal(deduplicateCards(fixed).length, 1);
  });
  it('title ascending and descending', () => {
    assert.deepEqual(sortCards(cards, 'title', 'ascending', 'en').map((c) => c.title), ['AI report', 'Cloud, at scale', 'The agentic bank']);
    assert.deepEqual(sortCards(cards, 'title', 'descending', 'en').map((c) => c.title), ['The agentic bank', 'Cloud, at scale', 'AI report']);
  });
  it('last modified ascending and descending', () => {
    // cloud-scale: modified-date 2026-08-01; the others: when they were last published
    assert.deepEqual(paths(sortCards(cards, 'lastmodified', 'ascending')), ['/en/insights/cloud-scale', '/en/insights/ai-report', '/en/insights/agentic-bank']);
    assert.deepEqual(paths(sortCards(cards, 'lastmodified', 'descending')), ['/en/insights/agentic-bank', '/en/insights/ai-report', '/en/insights/cloud-scale']);
  });
  it('manual: path order for pages (deterministic)', () => {
    assert.deepEqual(paths(sortCards(cards, 'manual', 'ascending')), ['/en/insights/agentic-bank', '/en/insights/ai-report', '/en/insights/cloud-scale']);
  });
  it('maximum items after sorting', () => {
    const c = config({
      source: 'parent', parentpath: '/en/insights', orderby: 'lastModified', sortorder: 'descending', maxitems: '2',
    });
    assert.deepEqual(paths(buildCards(c, { pages: PAGES })), ['/en/insights/agentic-bank', '/en/insights/ai-report']);
    assert.equal(limitCards(cards, Infinity).length, 3);
    assert.equal(limitCards(cards, 0).length, 3);
  });
  it('stable, unique card ids', () => {
    const a = withIds(cards, 'news');
    const b = withIds(cards, 'news');
    assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
    assert.equal(new Set(a.map((c) => c.id)).size, 3);
    assert.match(a[0].id, /^news-item-[a-z0-9]+$/);
  });
});

describe('card kinds', () => {
  it('mixed: report pages as reports, pages without an image as panels', () => {
    const report = normalizePageToCard(byPath.get('/en/insights/ai-report'), config());
    const noImage = normalizePageToCard(byPath.get('/en/insights/2026'), config());
    const image = normalizePageToCard(byPath.get('/en/insights/agentic-bank'), config());
    assert.equal(kindOf(report, 'mixed'), 'report');
    assert.equal(kindOf(noImage, 'mixed'), 'panel');
    assert.equal(kindOf(image, 'mixed'), 'image');
    assert.equal(kindOf(applyOverrides(image, { kind: 'stat' }), 'mixed'), 'stat');
    assert.equal(kindOf(image, 'panel'), 'panel');
  });
});

describe('list item cells', () => {
  const SUFFIXES = ['MimeType', 'Alt', 'Text', 'Title', 'Type'];
  // the cells AEM renders for a model: one per field, tabs and classes left out, a field ending
  // in Alt / Text / Title / Type / MimeType folded into its base field
  const cellOrder = (model) => {
    const names = model.fields.filter((f) => f.component !== 'tab' && f.name).map((f) => f.name);
    return names.filter((name) => !/^classes/.test(name)
      && !SUFFIXES.some((s) => name.endsWith(s) && names.includes(name.slice(0, -s.length))));
  };
  // a cell as matchCells sees it: its text, a link or an image
  const cell = (value = '', { link, image } = {}) => ({
    textContent: value,
    querySelector: (selector) => {
      if (link && /a\[href\]/.test(selector)) return { getAttribute: () => link };
      if (image && /img|picture/.test(selector)) return {};
      return null;
    },
  });

  it('are read in the order of the list-item model', () => {
    const { models } = JSON.parse(readFileSync(new URL('../../blocks/list/_list.json', import.meta.url)));
    assert.deepEqual(ITEM_FIELDS, cellOrder(models.find((m) => m.id === 'list-item')));
  });
  it('reads a row with every model cell', () => {
    const row = [cell('/en/insights/agentic-bank', { link: '/en/insights/agentic-bank' }), cell('true'),
      cell('The agentic bank'), cell('Banking is entering a new era.'), cell('', { image: true }),
      cell('Perspective'), cell('tcs:topic/ai'), cell('Revenue'), cell('Read more'), cell('panel'),
      cell('navy'), cell('agentic-bank'), cell('Read the agentic bank')];
    const cells = matchCells(row, ITEM_FIELDS, {});
    const text = (field) => cells[field]?.textContent;
    assert.equal(text('newTab'), 'true');
    assert.equal(text('headline'), 'The agentic bank');
    assert.equal(text('summary'), 'Banking is entering a new era.');
    assert.equal(text('ctaLabel'), 'Read more');
    assert.equal(text('kind'), 'panel');
    assert.equal(text('theme'), 'navy');
    assert.equal(text('ariaLabel'), 'Read the agentic bank');
  });
});
