import { createOptimizedPicture } from '../../scripts/aem.js';

const CONTROL_TEXT_VALUES = new Set([
  'default',
  'light',
  'dark',
  'left',
  'right',
  'center',
  'split',
  'card',
  'hero',
]);

function createEmptyCell() {
  return document.createElement('div');
}

function cloneOrEmpty(element) {
  return element ? element.cloneNode(true) : createEmptyCell();
}

function normalizeValue(value = '') {
  return String(value).trim().toLowerCase();
}

function isControlText(value = '') {
  return CONTROL_TEXT_VALUES.has(normalizeValue(value));
}

function getNamedField(block, name) {
  return block.querySelector(`[data-aue-prop="${name}"]`);
}

function getCellRows(block) {
  return [...block.children].map((row) => row.firstElementChild || row);
}

function getLargestImageRow(rows) {
  const imageRows = rows.filter((row) => row.querySelector('picture, img'));
  if (!imageRows.length) return null;

  return [...imageRows].sort((left, right) => {
    const leftImage = left.querySelector('img');
    const rightImage = right.querySelector('img');
    const leftArea = (Number(leftImage?.getAttribute('width')) || 0)
      * (Number(leftImage?.getAttribute('height')) || 0);
    const rightArea = (Number(rightImage?.getAttribute('width')) || 0)
      * (Number(rightImage?.getAttribute('height')) || 0);
    return rightArea - leftArea;
  })[0];
}

function resolveProps(block) {
  const rows = getCellRows(block);
  const props = rows.slice(0, 7).map((row) => cloneOrEmpty(row));

  while (props.length < 7) {
    props.push(createEmptyCell());
  }

  const namedPicture = getNamedField(block, 'fileReference');
  const namedEyebrow = getNamedField(block, 'eyebrow');
  const namedTitle = getNamedField(block, 'title');
  const namedLongDescr = getNamedField(block, 'longDescr');
  const namedShortDescr = getNamedField(block, 'shortDescr');
  const namedCta1 = getNamedField(block, 'cta1')?.closest(':scope > div > div')
    || getNamedField(block, 'cta1');
  const namedCta2 = getNamedField(block, 'cta2')?.closest(':scope > div > div')
    || getNamedField(block, 'cta2');

  if (namedPicture) props[0] = cloneOrEmpty(namedPicture);
  if (namedEyebrow) props[1] = cloneOrEmpty(namedEyebrow);
  if (namedTitle) props[2] = cloneOrEmpty(namedTitle);
  if (namedLongDescr) props[3] = cloneOrEmpty(namedLongDescr);
  if (namedShortDescr) props[4] = cloneOrEmpty(namedShortDescr);
  if (namedCta1) props[5] = cloneOrEmpty(namedCta1);
  if (namedCta2) props[6] = cloneOrEmpty(namedCta2);

  const hasNamedData = [
    namedPicture,
    namedEyebrow,
    namedTitle,
    namedLongDescr,
    namedShortDescr,
    namedCta1,
    namedCta2,
  ].some(Boolean);

  if (hasNamedData) return props;

  const largestImageRow = getLargestImageRow(rows);
  if (!props[0].querySelector('picture, img') && largestImageRow) {
    props[0] = cloneOrEmpty(largestImageRow);
  }

  const ctaRows = rows.filter((row) => row.querySelector('a[href]'));
  if (!props[5].querySelector('a[href]') && ctaRows[0]) props[5] = cloneOrEmpty(ctaRows[0]);
  if (!props[6].querySelector('a[href]') && ctaRows[1]) props[6] = cloneOrEmpty(ctaRows[1]);

  const textRows = rows.filter((row) => {
    if (row.querySelector('picture, img, a[href]')) return false;
    const text = row.textContent.trim();
    return text && !isControlText(text);
  });

  const titleRow = textRows.find((row) => row.querySelector('h1, h2, h3, h4, h5, h6')) || textRows[0];
  if (!props[2].textContent.trim() && titleRow) props[2] = cloneOrEmpty(titleRow);

  const remainingTextRows = textRows.filter((row) => row !== titleRow);
  if (!props[1].textContent.trim() && remainingTextRows[0]) {
    const candidate = remainingTextRows[0].textContent.trim();
    if (candidate.length < 80) props[1] = cloneOrEmpty(remainingTextRows[0]);
  }

  const descriptionRows = remainingTextRows.filter((row) => row !== props[1]);
  if (!props[3].textContent.trim() && descriptionRows[0]) {
    props[3] = cloneOrEmpty(descriptionRows[0]);
  }
  if (!props[4].textContent.trim() && descriptionRows[1]) {
    props[4] = cloneOrEmpty(descriptionRows[1]);
  }

  return props;
}

function createButton(cell) {
  const anchor = cell?.querySelector('a[href]');
  if (!anchor) return null;

  const button = anchor.cloneNode(true);
  button.classList.add('button', 'teaser-cta');

  if (anchor.closest('em')) button.classList.add('secondary');
  if (anchor.closest('strong')) button.classList.add('primary');

  return button;
}

export function decorateButtons(...cells) {
  return cells.map((cell) => createButton(cell)).filter(Boolean);
}

function appendIfContent(container, className, sourceElement) {
  const html = sourceElement?.innerHTML?.trim();
  if (!html) return;

  const wrapper = document.createElement('div');
  wrapper.className = className;
  wrapper.innerHTML = html;
  container.append(wrapper);
}

export function generateTeaserDOM(props) {
  const [pictureContainer, eyebrow, title, longDescr, shortDescr, firstCta, secondCta] = props;
  const fragment = document.createDocumentFragment();

  const background = document.createElement('div');
  background.className = 'background';

  const image = pictureContainer.querySelector('img');
  if (image?.src) {
    const optimizedPicture = createOptimizedPicture(
      image.src,
      image.alt || '',
      false,
      [{ width: '1360' }],
    );
    background.append(optimizedPicture);
  }

  const foreground = document.createElement('div');
  foreground.className = 'foreground';

  const text = document.createElement('div');
  text.className = 'text';

  const eyebrowText = eyebrow.textContent.trim();
  if (eyebrowText) {
    const eyebrowElement = document.createElement('p');
    eyebrowElement.className = 'eyebrow';
    eyebrowElement.textContent = eyebrowText.toUpperCase();
    text.append(eyebrowElement);
  }

  appendIfContent(text, 'title', title);
  appendIfContent(text, 'long-description', longDescr);
  appendIfContent(text, 'short-description', shortDescr);

  const cta = document.createElement('div');
  cta.className = 'cta';
  decorateButtons(firstCta, secondCta).forEach((button) => cta.append(button));
  if (cta.childElementCount) text.append(cta);

  const spacer = document.createElement('div');
  spacer.className = 'spacer';

  foreground.append(text, spacer);
  fragment.append(background, foreground);

  return fragment;
}

export default function decorate(block) {
  const props = resolveProps(block);
  const teaserDOM = generateTeaserDOM(props);
  block.textContent = '';
  block.append(teaserDOM);
}
