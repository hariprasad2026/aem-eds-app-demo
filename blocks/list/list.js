import { createOptimizedPicture } from '../../scripts/aem.js';
import { getAEMPublish } from '../../scripts/endpointconfig.js';

/**
* Normalizes tag strings into comparison tokens
*/
function getTagTokens(tagStr) {
  if (!tagStr) return [];
  const clean = String(tagStr)
    .trim()
    .toLowerCase()
    .replace(/^.*:/, '')
    .replace(/[^a-z0-9/_-]/g, '')
    .replace(/^\/+|\/+$/g, '');

  const segments = clean.split('/').filter(Boolean);
  const leaf = segments.length ? segments[segments.length - 1] : clean;
  return Array.from(new Set([clean, leaf, ...segments])).filter(Boolean);
}

/**
* Checks if an item's tag matches an authored tag flexibly
*/
function isTagMatching(itemTagStr, authoredTagStr) {
  const itemTokens = getTagTokens(itemTagStr);
  const authoredTokens = getTagTokens(authoredTagStr);

  return authoredTokens.some((at) => itemTokens.some((it) => (
    it === at || it.includes(at) || at.includes(it)
  )));
}

/**
* Extract property values safely without destroying UE instrumentation
*/
function getProp(block, name, fallback = '') {
  const lowerName = name.toLowerCase();
  const normalizedName = lowerName.replace(/[-_\s]/g, '');
  const roots = [block, ...block.querySelectorAll('.list-ue-store')];
  const fieldOrder = [
    'listType',
    'parentPage',
    'childDepth',
    'maxItems',
    'fixedItems',
    'tagsParentPage',
    'tagsChildDepth',
    'tags',
    'tagMatch',
    'tagResultType',
    'maxItemsTags',
    'title',
    'description',
    'ctaLabel',
    'ctaLink',
    'linkItems',
    'orderBy',
    'sortOrder',
    'cardColor',
    'listStyle',
    'showEyebrow',
    'showTitle',
    'showDescription',
    'showImage',
    'showDate',
    'dateFormat',
    'showAuthor',
    'showIcon',
  ];

  const readValue = (element) => {
    if (!element) return '';
    const storedValue = element.dataset.value
      || element.getAttribute('value')
      || element.value;
    if (name === 'tags') {
      if (storedValue) return storedValue;
      const anchors = [
        ...(element.matches('a[href]') ? [element] : []),
        ...element.querySelectorAll('a[href]'),
      ];
      if (anchors.length > 1) {
        return anchors
          .map((tag) => tag.getAttribute('href') || tag.textContent.trim())
          .filter(Boolean);
      }
      const anchor = element.matches('a') ? element : element.querySelector('a[href]');
      if (anchor) return anchor.getAttribute('href') || anchor.textContent.trim();
      return element.textContent.trim();
    }
    const image = element.matches('img') ? element : element.querySelector('picture img, img');
    if (image) return image.getAttribute('src') || image.src;
    const anchor = element.matches('a') ? element : element.querySelector('a[href]');
    if (anchor) return anchor.getAttribute('href') || anchor.textContent.trim();
    return storedValue || element.textContent.trim();
  };

  if (block.dataset[name] !== undefined) return block.dataset[name];
  if (block.dataset[lowerName] !== undefined) return block.dataset[lowerName];

  const propertyElements = roots.flatMap((root) => {
    const descendants = [...root.querySelectorAll('[data-aue-prop]')];
    if (root.matches('[data-aue-prop]')) descendants.unshift(root);
    return descendants;
  });
  const propertyElement = propertyElements.find(
    (element) => element.getAttribute('data-aue-prop').toLowerCase() === lowerName,
  );
  if (propertyElement) {
    const value = readValue(propertyElement);
    if (value !== '') return value;
  }

  const rows = roots.flatMap((root) => [...root.children])
    .filter((row) => (
      !row.classList.contains('list-container')
&& !row.classList.contains('list-header')
    ));
  const aliases = {
    parentpage: ['parentpagepath'],
    tagsparentpage: ['parentpagepath', 'tagparentpagepath'],
    ctalabel: ['viewalltext'],
    ctalink: ['viewalllink', 'viewallpath'],
  };
  const acceptableNames = [normalizedName, ...(aliases[normalizedName] || [])];
  const targetRow = rows.find((row) => {
    const cols = [...row.children];
    const key = cols[0]?.textContent.trim().toLowerCase().replace(/[-_\s]/g, '');
    return cols.length >= 2 && acceptableNames.includes(key);
  });

  if (targetRow) {
    const cols = [...targetRow.children];
    const value = readValue(cols[1]);
    if (value !== '') return value;
  }

  const fieldIndex = fieldOrder.indexOf(name);
  if (fieldIndex >= 0) {
    const stores = [...block.querySelectorAll('.list-ue-store')];
    const storedRows = stores.length
      ? stores.flatMap((store) => [...store.children])
      : [...block.children].filter((child) => (
        !child.matches('ul.list-container')
&& !child.matches('.list-header')
      ));
    const row = storedRows[fieldIndex];
    if (row) {
      const cells = [...row.children];
      const valueCell = cells.length > 1 ? cells[1] : cells[0] || row;
      const value = readValue(valueCell);
      if (value !== '') return value;
    }
  }

  return fallback;
}

