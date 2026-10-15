# List

The AEM Core Components **List** for Edge Delivery Services (xwalk / Universal Editor): a list of
pages or links, from **child pages**, a **fixed list** or **tagged pages**, shown as cards or as a
list of links, in a grid or a horizontal scroller chosen separately for desktop, tablet and mobile.
The presentation follows the TCS DS Figma List variations 1–14. It is shared with the
[Cards](../cards/README.md) block, the manual authoring alternative (cards typed in the block
instead of pages): the same settings, markup and styles.

Files:

| File | Purpose |
|---|---|
| `blocks/list/_list.json` | Universal Editor definitions (List, List Item), models and filter; the presentation fields are the shared groups of `models/_card-list.json` (also used by Cards) |
| `blocks/list/list.js` | Reads the block and the List Items, discovers the pages, renders through the card list decorator |
| `blocks/list/list-data.js` | The List Item cell order (`ITEM_FIELDS`, the model order, checked against `_list.json` by the tests); sources, discovery, page metadata mapping, overrides, deduplication, sorting, limits (no DOM; unit tested); the presentation settings from `utils/card-list-config.js` |
| `blocks/list/list.css` | Imports `styles/card-list.css` (shared with Cards) |
| `decorators/card-list-decorator.js` | Header, cards, feature card, rows, grid / scroll classes, scroller, data layer state (shared with Cards) |
| `utils/card-list-config.js` | Presentation settings, defaults, validation, card kinds (shared with Cards) |
| `styles/card-list.css` | Figma presentation; grid / scroll per breakpoint (`.card-list`) |
| `decorators/scroller-decorator.js` | Previous / next, scroll indicator, drag, keyboard, loop, initial item |
| `utils/query-index.js` | The locale's pages from `/query-index.json` (loaded once, cached) |
| `utils/redirects.js` | Redirect targets from `/{locale}/redirects.json` |
| `utils/analytics.js` | Adobe Client Data Layer entries and events |
| `utils/cells.js` | Reads List Item cells when AEM leaves out fields that were never set |
| `helix-query.yaml` | Index columns of the cards |
| `test/list/*.test.mjs` | Unit tests (`npm test`) |

## For authors

Add a **List** to a section, choose the **List source**, and for a **Fixed list** add **List Items**
to the block (add, duplicate, delete and drag to reorder them in the content tree). Fields that
don't apply to the chosen source or option are hidden.

