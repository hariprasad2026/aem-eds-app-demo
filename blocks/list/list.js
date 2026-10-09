export default function decorate(block) {
  const titleRow = [...block.children].find((row) => row.querySelector('h1, h2, h3, h4, h5, h6'));
  const ctaRow = [...block.children].find((row) => row.querySelector('a.button, a[href], .button-container'));

  const header = document.createElement('div');
  header.className = 'list-header-row';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'list-title-slot';
  if (titleRow) {
    titleWrap.append(...[...titleRow.childNodes].map((node) => node.cloneNode(true)));
  }

  const ctaWrap = document.createElement('div');
  ctaWrap.className = 'list-cta-slot';
  if (ctaRow) {
    ctaWrap.append(...[...ctaRow.childNodes].map((node) => node.cloneNode(true)));
  } else {
    header.classList.add('list-header-row-no-cta');
  }

  header.append(titleWrap, ctaWrap);
  block.replaceChildren(header);
  block.className = 'list';
}