function getBoolean(block, name, fallback = true) {
  const val = String(getProp(block, name, fallback)).toLowerCase().trim();
  if (val === '') return fallback;
  return val === 'true' || val === 'yes' || val === '1';
}

function formatDateValue(rawDate, format = 'MMM d, yyyy') {
  if (!rawDate) return '';
  const numericTimestamp = typeof rawDate === 'number'
    || /^\d+(\.\d+)?$/.test(String(rawDate).trim());
  const timestamp = numericTimestamp
    ? Number(rawDate) * (Number(rawDate) < 1e12 ? 1000 : 1)
    : rawDate;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.valueOf())) return String(rawDate);

  const day = String(parsed.getDate()).padStart(2, '0');
  const monthNum = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  const monthName = parsed.toLocaleDateString('en-US', { month: 'short' });

  if (format === 'DD-MM-YYYY') return `${day}-${monthNum}-${year}`;
  if (format === 'MM-DD-YYYY') return `${monthNum}-${day}-${year}`;
  return `${monthName} ${parsed.getDate()}, ${year}`;
}

function normalizePath(path) {
  if (!path) return '/';
  let pathname;
  try {
    pathname = new URL(String(path).trim(), window.location.origin).pathname;
  } catch (error) {
    [pathname] = String(path).split(/[?#]/);
  }

  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/index') return '/';
  if (clean.startsWith('/index/')) return clean.replace(/^\/index/, '');
  return clean;
}

async function fetchQueryIndex() {
  const configuredOrigin = getAEMPublish();
  const codeOrigin = new URL(import.meta.url).origin;
  const host = configuredOrigin.includes('.adobeaemcloud.com')
    ? codeOrigin
    : configuredOrigin;

  try {
    const resp = await fetch(new URL('/query-index.json', host));
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok || !contentType.includes('application/json')) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : (data.data || []);
  } catch (err) {
    return [];
  }
}

function parseManualItems(block) {
  const source = block.querySelector('[data-aue-prop="fixedItems"]') || block.querySelector('ul');
  if (!source) return [];

  const links = [...source.querySelectorAll('a[href]')];
  return links.map((a) => ({
    path: a.getAttribute('href'),
    title: a.textContent.trim() || a.getAttribute('href'),
    description: a.dataset.description || '',
    image: a.querySelector('img')?.src || '',
  }));
}

function compareItems(a, b, config) {
  const keyA = config.orderBy === 'modified' ? (a.lastModified || 0) : (a.title || '');
  const keyB = config.orderBy === 'modified' ? (b.lastModified || 0) : (b.title || '');
  const cmp = String(keyA).localeCompare(String(keyB), undefined, { numeric: true });
  return config.sortOrder === 'descending' ? -cmp : cmp;
}

function hasCardImage(item, config) {
  return Boolean(item.image)
&& config.showImage
&& item.image !== 'about:error'
&& !item.image.includes('default-meta-image.png');
}

function isDownloadableCard(item) {
  const path = String(item.path || '').toLowerCase();
  const tags = String(item.tags || '').toLowerCase();
  return path.endsWith('.pdf')
    || tags.includes('report')
    || tags.includes('case-study')
    || tags.includes('pdf');
}

function filterAndSortItems(items, config) {
  let result = items.filter((item) => item.path);

  if (config.listType === 'children') {
    const parent = normalizePath(config.parentPage || window.location.pathname);
    const targetDepth = Number(config.childDepth) || 1;

    result = result.filter((item) => {
      const itemPath = normalizePath(item.path);
      if (itemPath === parent) return false;
      if (parent !== '/' && !itemPath.startsWith(`${parent}/`)) return false;

      const relativePath = parent === '/'
        ? itemPath.replace(/^\/+/, '')
        : itemPath.slice(parent.length + 1);

      const depth = relativePath.split('/').filter(Boolean).length;
      return depth >= 1 && depth <= targetDepth;
    });
  } else if (config.listType === 'tags') {
    const rawTags = Array.isArray(config.tags)
      ? config.tags.join(',')
      : String(config.tags || '');
    const authoredTagList = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
    const scopePath = config.tagsParentPage ? normalizePath(config.tagsParentPage) : null;
    const targetDepth = Number(config.tagsChildDepth) || 1;

    const candidateItems = result.filter((item) => {
      const itemPath = normalizePath(item.path);
      if (scopePath && !itemPath.startsWith(`${scopePath}/`)) return false;

      if (scopePath) {
        const relativePath = scopePath === '/'
          ? itemPath.replace(/^\/+/, '')
          : itemPath.slice(scopePath.length + 1);
        const depth = relativePath.split('/').filter(Boolean).length;
        if (depth < 1 || depth > targetDepth) return false;
      }

      const itemTags = String(item.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
      if (!authoredTagList.length) return true;

      return config.tagMatch === 'all'
        ? authoredTagList.every((at) => itemTags.some((it) => isTagMatching(it, at)))
        : authoredTagList.some((at) => itemTags.some((it) => isTagMatching(it, at)));
    });

    if (config.tagResultType === '1-each' && authoredTagList.length > 0) {
      const uniqueByTag = [];
      const usedPaths = new Set();
      const orderedCandidates = [...candidateItems].sort((a, b) => compareItems(a, b, config));

      authoredTagList.forEach((tagKey) => {
        const matchingItem = orderedCandidates.find((item) => {
          if (usedPaths.has(item.path)) return false;
          const itemTags = String(item.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
          return itemTags.some((it) => isTagMatching(it, tagKey));
        });

        if (matchingItem) {
          usedPaths.add(matchingItem.path);
          const tokens = getTagTokens(tagKey);
          uniqueByTag.push({
            ...matchingItem,
            primaryTag: tokens[1] || tokens[0] || tagKey,
          });
        }
      });
      result = uniqueByTag;
    } else {
      result = candidateItems;
    }
  }

  if (!(config.listType === 'tags' && config.tagResultType === '1-each')) {
    result.sort((a, b) => compareItems(a, b, config));
  }

  return config.maxItems > 0 ? result.slice(0, config.maxItems) : result;
}

function renderItem(item, config, index = 0, solidIndex = 0) {
  const li = document.createElement('li');
  li.className = 'list-item';

  const isHero = config.listStyle === 'hero-card' && index === 0;
  if (isHero) li.classList.add('hero-item');

  const card = document.createElement('div');
  card.className = 'list-card';

  const hasImage = hasCardImage(item, config);

  let effectiveColor = config.cardColor;
  if (config.listStyle === 'card-m-scroll'
&& (config.cardColor === 'figma' || config.cardColor === 'grey')) {
    if (hasImage) {
      effectiveColor = 'grey';
    } else {
      effectiveColor = solidIndex % 2 === 0 ? 'black' : 'blue';
    }
  } else if (config.cardColor === 'figma') {
    effectiveColor = 'grey';
  } else if (!hasImage && config.cardColor === 'grey') {
    effectiveColor = 'blue';
  }
  card.classList.add(`card-color-${effectiveColor}`);

  // Media Area
  if (hasImage) {
    const picContainer = document.createElement('div');
    picContainer.className = 'list-media';
    picContainer.append(
      createOptimizedPicture(item.image, item.title || '', false, [{ width: '800' }]),
    );
    card.append(picContainer);
  } else {
    card.classList.add('no-image');
  }

  // Body Container
  const body = document.createElement('div');
  body.className = 'list-body';

  // 1. Eyebrow Tag Header
  if (config.showEyebrow) {
    const rawTags = item.primaryTag || String(item.tags || '');
    if (rawTags) {
      const eyebrow = document.createElement('span');
      eyebrow.className = 'list-eyebrow';
      const tagList = rawTags
        .split(',')
        .map((t) => t.trim().replace(/^.*:/, '').toUpperCase())
        .filter(Boolean);

      if (config.listStyle === 'card-2col-tm-scroll') {
        eyebrow.textContent = tagList.join(' | ');
      } else {
        eyebrow.textContent = tagList[0] || '';
      }
      body.append(eyebrow);
    }
  }

  // 2. Title
  if (config.showTitle) {
    const title = document.createElement('h3');
    title.className = 'list-title';
    if (config.linkItems) {
      const link = document.createElement('a');
      link.href = normalizePath(item.path);
      link.textContent = item.title || item.name || 'Untitled';
      title.append(link);
    } else {
      title.textContent = item.title || item.name || 'Untitled';
    }
    body.append(title);
  }

  // 3. Description
  if (config.showDescription && item.description) {
    const desc = document.createElement('p');
    desc.className = 'list-description';
    desc.textContent = item.description;
    body.append(desc);
  }

  // 4. Author Lockup
  if (config.showAuthor && (item.author || item.persona)) {
    const author = document.createElement('div');
    author.className = 'list-author';
    author.textContent = item.author || item.persona;
    body.append(author);
  }

  // 5. Modification Date
  if (config.showDate && item.lastModified) {
    const date = document.createElement('time');
    date.className = 'list-date';
    date.textContent = formatDateValue(item.lastModified, config.dateFormat);
    body.append(date);
  }

  // 6. Action Rendering Logic (Hero Card vs Other Layouts)
  if (config.linkItems) {
    if (config.listStyle === 'hero-card') {
      if (!isHero) {
        const isDownload = isDownloadableCard(item) || !hasImage;
        const cta = document.createElement('a');
        cta.className = isDownload ? 'list-btn-download' : 'list-cta';
        cta.href = normalizePath(item.path);
        cta.innerHTML = isDownload ? 'Download &rarr;' : 'Explore &rarr;';
        body.append(cta);
      }
      // Note: isHero (index === 0) omits action button entirely per design specs
    } else if (config.listStyle === 'card-m-scroll' || config.showIcon) {
      const cta = document.createElement('a');
      cta.className = 'list-cta';
      cta.href = normalizePath(item.path);
      cta.innerHTML = 'Explore &rarr;';
      body.append(cta);
    }
  }

  card.append(body);
  li.append(card);
  return li;
}

export default async function decorate(block) {
  const listType = String(getProp(block, 'listType', 'children')).toLowerCase().trim();

  let rawMax = getProp(block, 'maxItems', '5');
  if (listType === 'tags') rawMax = getProp(block, 'maxItemsTags', rawMax);

  const config = {
    listType,
    parentPage: getProp(block, 'parentPage'),
    childDepth: getProp(block, 'childDepth', '1'),
    tagsParentPage: getProp(block, 'tagsParentPage'),
    tagsChildDepth: getProp(block, 'tagsChildDepth', '1'),
    tags: getProp(block, 'tags'),
    tagMatch: getProp(block, 'tagMatch', 'any'),
    tagResultType: getProp(block, 'tagResultType', 'all'),
    title: getProp(block, 'title'),
    description: getProp(block, 'description'),
    ctaLabel: getProp(block, 'ctaLabel'),
    ctaLink: getProp(block, 'ctaLink'),
    linkItems: getBoolean(block, 'linkItems', true),
    orderBy: getProp(block, 'orderBy', 'title'),
    sortOrder: getProp(block, 'sortOrder', 'ascending'),
    cardColor: getProp(block, 'cardColor', 'figma').toLowerCase(),
    listStyle: getProp(block, 'listStyle', 'default').toLowerCase(),
    maxItems: Number(rawMax) || 5,
    showEyebrow: getBoolean(block, 'showEyebrow', true),
    showTitle: getBoolean(block, 'showTitle', true),
    showDescription: getBoolean(block, 'showDescription', true),
    showImage: getBoolean(block, 'showImage', true),
    showDate: getBoolean(block, 'showDate', false),
    dateFormat: getProp(block, 'dateFormat', 'MMM d, yyyy'),
    showAuthor: getBoolean(block, 'showAuthor', false),
    showIcon: getBoolean(block, 'showIcon', false),
  };

  block.className = block.className.replace(/\blist-style-\S+/g, '').trim();
  block.classList.add(`list-style-${config.listStyle}`);

  let ueStore = block.querySelector('.list-ue-store');
  if (!ueStore) {
    ueStore = document.createElement('div');
    ueStore.className = 'list-ue-store';
    ueStore.style.display = 'none';
    while (block.firstElementChild) {
      ueStore.append(block.firstElementChild);
    }
  }

  // Clear Stale Elements
  const oldHeader = block.querySelector('.list-header');
  if (oldHeader) oldHeader.remove();
  const oldList = block.querySelector('ul.list-container');
  if (oldList) oldList.remove();

  // 1. Render Universal Header Lockup
  if (config.title || config.ctaLabel) {
    const header = document.createElement('div');
    header.className = 'list-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'list-header-group';

    if (config.title) {
      const h2 = document.createElement('h2');
      h2.className = 'list-main-title';
      h2.textContent = config.title;
      titleGroup.append(h2);
    }

    if (config.description) {
      const desc = document.createElement('div');
      desc.className = 'list-header-description';
      desc.innerHTML = config.description;
      titleGroup.append(desc);
    }
    header.append(titleGroup);

    if (config.ctaLabel && config.ctaLink) {
      const ctaBtn = document.createElement('a');
      ctaBtn.className = 'list-view-all';
      ctaBtn.href = normalizePath(config.ctaLink);
      ctaBtn.innerHTML = `${config.ctaLabel} &rarr;`;
      header.append(ctaBtn);
    }

    block.append(header);
  }

  // 2. Resolve & Filter Items
  let items = [];
  if (config.listType === 'fixed' || config.listType === 'manual') {
    items = parseManualItems(ueStore);
  } else {
    const rawIndex = await fetchQueryIndex();
    items = filterAndSortItems(rawIndex, config);
  }

  // 3. Render Card Grid
  const ul = document.createElement('ul');
  ul.className = 'list-container';

  if (!items.length) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'list-empty';
    emptyLi.textContent = 'No matching pages found.';
    ul.append(emptyLi);
  } else {
    let solidIndex = 0;
    items.forEach((item, index) => {
      const itemSolidIndex = solidIndex;
      if (!hasCardImage(item, config)) solidIndex += 1;
      ul.append(renderItem(item, config, index, itemSolidIndex));
    });
  }

  block.append(ueStore, ul);
}
