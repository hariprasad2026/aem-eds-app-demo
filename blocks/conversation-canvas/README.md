# Canvas (Conversation Canvas block)

"Canvas" in the requirements and Figma is the `conversation-canvas` block. The technical name
is kept to avoid breaking authored content; this document uses "Canvas".

The Canvas is one reusable block. It can be authored in any section of a page, in the
navigation fragment (header), and in the footer's Conversation Canvas Page. All instances on a
page take part in one **Canvas journey**: the search row of the Canvas the visitor scrolled
past floats at the bottom of the viewport, docks again when the next Canvas comes into view,
and stops for good in the footer Canvas.

```
Header / start Canvas -> floating -> section Canvas (docked) -> floating -> ...
  -> footer Canvas (docked, final stop)
```

## Files

| File | Responsibility |
| --- | --- |
| `conversation-canvas.js` | Decorates one Canvas (content, search form, menu, Primary dock) and registers it with the journey. |
| `canvas-journey.js` | Journey controller: observes all instances (IntersectionObserver / ResizeObserver), applies the state (classes only). |
| `canvas-journey-state.js` | Pure state model (no DOM): roles and the state resolver. Unit-tested in `test/conversation-canvas/`. |
| `conversation-canvas.css` | Canvas styles, floating (glass) and docked (outline) presentation. |
| `_conversation-canvas.json` | Universal Editor definition, model and filter. |

The header and footer contain no Canvas logic. The header announces its mobile menu
(`header:nav-toggle` event) so the floating Canvas can step aside; the footer only hosts the
Conversation Canvas Page fragment (`.footer-canvas`).

## Variations

Verified in the repository and Figma ("New Screens from New DS"); no other variants are built.

| Variation | Authoring | Figma | Context | Docked | Floating |
| --- | --- | --- | --- | --- | --- |
| Default | Canvas Style: Default | "Canvas - Inpage" (1734:38320), hero bar (4308:42483) | header/hero, sections, footer | intro (eyebrow, title, text) + outline search row (menu circle, input, mic, submit) + buttons | its search row, glass skin |
| Secondary | Canvas Style: Secondary | "What are you looking to do?" canvas section | sections | as Default, plus suggestion filter tags (`setConversationCanvasFilters`) | its search row, glass skin |
| Primary (sticky) | Canvas Style: Primary | "Bottom Menu - Desktop" (870:37539) | anywhere (no place in the page) | never (has no place) | dock: search row + site navigation pills (desktop), search only (mobile) |
| Title sizes | Title Size: Default / Bigger / Medium | footer 96/115, home 64/77, sections 48/58 | any | title size | n/a |
| Stay in place | Floating: Stay in place | n/a (authoring option) | any | as authored | never floats (still a docking target) |
| Footer Canvas | Footer block: Conversation Canvas Page | "Footer - Desktop" (2496:91965) | footer | final stop; footer CSS restyles title and buttons | never |

Skins (Figma "Floating menu" component):

- **Docked / outline**: `rgb(255 255 255 / 60%)`, 2px `#494c4d` border, radius full, 72px tall.
- **Floating / glass**: `--color-bg-opacity` (40% white), `backdrop-filter: blur(--blur-glass)`,
  2px `--color-border-default` border, `--shadow-300`; 686px wide from tablet, centred, 24px
  above the bottom edge (16px on mobile) plus the safe-area inset.
- **Mobile floating (compact)**: 340px max, no menu circle (the header holds the menu).

## Journey roles (derived, never authored)

Roles are derived from the page in DOM order, once each block is attached (footer Canvases are
decorated in a fragment first):

- **final**: the first Canvas inside `<footer>` (semantic footer, not "the last one").
- **dock**: a Primary (sticky) Canvas. If present, it owns the floating presentation.
- **start**: the first other Canvas (in the header fragment or the first section).
- **intermediate**: every other Canvas.

## State model

`canvas-journey-state.js` resolves one state at a time; `<html data-canvas-journey="…">` and
the `conversation-canvas:journey` event expose it.

