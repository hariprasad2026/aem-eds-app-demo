/**
 * Lottie utils: load the Lottie player (lottie-web light, vendored in scripts/lib/lottie)
 * once per page, for any block that plays Lottie animations.
 */
import { loadScript } from '../scripts/aem.js';

const LOTTIE_PLAYER = '/scripts/lib/lottie/lottie_light.min.js';

let player;

/**
 * Loads the player once; loadScript() resolves early for repeat calls, so the promise is kept.
 * @returns {Promise<Object>} the lottie API
 */
// eslint-disable-next-line import/prefer-default-export
export function loadLottie() {
  player = player || loadScript(`${window.hlx.codeBasePath}${LOTTIE_PLAYER}`).then(() => window.lottie);
  return player;
}
