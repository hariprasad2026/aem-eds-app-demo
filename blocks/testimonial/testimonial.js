export default function decorate(block) {
  const showEyebrow = block.children[0]?.textContent?.trim().toLowerCase() === 'true';

  const eyebrow = block.children[1]?.firstElementChild;

  const quotation = block.children[2]?.firstElementChild;

  const showAttribution = block.children[3]?.textContent?.trim().toLowerCase() === 'true';

  const attribution = block.children[4]?.firstElementChild;

  const background = block.children[5]?.textContent?.trim().toLowerCase();

  const wrapper = document.createElement('div');
  wrapper.className = 'testimonial-wrapper';

  if (background === 'grey') {
    wrapper.classList.add('grey');
  }

  if (showEyebrow && eyebrow?.textContent.trim()) {
    eyebrow.classList.add('testimonial-eyebrow');
    wrapper.append(eyebrow);
  }

  if (quotation) {
    quotation.classList.add('testimonial-quote');
    wrapper.append(quotation);
  }

  if (showAttribution && attribution?.textContent.trim()) {
    attribution.classList.add('testimonial-attribution');
    wrapper.append(attribution);
  }

  block.replaceChildren(wrapper);
}
