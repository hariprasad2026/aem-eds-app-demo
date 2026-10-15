/**
 * Media utils: recognize video providers and build their player URLs.
 */

export const isYoutube = (link) => /youtube\.com|youtu\.be/.test(link);
export const isVimeo = (link) => /vimeo\.com/.test(link);
export const isAnimation = (href) => /\.json([?#]|$)/i.test(href);

/**
 * The video id of a YouTube watch / share / embed URL.
 * @param {URL} url
 * @returns {string}
 */
export function youtubeId(url) {
  if (url.hostname.includes('youtu.be')) return url.pathname.split('/')[1] || '';
  const embed = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
  return embed ? embed[1] : new URLSearchParams(url.search).get('v') || '';
}

/**
 * The YouTube embed URL for a watch / share URL.
 * @param {URL} url
 * @param {Object<string, string>} [params] player parameters, e.g. { autoplay: '1' }
 * @param {{ privacy?: boolean }} [options] privacy: the privacy-enhanced youtube-nocookie.com
 *   player (no cookies until the video plays)
 * @returns {string}
 */
export function youtubeEmbedUrl(url, params = {}, { privacy = false } = {}) {
  const vid = youtubeId(url);
  const host = privacy ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
  const src = new URL(vid ? `${host}/embed/${encodeURIComponent(vid)}` : `${host}${url.pathname}`);
  src.searchParams.set('rel', '0');
  Object.entries(params).forEach(([key, value]) => src.searchParams.set(key, value));
  return src.href;
}

/**
 * The Vimeo player URL for a video URL.
 * @param {URL} url
 * @param {Object<string, string>} [params] player parameters, e.g. { autoplay: '1' }
 * @param {{ start?: number }} [options] start: the start time in seconds
 * @returns {string}
 */
export function vimeoEmbedUrl(url, params = {}, { start = 0 } = {}) {
  const [, video] = url.pathname.split('/');
  const src = new URL(`https://player.vimeo.com/video/${encodeURIComponent(video)}`);
  Object.entries(params).forEach(([key, value]) => src.searchParams.set(key, value));
  if (start > 0) src.hash = `t=${Math.floor(start)}s`;
  return src.href;
}

/** the MIME type of a video file URL, e.g. video/mp4 */
export const videoType = (source) => `video/${source.split('?')[0].split('.').pop()}`;
