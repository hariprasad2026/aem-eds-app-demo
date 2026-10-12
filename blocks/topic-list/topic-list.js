export default function decorate(block) {
  block.classList.add('topic-list');

  [...block.children].forEach((row) => {
    const cells = [...row.children];

    if (cells.length < 2) {
      return;
    }

    const text = cells[0]?.textContent.trim();

    const link = cells[1]?.querySelector('a');

    if (!text || !link) {
      return;
    }

    const href = link.getAttribute('href');

    row.innerHTML = `
      <a href="${href}">
        <span class="topic-list-text">${text}</span>
        <span class="topic-list-arrow">→</span>
      </a>
    `;

    row.classList.add('topic-list-item');
  });
}
