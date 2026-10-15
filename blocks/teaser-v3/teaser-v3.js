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
  'image',
  'imageAlt',
  'imageOpacity',
  'imageBorderRadius',
  'imageMode',
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
  'no-image-right-desc-links',
  'grey',
  'black',
  'white',
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

const IMAGE_MODES = new Set([
  'normal',
  'black-white',
]);

const VALID_TEASER_STYLES = new Set([
  'split-image-content',
  'split-feature',
  'background-hero',
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
      src:
        image?.getAttribute('src')
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

  const rowsBeforeStyle = values.slice(
    0,
    styleIndex,
  );

  const imageIndex = rowsBeforeStyle.findIndex(
    ({ row }) => (
      row.querySelector('picture img, img')
    ),
  );

  const semanticRows = getSemanticPropertyRows(
    block,
  );

  const excludedRows = new Set([
    semanticRows.headingRow,
    semanticRows.descriptionRow,
  ]);

  const eyebrowSearchEnd = imageIndex >= 0
    ? imageIndex
    : rowsBeforeStyle.length;

  const eyebrowEntry = rowsBeforeStyle
    .slice(0, eyebrowSearchEnd)
    .find(({ row, text }) => {
      const normalizedText = text.trim().toLowerCase();

      return (
        text
        && !VALID_HEADING_TAGS.includes(
          normalizedText,
        )
        && !excludedRows.has(row)
        && !row.querySelector(
          'picture, img, a[href], p, ul, ol',
        )
      );
    });

  if (!data.eyebrow && eyebrowEntry) {
    data.eyebrow = eyebrowEntry.text;
  }

  if (imageIndex >= 0) {
    const imageEntry = rowsBeforeStyle[imageIndex];

    const imageValue = extractValue(
      'image',
      imageEntry.row.children[0]
      || imageEntry.row,
    );

    if (imageValue?.src) {
      data.image = imageValue.src;
      data.imagePicture = imageValue.picture;
    }

    /*
     * Image Alt may be omitted from published HTML.
     * Locate Image Mode, then parse Radius and Opacity
     * from the two preceding values.
     */
    const imageSettings = rowsBeforeStyle
      .slice(imageIndex + 1)
      .map(({ text }) => text);

    const imageModeIndex = imageSettings.findIndex(
      (value) => (
        IMAGE_MODES.has(
          value.trim().toLowerCase(),
        )
      ),
    );

    if (imageModeIndex >= 2) {
      data.imageMode = imageSettings[imageModeIndex]
        .trim()
        .toLowerCase();

      data.imageBorderRadius = imageSettings[
        imageModeIndex - 1
      ];

      data.imageOpacity = imageSettings[
        imageModeIndex - 2
      ];

      const imageAlt = imageSettings
        .slice(0, imageModeIndex - 2)
        .find((value) => (
          value.trim()
        ));

      if (imageAlt) {
        data.imageAlt = imageAlt;
      }
    }
  }

  /*
   * Style and all following configuration fields must be
   * parsed even when the Teaser has no image.
   */
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

function applyDefaults(data) {
  return {
    titleType: 'h2',
    style: 'split-image-content',
    personalizationEnabled: false,
    backgroundColor: 'default',
    imagePosition: 'right',
    imageOpacity: 100,
    imageBorderRadius: 16,
    imageMode: 'normal',
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
    element.dataset?.aueComponent === 'teaser-v3-cta'
    || element.dataset?.aueModel === 'cta'
    || element.dataset?.blockName === 'teaser-v3-cta'
    || element.classList?.contains('teaser-v3-cta')
  );
}

function isTeaserChildItem(element) {
  return isTeaserLinkItem(element);
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
      '[data-aue-component="teaser-v3-cta"], '
      + '[data-block-name="teaser-v3-cta"], '
      + '.teaser-v3-cta',
    ),
  ];

  if (componentItems.length) {
    return [...new Set(componentItems)];
  }

  return [
    ...block.querySelectorAll('[data-aue-model="cta"]'),
  ];
}

