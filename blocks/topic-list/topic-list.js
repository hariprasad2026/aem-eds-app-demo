import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
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

    const anchor = document.createElement('a');
    anchor.href = link.href;
    moveInstrumentation(link, anchor);

    const label = document.createElement('span');
    label.className = 'topic-list-text';
    label.textContent = text;

    const arrow = document.createElement('span');
    arrow.className = 'topic-list-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';

    anchor.append(label, arrow);
    row.replaceChildren(anchor);
    row.classList.add('topic-list-item');
  });
}
