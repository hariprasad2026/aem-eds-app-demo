const COLOR_VALUE_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;

/**
 * Converts an attribution paragraph (a paragraph whose only content is an <em>)
 * into a <cite>. Other emphasis is left untouched.
 */
function convertAttribution(container) {
  container.querySelectorAll(':scope > p').forEach((p) => {
    const nodes = [...p.childNodes]
      .filter((n) => n.nodeType !== Node.TEXT_NODE || n.textContent.trim());
    if (nodes.length !== 1 || nodes[0].nodeName !== 'EM') return;
    const em = nodes[0];
    const cite = document.createElement('cite');
    cite.append(...em.childNodes);
    em.replaceWith(cite);
  });
}

export default async function decorate(block) {
  const eyebrowField = block.children[0]?.firstElementChild;
  const title = block.children[1]?.firstElementChild;
  const quotation = block.children[2]?.firstElementChild;
  const backgroundField = block.children[4]?.firstElementChild;
  const profileImageField = block.children[5];
  const imageAltTextField = block.children[6];
  const authorDetailsField = block.children[7]?.firstElementChild;

  const quotationText = quotation?.textContent.trim() || '';

  const colors = {
    'light-grey': 'rgba(217, 217, 217, 1)',
    white: 'rgba(255, 255, 255, 1)',
    'off-white': 'rgba(245, 245, 245, 1)',
    'dark-grey': 'rgba(90, 90, 90, 1)',
    'light-blue': 'rgba(167, 200, 241, 1)',
  };

  const blockquote = document.createElement('blockquote');
  const content = document.createElement('div');

  content.className = 'quote-content';
  blockquote.classList.add('image');

  if (eyebrowField?.textContent.trim()) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'quote-eyebrow';
    eyebrow.textContent = eyebrowField.textContent.trim();
    content.append(eyebrow);
  }

  if (title?.textContent.trim()) {
    title.className = 'quote-title';
    content.append(title);
  }

  if (quotation && !COLOR_VALUE_PATTERN.test(quotationText)) {
    quotation.className = 'quote-quotation';
    content.append(quotation);
  }

  const picture = profileImageField?.querySelector('picture') || profileImageField?.querySelector('img');
  const altText = imageAltTextField?.textContent?.trim();
  const img = picture?.tagName === 'IMG' ? picture : picture?.querySelector('img');

  if (img && altText) img.alt = altText;

  if (authorDetailsField?.textContent.trim()) {
    const profileWrapper = document.createElement('div');
    profileWrapper.className = 'quote-profile';

    const details = document.createElement('div');
    details.className = 'quote-author-details';
    details.append(...authorDetailsField.childNodes);
    convertAttribution(details);
    profileWrapper.append(details);

    content.append(profileWrapper);
  }

  blockquote.append(content);

  // the authored portrait is moved (not copied) into the media column
  if (picture) {
    const media = document.createElement('div');
    media.className = 'quote-media';
    media.append(picture);
    blockquote.append(media);
  }

  const bgColor = colors[
    backgroundField?.textContent.trim().toLowerCase()
  ];

  if (bgColor) {
    blockquote.style.setProperty('--quote-bg', bgColor);
  }

  block.replaceChildren(blockquote);
}
