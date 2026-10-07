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
    if (isVisible) {
      el.classList.remove('hidden-field');
      el.querySelectorAll('input, select, textarea').forEach((input) => {
        if (input.dataset.wasRequired === 'true') input.required = true;
      });
    } else {
      el.classList.add('hidden-field');
      el.querySelectorAll('input, select, textarea').forEach((input) => {
        if (input.required) {
          input.dataset.wasRequired = 'true';
          input.required = false;
        }
      });
    }
  });
}

/* Helper: Build Dynamic Contact Profile Output */
function createContactCard(region, name, emails, phones) {
  const card = document.createElement('div');
  card.className = 'form-variations-contact-card hidden-field';
  card.dataset.dependsOn = region;

  let html = `<div class="contact-name">${name}</div><div class="contact-details">`;

  if (emails) {
    emails.split(',').forEach((email) => {
      const cleanEmail = email.trim();
      if (cleanEmail) {
        html += `<div class="contact-link email-link">
          <a href="mailto:${cleanEmail}">${cleanEmail}</a>
        </div>`;
      }
    });
  }

  if (phones) {
    phones.split(',').forEach((phone) => {
      const cleanPhone = phone.trim();
      if (cleanPhone) {
        html += `<div class="contact-link phone-link">
          <a href="tel:${cleanPhone.replace(/\s+/g, '')}">${cleanPhone}</a>
        </div>`;
      }
    });
  }

  html += '</div>';
  card.innerHTML = html;
  return card;
}

export default function decorate(block) {
  const formWrapper = document.createElement('form');
  formWrapper.className = 'form-variations-container';
  formWrapper.setAttribute('novalidate', '');

  const children = [...block.children];

  children.forEach((row) => {
    // Handle Universal Editor / Franklin serialization models safely
    const type = row.dataset.model || row.getAttribute('data-aue-model') || '';
    const cells = [...row.children];

    // Read properties from child row cells
    const getCellText = (idx) => cells[idx]?.textContent?.trim() || '';
    const getCellHtml = (idx) => cells[idx]?.innerHTML?.trim() || '';

    if (type === 'field-text' || cells[0]?.textContent?.trim() === 'field-text') {
      const offset = type ? 0 : 1;
      const fieldId = getCellText(offset + 0) || 'text-input';
      const labelText = getCellText(offset + 1) || '';
      const inputType = getCellText(offset + 2) || 'text';
      const required = getCellText(offset + 3);
      const dependsOn = getCellText(offset + 4);
      const isReq = required?.toLowerCase() === 'true';

      const group = document.createElement('div');
      group.className = `form-variations-group ${fieldId.toLowerCase().includes('name') ? 'half-width' : 'full-width'}`;
      if (dependsOn) group.dataset.dependsOn = dependsOn;

      group.innerHTML = `
        <label for="${fieldId}">${labelText}${isReq ? '*' : ''}</label>
        <input type="${inputType}" id="${fieldId}" name="${fieldId}" ${isReq ? 'required' : ''} />
      `;
      formWrapper.appendChild(group);
    } else if (type === 'field-select' || cells[0]?.textContent?.trim() === 'field-select') {
      const offset = type ? 0 : 1;
      const fieldId = getCellText(offset + 0) || 'select-input';
      const labelText = getCellText(offset + 1) || '';
      const required = getCellText(offset + 2);
      const optionsStr = getCellText(offset + 3) || '';
      const dependsOn = getCellText(offset + 4);
      const isReq = required?.toLowerCase() === 'true';

      const group = document.createElement('div');
      group.className = 'form-variations-group full-width';
      if (dependsOn) group.dataset.dependsOn = dependsOn;

      const options = optionsStr ? optionsStr.split(',').map((opt) => `<option value="${opt.trim()}">${opt.trim()}</option>`).join('') : '';

      group.innerHTML = `
        <label for="${fieldId}">${labelText}${isReq ? '*' : ''}</label>
        <select id="${fieldId}" name="${fieldId}" ${isReq ? 'required' : ''}>
          <option value="" disabled selected>Select an option</option>
          ${options}
        </select>
      `;
      formWrapper.appendChild(group);
    } else if (type === 'field-textarea' || cells[0]?.textContent?.trim() === 'field-textarea') {
      const offset = type ? 0 : 1;
      const fieldId = getCellText(offset + 0) || 'textarea-input';
      const labelText = getCellText(offset + 1) || '';
      const maxLen = getCellText(offset + 2);
      const required = getCellText(offset + 3);
      const dependsOn = getCellText(offset + 4);
      const isReq = required?.toLowerCase() === 'true';
      const limit = maxLen || 1500;

      const group = document.createElement('div');
      group.className = 'form-variations-group full-width textarea-group';
      if (dependsOn) group.dataset.dependsOn = dependsOn;

      group.innerHTML = `
        <label for="${fieldId}">${labelText}${isReq ? '*' : ''}</label>
        <textarea id="${fieldId}" name="${fieldId}" maxlength="${limit}" ${isReq ? 'required' : ''}></textarea>
        <span class="char-counter">(0/${limit})</span>
      `;

      const textarea = group.querySelector('textarea');
      const counter = group.querySelector('.char-counter');
      if (textarea && counter) {
        textarea.addEventListener('input', () => {
          counter.textContent = `(${textarea.value.length}/${limit})`;
        });
      }

      formWrapper.appendChild(group);
    } else if (type === 'field-checkbox' || cells[0]?.textContent?.trim() === 'field-checkbox') {
      const offset = type ? 0 : 1;
      const fieldId = getCellText(offset + 0) || 'checkbox-input';
      const labelHtml = getCellHtml(offset + 1) || '';
      const required = getCellText(offset + 2);
      const dependsOn = getCellText(offset + 3);
      const isReq = required?.toLowerCase() === 'true';

      const group = document.createElement('div');
      group.className = 'form-variations-group full-width checkbox-group';
      if (dependsOn) group.dataset.dependsOn = dependsOn;

      group.innerHTML = `
        <label class="checkbox-label">
          <input type="checkbox" id="${fieldId}" name="${fieldId}" ${isReq ? 'required' : ''} />
          <span class="label-text">${labelHtml} ${isReq ? '*' : ''}</span>
        </label>
      `;
      formWrapper.appendChild(group);
    } else if (type === 'contact-card' || cells[0]?.textContent?.trim() === 'contact-card') {
      const offset = type ? 0 : 1;
      const region = getCellText(offset + 0);
      const name = getCellText(offset + 1);
      const emails = getCellText(offset + 2);
      const phones = getCellText(offset + 3);

      const card = createContactCard(region, name, emails, phones);
      formWrapper.appendChild(card);
    } else if (type === 'field-submit' || cells[0]?.textContent?.trim() === 'field-submit') {
      const offset = type ? 0 : 1;
      const btnLabel = getCellText(offset + 0) || 'Send';
      const dependsOn = getCellText(offset + 1);

      const group = document.createElement('div');
      group.className = 'form-variations-group full-width submit-group';
      if (dependsOn) group.dataset.dependsOn = dependsOn;

      group.innerHTML = `<button type="submit" class="button primary submit-btn">${btnLabel}</button>`;
      formWrapper.appendChild(group);
    }
  });

  formWrapper.addEventListener('change', () => updateVisibility(formWrapper));

  block.textContent = '';
  block.appendChild(formWrapper);

  updateVisibility(formWrapper);
}
