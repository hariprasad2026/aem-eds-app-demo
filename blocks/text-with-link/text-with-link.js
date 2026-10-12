export default function decorate(block) {
  const rows = [...block.children];

  const title = rows[0]?.innerHTML || '';

  let description = '';

  const descriptionBlock = rows[1];

  const paragraphText = [
    ...descriptionBlock.querySelectorAll('p'),
  ]
    .map((p) => p.textContent.trim())
    .filter(Boolean);

  const listItems = [
    ...descriptionBlock.querySelectorAll('li'),
  ]
    .map((li) => li.textContent.trim())
    .filter(Boolean);

  description = [
    ...paragraphText,
    ...listItems,
  ].join(' • ');

  if (!description) {
    description = rows[1]?.textContent?.trim() || '';
  }

  const linkText = rows[2]?.textContent?.trim() || '';

  const linkSource = rows[3]?.querySelector('a');

  const linkUrl = linkSource?.href
    || rows[3]?.textContent?.trim()
    || '#';

  const backgroundColor = (
    rows[4]?.textContent?.trim().toLowerCase()
    || 'white'
  ).replace(/\s+/g, '-');

  const textColor = (
    rows[5]?.textContent?.trim().toLowerCase()
    || 'black'
  ).replace(/\s+/g, '-');

  block.innerHTML = `
    <div class="textwithlink ${backgroundColor} ${textColor}-text">
      <div class="textwithlink-left">
        <div class="textwithlink-title">
          ${title}
        </div>

        ${description
    ? `<div class="textwithlink-description">${description}</div>`
    : ''
}
      </div>

      ${linkText
    ? `
            <div class="textwithlink-link">
              <a href ="${linkUrl}">
                <span class="link-text">${linkText}</span>
                <span class="arrow">→</span>
              </a>
            </div>
          `
    : ''
}
    </div>
  `;
}
