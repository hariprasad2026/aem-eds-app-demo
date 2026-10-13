import { loadCSS, loadScript } from '../../scripts/aem.js';
import decorateCta from '../cta/cta.js';

// Lotto image type accepts only these asset extensions.
const LOTTO_ALLOWED_EXTENSIONS = ['zip', 'svg'];

// Image files that are extracted from a lotto zip.
const ZIP_IMAGE_MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

export function getExtension(path) {
  try {
    const { pathname } = new URL(path, window.location.href);
    return pathname.split('.').pop().toLowerCase();
  } catch (e) {
    return '';
  }
}

function getAssetUrl(element) {
  if (!element) return '';

  const node = element.matches('a[href], img[src]')
    ? element
    : element.querySelector('a[href], img[src]');

  if (node) {
    return node.getAttribute(node.tagName === 'A' ? 'href' : 'src') || '';
  }

  return element.textContent.trim();
}

/**
 * Lotto only allows .zip / .svg. Looks at the authored field first and, when the
 * field marker is unavailable (e.g. published page), scans the block for a
 * matching asset. Any other file type is rejected.
 */
function getLottoAssetUrl(block, field, icon) {
  const fieldUrl = getAssetUrl(field);
  if (LOTTO_ALLOWED_EXTENSIONS.includes(getExtension(fieldUrl))) {
    return fieldUrl;
  }

  if (fieldUrl) {
    // eslint-disable-next-line no-console
    console.warn(`hero-banner: "${fieldUrl}" is not allowed for the Lotto image type. Use a .zip or .svg file.`);
    return '';
  }

  const candidate = [...block.querySelectorAll('a[href], img[src]')]
    .filter((node) => node !== icon)
    .map((node) => node.getAttribute(node.tagName === 'A' ? 'href' : 'src'))
    .find((url) => LOTTO_ALLOWED_EXTENSIONS.includes(getExtension(url)));

  return candidate || '';
}

async function loadJSZip() {
  if (!window.JSZip) {
    await loadScript(`${window.hlx.codeBasePath}/scripts/jszip.min.js`);
  }
  return window.JSZip;
}

/**
 * Downloads a zip and returns object URLs of the images it contains,
 * in natural file name order.
 */
export async function extractZipImages(zipUrl) {
  const [JSZip, response] = await Promise.all([loadJSZip(), fetch(zipUrl)]);
  if (!response.ok) throw new Error(`Unable to load ${zipUrl} (${response.status})`);

  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir
      && !entry.name.startsWith('__MACOSX/')
      && !entry.name.split('/').pop().startsWith('.')
      && ZIP_IMAGE_MIME_TYPES[getExtension(entry.name)])
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return Promise.all(entries.map(async (entry) => {
    const data = await entry.async('uint8array');
    const blob = new Blob([data], { type: ZIP_IMAGE_MIME_TYPES[getExtension(entry.name)] });
    return URL.createObjectURL(blob);
  }));
}

function renderBackgroundLayers(block, urls, alt) {
  const bg = document.createElement('div');
  bg.className = 'hero-banner-bg';
  if (alt) {
    bg.setAttribute('role', 'img');
    bg.setAttribute('aria-label', alt);
  }

  urls.forEach((url) => {
    const img = document.createElement('img');
    img.className = 'hero-banner-bg-layer';
    img.src = url;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    bg.append(img);
  });

  block.prepend(bg);
}

async function applyLottoBackground(block, assetUrl, alt) {
  try {
    if (getExtension(assetUrl) === 'svg') {
      renderBackgroundLayers(block, [assetUrl], alt);
      return;
    }

    const urls = await extractZipImages(assetUrl);
    if (!urls.length) {
      // eslint-disable-next-line no-console
      console.warn(`hero-banner: no images found inside ${assetUrl}`);
      return;
    }
    renderBackgroundLayers(block, urls, alt);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('hero-banner: failed to render Lotto background', e);
  }
}

function getFieldElement(block, name) {
  const direct = block.querySelector(`[data-aue-prop="${name}"]`);
  if (direct) return direct;

  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const rows = [...block.querySelectorAll(':scope > div')];
  const labeledRow = rows.find((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return false;
    const key = cells[0].textContent.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return key === normalizedName;
  });
  if (labeledRow) {
    return labeledRow.children.length > 1 ? labeledRow.children[1] : labeledRow;
  }

  return null;
}

function getTextValue(block, name, defaultValue = '') {
  const field = getFieldElement(block, name);

  return field?.textContent?.trim() || defaultValue;
}

function getRows(block) {
  return [...block.querySelectorAll(':scope > div')];
}

function isImagePath(value) {
  return !!value && !/\s/.test(value) && !!ZIP_IMAGE_MIME_TYPES[getExtension(value)];
}

// Background authored as a link or plain path (instead of an <img>) to an image file.
function getLinkedImageUrl(block) {
  return getRows(block)
    .map((row) => row.querySelector('a[href]')?.getAttribute('href') || row.textContent.trim())
    .find(isImagePath) || '';
}

const IMAGE_TYPES = ['default', 'lotto'];

