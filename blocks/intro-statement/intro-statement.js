export default function decorate(block) {
  const hasContent = block.textContent.trim();

  if (!hasContent) {
    block.innerHTML = `
      <div class="intro-statement-placeholder" aria-label="Intro statement placeholder">
        Intro Statement
      </div>
    `;
  }
}
