import { buildAuthorBio } from '../../decorators/author-bio-decorator.js';
import { appendLoadedSection, ensurePageHeader } from '../../decorators/template-decorator.js';
import { getAuthor } from '../../utils/data.js';
import { getPageMetadata } from '../../utils/metadata.js';
import { getPlaceholders } from '../../utils/placeholders.js';

/**
 * Article template (Site Global Templates: article; the blog template uses it too).
 * - a Page Header from the page metadata, unless one is authored
 * - "About the author" at the end, from the Authors data sheet entry of author-id
 * @param {Element} main
 */
export default function decorate(main) {
  ensurePageHeader(main);
  const { authorId } = getPageMetadata();
  if (!authorId) return;
  appendLoadedSection(main, 'template-author', async () => {
    const [author, t] = await Promise.all([getAuthor(authorId), getPlaceholders()]);
    return buildAuthorBio(author, {
      heading: t('aboutTheAuthor', 'About the author'),
      linkedinLabel: t('viewLinkedinProfile', 'View LinkedIn profile'),
    });
  });
}
