---
title: "Cards and Card — Refactoring Proposal"
subtitle: "Restoring the Cards container pattern and extending the Card item (AEM Edge Delivery Services, xwalk)"
date: "October 14, 2026"
---

# Cards and Card — Refactoring Proposal

| Attribute | Value |
|---|---|
| Status | Proposal for review (no code changed) |
| Date | 14 October 2026 |
| Scope | `blocks/cards` (Cards container and Card item), shared card list code, related blocks (List, Filter List, Gen Carousel) |
| Baseline | `main` after pull request #63 (Cards rebuilt in #62) |
| Decisions needed | Section 21 |

## 1. Current State Analysis

### 1.1 What the code implements today

The Cards block was rebuilt in pull request #62 as the manual authoring alternative to the List
block. Verified in the repository:

| Aspect | Today (verified) |
|---|---|
| Container | `cards` definition (`core/franklin/components/block/v1/block`), model `cards`, filter `cards`, `key-value: true` |
| Items | `card` definition (`…/block/v1/block/item`), model `card`; the `cards` filter allows only `card`; the section filter doesn't list `card` (it can't be added outside Cards) |
| Container fields | 78 entries in 6 tabs (Content, Cards, Layout, Scroll, Advanced, Additional), mostly the shared groups of `models/_card-list.json` |
| Card fields | 18: image, imageAlt, eyebrow, title, text (rich text), subtitle, tags, date, contentLabel, readingTime, link, linkText, ctaLabel, newTab, kind, theme, analyticsLabel, ariaLabel |
| Rendering | `decorators/card-list-decorator.js` (shared with List): image / panel / report / statistic cards, a feature card, rows of links; grid or horizontal scroll per breakpoint; `styles/card-list.css` |
| Data | `blocks/cards/cards-data.js`: authored items into the card model, authored order |
| Cards made before #62 | Rows of `image | rich text` still render (heading or bold first line = title, a link alone = call to action) — but with the new Figma List design |

So the **container / item structure exists in the code**: a Cards block holds Card items, and an
author adds them with the **+** of the Cards block in the content tree. What changed is (a) the
container is now a key-value block with a large presentation dialog, (b) the presentation is the
Figma List design instead of the original bordered grid, and (c) item content moved from one rich
text cell into separate fields.

### 1.2 Why authors experience the original capability as lost

Three verified causes, plus one that must be confirmed in Universal Editor:

| # | Cause | Evidence | Effect for authors |
|---|---|---|---|
| C-1 | **Cards created before #62 have no block model.** The original definition's template was `{ name, filter }` — no `model`, no `key-value`. Universal Editor stores the template on the instance when the block is created; existing instances keep it | `git show 24cea2a:blocks/cards/_cards.json` | Existing Cards blocks show no (or no usable) block properties; the new settings can't be applied to them |
| C-2 | **The original look was replaced.** Existing Cards now render with the Figma List cards (4 / 4 / 1 columns, card-list styles) instead of the original bordered auto-fill grid | `blocks/cards/cards.css` imports `styles/card-list.css`; the original rules (`grid-template-columns: repeat(auto-fill, minmax(16.0625rem, 1fr))`, bordered `li`) are gone | Pages built with the original Cards changed appearance without an author action |
| C-3 | **The item's content model changed.** Originally one rich text cell (heading, text, link). Now title, description, link and call to action are separate fields; old rich text is interpreted (first heading = title, last lone link = CTA) | `blocks/cards/cards.js` `readLegacyText` | Editing an old card in the new dialog is confusing: the title appears in Description, not in Title |
| C-4 | **To confirm in Universal Editor:** adding Card items to a key-value container | The pattern is documented ("a container block could have key-value properties at the block level, with simple or structured child items") and used by List; not verified in this program's editor | If the **+** doesn't offer Card in this environment, authors can't add cards to new Cards blocks |

C-1 to C-4 are recorded in the project handover (`docs/handover/TCS-CORP-HANDOVER.md`, version 1.1) as
findings F-34, F-41, F-42 and open item O-20, and in chapter 6.15 (Issues 6 and 11).

> **Important:** Before implementation, confirm C-4 in Universal Editor on a test page: add a new
> Cards block, select it in the content tree, use **+**, and check that **Card** is offered and its
> dialog opens. The recommended architecture works either way, but the migration priority differs.

### 1.3 Related capabilities that already exist

Many requested features exist in other blocks or shared modules and must be reused, not rebuilt:

| Requested | Exists in | Module |
|---|---|---|
| Grid, horizontal scroll per breakpoint, arrows, scroll indicator, loop | List, Cards | `decorators/scroller-decorator.js`, `decorators/card-list-decorator.js` |
| Featured layout (first card large) | List, Cards (First card as feature); Filter List (hero and spotlight) | card list decorator; `blocks/filter-list` |
| Masonry | Filter List | `decorators/masonry-decorator.js` |
| Carousel with autoplay, dots, pause | Gen Carousel (section of Hero / Teaser slides) | `blocks/gen-carousel` (not shared yet) |
| Child pages, tags based retrieval, dynamic query | List (parent, tags, fixed), Filter List (root path, page / content types) | `blocks/list/list-data.js`, `utils/query-index.js` |
| Filters (tag pills, advanced panel), sorting, load more | Filter List | `blocks/filter-list` (not shared yet) |
| Vertical list | List, Cards (Display as teaser off: rows of links) | card list decorator |

