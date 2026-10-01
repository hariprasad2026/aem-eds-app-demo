import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const CARD_THEMES = new Set(['default', 'dark', 'highlight']);

function applyTheme(li) {
  const themeField = li.querySelector('[data-theme]');
  const body = li.querySelector('.cards-card-body');

  if (themeField) {
    const theme = themeField.dataset.theme?.trim();
    if (theme === 'dark' || theme === 'highlight') {
      li.classList.add(`theme-${theme}`);
    }

    themeField.remove();
    return;
  }

  const firstBlock = body?.firstElementChild;
  const fallbackTheme = firstBlock?.textContent?.trim()?.toLowerCase();
  if (!CARD_THEMES.has(fallbackTheme)) return;

  if (fallbackTheme === 'dark' || fallbackTheme === 'highlight') {
    li.classList.add(`theme-${fallbackTheme}`);
  }

  if (firstBlock.childElementCount === 0) {
    firstBlock.remove();
  }
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
      } else {
        div.className = 'cards-card-body';

        // Check if a top tag/badge paragraph exists and has content
        const firstPara = div.querySelector('p:first-child');
        if (firstPara && !firstPara.querySelector('a') && div.children.length > 1) {
          firstPara.classList.add('cards-card-badge');
        }
      }
    });
    applyTheme(li);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}
