/**
 * Data utils: the locale's data spreadsheets under /{locale}/data/, e.g. /de-de/data/ (see
 * utils/site.js), each loaded once per page. Rows are returned as typed objects with
 * camelCase properties; missing sheets give empty lists.
 *
 * | Sheet          | Columns                                                   |
 * |----------------|-----------------------------------------------------------|
 * | authors        | author-id, name, designation, bio, image, linkedin, region |
 * | locations      | location-id, location-name, country, region, latitude, longitude |
 * | partners       | partner-id, partner-name, logo, website, tier, description |
 * | social-links   | platform, url, icon, sort-order                           |
 * | media-contacts | id, name, designation, email, phone, region               |
 */
import { localeSheetPath, sheetRows } from './site.js';

const sheets = new Map();

/** the trimmed value of a column */
const cell = (row, column) => String(row[column] ?? '').trim();

/** a number, or null when empty or not a number */
const numberOf = (value) => (value === '' || Number.isNaN(Number(value)) ? null : Number(value));

/** an ID compared without case */
const sameId = (a, b) => !!a && a.toLowerCase() === b.toLowerCase();

/**
 * Loads the rows of a data sheet of the current locale.
 * @param {string} name the sheet name, e.g. authors
 * @returns {Promise<Object[]>}
 */
export function loadDataSheet(name) {
  if (!sheets.has(name)) {
    sheets.set(name, fetch(localeSheetPath(`data/${name}`))
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => sheetRows(json))
      .catch(() => []));
  }
  return sheets.get(name);
}

const toAuthor = (row) => ({
  id: cell(row, 'author-id'),
  name: cell(row, 'name'),
  designation: cell(row, 'designation'),
  bio: cell(row, 'bio'),
  image: cell(row, 'image'),
  linkedin: cell(row, 'linkedin'),
  region: cell(row, 'region'),
});

/** @returns {Promise<ReturnType<toAuthor>[]>} */
export async function getAuthors() {
  return (await loadDataSheet('authors')).map(toAuthor).filter((author) => author.id);
}

/**
 * An author by Author ID (the author-id metadata of a page).
 * @param {string} id
 * @returns {Promise<ReturnType<toAuthor> | null>}
 */
export async function getAuthor(id) {
  if (!id) return null;
  return (await getAuthors()).find((author) => sameId(author.id, id.trim())) || null;
}

/** @returns {Promise<Object[]>} { id, name, country, region, latitude, longitude } */
export async function getLocations() {
  return (await loadDataSheet('locations')).map((row) => ({
    id: cell(row, 'location-id'),
    name: cell(row, 'location-name'),
    country: cell(row, 'country'),
    region: cell(row, 'region'),
    latitude: numberOf(cell(row, 'latitude')),
    longitude: numberOf(cell(row, 'longitude')),
  })).filter((location) => location.id || location.name);
}

/** @returns {Promise<Object[]>} { id, name, logo, website, tier, description } */
export async function getPartners() {
  return (await loadDataSheet('partners')).map((row) => ({
    id: cell(row, 'partner-id'),
    name: cell(row, 'partner-name'),
    logo: cell(row, 'logo'),
    website: cell(row, 'website'),
    tier: cell(row, 'tier'),
    description: cell(row, 'description'),
  })).filter((partner) => partner.id || partner.name);
}

/**
 * The social links in Sort Order (rows without one last, in sheet order).
 * @returns {Promise<Object[]>} { platform, url, icon, sortOrder }
 */
export async function getSocialLinks() {
  const links = (await loadDataSheet('social-links')).map((row) => ({
    platform: cell(row, 'platform'),
    url: cell(row, 'url'),
    icon: cell(row, 'icon'),
    sortOrder: numberOf(cell(row, 'sort-order')),
  })).filter((link) => link.url);
  return links
    .map((link, index) => ({ link, index }))
    .sort((a, b) => (a.link.sortOrder ?? Infinity) - (b.link.sortOrder ?? Infinity)
      || a.index - b.index)
    .map(({ link }) => link);
}

/** @returns {Promise<Object[]>} { id, name, designation, email, phone, region } */
export async function getMediaContacts() {
  return (await loadDataSheet('media-contacts')).map((row) => ({
    id: cell(row, 'id'),
    name: cell(row, 'name'),
    designation: cell(row, 'designation'),
    email: cell(row, 'email'),
    phone: cell(row, 'phone'),
    region: cell(row, 'region'),
  })).filter((contact) => contact.id || contact.name);
}

/**
 * Rows of a region (case-insensitive); all rows when no region is given.
 * @template T
 * @param {T[]} rows rows with a region property
 * @param {string} [region]
 * @returns {T[]}
 */
export const inRegion = (rows, region) => (region
  ? rows.filter((row) => sameId(row.region, region)) : rows);
