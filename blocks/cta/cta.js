const DEFAULTS = {
  textcta: '',
  ctaLink: '',
  icon: null,
  iconPosition: 'before',
  iconSize: '24',
  linkTarget: 'default',
  shape: 'rectangle',
  backgroundColor: '',
  hoverBackgroundColor: '',
  textColor: '',
  borderColor: '',
  borderWidth: '1',
  backdropBlur: '8',
  hoverTextColor: '',
  ctaWidth: 'auto',
  alignment: 'left',
  iconColor: 'black',
  hoverIconColor: '',
  contentLayout: 'normal',
  buttonSize: 'default',
  typographyStyle: 'default',
  bold: false,
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

function getLinkFieldValue(block, index, fallback = '') {
  const field = block.children[index];
  const link = field?.querySelector('a[href]');

  return link?.getAttribute('href') || link?.href || field?.textContent.trim() || fallback;
}

function normalizeShape(value) {
  if (ALLOWED_SHAPES.includes(value)) {
    return value;
  }

  return DEFAULTS.shape;
}

function normalizeTypographyStyle(value) {
  if (value === 'default' || value === 'compact') {
    return value;
  }

  return DEFAULTS.typographyStyle;
}

function normalizeIconSize(value) {
  const allowedSizes = ['14', '16', '18', '20', '24', '32', '40', '48'];

  return allowedSizes.includes(value) ? value : DEFAULTS.iconSize;
}

function createIcon(icon, size, iconColor, hoverIconColor) {
  if (!icon) {
    return null;
  }

  const image = icon.cloneNode(true);

  image.classList.add(
    'cta-icon',
    `cta-icon-${iconColor}`,
  );

  if (hoverIconColor) {
    image.classList.add(
      `cta-icon-hover-${hoverIconColor}`,
    );
  }

  image.style.width = `${size}px`;
  image.style.height = `${size}px`;

  return image;
}

function readBlockContent(block) {
  const legacyView = [
    'default',
    'primary',
    'secondary',
    'tertiary',
    'white-filled',
  ].includes(getFieldValue(block, 6, ''));
  const legacyOffset = legacyView ? 1 : 0;
  const hasBorderRadiusField = block.children.length >= 24 + (legacyView ? 1 : 0);
  const hasFontWeightField = block.children.length >= 23 + legacyOffset;
  const radiusOffset = hasBorderRadiusField ? 1 : 0;
  const fontWeightOffset = hasFontWeightField ? 1 : 0;
  const fieldOffset = legacyOffset + radiusOffset;
  const legacyState = [
    'default',
    'disabled',
    'loading',
  ].includes(getFieldValue(
    block,
    23 - (hasBorderRadiusField ? 0 : 1) - (hasFontWeightField ? 0 : 1),
    '',
  )) && legacyView;

  return {
    textcta: getFieldValue(block, 0, ''),
    ctaLink: getLinkFieldValue(block, 1, ''),
    icon: block.children[2]?.querySelector('img'),
    iconPosition: getFieldValue(block, 3, 'before'),
    iconSize: normalizeIconSize(getFieldValue(block, 5, '24')),
    linkTarget: getFieldValue(block, 4, 'default'),
    shape: normalizeShape(
      getFieldValue(block, 6 + legacyOffset, 'rectangle'),
    ),
    backgroundColor: getFieldValue(block, 7 + legacyOffset, ''),
    textColor: getFieldValue(block, 8 + legacyOffset, ''),
    borderColor: getFieldValue(block, 9 + legacyOffset, ''),
    hoverBackgroundColor: getFieldValue(block, 10 + legacyOffset, ''),
    borderWidth: getFieldValue(block, 11 + legacyOffset, '1'),
    backdropBlur: getFieldValue(block, 12 + fieldOffset, '8'),
    hoverTextColor: getFieldValue(block, 13 + fieldOffset, ''),
    ctaWidth: getFieldValue(block, 14 + fieldOffset, 'auto'),
    alignment: getFieldValue(block, 15 + fieldOffset, 'left'),
    iconColor: getFieldValue(block, 16 + fieldOffset, 'black'),
    hoverIconColor: legacyView
      ? ''
      : getFieldValue(block, 17 + fieldOffset, ''),
    contentLayout: getFieldValue(block, 18 + fieldOffset, 'normal'),
    buttonSize: getFieldValue(block, 19 + fieldOffset, 'default'),
    typographyStyle: normalizeTypographyStyle(
      getFieldValue(block, 20 + fieldOffset + fontWeightOffset, 'default'),
    ),
    bold: getFieldValue(
      block,
      (legacyState ? 24 : 21) + fieldOffset + fontWeightOffset,
      'false',
    ) === 'true',
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
    `cta-layout-${data.contentLayout}`,
    `cta-size-${data.buttonSize}`,
    `cta-typography-${data.typographyStyle}`,
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
    link.style.setProperty('--cta-background-color', data.backgroundColor);
  }

  if (data.textColor) {
    link.style.setProperty('--cta-text-color', data.textColor);
  }

  if (data.borderColor) {
    link.style.setProperty('--cta-border-color', data.borderColor);
  }

  link.style.borderWidth = `${data.borderWidth}px`;

  link.style.backdropFilter = `blur(${data.backdropBlur}px)`;

  link.style.setProperty(
    '--cta-font-weight',
    data.bold ? '700' : '500',
  );

  if (data.hoverBackgroundColor) {
    link.style.setProperty('--cta-hover-bg', data.hoverBackgroundColor);
  }

  if (data.hoverTextColor) {
    link.style.setProperty('--cta-hover-text', data.hoverTextColor);
  }

  if (
    data.icon
    && data.iconPosition === 'before'
  ) {
    const icon = createIcon(
      data.icon,
      data.iconSize,
      data.iconColor,
      data.hoverIconColor,
    );

    if (icon) {
      link.append(icon);
    }
  }

  const text = document.createElement('span');

  text.className = 'cta-text';
  text.textContent = data.textcta;

  link.append(text);

  if (
    data.icon
    && data.iconPosition === 'after'
  ) {
    const icon = createIcon(
      data.icon,
      data.iconSize,
      data.iconColor,
      data.hoverIconColor,
    );

    if (icon) {
      link.append(icon);
    }
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

  if (!cta) {
    return;
  }

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
