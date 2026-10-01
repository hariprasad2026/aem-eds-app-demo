const COLOR_VALUE_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;

export default async function decorate(block) {
  const quotation = block.children[0]?.firstElementChild;
  const attribution = block.children[1]?.firstElementChild;
  const title = block.children[2]?.firstElementChild;
  const description = block.children[3]?.firstElementChild;
  const layoutField = block.children[4]?.firstElementChild;
  const backgroundField = block.children[5]?.firstElementChild;
  const textColorField = block.children[6]?.firstElementChild;
  const quoteColorField = block.children[7]?.firstElementChild;
  const profileImageField = block.children[8];
  const profileTextField = block.children[9]?.firstElementChild;
  const quotationText = quotation?.textContent.trim() || '';

  const colors = {
    'dark-navy': 'rgba(32, 41, 60, 1)',
    'royal-blue': 'rgba(70, 115, 219, 1)',
    'light-grey': 'rgba(217, 217, 217, 1)',
    white: 'rgba(255, 255, 255, 1)',
    black: 'rgba(12, 12, 13, 1)',
    'off-white': 'rgba(245, 245, 245, 1)',
    'dark-grey': 'rgba(90, 90, 90, 1)',
    'light-blue': 'rgba(167, 200, 241, 1)',
  };

  const blockquote = document.createElement('blockquote');
  const content = document.createElement('div');
  content.className = 'quote-content';

  let layout = 'default';

  if (layoutField) {
    const value = layoutField.textContent.trim().toLowerCase();

    if (value.includes('profile')) {
      layout = 'profile';
    } else if (value.includes('image')) {
      layout = 'image';
    } else if (value.includes('center')) {
      layout = 'centered';
    } else if (value.includes('right')) {
      layout = 'right';
    }
  }

  blockquote.classList.add(layout);

  if (title?.textContent.trim()) {
    title.className = 'quote-title';
    content.append(title);
  }

  if (quotation && !COLOR_VALUE_PATTERN.test(quotationText)) {
    quotation.className = 'quote-quotation';
    content.append(quotation);
  }

  if (attribution) {
    attribution.className = 'quote-attribution';
    content.append(attribution);
  }

  if (description?.textContent.trim()) {
    description.className = 'quote-description';
    content.append(description);
  }

  const hasImage = profileImageField?.innerHTML?.trim();

  if (hasImage || profileTextField?.textContent.trim()) {
    const profileWrapper = document.createElement('div');
    profileWrapper.className = 'quote-profile';

    if (hasImage) {
      const imageWrapper = document.createElement('div');
      imageWrapper.className = 'quote-author-image';
      imageWrapper.innerHTML = profileImageField.innerHTML;
      profileWrapper.append(imageWrapper);
    }

    if (profileTextField?.textContent.trim()) {
      const profileText = document.createElement('div');
      profileText.className = 'quote-profile-text';
      profileText.textContent = profileTextField.textContent.trim();
      profileWrapper.append(profileText);
    }

    content.append(profileWrapper);
  }

  if (layout === 'image' && hasImage) {
    const media = document.createElement('div');
    media.className = 'quote-media';
    media.innerHTML = profileImageField.innerHTML;
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

  const textColor = colors[
    textColorField?.textContent.trim().toLowerCase()
  ];

  if (textColor) {
    blockquote.style.setProperty('--quote-text', textColor);
  }

  const quoteColor = colors[
    quoteColorField?.textContent.trim().toLowerCase()
  ];

  if (quoteColor) {
    blockquote.style.setProperty(
      '--quote-color',
      quoteColor,
    );
  }

  block.innerHTML = '';
  block.append(blockquote);
}
