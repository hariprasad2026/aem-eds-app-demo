/**
 * Contact list decorator: a list of contacts (e.g. the Media Contacts data sheet,
 * utils/data.js getMediaContacts) with mail and phone links.
 */

const textElement = (tagName, className, text) => {
  const el = document.createElement(tagName);
  el.className = className;
  el.textContent = text;
  return el;
};

/** a mailto: / tel: link in a paragraph */
function contactLink(className, href, text) {
  const p = document.createElement('p');
  const a = textElement('a', className, text);
  a.href = href;
  p.append(a);
  return p;
}

/**
 * Builds the contact list with a heading.
 * @param {{ name: string, designation: string, email: string, phone: string,
 *   region: string }[]} contacts
 * @param {string} heading
 * @returns {Element | null}
 */
// eslint-disable-next-line import/prefer-default-export
export function buildContactList(contacts, heading) {
  if (!contacts?.length) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'contact-list';
  wrapper.append(textElement('h2', 'contact-list-heading', heading));
  const list = document.createElement('ul');
  contacts.forEach((contact) => {
    const li = document.createElement('li');
    if (contact.name) li.append(textElement('p', 'contact-list-name', contact.name));
    const role = [contact.designation, contact.region].filter(Boolean).join(', ');
    if (role) li.append(textElement('p', 'contact-list-designation', role));
    if (contact.email) li.append(contactLink('contact-list-email', `mailto:${contact.email}`, contact.email));
    if (contact.phone) {
      li.append(contactLink('contact-list-phone', `tel:${contact.phone.replace(/[^\d+]/g, '')}`, contact.phone));
    }
    list.append(li);
  });
  wrapper.append(list);
  return wrapper;
}
