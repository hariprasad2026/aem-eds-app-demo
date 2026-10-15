/**
 * Query index rows (helix-query.yaml) for the List tests: /en/insights with children and
 * grandchildren, tags, card metadata, a hidden page and pages of another section.
 */
const row = (path, extra = {}) => ({
  path,
  title: '',
  description: '',
  image: '/default-meta-image.png?width=1200&format=pjpg&optimize=medium',
  tags: '[]',
  lastModified: '1790000000',
  ...extra,
});

export const ROWS = [
  row('/en/insights', { title: 'Insights' }),
  row('/en/insights/agentic-bank', {
    title: 'The agentic bank',
    description: 'Banking is entering a new era.',
    tags: JSON.stringify(['tcs:industry/banking', 'tcs:topic/ai']),
    contentType: 'Article',
    publishDate: '2026-09-04',
    readingTime: '16',
    thumbnailImage: '/en/media/agentic.jpg',
    lastModified: '1790000300',
  }),
  row('/en/insights/cloud-scale', {
    title: 'Cloud at scale',
    cardTitle: 'Cloud, at scale',
    cardDescription: 'How the cloud scales.',
    cardImage: '/en/media/cloud-card.jpg',
    cardImageAlt: 'A data centre',
    eyebrow: 'Perspective',
    tags: JSON.stringify(['tcs:topic/cloud']),
    modifiedDate: '2026-08-01',
    lastModified: '1790000100',
  }),
  row('/en/insights/ai-report', {
    title: 'AI report',
    tags: JSON.stringify(['tcs:topic/ai/genai', 'tcs:topic/cloud']),
    contentType: 'Report',
    publishDate: '2026-10-01',
    lastModified: '1790000200',
  }),
  row('/en/insights/hidden', { title: 'Hidden page', hideInNav: 'yes', tags: JSON.stringify(['tcs:topic/ai']) }),
  row('/en/insights/2026/deep-dive', {
    title: 'A deep dive',
    tags: JSON.stringify(['tcs:topic/ai']),
    lastModified: '1790000050',
  }),
  row('/en/insights/2026', { title: 'Insights 2026' }),
  row('/en/industries/banking', { title: 'Banking', tags: JSON.stringify(['tcs:industry/banking']) }),
];

/** pages as utils/query-index.js getPages() returns them (the fields the List uses + row) */
export const PAGES = ROWS.map((r) => ({
  path: r.path,
  title: r.title,
  description: r.description,
  image: r.image,
  tags: JSON.parse(r.tags),
  lastModified: Number(r.lastModified),
  row: r,
}));
