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

function getExtension(path) {
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
function getLottoAssetUrl(block, field) {
  const fieldUrl = getAssetUrl(field);
  if (LOTTO_ALLOWED_EXTENSIONS.includes(getExtension(fieldUrl))) {
    return fieldUrl;
  }

  if (fieldUrl) {
    // eslint-disable-next-line no-console
    console.warn(`hero2: "${fieldUrl}" is not allowed for the Lotto image type. Use a .zip or .svg file.`);
    return '';
  }

  const candidate = [...block.querySelectorAll('a[href], img[src]')]
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
async function extractZipImages(zipUrl) {
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
  bg.className = 'hero2-bg';
  if (alt) {
    bg.setAttribute('role', 'img');
    bg.setAttribute('aria-label', alt);
  }

  urls.forEach((url) => {
    const img = document.createElement('img');
    img.className = 'hero2-bg-layer';
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
      console.warn(`hero2: no images found inside ${assetUrl}`);
      return;
    }
    renderBackgroundLayers(block, urls, alt);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('hero2: failed to render Lotto background', e);
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

function getPrimaryBackgroundImage(block) {
  const images = [...block.querySelectorAll('picture img, img')]
    .filter((img) => !img.closest('a'));
  if (!images.length) return null;

  return images.reduce((largest, current) => {
    const currentArea = (Number(current.getAttribute('width')) || 0)
      * (Number(current.getAttribute('height')) || 0);
    const largestArea = (Number(largest.getAttribute('width')) || 0)
      * (Number(largest.getAttribute('height')) || 0);
    return currentArea > largestArea ? current : largest;
  });
}

function getHeroIconImage(block, backgroundImage) {
  const explicitIcon = getFieldElement(block, 'heroIcon')?.querySelector('img');
  if (explicitIcon) return explicitIcon;

  return [...block.querySelectorAll('picture img, img')]
    .filter((img) => img !== backgroundImage && !img.closest('a'))
    .find((img) => {
      const width = Number(img.getAttribute('width')) || 0;
      const height = Number(img.getAttribute('height')) || 0;
      return width <= 200 && height <= 200;
    }) || null;
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
  ]);

  return getRows(block)
    .filter((row) => !row.querySelector('img, picture, a[href]'))
    .map((row) => row.textContent.trim())
    .filter((text) => text && !controlValues.has(text.toLowerCase()));
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

function getContent(block) {
  const backgroundImage = getPrimaryBackgroundImage(block);
  const iconImage = getHeroIconImage(block, backgroundImage);
  const textCandidates = getTextCandidates(block);
  const titleFromField = getTextValue(block, 'title');
  const descriptionFromField = getFieldElement(block, 'description');

  return {
    heroIconSrc: iconImage?.getAttribute('src') || '',
    heroIconAlt: getTextValue(block, 'heroIconAlt'),

    heroImageType: getTextValue(block, 'heroImageType', 'default'),
    heroImage: getFieldElement(block, 'heroImage'),
    heroLottoImagePath: getFieldElement(block, 'heroLottoImagePath'),
    heroImageSrc: backgroundImage?.getAttribute('src') || '',
    heroImageAlt: getTextValue(block, 'heroImageAlt'),
    heroView: getTextValue(block, 'heroView'),

    eyebrowText: getTextValue(block, 'eyebrowText'),

    title: titleFromField || textCandidates[0] || '',

    description: descriptionFromField || textCandidates[1] || '',

    alignment: getAlignment(block),
    bgColor: getTextValue(block, 'bgColor'),
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
    ? getLottoAssetUrl(block, content.heroLottoImagePath)
    : '';
  block.innerHTML = '';
  block.classList.add('hero2');
  if (content.alignment) {
    block.classList.add(`hero2-align-${content.alignment}`);
  }

  if (content.heroImageType === 'lotto') {
    // Lotto: only .zip / .svg. Images inside a zip are extracted and rendered as background.
    if (lottoUrl) {
      applyLottoBackground(block, lottoUrl, content.heroImageAlt);
    }
  } else {
    // Default: any image format is allowed.
    const imageField = content.heroImage || content.heroLottoImagePath;
    const fallbackSrc = content.heroImageSrc;
    if (imageField || fallbackSrc) {
      const bgImg = imageField?.querySelector('img') || imageField;
      const bgSrc = bgImg?.getAttribute('src') || fallbackSrc;

      if (bgImg && content.heroImageAlt) {
        bgImg.alt = content.heroImageAlt;
      }
      if (bgSrc) {
        block.style.backgroundImage = `url(${bgSrc})`;
      }
    }
  }

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'hero2-content';

  if (content.heroIconSrc) {
    const icon = document.createElement('img');
    icon.className = 'hero2-icon';
    icon.src = content.heroIconSrc;
    icon.alt = content.heroIconAlt || '';
    contentWrapper.append(icon);
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
    if (typeof content.description === 'string') {
      description.textContent = content.description;
    } else {
      description.innerHTML = content.description.innerHTML;
    }

    contentWrapper.append(description);
  }

  if (ctaItems.length) {
    const ctaList = document.createElement('div');
    ctaList.className = 'hero2-cta-items';
    ctaList.append(...ctaItems);
    contentWrapper.append(ctaList);
  }

  block.append(contentWrapper);
}
