/**
 * Analytics utils: the Adobe Client Data Layer (window.adobeDataLayer, read by Adobe Analytics /
 * Adobe Launch), following the AEM Core Components data layer: component state entries
 * ({ component: { id: { '@type', 'dc:title', ... } } }) and interaction events
 * ({ event: 'cmp:click', eventInfo: { path: 'component.id' } }).
 * The data layer array is created the standard way (window.adobeDataLayer || []) so entries
 * pushed before Launch loads are processed by it. Analytics never breaks rendering or links.
 */

/**
 * Pushes an entry to the data layer.
 * @param {Object} entry
 * @returns {boolean} whether it was pushed
 */
export function pushToDataLayer(entry) {
  try {
    window.adobeDataLayer = window.adobeDataLayer || [];
    window.adobeDataLayer.push(entry);
    return true;
  } catch {
    return false;
  }
}

/**
 * Adds components' state to the data layer.
 * @param {Object<string, Object>} components by component id
 */
export const pushComponents = (components) => pushToDataLayer({ component: components });

/**
 * Pushes a component interaction.
 * @param {string} event e.g. cmp:click
 * @param {string} id the component id
 * @param {Object} [info] more eventInfo
 */
export const pushComponentEvent = (event, id, info = {}) => pushToDataLayer({
  event,
  eventInfo: { path: `component.${id}`, ...info },
});
