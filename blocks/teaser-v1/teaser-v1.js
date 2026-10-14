import {
  createOptimizedPicture,
  loadCSS,
} from '../../scripts/aem.js';

import decorateCta from '../cta/cta.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  getDecision,
  getTargetConfig,
  sendPropositionDisplay,
  setPersonalizationAttributes,
} from '../../scripts/target-personalization.js';

const FIELD_ORDER = [
  'eyebrow',
  'title',
  'titleType',
  'description',
  'shortDescription',
  'backgroundImage',
  'viewAllText',
  'viewAllLink',
  'style',
  'personalizationEnabled',
  'backgroundColor',
  'imagePosition',
  'showEyebrow',
  'hideTitle',
  'showDescription',
  'hideImage',
  'showDate',
  'textAlignment',
  'date',
  'dateFormat',
  'displayTags',
  'tags',
];

const VALID_HEADING_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
];

const VALID_LINK_STYLES = [
  'default',
  'list',
  'primary',
  'secondary',
];

const CONFIGURATION_CLASSES = [
  'split-image-content',
  'split-feature',
  'background-hero',
  'image-collage',
  'no-image-right-desc-links',
  'grey',
  'image-left',
  'image-right',
  'text-left',
  'text-center',
  'text-right',
  'text-justify',
  'hide-image',
  'hide-title',
  'hide-description',
  'hide-eyebrow',
  'personalized',
];

const IMAGE_ITEM_FIELD_ORDER = [
  'image',
  'imageAlt',
  'imageMode',
];

const IMAGE_MODES = new Set([
  'normal',
  'black-white',
]);

const IMAGE_COLLAGE_SLOTS = [
  'slot-1',
  'slot-2',
  'slot-3',
  'slot-4',
  'slot-5',
  'slot-6',
  'slot-7',
  'slot-8',
  'slot-9',
];

const VALID_TEASER_STYLES = new Set([
  'split-image-content',
  'split-feature',
  'background-hero',
  'image-collage',
  'no-image-right-desc-links',
]);

const VALID_DATE_FORMATS = new Set([
  'dd-mm-yyyy',
  'mm-dd-yyyy',
  'mmm-d-yyyy',
]);

function getParentPropertyRows(block) {
  return [...block.children];
}

function parseDateValue(dateValue) {
  if (!dateValue) {
    return null;
  }

  const normalizedDateValue = String(dateValue).trim();
  const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateOnlyMatch = dateOnlyPattern.exec(
    normalizedDateValue,
  );

  let date = new Date(normalizedDateValue);

  if (dateOnlyMatch) {
    date = new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3]),
    );

    if (
      date.getFullYear() !== Number(dateOnlyMatch[1])
      || date.getMonth() !== Number(dateOnlyMatch[2]) - 1
      || date.getDate() !== Number(dateOnlyMatch[3])
    ) {
      return null;
    }
  }

  return Number.isNaN(date.valueOf())
    ? null
    : date;
}

function parsePublishedConfiguration(
  block,
  existingData,
) {
  const data = { ...existingData };

  const rows = getParentPropertyRows(block);

  const values = rows.map((row) => ({
    row,
    text: (
      row.children[0] || row
    ).textContent.trim(),
  }));

  const styleIndex = values.findIndex(
    ({ text }) => (
      VALID_TEASER_STYLES.has(
        text.toLowerCase(),
      )
    ),
  );

  if (styleIndex < 0) {
    return data;
  }

  const readAt = (offset) => (
    values[styleIndex + offset]?.text || ''
  );

  data.style = readAt(0);
  data.personalizationEnabled = readAt(1);
  data.backgroundColor = readAt(2);
  data.imagePosition = readAt(3);
  data.showEyebrow = readAt(4);
  data.hideTitle = readAt(5);
  data.showDescription = readAt(6);
  data.hideImage = readAt(7);
  data.showDate = readAt(8);
  data.textAlignment = readAt(9);

  const trailing = values
    .slice(styleIndex + 10)
    .map(({ text }) => text);

  const dateFormatIndex = trailing.findIndex(
    (value) => (
      VALID_DATE_FORMATS.has(
        value.toLowerCase(),
      )
    ),
  );

  if (dateFormatIndex >= 0) {
    data.dateFormat = trailing[dateFormatIndex];

    const possibleDate = trailing
      .slice(0, dateFormatIndex)
      .find((value) => (
        parseDateValue(value)
      ));

    if (possibleDate) {
      data.date = possibleDate;
    }

    const displayTags = trailing[dateFormatIndex + 1];

    if (
      displayTags === 'true'
      || displayTags === 'false'
    ) {
      data.displayTags = displayTags;
    }

    if (
      displayTags === 'true'
      && trailing[dateFormatIndex + 2]
    ) {
      data.tags = trailing[dateFormatIndex + 2];
    }
  }

  return data;
}

function normalizeKey(value = '') {
  return value
    .trim()
    .replace(/[-_\s]+(.)?/g, (_, character) => (
      character ? character.toUpperCase() : ''
    ))
    .replace(/^(.)/, (character) => character.toLowerCase());
}

function parseBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  return defaultValue;
}

function stripHtml(value = '') {
  const element = document.createElement('div');
  element.innerHTML = String(value);
  return element.textContent.trim();
}

function getAnchorHref(element) {
  if (!element) {
    return '';
  }

  const anchor = element.matches?.('a')
    ? element
    : element.querySelector('a');

  return anchor?.getAttribute('href') || '';
}

