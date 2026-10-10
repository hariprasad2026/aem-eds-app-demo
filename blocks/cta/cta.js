const DEFAULTS = {
  text_cta: '',
  ctaLink: '',
  linkTarget: 'default',
  ctaView: 'default',
  shape: 'rectangle',
  backgroundColor: '',
  textColor: '',
  borderColor: '',
  arrowDirection: 'none',
};

const ALLOWED_SHAPES = [
  'rectangle',
  'rounded',
  'pill',
];

const ALLOWED_LINK_TARGETS = [
  'default',
  'new-window',
];

function normalizeLinkTarget(value) {
  if (String(value).trim().toLowerCase() === 'true') {
    return 'new-window';
  }

  if (ALLOWED_LINK_TARGETS.includes(value)) {
    return value;
  }

  return DEFAULTS.linkTarget;
}

const ALLOWED_ARROWS = [
  'none',
  'left',
  'right',
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

function normalizeArrow(value) {
  if (ALLOWED_ARROWS.includes(value)) {
    return value;
  }

  return DEFAULTS.arrowDirection;
}

function isValidCssColor(value) {
  if (!value) {
    return false;
  }

  const element = document.createElement('span');

  element.style.color = value;

  return Boolean(element.style.color);
}

function createArrow(direction) {
  const wrapper = document.createElement('span');

  wrapper.className = `cta-arrow cta-arrow-${direction}`;
  wrapper.setAttribute('aria-hidden', 'true');

  const arrow = document.createElement('img');

  arrow.src = '/content/dam/aem-eds-xwalk/hero/icons/arrow 14x14.svg';
  arrow.alt = '';
  arrow.className = 'cta-arrow-icon';

  if (direction === 'left') {
    arrow.classList.add('cta-arrow-icon-left');
  }

  wrapper.appendChild(arrow);

  return wrapper;
}

function readBlockContent(block) {
  return {
    text_cta: getFieldValue(
      block,
      0,
      DEFAULTS.text_cta,
    ),

    ctaLink: getFieldValue(
      block,
      1,
      DEFAULTS.ctaLink,
    ),

    linkTarget: normalizeLinkTarget(
      [...block.children]
        .map((cell) => cell.textContent.trim().toLowerCase())
        .find((text) => text === 'new-window' || text === 'true')
      || DEFAULTS.linkTarget,
    ),

    ctaView: getFieldValue(
      block,
      3,
      'default',
    ),

    shape: normalizeShape(
      getFieldValue(
        block,
        4,
        DEFAULTS.shape,
      ),
    ),

    backgroundColor: getFieldValue(
      block,
      5,
      DEFAULTS.backgroundColor,
    ),

    textColor: getFieldValue(
      block,
      6,
      DEFAULTS.textColor,
    ),

    borderColor: getFieldValue(
      block,
      7,
      DEFAULTS.borderColor,
    ),

    arrowDirection: normalizeArrow(
      getFieldValue(
        block,
        8,
        DEFAULTS.arrowDirection,
      ),
    ),
  };
}

function createCta(data) {
  if (!data.text_cta || !data.ctaLink) {
    return null;
  }

  const link = document.createElement('a');

  link.className = [
    'cta-link',
    `cta-link-${data.shape}`,
    `cta-view-${data.ctaView}`,
  ].join(' ');

  link.href = data.ctaLink;

  link.setAttribute(
    'aria-label',
    data.text_cta,
  );

  const normalizedTarget = String(data.linkTarget || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  const opensNewTab = [
    '_blank',
    'blank',
    'new-tab',
    'new-window',
  ].includes(normalizedTarget);

  if (opensNewTab) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  if (
    data.ctaView === 'primary'
    && isValidCssColor(data.backgroundColor)
  ) {
    link.style.backgroundColor = data.backgroundColor;
  }

  if (isValidCssColor(data.textColor)) {
    link.style.color = data.textColor;
  }

  if (
    ['primary', 'secondary'].includes(data.ctaView)
    && isValidCssColor(data.borderColor)
  ) {
    link.style.borderColor = data.borderColor;
  }

  if (data.arrowDirection === 'left') {
    link.appendChild(
      createArrow('left'),
    );
  }

  const text = document.createElement('span');

  text.className = 'cta-text';
  text.textContent = data.text_cta;

  link.appendChild(text);

  if (data.arrowDirection === 'right') {
    link.appendChild(
      createArrow('right'),
    );
  }

  return link;
}

export default function decorate(block) {
  const data = readBlockContent(block);
  const cta = createCta(data);

  block.replaceChildren();

  if (cta) {
    block.appendChild(cta);
  }
}
