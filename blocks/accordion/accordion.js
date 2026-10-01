import { moveInstrumentation } from '../../scripts/scripts.js';

function normalizeLayout(value) {
  return value.trim().toLowerCase().replace(/\s+accordion$/, '');
}

export default function decorate(block) {
  let hasSearch = false;

  [...block.children].forEach((row) => {
    const label = row.children[0];

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';

    const summaryText = document.createElement('span');
    summaryText.className = 'accordion-summary-text';
    summaryText.textContent = label.textContent.trim();

    summary.append(summaryText);

    const body = row.children[1];
    body.className = 'accordion-item-body';

    const details = document.createElement('details');

    moveInstrumentation(row, details);

    details.className = 'accordion-item';

    const layoutField = row.children[2];
    const backgroundField = row.children[3];
    const textColorField = row.children[4];
    const dateField = row.children[5];
    const locationField = row.children[6];
    const ctaLabelField = row.children[7];
    const ctaLinkField = row.children[8];
    const flagField = row.children[9];
    const bannerField = row.children[10];
    let layout = 'default';

    if (layoutField) {
      layout = normalizeLayout(layoutField.textContent);

      if (layout === 'highlighted') {
        details.classList.add('highlighted');
      }

      if (layout === 'search') {
        hasSearch = true;
      }

      if (layout === 'horizontal') {
        block.classList.add('horizontal');
        details.classList.add('horizontal-item');
      }

      if (layout === 'corporate') {
        details.classList.add('corporate-item');
      }

      layoutField.remove();
    }

    if (backgroundField) {
      const bg = backgroundField.textContent.trim();

      if (bg) {
        details.style.setProperty('--accordion-bg', bg);
      }

      backgroundField.remove();
    }

    if (textColorField) {
      const textColors = {
        'royal-blue': 'rgba(70, 115, 219, 1)',
        black: 'rgba(12, 12, 13, 1)',
        'sky-blue': 'rgb(37, 150, 190)',
        'dark-grey': 'rgba(90, 90, 90, 1)',
        navy: 'rgba(1, 22, 39, 1)',
        white: 'rgba(255, 255, 255, 1)',
      };

      const color = textColors[
        textColorField.textContent.trim().toLowerCase()
      ];

      if (color) {
        details.style.setProperty('--accordion-text', color);

        if (color === 'rgba(255, 255, 255, 1)') {
          details.style.setProperty('--accordion-arrow-color', '#fff');
        } else {
          details.style.setProperty('--accordion-arrow-color', '#000');
        }
      }

      textColorField.remove();
    }

    const titleSection = document.createElement('div');
    titleSection.className = 'accordion-title-section';

    const flagPicture = flagField?.querySelector('picture');

    if (flagPicture) {
      const contentFlag = document.createElement('div');
      contentFlag.className = 'accordion-flag';

      contentFlag.append(flagPicture.cloneNode(true));
      titleSection.append(contentFlag);

      const summaryFlag = document.createElement('div');
      summaryFlag.className = 'accordion-summary-flag';

      summaryFlag.append(flagPicture.cloneNode(true));
      summary.prepend(summaryFlag);
    }

    const title = document.createElement('h2');
    title.className = 'accordion-title';
    title.textContent = label.textContent.trim();

    titleSection.append(title);

    let meta = null;

    if (
      dateField?.textContent.trim()
      || locationField?.textContent.trim()
    ) {
      meta = document.createElement('div');

      meta.className = 'accordion-meta';

      meta.textContent = `${dateField?.textContent.trim() || ''
      } | ${locationField?.textContent.trim() || ''
      }`;
    }

    let bannerWrapper = null;

    const bannerPicture = bannerField?.querySelector('picture');

    if (bannerPicture) {
      bannerWrapper = document.createElement('div');
      bannerWrapper.className = 'accordion-banner';

      bannerWrapper.append(bannerPicture.cloneNode(true));
    }

    const description = body.querySelector('p');

    if (description) {
      description.classList.add('accordion-description');
    }
    let cta = null;

    if (
      ctaLabelField?.textContent.trim()
      && ctaLinkField
    ) {
      cta = document.createElement('a');

      const ctaSource = ctaLinkField.querySelector('a');

      cta.href = ctaSource?.href
        || ctaLinkField.textContent.trim()
        || '#';

      cta.textContent = ctaLabelField.textContent.trim();
      cta.className = 'accordion-cta';
    }

    body.replaceChildren();

    if (layout !== 'corporate') {
      body.append(titleSection);

      if (meta) {
        body.append(meta);
      }

      if (bannerWrapper) {
        body.append(bannerWrapper);
      }
    }

    if (description) {
      body.append(description);
    }

    if (cta) {
      body.append(cta);
    }
    details.append(summary, body);

    row.replaceWith(details);
  });

  const accordionItems = block.querySelectorAll('.accordion-item');

  accordionItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) {
        return;
      }

      accordionItems.forEach((other) => {
        if (other !== item) {
          other.removeAttribute('open');
        }
      });
    });
  });

  if (hasSearch) {
    const search = document.createElement('input');

    search.type = 'search';
    search.placeholder = 'Search...';

    search.addEventListener('input', () => {
      const term = search.value.toLowerCase();

      block.querySelectorAll('.accordion-item').forEach((item) => {
        const text = item.textContent.toLowerCase();

        item.style.display = text.includes(term) ? '' : 'none';
      });
    });

    block.prepend(search);
  }
}
