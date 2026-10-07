const getText = (node) => {
  if (!node) return '';
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
};

const readStats = (block) => {
  const children = Array.from(block.children || []);
  const heading = getText(children[0]) || '';
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

  if (!heading && !stats.length) return;

  block.innerHTML = `
    <div class="statistics-list-wrapper">
      <div class="statistics-content">
        <h2 class="statistics-heading">${heading}</h2>
        <div class="statistics-grid">
          ${stats.map(({ title, value }) => `
            <div class="statistics-item">
              <div class="stat-title">${title}</div>
              <div class="stat-value">${value}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
