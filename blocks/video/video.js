/*
 * Video (blocks/video/_video.json): a video file from AEM Assets, or a YouTube or Vimeo video.
 * Based on the Block Collection video block (https://www.aem.live/developer/block-collection/video).
 *
 * Properties (key-value):
 * - Video: the video, Title (accessible name), Caption, Transcript link, Poster Image + alt
 * - Playback: Playback (play button / autoplay when in view / background video), Muted,
 *   Loop, Show Player Controls, Start At / End At (seconds), Play in a Pop-up, Pause When Out
 *   of View
 * - Captions: a WebVTT file with its language and name (video files)
 * - Display: Aspect Ratio, Size, Alignment, Rounded Corners
 * - Privacy: privacy-enhanced mode (youtube-nocookie.com, Vimeo do not track)
 * Videos never autoplay for visitors who prefer reduced motion. Blocks authored before the
 * key-value model (link, poster, "autoplay" option) still work.
 */
import { toClassName } from '../../scripts/aem.js';
import { decorateButton } from '../../decorators/button-decorator.js';
import { createIconButton } from '../../decorators/icon-button-decorator.js';
import { fromCell } from '../../decorators/content-decorator.js';
import { pictureOf } from '../../decorators/image-decorator.js';
import {
  createVideoElement, createVimeoFrame, createYoutubeFrame,
} from '../../decorators/media-decorator.js';
import { prefersReducedMotion } from '../../utils/environment.js';
import { linkOf } from '../../utils/links.js';
import { isVimeo, isYoutube, youtubeId } from '../../utils/media.js';
import { getPlaceholders } from '../../utils/placeholders.js';
import {
  isOn, normalizeKey, optionOf, readProperties, textOf,
} from '../../utils/properties.js';
import { getLocale } from '../../utils/site.js';
import { onVisible, watchVisibility } from '../../utils/viewport.js';

const FRAME_CLASS = 'video-frame';
const PLAYBACKS = ['click', 'autoplay', 'background'];
const ASPECT_RATIOS = {
  '16-9': '16 / 9', '4-3': '4 / 3', '1-1': '1 / 1', '21-9': '21 / 9', '9-16': '9 / 16',
};
const SIZES = ['full', 'large', 'medium', 'small'];
const ALIGNMENTS = ['center', 'left', 'right'];

/** a toggle with a default for when it isn't authored */
const flag = (cell, fallback) => (cell ? isOn(cell) : fallback);

/** a number of seconds, 0 when empty */
const seconds = (cell) => Math.max(0, parseFloat(textOf(cell)) || 0);

/** the URL of a link or path property */
const urlOf = (cell) => linkOf(cell)?.href || textOf(cell);

// the model fields in dialog order (the poster fields placeholder_image / placeholder_imageAlt
// are an element group, delivered as one "placeholder" cell, the alt text in the image)
const FIELDS = [
  'uri', 'label', 'caption', 'transcript', 'placeholder', 'playback', 'muted', 'loop',
  'controls', 'starttime', 'endtime', 'openinmodal', 'pauseoffscreen', 'captions',
  'captionslanguage', 'captionslabel', 'aspectratio', 'size', 'alignment', 'rounded',
  'privacymode',
];

/**
 * The block's property cells, by normalized field name. AEM delivers a block added with the
 * current model as key-value rows (name | value); a block added before the model became
 * key-value delivers one row per field, in dialog order.
 * @returns {Object<string, Element>} empty for blocks of the first model (link and picture)
 */
function readFields(block) {
  const rows = [...block.children];
  const keyed = rows.some((row) => row.children.length === 2
    && FIELDS.includes(normalizeKey(row.children[0].textContent)));
  if (keyed) return readProperties(block);
  // one row per field: the playback row tells it apart from the first model
  const playback = toClassName(textOf(rows[FIELDS.indexOf('playback')]));
  if (!PLAYBACKS.includes(playback)) return {};
  const props = {};
  FIELDS.forEach((field, i) => {
    if (rows[i]) props[field] = rows[i].firstElementChild || rows[i];
  });
  return props;
}

/**
 * Reads the block's properties; falls back to blocks authored before the key-value model
 * (a link, a picture and an "autoplay" block option).
 */
