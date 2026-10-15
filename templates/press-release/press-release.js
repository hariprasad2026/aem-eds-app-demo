import { buildContactList } from '../../decorators/contact-list-decorator.js';
import { appendLoadedSection, ensurePageHeader } from '../../decorators/template-decorator.js';
import { getMediaContacts, inRegion } from '../../utils/data.js';
import { getPageMetadata } from '../../utils/metadata.js';
import { getPlaceholders } from '../../utils/placeholders.js';

/**
 * Press release template (Site Global Templates: press-release).
 * - a Page Header from the page metadata (title, publish-date, tags), unless one is authored
 * - "Media contacts" at the end, from the Media Contacts data sheet: the contacts of the
 *   page's region, else all of them
 * @param {Element} main
 */
export default function decorate(main) {
  ensurePageHeader(main);
  appendLoadedSection(main, 'template-media-contacts', async () => {
    const [contacts, t] = await Promise.all([getMediaContacts(), getPlaceholders()]);
    const regional = inRegion(contacts, getPageMetadata().region);
    return buildContactList(regional.length ? regional : contacts, t('mediaContacts', 'Media contacts'));
  });
}
