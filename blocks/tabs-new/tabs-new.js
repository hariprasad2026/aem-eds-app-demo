// eslint-disable-next-line import/no-unresolved
import { moveInstrumentation } from '../../scripts/scripts.js';

let tabBlockCount = 0;

export default async function decorate(block) {
  tabBlockCount += 1;

  const tabList = document.createElement('div');
  tabList.className = 'tabs-list';
  tabList.setAttribute('role', 'tablist');
  tabList.id = `tabs-new-list-${tabBlockCount}`;

  const panels = [...block.children];

  panels.forEach((panel, index) => {
    const firstCell = panel.firstElementChild;

    if (!firstCell) {
      return;
    }

    const tabTitleElement = firstCell.querySelector('h1, h2, h3, h4, h5, h6, p');

    const tabTitle = tabTitleElement
      ? tabTitleElement.textContent.trim()
      : `Tab ${index + 1}`;

    const panelId = `tabs-new-panel-${tabBlockCount}-${index + 1}`;
    const buttonId = `tabs-new-tab-${tabBlockCount}-${index + 1}`;

    panel.classList.add('tabs-panel');

    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', buttonId);
    panel.setAttribute('aria-hidden', index !== 0);

    const button = document.createElement('button');

    button.className = 'tabs-tab';
    button.id = buttonId;
    button.type = 'button';

    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panelId);
    button.setAttribute('aria-selected', index === 0);

    button.innerHTML = `<span>${tabTitle}</span>`;

    button.addEventListener('click', () => {
      block.querySelectorAll('.tabs-panel').forEach((tabPanel) => {
        tabPanel.setAttribute('aria-hidden', 'true');
      });

      tabList.querySelectorAll('.tabs-tab').forEach((tabButton) => {
        tabButton.setAttribute('aria-selected', 'false');
      });

      panel.setAttribute('aria-hidden', 'false');
      button.setAttribute('aria-selected', 'true');
    });

    button.addEventListener('keydown', (event) => {
      const tabs = [...tabList.querySelectorAll('.tabs-tab')];
      const currentIndex = tabs.indexOf(button);

      let nextIndex = currentIndex;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % tabs.length;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      }
    });

    tabList.appendChild(button);

    if (tabTitleElement) {
      tabTitleElement.remove();
    }

    const heading = button.firstElementChild;
    if (heading) {
      moveInstrumentation(heading, null);
    }
  });

  block.prepend(tabList);
}
