/**
 * Social links decorator: a list of social profile links from the Social Links data sheet
 * (utils/data.js getSocialLinks). The Icon column is an icon name from /icons (e.g. linkedin,
 * x, facebook, instagram, youtube) or an image URL; without one, the platform name is the icon
 * name when /icons has it, else the platform is shown as text.
 */
import { decorateIcons, toClassName } from '../scripts/aem.js';
import { hideVisually } from './a11y-decorator.js';
import { setLinkTarget } from './link-decorator.js';
import { buildImage } from './responsive-image-decorator.js';

// platforms with an icon in /icons
const PLATFORM_ICONS = ['linkedin', 'x', 'facebook', 'instagram', 'youtube'];
const PLATFORM_ALIASES = { twitter: 'x' };

/** the icon element of a link: an /icons icon, an image, or null */
function iconOf({ platform, icon }) {
  if (/[./]/.test(icon)) return buildImage({ src: icon, alt: '' });
  const platformName = toClassName(platform);
  const name = toClassName(icon) || PLATFORM_ALIASES[platformName] || platformName;
  if (!icon && !PLATFORM_ICONS.includes(name)) return null;
  const span = document.createElement('span');
  span.className = `icon icon-${name}`;
  return span;
}

/**
 * Builds the social links list.
 * @param {{ platform: string, url: string, icon: string }[]} links
 * @param {string} className
 * @param {(platform: string) => string} [labelOf] the accessible name of a link,
 *   e.g. "TCS on LinkedIn"; defaults to the platform
 * @returns {HTMLUListElement | null}
 */
// eslint-disable-next-line import/prefer-default-export
export function buildSocialLinks(links, className, labelOf = (platform) => platform) {
  if (!links?.length) return null;
  const list = document.createElement('ul');
  list.className = className;
  links.forEach((link) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.url;
    setLinkTarget(a, new URL(link.url, window.location.href).origin !== window.location.origin);
    const label = document.createElement('span');
    label.textContent = labelOf(link.platform || link.url);
    const icon = iconOf(link);
    if (icon) {
      a.append(icon);
      hideVisually(label);
    }
    a.append(label);
    li.append(a);
    list.append(li);
  });
  decorateIcons(list);
  return list;
}
