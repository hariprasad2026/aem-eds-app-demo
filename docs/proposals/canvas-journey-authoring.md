# Canvas journey: validation page in Universal Editor

Creates the validation page with every Canvas variation on the AEM author instance
(`/content/aem-eds-xwalk`, Sites console path from the request:
`/ui#/aem/sites.html/content/content/aem-eds-xwalk`). The same structure exists as local
drafts for development: `/drafts/canvas-journey*` (run `aem up --html-folder drafts`).

> Check the site root first: `paths.json` and `utils/site.js` map `/content/aem-eds-app-demo`,
> while the request names `/content/aem-eds-xwalk`. Pages outside the mapped root won't resolve
> their locale (header/footer fall back to the defaults).

## 1. Pages to create

Under the English site (e.g. `…/en/`), create a folder `canvas-journey` with:

| Page | Purpose |
| --- | --- |
| `canvas-journey` | All variations: start, intermediate (Secondary, Default Medium), Stay in place, footer stop |
| `canvas-journey-primary` | Primary (sticky) dock with site navigation pills |
| `canvas-journey-fallback` | Footer without a Canvas (fallback stop) |
| `canvas-journey-footer-only` | No Canvas in the page, only in the footer |

Make sure the locale has `references/nav` and `references/footer` published (the header and
footer are empty without them).

## 2. `canvas-journey` page

Add these sections in order (Section, then the component):

1. **Conversation Canvas** (start / header Canvas)
   - Canvas Style: Default · Floating: Auto
   - Eyebrow: *Infrastructure to Intelligence*
   - Title: *We help brands turn AI ambition into competitive advantage* · Title Size: Bigger
   - Search bar placeholder: *Ask us about transformational AI*
   - Menu root path: the locale root · Menu depth: 2
2. **Text**: a heading and 3-4 paragraphs (enough to scroll past one viewport).
3. **Text**: another long text section.
4. **Conversation Canvas** (intermediate, Secondary)
   - Canvas Style: Secondary · Title: *What are you looking to do?*
   - Text: *Describe or select a challenge, opportunity or ambition*
   - Placeholder: *Ask us a question* · add 2-3 Conversation Canvas Buttons
5. **Text** x 2 (long).
6. **Conversation Canvas** (intermediate, Default)
   - Title: *How can we drive your business forward?* · Title Size: Medium
   - Placeholder: *Ask TCS...*
7. **Text** (long).
8. **Conversation Canvas** (Stay in place)
   - Title: *A Canvas that stays in place* · Floating: **Stay in place**
9. **Text** (long).

Footer: the locale footer page (`references/footer`) with the Footer block's
*Conversation Canvas Page* pointing to a page that contains one Conversation Canvas
(Title *Let's build the future together*, Title Size Bigger, placeholder *Ask us a question*).

## 3. Other pages

- **canvas-journey-primary**: first section with a Conversation Canvas, Canvas Style
  **Primary (sticky)** (placeholder *Ask TCS...*, Menu depth 2), then the start Canvas from
  step 2.1, long text, a Secondary Canvas, long text.
- **canvas-journey-fallback**: page property **Footer** set to a footer page whose Footer block
  has no Conversation Canvas Page; content: start Canvas + 3 long text sections.
- **canvas-journey-footer-only**: 3 long text sections, default footer (with Canvas).

## 4. What to check (desktop 1440, tablet 1024, mobile 402)

| Step | Expected `html[data-canvas-journey]` |
| --- | --- |
| Page load at the top | `docked-header` (start Canvas in place, nothing floats) |
| Scroll past the start Canvas | `floating`: its search bar floats at the bottom (glass skin) |
| Next Canvas about to appear | `approaching-target` |
| Next Canvas in view | `docked-section`: nothing floats, the section shows its own bar |
| Scroll past it | `floating-between-targets`: that Canvas's bar floats |
| Stay in place Canvas scrolled past | the previous Canvas floats instead |
| Footer comes into view | `approaching-footer`: the floating bar yields |
| Footer Canvas in view / page bottom | `docked-footer`: final stop, no floating bar |
| Scroll back up | the same states in reverse |
| Mobile menu open | `disabled`: no floating bar; closing the menu restores it |
| Fallback page, footer in view | `fallback` |

Also check: the floating bar never covers the footer, keyboard focus in the floating input keeps
it in place, Tab order follows the page, and with *Reduce motion* there are no animations.
