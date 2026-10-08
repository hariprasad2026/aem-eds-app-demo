function getFieldElement(block, name) {
  return block.querySelector(`[data-aue-prop="${name}"]`);
}

function getTextValue(block, name, defaultValue = '') {
  const field = getFieldElement(block, name);

  return field?.textContent?.trim() || defaultValue;
}

function getContent(block) {
  return {
    heroIcon: getFieldElement(block, 'heroIcon'),
    heroIconAlt: getTextValue(block, 'heroIconAlt'),

    heroImageType: getTextValue(block, 'heroImageType'),
    heroLottoImagePath: getFieldElement(block, 'heroLottoImagePath'),
    heroImageAlt: getTextValue(block, 'heroImageAlt'),
    heroView: getTextValue(block, 'heroView'),

    eyebrowText: getTextValue(block, 'eyebrowText'),

    title: block.querySelector('div:nth-child(10) p')
      ?.textContent?.trim(),

    description: getFieldElement(block, 'description'),

    ctaTitle: getTextValue(block, 'ctaTitle'),
    ctaLinkElement: block.querySelector('.button-container a'),
    ctaLinkType: block.querySelector('div:nth-child(14) p')?.textContent?.trim(),

    ctaView: getTextValue(block, 'ctaView'),

    alignment: getTextValue(block, 'alignment'),
    bgColor: getTextValue(block, 'bgColor'),
  };
}

export default function decorate(block) {
  const content = getContent(block);
  console.log(
    [...block.querySelectorAll('p')]
      .map((el) => el.textContent.trim()),
  );
  console.log(block.innerHTML);
  console.log('CTA LINK ELEMENT:', content.ctaLinkElement);
  console.log('CTA LINK:', content.ctaLink);
  console.log('CTA LINK TYPE:', content.ctaLinkType);
  block.innerHTML = '';
  block.classList.add('hero2');
  if (content.alignment) {
    block.classList.add(`hero2-align-${content.alignment}`);
  }

  if (content.heroLottoImagePath) {
    const bgImg = content.heroLottoImagePath.querySelector('img')
      || content.heroLottoImagePath;

    const bgSrc = bgImg.getAttribute('src');

    if (content.heroImageAlt) {
      bgImg.alt = content.heroImageAlt;
    }
    if (bgSrc) {
      block.style.backgroundImage = `url(${bgSrc})`;
    }
  }

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'hero2-content';

  if (content.heroIcon) {
    content.heroIcon.classList.add('hero2-icon');

    if (content.heroIconAlt) {
      content.heroIcon.alt = content.heroIconAlt;
    }

    contentWrapper.append(content.heroIcon);
  }

  if (content.eyebrowText) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'hero2-eyebrow';
    eyebrow.textContent = content.eyebrowText;

    contentWrapper.append(eyebrow);
  }

  if (content.title) {
    const title = document.createElement('h1');
    title.className = 'hero2-title';
    title.textContent = content.title;

    contentWrapper.append(title);
  }

  if (content.description) {
    const description = document.createElement('div');

    description.className = 'hero2-description';
    description.innerHTML = content.description.innerHTML;

    contentWrapper.append(description);
  }

  if (content.ctaTitle) {
    const cta = document.createElement('a');

    cta.className = 'hero2-cta';

    cta.href = content.ctaLinkElement?.href || '#';

    if (content.ctaLinkType === 'new-window') {
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer';
    }

    const label = document.createElement('span');
    label.textContent = content.ctaTitle;

    const arrow = document.createElement('img');
    arrow.src = '/content/dam/2026/39/energeticowl21611/icons/arrow 14x14.svg';
    arrow.alt = '';
    arrow.className = 'hero2-cta-arrow';

    cta.append(label, arrow);

    contentWrapper.append(cta);
  }

  block.append(contentWrapper);
}
