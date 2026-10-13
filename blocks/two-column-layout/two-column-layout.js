import { loadCSS } from '../../scripts/aem.js';
import decorateCta from '../cta/cta.js';

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

    // refresh children after removing variant row
    children = [...block.children];
  }

  if (!children.length) {
    return;
  }

  const left = document.createElement('div');
  left.className = 'two-column-layout-left';

  const right = document.createElement('div');
  right.className = 'two-column-layout-right';

  children.forEach((child, index) => {
    if (index === 0) {
      left.append(child);
    } else {
      right.append(child);
    }
  });

  const ctaItems = [...right.children].filter(
    (item) => item.children.length > 1,
  );

  if (ctaItems.length) {
    loadCSS(`${window.hlx.codeBasePath}/blocks/cta/cta.css`);
  }

  ctaItems.forEach((cta) => {
    cta.classList.add('cta', 'block');
    cta.dataset.blockName = 'cta';
    decorateCta(cta);
  });

  block.replaceChildren(left, right);
}
