const fontClassPrefix = 'rte-google-font-';
const requestedFonts = new Set();
let fontCatalogPromise;

function getFontCatalog() {
  if (!fontCatalogPromise) {
    fontCatalogPromise = fetch(`${window.hlx.codeBasePath}/fonts/google-fonts.json`)
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load Google Fonts catalog');
        return response.json();
      })
      .catch((error) => {
        fontCatalogPromise = null;
        throw error;
      });
  }
  return fontCatalogPromise;
}

async function loadFont(fontClass) {
  if (requestedFonts.has(fontClass)) return;
  requestedFonts.add(fontClass);

  const fontIndex = Number(fontClass.slice(fontClassPrefix.length));
  try {
    const catalog = await getFontCatalog();
    const family = catalog[fontIndex];
    if (!family) {
      requestedFonts.delete(fontClass);
      return;
    }

    const escapedFamily = family.replace(/["\\]/g, '\\$&');
    const style = document.createElement('style');
    style.textContent = `.${fontClass}{font-family:"${escapedFamily}",sans-serif}`;
    document.head.append(style);

    const fontURL = new URL('https://fonts.googleapis.com/css2');
    fontURL.searchParams.set('family', family);
    fontURL.searchParams.set('display', 'swap');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontURL.href;
    link.onerror = () => {
      link.remove();
      style.textContent = `.${fontClass}{font-family:sans-serif}`;
      requestedFonts.delete(fontClass);
      // eslint-disable-next-line no-console
      console.warn(`Unable to load font ${family}`);
    };
    document.head.append(link);
  } catch (error) {
    requestedFonts.delete(fontClass);
    // eslint-disable-next-line no-console
    console.warn(`Unable to load font ${fontClass}`, error);
  }
}

function loadElementFonts(element) {
  if (!element.classList) return;
  element.classList.forEach((className) => {
    if (className.startsWith(fontClassPrefix) && /^rte-google-font-\d+$/.test(className)) {
      loadFont(className);
    }
  });
}

function loadSubtreeFonts(element) {
  loadElementFonts(element);
  element.querySelectorAll?.('[class*="rte-google-font-"]').forEach(loadElementFonts);
}

export default function loadGoogleFonts() {
  loadSubtreeFonts(document.documentElement);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        loadElementFonts(mutation.target);
      } else {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) loadSubtreeFonts(node);
        });
      }
    });
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true,
  });
}
