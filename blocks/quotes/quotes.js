const COLOR_VALUE_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;

export default async function decorate(block) {
  const eyebrowField = block.children[0]?.firstElementChild;
  const title = block.children[1]?.firstElementChild;
  const quotation = block.children[2]?.firstElementChild;
  /* const layoutField = block.children[3]?.firstElementChild; */
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

  const hasImage = profileImageField?.innerHTML?.trim();

  if (hasImage || authorDetailsField?.textContent.trim()) {
    const profileWrapper = document.createElement('div');
    profileWrapper.className = 'quote-profile';

    if (hasImage) {
      const imageWrapper = document.createElement('div');
      imageWrapper.className = 'quote-author-image';
      imageWrapper.innerHTML = profileImageField.innerHTML;
      profileWrapper.append(imageWrapper);
    }

    if (authorDetailsField?.textContent.trim()) {
      const details = document.createElement('div');
      details.className = 'quote-author-details';
      details.innerHTML = authorDetailsField.innerHTML;
      profileWrapper.append(details);
    }

    content.append(profileWrapper);
  }

  if (hasImage) {
    const media = document.createElement('div');
    media.className = 'quote-media';
    media.innerHTML = profileImageField.innerHTML;
    blockquote.append(content, media);
  } else if (imageAltTextField?.textContent) {
    const media = document.createElement('div');
    media.className = 'quote-media quote-media-alt';
    media.textContent = imageAltTextField.textContent.trim();
    blockquote.append(content, media);
  } else {
    blockquote.append(content);
  }

  const ems = blockquote.querySelectorAll('em');

  ems.forEach((em) => {
    const cite = document.createElement('cite');
    cite.innerHTML = em.innerHTML;
    em.replaceWith(cite);
  });

  const bgColor = colors[
    backgroundField?.textContent.trim().toLowerCase()
  ];

  if (bgColor) {
    blockquote.style.setProperty('--quote-bg', bgColor);
  }

  block.innerHTML = '';
  block.append(blockquote);
}
