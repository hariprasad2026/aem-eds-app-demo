/**
 * Allows only http(s), mailto, tel and relative URLs.
 * @param {string} url
 * @returns {string}
 */
function safeHref(url) {
  const value = (url || '').trim();
  if (!value) return '#';
  try {
    const parsed = new URL(value, window.location.href);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? value : '#';
  } catch {
    return '#';
  }
}

/**
 * Turns an authored option value into a safe CSS class token.
 * @param {string} value
 * @param {string} fallback
 * @returns {string}
 */
function toClassToken(value, fallback) {
  const token = (value || '').trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return token || fallback;
}

/**
 * Builds the description by moving the authored inline nodes of each
 * paragraph / list item into spans joined by " • " (keeps rich text such as
 * bold, italics and links, while preserving the single-line presentation).
 * @param {Element} source
 * @returns {Element|null}
 */
function buildDescription(source) {
  if (!source) return null;
  const description = document.createElement('div');
  description.className = 'textwithlink-description';

  const parts = [
    ...source.querySelectorAll('p'),
    ...source.querySelectorAll('li'),
  ].filter((el) => el.textContent.trim());

  if (parts.length) {
    parts.forEach((part, index) => {
      if (index > 0) description.append(' • ');
      const span = document.createElement('span');
      span.append(...part.childNodes);
      description.append(span);
    });
  } else {
    const cell = source.firstElementChild || source;
    if (!cell.textContent.trim()) return null;
    description.append(...cell.childNodes);
  }

  return description;
}

export default function decorate(block) {
  const rows = [...block.children];

  const linkText = rows[2]?.textContent?.trim() || '';
  const linkSource = rows[3]?.querySelector('a');
  const linkUrl = safeHref(linkSource?.getAttribute('href') || rows[3]?.textContent);
  const backgroundColor = toClassToken(rows[4]?.textContent, 'white');
  const textColor = toClassToken(rows[5]?.textContent, 'black');

  const wrapper = document.createElement('div');
  wrapper.classList.add('textwithlink', backgroundColor, `${textColor}-text`);

  const left = document.createElement('div');
  left.className = 'textwithlink-left';

  const title = document.createElement('div');
  title.className = 'textwithlink-title';
  if (rows[0]) title.append(...rows[0].childNodes);
  left.append(title);

  const description = buildDescription(rows[1]);
  if (description) left.append(description);

  wrapper.append(left);

  if (linkText) {
    const linkWrapper = document.createElement('div');
    linkWrapper.className = 'textwithlink-link';
    const a = document.createElement('a');
    a.href = linkUrl;
    const label = document.createElement('span');
    label.className = 'link-text';
    label.textContent = linkText;
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '→';
    a.append(label, arrow);
    linkWrapper.append(a);
    wrapper.append(linkWrapper);
  }

  block.replaceChildren(wrapper);
}
