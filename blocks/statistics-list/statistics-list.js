const getText = (node) => {
  if (!node) return '';
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
};

const readStats = (block) => {
  const children = Array.from(block.children || []);
  const headingRow = children[0];
  const heading = headingRow?.firstElementChild || headingRow;
  const rawStats = [];

  const rows = children.slice(1).flatMap((row) => Array.from(row.children || []));

  rows.forEach((entry) => {
    const itemChildren = Array.from(entry.children || []);
    const title = itemChildren.length ? getText(itemChildren[0]) : getText(entry);
    const value = itemChildren.length > 1 ? getText(itemChildren[1]) : '';

    if (title || value) {
      rawStats.push({ title, value });
    }
  });

  return { heading, stats: rawStats };
};

export default function decorate(block) {
  const { heading, stats } = readStats(block);

  if (!getText(heading) && !stats.length) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'statistics-list-wrapper';

  const content = document.createElement('div');
  content.className = 'statistics-content';

  if (getText(heading)) {
    const headingElement = document.createElement('div');
    headingElement.className = 'statistics-heading';
    headingElement.setAttribute('role', 'heading');
    headingElement.setAttribute('aria-level', '2');

    const headingParagraph = heading.children.length === 1
      && heading.firstElementChild.tagName === 'P'
      ? heading.firstElementChild
      : heading;
    Array.from(headingParagraph.childNodes).forEach((node) => {
      headingElement.append(node.cloneNode(true));
    });

    content.append(headingElement);
  }

  const grid = document.createElement('div');
  grid.className = 'statistics-grid';
  stats.forEach(({ title, value }) => {
    const item = document.createElement('div');
    item.className = 'statistics-item';

    const titleElement = document.createElement('div');
    titleElement.className = 'stat-title';
    titleElement.textContent = title;

    const valueElement = document.createElement('div');
    valueElement.className = 'stat-value';
    valueElement.textContent = value;

    item.append(titleElement, valueElement);
    grid.append(item);
  });

  content.append(grid);
  wrapper.append(content);
  block.replaceChildren(wrapper);
}