| State | When | Floating | Docked |
| --- | --- | --- | --- |
| `initial` | nothing reached yet (start Canvas below the fold) | none | none |
| `docked-header` | the start Canvas is in view | none | start |
| `floating` | the start Canvas was scrolled past | start (or dock) | none |
| `approaching-target` | floating, next Canvas within 25% of a viewport below | owner | none |
| `docked-section` | an intermediate Canvas is in view | none | it |
| `floating-between-targets` | an intermediate Canvas was scrolled past | that Canvas (or dock) | none |
| `approaching-footer` | the footer is in view, its Canvas not yet | none | none |
| `docked-footer` | the footer Canvas is in view (final stop) | none | final |
| `disabled` | no Canvas, or the mobile menu is open | none | none |
| `fallback` | footer reached and the page has no footer Canvas | none | none |

Rules:

- Only one instance floats; the floating owner is the dock, else the last Canvas scrolled past
  (DOM order). A Canvas in view always wins: nothing floats while one is docked.
- Several Canvases in view: keep the docked one; otherwise the first (scrolling down) or the
  last (scrolling up) in DOM order.
- Hand-off: the next instance's own row is shown in place; the previous row stops floating.
  Content is never copied or moved between instances.
- The floating Canvas yields as soon as the footer enters the viewport, so it never covers
  footer content or passes below the footer Canvas.
- Keyboard focus inside the floating row keeps it floating until focus leaves.
- The docking zone excludes the fixed header (mobile/tablet), recalculated at the 900px
  breakpoint.

## Accessibility

- Reading order never changes: the floating row stays in its block; only CSS positions it.
- The Primary dock is `inert` while hidden; in-place rows are always reachable.
- `scroll-padding-bottom` (`--canvas-floating-clearance`) keeps focused content clear of the
  floating row (WCAG 2.4.11).
- No live-region announcements during scroll; reduced motion removes the float-in animation and
  dock transitions.
- Menu: Escape closes and returns focus; outside click closes; `aria-expanded`/`aria-controls`.

## Performance

- No scroll-position reads: two IntersectionObservers (docking zone, approach) and one for the
  footer; one ResizeObserver for the floating row height. Updates are batched in
  `requestAnimationFrame`. Layout is read only on a hand-off (slot height, row height).
- The slot keeps its height while its row floats, so the page doesn't shift (no CLS).
- No dependencies; the controller is a small module loaded with the block.

## Authoring (Universal Editor)

- Add a Conversation Canvas to any section (Canvas Style, Title, Search bar, Menu, Buttons).
- **Floating** (new, Content tab): *Auto* (default) joins the journey; *Stay in place* never
  floats. It is a `classes_` field, so existing content is unaffected.
- Footer Canvas: on the footer page (`references/footer`), set the Footer block's
  *Conversation Canvas Page* to a page with one Conversation Canvas.
- No pixel offsets, selectors or thresholds are authored.

## Fallbacks

- No footer Canvas: floating stops when the footer comes into view (`fallback`).
- No Canvas: the journey is `disabled`; nothing is observed.
- JavaScript error in the journey: each Canvas still renders in place.

## Testing

- `npm test`: `test/conversation-canvas/canvas-journey-state.test.mjs` covers target discovery,
  DOM order, roles, downward/upward hand-off, footer stop, missing footer fallback, footer-only
  pages, Primary dock ownership, Stay in place, mobile menu, focus and flicker prevention.
- Draft pages (`aem up --html-folder drafts`): `/drafts/canvas-journey` (all variations),
  `/drafts/canvas-journey-primary`, `/drafts/canvas-journey-fallback`,
  `/drafts/canvas-journey-footer-only`.

## Figma gaps and decisions

- Figma has no scroll annotations; the journey above implements the requirement and uses Figma
  for the skins and positions. The Figma Site file (`3nOB4cjNZUl0hZLttpNlMs`) can only be
  screenshotted, not inspected.
- Docking is a hand-off between authored instances (no animated travel of one element), which
  keeps the reading order and authoring stable.
- Mobile floating uses a compact bar (Figma shows a 280px bar and a 375px hero bar; 340px keeps
  the input usable), without the menu circle.
- Placeholder text, bar widths and menu circle sizes vary across Figma frames; the authored
  placeholder and the component sizes above are used.
