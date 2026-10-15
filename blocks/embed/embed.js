/*
 * Embed Block (Block Collection): videos and social posts from a URL.
 * https://www.aem.live/developer/block-collection/embed
 * Adapted: players come from the media decorator (DOM-built, no authored URL in HTML strings)
 * and the play button from the button decorator; the frames are named from the placeholders;
 * after Play, keyboard focus moves into the player.
 */
import { loadScript } from '../../scripts/aem.js';
import { createIconButton } from '../../decorators/icon-button-decorator.js';
import {
  createFrame, createVimeoFrame, createYoutubeFrame,
} from '../../decorators/media-decorator.js';
import { isVimeo, isYoutube } from '../../utils/media.js';
import { onVisible } from '../../utils/viewport.js';
import { getPlaceholders } from '../../utils/placeholders.js';

const FRAME_CLASS = 'embed-frame';
const AUTOPLAY = { muted: '1', autoplay: '1' };
const paramsOf = (autoplay) => (autoplay ? AUTOPLAY : {});
const TWITTER_HOSTS = /^(www\.)?(twitter|x)\.com$/i;

function embedTwitter(url) {
  const quote = document.createElement('blockquote');
  quote.className = 'twitter-tweet';
  const a = document.createElement('a');
  a.href = url.href.replace(/^https:\/\/(www\.)?x\.com/i, 'https://twitter.com');
  // the post's address until the widget replaces it (and if it never loads)
  a.textContent = a.href;
  quote.append(a);
  loadScript('https://platform.twitter.com/widgets.js');
  return quote;
}

const EMBEDS = [
  {
    name: 'youtube',
    match: (url) => isYoutube(url.href),
    embed: (url, autoplay, title) => createYoutubeFrame(
      url,
      paramsOf(autoplay),
      FRAME_CLASS,
      { title },
    ),
  },
  {
    name: 'vimeo',
    match: (url) => isVimeo(url.href),
    embed: (url, autoplay, title) => createVimeoFrame(
      url,
      paramsOf(autoplay),
      FRAME_CLASS,
      { title },
    ),
  },
  {
    name: 'twitter',
    match: (url) => TWITTER_HOSTS.test(url.hostname),
    embed: embedTwitter,
  },
];

function loadEmbed(block, link, { autoplay = false, focus = false, t }) {
  if (block.classList.contains('embed-is-loaded')) return;
  const url = new URL(link);
  const config = EMBEDS.find((e) => e.match(url));
  const title = t('contentFrom', 'Content from {source}', { source: url.hostname.replace(/^www\./, '') });
  const content = config
    ? config.embed(url, autoplay, title)
    : createFrame({ src: url.href, title, className: FRAME_CLASS });
  block.replaceChildren(content);
  if (config) block.classList.add(`embed-${config.name}`);
  block.classList.add('embed-is-loaded');
  // the focused Play button is gone: keyboard focus continues in the player
  if (focus) block.querySelector('iframe, a')?.focus();
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const placeholder = block.querySelector('picture');
  const link = block.querySelector('a')?.href;
  block.textContent = '';
  if (!link) return;
  const t = await getPlaceholders();

  if (placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed-placeholder';
    const play = createIconButton({
      label: t('play', 'Play'),
      icon: 'play',
      type: 'primary',
      className: 'embed-placeholder-play',
      onClick: () => loadEmbed(block, link, { autoplay: true, focus: true, t }),
    });
    play.dataset.cmpInteraction = 'play';
    wrapper.append(placeholder, play);
    block.append(wrapper);
  } else {
    onVisible(block, () => loadEmbed(block, link, { t }));
  }
}
