/*
 * Video Block
 * Show a video referenced by a link
 * https://www.hlx.live/developer/block-collection/video
 */

import { loadScript } from '../../scripts/aem.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let youtubeReady;
let vimeoReady;

function getPlaybackOptions(block) {
  const rows = [...block.children];
  const legacyAutoplay = block.classList.contains('autoplay');
  const defaults = {
    autoplay: legacyAutoplay,
    loop: legacyAutoplay,
    controls: !legacyAutoplay,
    muted: legacyAutoplay,
    centerPlayButton: false,
  };
  const optionCount = rows.length >= 7 ? 5 : 4;
  const options = Object.fromEntries(Object.entries(defaults).map(([name, fallback], index) => {
    const row = block.querySelector(`[data-aue-prop="${name}"]`)
      || (rows.length >= 6 && index < optionCount
        ? rows[rows.length - optionCount + index] : null);
    if (!row) return [name, fallback];
    const checkbox = row.querySelector('input[type="checkbox"]');
    const value = row.querySelector('[aria-checked]')?.getAttribute('aria-checked')
      ?? row.textContent;
    return [name, checkbox ? checkbox.checked : ['true', '1', 'yes', 'on', 'autoplay']
      .includes(value.trim().toLowerCase())];
  }));
  if (options.centerPlayButton) options.controls = false;
  return options;
}

function createPlaybackButton(wrapper) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'video-center-play';
  button.disabled = true;
  const update = (playing) => {
    button.dataset.playing = String(playing);
    button.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
    button.title = playing ? 'Pause video' : 'Play video';
  };
  update(false);
  wrapper.append(button);
  return { button, update };
}

async function attachPlaybackButton(wrapper, player, provider) {
  wrapper.classList.add('video-center-player');
  const { button, update } = createPlaybackButton(wrapper);
  try {
    if (provider === 'youtube') {
      youtubeReady ||= loadScript('https://www.youtube.com/iframe_api')
        .then(() => new Promise((resolve) => { window.YT.ready(resolve); }));
      await youtubeReady;
      let playing = false;
      const youtube = new window.YT.Player(player, {
        events: {
          onReady: () => { button.disabled = false; },
          onStateChange: (event) => {
            playing = event.data === window.YT.PlayerState.PLAYING;
            update(playing);
          },
        },
      });
      button.addEventListener('click', () => {
        if (playing) youtube.pauseVideo();
        else youtube.playVideo();
      });
    } else if (provider === 'vimeo') {
      vimeoReady ||= loadScript('https://player.vimeo.com/api/player.js');
      await vimeoReady;
      const vimeo = new window.Vimeo.Player(player);
      let playing = false;
      const setPlaying = (value) => { playing = value; update(value); };
      vimeo.on('play', () => setPlaying(true));
      vimeo.on('pause', () => setPlaying(false));
      vimeo.on('ended', () => setPlaying(false));
      await vimeo.ready();
      setPlaying(!await vimeo.getPaused());
      button.disabled = false;
      button.addEventListener('click', () => {
        const action = playing ? vimeo.pause() : vimeo.play();
        action.catch(() => setPlaying(false));
      });
    } else {
      button.disabled = false;
      update(!player.paused && !player.ended);
      player.addEventListener('play', () => update(true));
      player.addEventListener('pause', () => update(false));
      player.addEventListener('ended', () => update(false));
      button.addEventListener('click', () => {
        if (player.paused || player.ended) player.play().catch(() => update(false));
        else player.pause();
      });
    }
  } catch (error) {
    button.title = 'Video player unavailable';
    button.setAttribute('aria-label', button.title);
  }
}

function embedYoutube(url, options) {
  const usp = new URLSearchParams(url.search);
  const videoId = usp.get('v') || url.pathname.split('/').filter(Boolean).pop();
  usp.set('rel', '0');
  usp.set('autoplay', options.autoplay ? '1' : '0');
  usp.set('mute', options.muted ? '1' : '0');
  usp.set('controls', options.controls ? '1' : '0');
  usp.set('disablekb', options.controls ? '0' : '1');
  usp.set('loop', options.loop ? '1' : '0');
  usp.set('playsinline', '1');
  if (options.centerPlayButton) {
    usp.set('enablejsapi', '1');
    usp.set('origin', window.location.origin);
  }
  if (options.loop) usp.set('playlist', videoId);

  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${usp}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function embedVimeo(url, options) {
  const segments = url.pathname.split('/').filter(Boolean);
  const video = segments[0] === 'video' ? segments[1] : segments[0];
  const params = new URLSearchParams(url.search);
  params.set('autoplay', options.autoplay ? '1' : '0');
  params.set('loop', options.loop ? '1' : '0');
  params.set('controls', options.controls ? '1' : '0');
  params.set('muted', options.muted ? '1' : '0');
  params.set('playsinline', '1');
  params.set('background', '0');
  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}?${params}"
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen  
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function getVideoElement(source, options) {
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  ['autoplay', 'loop', 'controls', 'muted'].forEach((name) => {
    if (options[name]) video.setAttribute(name, '');
  });
  video.muted = options.muted;
  if (options.poster) video.poster = options.poster;

  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  sourceEl.setAttribute('type', `video/${new URL(source).pathname.split('.').pop()}`);
  video.append(sourceEl);

  return video;
}

const loadVideoEmbed = (block, link, options) => {
  if (block.dataset.embedLoaded === 'true') {
    return;
  }
  const url = new URL(link);

  const isYoutube = link.includes('youtube') || link.includes('youtu.be');
  const isVimeo = link.includes('vimeo');

  if (isYoutube) {
    const embedWrapper = embedYoutube(url, options);
    block.append(embedWrapper);
    if (options.centerPlayButton) {
      attachPlaybackButton(embedWrapper, embedWrapper.querySelector('iframe'), 'youtube');
    }
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else if (isVimeo) {
    const embedWrapper = embedVimeo(url, options);
    block.append(embedWrapper);
    if (options.centerPlayButton) {
      attachPlaybackButton(embedWrapper, embedWrapper.querySelector('iframe'), 'vimeo');
    }
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else {
    const videoEl = getVideoElement(link, options);
    if (options.centerPlayButton) {
      const wrapper = document.createElement('div');
      wrapper.append(videoEl);
      block.append(wrapper);
      attachPlaybackButton(wrapper, videoEl);
    } else {
      block.append(videoEl);
    }
    videoEl.addEventListener('canplay', () => {
      block.dataset.embedLoaded = true;
    });
  }
};

export default async function decorate(block) {
  const placeholder = block.querySelector('picture');
  const link = block.querySelector('a').href;
  const options = getPlaybackOptions(block);
  options.poster = placeholder?.querySelector('img')?.src;
  const autoplay = options.autoplay && !prefersReducedMotion.matches;
  block.textContent = '';
  block.dataset.embedLoaded = false;

  if (placeholder && !options.centerPlayButton) {
    block.classList.add('placeholder');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-placeholder';
    wrapper.append(placeholder);

    if (!autoplay) {
      wrapper.insertAdjacentHTML(
        'beforeend',
        '<div class="video-placeholder-play"><button type="button" title="Play"></button></div>',
      );
      wrapper.addEventListener('click', () => {
        wrapper.remove();
        loadVideoEmbed(block, link, { ...options, autoplay: true });
      });
    }
    block.append(wrapper);
  }

  if (!placeholder || autoplay || options.centerPlayButton) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        loadVideoEmbed(block, link, { ...options, autoplay });
      }
    });
    observer.observe(block);
  }
}
