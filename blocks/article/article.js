import { getAEMPublish, getAEMAuthor } from '../../scripts/endpointconfig.js';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const DISPLAY_FIELDS = [
  'title',
  'author',
  'publicationDate',
  'content',
  'featuredImage',
];

function getFallbackArticle(block) {
  const title = block.querySelector('h1, h2, h3, h4, h5')
    ?.textContent?.trim()
    || 'Article';

  const description = block.querySelector('p')
    ?.textContent?.trim()
    || 'Article content is available in the authored document.';

  return {
    title,
    author: '',
    date: '',
    content: {
      plaintext: description,
    },
  };
}

function getSummary(text = '', limit = 150) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.substring(0, limit)}...`;
}

function getFieldValue(block, index) {
  return block.querySelector(`:scope > div:nth-child(${index}) > div`)
    ?.textContent?.trim()
    || '';
}

function getSafeClass(value, fallback) {
  return /^[a-z]+$/i.test(value || '')
    ? value.toLowerCase()
    : fallback;
}

function getPathField(value) {
  // eslint-disable-next-line dot-notation
  return value?.['_path'] || '';
}

function normalizeArticlePath(value = '') {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return '';
  }

  try {
    const normalizedPath = /^https?:\/\//i.test(trimmedValue)
      ? new URL(trimmedValue, window.location.origin).pathname
      : trimmedValue;

    return normalizedPath.replace(/\.html$/, '');
  } catch (error) {
    return trimmedValue.replace(/\.html$/, '');
  }
}

function getSelectedFields(block) {
  const fieldsContainer = block.querySelector(':scope > div:nth-child(4)');

  if (!fieldsContainer) {
    return [...DISPLAY_FIELDS];
  }

  const checkedValues = [...fieldsContainer.querySelectorAll('input[type="checkbox"]')]
    .map((input) => (input.checked ? input.value : ''))
    .filter(Boolean)
    .map((field) => field.trim().toLowerCase());

  const textValue = fieldsContainer.textContent?.trim() || '';
  const textValues = textValue
    ? textValue
      .split(/[\s,;\n]+/)
      .map((field) => field.trim().toLowerCase())
      .filter(Boolean)
    : [];

  const selectedValues = checkedValues.length ? checkedValues : textValues;
  const fields = selectedValues.filter((field) => DISPLAY_FIELDS.includes(field));

  return fields.length ? [...new Set(fields)] : [...DISPLAY_FIELDS];
}

const EXCERPT_VARIATIONS = ['summary', 'spotlight'];

function getImageSource(article = {}) {
  const source = [article.featuredImage, article.image]
    .map((image) => (typeof image === 'string' ? image : getPathField(image) || image?.path))
    .find((value) => typeof value === 'string' && value.trim());

  return source ? source.trim() : '';
}

function renderArticle({
  article,
  variation,
  alignment,
  showField,
  itemId = '',
}) {
  const aue = (prop, label, type) => (itemId
    ? ` data-aue-prop="${prop}" data-aue-label="${label}" data-aue-type="${type}"`
    : '');

  const {
    title, author, date, content, image,
  } = article;

  const showImage = showField('featuredImage') && image;
  const showAuthor = showField('author') && author;
  const showDate = showField('publicationDate') && date;

  const imageMarkup = showImage
    ? `<div class="featured-image">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy">
      </div>`
    : '';

  const titleMarkup = showField('title') && title
    ? `<h4 class="title"${aue('title', 'title', 'text')}>${escapeHtml(title)}</h4>`
    : '';

  const metaMarkup = showAuthor || showDate
    ? `<div class="article-meta">
        ${showAuthor ? `<span class="author"${aue('author', 'author', 'text')}>${escapeHtml(author)}</span>` : ''}
        ${showDate ? `<span class="publication-date"${aue('date', 'date', 'text')}>${escapeHtml(date)}</span>` : ''}
      </div>`
    : '';

  const contentMarkup = showField('content') && content
    ? `<p class="content"${aue('content', 'content', 'richtext')}>${escapeHtml(content)}</p>`
    : '';

  const resourceAttrs = itemId
    ? ` data-aue-resource="${escapeHtml(itemId)}" data-aue-label="article content fragment" data-aue-type="reference" data-aue-filter="cf"`
    : '';

  return `
    <div class="article-content ${variation} ${alignment} ${showImage ? 'has-image' : 'no-image'}"${resourceAttrs}>
      <div class="article-wrapper">
        ${imageMarkup}
        <div class="article-body">
          ${titleMarkup}
          ${metaMarkup}
          ${contentMarkup}
        </div>
      </div>
    </div>
  `;
}

export default async function decorate(block) {
  const aempublishurl = getAEMPublish();
  const aemauthorurl = getAEMAuthor();

  const persistedquery = '/graphql/execute.json/aem-eds-xwalk/ArticleByPath';

  const sourceLink = block.querySelector('a[href]');

  const authoredArticlePath = normalizeArticlePath(getFieldValue(block, 1));

  const rawArticlePath = sourceLink
    ? new URL(sourceLink.href, window.location.origin).pathname
    : authoredArticlePath;

  const articlepath = normalizeArticlePath(
    rawArticlePath
    || block.dataset?.path
    || '',
  );

  const variationname = getSafeClass(
    getFieldValue(block, 2),
    'main',
  );

  const alignment = getSafeClass(
    getFieldValue(block, 3),
    'left',
  );

  const selectedFields = getSelectedFields(block);

  const showField = (field) => selectedFields.includes(field);

  if (!articlepath || (!aempublishurl && !aemauthorurl)) {
    const fallback = getFallbackArticle(block);

    block.innerHTML = renderArticle({
      article: {
        title: fallback.title,
        content: fallback.content.plaintext,
      },
      variation: variationname,
      alignment,
      showField,
    });

    return;
  }

  const baseUrl = window.location.origin.includes('author')
    ? aemauthorurl
    : aempublishurl;

  const url = `${baseUrl}${persistedquery};path=${articlepath};variation=${variationname};ts=${Date.now()}`;

  let cfReq = getFallbackArticle(block);

  try {
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (response.ok) {
      const contentfragment = await response.json();
      const item = contentfragment?.data?.articleByPath?.item;

      if (item) {
        cfReq = item;
      }
    }
  } catch (error) {
    // fallback already prepared
  }

  const title = cfReq.title || 'Title';
  const author = cfReq.author || 'Author';
  const publicationDate = cfReq.date
    || cfReq.publicationDate
    || 'Date';
  const content = cfReq.content?.plaintext || 'content';

  const renderedContent = EXCERPT_VARIATIONS.includes(variationname)
    ? getSummary(content, 150)
    : content;

  block.innerHTML = renderArticle({
    article: {
      title,
      author,
      date: publicationDate,
      content: renderedContent,
      image: getImageSource(cfReq),
    },
    variation: variationname,
    alignment,
    showField,
    itemId: `urn:aemconnection:${articlepath}/jcr:content/data/${variationname}`,
  });
}
