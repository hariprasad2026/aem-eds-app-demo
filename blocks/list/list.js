import { createOptimizedPicture } from '../../scripts/aem.js';

const CONFIG_FIELDS = new Set([
  'title',
  'description',
  'ctalabel',
  'ctalink',
  'listtype',
  'showeyebrow',
  'showtitle',
  'showdescription',
  'showimage',
  'showdate',
  'dateformat',
  'displaytags',
  'authordetails',
  'showicon',
  'linkitem',
  'cardscolor',
  'orderby',
  'sortorder',
]);

const LIST_ITEM_ORDER = [
  'itemEyebrow',
  'itemTitle',
  'itemDescription',
  'itemImage',
  'itemImageAlt',
  'itemDate',
  'itemTags',
  'itemAuthor',
  'itemIcon',
  'itemLink',
];

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function readValue(cell) {
  if (!cell) return '';
  const image = cell.querySelector('img');
  if (image) return image;
  const link = cell.querySelector('a[href]');
  if (link) return link.getAttribute('href') || link.href;
  return cell.textContent.trim();
}

function readText(cell) {
  if (!cell) return '';
  return cell.textContent.trim();
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ['true', 'yes', '1', 'on'].includes(normalized);
}

function formatDate(raw, format) {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.valueOf())) return String(raw);

  if (format === 'dd-mm-yyyy') {
    return [
      String(date.getDate()).padStart(2, '0'),
      String(date.getMonth() + 1).padStart(2, '0'),
      date.getFullYear(),
    ].join('-');
  }

  if (format === 'mm-dd-yyyy') {
    return [
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
      date.getFullYear(),
    ].join('-');
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildHeader(config) {
  const header = document.createElement('header');
  header.className = 'list-header';

  const topRow = document.createElement('div');
  topRow.className = 'list-header-top';

  if (config.title) {
    const heading = document.createElement('h2');
    heading.className = 'list-heading';
    heading.textContent = config.title;
    topRow.append(heading);
  }

  if (config.ctaLabel) {
    const cta = config.ctaLink
      ? document.createElement('a')
      : document.createElement('span');
    cta.className = 'list-cta';
    if (cta.tagName === 'A') {
      cta.href = config.ctaLink;
      cta.setAttribute('aria-label', config.ctaLabel);
    } else {
      cta.classList.add('list-cta-static');
    }

    const ctaLabel = document.createElement('span');
    ctaLabel.className = 'list-cta-label';
    ctaLabel.textContent = config.ctaLabel;

    const ctaArrow = document.createElement('span');
    ctaArrow.className = 'list-cta-arrow';
    ctaArrow.setAttribute('aria-hidden', 'true');
    ctaArrow.textContent = '→';

    cta.append(ctaLabel, ctaArrow);
    topRow.append(cta);
  }

  if (!config.ctaLabel) {
    topRow.classList.add('list-header-top-no-cta');
  }

  if (topRow.childElementCount) {
    header.append(topRow);
  }

  if (config.description) {
    const description = document.createElement('div');
    description.className = 'list-description';
    description.innerHTML = config.description;
    header.append(description);
  }

  return header;
}

function createItemBody(item, config) {
  const body = document.createElement('div');
  body.className = 'list-item-body';

  if (config.showEyebrow && item.itemEyebrow) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'list-item-eyebrow';
    eyebrow.textContent = item.itemEyebrow;
    body.append(eyebrow);
  }

  if (config.showTitle && item.itemTitle) {
    const title = document.createElement('h3');
    title.className = 'list-item-title';
    title.textContent = item.itemTitle;
    body.append(title);
  }

  if (config.showDescription && item.itemDescription) {
    const description = document.createElement('p');
    description.className = 'list-item-description';
    description.textContent = item.itemDescription;
    body.append(description);
  }

  if (config.showDate && item.itemDate) {
    const date = document.createElement('time');
    date.className = 'list-item-date';
    date.textContent = formatDate(item.itemDate, config.dateFormat);
    body.append(date);
  }

  if (config.displayTags && item.itemTags) {
    const tags = document.createElement('p');
    tags.className = 'list-item-tags';
    tags.textContent = item.itemTags;
    body.append(tags);
  }

  if (config.authorDetails && item.itemAuthor) {
    const author = document.createElement('p');
    author.className = 'list-item-author';
    author.textContent = item.itemAuthor;
    body.append(author);
  }

  return body;
}

