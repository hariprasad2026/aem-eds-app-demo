// Cards data and the shared card list settings: node --test (npm test)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildManualCards, itemToCard } from '../../blocks/cards/cards-data.js';
import { kindOf, normalizePresentation, toSafeId } from '../../utils/card-list-config.js';

const config = (raw = {}) => normalizePresentation(raw, { idPrefix: 'cards' });
const context = { id: 'cards-1', index: 0, origin: 'https://www.tcs.com' };
// an unsafe link (a variable: the lint flags script URLs written as literals)
const UNSAFE = ['java', 'script:alert(1)'].join('');
// a rich text cell as the block reads it (only its text matters here)
const body = (value) => ({ textContent: value });

describe('card items', () => {
  it('maps the authored fields', () => {
    const card = itemToCard({
      href: '/en/insights/agentic-bank',
      title: ' The agentic bank ',
      body: body('Banking is\n entering a new era.'),
      image: '/en/media/bank.jpg',
      imageAlt: 'A bank',
      eyebrow: 'Perspective',
      subtitle: 'Revenue',
      tags: ['tcs:topic/ai'],
      date: '2026-09-04T00:00:00.000Z',
      contentType: 'Article',
      readingTime: '6',
      ctaLabel: 'Read more',
      kind: 'Panel',
      theme: 'brand',
      analyticsLabel: 'Bank card',
      accessibilityLabel: 'Read about the agentic bank',
    }, config(), context);
    assert.equal(card.id, 'cards-1-item-1');
    assert.equal(card.title, 'The agentic bank');
    assert.equal(card.description, 'Banking is entering a new era.');
    assert.equal(card.url, '/en/insights/agentic-bank');
    assert.equal(card.sourcePath, '/en/insights/agentic-bank');
    assert.equal(card.dateISO, '2026-09-04');
    assert.equal(card.date, '04 Sep 26');
    assert.equal(card.kind, 'panel');
    assert.equal(card.theme, 'brand');
    assert.deepEqual(card.tagIds, ['tcs:topic/ai']);
    assert.equal(card.external, false);
    assert.equal(card.openInNewTab, false);
  });

  it('formats the date in the block format', () => {
    const card = itemToCard({ title: 'A', date: '2026-09-04' }, config({ dateformat: 'mmm-d-yyyy' }), context);
    assert.equal(card.date, 'Sep 4, 2026');
    assert.equal(itemToCard({ title: 'A', date: 'soon' }, config(), context).date, '');
  });

  it('opens in a new tab as the block, or as the card says', () => {
    const block = config({ openinnewtab: 'true' });
    assert.equal(itemToCard({ title: 'A', href: '/en/a' }, block, context).openInNewTab, true);
    assert.equal(itemToCard({ title: 'A', href: '/en/a', newTab: 'false' }, block, context).openInNewTab, false);
    assert.equal(itemToCard({ title: 'A', href: '/en/a', newTab: 'true' }, config(), context).openInNewTab, true);
  });

  it('marks links leaving the site', () => {
    assert.equal(itemToCard({ title: 'A', href: 'https://example.com/a' }, config(), context).external, true);
    assert.equal(itemToCard({ title: 'A', href: 'https://www.tcs.com/en/a' }, config(), context).external, false);
  });

  it('keeps cards without a link (not linked) and skips unsafe links and empty cards', () => {
    assert.equal(itemToCard({ title: 'A' }, config(), context).url, '');
    assert.equal(itemToCard({ title: 'A', href: UNSAFE }, config(), context), null);
    assert.equal(itemToCard({ title: 'A', href: 'data:text/html,x' }, config(), context), null);
    assert.equal(itemToCard({ title: '', body: body('  ') }, config(), context), null);
    assert.ok(itemToCard({ image: '/en/media/logo.png' }, config(), context));
    assert.ok(itemToCard({ body: body('Text only') }, config(), context));
  });

  it('ignores unknown styles and colours', () => {
    const card = itemToCard({ title: 'A', kind: 'hero', theme: 'pink' }, config(), context);
    assert.equal(card.kind, '');
    assert.equal(card.theme, '');
  });

  it('numbers the shown cards in the authored order', () => {
    const cards = buildManualCards([
      { title: 'One' }, { title: '' }, { title: 'Two', href: UNSAFE }, { title: 'Three' },
    ], config(), { id: 'cards-2' });
    assert.deepEqual(cards.map((c) => [c.id, c.title]), [['cards-2-item-1', 'One'], ['cards-2-item-2', 'Three']]);
  });
});

describe('shared card list settings', () => {
  it('has the List defaults', () => {
    const c = config();
    assert.equal(c.displayAsTeaser, true);
    assert.equal(c.cardStyle, 'image');
    assert.equal(c.imageRatio, '16-9');
    assert.equal(c.panelHeight, 'portrait');
    assert.deepEqual(c.responsive.desktop, {
      mode: 'grid', columns: 4, gap: 24, visible: 4.2, cardWidth: 0, controls: false, indicator: false,
    });
    assert.equal(c.responsive.mobile.columns, 1);
    assert.equal(c.analytics, true);
  });

  it('clamps and validates the values', () => {
    const c = config({
      cardstyle: 'Stat', desktopcolumns: '9', mobilegap: '-4', tabletcardwidth: '80', desktopmode: 'carousel',
    });
    assert.equal(c.cardStyle, 'stat');
    assert.equal(c.responsive.desktop.columns, 6);
    assert.equal(c.responsive.mobile.gap, 0);
    assert.equal(c.responsive.tablet.cardWidth, 0);
    assert.equal(c.responsive.desktop.mode, 'grid');
  });

  it('keeps the known style options only', () => {
    assert.deepEqual(config({ classes: 'dividers, stat-compact, rainbow' }).styleOptions, ['dividers', 'stat-compact']);
  });

  it('prefixes ids that do not start with a letter', () => {
    assert.equal(config({ componentid: '2026 Highlights' }).componentId, 'cards-2026-highlights');
    assert.equal(toSafeId('Our services', 'cards'), 'our-services');
  });

  it('picks the card kind of mixed cards', () => {
    assert.equal(kindOf({ kind: '', contentType: 'Report', image: '' }, 'mixed'), 'report');
    assert.equal(kindOf({ kind: '', contentType: '', image: '' }, 'mixed'), 'panel');
    assert.equal(kindOf({ kind: '', contentType: '', image: '/a.jpg' }, 'mixed'), 'image');
    assert.equal(kindOf({ kind: 'stat', contentType: '', image: '' }, 'image'), 'stat');
  });
});