## 2. Impact Assessment

| Area | Impact | Severity |
|---|---|---|
| Existing pages with original Cards | Changed appearance (C-2); settings not editable (C-1) | High |
| Authors | Confusion between Title / Description for old cards (C-3); large container dialog (78 entries) | Medium |
| New Cards blocks | Work as designed, if C-4 is confirmed | Low / to confirm |
| List block | None (shares presentation; protected by the parity baseline) | None |
| Analytics | Card clicks lack `position` (finding F-04 of the handover) | Medium |
| SEO, performance | None today; dynamic sources and filtering add index loading (lazy phase) | Low |
| Accessibility | Today compliant; carousel autoplay and filters add requirements (section 20) | Medium for new features |

## 3. Gap Analysis

### 3.1 Cards (container)

| Requirement | Today | Gap | Proposed solution |
|---|---|---|---|
| Presentation: Grid | Yes (columns per breakpoint) | — | Keep |
| Presentation: Horizontal Scroll | Yes | — | Keep |
| Presentation: Carousel | No (scroll with arrows only) | Autoplay, dots, one view at a time | Shared `carousel-decorator` (from Gen Carousel) on the scroller |
| Presentation: Vertical List | Partly (rows of links) | Vertical list of full cards (image left, text right) | New `list` presentation style |
| Presentation: Masonry | No (Filter List only) | Masonry layout | Reuse `masonry-decorator` |
| Presentation: Featured Layout | Partly (first card as feature) | Featured + grid arrangements | `featured` presentation: 1 large + N small (Figma variation 2) |
| Presentation: Classic (original) | No (removed) | The original look | Restore as `classic` presentation, default for blocks made before |
| Source: Manual Authoring | Yes | — | Keep (default) |
| Source: Child Pages | List only | — | Reuse List discovery (shared module) |
| Source: Tags Based Retrieval | List only | — | Reuse List discovery |
| Source: Dynamic Query | Filter List (root, page / content types) | — | Reuse: root path + page types + content types + sort |
| Source: Related Content | No | Pages sharing the current page's tags | New resolver in the shared discovery module |
| Layout: cards per row / per view per breakpoint | Yes (columns, items visible) | Naming | Relabel to "Cards per row" / "Cards per view" |
| Container: title, description | Yes | — | Keep |
| Container: background style, theme | Partly (section style, card colour) | Container background and theme | New container fields (Background, Theme) |
| Container: spacing | Yes (Additional tab) | — | Keep |
| Container: alignment | Partly (header centred option) | Alignment of header and cards | New Alignment select |
| Scroll: enable / disable scroll | Yes (mode per breakpoint) | — | Keep |
| Scroll: carousel, auto scroll, dots | No | — | Carousel decorator |
| Scroll: arrows, infinite loop | Yes | — | Keep |
| Filtering: filters, sorting, tag selection, search | No (Filter List only) | — | Shared `card-filter-decorator` from Filter List, client side |

### 3.2 Card (item)

| Requirement | Today | Gap | Proposed field |
|---|---|---|---|
| Title | `title` | — | Keep |
| Description | `text` (rich text) | — | Keep (name kept for compatibility) |
| Eyebrow | `eyebrow` | — | Keep |
| Thumbnail Image | `image` (+ `imageAlt`) | Label | Keep the name, label "Thumbnail image" |
| Background Image | No (card colour Image uses the same image) | Separate background | `backgroundImage` (+ `backgroundImageAlt`) |
| CTA Label | `ctaLabel` | — | Keep |
| CTA Link | `link` (+ `linkText`) | — | Keep |
| CTA Style | No (derived from the card style) | Author choice | `classes_ctastyle` (default / primary / secondary / tertiary / link) |
| Date | `date` | — | Keep |
| Author | No | — | `author` (text) or `authorId` (Authors sheet) |
| Tags | `tags` | — | Keep |
| Category | Partly (`contentLabel` = content type) | — | `category` (text) |
| Badge | No | — | `badge` (text, e.g. New) |
| Status | No | — | `classes_status` (none / new / updated / featured / archived) |
| Icon | No | — | `icon` (select of `/icons`) |
| Analytics attributes | `analyticsLabel` | Event / component name | Keep; add `analyticsId` |
| Personalization attributes | No | — | `audience` (multi, segments) and `experienceId` (text) |

## 4. Recommended Target Architecture

