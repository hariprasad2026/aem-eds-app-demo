# Separator

The AEM Core Components **Separator** for Edge Delivery Services (xwalk / Universal Editor): a
horizontal division between content, as one native `<hr>`, with design-system variants, themes,
widths, alignment, decorations, spacing and separate desktop / tablet / mobile settings.

| File | Purpose |
|---|---|
| `blocks/separator/_separator.json` | Universal Editor definition and model (key-value block) |
| `blocks/separator/separator-config.js` | Normalizes the properties into a safe configuration and the block classes (no DOM; unit tested) |
| `blocks/separator/separator.js` | Reads the properties once; renders the rule, decorations, editor note, animation, data layer |
| `blocks/separator/separator.css` | All styling and responsive behaviour |
| `models/_section.json` | Allows the Separator in sections |
| `test/separator/separator-config.test.mjs` | Unit tests (`npm test`) |

## For authors

**Use it** to separate topics on a page (a thematic break: Semantic) or to add a visual division
between content of the same topic (Decorative). **Don't use it** only to add space (use the
section spacing, or Line style None with spacing), to separate items of a list or cards (the
blocks have their own dividers), or several in a row.

### Semantic, decorative, spacing only

| What it is | Settings | Screen readers | Markup |
|---|---|---|---|
| Thematic break (the topic changes) | Accessibility mode **Semantic** | Announce a separator (with the Accessible label as its name, if set) | `<hr class="separator-rule">` (`aria-label` when labelled) |
| Visual division only | **Decorative** (default) | Ignore it | `<div class="separator-line" aria-hidden="true"><hr …></div>` |
| Spacing only | Decorative + Line style **None** | Nothing | No `<hr>`; the block keeps its spacing |

A Semantic separator with Line style None is still a break for screen readers but nothing is
visible; the editor warns about it.

### Choosing the look

- **Variant** sets line style, thickness, colour and width together; any Appearance setting other
  than "As the variant" overrides it. Custom: only the Appearance settings.
- **Theme**: Auto follows the section (dark and brand sections get their palettes); choose Light,
  Dark or Brand when the background isn't a section style (e.g. an image).
- **Width** is a share of the content width; Content width caps it at the site's content width;
  Full bleed runs edge to edge of the section. **Alignment** places partial widths at the start,
  center or end; start and end follow the reading direction (right in right-to-left languages).
- **Decorations**: a dot, square or diamond at the start, center and / or end of the line, visual
  only, sized with the thickness.
- **Responsive**: show or hide it per device, and change its width, thickness and alignment per
  device ("As Appearance" keeps the Appearance setting). Hidden on every device: nothing on the
  page, a dashed placeholder in the editor; normally not recommended.
- **Spacing**: space above and below per device (Default: 24px); Use section padding removes the
  separator's own spacing so the section's spacing isn't doubled.
- **Animate on view**: fade or draw (from the start or the center) once when it scrolls into
  view; visitors who prefer reduced motion see it at once (or a short fade).
- **Print**: shown by default; Hide when printed for screen-only dividers.
- **Component ID**: the block's `id` (`#id` links, CSS, analytics, tests); changing it changes
  those. Empty: `separator-1`, `separator-2`, … in page order. A duplicate gets a suffix.

### Examples

| Purpose | Settings |
|---|---|
| Between two stories | Semantic, Accessible label "End of the story", Default |
| A light rule under a section intro | Decorative, Subtle, 50%, Center |
| A brand accent under a title | Decorative, Branded, 25%, Start, Desktop top spacing None |
| Edge-to-edge in a dark section | Full width (Theme Auto: the dark palette) |
| A desktop-only divider of two columns | Show on tablet / mobile off |
| A decorated chapter break | Semantic, Medium, 50%, Center decoration Diamond |
| Space only | Line style None, Desktop top spacing XL |

## Field matrix

