import { moveInstrumentation } from '../../scripts/scripts.js';

/* Item models from _form-variations.json */
const FIELD_TYPES = [
  'field-text',
  'field-select',
  'field-textarea',
  'field-checkbox',
  'contact-card',
  'field-submit',
];
const INPUT_TYPES = ['text', 'email', 'tel'];
const DEFAULT_MAX_LENGTH = 1500;

const isBoolText = (value) => value === 'true' || value === 'false';
const cellText = (cell) => cell?.textContent?.trim() || '';
const splitList = (value) => value.split(',').map((v) => v.trim()).filter(Boolean);

/**
 * Detects the item model of a row.
 * In Universal Editor the row carries data-aue-model; on published pages only the
 * cell values are present, so the type is derived from the field order and values
 * defined in _form-variations.json.
 * Legacy content may have the model id authored in the first cell.
 * @returns {{ type: string, offset: number } | null}
 */
function detectFieldType(row, cells) {
  const model = row.dataset.aueModel || row.dataset.model || '';
  if (FIELD_TYPES.includes(model)) return { type: model, offset: 0 };

  const first = cellText(cells[0]);
  if (FIELD_TYPES.includes(first)) return { type: first, offset: 1 };

  const value = (idx) => cellText(cells[idx]).toLowerCase();

  switch (cells.length) {
    // field-text: name, label, type, required, dependsOn
    // field-select: name, label, required, options, dependsOn
    // field-textarea: name, label, maxLength, required, dependsOn
    case 5:
      if (INPUT_TYPES.includes(value(2))) return { type: 'field-text', offset: 0 };
      if (/^\d+$/.test(value(2))) return { type: 'field-textarea', offset: 0 };
      if (isBoolText(value(2))) return { type: 'field-select', offset: 0 };
      if (value(3) && !isBoolText(value(3))) return { type: 'field-select', offset: 0 };
      return { type: 'field-text', offset: 0 };
    // field-checkbox: name, label (richtext), required, dependsOn
    // contact-card: region, contactName, emails, phones
    case 4:
      if (cells[1]?.querySelector('p, ul, ol, div') || isBoolText(value(2))) {
        return { type: 'field-checkbox', offset: 0 };
      }
      return { type: 'contact-card', offset: 0 };
    // field-submit: label, dependsOn
    case 2:
      return { type: 'field-submit', offset: 0 };
    default:
      return null;
  }
}

/* Helper: Handle Dynamic Conditional Field Display (Case 1 Support) */
function updateVisibility(form) {
  const selects = form.querySelectorAll('select');
  const activeValues = {};
  selects.forEach((sel) => {
    if (sel.name) activeValues[sel.name] = sel.value;
  });

  const conditionalElements = form.querySelectorAll('[data-depends-on]');
  conditionalElements.forEach((el) => {
    const dependency = el.dataset.dependsOn ? el.dataset.dependsOn.trim() : '';
    if (!dependency) return;

    // Show if any dropdown's active selection matches the field's dependency
    const isVisible = Object.values(activeValues).includes(dependency);
    el.classList.toggle('hidden-field', !isVisible);
    el.querySelectorAll('input, select, textarea, button').forEach((input) => {
      // hidden controls are disabled so they are neither validated nor submitted
      input.disabled = !isVisible;
      if (isVisible) {
        if (input.dataset.wasRequired === 'true') input.required = true;
      } else if (input.required) {
        input.dataset.wasRequired = 'true';
        input.required = false;
      }
    });
  });
}

function createLabel(fieldId, labelText, isReq) {
  const label = document.createElement('label');
  label.setAttribute('for', fieldId);
  label.textContent = `${labelText}${isReq ? '*' : ''}`;
  return label;
}

function createGroup(classes, dependsOn) {
  const group = document.createElement('div');
  group.className = `form-variations-group ${classes}`;
  if (dependsOn) group.dataset.dependsOn = dependsOn;
  return group;
}

/* Helper: Build Dynamic Contact Profile Output */
function createContactCard(region, name, emails, phones) {
  const card = document.createElement('div');
  card.className = 'form-variations-contact-card hidden-field';
  card.dataset.dependsOn = region;

  const nameEl = document.createElement('div');
  nameEl.className = 'contact-name';
  nameEl.textContent = name;

  const details = document.createElement('div');
  details.className = 'contact-details';

  const addLink = (className, href, text) => {
    const wrapper = document.createElement('div');
    wrapper.className = `contact-link ${className}`;
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    wrapper.append(a);
    details.append(wrapper);
  };

  splitList(emails).forEach((email) => {
    addLink('email-link', `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}`, email);
  });

  splitList(phones).forEach((phone) => {
    const tel = phone.replace(/[^\d+]/g, '');
    if (tel) addLink('phone-link', `tel:${tel}`, phone);
  });

  card.append(nameEl, details);
  return card;
}

