import { getMetadata, loadCSS } from './aem.js';

const DEFAULT_CONTEXT = {
  brand: 'tcs',
  mode: 'light',
  audience: 'default',
};

const BRAND_STYLES = {
  horizon: '/styles/themes/brands/horizon.css',
};

const AUDIENCE_STYLES = {
  enterprise: '/styles/themes/contexts/audience-enterprise.css',
};

function normalize(value, fallback) {
  if (!value) return fallback;
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function getQueryParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}

function resolveDirection(locale) {
  const language = locale.split('-')[0];
  return ['ar', 'fa', 'he', 'ur'].includes(language) ? 'rtl' : 'ltr';
}

function getContext() {
  const edgeContext = window.hlx?.themeContext || {};
  const brand = normalize(
    getQueryParam('brand') || getMetadata('theme-brand') || edgeContext.brand,
    DEFAULT_CONTEXT.brand,
  );
  const locale = normalize(
    getQueryParam('locale') || getMetadata('theme-locale') || edgeContext.locale,
    document.documentElement.lang || 'en-us',
  );
  const mode = normalize(
    getQueryParam('mode') || getMetadata('theme-mode') || edgeContext.mode,
    DEFAULT_CONTEXT.mode,
  );
  const audience = normalize(
    getQueryParam('audience') || getMetadata('theme-audience') || edgeContext.audience,
    DEFAULT_CONTEXT.audience,
  );

  return {
    brand,
    locale,
    mode,
    audience,
    direction: resolveDirection(locale),
  };
}

function applyRootAttributes(context) {
  const root = document.documentElement;
  root.setAttribute('lang', context.locale);
  root.setAttribute('dir', context.direction);
  root.dataset.brand = context.brand;
  root.dataset.mode = context.mode;
  root.dataset.audience = context.audience;
}

export async function applyThemeContext() {
  const context = getContext();
  applyRootAttributes(context);

  const loaders = [];
  const brandStyle = BRAND_STYLES[context.brand];
  const audienceStyle = AUDIENCE_STYLES[context.audience];

  if (brandStyle) loaders.push(loadCSS(`${window.hlx.codeBasePath}${brandStyle}`));
  if (audienceStyle) loaders.push(loadCSS(`${window.hlx.codeBasePath}${audienceStyle}`));

  await Promise.all(loaders);
}
