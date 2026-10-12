const DEFAULTS = {
  textcta: '',
  ctaLink: '',
  icon: null,
  iconPosition: 'before',
  iconSize: '24',
  linkTarget: 'default',
  ctaView: 'default',
  shape: 'rectangle',
  backgroundColor: '',
  hoverBackgroundColor: '',
  textColor: '',
  borderColor: '',
  ctaWidth: 'auto',
  alignment: 'left',
  arrowColor: 'black',
  contentLayout: 'normal',
};

const ALLOWED_SHAPES = [
  'rectangle',
  'rounded',
  'pill',
];

function getFieldValue(block, index, fallback = '') {
  const field = block.children[index];

  if (!field) {
    return fallback;
  }

  return field.textContent.trim() || fallback;
}

function normalizeShape(value) {
  if (ALLOWED_SHAPES.includes(value)) {
    return value;
  }

  return DEFAULTS.shape;
}

function createIcon(icon, size, arrowColor) {
  if (!icon) {
    return null;
  }

  const image = icon.cloneNode(true);

  image.classList.add(
    'cta-icon',
    `cta-icon-${arrowColor}`,
  );

  image.style.width = `${size}px`;
  image.style.height = `${size}px`;

  return image;
}

function readBlockContent(block) {
  return {
    textcta: getFieldValue(block, 0, ''),
    ctaLink: getFieldValue(block, 1, ''),
    icon: block.children[2]?.querySelector('img'),
    iconPosition: getFieldValue(block, 3, 'before'),
    iconSize: getFieldValue(block, 4, '24'),
    linkTarget: getFieldValue(block, 5, 'default'),
    ctaView: getFieldValue(block, 6, 'default'),
    shape: normalizeShape(
      getFieldValue(block, 7, 'rectangle'),
    ),
    backgroundColor: getFieldValue(block, 8, ''),
    hoverBackgroundColor: getFieldValue(block, 9, ''),
    textColor: getFieldValue(block, 10, ''),
    borderColor: getFieldValue(block, 11, ''),
    ctaWidth: getFieldValue(block, 12, 'auto'),
    alignment: getFieldValue(block, 13, 'left'),
    arrowColor: getFieldValue(block, 14, 'black'),
    contentLayout: getFieldValue(block, 15, 'normal'),
  };
}

function createCta(data) {
  if (!data.textcta || !data.ctaLink) {
    return null;
  }

  const link = document.createElement('a');

  link.className = [
    'cta-link',
    `cta-link-${data.shape}`,
    `cta-view-${data.ctaView}`,
    `cta-layout-${data.contentLayout}`,
  ].join(' ');

  link.href = data.ctaLink;

  link.setAttribute(
    'aria-label',
    data.textcta,
  );

  if (data.linkTarget === 'new-window') {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  if (data.backgroundColor) {
    link.style.backgroundColor = data.backgroundColor;
  }

  if (data.textColor) {
    link.style.color = data.textColor;
  }

  if (data.borderColor) {
    link.style.borderColor = data.borderColor;
  }

  if (data.hoverBackgroundColor) {
    link.style.setProperty(
      '--cta-hover-bg',
      data.hoverBackgroundColor,
    );
  }

  if (
    data.icon
    && data.iconPosition === 'before'
  ) {
    link.append(
      createIcon(
        data.icon,
        data.iconSize,
        data.arrowColor,
      ),
    );
  }

  const text = document.createElement('span');

  text.className = 'cta-text';
  text.textContent = data.textcta;

  link.append(text);

  if (
    data.icon
    && data.iconPosition === 'after'
  ) {
    link.append(
      createIcon(
        data.icon,
        data.iconSize,
        data.arrowColor,
      ),
    );
  }

  return link;
}

export default function decorate(block) {
  const data = readBlockContent(block);

  const cta = createCta(data);

  block.replaceChildren();

  block.classList.add(
    `cta-align-${data.alignment}`,
  );

  if (cta) {
    switch (data.ctaWidth) {
      case 'half':
        cta.classList.add(
          'cta-width-half-link',
        );
        break;

      case 'full':
        cta.classList.add(
          'cta-width-full-link',
        );
        break;

      default:
        break;
    }

    block.append(cta);
  }
}
