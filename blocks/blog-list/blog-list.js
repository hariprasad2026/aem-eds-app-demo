import { createOptimizedPicture } from '../../scripts/aem.js';

function normalizeFieldName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getElementValue(element) {
  const valueElement = element.querySelector(':scope > div:last-child, :scope > p:last-child');
  return (valueElement || element).textContent.trim();
}

function discoverFields(block) {
  const fields = new Map();
  const addField = (name, value, source, priority) => {
    const normalizedName = normalizeFieldName(name);
    const normalizedValue = String(value || '').trim();
    const existing = fields.get(normalizedName);
    if (normalizedName && normalizedValue && (!existing || priority > existing.priority)) {
      fields.set(normalizedName, { value: normalizedValue, source, priority });
    }
  };

  Object.entries(block.dataset).forEach(([name, value]) => addField(name, value, 'block.dataset', 1));

  block.querySelectorAll('[data-aue-prop]').forEach((element) => {
    addField(element.dataset.aueProp, getElementValue(element), 'data-aue-prop', 4);
  });

  block.querySelectorAll('[data-field]').forEach((element) => {
    addField(element.dataset.field, getElementValue(element), 'data-field', 3);
  });

  [...block.children].forEach((row, index) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      addField(cells[0].textContent, cells[1].textContent, `row ${index + 1}`, 2);
    }
  });

  return fields;
}

function logDiscoveredFields(block, fields) {
  // Temporary diagnostics for Universal Editor and document-authoring markup.
  // eslint-disable-next-line no-console
  console.debug('Blog List source HTML', block.innerHTML);
  // eslint-disable-next-line no-console
  console.debug('Blog List dataset', { ...block.dataset });
  // eslint-disable-next-line no-console
  console.debug('Blog List discovered fields', Object.fromEntries(fields));
  // eslint-disable-next-line no-console
  console.debug('Blog List child rows', [...block.children].map((row, index) => ({
    row: index + 1,
    html: row.outerHTML,
    text: row.textContent.trim(),
    cells: [...row.children].map((cell) => cell.textContent.trim()),
  })));
}

function getField(block, name, fallback = '', fields = discoverFields(block)) {
  const field = fields.get(normalizeFieldName(name));
  return field?.value || fallback;
}

function getItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

async function loadPosts() {
  const response = await fetch('/query-index.json');
  if (!response.ok) throw new Error(`Unable to load blog index: ${response.status}`);
  return getItems(await response.json());
}

function isBlogPost(post) {
  return typeof post?.path === 'string' && post.path.startsWith('/blogs/');
}

function getPostDate(post) {
  const publishDate = Date.parse(post?.publishDate);
  if (!Number.isNaN(publishDate)) return publishDate;

  const lastModified = Number(post?.lastModified);
  return Number.isFinite(lastModified) ? lastModified * 1000 : 0;
}

function createPostCard(post, className, imageWidth, readMoreLabel, elementName = 'li', linkCard = false) {
  const card = document.createElement(elementName);
  card.className = className;
  const content = linkCard ? document.createElement('a') : card;
  if (linkCard) {
    content.href = post.path;
    content.className = 'blog-list-card-link';
  }

  if (post.image) {
    const picture = createOptimizedPicture(post.image, post.title || '', false, [{ width: imageWidth }]);
    picture.className = 'blog-list-card-image';
    if (linkCard) content.append(picture);
    else {
      const imageLink = document.createElement('a');
      imageLink.href = post.path;
      imageLink.className = 'blog-list-card-image-link';
      imageLink.append(picture);
      content.append(imageLink);
    }
  }

  const body = document.createElement('div');
  body.className = 'blog-list-card-body';
  const title = document.createElement('h3');
  if (linkCard) title.textContent = post.title || 'Untitled';
  else {
    const titleLink = document.createElement('a');
    titleLink.href = post.path;
    titleLink.className = 'blog-list-card-title';
    titleLink.textContent = post.title || 'Untitled';
    title.append(titleLink);
  }
  body.append(title);

  if (post.description) {
    const description = document.createElement('p');
    description.textContent = post.description;
    body.append(description);
  }

  if (readMoreLabel) {
    const readMore = document.createElement(linkCard ? 'span' : 'a');
    if (!linkCard) readMore.href = post.path;
    readMore.className = 'blog-list-read-more';
    readMore.textContent = readMoreLabel;
    body.append(readMore);
  }

  content.append(body);
  if (linkCard) card.append(content);
  return card;
}

function renderPosts(
  container,
  posts,
  readMoreLabel,
  className = 'blog-list-card',
  imageWidth = '750',
  linkCard = false,
) {
  posts.forEach((post) => {
    container.append(createPostCard(post, className, imageWidth, readMoreLabel, 'li', linkCard));
  });
}

function renderFeaturedPosts(container, posts, readMoreLabel) {
  const [featuredPost, ...remainingPosts] = posts;
  const featured = document.createElement('div');
  featured.className = 'blog-list-featured-hero';
  featured.append(createPostCard(
    featuredPost,
    'blog-list-card blog-list-featured-card',
    '1200',
    readMoreLabel,
    'div',
  ));
  container.append(featured);

  if (remainingPosts.length) {
    const grid = document.createElement('ul');
    grid.className = 'blog-list-grid';
    renderPosts(grid, remainingPosts, readMoreLabel);
    container.append(grid);
  }
}

