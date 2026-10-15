# Cards

**Manually authored cards** for Edge Delivery Services (xwalk / Universal Editor): the authoring
alternative to the [List](../list/README.md). The List lists pages (child pages, a fixed list
of pages, tagged pages) and builds their cards from the pages' metadata; in Cards, authors write
each card's content themselves: image, eyebrow, title, description, label, tags, date, link and
call to action. Both blocks share the same presentation, the TCS DS Figma List variations 1–14,
and the same block settings, so a Cards block looks exactly like a List with the same settings.

Based on the Block Collection Cards (an image and a text per card), which still works: cards
made before this version render with the new design (see Backward compatibility).

| File | Purpose |
|---|---|
| `blocks/cards/_cards.json` | Universal Editor definitions (Cards, Card), models and filter; the block settings are the shared groups of `models/_card-list.json` |
| `blocks/cards/cards.js` | Reads the settings and the Card rows (also cards made before), renders through the card list decorator |
| `blocks/cards/cards-data.js` | A Card's values as the card model (no DOM; unit tested) |
| `blocks/cards/cards.css` | Imports `styles/card-list.css` (the List's presentation) |
| `decorators/card-list-decorator.js` | Header, cards, feature card, rows, grid / scroll, data layer (shared with List) |
| `utils/card-list-config.js` | The settings, defaults and validation (shared with List) |
| `test/cards/cards-data.test.mjs` | Unit tests (`npm test`) |

## When to use Cards or List

| | Cards | List |
|---|---|---|
| Content | Typed in each card | The pages' metadata (card title, description, image, ...), with overrides per item (Fixed list) |
| Destinations | Any page or URL, or none (a card without a link) | Pages of the site or URLs |
| Updates | Edited in the block | Follow the pages (a new child page or tagged page shows up) |
| Rich text | Description is rich text (paragraphs, bold, lists, inline links) | Plain text |
| Statistics, themes | Typed numbers and labels | The same, per item |

Use **Cards** for curated content that isn't a page (statistics, capabilities, services with their
own wording, logos with text); use **List** when the cards represent pages that already have their
metadata.

## For authors

Add **Cards** to a section, set the block in its properties and add **Card** items (add,
duplicate, delete and drag to reorder them in the content tree). The block tabs are the List's:

| Tab | Fields |
|---|---|
| Content | Title, Heading type, Description, CTA link, CTA text, CTA style, Accessible list label, Component ID |
| Cards | Display as teaser (cards; off: rows of links), Card style (image, panel, report, statistic, mixed), Card colour, Image ratio, Panel height, First card as feature, Link items, Open links in a new tab, Show image / eyebrow / tags / description / date / call to action, Date format, Image loading |
| Layout | Desktop, tablet and mobile: grid (columns) or horizontal scroll (items visible or card width, previous / next buttons, scroll indicator), gap; Equal card height, Stretch cards to row height |
| Scroll | Scroll snap and alignment, hide scrollbar, mouse drag, touch swipe, keyboard, scroll step, loop, initial item, edge, reduced motion |
| Advanced | When there are no cards (hide the block, or show the Empty message), Analytics, Style options (compact statistic title, dividers between rows, header centred) |
| Additional | Anchor ID, Hide block, padding and margin (every block) |

