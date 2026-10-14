import { moveInstrumentation } from '../../scripts/scripts.js';

function asText(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return (value.textContent || '').trim();
}

function getCellValue(cell) {
  if (!cell) {
    return '';
  }

  const anchor = cell.querySelector?.('a');

  if (anchor) {
    return anchor.getAttribute('href') || anchor.textContent.trim();
  }

  const iframe = cell.querySelector?.('iframe');

  if (iframe) {
    return iframe.getAttribute('src') || '';
  }

  if (cell.href) {
    return cell.href;
  }

  return asText(cell);
}

/**
 * Returns the resolved URL if it is https: (or same-origin, e.g. relative paths on
 * the local dev server), otherwise an empty string. Rejects javascript:, data:, etc.
 */
function toSafeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol === 'https:') return url.href;
    if (url.protocol === 'http:' && url.origin === window.location.origin) return url.href;
  } catch (e) {
    // invalid URL
  }
  return '';
}

function detectTypeFromUrl(url) {
  if (!url) {
    return '';
  }

  if (/(youtube\.com|youtu\.be)/i.test(url)) {
    return 'youtube';
  }

  if (/vimeo\.com/i.test(url)) {
    return 'vimeo';
  }

  return 'iframe';
}

function normalizeType(value, url) {
  const type = (value || '').trim().toLowerCase();

  const supported = [
    'iframe',
    'youtube',
    'vimeo',
    'generic',
  ];

  if (supported.includes(type)) {
    return type;
  }

  return detectTypeFromUrl(url);
}

function normalizeAlignment(value) {
  const alignment = (value || '').trim().toLowerCase();

  return ['left', 'center', 'right'].includes(alignment)
    ? alignment
    : 'center';
}

function normalizeSize(value) {
  const size = (value || '').trim().toLowerCase();

  return [
    'small',
    'medium',
    'large',
    'full-width',
  ].includes(size)
    ? size
    : 'large';
}

function buildYouTubeEmbed(url) {
  const match = url.match(
    /(?:v=|\.be\/|embed\/|shorts\/)([\w-]{11})/i,
  );

  return match
    ? `https://www.youtube.com/embed/${match[1]}`
    : url;
}

function buildVimeoEmbed(url) {
  const match = url.match(
    /vimeo\.com\/(?:video\/)?(\d+)/i,
  );

  return match
    ? `https://player.vimeo.com/video/${match[1]}`
    : url;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;

  if (text) {
    element.textContent = text;
  }

  return element;
}

function normalizeBlock(block) {
  const data = {
    type: '',
    url: '',
    title: '',
    caption: '',
    alignment: 'center',
    size: 'large',
  };

  let titleCell = null;
  let captionCell = null;

  const rows = [...block.children];

  const cells = rows.map(
    (row) => row.firstElementChild || row,
  );

  const [
    typeCell,
    urlCell,
    titleValueCell,
    captionValueCell,
    alignmentCell,
    sizeCell,
  ] = cells;

  data.type = asText(typeCell);
  data.url = toSafeUrl(getCellValue(urlCell));
  data.title = asText(titleValueCell);
  data.caption = asText(captionValueCell);

  if (alignmentCell) {
    data.alignment = asText(alignmentCell);
  }

  if (sizeCell) {
    data.size = asText(sizeCell);
  }

  titleCell = titleValueCell;
  captionCell = captionValueCell;

  data.type = normalizeType(data.type, data.url);
  data.alignment = normalizeAlignment(data.alignment);
  data.size = normalizeSize(data.size);

  return {
    data,
    titleCell,
    captionCell,
  };
}

function createFrame(data) {
  let src = data.url;

  if (data.type === 'youtube') {
    src = buildYouTubeEmbed(data.url);
  } else if (data.type === 'vimeo') {
    src = buildVimeoEmbed(data.url);
  }

  const iframe = document.createElement('iframe');

  iframe.className = 'embed-iframe';
  iframe.src = toSafeUrl(src);
  iframe.title = data.title || 'Embedded content';
  iframe.loading = 'lazy';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';

  iframe.allow = [
    'accelerometer',
    'autoplay',
    'clipboard-write',
    'encrypted-media',
    'gyroscope',
    'picture-in-picture',
    'web-share',
  ].join('; ');

  return iframe;
}

export default async function decorate(block) {
  const {
    data,
    titleCell,
    captionCell,
  } = normalizeBlock(block);

  if (!data.url) {
    const isEditor = block.hasAttribute('data-aue-resource')
      || document.documentElement.classList.contains('adobe-ue-edit');

    // the authoring hint is only meant for Universal Editor
    if (!isEditor) {
      const wrapper = block.parentElement?.classList.contains('embedv1-wrapper')
        ? block.parentElement
        : block;
      wrapper.remove();
      return;
    }

    block.classList.add('embed-empty');

    const placeholder = document.createElement('div');
    placeholder.className = 'embed-placeholder';

    const message = document.createElement('p');
    message.className = 'embed-empty-message';
    message.textContent = 'Please provide an embed URL.';

    placeholder.append(message);
    block.replaceChildren(placeholder);

    return;
  }

  block.textContent = '';

  const wrapper = document.createElement('figure');

  wrapper.className = [
    'embed',
    data.type,
    data.alignment,
    data.size,
  ]
    .filter(Boolean)
    .join(' ');

  const frameWrapper = document.createElement('div');
  frameWrapper.className = 'embed-frame';

  frameWrapper.append(createFrame(data));
  wrapper.append(frameWrapper);

  // a <figure> may only have one <figcaption>: title and caption share it
  const figcaption = document.createElement('figcaption');

  if (data.title) {
    const title = createElement(
      'div',
      'embed-title',
      data.title,
    );

    if (titleCell) {
      moveInstrumentation(titleCell, title);
    }

    figcaption.append(title);
  }

  if (data.caption) {
    const caption = createElement(
      'div',
      'embed-caption',
      data.caption,
    );

    if (captionCell) {
      moveInstrumentation(captionCell, caption);
    }

    figcaption.append(caption);
  }

  if (figcaption.children.length) {
    wrapper.append(figcaption);
  }

  block.append(wrapper);
}