function extractValue(key, element) {
  if (!element) {
    return '';
  }

  if (
    key === 'image'
    || key === 'backgroundImage'
    || key === 'arrowIcon'
    || key === 'fileReference'
    || key === 'filereference'
  ) {
    const image = element.matches?.('img')
      ? element
      : element.querySelector('img');

    const picture = element.matches?.('picture')
      ? element
      : element.closest('picture')
      || element.querySelector('picture')
      || image?.closest('picture');

    return {
      picture: picture || null,
      src: image?.getAttribute('src')
        || element.textContent.trim(),
    };
  }

  if (
    key === 'viewAllLink'
    || key === 'link'
    || key === 'ctaLink'
  ) {
    return getAnchorHref(element)
      || element.textContent.trim();
  }

  if (
    key === 'description'
    || key === 'shortDescription'
  ) {
    return element.innerHTML.trim();
  }

  const text = element.textContent.trim();
  const normalizedText = text.toLowerCase();

  if (normalizedText === 'true') {
    return true;
  }

  if (normalizedText === 'false') {
    return false;
  }

  return text;
}

function applyDefaults(data) {
  return {
    titleType: 'h2',
    style: 'split-image-content',
    personalizationEnabled: false,
    backgroundColor: 'default',
    imagePosition: 'right',
    textAlignment: 'left',
    showEyebrow: true,
    hideTitle: false,
    showDescription: true,
    hideImage: false,
    showDate: false,
    dateFormat: 'mmm-d-yyyy',
    displayTags: false,
    ...data,
  };
}

function isTeaserLinkItem(element) {
  return Boolean(element) && (
    element.dataset?.aueComponent === 'teaser-v1-cta'
    || element.dataset?.aueModel === 'cta'
    || element.dataset?.blockName === 'teaser-v1-cta'
    || element.classList?.contains('teaser-v1-cta')
  );
}

function isTeaserImageItem(element) {
  return Boolean(element) && (
    element.dataset?.aueComponent === 'teaser-v1-image'
    || element.dataset?.aueModel === 'teaser-v1-image'
    || element.dataset?.blockName === 'teaser-v1-image'
    || element.classList?.contains('teaser-v1-image')
  );
}

function isTeaserChildItem(element) {
  return isTeaserLinkItem(element) || isTeaserImageItem(element);
}