```text
Section
 └── Cards (container block, key-value properties)            blocks/cards
      │  Source ─────────── manual | child pages | tags | query | related
      │  Presentation ───── classic | grid | scroll | carousel | list | masonry | featured
      │  Layout ─────────── per breakpoint: cards per row / per view, gap
      │  Display ────────── show image, eyebrow, tags, description, date, CTA, ...
      │  Filtering ──────── filters, sorting, tag selection, search
      │  Container ──────── title, description, CTA, background, theme, alignment
      ├── Card (item)  content, link and CTA, display, analytics, personalization
      ├── Card (item)
      └── Card (item)  ... N

Rendering pipeline (shared code, used by Cards and List):
  read (block)  ->  source (utils/card-sources.js)  ->  card model
    -> filter / sort (utils/card-filters.js)  ->  arrange (featured)
    -> render (decorators/card-list-decorator.js + presentation decorators)
    -> track (decorators/data-layer-decorator.js)
```

Principles:

1. **Cards is the container, Card is the item** (xwalk container block: definition + item
   definition + filter). Card stays an item (`block/v1/block/item`), not a standalone block — a
   single promotional card is the Teaser block.
2. **One implementation per capability**: discovery, filtering, carousel and masonry move to shared
   modules used by Cards, List, Filter List and Gen Carousel.
3. **Additive content model**: existing field names stay; new fields are optional; defaults keep
   today's rendering.
4. **Presentation decided by the container, content by the item**; the item may override style and
   colour only (as today).

## 5. Component Responsibility Matrix

| Responsibility | Cards (container) | Card (item) | Shared code |
|---|---|---|---|
| Section title, description, header CTA | Owns | — | `buildCardListHeader` |
| Source selection and query | Owns | — | `utils/card-sources.js` |
| Collection of cards (order, limit) | Owns | Position in the content tree | — |
| Presentation type | Owns | — | presentation decorators |
| Layout per breakpoint | Owns | — | `applyCardListLayout` |
| Scrolling, carousel, arrows, dots, loop, autoplay | Owns | — | `scroller-decorator`, `carousel-decorator` |
| Filtering, sorting, tag selection, search | Owns | Provides tags, category, date | `utils/card-filters.js`, `card-filter-decorator` |
| Display switches (show image, date, ...) | Owns | — | `normalizePresentation` |
| Background, theme, alignment of the block | Owns | — | `styles/card-list.css` |
| Title, description, eyebrow, images, icon | — | Owns | `renderCard` |
| Link and call to action, CTA style | — | Owns | `renderCard`, button decorator |
| Date, author, category, badge, status, tags | — | Owns | `renderCard`, taxonomy, Authors sheet |
| Card style and colour | Default | Override | `kindOf` |
| Analytics attributes | Block id and variant | Card label and id | data layer decorator |
| Personalization attributes | Optional default audience | Owns | data attributes (Target-ready) |
| Accessibility names | List label, region | Accessibility label | decorators |

## 6. Refactoring Strategy

| Phase | Content | Risk | Size |
|---|---|---|---|
| 0 Stabilise | Confirm C-4 in Universal Editor; restore the original look as the `classic` presentation, used automatically for Cards blocks made before #62; migration script for old instances (section 7) | Low | S |
| 1 Card item | Add Background image, Author, Category, Badge, Analytics ID, Experience ID (cells 17–22) and CTA style, Status, Icon, Audience (`classes_*`, no cells); relabel Image as Thumbnail | Low (additive) | M |
| 2 Container dialog | Reorganise tabs (Content, Source, Presentation, Layout, Scroll & Carousel, Filtering, Display, Advanced, Additional); conditional fields per presentation and source | Medium (dialog only) | M |
| 3 Presentations | `classic`, `list` (vertical cards), `masonry` (shared decorator), `featured`, `carousel` (shared carousel decorator from Gen Carousel: autoplay, dots, pause) | Medium | L |
| 4 Sources | Move List discovery into `utils/card-sources.js` (no List change: parity baseline); add `related` and `query`; Cards uses manual items as overrides for dynamic sources | Medium | L |
| 5 Filtering | Extract Filter List filtering into `utils/card-filters.js` and `decorators/card-filter-decorator.js`; client side filters, sort, tag selection, search for Cards | Medium | L |
| 6 Analytics | Fix card `position`; events for filter, sort, search, carousel slide | Low | S |