function readConfig(block) {
  const props = readFields(block);
  const legacy = !props.uri;
  const poster = legacy
    ? block.querySelector('picture')
    // the grouped cell; separately keyed poster rows are read too
    : pictureOf(props.placeholder || props.placeholderimage, props.placeholderimagealt);
  const link = legacy ? block.querySelector('a[href]')?.href : urlOf(props.uri);
  const captions = urlOf(props.captions);
  const language = textOf(props.captionslanguage) || getLocale().language;
  return {
    link,
    poster,
    title: textOf(props.label),
    caption: textOf(props.caption) ? props.caption : null,
    transcript: linkOf(props.transcript),
    // the former "Auto Play" option played a muted, looping background video
    playback: legacy
      ? (block.classList.contains('autoplay') && 'background') || 'click'
      : optionOf(block, props.playback, PLAYBACKS) || 'click',
    muted: flag(props.muted, false),
    loop: flag(props.loop, false),
    controls: flag(props.controls, true),
    start: seconds(props.starttime),
    end: seconds(props.endtime),
    modal: flag(props.openinmodal, false),
    pauseOffscreen: flag(props.pauseoffscreen, true),
    tracks: captions
      ? [{ src: captions, srclang: language, label: textOf(props.captionslabel) || language }]
      : [],
    aspectRatio: ASPECT_RATIOS[optionOf(block, props.aspectratio, Object.keys(ASPECT_RATIOS))]
      || ASPECT_RATIOS['16-9'],
    size: optionOf(block, props.size, SIZES) || 'large',
    alignment: optionOf(block, props.alignment, ALIGNMENTS) || 'center',
    rounded: flag(props.rounded, true),
    privacy: flag(props.privacymode, true),
  };
}

const bit = (on) => (on ? '1' : '0');

/**
 * Builds the player for the video.
 * @param {Object} config the block configuration
 * @param {{ autoplay: boolean, background: boolean, started?: boolean }} play how the player
 *   starts; started: the visitor pressed play, so it plays with sound unless set to Muted
 * @returns {Element} the player (an iframe wrapper or a video element)
 */
function buildPlayer(config, { autoplay, background, started = false }) {
  const url = new URL(config.link, window.location.href);
  // browsers only autoplay muted videos; a video the visitor starts may play with sound
  const muted = background || config.muted || (autoplay && !started);
  const controls = !background && config.controls;
  const loop = background || config.loop;
  const { title } = config;
  if (isYoutube(config.link)) {
    const params = {
      autoplay: bit(autoplay),
      mute: bit(muted),
      controls: bit(controls),
      playsinline: '1',
    };
    if (loop) Object.assign(params, { loop: '1', playlist: youtubeId(url) });
    if (background) params.disablekb = '1';
    if (config.start) params.start = String(Math.floor(config.start));
    if (config.end) params.end = String(Math.floor(config.end));
    return createYoutubeFrame(url, params, FRAME_CLASS, { title, privacy: config.privacy });
  }
  if (isVimeo(config.link)) {
    const params = {
      autoplay: bit(autoplay),
      muted: bit(muted),
      loop: bit(loop),
      controls: bit(controls),
      playsinline: '1',
    };
    if (background) params.background = '1';
    if (config.privacy) params.dnt = '1';
    return createVimeoFrame(url, params, FRAME_CLASS, { title, start: config.start });
  }
  const poster = config.poster?.querySelector('img');
  return createVideoElement(url.href, {
    autoplay,
    background,
    muted,
    loop,
    controls,
    poster: poster?.currentSrc || poster?.src || '',
    start: config.start,
    end: config.end,
    title,
    tracks: config.tracks,
  });
}

/** moves keyboard focus into a player once it shows (the focused Play button is gone) */
function focusWhenLoaded(player) {
  if (player.tagName === 'VIDEO') {
    player.addEventListener('canplay', () => player.focus(), { once: true });
    return;
  }
  const iframe = player.querySelector('iframe');
  iframe?.addEventListener('load', () => iframe.focus(), { once: true });
}

/**
 * Pause / play (a video file) or stop / play (a YouTube or Vimeo frame) for a video playing on
 * its own without controls (WCAG 2.2.2).
 * @param {Element} media
 * @param {Element} player
 * @param {() => Element} rebuild a new player (frames restart when played again)
 * @param {Function} t placeholders
 */
function addPlaybackToggle(media, player, rebuild, t) {
  let current = player;
  let playing = true;
  const file = player.tagName === 'VIDEO';
  const button = createIconButton({ label: '', icon: 'pause', className: 'video-toggle' });
  button.dataset.cmpInteraction = 'playback';
  const update = () => {
    let label = t('playVideo', 'Play video');
    if (playing) label = file ? t('pauseVideo', 'Pause video') : t('stopVideo', 'Stop video');
    button.setAttribute('aria-label', label);
    decorateButton(button, {
      view: 'icon', type: 'secondary', icon: playing ? 'pause' : 'play', title: label,
    });
  };
  button.addEventListener('click', () => {
    playing = !playing;
    if (file) {
      if (playing) current.play();
      else current.pause();
    } else if (playing) {
      current = rebuild();
      media.prepend(current);
    } else {
      current.remove();
    }
    update();
  });
  if (file) {
    current.addEventListener('pause', () => { playing = false; update(); });
    current.addEventListener('play', () => { playing = true; update(); });
  }
  update();
  media.append(button);
}