function getClosestTeaserChildItem(element, block) {
  let current = element;

  while (current && current !== block) {
    if (isTeaserChildItem(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function getTeaserLinkItems(block) {
  const componentItems = [
    ...block.querySelectorAll(
      '[data-aue-component="teaser-v1-cta"], '
      + '[data-block-name="teaser-v1-cta"], '
      + '.teaser-v1-cta',
    ),
  ];

  if (componentItems.length) {
    return [...new Set(componentItems)];
  }

  return [
    ...block.querySelectorAll('[data-aue-model="cta"]'),
  ];
}

function getTeaserImageItems(block) {
  return [
    ...block.querySelectorAll(
      '[data-aue-component="teaser-v1-image"], '
      + '[data-aue-model="teaser-v1-image"], '
      + '[data-block-name="teaser-v1-image"], '
      + '.teaser-v1-image',
    ),
  ].filter((item, index, items) => (
    items.indexOf(item) === index
  ));
}

function getDirectRows(block) {
  return [...block.querySelectorAll(':scope > div')];
}

function getTopLevelChild(element, block) {
  let current = element;

  while (
    current?.parentElement
    && current.parentElement !== block
  ) {
    current = current.parentElement;
  }

  return current?.parentElement === block
    ? current
    : null;
}

function isMultiCellRow(row) {
  return Boolean(row)
    && row.parentElement
    && row.children.length > 1;
}

function isImageChildRow(row) {
  if (isTeaserImageItem(row)) {
    return true;
  }

  const image = row.querySelector(
    'picture img, img',
  );

  if (!image) {
    return false;
  }

  const values = [...row.children].map((cell) => (
    cell.textContent.trim().toLowerCase()
  ));

  if (values.some((value) => (
    IMAGE_MODES.has(value)
  ))) {
    return true;
  }

  return [
    ...row.querySelectorAll('[data-aue-prop]'),
  ].some((element) => (
    IMAGE_MODES.has(
      element.textContent.trim().toLowerCase(),
    )
  ));
}

function isCtaChildRow(row) {
  if (isTeaserLinkItem(row)) {
    return true;
  }

  if (
    !isMultiCellRow(row)
    || isImageChildRow(row)
  ) {
    return false;
  }

  const cells = [...row.children];

  const hasLink = cells.some((cell) => (
    cell.matches?.('a[href]')
    || cell.querySelector?.('a[href]')
  ));

  if (!hasLink) {
    return false;
  }

  const values = cells.map((cell) => (
    cell.textContent.trim().toLowerCase()
  ));

  const hasCtaView = values.some((value) => (
    VALID_LINK_STYLES.includes(value)
  ));

  const hasShape = values.some((value) => (
    [
      'rectangle',
      'rounded',
      'pill',
    ].includes(value)
  ));

  return hasCtaView || hasShape;
}

function collectTeaserChildren(block) {
  const directRows = getDirectRows(block);

  const instrumentedCtaRows = [
    ...new Set(
      getTeaserLinkItems(block)
        .map((item) => (
          getTopLevelChild(item, block) || item
        )),
    ),
  ];

  const instrumentedImageRows = [
    ...new Set(
      getTeaserImageItems(block)
        .map((item) => (
          getTopLevelChild(item, block) || item
        )),
    ),
  ];

  const knownCtaRows = new Set(
    instrumentedCtaRows,
  );

  const knownImageRows = new Set(
    instrumentedImageRows,
  );

  const structuralImageRows = directRows.filter(
    (row) => (
      !knownCtaRows.has(row)
      && !knownImageRows.has(row)
      && isImageChildRow(row)
    ),
  );

  const imageRows = [
    ...new Set([
      ...instrumentedImageRows,
      ...structuralImageRows,
    ]),
  ];

  const allImageRows = new Set(imageRows);

  const structuralCtaRows = directRows.filter(
    (row) => (
      !knownCtaRows.has(row)
      && !allImageRows.has(row)
      && isCtaChildRow(row)
    ),
  );

  const ctaRows = [
    ...new Set([
      ...instrumentedCtaRows,
      ...structuralCtaRows,
    ]),
  ];

  let mode = 'none';

  if (
    instrumentedCtaRows.length
    || instrumentedImageRows.length
  ) {
    mode = (
      structuralCtaRows.length
      || structuralImageRows.length
    )
      ? 'mixed'
      : 'instrumented';
  } else if (
    ctaRows.length
    || imageRows.length
  ) {
    mode = 'structural';
  }

  return {
    ctaRows,
    imageRows,
    mode,
  };
}

function detachTeaserChildren(children) {
  const childRows = new Set([
    ...children.ctaRows,
    ...children.imageRows,
  ]);

  childRows.forEach((row) => {
    row.remove();
  });
}

function decorateCtaChildren(ctaRows) {
  if (!ctaRows.length) {
    return [];
  }

  loadCSS(
    `${window.hlx.codeBasePath}/blocks/cta/cta.css`,
  );

  return ctaRows.map((row, index) => {
    /*
     * Capture the authored values before decorateCta()
     * transforms the child row.
     */
    const authoredValues = [...row.children]
      .map((cell) => (
        cell.textContent.trim().toLowerCase()
      ));

    const authoredStyle = authoredValues.find((value) => (
      VALID_LINK_STYLES.includes(value)
      && value !== 'default'
    )) || 'secondary';

    const authoredShape = authoredValues.find((value) => (
      [
        'rectangle',
        'rounded',
        'pill',
      ].includes(value)
    )) || 'pill';

    row.classList.add(
      'cta',
      'block',
      'teaser-v1-cta',
      'teaser-cta-item',
    );

    row.dataset.blockName = 'cta';

    decorateCta(row);

    const anchor = row.querySelector('a[href]');

    if (anchor) {
      anchor.classList.add(
        'teaser-cta',
        `teaser-cta-${authoredStyle}`,
        `teaser-cta-shape-${authoredShape}`,
      );
    }

    console.log(
      `[teaser-v1] decorated CTA ${index + 1}:`,
      {
        anchorFound: Boolean(anchor),
        authoredStyle,
        authoredShape,
        rowClasses: [...row.classList],
        anchorClasses: anchor
          ? [...anchor.classList]
          : [],
        html: row.outerHTML,
      },
    );

    return row;
  });
}

function readChildItemRows(item) {
  return [...item.children].map((row) => (
    row.children[0] || row
  ));
}

function readTeaserImageItem(item) {
  const data = {
    image: '',
    imageAlt: '',
    imagePicture: null,
    imageMode: 'normal',
    imageInstrumentation: {
      item,
      image: null,
      imageAlt: null,
    },
  };

  const namedProperties = new Set();

  item.querySelectorAll('[data-aue-prop]').forEach((element) => {
    const property = normalizeKey(
      element.getAttribute('data-aue-prop') || '',
    );

    if (!property) {
      return;
    }

    namedProperties.add(property);

    if (property === 'image') {
      const value = extractValue('image', element);

      data.image = value.src;
      data.imagePicture = value.picture;
      data.imageInstrumentation.image = element;
      return;
    }

    if (property === 'imageAlt') {
      data.imageAlt = extractValue(
        'imageAlt',
        element,
      );
      data.imageInstrumentation.imageAlt = element;
      return;
    }

    if (property === 'imageMode') {
      data.imageMode = extractValue(
        'imageMode',
        element,
      );
    }
  });

  const rows = readChildItemRows(item);

  IMAGE_ITEM_FIELD_ORDER.forEach((key, index) => {
    if (namedProperties.has(key)) {
      return;
    }

    const row = rows[index];

    if (!row) {
      return;
    }

    if (key === 'image') {
      const value = extractValue(key, row);

      if (value.src) {
        data.image = value.src;
        data.imagePicture = value.picture;
        data.imageInstrumentation.image = row;
      }

      return;
    }

    if (key === 'imageAlt') {
      const value = extractValue(key, row);

      if (value) {
        data.imageAlt = value;
        data.imageInstrumentation.imageAlt = row;
      }

      return;
    }

    const value = extractValue(key, row);

    if (
      value !== ''
      && value !== undefined
      && value !== null
    ) {
      data[key] = value;
    }
  });

  const image = item.querySelector('picture img, img');

  if (!data.image && image) {
    data.image = image.getAttribute('src') || '';
    data.imagePicture = image.closest('picture');
    data.imageInstrumentation.image = image;
  }

  if (!data.imageAlt && image) {
    data.imageAlt = image.getAttribute('alt') || '';
  }

  data.imageMode = data.imageMode === 'black-white'
    ? 'black-white'
    : 'normal';

  return data;
}

function readImageChildRow(row) {
  const instrumentedItem = isTeaserImageItem(row)
    ? row
    : row.querySelector(
      '[data-aue-component="teaser-v1-image"], '
      + '[data-aue-model="teaser-v1-image"], '
      + '[data-block-name="teaser-v1-image"], '
      + '.teaser-v1-image',
    );

  if (instrumentedItem) {
    return readTeaserImageItem(
      instrumentedItem,
    );
  }

  const image = row.querySelector(
    'picture img, img',
  );

  const picture = image?.closest('picture')
    || null;

  const cells = row.children.length > 1
    ? [...row.children]
    : [
      ...row.querySelectorAll(
        ':scope > div > div',
      ),
    ];

  const modeCell = cells.find((cell) => (
    IMAGE_MODES.has(
      cell.textContent.trim().toLowerCase(),
    )
  ));

  const imageMode = (
    modeCell?.textContent
      ?.trim()
      ?.toLowerCase()
    === 'black-white'
  )
    ? 'black-white'
    : 'normal';

  const altCell = cells.find((cell) => (
    cell !== modeCell
    && !cell.querySelector(
      'picture img, img',
    )
    && cell.textContent.trim()
    && !IMAGE_MODES.has(
      cell.textContent.trim().toLowerCase(),
    )
  ));

  return {
    image:
      image?.getAttribute('src') || '',
    imageAlt:
      altCell?.textContent.trim()
      || image?.getAttribute('alt')
      || '',
    imagePicture: picture,
    imageMode,
    imageInstrumentation: {
      item: row,
      image,
      imageAlt: altCell || null,
    },
  };
}

function readImageChildren(imageRows) {
  return imageRows
    .map(readImageChildRow)
    .filter((item) => (
      item?.image
      || item?.imagePicture
    ));
}

function parseNamedProperties(block) {
  const data = {};

  block.querySelectorAll('[data-aue-prop]').forEach((element) => {
    if (getClosestTeaserChildItem(element, block)) {
      return;
    }

    const property = element.getAttribute('data-aue-prop');

    if (!property) {
      return;
    }

    const key = normalizeKey(property);

    if (data[key] !== undefined) {
      return;
    }

    const value = extractValue(key, element);

    if (key === 'backgroundImage') {
      data.backgroundImage = value.src;
      data.backgroundImagePicture = value.picture;
    } else {
      data[key] = value;
    }
  });

  return data;
}

function getSemanticPropertyRows(block) {
  const rows = getParentPropertyRows(block);
  const headingRow = rows.find((row) => row.querySelector(
    'h1, h2, h3, h4, h5, h6',
  ));
  const headingIndex = rows.indexOf(headingRow);
  const descriptionRow = rows.find((row, index) => (
    index > headingIndex && row.querySelector('p')
  ));

  return {
    headingRow,
    heading: headingRow?.querySelector('h1, h2, h3, h4, h5, h6'),
    descriptionRow,
  };
}

function parseSemanticProperties(block, existingData) {
  const data = { ...existingData };
  const {
    heading,
    descriptionRow,
  } = getSemanticPropertyRows(block);

  if (heading) {
    if (!data.title) {
      data.title = heading.textContent.trim();
    }

    if (!data.titleType) {
      data.titleType = heading.tagName.toLowerCase();
    }
  }

  if (descriptionRow && !data.description) {
    data.description = descriptionRow.innerHTML.trim();
  }

  return data;
}

function parsePositionalProperties(block, existingData) {
  const data = { ...existingData };
  const semanticRows = getSemanticPropertyRows(block);
  const rows = getParentPropertyRows(block).filter((row) => (
    !Object.values(semanticRows).includes(row)
    && !row.querySelector('[data-aue-prop]')
  ));
  const semanticFields = new Set([
    'title',
    'titleType',
    'description',
  ]);
  const fields = FIELD_ORDER.filter((key) => (
    !semanticFields.has(key) && data[key] === undefined
  ));
  let rowIndex = 0;

  fields.forEach((key) => {
    const row = rows[rowIndex];

    if (!row) {
      return;
    }

    const valueElement = row.children[0] || row;
    const value = extractValue(key, valueElement);

    rowIndex += 1;

    if (key === 'backgroundImage') {
      if (value?.src) {
        data.backgroundImage = value.src;
        data.backgroundImagePicture = value.picture;
      }
    } else if (
      value !== ''
      && value !== null
      && value !== undefined
    ) {
      data[key] = value;
    }
  });

  return data;
}

function getTopLevelRow(element, block) {
  let current = element;

  while (current?.parentElement && current.parentElement !== block) {
    current = current.parentElement;
  }

  return current?.parentElement === block ? current : null;
}

function findNextParentLink(block, propertyName) {
  const propertyElement = [...block.querySelectorAll(
    `[data-aue-prop="${propertyName}"]`,
  )].find((element) => !getClosestTeaserChildItem(element, block));

  if (!propertyElement) {
    return '';
  }

  const propertyRow = getTopLevelRow(propertyElement, block);

  if (!propertyRow) {
    return '';
  }

  let nextRow = propertyRow.nextElementSibling;

  while (nextRow) {
    if (!isTeaserChildItem(nextRow)) {
      const anchor = [...nextRow.querySelectorAll('a')]
        .find((item) => !getClosestTeaserChildItem(item, block));

      if (anchor) {
        return anchor.getAttribute('href') || '';
      }

      const namedProperty = nextRow.querySelector('[data-aue-prop]');
      const name = namedProperty?.getAttribute('data-aue-prop');

      if (name === 'viewAllText') {
        break;
      }
    }

    nextRow = nextRow.nextElementSibling;
  }
  return '';
}

function assignViewAllLinkFromDom(data, block) {
  const nextData = { ...data };

  if (nextData.viewAllText) {
    const viewAllLink = findNextParentLink(block, 'viewAllText');

    if (viewAllLink) {
      nextData.viewAllLink = viewAllLink;
    }
  }

  return nextData;
}

function resolveLinkStyle(linkType, fallbackStyle) {
  if (
    typeof linkType === 'string'
    && VALID_LINK_STYLES.includes(linkType)
    && linkType !== 'default'
  ) {
    return linkType;
  }

  if (
    typeof fallbackStyle === 'string'
    && VALID_LINK_STYLES.includes(fallbackStyle)
  ) {
    return fallbackStyle;
  }

  return 'default';
}

function normalizeLinks(
  links,
  fallbackStyle = 'default',
  authoredLinks = [],
) {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .filter((item) => item?.title && item?.link)
    .map((item, index) => {
      const authoredLink = authoredLinks[index];

      return {
        title: stripHtml(item.title),
        link: String(item.link).trim(),
        style: resolveLinkStyle(
          item.linkType || item.style,
          authoredLink?.style || fallbackStyle,
        ),
        target:
          item.target
          || item.linkTarget
          || authoredLink?.target
          || 'default',
        shape:
          item.shape
          || authoredLink?.shape
          || 'rectangle',
        backgroundColor:
          item.backgroundColor
          || authoredLink?.backgroundColor
          || '',
        textColor:
          item.textColor
          || authoredLink?.textColor
          || '',
        borderColor:
          item.borderColor
          || authoredLink?.borderColor
          || '',
        arrowIcon:
          item.arrowIcon
          || authoredLink?.arrowIcon
          || '',
        arrowDirection:
          item.arrowDirection
          || authoredLink?.arrowDirection
          || 'none',
        arrowColor:
          item.arrowColor
          || authoredLink?.arrowColor
          || 'white',
        instrumentation:
          authoredLink?.instrumentation || null,
      };
    });
}

function normalizeConfiguration(data) {
  const normalizedData = { ...data };

  const validStyles = [
    'split-image-content',
    'split-feature',
    'background-hero',
    'image-collage',
    'no-image-right-desc-links',
  ];

  const validBackgroundColors = [
    'default',
    'grey',
  ];

  const validImagePositions = [
    'left',
    'right',
  ];

  const validTextAlignments = [
    'left',
    'center',
    'right',
    'justify',
  ];

  const validDateFormats = [
    'dd-mm-yyyy',
    'mm-dd-yyyy',
    'mmm-d-yyyy',
  ];

  if (
    normalizedData.style === 'default'
    || !validStyles.includes(normalizedData.style)
  ) {
    normalizedData.style = 'split-image-content';
  }

  if (
    !validBackgroundColors.includes(
      normalizedData.backgroundColor,
    )
  ) {
    normalizedData.backgroundColor = 'default';
  }

  if (
    !validImagePositions.includes(
      normalizedData.imagePosition,
    )
  ) {
    normalizedData.imagePosition = 'right';
  }

  if (
    !validTextAlignments.includes(
      normalizedData.textAlignment,
    )
  ) {
    normalizedData.textAlignment = 'left';
  }

  if (
    !validDateFormats.includes(
      normalizedData.dateFormat,
    )
  ) {
    normalizedData.dateFormat = 'mmm-d-yyyy';
  }

  normalizedData.personalizationEnabled = parseBoolean(
    normalizedData.personalizationEnabled,
    false,
  );

  normalizedData.showEyebrow = parseBoolean(
    normalizedData.showEyebrow,
    true,
  );

  normalizedData.hideTitle = parseBoolean(
    normalizedData.hideTitle,
    false,
  );

  normalizedData.showDescription = parseBoolean(
    normalizedData.showDescription,
    true,
  );

  normalizedData.hideImage = parseBoolean(
    normalizedData.hideImage,
    false,
  );

  normalizedData.showDate = parseBoolean(
    normalizedData.showDate,
    false,
  );

  normalizedData.displayTags = parseBoolean(
    normalizedData.displayTags,
    false,
  );

  return normalizedData;
}

function readBlockData(block, children) {
  let data = parseSemanticProperties(
    block,
    parseNamedProperties(block),
  );

  /*
   * Universal Editor markup includes named properties.
   * Published plain HTML omits empty fields, so parse its
   * configuration from the recognisable style row.
   */
  if (block.querySelector('[data-aue-prop]')) {
    data = parsePositionalProperties(
      block,
      data,
    );
  } else {
    data = parsePublishedConfiguration(
      block,
      data,
    );
  }

  data.images = readImageChildren(
    children.imageRows,
  );

  data = assignViewAllLinkFromDom(
    data,
    block,
  );

  data = applyDefaults(data);
  data = normalizeConfiguration(data);

  /*
   * Authored CTA children are decorated independently
   * using the shared CTA block.
   */
  data.links = [];

  return data;
}

function formatDate(dateValue, format = 'mmm-d-yyyy') {
  if (!dateValue) {
    return '';
  }

  const normalizedDateValue = String(dateValue).trim();
  const date = parseDateValue(normalizedDateValue);

  if (!date) {
    return normalizedDateValue;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  const monthName = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][date.getMonth()];

  switch (String(format).toLowerCase()) {
    case 'dd-mm-yyyy':
      return `${day}-${month}-${year}`;

    case 'mm-dd-yyyy':
      return `${month}-${day}-${year}`;

    case 'mmm-d-yyyy':
    default:
      return `${monthName} ${date.getDate()}, ${year}`;
  }
}

function applyClasses(block, data) {
  const classes = [];

  block.classList.remove(...CONFIGURATION_CLASSES);

  const validVariantClasses = [
    'split-image-content',
    'split-feature',
    'background-hero',
    'image-collage',
    'no-image-right-desc-links',
  ];

  const splitVariants = [
    'split-image-content',
    'split-feature',
  ];

  if (
    typeof data.style === 'string'
    && validVariantClasses.includes(data.style)
  ) {
    classes.push(data.style);
  }

  /*
   * Grey applies only to layouts that support a selectable
   * background color. Hero and collage own their theme.
   */
  if (
    data.backgroundColor === 'grey'
    && ![
      'background-hero',
      'image-collage',
    ].includes(data.style)
  ) {
    classes.push('grey');
  }

  if (
    splitVariants.includes(data.style)
    && ['left', 'right'].includes(data.imagePosition)
  ) {
    classes.push(`image-${data.imagePosition}`);
  }

  const flexibleAlignmentVariants = [
    'split-image-content',
    'split-feature',
    'no-image-right-desc-links',
  ];

  if (
    flexibleAlignmentVariants.includes(data.style)
    && [
      'left',
      'center',
      'right',
      'justify',
    ].includes(data.textAlignment)
  ) {
    classes.push(`text-${data.textAlignment}`);
  }

  if (
    data.hideImage
    || data.style === 'no-image-right-desc-links'
  ) {
    classes.push('hide-image');
  }

  if (data.hideTitle) {
    classes.push('hide-title');
  }

  if (!data.showDescription) {
    classes.push('hide-description');
  }

  if (!data.showEyebrow) {
    classes.push('hide-eyebrow');
  }

  if (data.personalizationEnabled) {
    classes.push('personalized');
  }

  block.classList.add(...classes);
}

function createCTAArrow(arrowIcon, direction, color) {
  const source = typeof arrowIcon === 'string'
    ? arrowIcon
    : arrowIcon?.src;

  if (!source || !['left', 'right'].includes(direction)) {
    return null;
  }

  const arrow = document.createElement('img');

  arrow.src = source;
  arrow.alt = '';
  arrow.className = `teaser-cta-arrow teaser-cta-arrow-${direction} teaser-cta-arrow-${color}`;
  arrow.setAttribute('aria-hidden', 'true');
  arrow.decoding = 'async';

  arrow.addEventListener('error', () => {
    arrow.remove();
  });

  return arrow;
}

function createCTA(link) {
  if (!link?.title || !link?.link) {
    return null;
  }

  const anchor = document.createElement('a');
  let childWrapper = null;
  const style = resolveLinkStyle(link.style, 'default');

  anchor.href = link.link;
  anchor.classList.add(
    'teaser-cta',
    `teaser-cta-${style}`,
    `teaser-cta-shape-${link.shape}`,
  );

  if (link.instrumentation?.item) {
    childWrapper = document.createElement('div');
    childWrapper.className = 'teaser-v1-cta teaser-cta-item';
    moveInstrumentation(link.instrumentation.item, childWrapper);
  }

  if (link.backgroundColor) {
    anchor.style.backgroundColor = link.backgroundColor;
  }

  if (link.textColor) {
    anchor.style.color = link.textColor;
  }

  if (link.borderColor) {
    anchor.style.borderColor = link.borderColor;
  }

  if (link.incomplete) {
    childWrapper?.classList.add('is-incomplete');
  }

  const label = document.createElement('span');
  label.className = 'teaser-cta-label';
  label.textContent = link.title;

  if (link.instrumentation?.title) {
    moveInstrumentation(link.instrumentation.title, label);
  }

  if (link.instrumentation?.link) {
    moveInstrumentation(link.instrumentation.link, anchor);
  }

  if (link.target === 'new-window') {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }

  const arrow = createCTAArrow(
    link.arrowIcon,
    link.arrowDirection,
    link.arrowColor,
  );

  if (arrow && link.arrowDirection === 'left') {
    anchor.append(arrow);
  }

  anchor.append(label);

  if (arrow && link.arrowDirection === 'right') {
    anchor.append(arrow);
  }

  if (childWrapper) {
    childWrapper.append(anchor);
    return childWrapper;
  }

  return anchor;
}

function createCTAs(links = []) {
  if (!links.length) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'teaser-ctas';

  links.forEach((link) => {
    const anchor = createCTA(link);

    if (anchor) {
      wrapper.append(anchor);
    }
  });

  return wrapper.children.length ? wrapper : null;
}

function createViewAll(data) {
  const text = typeof data.viewAllText === 'string'
    ? data.viewAllText.trim()
    : '';

  const href = typeof data.viewAllLink === 'string'
    ? data.viewAllLink.trim()
    : '';

  if (
    !text
    || !href
    || text === 'true'
    || text === 'false'
    || href === 'true'
    || href === 'false'
    || VALID_LINK_STYLES.includes(text)
  ) {
    return null;
  }

  const anchor = document.createElement('a');

  anchor.className = 'teaser-view-all';
  anchor.href = href;
  anchor.textContent = stripHtml(text);

  return anchor;
}

function createTags(data) {
  if (!parseBoolean(data.displayTags)) {
    return null;
  }

  const values = Array.isArray(data.tags)
    ? data.tags
    : String(data.tags || '').split(',');
  const tags = values
    .map((tag) => stripHtml(tag).trim())
    .filter(Boolean);

  if (!tags.length) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'teaser-tags';

  tags.forEach((tag) => {
    const element = document.createElement('span');
    element.className = 'teaser-tag';
    element.textContent = tag;
    wrapper.append(element);
  });

  return wrapper;
}

function renderImageItem(
  imageData,
  slot = '',
  fallbackAlt = '',
) {
  const imageContainer = document.createElement('div');
  imageContainer.className = 'teaser-image teaser-v1-image';

  imageContainer.classList.add(
    `teaser-image-mode-${imageData.imageMode}`,
  );

  if (slot) {
    imageContainer.classList.add(
      `teaser-image-${slot}`,
    );
  }

  if (imageData.imageInstrumentation?.item) {
    moveInstrumentation(
      imageData.imageInstrumentation.item,
      imageContainer,
    );
  }

  const altText = stripHtml(
    imageData.imageAlt || fallbackAlt,
  );

  if (imageData.imagePicture) {
    const picture = imageData.imagePicture.cloneNode(true);
    const image = picture.querySelector('img');

    if (image) {
      image.alt = altText;

      if (imageData.imageInstrumentation?.image) {
        moveInstrumentation(
          imageData.imageInstrumentation.image,
          image,
        );
      }
    }

    imageContainer.append(picture);
    return imageContainer;
  }

  if (!imageData.image) {
    imageContainer.classList.add('is-empty');

    const placeholder = document.createElement('span');
    placeholder.className = 'teaser-image-placeholder';
    placeholder.textContent = 'Select an image';

    imageContainer.append(placeholder);
    return imageContainer;
  }

  const picture = createOptimizedPicture(
    stripHtml(imageData.image).trim(),
    altText,
    false,
    [{ width: '800' }],
  );

  const image = picture.querySelector('img');

  if (image && imageData.imageInstrumentation?.image) {
    moveInstrumentation(
      imageData.imageInstrumentation.image,
      image,
    );
  }

  imageContainer.append(picture);
  return imageContainer;
}

function renderImages(data) {
  if (!Array.isArray(data.images) || !data.images.length) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'teaser-images';

  data.images.forEach((imageData, index) => {
    const isCollage = data.style === 'image-collage';
    const slot = isCollage
      ? IMAGE_COLLAGE_SLOTS[index] || ''
      : '';
    const fallbackAlt = isCollage
      ? ''
      : data.title || '';

    wrapper.append(
      renderImageItem(
        imageData,
        slot,
        fallbackAlt,
      ),
    );
  });

  return wrapper;
}

function renderContent(data, decoratedCtas = []) {
  const wrapper = document.createElement('div');
  wrapper.className = 'teaser-content';

  if (
    parseBoolean(data.showEyebrow, true)
    && data.eyebrow
  ) {
    const eyebrow = document.createElement('p');

    eyebrow.className = 'teaser-eyebrow';
    eyebrow.textContent = stripHtml(data.eyebrow);

    wrapper.append(eyebrow);
  }

  if (!parseBoolean(data.hideTitle) && data.title) {
    const requestedTag = String(
      data.titleType || '',
    ).toLowerCase();

    const headingTag = VALID_HEADING_TAGS.includes(
      requestedTag,
    )
      ? requestedTag
      : 'h2';

    const heading = document.createElement(headingTag);

    heading.className = 'teaser-title';
    heading.textContent = stripHtml(data.title);

    wrapper.append(heading);
  }

  if (
    parseBoolean(data.showDate)
    && (data.date || data.lastModified)
  ) {
    const rawDate = data.date || data.lastModified;
    const parsedDate = parseDateValue(rawDate);
    const date = document.createElement('time');

    date.className = 'teaser-date';
    date.textContent = formatDate(
      rawDate,
      data.dateFormat,
    );

    if (parsedDate) {
      const normalizedRawDate = String(rawDate).trim();
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(
        normalizedRawDate,
      );

      date.dateTime = isDateOnly
        ? normalizedRawDate
        : parsedDate.toISOString();
    }

    wrapper.append(date);
  }

  if (
    parseBoolean(data.showDescription, true)
    && (data.description || data.shortDescription)
  ) {
    if (data.description) {
      const description = document.createElement('div');

      description.className = 'teaser-description';
      description.innerHTML = data.description;

      wrapper.append(description);
    }

    if (data.shortDescription) {
      const shortDescription = document.createElement('div');

      shortDescription.className = 'teaser-short-description';

      shortDescription.innerHTML = data.shortDescription;

      wrapper.append(shortDescription);
    }
  }

  const tags = createTags(data);

  if (tags) {
    wrapper.append(tags);
  }

  if (decoratedCtas.length) {
    const ctaWrapper = document.createElement('div');

    ctaWrapper.className = 'teaser-ctas';

    ctaWrapper.append(...decoratedCtas);
    wrapper.append(ctaWrapper);
  } else {
    const ctas = createCTAs(data.links);

    if (ctas) {
      wrapper.append(ctas);
    }
  }

  const viewAll = createViewAll(data);

  if (viewAll) {
    wrapper.append(viewAll);
  }

  return wrapper;
}

function renderTeaser(
  data,
  decoratedCtas = [],
) {
  const wrapper = document.createElement('div');
  wrapper.className = 'teaser-wrapper';

  const images = renderImages(data);

  if (images) {
    wrapper.append(images);
  }

  const body = document.createElement('div');
  body.className = 'teaser-body';
  body.append(
    renderContent(
      data,
      decoratedCtas,
    ),
  );

  wrapper.append(body);
  return wrapper;
}

async function renderPersonalized(
  block,
  data,
  decoratedCtas = [],
) {
  try {
    const targetConfig = getTargetConfig('teaser-v1');

    const decision = await getDecision(targetConfig);

    if (!decision?.data) {
      setPersonalizationAttributes(
        block,
        true,
        'fallback',
      );

      return renderTeaser(
        data,
        decoratedCtas,
      );
    }

    const personalizedImage = decision.data.image || '';

    const hasPersonalizedLinks = Array.isArray(decision.data.links);

    const personalizedData = {
      ...data,
      eyebrow:
        decision.data.eyebrow
        || data.eyebrow,
      title:
        decision.data.title
        || data.title,
      description:
        decision.data.description
        || data.description,
      shortDescription:
        decision.data.shortDescription
        || data.shortDescription,
      images: personalizedImage
        ? [
          {
            image: personalizedImage,
            imageAlt:
              decision.data.imageAlt
              || data.images?.[0]?.imageAlt
              || '',
            imagePicture: null,
            imageMode:
              data.images?.[0]?.imageMode
              || 'normal',
            imageInstrumentation:
              data.images?.[0]
                ?.imageInstrumentation
              || null,
          },
          ...((data.images || []).slice(1)),
        ]
        : data.images,
      links: hasPersonalizedLinks
        ? normalizeLinks(
          decision.data.links,
          'default',
          data.links,
        )
        : data.links,
    };

    setPersonalizationAttributes(
      block,
      true,
      'personalized',
      decision.data.persona,
    );

    await sendPropositionDisplay(decision);

    return renderTeaser(
      personalizedData,
      hasPersonalizedLinks
        ? []
        : decoratedCtas,
    );
  } catch (error) {
    console.error(
      'teaser-v1: personalization failed',
      error,
    );

    setPersonalizationAttributes(
      block,
      true,
      'fallback',
    );

    return renderTeaser(
      data,
      decoratedCtas,
    );
  }
}

function createBackground(data) {
  if (
    !data.backgroundImage
    && !data.backgroundImagePicture
  ) {
    return null;
  }

  const background = document.createElement('div');
  background.className = 'teaser-background';
  background.setAttribute('aria-hidden', 'true');

  if (data.backgroundImagePicture) {
    const picture = data.backgroundImagePicture.cloneNode(true);
    const image = picture.querySelector('img');

    if (image) {
      image.alt = '';
    }

    background.append(picture);
    return background;
  }

  const image = document.createElement('img');

  image.src = data.backgroundImage;
  image.alt = '';
  image.decoding = 'async';

  image.addEventListener('error', () => {
    background.remove();
  });

  background.append(image);

  return background;
}

export default async function decorate(block) {
  /*
   * The Hero block proves that nested children arrive
   * as multi-cell direct rows on published pages.
   */
  console.log(
    '[teaser-v1] direct rows:',
    getDirectRows(block).map((row, index) => ({
      index,
      cells: row.children.length,
      hasImage: Boolean(
        row.querySelector('picture img, img'),
      ),
      hasLink: Boolean(
        row.querySelector('a[href]'),
      ),
      values: [...row.children].map((cell) => (
        cell.textContent.trim()
      )),
      html: row.outerHTML,
    })),
  );
  const children = collectTeaserChildren(
    block,
  );

  console.log(
    '[teaser-v1] child mode:',
    children.mode,
  );

  console.log(
    '[teaser-v1] CTA rows:',
    children.ctaRows.length,
    children.ctaRows,
  );

  console.log(
    '[teaser-v1] Image rows:',
    children.imageRows.length,
    children.imageRows,
  );

  /*
   * Remove children before parsing the parent.
   * This prevents child cells from shifting the Teaser
   * parent field positions.
   */
  detachTeaserChildren(children);

  const decoratedCtas = decorateCtaChildren(
    children.ctaRows,
  );

  const data = readBlockData(
    block,
    children,
  );

  console.log(
    '[teaser-v1] parsed data:',
    data,
  );

  applyClasses(block, data);

  const content = parseBoolean(
    data.personalizationEnabled,
  )
    ? await renderPersonalized(
      block,
      data,
      decoratedCtas,
    )
    : renderTeaser(
      data,
      decoratedCtas,
    );

  const supportsBackgroundImage = [
    'background-hero',
    'image-collage',
  ].includes(data.style);

  const background = supportsBackgroundImage
    ? createBackground(data)
    : null;

  block.replaceChildren(
    ...(
      background
        ? [background, content]
        : [content]
    ),
  );
}
