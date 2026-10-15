/**
 * Tag decorator: lists of tag labels (see utils/tags.js for reading tags).
 */

/**
 * Builds a list of tag labels.
 * @param {{ id: string, label: string }[]} tags
 * @param {string} className
 * @returns {HTMLUListElement | null}
 */
// eslint-disable-next-line import/prefer-default-export
export function buildTagList(tags, className) {
  if (!tags?.length) return null;
  const list = document.createElement('ul');
  list.className = className;
  tags.forEach(({ id, label }) => {
    const li = document.createElement('li');
    li.dataset.tag = id;
    li.textContent = label;
    list.append(li);
  });
  return list;
}
