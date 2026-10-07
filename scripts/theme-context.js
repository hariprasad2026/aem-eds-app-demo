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

const TEMPLATE_THEME_STYLES = {
  'enterprise-modern': '/styles/themes/templates/enterprise-modern.css',
};

const PAGE_THEME_STYLES = {
  'next-screen-453-39628': '/styles/themes/pages/next-screen-453-39628.css',
};

const PAGE_THEME_TO_TEMPLATE = {
  'next-screen-453-39628': 'enterprise-modern',
};

function normalize(value, fallback) {
  if (!value) return fallback;
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function getQueryParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}

function resolvePageTheme(edgeContext) {
  return normalize(
    getQueryParam('page-theme')
      || getMetadata('theme-page')
      || edgeContext.pageTheme,
    '',
  );
}

function resolveTemplateTheme(edgeContext, pageTheme) {
  return normalize(
    getQueryParam('template-theme')
      || getMetadata('theme-template')
      || edgeContext.templateTheme
      || PAGE_THEME_TO_TEMPLATE[pageTheme],
    '',
  );
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
  const pageTheme = resolvePageTheme(edgeContext);
  const templateTheme = resolveTemplateTheme(edgeContext, pageTheme);

  return {
    brand,
    locale,
    mode,
    audience,
    templateTheme,
    pageTheme,
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
  if (context.templateTheme) {
    root.dataset.templateTheme = context.templateTheme;
  }
  if (context.pageTheme) {
    root.dataset.pageTheme = context.pageTheme;
  }
}

export async function applyThemeContext() {
  const context = getContext();
  applyRootAttributes(context);

  const loaders = [];
  const brandStyle = BRAND_STYLES[context.brand];
  const audienceStyle = AUDIENCE_STYLES[context.audience];
  const templateThemeStyle = TEMPLATE_THEME_STYLES[context.templateTheme];
  const pageThemeStyle = PAGE_THEME_STYLES[context.pageTheme];

  if (brandStyle) loaders.push(loadCSS(`${window.hlx.codeBasePath}${brandStyle}`));
  if (audienceStyle) loaders.push(loadCSS(`${window.hlx.codeBasePath}${audienceStyle}`));
  if (templateThemeStyle) loaders.push(loadCSS(`${window.hlx.codeBasePath}${templateThemeStyle}`));
  if (pageThemeStyle) loaders.push(loadCSS(`${window.hlx.codeBasePath}${pageThemeStyle}`));

  await Promise.all(loaders);
}
