# Templates

Code for the **Site Global Templates** (`/content/tcs-corp/site-global-templates/`): AEM pages
that authors copy to create pages of a kind (home, press release, blog, article, ...). The
template pages are excluded from publishing in `paths.json`.

A page's **Page Type** selects its template: the Page Type page property, or else the
`page-type` column of the locale's metadata sheet (e.g. `/en/newsroom/**` →
`press-release`). The value is added as a body class, and when it's in `TEMPLATES`
(`scripts/scripts.js`), `templates/{name}/{name}.js` and `.css` are loaded eagerly. The
template's default export gets `main` before it's decorated, so it can add structure.

| Template | Page Type | Adds |
|---|---|---|
| `home/` | `home` | Layout styles only (the first section meets the header) |
| `article/` | `article` | A Page Header from the page metadata (unless authored); "About the author" from the Authors data sheet (`author-id`) |
| `blog/` | `blog` | The article structure and styles |
| `press-release/` | `press-release` | A Page Header (unless authored); "Media contacts" from the Media Contacts data sheet (the page's `region`, else all) |

## Adding a template

1. Create the template page under Site Global Templates in AEM (the page name is the Page Type,
   e.g. `case-study`).
2. Add `templates/case-study/case-study.js` (default export `decorate(main)`) and
   `case-study.css`; scope selectors to the content the template adds or to `body.case-study`.
3. Add the name to `TEMPLATES` in `scripts/scripts.js` and as an option of Page Type in
   `models/_page.json`, then run `npm run build:json`.
4. Build added content with decorators (`decorators/template-decorator.js`
   `ensurePageHeader`, `appendLoadedSection`) and data from utils; keep LCP content authored,
   and load sheet data without blocking (`appendLoadedSection`).
