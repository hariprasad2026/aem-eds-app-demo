/**
 * Template decorator: structure that Site Global Templates (templates/) add to a page before
 * it's decorated. Added content is built from page metadata and data sheets, so pages created
 * from a template page get it without authoring it.
 */

/**
 * Adds a Page Header block (title, description, tags, date and author from the page metadata)
 * as the first section, unless the page has one.
 * @param {Element} main
 */
export function ensurePageHeader(main) {
  if (main.querySelector('.page-header')) return;
  const section = document.createElement('div');
  const block = document.createElement('div');
  block.className = 'page-header';
  section.append(block);
  main.prepend(section);
}

/**
 * Appends a section that's filled once its content is loaded (e.g. from a data sheet), without
 * delaying the page; the section is removed when there's no content.
 * @param {Element} main
 * @param {string} className the class of the section content (an <aside>)
 * @param {() => Promise<Element | null>} build
 */
export function appendLoadedSection(main, className, build) {
  const section = document.createElement('div');
  const aside = document.createElement('aside');
  aside.className = className;
  section.append(aside);
  main.append(section);
  build()
    .catch(() => null)
    .then((content) => {
      if (content) aside.replaceChildren(content);
      else (aside.closest('.section') || section).remove();
    });
}