| Field | Label | Type | Default | Allowed values | Validation / condition | Class / token | Runtime and accessibility |
|---|---|---|---|---|---|---|---|
| `componentId` | Component ID | text | generated | `[A-Za-z][A-Za-z0-9_-]*` | regExp; sanitized in code; duplicates suffixed | block `id` | — |
| `accessibilityMode` | Accessibility mode | select | decorative | decorative, semantic | — | `semantic` / `decorative` | Semantic: exposed `<hr>`; decorative: `aria-hidden` |
| `accessibleLabel` | Accessible label | text | — | max 120 characters | shown when Semantic | `aria-label` on the `<hr>` | Names the break |
| `variant` | Separator variant | select | default | default, subtle, strong, inset, full-width, dotted, dashed, gradient, branded, custom-design | — | `variant-*` (+ presets) | — |
| `theme` | Theme | select | auto | auto, light, dark, brand | — | `theme-*`; auto: `.section.dark` / `.brand` | Palette for the background |
| `lineStyle` | Line style | select | as the variant | solid, dashed, dotted, gradient, none | help text for semantic + none | `line-*` | none: no rule (decorative) |
| `lineThickness` | Line thickness | select | as the variant | thin, medium, thick | — | `thickness-*` → `--border-width-100/200/300` | — |
| `lineColor` | Line colour | select | as the variant | default, subtle, neutral, strong, primary, secondary, accent, inverse | — | `color-*` → palette tokens | — |
| `lineOpacity` | Line opacity | select | 100 | 25, 50, 75, 100 | — | `opacity-*` | — |
| `width` | Separator width | select | as the variant | auto, 25/50/75/100-percent, content-width, full-bleed | — | `width-*` | No page overflow |
| `maxWidth` | Maximum width | select | none | none, small, medium, large, extra-large, content-container | — | `max-*` (20 / 40 / 60 / 80rem, `--content-max-width`) | — |
| `alignment` | Alignment | select | center | start, center, end | — | `align-*` (flex `justify-content`, logical) | RTL aware |
| `startDecoration` / `centerDecoration` / `endDecoration` | … decoration | select | none | none, dot, square, diamond | — | `.separator-decoration-*` | `aria-hidden` |
| `contrastMode` | Background contrast | select | standard | standard, high | — | `contrast-high` (strong colour) | — |
| `showDesktop` / `showTablet` / `showMobile` | Show on … | boolean | on | — | — | `hide-*`, `hidden-all` | Hidden: `display: none` (no spacing) |
| `{desktop,tablet,mobile}Width` | … width | select | inherit | inherit + widths | — | `{bp}-width-*` | — |
| `{bp}Thickness` | … thickness | select | inherit | inherit, thin, medium, thick | — | `{bp}-thickness-*` | — |
| `{bp}Alignment` | … alignment | select | inherit | inherit, start, center, end | — | `{bp}-align-*` | — |
| `{bp}TopSpacing` / `{bp}BottomSpacing` | … top / bottom spacing | select | default (24px) | default, none, 2xs, xs, small, medium, large, xl, 2xl | — | `{bp}-top-*` → `--space-100…2000` | padding (no margin collapse) |
| `useSectionPadding` | Use section padding | boolean | off | — | — | `section-padding` | No own spacing |
| `stretchToContainer` | Stretch to container width | boolean | off | — | — | `stretch` | Fills the container |
| `respectMaxWidth` | Respect content maximum width | boolean | on | — | — | `respect-max` → `--content-max-width` | — |
| `animateOnView` | Animate on view | select | none | none, fade, draw-from-start, draw-from-center | — | `animate-*` | Once; IntersectionObserver |
| `reducedMotionFallback` | Reduced motion fallback | select | static | static, fade | shown when animating | `motion-*` | — |
| `printVisibility` | Print | select | show | show, hide | — | `print-hide` | — |
| `analyticsEnabled` | Analytics | boolean | off | — | — | — | Data layer state only |
| `analyticsLabel` | Analytics label | text | — | max 120 characters | shown when Analytics on | `dc:title` | — |

Breakpoints: mobile < 600px, tablet 600–1199px, desktop ≥ 1200px (the project's). A responsive
value applies only on its breakpoint; "As Appearance" (inherit) keeps the Appearance value.

## For developers

- **HTML contract** (published): the key-value rows are replaced by
  `<div class="separator-line" [aria-hidden="true"]><hr class="separator-rule" [aria-label]>[<span class="separator-decoration …" aria-hidden="true">]</div>`;
  an authored `<hr>` in the block is reused (extra ones dropped). No text, links, buttons,
  `tabindex`, `role` or handlers. Class names follow the repository's `block-part` convention
  (the requested BEM `separator__rule` maps to `separator-rule`).
- **CSS**: classes set custom properties (`--separator-color`, `--separator-thickness`,
  `--separator-width`, `--separator-bleed`, `--separator-max`, `--separator-justify`,
  `--separator-space-*`); breakpoint classes override them inside range media queries. Palettes
  per theme map to site tokens (`--color-border-*`, `--slate-*`, `--brand-*`, `--white-*`); no
  new global tokens. Full bleed uses the section's `--section-padding-inline`, so it never
  overflows the page. Forced colours use `CanvasText`; print shows the line unless Print hide.
- **JavaScript**: once per block (`data-separator-ready`); everything responsive is CSS (no resize
  listeners). IntersectionObserver only when an animation is set (not for reduced motion), and the
  hidden starting state only exists after the script added `animate-ready`, so a failure never
  hides the line. `?debug=separator` logs the configuration.
- **Analytics**: with Analytics on, the Adobe Client Data Layer gets the separator's state
  (`@type tcs-corp/components/separator`, variant, accessibility mode, theme, line style,
  visibility). No events: a separator has no interactions. Off by default (decorative content
  isn't tracked unless asked).
- **Extension points**: `VARIANT_PRESETS` and the option lists in `separator-config.js`; a new
  variant is a preset row and its class in the CSS.
- **Without JavaScript**: Edge Delivery shows the page only after its scripts run, so the
  separator is always decorated; it has no runtime dependency beyond that.
- **Tests**: `npm test` (defaults, every option, sanitizing, presets, fallbacks, legacy
  values, all visibility combinations, warnings, analytics); rendering, accessibility tree,
  RTL, animation, forced colours and print were checked in the browser.

## Placeholders

`separatorHidden` (Separator hidden on all devices), `separatorInvisible` (Semantic separator
without a line: screen readers announce a break nobody sees), shown in the editor only.

## Known limitations

- The visual presentation uses the site's tokens until the Figma designs are applied.
- A brand-icon decoration needs an approved icon asset; until then dot, square and diamond only.
- No free-form CSS class or colour fields (controlled options only, by the design system).
- An Accessible label is read as the name of the separator by most screen readers, not all.