function getImageIn(element) {
  if (!element) return null;
  if (element.matches('img')) return element;
  return element.querySelector('img');
}

function getRowImage(row) {
  return [...row.querySelectorAll('img')].find((img) => !img.closest('a')) || null;
}

// The row holding the Hero Image Type value ("default" / "lotto").
// Icon is authored before it, the hero image / lotto path after it.
function getImageTypeRowIndex(block) {
  return getRows(block).findIndex((row) => !row.querySelector('img, a[href]')
    && IMAGE_TYPES.includes(row.textContent.trim().toLowerCase()));
}

/**
 * Splits the authored images into the hero icon and the background image.
 * Uses the field markers when present (editor), otherwise the authored order.
 */
function getHeroImages(block) {
  const iconField = getFieldElement(block, 'heroIcon');
  const imageField = getFieldElement(block, 'heroImage');
  if (iconField || imageField) {
    return { icon: getImageIn(iconField), background: getImageIn(imageField) };
  }

  const rows = getRows(block);
  const typeIndex = getImageTypeRowIndex(block);
  let icon = null;
  let background = null;

  if (typeIndex >= 0) {
    rows.forEach((row, index) => {
      const img = getRowImage(row);
      if (!img) return;
      if (index < typeIndex) icon = icon || img;
      else background = background || img;
    });
    return { icon, background };
  }

  const withImages = rows.map((row) => getRowImage(row)).filter(Boolean);
  if (withImages.length > 1) {
    [icon] = withImages;
    background = withImages[withImages.length - 1];
  } else if (withImages.length === 1) {
    // Icon is the first authored field.
    if (getRowImage(rows[0]) === withImages[0]) [icon] = withImages;
    else [background] = withImages;
  }
  return { icon, background };
}

function getImageType(block) {
  const fromField = getTextValue(block, 'heroImageType').toLowerCase();
  if (IMAGE_TYPES.includes(fromField)) return fromField;

  const typeRow = getRows(block)[getImageTypeRowIndex(block)];
  return typeRow ? typeRow.textContent.trim().toLowerCase() : 'default';
}

function getTextCandidates(block) {
  const controlValues = new Set([
    'default',
    'lotto',
    'top',
    'middle',
    'bottom',
    'left',
    'center',
    'right',
    'primary',
    'secondary',
    'pill',
    'black',
    'white',
    'new-window',
    'none',
    'select',
  ]);

  return getRows(block)
    .filter((row) => !row.querySelector('img, picture, a[href]'))
    .map((row) => ({
      text: row.textContent.trim(),
      element: row.children.length === 1 ? row.firstElementChild : row,
    }))
    .filter(({ text }) => text && !controlValues.has(text.toLowerCase()) && !isImagePath(text));
}

function getAlignment(block) {
  const allowed = ['top', 'middle', 'bottom'];
  const fromField = getTextValue(block, 'alignment').toLowerCase();
  if (allowed.includes(fromField)) {
    return fromField;
  }

  // Fallback: the last leaf element whose text is exactly an alignment value
  // (alignment rows come after title/description in the authored order).
  const matches = [...block.querySelectorAll('div, p')]
    .filter((el) => !el.children.length)
    .map((el) => el.textContent.trim().toLowerCase())
    .filter((text) => allowed.includes(text));
  return matches.pop() || '';
}

function getBgColor(block) {
  const allowed = ['none', 'white', 'black'];
  const fromField = getTextValue(block, 'bgColor').toLowerCase();
  if (allowed.includes(fromField)) {
    return fromField;
  }

  // Fallback: the last leaf element whose text is exactly a background color value
  // (bgColor is the last authored hero field).
  const matches = [...block.querySelectorAll('div, p')]
    .filter((el) => !el.children.length)
    .map((el) => el.textContent.trim().toLowerCase())
    .filter((text) => allowed.includes(text));
  return matches.pop() || 'none';
}

