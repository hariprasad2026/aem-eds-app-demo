# Header

- **Header shell** (`header.js`): resolves the shared Navigation page of the page's template
  (`utils/layout.js`, see `docs/proposals/template-header-footer.md`) and loads it as a fragment.
  Applies the template's header variation (`header-default`, `header-overlay`), hosts the
  template's Header Canvas (`.header-canvas`) and falls back to a minimal header (a link to the
  locale's Home page) when no Navigation page loads. Hidden when the template or page switches
  the header off. `data-layout-source` tells where the reference came from.
- **Navigation** (unchanged behaviour): the Navigation page's three sections become brand,
  sections and tools. Mobile (< 900px): a menu button (`aria-expanded`, `aria-controls`) opens
  the sections and locks page scroll; desktop: sections with a sub-list open as dropdowns.
  Escape closes and returns focus; focus leaving the nav closes it. The `header:nav-toggle`
  event tells other parts (the Canvas journey) when the mobile menu opens or closes.
- **Header Canvas**: an independent Conversation Canvas page (normally Primary: the floating
  site navigation, Figma "Bottom Menu - Desktop"); it registers with the Canvas journey itself.

Variations (Page Templates sheet `header-variation`): `default`; `overlay` (Figma desktop logo
bar over dark heroes): transparent with light text from 900px, the solid bar below 900px.