function getDirectRows(block) {
  return [...block.children];
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

function isCtaChildRow(row) {
  if (isTeaserLinkItem(row)) {
    return true;
  }

  if (!isMultiCellRow(row)) {
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

  const hasShape = values.some((value) => (
    [
      'rectangle',
      'rounded',
      'pill',
    ].includes(value)
  ));

  const hasCtaStructure = values.some((value) => (
    [
      'before',
      'after',
      'left',
      'center',
      'right',
      'auto',
      'half',
      'full',
    ].includes(value)
  ));

  return hasShape && hasCtaStructure;
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

  const knownCtaRows = new Set(
    instrumentedCtaRows,
  );

  const structuralCtaRows = directRows.filter(
    (row) => (
      !knownCtaRows.has(row)
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

  if (instrumentedCtaRows.length) {
    mode = structuralCtaRows.length
      ? 'mixed'
      : 'instrumented';
  } else if (structuralCtaRows.length) {
    mode = 'structural';
  }

  return {
    ctaRows,
    mode,
  };
}

function detachTeaserChildren(children) {
  children.ctaRows.forEach((row) => {
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

  return ctaRows.map((row) => {
    row.classList.add(
      'cta',
      'block',
      'teaser-v3-cta',
      'teaser-cta-item',
    );

    row.dataset.blockName = 'cta';

    decorateCta(row);

    const anchor = row.querySelector('a[href]');

    if (anchor) {
      anchor.classList.add('teaser-cta');
    }

    return row;
  });
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

    if (key === 'image') {
      if (value?.src) {
        data.image = value.src;
        data.imagePicture = value.picture;
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

    if (key === 'image') {
      if (value?.src) {
        data.image = value.src;
        data.imagePicture = value.picture;
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

function clampNumber(
  value,
  minimum,
  maximum,
  fallback,
) {
  if (
    value === ''
    || value === null
    || value === undefined
  ) {
    return fallback;
  }

  const parsedValue = Number.parseFloat(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(minimum, parsedValue),
  );
}

function normalizeConfiguration(data) {
  const normalizedData = { ...data };

  const validStyles = [
    'split-image-content',
    'split-feature',
    'background-hero',
    'no-image-right-desc-links',
  ];

  const validBackgroundColors = [
    'default',
    'grey',
    'black',
    'white',
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

  normalizedData.imageOpacity = clampNumber(
    normalizedData.imageOpacity,
    0,
    100,
    100,
  );

  normalizedData.imageBorderRadius = clampNumber(
    normalizedData.imageBorderRadius,
    0,
    9999,
    16,
  );

  const normalizedImageMode = String(
    normalizedData.imageMode || '',
  ).trim().toLowerCase();

  normalizedData.imageMode = IMAGE_MODES.has(
    normalizedImageMode,
  )
    ? normalizedImageMode
    : 'normal';

  return normalizedData;
}

function readBlockData(block) {
  let data = parseSemanticProperties(
    block,
    parseNamedProperties(block),
  );

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

  data = assignViewAllLinkFromDom(
    data,
    block,
  );

  data = applyDefaults(data);
  data = normalizeConfiguration(data);
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

function applyImageSettings(block, data) {
  block.style.setProperty(
    '--teaser-image-opacity',
    String(data.imageOpacity / 100),
  );

  block.style.setProperty(
    '--teaser-image-radius',
    `${data.imageBorderRadius}px`,
  );
}

function applyClasses(block, data) {
  const classes = [];

  block.classList.remove(...CONFIGURATION_CLASSES);

  const validVariantClasses = [
    'split-image-content',
    'split-feature',
    'background-hero',
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
    [
      'grey',
      'black',
      'white',
    ].includes(data.backgroundColor)
    && data.style !== 'background-hero'
  ) {
    classes.push(data.backgroundColor);
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
  arrow.className = [
    'teaser-cta-arrow',
    `teaser-cta-arrow-${direction}`,
    `teaser-cta-arrow-${color}`,
  ].join(' ');
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
    childWrapper.className = 'teaser-v3-cta teaser-cta-item';
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

function renderImage(data) {
  if (
    parseBoolean(data.hideImage)
    || (
      !data.image
      && !data.imagePicture
    )
  ) {
    return null;
  }

  const imageContainer = document.createElement('div');

  imageContainer.className = 'teaser-image teaser-v3-image';

  imageContainer.classList.add(
    `teaser-image-mode-${data.imageMode}`,
  );

  const altText = stripHtml(
    data.imageAlt || '',
  );

  let picture;

  if (data.imagePicture) {
    picture = data.imagePicture.cloneNode(true);

    const image = picture.querySelector('img');

    if (image) {
      image.alt = altText;
    }
  } else {
    picture = createOptimizedPicture(
      stripHtml(data.image).trim(),
      altText,
      false,
      [{ width: '800' }],
    );
  }

  imageContainer.append(picture);

  return imageContainer;
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

  if (data.style !== 'background-hero') {
    const image = renderImage(data);

    if (image) {
      const imageWrapper = document.createElement('div');

      imageWrapper.className = 'teaser-images';
      imageWrapper.append(image);
      wrapper.append(imageWrapper);
    }
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
    const targetConfig = getTargetConfig('teaser-v3');

    const decision = await getDecision(targetConfig);

    if (!decision?.data) {
      setPersonalizationAttributes(
        block,
        true,
        'fallback',
      );

      return {
        data,
        content: renderTeaser(
          data,
          decoratedCtas,
        ),
      };
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
      image:
        personalizedImage
        || data.image,
      imagePicture:
        personalizedImage
          ? null
          : data.imagePicture,
      imageAlt:
        decision.data.imageAlt
        || data.imageAlt,
      imageMode:
        decision.data.imageMode
        || data.imageMode,
      links: hasPersonalizedLinks
        ? normalizeLinks(
          decision.data.links,
          'default',
          data.links,
        )
        : data.links,
    };

    personalizedData.imageOpacity = clampNumber(
      decision.data.imageOpacity
      ?? data.imageOpacity,
      0,
      100,
      100,
    );

    personalizedData.imageBorderRadius = clampNumber(
      decision.data.imageBorderRadius
      ?? data.imageBorderRadius,
      0,
      9999,
      16,
    );

    const personalizedImageMode = String(
      personalizedData.imageMode || '',
    ).trim().toLowerCase();

    personalizedData.imageMode = IMAGE_MODES.has(
      personalizedImageMode,
    )
      ? personalizedImageMode
      : 'normal';

    setPersonalizationAttributes(
      block,
      true,
      'personalized',
      decision.data.persona,
    );

    await sendPropositionDisplay(decision);

    return {
      data: personalizedData,
      content: renderTeaser(
        personalizedData,
        hasPersonalizedLinks
          ? []
          : decoratedCtas,
      ),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      'teaser-v3: personalization failed',
      error,
    );

    setPersonalizationAttributes(
      block,
      true,
      'fallback',
    );

    return {
      data,
      content: renderTeaser(
        data,
        decoratedCtas,
      ),
    };
  }
}

function createBackground(data) {
  if (
    data.style !== 'background-hero'
    || parseBoolean(data.hideImage)
    || (
      !data.image
      && !data.imagePicture
    )
  ) {
    return null;
  }

  const background = document.createElement('div');

  background.className = 'teaser-background';

  background.classList.add(
    `teaser-image-mode-${data.imageMode}`,
  );

  background.setAttribute(
    'aria-hidden',
    'true',
  );

  let picture;

  if (data.imagePicture) {
    picture = data.imagePicture.cloneNode(true);

    const image = picture.querySelector('img');

    if (image) {
      image.alt = '';
    }
  } else {
    picture = createOptimizedPicture(
      stripHtml(data.image).trim(),
      '',
      false,
      [{ width: '2000' }],
    );
  }

  background.append(picture);

  return background;
}

export default async function decorate(block) {
  const children = collectTeaserChildren(block);

  detachTeaserChildren(children);

  const decoratedCtas = decorateCtaChildren(
    children.ctaRows,
  );

  const data = readBlockData(block);

  applyClasses(block, data);

  let resolvedData = data;
  let content;

  if (parseBoolean(data.personalizationEnabled)) {
    const personalizedResult = await renderPersonalized(
      block,
      data,
      decoratedCtas,
    );

    resolvedData = personalizedResult.data;
    content = personalizedResult.content;
  } else {
    content = renderTeaser(
      data,
      decoratedCtas,
    );
  }

  /*
   * Apply the image settings after personalization so
   * personalized opacity and radius values take effect.
   */
  applyImageSettings(
    block,
    resolvedData,
  );

  /*
   * The parent image becomes a background image only for
   * the Background Hero variant.
   */
  const background = resolvedData.style === 'background-hero'
    ? createBackground(resolvedData)
    : null;

  block.replaceChildren(
    ...(
      background
        ? [background, content]
        : [content]
    ),
  );
}