/* Helper: Build the checkbox label from the authored richtext cell */
function createCheckboxLabel(fieldId, labelCell, isReq) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = fieldId;
  input.name = fieldId;
  input.required = isReq;

  const blocks = labelCell ? [...labelCell.children].filter((el) => el.matches('p, ul, ol, div, h1, h2, h3, h4, h5, h6')) : [];

  // single paragraph or inline content: <label><input><span>…</span></label>
  if (blocks.length <= 1) {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    const span = document.createElement('span');
    span.className = 'label-text';
    const source = blocks[0] || labelCell;
    if (source) span.append(...source.childNodes);
    if (labelCell) moveInstrumentation(labelCell, span);
    if (isReq) span.append(' *');
    label.append(input, span);
    return label;
  }

  // block-level richtext cannot live inside <label>/<span>: keep the authored
  // nodes in a <div> and associate it with the checkbox via aria-labelledby
  const wrapper = document.createElement('div');
  wrapper.className = 'checkbox-label';
  const text = document.createElement('div');
  text.className = 'label-text';
  text.id = `${fieldId}-label`;
  text.append(...labelCell.childNodes);
  moveInstrumentation(labelCell, text);
  if (isReq) {
    const last = text.lastElementChild;
    (last?.matches('p') ? last : text).append(' *');
  }
  input.setAttribute('aria-labelledby', text.id);
  wrapper.append(input, text);
  return wrapper;
}

function buildField(type, cells, offset) {
  const getCellText = (idx) => cellText(cells[offset + idx]);
  const isTrue = (idx) => getCellText(idx).toLowerCase() === 'true';

  switch (type) {
    case 'field-text': {
      const fieldId = getCellText(0) || 'text-input';
      const inputTypeText = getCellText(2).toLowerCase();
      const isReq = isTrue(3);
      const group = createGroup(fieldId.toLowerCase().includes('name') ? 'half-width' : 'full-width', getCellText(4));
      const input = document.createElement('input');
      input.type = INPUT_TYPES.includes(inputTypeText) ? inputTypeText : 'text';
      input.id = fieldId;
      input.name = fieldId;
      input.required = isReq;
      group.append(createLabel(fieldId, getCellText(1), isReq), input);
      return group;
    }
    case 'field-select': {
      const fieldId = getCellText(0) || 'select-input';
      const isReq = isTrue(2);
      const group = createGroup('full-width', getCellText(4));
      const select = document.createElement('select');
      select.id = fieldId;
      select.name = fieldId;
      select.required = isReq;
      const placeholder = new Option('Select an option', '', true, true);
      placeholder.disabled = true;
      select.append(placeholder);
      splitList(getCellText(3)).forEach((opt) => select.append(new Option(opt, opt)));
      group.append(createLabel(fieldId, getCellText(1), isReq), select);
      return group;
    }
    case 'field-textarea': {
      const fieldId = getCellText(0) || 'textarea-input';
      const isReq = isTrue(3);
      const maxLength = parseInt(getCellText(2), 10);
      const limit = maxLength > 0 ? maxLength : DEFAULT_MAX_LENGTH;
      const group = createGroup('full-width textarea-group', getCellText(4));
      const textarea = document.createElement('textarea');
      textarea.id = fieldId;
      textarea.name = fieldId;
      textarea.maxLength = limit;
      textarea.required = isReq;
      const counter = document.createElement('span');
      counter.className = 'char-counter';
      counter.setAttribute('aria-live', 'polite');
      counter.textContent = `(0/${limit})`;
      textarea.addEventListener('input', () => {
        counter.textContent = `(${textarea.value.length}/${limit})`;
      });
      group.append(createLabel(fieldId, getCellText(1), isReq), textarea, counter);
      return group;
    }
    case 'field-checkbox': {
      const fieldId = getCellText(0) || 'checkbox-input';
      const group = createGroup('full-width checkbox-group', getCellText(3));
      group.append(createCheckboxLabel(fieldId, cells[offset + 1], isTrue(2)));
      return group;
    }
    case 'contact-card':
      return createContactCard(getCellText(0), getCellText(1), getCellText(2), getCellText(3));
    case 'field-submit': {
      const group = createGroup('full-width submit-group', getCellText(1));
      const button = document.createElement('button');
      button.type = 'submit';
      button.className = 'button primary submit-btn';
      button.textContent = getCellText(0) || 'Send';
      group.append(button);
      return group;
    }
    default:
      return null;
  }
}

export default function decorate(block) {
  const form = document.createElement('form');
  form.className = 'form-variations-form';
  const header = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const detected = detectFieldType(row, cells);

    if (!detected) {
      // block-level fields (formTitle, formDescription) render as single-cell rows
      if (cells.length === 1) header.push(cells[0]);
      return;
    }

    const field = buildField(detected.type, cells, detected.offset);
    if (field) {
      moveInstrumentation(row, field);
      form.append(field);
    }
  });

  const status = document.createElement('p');
  status.className = 'form-variations-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  form.addEventListener('change', () => updateVisibility(form));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    // no submit endpoint is authorable in the block model: confirm inline
    form.reset();
    form.querySelectorAll('textarea').forEach((t) => t.dispatchEvent(new Event('input')));
    updateVisibility(form);
    status.textContent = 'Thank you. Your submission has been received.';
  });
  form.addEventListener('input', () => {
    if (status.textContent) status.textContent = '';
  });

  // formTitle is the first single-cell row, formDescription the second
  const intro = header.slice(0, 2).map((cell, idx) => {
    if (!cellText(cell) && !cell.dataset.aueProp) return null;
    const el = document.createElement(idx === 0 ? 'h2' : 'div');
    el.className = idx === 0 ? 'form-variations-title' : 'form-variations-description';
    if (idx === 0) el.textContent = cellText(cell);
    else el.append(...cell.childNodes);
    moveInstrumentation(cell, el);
    return el;
  }).filter(Boolean);

  block.replaceChildren(...intro, form, status);
  updateVisibility(form);
}