/** marks the block loaded once the player can play, so the poster gives way to it */
function whenLoaded(block, player) {
  const done = () => { block.dataset.embedLoaded = true; };
  if (player.tagName === 'VIDEO') player.addEventListener('canplay', done, { once: true });
  else player.querySelector('iframe')?.addEventListener('load', done, { once: true });
}

/**
 * Pauses an autoplaying video file while it is off screen and resumes it when it is back,
 * unless the visitor paused it.
 */
function pauseOffscreen(video) {
  let pausedByScroll = false;
  watchVisibility(video, (visible) => {
    if (!visible && !video.paused) {
      pausedByScroll = true;
      video.pause();
    } else if (visible && pausedByScroll) {
      pausedByScroll = false;
      video.play().catch(() => {});
    }
  });
}

/** plays the video in a dialog over the page */
async function playInModal(config) {
  const { createModal } = await import('../modal/modal.js');
  const wrapper = document.createElement('div');
  wrapper.className = 'video-modal-player';
  wrapper.style.setProperty('--video-aspect-ratio', config.aspectRatio);
  wrapper.append(buildPlayer(config, { autoplay: true, background: false, started: true }));
  const { showModal } = await createModal([wrapper]);
  showModal();
}

/** the poster with a play button */
function buildPoster(config, label, onPlay) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-placeholder';
  if (config.poster) wrapper.append(config.poster);
  if (onPlay) {
    wrapper.append(createIconButton({
      label,
      icon: 'play',
      type: 'primary',
      className: 'video-placeholder-play',
      onClick: onPlay,
    }));
  }
  return wrapper;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = readConfig(block);
  const t = await getPlaceholders();
  const caption = config.caption ? fromCell(config.caption, 'div', 'video-caption') : null;
  block.textContent = '';
  block.dataset.embedLoaded = false;
  if (!config.link) return;

  block.classList.add(`video-size-${config.size}`, `video-align-${config.alignment}`);
  block.classList.toggle('video-rounded', config.rounded);
  block.style.setProperty('--video-aspect-ratio', config.aspectRatio);
  if (!config.title) config.title = t('video', 'Video');

  const media = document.createElement('div');
  media.className = 'video-media';
  block.append(media);
  if (caption) block.append(caption);
  if (config.transcript) {
    const transcript = config.transcript.cloneNode(false);
    transcript.className = 'video-transcript';
    const authored = config.transcript.textContent.trim();
    // a link showing its own URL gets a readable text
    transcript.textContent = authored && !/^(https?:|\/)/.test(authored)
      ? authored : t('readTheTranscript', 'Read the transcript');
    const p = document.createElement('p');
    p.append(transcript);
    block.append(p);
  }

  const playLabel = config.title === t('video', 'Video')
    ? t('playVideo', 'Play video') : t('playVideoTitle', 'Play video: {title}', { title: config.title });
  // visitors who prefer reduced motion start videos themselves
  const playback = prefersReducedMotion() ? 'click' : config.playback;

  if (playback === 'click') {
    if (config.poster || config.modal) {
      block.classList.add('placeholder');
      const poster = buildPoster(config, playLabel, () => {
        if (config.modal) {
          playInModal(config);
          return;
        }
        const player = buildPlayer(config, { autoplay: true, background: false, started: true });
        whenLoaded(block, player);
        media.append(player);
        focusWhenLoaded(player);
      });
      media.append(poster);
    } else {
      // no poster: the player shows its own first frame and play button
      onVisible(media, () => {
        const player = buildPlayer(config, { autoplay: false, background: false });
        whenLoaded(block, player);
        media.append(player);
      });
    }
    return;
  }

  // autoplay / background: the poster (if any) shows until the video can play
  if (config.poster) {
    block.classList.add('placeholder');
    media.append(buildPoster(config, playLabel, null));
  }
  onVisible(media, () => {
    const background = playback === 'background';
    const build = () => buildPlayer(config, { autoplay: true, background });
    const player = build();
    whenLoaded(block, player);
    // a background video is decorative: not announced, not a stop for the keyboard
    if (background) {
      player.setAttribute('aria-hidden', 'true');
      player.querySelector('iframe')?.setAttribute('tabindex', '-1');
    }
    media.append(player);
    if (player.tagName === 'VIDEO' && config.pauseOffscreen) pauseOffscreen(player);
    if (background || !config.controls) addPlaybackToggle(media, player, build, t);
  });
}