Each phase is one pull request with: unit tests (pure modules), a List parity check (the geometry
baseline used in #62), browser checks at 1440 / 1024 / 402, lint, PageSpeed.

## 7. Migration Approach

### 7.1 Content generations

| Generation | How to recognise it (published markup) | Count | Treatment |
|---|---|---|---|
| G1 — original Cards (before #62) | Block rows with 1–2 cells (image, rich text); no key-value rows | [To be confirmed: run the inventory query] | Render with `classic`; migrate instances (7.2) to enable the dialog |
| G2 — Cards of #62 | Key-value rows + Card rows with 16 cells | New pages since 13 October 2026 | Keep; new fields are additive |
| G3 — target | As G2 plus new rows / cells | — | — |

### 7.2 Migrating G1 instances (enables the block dialog)

1. **Inventory** — find Cards components without a model under `/content/tcs-corp`:
   query `sling:resourceType = core/franklin/components/block/v1/block` and `name = Cards`
   and no `model` property (AEM Query Builder or a Groovy console script, run by AMS).
2. **Update** — for each node set `model = cards`, `key-value = true`, and
   `presentation = classic` (keeps the original look); don't touch the child Card nodes.
3. **Republish** the affected pages (bulk publish).
4. **Verify** — the page renders the same (classic); the block dialog opens in Universal Editor.
5. **Optional editorial step** — move each old card's heading from Description into Title.

> **Note:** Without step 2 the G1 blocks still render (classic look), but their settings can't be
> edited. The code never depends on the migration.

### 7.3 Code migration rules

- Field names `image`, `text`, `link`, `ctaLabel`, `kind`, `theme` stay (stored content).
- New selects use `classes_*` names, so they don't add cells (item rows stay positional-safe).
- `readCard` keeps the 1–2 cell path (G1) and the `matchCells` path (G2 / G3) with matchers for the
  new cells.

## 8. Backward Compatibility Considerations

| Concern | Rule |
|---|---|
| G1 rendering | Blocks without key-value rows render `classic` (the original bordered auto-fill grid); no visual change from before #62 |
| G2 rendering | Defaults of every new field reproduce today's rendering (presentation `grid`, source `manual`, filtering off) |
| Removed fields | None; deprecated names are still read |
| List block | Shared modules change behind unchanged List output (parity baseline) |
| Analytics ids | `cards-N` / `cards-N-item-M` unchanged; new events only add data |
| CSS classes | `card-list`, `list-*` classes unchanged; new presentations add classes |
| Placeholders | New keys with English fallbacks |

## 9. Authoring Experience Design

Goals: an author creates a working Cards block with two decisions (Source, Presentation) and only
sees the fields that apply.

| Step | Author does | Dialog shows |
|---|---|---|
| 1 | Adds **Cards** to a section | Content tab: Title, Description, CTA |
| 2 | Chooses **Source** (default Manual) | Manual: hint to add Card items; dynamic: path, tags, page types, sort, max |
| 3 | Chooses **Presentation** (default Grid) | Only the layout and scroll fields of that presentation |
| 4 | Adds **Card** items with **+** (manual) or as pinned overrides (dynamic) | Card dialog: Content, Media, Link, Meta, Display, Tracking tabs |
| 5 | Optional: Filtering, Display, Container style | Switches; filter fields only when Enable filters is on |
| 6 | Previews at desktop / tablet / mobile | — |

Editor behaviour: dynamic sources show a hint ("cards from the query index show on the published
page") plus the manual Card items; hidden or empty cards are shown dimmed with a reason.

## 10. Universal Editor Authoring Model

```text
Section (filter: section)
 └─ Cards            definition id: cards   model: cards   filter: cards   key-value: true
     ├─ Card         definition id: card    model: card    (item)
     └─ Card         ...
```

| Element | Definition | Notes |
|---|---|---|
| Cards | `core/franklin/components/block/v1/block`, template `{ name: Cards, model: cards, filter: cards, key-value: true, source: manual, presentation: grid, … defaults }` | Defaults keep the dialog simple |
| Card | `core/franklin/components/block/v1/block/item`, template `{ name: Card, model: card }` | Only inside Cards (filter) |
| Filter `cards` | `components: [card]` | Unchanged |

## 11. Block Structure Definition

Published markup received by `cards.js` (key-value rows, then Card rows):

```html
<div class="cards block">
  <div><div>title</div><div><p>Insights</p></div></div>
  <div><div>source</div><div>manual</div></div>
  <div><div>presentation</div><div>carousel</div></div>
  <!-- … more key-value rows … -->
  <div>                                   <!-- Card (cells in model order) -->
    <div><picture>…thumbnail…</picture></div>
    <div><picture>…background…</picture></div>
    <div>arrow-right</div>                <!-- icon -->
    <div>Perspective</div>                <!-- eyebrow -->
    <div>The agentic bank</div>           <!-- title -->
    <div><p>Banking is entering…</p></div><!-- text -->
    <!-- … badge, category, author, date, tags, link, ctaLabel, … -->
  </div>
</div>
```

Card `classes_*` selects (CTA style, status) arrive as classes of the Card row (not cells).

## 12. Content Model Definition

### 12.1 Cards (container) — tabs and fields

| Tab | Field (name) | Type | Default | Shown when | New / existing |
|---|---|---|---|---|---|
| Content | Title (`title`), Heading type (`titleType`) | text, select | —, h2 | always | existing |
| Content | Description (`description`) | richtext | — | always | existing |
| Content | CTA link, text, style (`link`, `linkText`, `linkType`) | aem-content, text, select | — | always | existing |
| Content | Alignment (`alignment`) | select: start, center | start | always | new |
| Source | Card source (`source`) | select: manual, child-pages, tags, query, related | manual | always | new (List values reused) |
| Source | Parent page (`parentPath`), Child depth (`childDepth`) | aem-content, number | current page, 1 | source = child-pages | from List |
| Source | Tags (`tags`), Match (`tagMatch`) | aem-tag multi, select any / all | —, any | source = tags | from List |
| Source | Search root (`rootPath`), Page types (`pageTypes`), Content types (`contentTypes`) | aem-content, multiselect, multiselect | locale root | source = query | from Filter List |
| Source | Related by (`relatedBy`) | select: all tags, first tag, category | all tags | source = related | new |
| Source | Order by (`orderBy`), Sort order (`sortOrder`), Maximum cards (`maxItems`) | select, select, number | manual / date, desc, 12 | source ≠ manual (order also manual) | from List |
| Source | Pinned cards first (`pinnedFirst`) | boolean | on | source ≠ manual | new: Card items as pinned / override cards |
| Presentation | Presentation (`presentation`) | select: grid, carousel, horizontal-scroll, vertical-list, masonry, featured, classic | grid | always | new |
| Presentation | Card style (`cardStyle`), Card colour (`cardTheme`), Image ratio, Panel height | selects | image, —, 16:9, portrait | not classic | existing (shared) |
| Presentation | Featured cards (`featuredCount`) | number 1–3 | 1 | presentation = featured | new |
| Layout | Desktop / Tablet / Mobile cards per row (`{bp}Columns`) | number 1–6 | 4 / 3 / 1 | grid, masonry, featured | existing (relabelled) |
| Layout | Desktop / Tablet / Mobile cards per view (`{bp}Visible`) | number 1–8 | 3.2 / 2.2 / 1.1 | carousel, horizontal-scroll | existing (relabelled) |
| Layout | Mobile layout (`mobileMode`), Tablet layout, Desktop layout | select: as presentation, grid, scroll | as presentation | always | existing (generalised) |
| Layout | Gap per breakpoint (`{bp}Gap`) | number | 24 / 24 / 16 | always | existing |
| Scroll & Carousel | Navigation arrows (`{bp}Controls`), Scroll indicator | booleans | off | scroll / carousel | existing |
| Scroll & Carousel | Pagination dots (`dots`) | boolean | on | carousel | new |
| Scroll & Carousel | Auto scroll (`autoplay`), Interval seconds (`autoplayInterval`) | boolean, number 3–15 | off, 6 | carousel | new |
| Scroll & Carousel | Infinite loop (`loop`), Snap, Drag, Swipe, Keyboard | booleans | off, on… | scroll / carousel | existing |
| Filtering | Enable filters (`enableFilters`) | boolean | off | always | new |
| Filtering | Filter by (`filterTags`) | aem-tag multi (pill tags; empty: the cards' tags) | — | filters on | new |
| Filtering | Tag selection (`tagSelection`) | select: single, multiple | single | filters on | new |
| Filtering | Enable sorting (`enableSorting`), Sort options | boolean, multiselect: date, title | off | always | new |
| Filtering | Enable search (`enableSearch`) | boolean | off | always | new |
| Display | Show image / eyebrow / tags / description / date / CTA / badge / author | booleans | on | always | existing + new (badge, author) |
| Display | Date format (`dateFormat`), Image loading | selects | dd-mmm-yy, lazy | always | existing |
| Container style | Background (`background`) | select: none, grey, dark, brand, image | none | always | new |
| Container style | Background image (`backgroundImage`) | reference | — | background = image | new |
| Container style | Theme (`theme`) | select: light, dark | light | always | new |
| Advanced | When there are no cards, Empty message, Analytics, Style options, Component ID | existing | hide | always | existing |
| Additional | Anchor ID, Hide block, padding, margin | existing | — | always | existing |

### 12.2 Card (item) — tabs and cells

Cells keep their current positions (1–16) so stored content stays positional-safe; new cells are
appended (17–22). `classes_*` fields (CTA style, Status, Icon, Audience) arrive as classes of the
Card row and the `…Alt` / `…Text` fields belong to their image or link cell, so none of them adds a
cell. The dialog groups fields by tab independently of the cell order.

| Tab | Field (name) | Type | Cell | Existing / new |
|---|---|---|---|---|
| Media | Thumbnail image (`image`, `imageAlt`) | reference + text | 1 | existing name, new label |
| Content | Eyebrow (`eyebrow`) | text | 2 | existing |
| Content | Title (`title`) | text | 3 | existing |
| Content | Description (`text`) | richtext | 4 | existing name |
| Content | Label (`subtitle`) | text | 5 | existing (statistic label) |
| Meta | Tags (`tags`) | aem-tag multi | 6 | existing |
| Meta | Date (`date`) | date | 7 | existing |
| Meta | Content type (`contentLabel`) | text | 8 | existing |
| Meta | Reading time (`readingTime`) | text | 9 | existing |
| Link | Link (`link`, `linkText`) | aem-content + text | 10 | existing |
| Link | CTA label (`ctaLabel`) | text | 11 | existing |
| Link | Open in a new tab (`newTab`) | select | 12 | existing |
| Display | Card style (`kind`) | select | 13 | existing |
| Display | Card colour (`theme`) | select | 14 | existing |
| Tracking | Analytics label (`analyticsLabel`) | text | 15 | existing |
| Tracking | Accessibility label (`ariaLabel`) | text | 16 | existing |
| Media | Background image (`backgroundImage`, `backgroundImageAlt`) | reference + text | 17 | new |
| Meta | Author (`author`) | text (a name, or an Author ID of the Authors sheet) | 18 | new |
| Meta | Category (`category`) | text | 19 | new |
| Meta | Badge (`badge`) | text, e.g. New | 20 | new |
| Tracking | Analytics ID (`analyticsId`) | text | 21 | new |
| Tracking | Experience ID (`experienceId`) | text (Target / Journey Optimizer reference) | 22 | new |
| Link | CTA style (`classes_ctastyle`) | select: auto, primary, secondary, tertiary, link | class | new |
| Display | Status (`classes_status`) | select: none, new, updated, featured, archived | class | new |
| Media | Icon (`classes_icon`) | select of the `/icons` set (e.g. icon-arrow-right) | class | new |
| Tracking | Audience (`classes_audience`) | multiselect of segments | class | new |

> **Note:** The item then has 22 cells (the lint limit for `card` is 16 today). Options: raise the
> limit to 22 as a documented exception (as `list-item` has 13), or merge Analytics ID and
> Experience ID into one "Tracking attributes" field (`key=value` lines, 21 cells). Recommendation:
> raise the limit; the tabbed dialog keeps the item readable.

## 13. Metadata Mapping

For dynamic sources a card is built from the page's metadata (existing `PAGE_MAPPING`, extended):

| Card part | Manual (Card field) | Dynamic (page metadata, in order) |
|---|---|---|
| Title | `title` | `card-title`, `og:title` |
| Description | `text` | `card-description`, `description` |
| Eyebrow | `eyebrow` | `eyebrow`, `category` |
| Thumbnail image | `image` | `card-image`, `thumbnail-image`, `og:image` (not the default image) |
| Background image | `backgroundImage` | `featured-image` |
| Date | `date` | `modified-date`, `publish-date` |
| Author | `author` | `author`, else `author-id` (Authors sheet) |
| Category | `category` | `category` |
| Content type | `contentLabel` | `content-type` |
| Tags | `tags` | page tags (`article:tag`; see handover finding F-07) |
| Badge | `badge` | `badge` (new column) |
| Status | `classes_status` | `status` (new column) |
| Link | `link` | page path (redirects applied) |
| Hidden | — | `hide-in-nav` = yes |

A pinned Card item whose Link is an indexed page overrides that page's card (the List's fixed-item
behaviour). New index columns: `badge`, `status` (helix-query.yaml).

## 14. Rendering Flow

```text
decorate(block)
 1 readBlock()            key-value rows -> raw settings; Card rows -> items (G1: 1-2 cells)
 2 normalize()            normalizePresentation() + source + presentation + filtering defaults
 3 classic?               G1 block (no settings) or presentation = classic -> renderClassic()
 4 cards = source === manual
         ? buildManualCards(items)
         : mergePinned(items, resolveSource(config, pages))   (utils/card-sources.js)
 5 resolveTags(), authors (Authors sheet) as needed
 6 arrange               featured split; sort; limit
 7 applyCardListLayout()  classes and custom properties per breakpoint
 8 render                header -> filters (if on) -> presentation:
                            grid | scroll | list | masonry | featured -> renderCardList()
                            carousel -> renderCardList() + createCarousel()
 9 filters               card-filter-decorator: filter / sort / search re-render the list
10 track                 trackCardList(); events for filters, sort, search, slides
```

Loading: Cards in the first section render eagerly with manual content; dynamic sources load the
query index in the block (lazy phase for later sections).

## 15. Business Rules

1. Source defaults to Manual; Presentation defaults to Grid (Classic for G1 blocks).
2. Manual: cards in the content tree order; dynamic: Order by, then Maximum cards (default 12, 1–50).
3. Pinned Card items come first for dynamic sources (Pinned cards first on) and are not repeated.
4. A card needs a title, a description or an image; unsafe links (`javascript:`, `data:`) are skipped.
5. A card without a link isn't linked; a card without a title is linked only through its CTA.
6. The CTA style of a card overrides the default of its card style; Auto keeps today's behaviour.
7. Status Archived cards are hidden on the page and shown dimmed in the editor.
8. Badge shows only when Show badge is on and the card has a badge.
9. Carousel: autoplay only when Auto scroll is on, never with reduced motion, paused on hover / focus
   and with the pause button; interval 3–15 s.
10. Dots: one per view (page of cards), not per card.
11. Masonry keeps the reading order across columns (shared masonry decorator).
12. Featured: the first `featuredCount` cards are large; the rest follow in the grid.
13. Filters: pills from Filter by tags, else the tags of the loaded cards (max 12); single or
    multiple selection; AND within a filter group; result count announced.
14. Search: case-insensitive match in title, description, eyebrow and tags; min 2 characters.
15. Sorting: date (newest first) or title (A–Z); manual order when no sort is chosen.
16. Empty result after filtering: message with a Reset button; empty block: as the empty behaviour.
17. Personalization: Audience values become `data-audience` on the card; no hiding by audience
    until a personalization service is connected.
18. Dynamic sources in the editor: a hint plus the pinned items.

## 16. Technical Design

| Module | Change | Users |
|---|---|---|
| `blocks/cards/cards.js` | Reads the new settings; source and presentation dispatch; classic renderer for G1 | Cards |
| `blocks/cards/cards-data.js` | New item fields; pinned / override merge | Cards |
| `utils/card-sources.js` (new) | Discovery moved from `blocks/list/list-data.js` (parent, tags, fixed) + `query`, `related` | List, Cards |
| `utils/card-list-config.js` | Presentation, filtering, carousel settings | List, Cards |
| `utils/card-filters.js` (new) | Pure filter / sort / search (from Filter List) | Cards, Filter List |
| `decorators/card-list-decorator.js` | Badge, status, icon, author, background image, CTA style; vertical list and featured arrangements | List, Cards |
| `decorators/carousel-decorator.js` (new) | Autoplay, dots, pause / play, slide announcements, on top of the scroller | Cards, Gen Carousel |
| `decorators/card-filter-decorator.js` (new) | Filter pills, sort select, search field, result count | Cards, Filter List |
| `decorators/masonry-decorator.js` | Reused unchanged | Filter List, Cards |
| `styles/card-list.css` | Presentations (classic, list, masonry, featured, carousel), badge, status, container background and theme | List, Cards |
| `models/_card-list.json` | New shared groups: source, presentation, carousel, filtering | List (subset), Cards |
| `.eslintrc.js` | `card` max-cells 22 | — |
| `helix-query.yaml` | `badge`, `status` columns | — |

Testing: unit tests for `card-sources`, `card-filters`, `cards-data`; List parity baseline; browser
checks for each presentation at three widths; Universal Editor check of the dialogs.

## 17. Folder Structure

```text
blocks/cards/
  _cards.json            Cards and Card definitions, models (spreads models/_card-list.json)
  cards.js               read, dispatch, classic renderer
  cards-data.js          items -> card model, pinned merge (pure)
  cards.css              imports styles/card-list.css; classic rules
  README.md
blocks/list/             unchanged behaviour; discovery imported from utils/card-sources.js
decorators/
  card-list-decorator.js   cards, rows, feature, layout (extended)
  carousel-decorator.js    new (shared with gen-carousel)
  card-filter-decorator.js new (shared with filter-list)
  masonry-decorator.js     reused
  scroller-decorator.js    reused
utils/
  card-list-config.js      settings (extended)
  card-sources.js          new: discovery
  card-filters.js          new: filtering
models/_card-list.json     shared field groups (extended)
styles/card-list.css       shared presentation (extended)
test/cards/, test/list/, test/card-sources/, test/card-filters/
```

## 18. JSON / Data Structure

### 18.1 Card model (runtime)

```json
{
  "id": "cards-1-item-2",
  "sourceType": "manual",
  "url": "/en/insights/agentic-bank",
  "title": "The agentic bank",
  "body": "<rich text element>",
  "description": "Banking is entering a new era.",
  "image": "/en/media_1a2b.jpeg", "imageAlt": "",
  "backgroundImage": "", "icon": "arrow-right",
  "eyebrow": "Perspective", "category": "Banking", "badge": "New", "status": "new",
  "author": "Jane Doe", "date": "04 Sep 26", "dateISO": "2026-09-04",
  "tagIds": ["tcs-corp:industry/banking"], "tags": ["Banking"],
  "ctaLabel": "Read more", "ctaStyle": "secondary", "openInNewTab": false,
  "kind": "", "theme": "",
  "analyticsLabel": "", "analyticsId": "", "audience": ["cfo"], "experienceId": "",
  "pinned": false
}
```

### 18.2 Card item model (excerpt of `_cards.json`)

```json
{
  "id": "card",
  "fields": [
    { "component": "tab", "name": "mediaTab", "label": "Media" },
    { "component": "reference", "name": "image", "label": "Thumbnail image", "multi": false },
    { "component": "text", "name": "imageAlt", "label": "Thumbnail alt text" },
    { "component": "reference", "name": "backgroundImage", "label": "Background image",
      "multi": false },
    { "component": "text", "name": "backgroundImageAlt", "label": "Background alt text" },
    { "component": "select", "name": "classes_ctastyle", "label": "CTA style",
      "options": [{ "name": "Auto", "value": "" }, { "name": "Primary", "value": "cta-primary" },
        { "name": "Secondary", "value": "cta-secondary" }] },
    { "component": "select", "name": "classes_status", "label": "Status",
      "options": [{ "name": "None", "value": "" }, { "name": "New", "value": "status-new" },
        { "name": "Archived", "value": "status-archived" }] }
  ]
}
```

### 18.3 Data layer

```json
{ "component": { "cards-1": { "@type": "tcs-corp/components/cards", "xdm:variant": "carousel",
  "xdm:source": "manual" },
  "cards-1-item-2": { "@type": "tcs-corp/components/cards/item", "parentId": "cards-1",
  "dc:title": "The agentic bank", "xdm:position": 2, "xdm:audience": ["cfo"] } } }
{ "event": "cmp:change", "eventInfo": { "path": "component.cards-1", "interaction": "filter",
  "value": "Banking" } }
```

## 19. Responsive Behavior

| Presentation | Desktop (≥ 1200px) | Tablet (600–1199px) | Mobile (< 600px) |
|---|---|---|---|
| Classic | Auto-fill grid, cards ≥ 16rem | Auto-fill | One column |
| Grid | Cards per row (default 4) | Cards per row (3) | Cards per row (1) or scroll |
| Horizontal scroll | Cards per view (3.2), arrows | 2.2 | 1.1, swipe, indicator |
| Carousel | One view of N cards, arrows + dots | Same, fewer cards | One card per view, dots |
| Vertical list | Image left, text right, full width | Same | Image above text |
| Masonry | Columns (4) by height, reading order | 2 columns | 1 column |
| Featured | 1–3 large + grid | Large card full width + 2 columns | Stacked |

Each breakpoint can override the presentation's mode (Mobile / Tablet / Desktop layout), as today.

## 20. Accessibility Requirements

| Feature | Requirement (WCAG 2.1 AA) |
|---|---|
| All | `ul` / `li` cards in a named region; card titles one heading level below the block title; one link per card; new-tab links announced; decorative images `alt=""`; visible focus; contrast ≥ 4.5:1 (resolve handover finding F-28) |
| Carousel | `aria-roledescription="carousel"` region, slides `role="group"` with "Slide n of m"; arrows and dots are buttons with names; the current dot `aria-current="true"`; a pause / play button when autoplay is on (2.2.2); no autoplay with reduced motion; autoplay stops on focus or hover; slide changes not announced while autoplay runs |
| Horizontal scroll | Focusable only while it scrolls; arrow keys, Home, End; no focus trap |
| Masonry | DOM order = reading order (left to right, row by row) |
| Filters | Pills are buttons with `aria-pressed`; the result count in a polite live region; Reset returns focus to the filters; the search field has a visible label |
| Sorting | A labelled `select`; the change announced via the result count |
| Badge, status | Text, not colour only; Archived cards are removed from the page, not hidden visually only |
| Icon | Decorative (`aria-hidden`) unless the card has no title |

## 21. Decisions Needed (Product Owner)

| # | Decision | Recommendation |
|---|---|---|
| D-1 | Confirm C-4 (adding Card items in Universal Editor) | Test before Phase 0 |
| D-2 | Restore the original look for existing Cards (classic) or move them to the Figma design | Classic for G1, Figma for new blocks |
| D-3 | Should Cards offer dynamic sources, overlapping List and Filter List? | Yes, via shared code; position List as "Core List parity", Filter List as "large filterable listing", Cards as the default card collection; review in 6 months whether List can be retired |
| D-4 | Raise the Card cell limit to 22 or merge the tracking attributes into one field | Raise to 22 |
| D-5 | Personalization: attributes only, or hide / show by audience | Attributes now; behaviour when Target is connected |
| D-6 | Filtering in Cards (client side) vs. Filter List for large sets | Cards for ≤ 50 cards; Filter List beyond |

## 22. Before vs After

| Aspect | Before #62 (original) | Today (#62) | Proposed |
|---|---|---|---|
| Structure | Cards container + Card items | Cards container (key-value) + Card items | Same as today, plus migrated G1 instances |
| Card content | Image + one rich text | 18 fields (16 cells) | 30 fields (22 cells) in 6 tabs |
| Presentation | Bordered auto-fill grid | Figma List cards, grid / scroll | 7 presentations incl. classic |
| Sources | Manual | Manual | Manual, child pages, tags, query, related (+ pinned) |
| Carousel / dots / autoplay | No | No (arrows, indicator) | Yes (shared carousel decorator) |
| Filtering, sorting, search | No | No | Yes (shared filter decorator) |
| Block settings | None | 78 entries | Reorganised, conditional per source / presentation |
| Analytics | None | Data layer state, clicks | + positions, filter, sort, search, slides, audience |
| Shared code | None | Card list decorator with List | + sources, filters, carousel shared with List, Filter List, Gen Carousel |
