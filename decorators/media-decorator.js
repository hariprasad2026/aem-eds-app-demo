/**
 * Media decorator: builds video players (YouTube, Vimeo, iframes, video files) with DOM APIs,
 * so authored URLs never end up in HTML strings. URLs come from utils/media.js.
 */
import { videoType, vimeoEmbedUrl, youtubeEmbedUrl } from '../utils/media.js';

const YOUTUBE_ALLOW = 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope';
const VIMEO_ALLOW = 'autoplay; fullscreen; picture-in-picture; encrypted-media';

/**
 * A responsive, lazy-loaded iframe in a wrapper (the wrapper class sets the aspect ratio).
 * @param {{ src: string, title: string, allow?: string, className?: string }} options
 * @returns {HTMLDivElement}
 */
export function createFrame({
  src, title, allow = 'encrypted-media', className = '',
}) {
  const wrapper = document.createElement('div');
  wrapper.className = className;
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.allow = allow;
  iframe.allowFullscreen = true;
  wrapper.append(iframe);
  return wrapper;
}

/**
 * A YouTube player for a watch / share URL.
 * @param {URL} url
 * @param {Object<string, string>} [params] player parameters, e.g. { autoplay: '1' }
 * @param {string} [className]
 * @param {{ title?: string, privacy?: boolean }} [options] title: the iframe's accessible name;
 *   privacy: the privacy-enhanced (youtube-nocookie.com) player
 */
export const createYoutubeFrame = (url, params = {}, className = '', options = {}) => createFrame({
  src: youtubeEmbedUrl(url, params, { privacy: options.privacy }),
  title: options.title || 'Content from YouTube',
  allow: YOUTUBE_ALLOW,
  className,
});

/**
 * A Vimeo player for a video URL.
 * @param {URL} url
 * @param {Object<string, string>} [params] player parameters, e.g. { autoplay: '1' }
 * @param {string} [className]
 * @param {{ title?: string, start?: number }} [options] title: the iframe's accessible name;
 *   start: the start time in seconds
 */
export const createVimeoFrame = (url, params = {}, className = '', options = {}) => createFrame({
  src: vimeoEmbedUrl(url, params, { start: options.start }),
  title: options.title || 'Content from Vimeo',
  allow: VIMEO_ALLOW,
  className,
});

/**
 * A <video> element for a video file.
 * @param {string} source video URL
 * @param {{
 *   autoplay?: boolean, background?: boolean, muted?: boolean, loop?: boolean,
 *   controls?: boolean, poster?: string, start?: number, end?: number, title?: string,
 *   tracks?: { src: string, srclang: string, label: string }[]
 * }} [options] background: muted, looping, inline, without controls; muted: defaults to
 *   autoplay; start / end: seconds (a media fragment); tracks: WebVTT captions
 * @returns {HTMLVideoElement}
 */
export function createVideoElement(source, options = {}) {
  const {
    autoplay = false, background = false, poster = '', start = 0, end = 0, title = '',
    tracks = [],
  } = options;
  // muted by default when it plays on its own (browsers only autoplay muted videos)
  const muted = background || (options.muted ?? autoplay);
  const video = document.createElement('video');
  video.controls = !background && options.controls !== false;
  // no Download in the player's menu (Chrome, Edge), nor "Save video as" on right-click
  video.setAttribute('controlslist', 'nodownload');
  video.addEventListener('contextmenu', (e) => e.preventDefault());
  video.loop = background || !!options.loop;
  video.muted = muted;
  // the muted attribute too: browsers only autoplay videos that are muted from the start
  if (muted) video.setAttribute('muted', '');
  video.playsInline = true;
  video.preload = autoplay ? 'auto' : 'metadata';
  if (autoplay) video.autoplay = true;
  if (poster) video.poster = poster;
  if (title) video.setAttribute('aria-label', title);

  const sourceEl = document.createElement('source');
  const fragment = start > 0 || end > 0 ? `#t=${start || 0}${end > 0 ? `,${end}` : ''}` : '';
  sourceEl.src = `${source}${fragment}`;
  sourceEl.type = videoType(source);
  video.append(sourceEl);
  tracks.forEach(({ src, srclang, label }, i) => {
    const track = document.createElement('track');
    track.kind = 'captions';
    track.src = src;
    if (srclang) track.srclang = srclang;
    if (label) track.label = label;
    if (i === 0) track.default = true;
    video.append(track);
  });
  if (autoplay) video.addEventListener('canplay', () => video.play().catch(() => {}), { once: true });
  return video;
}
