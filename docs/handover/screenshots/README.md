# Handover screenshots

The figures of the project handover (`../TCS-CORP-HANDOVER.md`, version 2.0), referenced as
`screenshots/<file>.jpg`.

| Kind | Files | Made from |
|---|---|---|
| Renderings | 565 (`<component>-desktop-view.jpg`, `-tablet-view.jpg`, `-mobile-view.jpg`, one per variation) | One authoring spec per screenshot (component, dialog values, items, section and page properties), rendered into a test page by the xwalk rules and captured from the local preview at the width of its description; red callout letters mark the rendered output of each entered field |
| Annotated previews | 31 (`<component>-authoring-view.jpg`) | The same, in editor mode, with letter markers matching each chapter's annotation list — not Universal Editor screenshots |
| Dialog references | 32 (`<component>-properties-panel.jpg`, `ue-page-properties-panel.jpg`) | Drawn from `component-models.json` — not Universal Editor screenshots |

In the document every rendering and annotated preview is followed by its authoring block:
Screenshot Details; the **Field Entry Table** of the same spec (Callout, Field Name, Example
Value, Mandatory, Business Purpose, What Author Should Enter, Validation Rules — the letters
match the callouts on the image; letters in brackets have no visible output of their own);
Expected Page Output; Business Rules; Common Authoring Mistakes; Troubleshooting. Each
variation's walkthrough (section 5 of the chapter) repeats the same values step by step. Editor
steps, AEM consoles and live media (playing videos, third-party players) are given as **Steps**
tables instead of screenshots. The register of all files is chapter 15.9.5.

The sample content (neutral images, sample pages, tags, authors) isn't the site's published
content. To use captures of real content, replace a figure's image file with the same name and
regenerate the PDF (`../README.md`); keep its Field Entry Table in line with the new example.