function createCardItem(item, config) {
  const li = document.createElement('li');
  li.className = 'list-item';

  const cardRoot = config.linkItem && item.itemLink
    ? document.createElement('a')
    : document.createElement('article');
  cardRoot.className = 'list-card';
  if (cardRoot.tagName === 'A') cardRoot.href = item.itemLink;

  if (config.showImage && item.itemImage instanceof Element) {
    const image = item.itemImage;
    const optimizedPicture = createOptimizedPicture(
      image.src,
      item.itemImageAlt || image.alt || item.itemTitle || '',
      false,
      [{ width: '750' }],
    );
    optimizedPicture.className = 'list-item-image';
    cardRoot.append(optimizedPicture);
  }

  if (config.showIcon && item.itemIcon instanceof Element) {
    const iconWrap = document.createElement('span');
    iconWrap.className = 'list-item-icon';
    iconWrap.append(item.itemIcon.cloneNode(true));
    cardRoot.append(iconWrap);
  }

  cardRoot.append(createItemBody(item, config));

  if (!config.linkItem && item.itemLink) {
    const inlineLink = document.createElement('a');
    inlineLink.className = 'list-item-link';
    inlineLink.href = item.itemLink;
    inlineLink.textContent = 'Learn more';
    cardRoot.append(inlineLink);
  }

  li.append(cardRoot);
  return li;
}

function renderDefault(items, config) {
  const list = document.createElement('ul');
  list.className = 'list-default';
  items.forEach((item) => {
    list.append(createCardItem(item, {
      ...config,
      showImage: false,
      showIcon: false,
    }));
  });
  return list;
}

function renderCards(items, config) {
  const list = document.createElement('ul');
  list.className = 'list-cards';
  items.forEach((item) => list.append(createCardItem(item, config)));
  return list;
}

function renderHeroCards(items, config) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-hero-layout';
  if (!items.length) return wrapper;

  const [hero, ...rest] = items;
  const heroList = document.createElement('ul');
  heroList.className = 'list-hero';
  heroList.append(createCardItem(hero, config));
  wrapper.append(heroList);

  if (rest.length) {
    const grid = document.createElement('ul');
    grid.className = 'list-cards';
    rest.forEach((item) => grid.append(createCardItem(item, config)));
    wrapper.append(grid);
  }

  return wrapper;
}

function renderTable(items, config) {
  const table = document.createElement('table');
  table.className = 'list-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Title', 'Description', 'Date', 'Tags', 'Author'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.append(th);
  });
  thead.append(headRow);

  const tbody = document.createElement('tbody');
  items.forEach((item) => {
    const row = document.createElement('tr');
    const titleCell = document.createElement('td');
    if (item.itemLink) {
      const link = document.createElement('a');
      link.href = item.itemLink;
      link.textContent = item.itemTitle || 'Untitled';
      titleCell.append(link);
    } else {
      titleCell.textContent = item.itemTitle || 'Untitled';
    }

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = config.showDescription ? item.itemDescription || '' : '';

    const dateCell = document.createElement('td');
    dateCell.textContent = config.showDate ? formatDate(item.itemDate, config.dateFormat) : '';

    const tagsCell = document.createElement('td');
    tagsCell.textContent = config.displayTags ? item.itemTags || '' : '';

    const authorCell = document.createElement('td');
    authorCell.textContent = config.authorDetails ? item.itemAuthor || '' : '';

    row.append(titleCell, descriptionCell, dateCell, tagsCell, authorCell);
    tbody.append(row);
  });

  table.append(thead, tbody);
  return table;
}