function renderCompactPosts(container, posts, readMoreLabel) {
  posts.forEach((post) => {
    const item = document.createElement('li');
    item.className = 'blog-list-compact-item';

    const content = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'blog-list-compact-title';
    title.textContent = post.title || 'Untitled';
    content.append(title);

    if (post.description) {
      const description = document.createElement('p');
      description.className = 'blog-list-compact-description';
      description.textContent = post.description;
      content.append(description);
    }

    if (readMoreLabel) {
      const readMore = document.createElement('a');
      readMore.href = post.path;
      readMore.className = 'blog-list-read-more';
      readMore.textContent = readMoreLabel;
      content.append(readMore);
    }
    item.append(content);
    container.append(item);
  });
}

function getAuthoredElementValue(element) {
  if (element instanceof HTMLInputElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLTextAreaElement) {
    return element.value.trim();
  }

  const control = element.querySelector('select, input, textarea');
  if (control instanceof HTMLInputElement
    || control instanceof HTMLSelectElement
    || control instanceof HTMLTextAreaElement) {
    return control.value.trim();
  }

  return element.dataset.aueValue?.trim()
    || element.dataset.value?.trim()
    || getElementValue(element);
}

function isVariant(value) {
  return ['featured', 'grid', 'horizontal', 'compact'].includes(value.toLowerCase());
}

function getVariantValue(block, fields) {
  const variantProperty = [...block.querySelectorAll('[data-aue-prop]')].find(
    (element) => normalizeFieldName(element.dataset.aueProp) === 'variant',
  );
  if (variantProperty) return getAuthoredElementValue(variantProperty);

  const variantField = [...block.querySelectorAll('[data-field]')].find(
    (element) => normalizeFieldName(element.dataset.field) === 'variant',
  );
  if (variantField) return getAuthoredElementValue(variantField);

  const variantRow = [...block.children].find((row) => {
    const [label] = row.children;
    return normalizeFieldName(label?.textContent) === 'variant';
  });
  if (variantRow?.children[1]) return getAuthoredElementValue(variantRow.children[1]);

  const valueOnlyVariant = [...block.children]
    .map((row) => getAuthoredElementValue(row))
    .reverse()
    .find((value) => isVariant(value));
  if (valueOnlyVariant) return valueOnlyVariant;

  return getField(block, 'variant', 'featured', fields);
}

function getVariant(block, fields) {
  const variant = getVariantValue(block, fields).toLowerCase();
  return isVariant(variant) ? variant : 'featured';
}

function getReadMoreLabel(block, fields) {
  const labelProperty = [...block.querySelectorAll('[data-aue-prop]')].find(
    (element) => normalizeFieldName(element.dataset.aueProp) === 'readmorelabel',
  );
  if (labelProperty) return getAuthoredElementValue(labelProperty);

  const labelField = [...block.querySelectorAll('[data-field]')].find(
    (element) => normalizeFieldName(element.dataset.field) === 'readmorelabel',
  );
  if (labelField) return getAuthoredElementValue(labelField);

  const labelRow = [...block.children].find((row) => {
    const [label] = row.children;
    return normalizeFieldName(label?.textContent) === 'readmorelabel';
  });
  if (labelRow?.children[1]) return getAuthoredElementValue(labelRow.children[1]);

  const discoveredLabel = getField(block, 'readMoreLabel', '', fields);
  if (discoveredLabel) return discoveredLabel;

  const valueOnlyRows = [...block.children].map((row) => getAuthoredElementValue(row));
  const variantIndex = valueOnlyRows.findLastIndex((value) => isVariant(value));
  if (variantIndex < 2) return '';
  const value = valueOnlyRows[variantIndex - 1]?.trim() || '';
  return /^\d+$/.test(value) ? '' : value;
}

export default async function decorate(block) {
  const fields = discoverFields(block);
  logDiscoveredFields(block, fields);
  const heading = getField(block, 'heading', '', fields);
  const readMoreLabel = getReadMoreLabel(block, fields);
  const rawVariant = getVariantValue(block, fields);
  const variant = getVariant(block, fields);
  const container = document.createElement('div');
  block.classList.remove('blog-list-featured', 'blog-list-grid', 'blog-list-horizontal', 'blog-list-compact');
  block.classList.add(`blog-list-${variant}`);

  // eslint-disable-next-line no-console
  console.debug('Blog List authored values', {
    heading,
    readMoreLabel,
    variant: rawVariant,
  });

  block.replaceChildren();

  if (heading) {
    const title = document.createElement('h2');
    title.textContent = heading;
    block.append(title);
  }

  try {
    const posts = (await loadPosts())
      .filter(isBlogPost)
      .sort((first, second) => getPostDate(second) - getPostDate(first));
    // eslint-disable-next-line no-console
    console.debug('Blog List configuration', {
      heading,
      variant,
      totalPosts: posts.length,
    });

    if (posts.length && variant === 'featured') renderFeaturedPosts(container, posts, readMoreLabel);
    else if (posts.length && variant === 'compact') {
      const list = document.createElement('ul');
      list.className = 'blog-list-compact-list';
      renderCompactPosts(list, posts, readMoreLabel);
      container.append(list);
    } else if (posts.length) {
      const list = document.createElement('ul');
      list.className = variant === 'horizontal' ? 'blog-list-horizontal-list' : 'blog-list-grid';
      renderPosts(
        list,
        posts,
        readMoreLabel,
        variant === 'horizontal' ? 'blog-list-card blog-list-horizontal-card' : undefined,
        '750',
        variant === 'horizontal',
      );
      container.append(list);
    } else container.innerHTML = '<div class="blog-list-message">No blog posts are available.</div>';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to load blog posts.', error);
    container.innerHTML = '<div class="blog-list-message">Blog posts are currently unavailable.</div>';
  }

  block.append(container);
}
