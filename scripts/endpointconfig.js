export function getAEMPublish() {
  const publishUrl = window?.aem?.publishUrl || '';
  return publishUrl || '';
}

export function getAEMAuthor() {
  const authorUrl = window?.aem?.authorUrl || '';
  return authorUrl || '';
}
