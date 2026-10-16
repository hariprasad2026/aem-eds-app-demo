# Template-managed Header and Footer

Header, Navigation and Footer work like the header and footer of AEM editable templates:
templates define the default shared references, pages inherit them, the shared pages are
maintained once, and pages override them only where the template allows it. Pages never get a
copy of the header or footer content.

## 1. How it works

| Concern | Where it lives | Who maintains it |
| --- | --- | --- |
| Header content (brand, nav sections, tools) | a shared Navigation page, e.g. `/en/references/nav` | site authors |
| Footer content (Footer block: Canvas page, copyright, links) | a shared Footer page, e.g. `/en/references/footer` | site authors |
| Header / Footer Canvas | shared Conversation Canvas pages, e.g. `/en/references/canvas-dock` | site authors |
| Template defaults | the locale's **Page Templates** sheet `data/page-templates` | template maintainers |
| Which template a page uses | the page property **Page Type** (or the metadata sheet's `page-type`) | page authors |
| Page override | the page properties **Navigation** / **Footer** | page authors, where allowed |

The header and footer blocks resolve the shared page at runtime (`utils/layout.js`, rules in
`utils/layout-config.js`) and load it as a fragment. A published change to a shared page or to
the sheet therefore shows on every page that resolves to it; the pages are not republished.

### Resolution order (first reference that loads wins)

1. The page's own **Navigation** / **Footer** property, if the template allows page overrides.
2. The template default: the sheet row of the page's Page Type, else the `default` row.
3. The nearest parent page's Navigation / Footer (inherited page properties; looked up only
   when the page and its template set none).
4. The locale default: `references/nav` / `references/footer`.
5. The project default: the default locale's (`/en/`) references.
6. Minimal fallback: the header shows a link to the locale's Home page; the footer stays empty.

A missing, unpublished or invalid reference (an absolute URL, `..`, the page itself) is skipped
and the next one is used. `none` switches the header or footer off (page property where the
template allows overrides, or the template).

## 2. Page Templates sheet (`/<locale>/data/page-templates`)

Create it per locale, like the other data sheets (`data/social-links`, …). One row per Page Type
plus a `default` row; empty cells take the `default` row's value.

| Column | Values | Meaning |
| --- | --- | --- |
| `page-type` | `default`, `home`, `article`, `blog`, `press-release` (any Page Type) | the template |
| `nav` | page path | shared Navigation (header) page |
| `footer` | page path | shared Footer page |
| `header-variation` | `default`, `overlay` | `overlay`: transparent header over dark heroes (desktop) |
| `footer-variation` | `default`, `plain` | `plain`: no glows (Figma "Canvas Entry / Footer") |
| `show-header` | `yes` (default), `no` | the template shows a header |
| `show-footer` | `yes` (default), `no` | the template shows a footer |
| `header-canvas` | page path, empty | a Canvas page in the header, e.g. a Primary (sticky) canvas: the floating site navigation; it starts the Canvas journey |
| `footer-canvas` | page path, `none`, empty | replaces (or switches off) the Footer block's Conversation Canvas Page; empty keeps it |
| `page-override` | `allowed` (default), `not allowed` | whether pages may set their own Navigation / Footer |

Example (English):

| page-type | nav | footer | header-variation | footer-variation | header-canvas | footer-canvas | page-override |
| --- | --- | --- | --- | --- | --- | --- | --- |
| default | /en/references/nav | /en/references/footer | | | | | |
| home | | | overlay | | /en/references/canvas-dock | | |
| article | | /en/references/footer-compact | | plain | | none | |
| press-release | | /en/references/footer-compact | | | | | not allowed |

New Page Types (e.g. a campaign template) only need a row; no block code changes.

## 3. New pages and overrides

- **New page**: choose its Page Type (Site Global Template). Leave Navigation and Footer empty:
  the page then uses its template's shared references. Nothing is copied into the page.
- **Default reference vs copied content**: the page stores at most a reference (the Navigation /
  Footer property); the header and footer content stays on the shared pages.
- **Override**: set Navigation or Footer on the page (a shared page, e.g. a campaign footer) or
  `none`. Applies to the page and, unless they set their own, its child pages. Ignored when the
  template's `page-override` is `not allowed`.
- **Restore inheritance**: clear the property.

## 4. Canvas

Canvas stays an independent block (`blocks/conversation-canvas`, see its README). The header and
footer only host Canvas pages:

- Header Canvas (`header-canvas`): appended after the nav; normally a Primary canvas (the floating
  navigation dock). Role in the journey: dock / start.
- Footer Canvas (Footer block's Conversation Canvas Page, or `footer-canvas`): the final stop.
- Pages work without any Canvas, with only a header or footer Canvas, and with Canvas blocks in
  sections.

## 5. Publishing and propagation

- Shared pages, Canvas pages and the sheet are loaded at runtime. After an update, **publish the
  shared page or the sheet**; pages that resolve to it show the change on their next load. The
  CDN serves the new version once the publish has purged it (Edge Delivery publish flow).
- Changed **parent page** properties are cached in the browser session for up to 10 minutes.
- Pages are not republished when shared content changes.

## 6. Validation pages

On author (`/content/aem-eds-xwalk/us/en`, published at `/en/`):

1. Publish `references/nav`, `references/footer`, a footer canvas page and, for the Home
   template, a Primary canvas page (`references/canvas-dock`).
2. Create and publish `data/page-templates` with at least the `default` row.
3. Create `template-header-footer-validation` (Page Type: Article) and a second page
   `template-header-footer-validation-2` (Page Type: Article), both without Navigation / Footer.
4. Check: both show the template's header and footer; edit and publish the shared footer, reload
   both: both show the change.
5. Scenario pages: Page Type Home (overlay header, Header Canvas), a page with Footer
   `/en/references/<other footer>` (override), a Press Release with an override (ignored), a page
   with Footer `none`, and a template row with a missing `nav` (fallback to the locale default).

Local fixtures for all scenarios: `drafts/template-hf/` (run `aem up --html-folder drafts` and
copy `drafts/template-hf/page-templates.json` to `en/data/page-templates.json`, uncommitted).

## 7. Analysis summary (2026-10-16)

- **demo-blocks** (`d7d874f`, reference only): footer (`tcs-footer`) and header (`tcs-header`)
  loaded by a modified `aem.js` from hard-coded paths (`/tcs-footer`, relative
  `blocks/tcs-header`), no template or inheritance; the footer owns and re-parents the floating
  Canvas bar. Reused concepts: one floating bar with explicit dock targets, the footer as the
  final stop, fragment media rebasing. Not copied: `aem.js` overrides, link rewriting, text-guess
  row typing, scroll/re-parenting engine, cross-block CSS.
- **corp** (`cb0173e`): already had page properties with parent inheritance and locale defaults,
  runtime fragments (so shared updates propagate), the Footer block model and a Figma-aligned
  footer. Gaps closed here: no template level, no project default or minimal fallback, a footer
  Canvas page could load itself endlessly, empty footer bar rendered, repeated fragment fetches,
  hard-coded colours, a session-long inheritance cache.
- **Figma** footer (`2496:91965`, `4347:44552`, `4347:44593`): headline, Canvas bar, two outline
  CTAs, legal row, glows; no link groups, social icons or locale selector. Deviations: mobile
  side padding 20px (Figma 80px clips content to 239px), headline `#1e1e1e` token for `#1e2222`.