function sortItems(items, config) {
  return [...items].sort((a, b) => {
    if (config.orderBy === 'last-modified') {
      const dateA = new Date(a.itemDate || 0).valueOf();
      const dateB = new Date(b.itemDate || 0).valueOf();
      return config.sortOrder === 'descending' ? dateB - dateA : dateA - dateB;
    }

    const titleA = (a.itemTitle || '').toLowerCase();
    const titleB = (b.itemTitle || '').toLowerCase();
    const comparison = titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    return config.sortOrder === 'descending' ? -comparison : comparison;
  });
}

function parseConfigRows(block) {
  const config = {};

  [...block.querySelectorAll('[data-aue-prop]')].forEach((element) => {
    const prop = normalize(element.dataset.aueProp);
    if (CONFIG_FIELDS.has(prop)) {
      if (prop === 'ctalabel') {
        config[prop] = readText(element);
        const ctaAnchor = element.querySelector('a[href]');
        if (ctaAnchor && !config.ctalink) {
          config.ctalink = ctaAnchor.getAttribute('href') || ctaAnchor.href;
        }
      } else {
        config[prop] = readValue(element);
      }
    }
  });

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;

    const key = normalize(cells[0].textContent);
    if (CONFIG_FIELDS.has(key) && !config[key]) {
      if (key === 'ctalabel') {
        config[key] = readText(cells[1]);
        const ctaAnchor = cells[1].querySelector('a[href]');
        if (ctaAnchor && !config.ctalink) {
          config.ctalink = ctaAnchor.getAttribute('href') || ctaAnchor.href;
        }
      } else {
        config[key] = readValue(cells[1]);
      }
    }
  });

  return {
    title: config.title || '',
    description: config.description || '',
    ctaLabel: config.ctalabel || '',
    ctaLink: config.ctalink || '',
    listType: config.listtype || 'default',
    showEyebrow: parseBoolean(config.showeyebrow, false),
    showTitle: parseBoolean(config.showtitle, true),
    showDescription: parseBoolean(config.showdescription, false),
    showImage: parseBoolean(config.showimage, true),
    showDate: parseBoolean(config.showdate, false),
    dateFormat: config.dateformat || 'mmm-d-yyyy',
    displayTags: parseBoolean(config.displaytags, true),
    authorDetails: parseBoolean(config.authordetails, false),
    showIcon: parseBoolean(config.showicon, false),
    linkItem: parseBoolean(config.linkitem, false),
    cardsColor: config.cardscolor || 'blue',
    orderBy: config.orderby || 'title',
    sortOrder: config.sortorder || 'ascending',
  };
}

function parseItems(block) {
  const markedRows = [...block.children].filter((row) => row.querySelector('[data-aue-prop^="item"]'));
  const rows = markedRows.length
    ? markedRows
    : [...block.children].filter((row) => row.children.length >= 4);

  return rows.map((row) => {
    const item = {};
    const markedFields = [...row.querySelectorAll('[data-aue-prop^="item"]')];

    if (markedFields.length) {
      markedFields.forEach((field) => {
        item[field.dataset.aueProp] = readValue(field);
      });
      return item;
    }

    LIST_ITEM_ORDER.forEach((field, index) => {
      item[field] = readValue(row.children[index]);
    });
    return item;
  }).filter((item) => item.itemTitle || item.itemLink || item.itemDescription);
}

export default function decorate(block) {
  const config = parseConfigRows(block);
  const sortedItems = sortItems(parseItems(block), config);

  block.textContent = '';
  block.classList.add('list', `list-theme-${config.cardsColor}`);
  block.append(buildHeader(config));

  let rendered;
  if (config.listType === 'card') {
    rendered = renderCards(sortedItems, config);
  } else if (config.listType === 'hero-card') {
    rendered = renderHeroCards(sortedItems, config);
  } else if (config.listType === 'table-list') {
    rendered = renderTable(sortedItems, config);
  } else {
    rendered = renderDefault(sortedItems, config);
  }

  block.append(rendered);
}
