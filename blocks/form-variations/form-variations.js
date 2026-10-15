import { moveInstrumentation } from '../../scripts/scripts.js';
import { decorateButton } from '../../decorators/button-decorator.js';
import { fromCell } from '../../decorators/content-decorator.js';
import { buildHeading } from '../../decorators/heading-decorator.js';
import { isInEditor } from '../../utils/environment.js';
import { textOf } from '../../utils/properties.js';
import { createIdFactory, uniqueId } from '../../utils/ids.js';
import { fillPlaceholder, getPlaceholders } from '../../utils/placeholders.js';

// UI text from the placeholders sheet; English fallbacks until it's loaded in decorate()
let t = (key, fallback, values) => fillPlaceholder(fallback, values);

/*
 * Form Variations (blocks/form-variations/_form-variations.json): a form built from child
 * field items. The first rows are the block properties (Form Title, Form Description); every
 * item row starts with its type cell (the read-only "classes" field), followed by its fields
 * in model order. Fields, buttons and contact cards with "Show only if dropdown value equals"
 * appear when any dropdown of the form has that value.
 *
 * There is no submit endpoint yet: a valid submit dispatches a bubbling
 * "form-variations:submit" event on the block with { detail: { data } }.
 */

const ITEM_TYPES = [
  'field-text', 'field-select', 'field-textarea', 'field-checkbox', 'contact-card', 'field-submit',
];
const INPUT_KINDS = ['text', 'email', 'tel'];
const DEFAULT_MAX_LENGTH = 1500;

const isTrue = (cell) => textOf(cell).toLowerCase() === 'true';
const normalize = (value) => String(value || '').trim().toLowerCase();
const splitList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

/**
 * The item type of a row: the text of its first cell (published markup), or its
 * Universal Editor model.
 * @returns {{ type: string, cells: Element[] }} the type and the field cells after the type cell
 */
function readItem(row) {
  const cells = [...row.children];
  const first = textOf(cells[0]);
  if (ITEM_TYPES.includes(first)) return { type: first, cells: cells.slice(1) };
  const model = row.dataset.aueModel || '';
  if (ITEM_TYPES.includes(model)) return { type: model, cells };
  return { type: '', cells };
}

/** moves the editor instrumentation of a cell (and its only child) onto an element */
function instrument(cell, el) {
  if (!cell) return;
  if (cell.children.length === 1) moveInstrumentation(cell.firstElementChild, el);
  moveInstrumentation(cell, el);
}

function createGroup(classNames, dependsOn) {
  const group = document.createElement('div');
  group.className = ['form-variations-group', ...classNames].join(' ');
  if (dependsOn) group.dataset.dependsOn = dependsOn;
  return group;
}

/** a label with the authored text (keeping its instrumentation) and a required marker */
function createLabel(id, cell, required, fallback) {
  const label = document.createElement('label');
  label.className = 'form-variations-label';
  label.htmlFor = id;
  const text = document.createElement('span');
  text.textContent = textOf(cell) || fallback;
  instrument(cell, text);
  label.append(text);
  if (required) {
    const marker = document.createElement('span');
    marker.className = 'form-variations-required';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '*';
    label.append(marker);
  }
  return label;
}

function setRequired(control, required) {
  control.required = required;
  if (required) control.dataset.required = 'true';
}

/** the autocomplete value of a field from its name or type (WCAG 1.3.5 input purpose) */
const AUTOCOMPLETE = [
  [/first|given/, 'given-name'], [/last|surname|family/, 'family-name'], [/^(full[-_ ]?)?name$/, 'name'],
  [/e-?mail/, 'email'], [/phone|mobile|tel/, 'tel'], [/company|organi[sz]ation/, 'organization'],
  [/job|designation|position/, 'organization-title'], [/country/, 'country-name'],
  [/city|town/, 'address-level2'], [/zip|postal|post[-_ ]?code/, 'postal-code'],
];
function autocompleteOf(name, type) {
  if (type === 'email') return 'email';
  if (type === 'tel') return 'tel';
  const match = AUTOCOMPLETE.find(([pattern]) => pattern.test(name.toLowerCase()));
  return match ? match[1] : '';
}

