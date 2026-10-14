import { loadCSS } from '../../scripts/aem.js';
import decorateCta from '../cta/cta.js';
import decorateStatistics from '../statistics-list/statistics-list.js';

export default function decorate(block) {
  block.classList.add('two-column-layout');

  let children = [...block.children];

  const variantRow = children.find(
    (child) => ['default', 'centered'].includes(
      child.textContent.trim().toLowerCase(),
    ),
  );

  if (variantRow) {
    const variant = variantRow.textContent.trim().toLowerCase();

    block.classList.add(`two-column-layout-${variant}`);

    variantRow.remove();

    children = [...block.children];
  }

  if (!children.length) {
    return;
  }

  const left = document.createElement('div');
  left.className = 'two-column-layout-left';

  const right = document.createElement('div');
  right.className = 'two-column-layout-right';

  const statisticsBlocks = [];
  let statisticsGroup;

  children.forEach((child) => {
    const model = child.getAttribute('data-aue-model') || '';
    const value = child.children[1]?.textContent.trim() || '';
    const isStatistic = model === 'statistics-list-item'
      || (!model && child.children.length === 2
        && !child.querySelector('a, img, picture, h1, h2, h3, h4, h5, h6')
        && !/^h[1-6]$/i.test(value)
        && !/^(https?:|\/|#)/i.test(value));

    if (isStatistic) {
      if (!statisticsGroup) {
        statisticsGroup = document.createElement('div');
        statisticsGroup.className = 'statistics-list block';
        statisticsGroup.dataset.blockName = 'statistics-list';
        statisticsBlocks.push(statisticsGroup);
        right.append(statisticsGroup);
      }

      statisticsGroup.append(child);
      return;
    }

    statisticsGroup = null;

    const heading = child.querySelector(
      'h1, h2, h3, h4, h5, h6',
    );

    const titleType = child.children[1]?.textContent
      .trim()
      .toLowerCase();

    const resourceType = child.getAttribute('data-aue-resource') || '';

    const isTitle = heading
      || /^h[1-6]$/.test(titleType)
      || ['title', 'two-column-layout-title'].includes(model)
      || /\/title(?:\/|$)/.test(resourceType);

    if (isTitle) {
      const title = heading
        || document.createElement(
          /^h[1-6]$/.test(titleType)
            ? titleType
            : 'h2',
        );

      if (!heading) {
        title.textContent = child.firstElementChild?.textContent.trim() || '';
      }

      child.classList.add('two-column-layout-title');
      child.replaceChildren(title);

      left.append(child);
      return;
    }

    /* Statistics List child block */
    if (
      model === 'statistics-list'
      || child.classList.contains('statistics-list')
    ) {
      statisticsBlocks.push(child);
      right.append(child);
      return;
    }

    const image = child.firstElementChild?.querySelector('img');

    const isImage = image
      && child.children.length <= 2
      && !child.firstElementChild.textContent.trim();

    if (isImage) {
      const imageContent = image.closest('picture') || image;

      const altText = child.children[1]?.textContent.trim();

      if (altText && !image.getAttribute('alt')) {
        image.alt = altText;
      }

      child.classList.add('two-column-layout-image');
      child.replaceChildren(imageContent);

      right.append(child);
      return;
    }

    right.append(child);
  });

  const ctaItems = [...right.children].filter(
    (item) => (
      item.getAttribute('data-aue-model') !== 'statistics-list'
      && !item.classList.contains('statistics-list')
      && item.children.length > 1
      && !item.classList.contains('two-column-layout-image')
      && !item.querySelector(
        'h1, h2, h3, h4, h5, h6',
      )
    ),
  );

  if (ctaItems.length) {
    loadCSS(
      `${window.hlx.codeBasePath}/blocks/cta/cta.css`,
    );
  }

  ctaItems.forEach((cta) => {
    cta.classList.add('cta', 'block');
    cta.dataset.blockName = 'cta';

    decorateCta(cta);
  });

  if (statisticsBlocks.length) {
    loadCSS(
      `${window.hlx.codeBasePath}/blocks/statistics-list/statistics-list.css`,
    );

    statisticsBlocks.forEach((statisticsBlock) => {
      if (statisticsBlock.dataset.blockStatus !== 'loaded') {
        decorateStatistics(statisticsBlock);
        statisticsBlock.dataset.blockStatus = 'loaded';
      }
    });
  }

  block.replaceChildren(left, right);
}
