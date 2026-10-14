export default function decorate(block) {
  const hasContent = block.textContent.trim();
  if (hasContent) return;

  // empty statements only show a placeholder while authoring in Universal Editor
  if (block.hasAttribute('data-aue-resource')) {
    const placeholder = document.createElement('div');
    placeholder.className = 'intro-statement-placeholder';
    placeholder.textContent = 'Intro Statement';
    block.replaceChildren(placeholder);
  } else {
    block.closest('.intro-statement-wrapper')?.remove();
  }
}