The field descriptions, defaults and validation are in the List's
[field matrix](../list/README.md#field-matrix) (the shared fields), without the List source,
order and maximum items: cards show in the authored order.

**Card** (the item):

| Tab | Field (name) | Type | Behaviour |
|---|---|---|---|
| Content | Image (`image`), Image alt text (`imageAlt`) | reference + text | The card image; empty alt: decorative (the title is next to it) |
| | Eyebrow (`eyebrow`) | text | Above the title |
| | Title (`title`) | text | The card heading (one level below the block title); statistic cards: the number |
| | Description (`text`) | rich text | Paragraphs, bold, lists and inline links (inline links stay clickable on a linked card) |
| | Label (`subtitle`) | text | Statistic cards: the label above the description |
| | Tags (`tags`) | aem-tag, multi | Labels from the taxonomy, in the kicker (up to 3) |
| | Date (`date`) | date | Shown in the block's Date format, as `<time datetime>` |
| | Content type (`contentLabel`) | text | Image cards: next to the date; report cards: the kicker; Mixed: Report makes a report card |
| | Reading time (`readingTime`) | text | Minutes (`6` shows `6m`), after the tags |
| Link | Link (`link`), Link text (`linkText`) | aem-content + text | The card's destination (a page or `https://…`); empty: the card isn't linked. The link text is the title when the card has none (as in the List) |
| | Call to action label (`ctaLabel`) | text | Shows a call to action, the card's one link; empty: the title is the link (panels: Explore, reports: Download) |
| | Open in a new tab (`newTab`) | select | As the block / yes / no |
| Display | Card style (`kind`), Card colour (`theme`) | select | As the block, or this card's own |
| | Analytics label (`analyticsLabel`) | text | `dc:title` in the data layer |
| | Accessibility label (`ariaLabel`) | text | The link's accessible name |

A card needs a title, a description or an image; cards with none of them, and cards whose link is
unsafe (`javascript:`, `data:`), aren't shown.

### The Figma variations

Configure Cards as in the List's [variation table](../list/README.md#figma-to-css), e.g.:

| Variation | Cards settings |
|---|---|
| 1 Themes | Card style Panel, each card's colour (dark, brand, image), mobile scroll with indicator |
| 2 Insight & Opinion | Mixed, First card as feature, Image ratio 1:1, CTA link |
| 3 Related, 8 Media coverage | Mixed or Report, horizontal scroll on every breakpoint |
| 4 Intelligence in Action, 11 2-up | Image, 1:1, 3 or 2 columns |
| 5 News | Display as teaser off, Style option Dividers between rows |
| 6, 7, 10, 12, 13, 14 Statistics | Card style Statistic (Title: the number, Label, Description), card colours, Compact statistic title |

## Rendering

```
decorate(block)
  readBlock()            key-value settings, Card rows (or image | text rows made before)
  normalizePresentation() defaults and validation (utils/card-list-config.js)
  buildManualCards()     the card model (cards-data.js), authored order
  resolveTags()          tag labels (taxonomy)
  renderCardList()       header, feature card, <ul> of cards or rows, previous / next, indicator
  trackCardList()        data layer state; clicks: the data layer decorator
```

The markup and classes are the List's (`card-list` on the block, `list-card`, `list-item`, ...),
so `styles/card-list.css` styles both blocks.

## Accessibility

As the List: `<ul>` / `<li>` cards in a region named by the title (else the Accessible list label,
else "Cards"); card headings one level below the block heading; one link per card covering it
(no empty links: a card without a title or a call to action isn't linked); new-tab links say so;
previous / next buttons with names; the scroller is focusable only while it scrolls (arrow keys,
Home, End); `<time datetime>`; decorative images `alt=""`.

## Analytics (Adobe Client Data Layer)

```js
{ component: {
  'cards-1': { '@type': 'tcs-corp/components/cards', parentId: 'page-…', 'dc:title': 'Our services', 'xdm:variant': 'image' },
  'cards-1-item-1': { '@type': 'tcs-corp/components/cards/item', parentId: 'cards-1', 'dc:title': 'Consulting', 'xdm:linkURL': '/en/consulting', 'xdm:position': 1 },
} }
{ event: 'cmp:click', eventInfo: { path: 'component.cards-1-item-1', interaction: 'card', 'dc:title': '…', 'xdm:linkURL': '…', 'xdm:linkType': 'other', breakpoint: 'desktop' } }
```

The ids are the Component ID (else the Anchor ID, else `cards-1`, …) and `-item-{n}` in the shown
order. A card without a title is named by the start of its description. Analytics off:
`data-analytics="off"`, no state and no events.

## Empty states

| Case | Behaviour |
|---|---|
| No cards (or none with content) | Editor: "Add a Card to the block and give it a title, a description or an image."; page: hidden (default) or the Empty message |
| A card without a link | Shown, not linked |
| A card without a title | Shown without a heading, not linked unless it has a call to action |
| Missing image, tags, date | That part isn't rendered |

## Placeholders

`cards` (Cards), `cardsEditorHint`, and the List's: `listPrevious`, `listNext`, `opensInNewTab`,
`explore`, `download`, `listEmpty`, `minutesShort`.

## Backward compatibility

Cards made before this version (Block Collection: an image and a rich text per card, or the rich
text only) render with the new design: the text's first heading (or a bold first paragraph) is the
title, a link alone in the last paragraph is the call to action, the rest is the description. They
use the default settings (image cards, 4 / 4 / 1 columns) until the block's properties are set.
Cards blocks created before this version were created from a definition without a block model
(`{ name: Cards, filter: cards }`) and aren't key-value blocks: Universal Editor shows no usable
block settings for them. To use the new settings on such a block, add a new Cards block and move
its cards (new blocks are key-value), or migrate the instance (planned, see below).

## Known issues and planned refactoring

Analysed in [docs/proposals/cards-card-refactoring.md](../../docs/proposals/cards-card-refactoring.md)
(14 October 2026):

| # | Issue | Planned resolution |
|---|---|---|
| C-1 | Cards blocks made before this version have no block model: their settings can't be edited | Migrate the instances (`model = cards`, `key-value = true`) — Phase 0 |
| C-2 | They render with the new design instead of the original bordered auto-fill grid | Restore it as the Classic presentation, used for those blocks — Phase 0 |
| C-3 | In their cards (one rich text cell) the title stays inside Description in the Card dialog | Move titles into Title when editing; optional editorial migration |
| C-4 | To confirm in Universal Editor: **+** on a new Cards block offers Card | Test on a test page (decision D-1) |

Planned extensions (phases 1–6): Card fields (background image, icon, badge, status, category,
author, CTA style, analytics and personalization attributes), presentations (classic, carousel with
autoplay and dots, vertical list, masonry, featured), sources (child pages, tags, query, related),
client-side filtering, sorting and search — built from code shared with List, Filter List and Gen
Carousel. The Product Owner decisions are listed in section 21 of the proposal.

## Known limitations

- No author lockup on the feature card (the List takes it from the page's author).
- Internal links aren't resolved through the redirects sheets (the List does, for pages).
- The cards' text fields are edited in the properties panel; the description (rich text) can be
  edited in place.
- No carousel autoplay or dots, masonry, filtering, sorting or search yet (planned; use Filter List
  for filterable listings today).