/** the visible error of a field, linked to it (aria-invalid, aria-describedby) */
function showError(control, message) {
  const id = `${control.id}-error`;
  let error = control.form?.querySelector(`#${CSS.escape(id)}`);
  if (!error) {
    error = document.createElement('p');
    error.className = 'form-variations-error';
    error.id = id;
    control.closest('.form-variations-group')?.append(error);
  }
  error.textContent = message;
  control.setAttribute('aria-invalid', 'true');
  const described = (control.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
  if (!described.includes(id)) control.setAttribute('aria-describedby', [...described, id].join(' '));
}

function clearError(control) {
  control.removeAttribute('aria-invalid');
  const id = `${control.id}-error`;
  control.form?.querySelector(`#${CSS.escape(id)}`)?.remove();
  const described = (control.getAttribute('aria-describedby') || '').split(' ').filter((v) => v && v !== id);
  if (described.length) control.setAttribute('aria-describedby', described.join(' '));
  else control.removeAttribute('aria-describedby');
}

/** the message of an invalid field, from the placeholders */
function errorOf(control) {
  const { validity } = control;
  if (validity.valueMissing) return t('fieldRequired', 'This field is required.');
  if (validity.typeMismatch && control.type === 'email') return t('fieldEmail', 'Enter a valid email address.');
  if (validity.typeMismatch || validity.patternMismatch) return t('fieldFormat', 'Enter a valid value.');
  if (validity.tooLong) return t('fieldTooLong', 'This text is too long.');
  return control.validationMessage;
}

/**
 * Validates the visible fields: errors next to the fields, focus on the first invalid one.
 * @returns {boolean} whether the form is valid
 */
function validate(form) {
  const controls = [...form.elements].filter((el) => el.matches('input, select, textarea')
    && !el.disabled && el.type !== 'hidden' && el.type !== 'submit');
  const invalid = controls.filter((control) => {
    if (control.checkValidity()) {
      clearError(control);
      return false;
    }
    showError(control, errorOf(control));
    return true;
  });
  invalid[0]?.focus();
  return !invalid.length;
}

function buildTextField(cells, nextId) {
  const [nameCell, labelCell, kindCell, requiredCell, dependsCell] = cells;
  const name = textOf(nameCell) || 'text';
  const required = isTrue(requiredCell);
  const kind = normalize(textOf(kindCell));
  const id = nextId(name);
  const half = name.toLowerCase().includes('name');

  const group = createGroup(['field-text', half ? 'half-width' : 'full-width'], textOf(dependsCell));
  const input = document.createElement('input');
  input.className = 'form-variations-control';
  input.type = INPUT_KINDS.includes(kind) ? kind : 'text';
  input.id = id;
  input.name = name;
  const autocomplete = autocompleteOf(name, input.type);
  if (autocomplete) input.autocomplete = autocomplete;
  setRequired(input, required);
  group.append(createLabel(id, labelCell, required, name), input);
  return group;
}

function buildSelectField(cells, nextId) {
  const [nameCell, labelCell, requiredCell, optionsCell, dependsCell] = cells;
  const name = textOf(nameCell) || 'select';
  const required = isTrue(requiredCell);
  const id = nextId(name);

  const group = createGroup(['field-select', 'full-width'], textOf(dependsCell));
  const select = document.createElement('select');
  select.className = 'form-variations-control';
  select.id = id;
  select.name = name;
  setRequired(select, required);

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t('selectAnOption', 'Select an option');
  placeholder.disabled = true;
  placeholder.defaultSelected = true;
  select.append(placeholder);
  splitList(textOf(optionsCell)).forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  instrument(optionsCell, select);

  group.append(createLabel(id, labelCell, required, name), select);
  return group;
}

function buildTextareaField(cells, nextId) {
  const [nameCell, labelCell, maxLengthCell, requiredCell, dependsCell] = cells;
  const name = textOf(nameCell) || 'message';
  const required = isTrue(requiredCell);
  const id = nextId(name);
  const parsed = parseInt(textOf(maxLengthCell), 10);
  const limit = parsed > 0 ? parsed : DEFAULT_MAX_LENGTH;

  const group = createGroup(['field-textarea', 'full-width'], textOf(dependsCell));
  const textarea = document.createElement('textarea');
  textarea.className = 'form-variations-control';
  textarea.id = id;
  textarea.name = name;
  textarea.maxLength = limit;
  textarea.rows = 4;
  setRequired(textarea, required);

  const counter = document.createElement('span');
  counter.className = 'form-variations-counter';
  counter.id = `${id}-counter`;
  const update = () => { counter.textContent = `${textarea.value.length}/${limit}`; };
  textarea.setAttribute('aria-describedby', counter.id);
  textarea.addEventListener('input', update);
  update();

  group.append(createLabel(id, labelCell, required, name), textarea, counter);
  return group;
}

function buildCheckboxField(cells, nextId) {
  const [nameCell, labelCell, requiredCell, dependsCell] = cells;
  const name = textOf(nameCell) || 'consent';
  const required = isTrue(requiredCell);
  const id = nextId(name);

  const group = createGroup(['field-checkbox', 'full-width'], textOf(dependsCell));
  const input = document.createElement('input');
  input.className = 'form-variations-checkbox';
  input.type = 'checkbox';
  input.id = id;
  input.name = name;
  input.value = 'true';
  setRequired(input, required);

  const label = document.createElement('label');
  label.className = 'form-variations-checkbox-label';
  label.htmlFor = id;
  // the consent text is rich text (sanitized by the platform): keep its markup
  const text = document.createElement('span');
  text.className = 'form-variations-consent';
  if (labelCell) {
    text.append(...labelCell.childNodes);
    moveInstrumentation(labelCell, text);
  }
  if (!text.textContent.trim()) text.textContent = name;
  label.append(text);
  if (required) {
    const marker = document.createElement('span');
    marker.className = 'form-variations-required';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '*';
    label.append(marker);
  }
  group.append(input, label);
  return group;
}

function buildContactCard(cells) {
  const [regionCell, nameCell, emailsCell, phonesCell] = cells;
  const card = createGroup(['form-variations-contact-card', 'full-width'], textOf(regionCell));

  const name = document.createElement('p');
  name.className = 'form-variations-contact-name';
  name.textContent = textOf(nameCell);
  instrument(nameCell, name);
  card.append(name);

  const links = [
    ...splitList(textOf(emailsCell)).map((email) => ({ kind: 'email', text: email, href: `mailto:${email}` })),
    ...splitList(textOf(phonesCell)).map((phone) => ({ kind: 'phone', text: phone, href: `tel:${phone.replace(/[^\d+]/g, '')}` })),
  ];
  if (links.length) {
    const list = document.createElement('ul');
    list.className = 'form-variations-contact-links';
    links.forEach(({ kind, text, href }) => {
      const li = document.createElement('li');
      li.className = `form-variations-contact-${kind}`;
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      li.append(a);
      list.append(li);
    });
    card.append(list);
  }
  return card;
}

function buildSubmit(cells) {
  const [labelCell, dependsCell] = cells;
  const group = createGroup(['field-submit', 'full-width'], textOf(dependsCell));
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = textOf(labelCell) || t('send', 'Send');
  instrument(labelCell, button);
  decorateButton(button, { view: 'button', type: 'primary' });
  group.append(button);
  return group;
}

const BUILDERS = {
  'field-text': buildTextField,
  'field-select': buildSelectField,
  'field-textarea': buildTextareaField,
  'field-checkbox': buildCheckboxField,
  'contact-card': buildContactCard,
  'field-submit': buildSubmit,
};

/**
 * Shows the conditional fields and contact cards whose value is selected in any dropdown.
 * Hidden fields are disabled (left out of validation and the submitted data) and not required.
 * In the editor everything stays visible so authors can select it.
 */
function updateVisibility(form, editing) {
  const conditional = [...form.querySelectorAll('[data-depends-on]')];
  // repeat while a hidden dropdown hides further fields (chained conditions)
  for (let pass = 0; pass <= conditional.length; pass += 1) {
    const selected = [...form.querySelectorAll('select')]
      .filter((select) => !select.disabled && select.value)
      .map((select) => normalize(select.value));
    const before = conditional.map((el) => el.hidden).join();
    conditional.forEach((el) => {
      const visible = editing || selected.includes(normalize(el.dataset.dependsOn));
      el.hidden = !visible;
      el.querySelectorAll('input, select, textarea, button').forEach((control) => {
        control.disabled = !visible;
        if (control.dataset.required) control.required = visible;
      });
    });
    if (conditional.map((el) => el.hidden).join() === before) break;
  }
}

/** the form values; repeated names become arrays */
function collectData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (!(key in data)) data[key] = value;
    else data[key] = [].concat(data[key], value);
  });
  return data;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  t = await getPlaceholders();
  const nextId = createIdFactory(uniqueId('form-variations'));
  const editing = isInEditor(block);

  const form = document.createElement('form');
  form.className = 'form-variations-form';
  form.noValidate = true;

  const properties = [];
  let itemsStarted = false;
  [...block.children].forEach((row) => {
    const { type, cells } = readItem(row);
    if (!type) {
      if (!itemsStarted) properties.push(row.firstElementChild);
      return;
    }
    itemsStarted = true;
    const el = BUILDERS[type](cells, nextId);
    moveInstrumentation(row, el);
    if (editing && el.dataset.dependsOn) {
      const note = document.createElement('p');
      note.className = 'form-variations-condition';
      note.textContent = t('shownWhenValue', 'Shown when a dropdown value is "{value}"', { value: el.dataset.dependsOn });
      el.prepend(note);
    }
    form.append(el);
  });

  const [titleCell, descriptionCell] = properties;
  const header = document.createElement('div');
  header.className = 'form-variations-header';
  const title = titleCell ? buildHeading(titleCell, null, 'form-variations-title', 'h2') : null;
  if (title) header.append(title);
  if (descriptionCell && textOf(descriptionCell)) {
    header.append(fromCell(descriptionCell, 'div', 'form-variations-description'));
  }
  if (title) {
    title.id = nextId('title');
    form.setAttribute('aria-labelledby', title.id);
  }

  const status = document.createElement('p');
  status.className = 'form-variations-status';
  status.setAttribute('role', 'status');
  status.tabIndex = -1;

  form.addEventListener('change', (e) => {
    if (e.target.matches('select')) updateVisibility(form, editing);
  });
  // the required marker explained once (it's hidden from screen readers, the fields are required)
  if (form.querySelector('[required]')) {
    const note = document.createElement('p');
    note.className = 'form-variations-required-note';
    note.textContent = t('requiredNote', '* Required fields');
    form.prepend(note);
  }

  form.addEventListener('input', (e) => {
    status.textContent = '';
    if (e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity()) clearError(e.target);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = '';
    if (!validate(form)) return;
    const data = collectData(form);
    block.dispatchEvent(new CustomEvent('form-variations:submit', { bubbles: true, detail: { data } }));
    form.reset();
    form.querySelectorAll('textarea').forEach((textarea) => textarea.dispatchEvent(new Event('input')));
    updateVisibility(form, editing);
    status.textContent = t('formSuccess', 'Thank you, your details were sent.');
    // focus stays on the page (the submit button may be hidden by the reset)
    status.focus();
  });

  block.replaceChildren(...(header.children.length ? [header] : []), form, status);
  updateVisibility(form, editing);
}