function getContent(block) {
  const { icon: iconImage, background: backgroundImage } = getHeroImages(block);
  const textCandidates = getTextCandidates(block);
  const titleFromField = getTextValue(block, 'title');
  const descriptionFromField = getFieldElement(block, 'description');
  const eyebrowFromField = getTextValue(block, 'eyebrowText');

  // Without field markers the authored order is eyebrow, title, description.
  // Empty fields leave no row, so the description is recognised by its rich text
  // markup (<p>, lists) when it differs from the plain text eyebrow/title rows.
  const isRich = (candidate) => !!candidate.element.querySelector('p, ul, ol');
  const richCandidates = textCandidates.filter(isRich);
  const hasDescription = richCandidates.length > 0
    && richCandidates.length < textCandidates.length;
  const description = hasDescription ? richCandidates[richCandidates.length - 1] : null;
  const plain = textCandidates.filter((candidate) => candidate !== description);

  // The eyebrow is already known from its field, so its row must not be reused as the title.
  const eyebrowIndex = eyebrowFromField
    ? plain.findIndex((candidate) => candidate.text === eyebrowFromField)
    : -1;
  if (eyebrowIndex >= 0) plain.splice(eyebrowIndex, 1);

  let fallback;
  if (eyebrowIndex >= 0) {
    fallback = {
      eyebrow: '',
      title: plain[0]?.text || '',
      description: plain[1]?.element || description?.element || '',
    };
  } else if (plain.length >= 3 && !description) {
    fallback = {
      eyebrow: plain[0].text,
      title: plain[1].text,
      description: plain[2].element,
    };
  } else if (plain.length >= 2) {
    fallback = {
      eyebrow: plain[0].text,
      title: plain[1].text,
      description: description?.element || '',
    };
  } else {
    fallback = {
      eyebrow: '',
      title: plain[0]?.text || '',
      description: description?.element || '',
    };
  }

  return {
    heroIconSrc: iconImage?.getAttribute('src') || '',
    heroIconAlt: getTextValue(block, 'heroIconAlt') || iconImage?.getAttribute('alt') || '',

    heroImageType: getImageType(block),
    heroImage: getFieldElement(block, 'heroImage'),
    heroLottoImagePath: getFieldElement(block, 'heroLottoImagePath'),
    heroImageSrc: backgroundImage?.getAttribute('src') || getLinkedImageUrl(block),
    heroImageAlt: getTextValue(block, 'heroImageAlt') || backgroundImage?.getAttribute('alt') || '',
    heroView: getTextValue(block, 'heroView'),

    eyebrowText: eyebrowFromField || fallback.eyebrow,

    title: titleFromField || fallback.title,

    description: descriptionFromField || fallback.description,

    alignment: getAlignment(block),
    bgColor: getBgColor(block),
  };
}

export default function decorate(block) {
  // CTA items are rows with several cells; hero field rows have a single cell.
  const ctaItems = [...block.children].filter((row) => row.children.length > 1);
  if (ctaItems.length) {
    // Nested CTA rows are not loaded as standalone blocks, so load their CSS here.
    loadCSS(`${window.hlx.codeBasePath}/blocks/cta/cta.css`);
  }
  ctaItems.forEach((row) => {
    row.remove();
    row.classList.add('cta', 'block');
    row.dataset.blockName = 'cta';
    decorateCta(row);
  });

  const content = getContent(block);
  const lottoUrl = content.heroImageType === 'lotto'
    ? getLottoAssetUrl(block, content.heroLottoImagePath, getHeroImages(block).icon)
    : '';
  block.innerHTML = '';
  block.classList.add('hero-banner');
  if (content.alignment) {
    block.classList.add(`hero-banner-align-${content.alignment}`);
  }
  if (content.bgColor !== 'none') {
    block.classList.add(`hero-banner-bg-${content.bgColor}`);
  }

  if (content.heroImageType === 'lotto') {
    // Lotto: only .zip / .svg. Images inside a zip are extracted and rendered as background.
    if (lottoUrl) {
      applyLottoBackground(block, lottoUrl, content.heroImageAlt);
    }
  } else {
    // Default: any image format is allowed. The authored reference may be rendered as an
    // <img>, a link or a plain path depending on the delivery, so accept all of them.
    const fieldUrl = [content.heroImage, content.heroLottoImagePath]
      .map(getAssetUrl)
      .find(isImagePath);
    const bgSrc = fieldUrl || content.heroImageSrc;
    if (bgSrc) {
      // Render a real <img> layer (instead of a CSS background) so it is visible in the DOM.
      // Authored URLs use width=750; request a larger rendition for a full-width hero.
      const largeSrc = bgSrc.replace(/([?&]width=)\d+/, (match, prefix) => `${prefix}2000`);
      renderBackgroundLayers(block, [largeSrc], content.heroImageAlt);
    }
  }

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'hero-banner-content';

  if (content.heroIconSrc) {
    const icon = document.createElement('span');
    icon.className = 'hero-banner-icon';
    icon.style.setProperty('--hero-banner-icon-src', `url("${content.heroIconSrc.replace(/"/g, '%22')}")`);
    if (content.heroIconAlt) {
      icon.setAttribute('role', 'img');
      icon.setAttribute('aria-label', content.heroIconAlt);
    } else {
      icon.setAttribute('aria-hidden', 'true');
    }
    contentWrapper.append(icon);
  }

  if (content.eyebrowText) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'hero-banner-eyebrow';
    eyebrow.textContent = content.eyebrowText;

    contentWrapper.append(eyebrow);
  }

  if (content.title) {
    const title = document.createElement('h1');
    title.className = 'hero-banner-title';
    title.textContent = content.title;

    contentWrapper.append(title);
  }

  if (content.description) {
    const description = document.createElement('div');

    description.className = 'hero-banner-description';
    if (typeof content.description === 'string') {
      description.textContent = content.description;
    } else {
      description.innerHTML = content.description.innerHTML;
    }

    contentWrapper.append(description);
  }

  if (ctaItems.length) {
    const ctaList = document.createElement('div');
    ctaList.className = 'hero-banner-cta-items';
    ctaList.append(...ctaItems);
    contentWrapper.append(ctaList);
  }

  block.append(contentWrapper);
}
