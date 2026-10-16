# Footer

One block name, two roles (`footer.js`):

- **Footer shell**: the page footer `aem.js` builds in `<footer>`. It resolves the shared footer
  page of the page's template (`utils/layout.js`, see `docs/proposals/template-header-footer.md`),
  loads it as a fragment, applies the template's footer variation (`footer-default`,
  `footer-plain`) and adds the locale's Social Links. Hidden when the template or page switches
  the footer off. `data-layout-source` tells where the reference came from (page, template,
  parent, locale, project, fallback).
- **Footer content**: the Footer block authored on that shared page (`_footer.json`): the
  Conversation Canvas Page, the Copyright Text (`{year}` is replaced) and the Link List.

Footer Canvas: the Conversation Canvas Page (or the template's `footer-canvas`, which replaces it
or switches it off with `none`) is an independent Conversation Canvas page, loaded into
`.footer-canvas`. It is the final stop of the Canvas journey (`<footer>` is its semantic marker);
the footer has no Canvas logic. A canvas page that contains a Footer block doesn't load its own
canvas again.

Figma: "Footer - Desktop / Tablet / Mobile" (2496-91965, 4347-44552, 4347-44593); "plain":
"Canvas Entry / Footer" (1734-35296). Mobile side padding is 20px (Figma's 80px clips the
content); the headline uses `--grey-900` (Figma `#1e2222`).
