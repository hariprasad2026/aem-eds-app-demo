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
  fontWeight: '500',
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
  const fieldOffset = legacyOffset - (hasBorderRadiusField ? 0 : 1);
  const legacyState = [
    'default',
    'disabled',
    'loading',
  ].includes(getFieldValue(block, 23 + (hasBorderRadiusField ? 0 : -1), '')) && legacyView;

  return {
    textcta: getFieldValue(block, 0, ''),
    ctaLink: getFieldValue(block, 1, ''),
    icon: block.children[2]?.querySelector('img'),
    iconPosition: getFieldValue(block, 3, 'before'),
    iconSize: getFieldValue(block, 4, '24'),
    linkTarget: getFieldValue(block, 5, 'default'),
    shape: normalizeShape(
      getFieldValue(block, 6 + legacyOffset, 'rectangle'),
    ),
    backgroundColor: getFieldValue(block, 7 + legacyOffset, ''),
    hoverBackgroundColor: getFieldValue(block, 8 + legacyOffset, ''),
    textColor: getFieldValue(block, 9 + legacyOffset, ''),
    borderColor: getFieldValue(block, 10 + legacyOffset, ''),
    borderWidth: getFieldValue(block, 11 + legacyOffset, '1'),
    backdropBlur: getFieldValue(block, 13 + fieldOffset, '8'),
    hoverTextColor: getFieldValue(block, 14 + fieldOffset, ''),
    ctaWidth: getFieldValue(block, 15 + fieldOffset, 'auto'),
    alignment: getFieldValue(block, 16 + fieldOffset, 'left'),
    iconColor: getFieldValue(block, 17 + fieldOffset, 'black'),
    hoverIconColor: legacyView
      ? ''
      : getFieldValue(block, 18 + fieldOffset, ''),
    contentLayout: getFieldValue(block, 19 + fieldOffset, 'normal'),
    buttonSize: getFieldValue(block, 20 + fieldOffset, 'default'),
    fontWeight: getFieldValue(block, 21 + fieldOffset, '500'),
    typographyStyle: normalizeTypographyStyle(
      getFieldValue(block, 22 + fieldOffset, 'default'),
    ),
    bold: getFieldValue(
      block,
      (legacyState ? 24 : 23) + (hasBorderRadiusField ? 0 : -1),
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
    link.style.backgroundColor = data.backgroundColor;
  }

  if (data.textColor) {
    link.style.color = data.textColor;
  }

  if (data.borderColor) {
    link.style.borderColor = data.borderColor;
  }

  link.style.borderWidth = `${data.borderWidth}px`;

  link.style.backdropFilter = `blur(${data.backdropBlur}px)`;

  link.style.setProperty(
    '--cta-font-weight',
    data.bold ? '700' : data.fontWeight,
  );

  if (data.hoverBackgroundColor) {
    link.style.setProperty(
      '--cta-hover-bg',
      data.hoverBackgroundColor,
    );
  }

  if (data.hoverTextColor) {
    link.style.setProperty(
      '--cta-hover-text',
      data.hoverTextColor,
    );
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
