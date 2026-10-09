const CONFIG_FIELDS = new Set(['title', 'ctalabel', 'ctalink']);

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function readValue(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a[href]');
  if (link) return link.getAttribute('href') || link.href;
  return cell.textContent.trim();
}

function readText(cell) {
  if (!cell) return '';
  return cell.textContent.trim();
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

  return header;
}

function parseConfigRows(block) {
  const config = {};

  [...block.querySelectorAll('[data-aue-prop]')].forEach((element) => {
    const prop = normalize(element.dataset.aueProp);
    if (!CONFIG_FIELDS.has(prop)) return;

    if (prop === 'ctalabel') {
      config[prop] = readText(element);
      const ctaAnchor = element.querySelector('a[href]');
      if (ctaAnchor && !config.ctalink) {
        config.ctalink = ctaAnchor.getAttribute('href') || ctaAnchor.href;
      }
      return;
    }

    config[prop] = readValue(element);
  });

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;

    const key = normalize(cells[0].textContent);
    if (!CONFIG_FIELDS.has(key) || config[key]) return;

    if (key === 'ctalabel') {
      config[key] = readText(cells[1]);
      const ctaAnchor = cells[1].querySelector('a[href]');
      if (ctaAnchor && !config.ctalink) {
        config.ctalink = ctaAnchor.getAttribute('href') || ctaAnchor.href;
      }
      return;
    }

    config[key] = readValue(cells[1]);
  });

  return {
    title: config.title || '',
    ctaLabel: config.ctalabel || '',
    ctaLink: config.ctalink || '',
  };
}

export default function decorate(block) {
  const config = parseConfigRows(block);
  block.replaceChildren(buildHeader(config));
  block.className = 'list';
}