| Source | What it lists |
|---|---|
| Child pages | The pages below the **Parent page** (or the current page), its children or down to the **Child depth** |
| Fixed list | The List Items: pages of the site (their metadata, with the item's overrides), paths or external URLs |
| Tagged pages | The pages below the **Search root** (or the current page) with **any** or **all** of the **Tags** |

The search source of the Core List isn't available. Lists of pages show what is in the published
query index: a page shows once it is published, and its card content comes from its metadata.

**Component ID**: a unique name on the page used for deep links (`#id`) and analytics. Changing it
breaks existing links to the list and starts new analytics data for it. Empty: one is generated
(`list-1`, `list-2`, … in page order).

### Field matrix

Conditional: the field shows only in that case (Universal Editor `condition`). All values are
validated again in code; invalid values fall back to the default.

| Field (name) | Label | Type | Applies to | Required | Default | Validation | Runtime behaviour | Shown when |
|---|---|---|---|---|---|---|---|---|
| `title` | Title | text | all | no | — | — | The heading of the list | always |
| `titleType` | Heading type | select h2–h6 | all | no | h2 | h2–h6 (h1 kept for lists made before) | Card titles are one level below | always |
| `description` | Description | rich text | all | no | — | — | Under the title | always |
| `link` | CTA link | aem-content | all | no | — | — | Header CTA on the right | always |
| `linkText` | CTA text | text | all | no | — | — | The CTA label | always |
| `linkType` | CTA style | select | all | no | Text link | '', primary, secondary | Text link with arrow, or a button | always |
| `listLabel` | Accessible list label | text | all | no | — | — | Names the list region when it has no title | always |
| `componentId` | Component ID | text | all | no | generated | `^[A-Za-z][A-Za-z0-9_-]*$`; duplicates get a suffix | Block id, analytics id, card ids | always |
| `source` | List source | select | all | yes | fixed | parent, fixed, tags | Chooses the discovery | always |
| `parentPath` | Parent page | aem-content | parent | no | — | an AEM or published path | Published path of the parent | source = parent |
| `parentUseCurrentPage` | Use the current page when empty | boolean | parent | no | on | — | The page with the list is the parent | source = parent |
| `directChildrenOnly` | Direct children only | boolean | parent | no | on | — | On: depth 1 | source = parent |
| `childDepth` | Child depth | number | parent | no | 2 | 1–10 | Levels below the parent | parent and Direct children only off |
| `rootPath` | Search root | aem-content | tags | no | — | — | Pages below it | source = tags |
| `tagsUseCurrentPage` | Use the current page when empty | boolean | tags | no | on | — | The page with the list is the root | source = tags |
| `tags` | Tags | aem-tag, multi | tags | no (needed) | — | — | Tag IDs; child tags match too | source = tags |
| `tagMatch` | Match | select | tags | no | any | any, all | any: one of the tags; all: every tag | source = tags |
| `includeDescendants` | Include descendant pages | boolean | tags | no | on | — | Off: children of the root only | source = tags |
| `maxDepth` | Maximum search depth | number | tags | no | 0 | 0–10 (0: no limit) | Levels below the root | tags and descendants on |
| `orderBy` | Order by | select | all | no | manual | manual, title, lastModified | manual: authored order (Fixed) or path order (pages) | always |
| `sortOrder` | Sort order | select | all | no | ascending | ascending, descending | — | Order by ≠ manual |
| `maxItems` | Maximum items | number | all | no | 0 | 0–200 (0, empty or invalid: all) | Applied after deduplication and sorting | always |
| `displayAsTeaser` | Display as teaser | boolean | all | no | on | — | Cards; off: rows of links (title, eyebrow, description, date) | always |
| `cardStyle` | Card style | select | all | no | image | image, panel, report, stat, mixed | The card of every item (an item's own style wins) | teaser |
| `cardTheme` | Card colour | select | all | no | default | dark, navy, brand, brand-light, grey, mid-grey, gradient, image | Panel / report / statistic colour | teaser |
| `imageRatio` | Image ratio | select | all | no | 16:9 | 16:9, 1:1, 4:3, 3:2 | Image cards (no layout shift) | teaser |
| `panelHeight` | Panel height | select | all | no | portrait | portrait (2:3), compact (9:10), auto | Panel, report and statistic cards | teaser |
| `featureFirst` | First card as feature | boolean | all | no | off | — | The first card as a large spotlight above the others | teaser |
| `linkItems` | Link items | boolean | all | no | on | — | Off: no links on the cards | always |
| `openInNewTab` | Open links in a new tab | boolean | all | no | off | — | Default for the items (`target="_blank" rel="noopener noreferrer"`) | always |
| `showImage` / `showEyebrow` / `showTags` / `showDescription` / `showDate` / `showCta` | Show … | boolean | all | no | on | — | Hide that part of the cards | always |
| `dateFormat` | Date format | select | all | no | 04 Sep 26 | dd-mmm-yy, dd-mm-yyyy, mm-dd-yyyy, mmm-d-yyyy, dd/mm/yy | `<time datetime>` | Show date on |
| `imageLoading` | Image loading | select | all | no | lazy | lazy, eager | eager: for a list on the first screen | always |
| `{desktop,tablet,mobile}Mode` | … display | select | all | no | grid | grid, horizontal-scroll | Per breakpoint, independently | always |
| `{bp}Columns` | … columns | number | all | no | 4 / 4 / 1 | 1–6 | Grid columns | mode = grid |
| `{bp}Gap` | … gap (px) | number | all | no | 24 / 24 / 16 | 0–120 | Space between cards (rem in CSS) | always |
| `{bp}Visible` | … items visible | number | all | no | 4.2 / 3.3 / 1.2 | 1–8 | Scroller card width | mode = scroll |
| `{bp}CardWidth` | … card width (px) | number | all | no | 0 | 0 or 120–1200 | A fixed card width instead | mode = scroll |
| `{bp}Controls` | Previous / next buttons on … | boolean | all | no | off | — | Buttons below the scroller | mode = scroll |
| `{bp}Indicator` | Scroll indicator on … | boolean | all | no | off / off / on | — | Progress bar below the scroller | mode = scroll |
| `equalHeight` | Equal card height | boolean | all | no | off | — | All rows as tall as the tallest card | always |
| `stretchCards` | Stretch cards to row height | boolean | all | no | on | — | Cards of a row are as tall as the row | always |
| `scrollSnap` | Scroll snap | boolean | all | no | on | — | CSS scroll snap | always |
| `snapAlign` | Snap alignment | select | all | no | start | start, center | — | snap on |
| `hideScrollbar` | Hide native scrollbar | boolean | all | no | on | — | — | always |
| `mouseDrag` | Allow mouse drag | boolean | all | no | on | — | Drag scrolls; a drag doesn't follow the link | always |
| `touchSwipe` | Allow touch swipe | boolean | all | no | on | — | Off: `touch-action: pan-y` (buttons still work) | always |
| `keyboardScrolling` | Keyboard scrolling | boolean | all | no | on | — | Arrow keys, Home, End on the focused list | always |
| `scrollStep` | Scroll step | select | all | no | one card | one-card, viewport | Button and arrow key step | always |
| `loop` | Loop | boolean | all | no | off | — | Next at the end goes to the start | always |
| `initialIndex` | Initial item index | number | all | no | 0 | 0–200 | Card shown first (no focus change) | always |
| `edgePadding` | Edge | select | all | no | bleed | bleed, none | Scroller runs to the section edge (Figma) | always |
| `reducedMotion` | Reduced motion support | boolean | all | no | on | — | No smooth scrolling for `prefers-reduced-motion` | always |
| `emptyBehavior` | When there are no items | select | all | no | message | hide, message, fallback | fallback: the block's List Items | always |
| `emptyMessage` | Empty message | text | all | no | placeholder `listEmpty` | — | — | behaviour = message |
| `analyticsEnabled` | Analytics | boolean | all | no | on | — | Adobe Client Data Layer | always |
| `classes` | Style options | multiselect | all | no | — | stat-compact, dividers, header-center | Block classes | always |

**List Item** (Fixed list):

| Field | Label | Type | Required | Precedence / behaviour |
|---|---|---|---|---|
| `link` + `linkText` | Page or link, Link text | aem-content + text | yes | A page (its metadata), a path, or `https://…`; unsafe schemes (`javascript:`, `data:`) are skipped. Link text: the title when the page has none |
| `newTab` | Open in a new tab | select | no | As the list / yes / no |
| `headline` | Title | text | no | Overrides the page title |
| `summary` | Description | text | no | Overrides the page description |
| `image` + `imageAlt` | Image, Image alt text | reference + text | no | Overrides the page image; empty alt: decorative |
| `eyebrow` | Eyebrow | text | no | Overrides eyebrow / category |
| `tags` | Tags | aem-tag, multi | no | Overrides the page tags |
| `subtitle` | Label | text | no | Statistic cards: the label above the description |
| `ctaLabel` | Call to action label | text | no | Shows a call to action (the card's one link) |
| `kind` | Card style | select | no | As the list / image / panel / report / stat |
| `theme` | Card colour | select | no | As the list / a colour |
| `analyticsLabel` | Analytics label | text | no | `data-analytics-label`, data layer `dc:title` |
| `ariaLabel` | Accessibility label | text | no | The link's accessible name |

Precedence: Fixed: item override → the page's metadata → defaults. Child pages and tagged pages:
the page's metadata → defaults.

## Data flow

```
decorate(block)
  readBlockConfig()      property rows (key | value), List Item rows, or a list made before
  normalizeConfig()      defaults and clamped values
  getPages() + loadRedirects() (+ getAuthors() for the feature card)   in parallel, cached
  buildCards():
    parent  resolveParentPages()     -> normalizePageToCard()
    tags    resolveTagPages()        -> applyTagMatching() -> normalizePageToCard()
    fixed   resolveFixedItems()      -> normalizePageToCard() / link card -> applyOverrides()
    -> deduplicateCards() -> sortCards() -> limitCards() -> withIds()
  resolveTags()           tag labels (taxonomy)
  renderCardList()        header, feature card, <ul> of cards or rows, previous / next,
                          indicator, createScroller() (decorators/card-list-decorator.js)
  trackCardList()         data layer state; clicks: the data layer decorator
```

Rendering only uses the card model below; all text is set with `textContent` (no `innerHTML`).
One failing item never breaks the others: invalid items are skipped, a missing index lists no pages
and the empty state applies.

### Card model

```js
{
  id,                 // `${componentId}-item-${hash(dedupe key)}`, stable
  sourceType,         // parent | fixed | tags
  sourcePath,         // the page's published path ('' for external links)
  url,                // destination: redirect target for pages
  title, description,
  image, imageAlt,    // imageAlt '' = decorative
  eyebrow,
  tagIds, tags,       // tag IDs, labels (taxonomy)
  date, dateISO,      // formatted, YYYY-MM-DD
  lastModified,       // seconds: modified-date, else when last published (sorting)
  contentType, readingTime, authorId, subtitle,
  kind, theme,        // item display overrides
  ctaLabel, openInNewTab, external,
  analyticsLabel, accessibilityLabel,
}
```

Deduplication key: the destination path (without `.html`, query, hash and trailing slash) or the
full external URL, lower case. The first card with a key is kept.

## Page metadata contract

Columns in order of preference (`PAGE_MAPPING` in `list-data.js`, an extension point). Set them on
the page (page metadata) or in the locale's bulk metadata sheet.

| Card part | Metadata (meta name) |
|---|---|
| Title | `card-title`, else `og:title` (the page title) |
| Description | `card-description`, else `description` |
| Image | `card-image`, else `og:image` (but the site's default social image), `thumbnail-image`, `featured-image` |
| Image alt | `card-image-alt`, else `image-alt`; else decorative (`alt=""`, the title is next to it) |
| Eyebrow | `eyebrow`, else `category` |
| Tags | `article:tag` (page tags) |
| Date | `modified-date`, else `publish-date`, else when last published |
| Content type, reading time, author | `content-type`, `reading-time`, `author-id` (Authors sheet) |
| Hidden | `hide-in-nav` = yes: not listed |
| Link | the page path, or its redirect target from `/{locale}/redirects.json` |

## Query index contract

`helix-query.yaml` indexes (besides `path`, `title`, `description`, `image`, `tags`,
`lastModified`): `contentType`, `publishDate`, `modifiedDate`, `readingTime`, `thumbnailImage`,
`featuredImage`, `authorId`, and for the List `cardTitle`, `cardDescription`, `cardImage`,
`cardImageAlt`, `imageAlt`, `eyebrow`, `category`, `hideInNav`. A row:

```json
{
  "path": "/en/insights/agentic-bank",
  "title": "The agentic bank",
  "description": "Banking is entering a new era.",
  "image": "/default-meta-image.png",
  "tags": "[\"tcs:industry/banking\",\"tcs:topic/ai\"]",
  "contentType": "Article",
  "publishDate": "2026-09-04",
  "modifiedDate": "",
  "readingTime": "16",
  "thumbnailImage": "/en/media/agentic.jpg",
  "cardTitle": "", "cardDescription": "", "cardImage": "", "cardImageAlt": "",
  "eyebrow": "", "category": "", "hideInNav": "",
  "lastModified": "1790000300"
}
```

The index is read once per page (500 rows per request) and cached; the List filters it by path
and tags in the browser. No repository (JCR) queries run in the browser. The index excludes each
locale's references, error pages and data (see `helix-query.yaml`); unpublished pages aren't in it.

Redirects: `/{locale}/redirects.json` (`Source | Destination`), followed up to 5 hops, loops
stopped. The site's root `/redirects.json` is applied by the platform itself.

## Sorting and maximum items

| Order by | Pages (child, tags) | Fixed |
|---|---|---|
| Manual | Path order (deterministic: the repository order isn't in the index) | Authored order |
| Title | Locale-aware, numeric (`Intl.Collator`) | same |
| Last modified | `modified-date`, else when last published | same (external links: 0) |

Ties are broken by path. **Maximum items** applies after discovery, filtering, deduplication and
sorting; 0, empty or invalid values list all.

## Responsive scrolling

Breakpoints are the project's: mobile < 600px, tablet 600–1199px, desktop ≥ 1200px (Figma frames
402 / 1024 / 1440). Each breakpoint is independently a grid (`{bp}Columns`) or a horizontal
scroller (`{bp}Visible` or `{bp}CardWidth`), giving all eight combinations:

| Desktop | Tablet | Mobile | Example |
|---|---|---|---|
| grid | grid | grid | Variation 2, 11 |
| scroll | scroll | scroll | Variation 3, 8, 9 |
| scroll | grid | grid | wide screens only |
| grid | scroll | grid | tablet only |
| grid | grid | scroll | Variation 1, 4, 6, 10 |
| scroll | scroll | grid | |
| scroll | grid | scroll | |
| grid | scroll | scroll | |

The block gets `desktop-grid` / `desktop-scroll` (and tablet / mobile) classes, `{bp}-controls`,
`{bp}-indicator`, and `--list-{columns,gap,visible,card-width}-{bp}` custom properties; CSS does
the layout (`overflow-x: auto`, scroll snap, container units for the card width), so the list
scrolls without JavaScript. The scroller decorator only adds the buttons, indicator, drag and
keyboard while a breakpoint actually scrolls (and the cards don't fit), and recalculates on
resize and orientation changes (ResizeObserver). Hidden scrollbars, swipe off (`touch-action`),
edge bleed and reduced motion are classes. No carousel library and no auto-rotation.

## Figma to CSS

| Figma | CSS |
|---|---|
| Radius/L 16, Space/* | `--radius-l`, `--space-*` |
| Text/Default #0c0c0d, Secondary #999, Neutral #303030 | `--color-text-default`, `--color-text-secondary`, `--color-text-neutral` |
| Background/Brand #4673db, Brand hover #011627, Brand secondary #a7c8f1, Tertiary #d9d9d9 | `--color-bg-brand`, `--brand-600`, `--brand-300`, `--color-bg-tertiary` |
| #20293c, grey gradient | `--list-dark`, `--list-gradient` (no site token) |
| Headings 40/56 · 32/45 · 28/39, card titles 24 · 20 · 18, stat numbers 96 · 64 · 80 | `--list-*-size` per breakpoint (the site's type tokens step at 900px, Figma at 1200px) |
| Scroll indicator 4px, #ededed / #808080 | `--list-track`, `--list-thumb` |

| Variation | Configuration |
|---|---|
| 1 Themes | Panel, item colours (dark, brand, image), grid / grid / scroll + mobile indicator |
| 2 Insight & Opinion | Mixed, First card as feature, 1:1 images, CTA text link, grid 4 / 4 / 1 |
| 3 Related | Mixed, scroll everywhere, edge bleed |
| 4 Intelligence in Action | Image 1:1, description, 3 / 3 columns, mobile scroll |
| 5 News | Display as teaser off (rows of links), primary CTA, `dividers` |
| 6 At a glance / 10 Banking today | Statistic, grey / brand, mobile scroll |
| 7, 12 Statements | Statistic + `stat-compact`, 3 columns, items' CTA |
| 8 Media coverage / 9 Investor relations | Mixed, scroll everywhere (report cards: navy colour) |
| 11 2-up | Image 1:1, 2 / 2 / 1 columns |
| 13 4-up colours | Statistic, item colours (brand, gradient, mid-grey, brand-light) |
| 14 | Statistic (the old design's edge-to-edge row isn't reproduced: content width) |

## Accessibility

- `<ul>` / `<li>` list in a labelled region (the title, or Accessible list label); `<article>` cards;
  card headings one level below the list heading; `<time datetime>`.
- One link per card covering the card (the title, or the call to action when shown); no empty or
  broken links; new-tab links say "(opens in a new tab)" and have `rel="noopener noreferrer"`.
- Previous / next are `<button>`s with names (placeholders), `disabled` at the start / end (unless
  Loop), `aria-controls` the region. The scroller is focusable (`tabindex="0"`) only while it
  scrolls; arrow keys, Home and End scroll it; links inside stay reachable with Tab; nothing traps
  focus and updates never move focus.
- Visible focus rings; images `alt=""` unless an alt is set; reduced motion respected.

## Analytics (Adobe Client Data Layer)

With Analytics on, entries go to `window.adobeDataLayer` (the standard array; Launch processes
entries pushed before it loads), following the Core Components data layer:

```js
{ component: {
  'list-1': { '@type': 'tcs-corp/components/list', 'dc:title': 'Media Coverage', 'xdm:listSource': 'tags', 'xdm:variant': 'mixed' },
  'list-1-item-hxobwp': { '@type': 'tcs-corp/components/list/item', parentId: 'list-1', 'dc:title': '…', 'xdm:linkURL': '/en/…', 'xdm:position': 1, 'repo:modifyDate': '2026-09-04' },
} }
{ event: 'cmp:click', eventInfo: { path: 'component.list-1-item-hxobwp', interaction: 'card', position: 1, 'dc:title': '…', 'xdm:linkURL': '…', 'xdm:linkType': 'other', breakpoint: 'desktop' } }
{ event: 'cmp:click', eventInfo: { path: 'component.list-1', interaction: 'next', 'dc:title': 'Next items', 'xdm:linkType': 'other', breakpoint: 'desktop' } }
```

The list pushes its own component state (`data-analytics="custom"`); the clicks (cards, header
CTA, previous / next) are captured by the site-wide data layer
(`decorators/data-layer-decorator.js`) from the `data-cmp-id`, `data-cmp-interaction` and
`data-cmp-position` attributes. With Analytics off the list is `data-analytics="off"`: no state
and no events.

Pushes are wrapped so an analytics error never breaks rendering or links. No repository details
are exposed.

## Empty states and failures

| Case | Behaviour |
|---|---|
| No parent / root and Use current page off; tags source without tags; fixed list without items | Editor: a message naming the problem; published: the empty behaviour |
| No matching pages, missing parent page, index missing or failing | Empty behaviour: hide the list, the message (Empty message, else placeholder `listEmpty`), or the List Items as fallback |
| In the editor (no index on author) | "The pages show on the published page" |
| Invalid / unsafe link, item without a title | That item is skipped |
| Duplicate items | Kept once |
| Missing image, description, date, tags | The part isn't rendered |
| Invalid date | No date |
| Invalid maximum items or responsive values | Defaults |
| Duplicate Component ID | Suffixed (`fixed-1`) |
| Debugging | `?debug=list` logs the configuration and cards (`console.debug`) |

## Placeholders

`listPrevious` (Previous items), `listNext` (Next items), `opensInNewTab` ((opens in a new tab)),
`explore` (Explore), `download` (Download), `listEmpty` (There are no items to show.),
`listEditorHint` (Set up the list in its properties: {problems}.), `listEditorPages` (The pages
show on the published page (from the query index).), `minutesShort` ({n}m), `list` (List).

## Backward compatibility

Lists made before this version (a title and a CTA, positional rows, no key-value) render as before
(`list-legacy`): no items, the same header. New fields have defaults; responsive modes default to
grid on every breakpoint, so no list starts scrolling unless authored. The `title`, `titleType`,
`link`, `linkText` and `linkType` fields keep their names.

## Extension points

- `PAGE_MAPPING` (metadata columns per card part) in `list-data.js`; `RESPONSIVE_DEFAULTS`,
  `CARD_THEMES` in `utils/card-list-config.js` (List and Cards).
- New card kinds: `kindOf()` (`utils/card-list-config.js`) and `renderCard()`
  (`decorators/card-list-decorator.js`), for both blocks; new data sources: a `resolve…()`
  returning index pages or cards, added to `buildCards()`.
- `createScroller()` is a shared decorator usable by other blocks.

## Known limitations

- Content Fragment lists aren't supported (by decision).
- Child pages and tagged pages come from the query index: unpublished, excluded or not yet
  indexed pages aren't listed, and manual order is the path order.
- Tag matching includes child tags; there's no full-text search (by design).
- In the Universal Editor the index isn't available, so pages show on the published page.
- Statistic cards' "bn"-style smaller units in one title (Figma) aren't styled separately.
- Figma's two-tone title (Variation 6) isn't an option; use the title as one colour.

## Tests

`npm test` runs `test/list/list-data.test.mjs` (Node's test runner, no dependencies): sources
(parent with current page, explicit parent, depths; fixed internal, external, new tab, overrides,
order; tags any / all / none / depth / current page), page metadata and fallbacks, redirects,
deduplication, sorting (title and last modified, both orders, manual), maximum items (set, empty,
invalid), ids, card kinds and the eight responsive combinations. Rendering, scrolling,
accessibility and analytics are checked in the browser (see the pull request).
