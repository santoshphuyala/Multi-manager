// Custom Tracker Module - Flexible User-Defined Categories

let activeCustomCategory = null;

async function loadCustomCategories() {
  const categories = await db.getAll('customCategories');
  const items = await db.getAll('customItems');
  const container = document.getElementById('customCategories');

  if (categories.length === 0) {
    container.innerHTML = `
      <div class="empty-category">
        <p>No custom categories created yet</p>
        <button onclick="showAddCustomCategory()" class="btn btn-primary">Create Your First Category</button>
      </div>
    `;
    document.getElementById('customItemList').innerHTML = '';
    return;
  }

  container.innerHTML = categories.map(cat => {
    const catItems = items.filter(item => item.categoryId === cat.id);
    return `
      <div class="category-card ${activeCustomCategory === cat.id ? 'active' : ''}" onclick="selectCategory(${cat.id})">
        <div class="category-actions">
          <button class="icon-btn" onclick="event.stopPropagation(); editCategory(${cat.id})" title="Edit">✏️</button>
          <button class="icon-btn" onclick="event.stopPropagation(); deleteCategory(${cat.id})" title="Delete">🗑️</button>
        </div>
        <div class="category-icon">${cat.icon || '📋'}</div>
        <div class="category-name">${cat.name}</div>
        <div class="category-count">${catItems.length} items</div>
      </div>
    `;
  }).join('');

  if (activeCustomCategory) {
    loadCustomItems(activeCustomCategory);
  } else if (categories.length > 0) {
    selectCategory(categories[0].id);
  }

  updateDashboard();
}

async function selectCategory(categoryId) {
  activeCustomCategory = categoryId;

  // Update UI
  document.querySelectorAll('.category-card').forEach(card => card.classList.remove('active'));
  const cards = document.querySelectorAll('.category-card');
  cards.forEach(card => {
    if (card.onclick && card.onclick.toString().includes(categoryId)) {
      card.classList.add('active');
    }
  });

  loadCustomItems(categoryId);
}

async function loadCustomItems(categoryId) {
  const category = await db.get('customCategories', categoryId);
  const allItems = await db.getAll('customItems');
  const items = allItems.filter(item => item.categoryId === categoryId);

  const container = document.getElementById('customItemList');

  if (!category) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${category.icon || '📋'}</div>
        <p>No items in ${category.name} yet</p>
        <button onclick="showAddCustomItem(${categoryId})" class="btn btn-primary">Add First Item</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="module-header">
      <h3>${category.name}</h3>
      <button onclick="showAddCustomItem(${categoryId})" class="btn btn-primary">+ Add Item</button>
    </div>
    ${items.map(item => `
      <div class="item-card">
        <div class="item-header">
          <h3 class="item-title">${item.title || 'Untitled'}</h3>
          <div class="item-actions">
            <button class="icon-btn" onclick="editCustomItem(${item.id})" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteCustomItem(${item.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          ${Object.keys(item.data || {}).map(key => `
            <div class="item-detail"><strong>${key}:</strong> ${formatCustomValue(item.data[key])}</div>
          `).join('')}
          ${item.createdAt ? `<div class="item-detail"><small>Created: ${formatDate(item.createdAt)}</small></div>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}

function formatCustomValue(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  // Check if it's a date
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  return value;
}

function showAddCustomCategory() {
  const form = `
    <form onsubmit="saveCustomCategory(event)">
      <div class="form-group">
        <label for="catName">Category Name *</label>
        <input type="text" id="catName" placeholder="e.g., Books, Plants, Collections" required>
      </div>
      <div class="form-group">
        <label for="catIcon">Icon (Emoji)</label>
        <input type="text" id="catIcon" placeholder="📚" maxlength="2">
        <small>Choose an emoji to represent this category</small>
      </div>
      <div class="form-group">
        <label for="catDescription">Description</label>
        <textarea id="catDescription" placeholder="What will you track in this category?"></textarea>
      </div>
      <div class="form-group">
        <label>Custom Fields</label>
        <small>Define what information you want to track</small>
        <div id="customFieldsList" class="participant-list" style="margin-top: 0.5rem;">
          <div class="participant-item">
            <input type="text" placeholder="Field Name" class="field-name" required>
            <select class="field-type">
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="textarea">Long Text</option>
              <option value="checkbox">Yes/No</option>
            </select>
            <button type="button" onclick="removeCustomField(this)" class="btn btn-danger">−</button>
          </div>
        </div>
        <button type="button" onclick="addCustomField()" class="btn btn-secondary">+ Add Field</button>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Category</button>
      </div>
    </form>
  `;

  openModal('Create Custom Category', form);
}

function addCustomField() {
  const list = document.getElementById('customFieldsList');
  const item = document.createElement('div');
  item.className = 'participant-item';
  item.innerHTML = `
    <input type="text" placeholder="Field Name" class="field-name" required>
    <select class="field-type">
      <option value="text">Text</option>
      <option value="number">Number</option>
      <option value="date">Date</option>
      <option value="textarea">Long Text</option>
      <option value="checkbox">Yes/No</option>
    </select>
    <button type="button" onclick="removeCustomField(this)" class="btn btn-danger">−</button>
  `;
  list.appendChild(item);
}

function removeCustomField(btn) {
  if (document.querySelectorAll('#customFieldsList .participant-item').length > 1) {
    btn.parentElement.remove();
  } else {
    showToast('At least one field is required');
  }
}

async function saveCustomCategory(event) {
  event.preventDefault();

  const fieldItems = document.querySelectorAll('#customFieldsList .participant-item');
  const fields = Array.from(fieldItems).map(item => ({
    name: item.querySelector('.field-name').value,
    type: item.querySelector('.field-type').value
  }));

  const category = {
    name: document.getElementById('catName').value,
    icon: document.getElementById('catIcon').value || '📋',
    description: document.getElementById('catDescription').value,
    fields: fields
  };

  const id = document.getElementById('catId')?.value;

  try {
    if (id) {
      category.id = parseInt(id);
      await db.update('customCategories', category);
      showToast('Category updated successfully!');
    } else {
      const newId = await db.add('customCategories', category);
      showToast('Category created successfully!');
      activeCustomCategory = newId;
    }

    closeModal();
    loadCustomCategories();
  } catch (error) {
    showToast('Error saving category: ' + error.message);
  }
}

async function showAddCustomItem(categoryId) {
  const category = await db.get('customCategories', categoryId);

  let formFields = '';
  category.fields.forEach(field => {
    const fieldId = `field_${field.name.replace(/\s+/g, '_')}`;
    switch (field.type) {
      case 'text':
        formFields += `
          <div class="form-group">
            <label for="${fieldId}">${field.name}</label>
            <input type="text" id="${fieldId}" data-field-name="${field.name}">
          </div>
        `;
        break;
      case 'number':
        formFields += `
          <div class="form-group">
            <label for="${fieldId}">${field.name}</label>
            <input type="number" id="${fieldId}" data-field-name="${field.name}" step="any">
          </div>
        `;
        break;
      case 'date':
        formFields += createDateInput(fieldId, field.name).replace('</div>', `data-field-name="${field.name}"></div>`);
        break;
      case 'textarea':
        formFields += `
          <div class="form-group">
            <label for="${fieldId}">${field.name}</label>
            <textarea id="${fieldId}" data-field-name="${field.name}"></textarea>
          </div>
        `;
        break;
      case 'checkbox':
        formFields += `
          <div class="form-group">
            <label>
              <input type="checkbox" id="${fieldId}" data-field-name="${field.name}">
              ${field.name}
            </label>
          </div>
        `;
        break;
    }
  });

  const form = `
    <form onsubmit="saveCustomItem(event, ${categoryId})">
      <div class="form-group">
        <label for="itemTitle">Title *</label>
        <input type="text" id="itemTitle" placeholder="Item name/title" required>
      </div>
      ${formFields}
      <div class="form-actions">
        <button type="button" onclick="closeModal(); loadCustomItems(${categoryId})" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Item</button>
      </div>
    </form>
  `;

  openModal(`Add ${category.name} Item`, form);
}

async function saveCustomItem(event, categoryId) {
  event.preventDefault();

  const category = await db.get('customCategories', categoryId);
  const data = {};

  category.fields.forEach(field => {
    const fieldId = `field_${field.name.replace(/\s+/g, '_')}`;
    const input = document.getElementById(fieldId) ||
                 document.querySelector(`[data-field-name="${field.name}"]`);

    if (input) {
      if (field.type === 'checkbox') {
        data[field.name] = input.checked;
      } else if (field.type === 'number') {
        data[field.name] = input.value ? parseFloat(input.value) : null;
      } else {
        data[field.name] = input.value;
      }
    }
  });

  const item = {
    categoryId: categoryId,
    title: document.getElementById('itemTitle').value,
    data: data
  };

  const id = document.getElementById('itemId')?.value;

  try {
    if (id) {
      item.id = parseInt(id);
      await db.update('customItems', item);
      showToast('Item updated successfully!');
    } else {
      await db.add('customItems', item);
      showToast('Item added successfully!');
    }

    closeModal();
    loadCustomCategories();
  } catch (error) {
    showToast('Error saving item: ' + error.message);
  }
}

async function editCategory(id) {
  const category = await db.get('customCategories', id);

  const form = `
    <form onsubmit="saveCustomCategory(event)">
      <input type="hidden" id="catId" value="${category.id}">
      <div class="form-group">
        <label for="catName">Category Name *</label>
        <input type="text" id="catName" value="${category.name}" required>
      </div>
      <div class="form-group">
        <label for="catIcon">Icon (Emoji)</label>
        <input type="text" id="catIcon" value="${category.icon}" maxlength="2">
      </div>
      <div class="form-group">
        <label for="catDescription">Description</label>
        <textarea id="catDescription">${category.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Custom Fields</label>
        <div id="customFieldsList" class="participant-list" style="margin-top: 0.5rem;">
          ${category.fields.map(field => `
            <div class="participant-item">
              <input type="text" placeholder="Field Name" class="field-name" value="${field.name}" required>
              <select class="field-type">
                <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
                <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
                <option value="date" ${field.type === 'date' ? 'selected' : ''}>Date</option>
                <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Long Text</option>
                <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>Yes/No</option>
              </select>
              <button type="button" onclick="removeCustomField(this)" class="btn btn-danger">−</button>
            </div>
          `).join('')}
        </div>
        <button type="button" onclick="addCustomField()" class="btn btn-secondary">+ Add Field</button>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Category</button>
      </div>
    </form>
  `;

  openModal('Edit Category', form);
}

async function deleteCategory(id) {
  if (confirmAction('Delete this category and all its items?')) {
    const items = await db.getAll('customItems');
    const categoryItems = items.filter(item => item.categoryId === id);

    // Delete all items in category
    for (const item of categoryItems) {
      await db.delete('customItems', item.id);
    }

    await db.delete('customCategories', id);
    showToast('Category deleted successfully!');
    activeCustomCategory = null;
    loadCustomCategories();
  }
}

async function editCustomItem(id) {
  const item = await db.get('customItems', id);
  const category = await db.get('customCategories', item.categoryId);

  let formFields = '';
  category.fields.forEach(field => {
    const value = item.data[field.name];
    const fieldId = `field_${field.name.replace(/\s+/g, '_')}`;

    switch (field.type) {
      case 'text':
        formFields += `
          <div class="form-group">
            <label for="${fieldId}">${field.name}</label>
            <input type="text" id="${fieldId}" data-field-name="${field.name}" value="${value || ''}">
          </div>
        `;
        break;
      case 'number':
        formFields += `
          <div class="form-group">
            <label for="${fieldId}">${field.name}</label>
            <input type="number" id="${fieldId}" data-field-name="${field.name}" value="${value || ''}" step="any">
          </div>
        `;
        break;
      case 'date':
        formFields += createDateInput(fieldId, field.name, value || '').replace('</div>', `data-field-name="${field.name}"></div>`);
        break;
      case 'textarea':
        formFields += `
          <div class="form-group">
            <label for="${fieldId}">${field.name}</label>
            <textarea id="${fieldId}" data-field-name="${field.name}">${value || ''}</textarea>
          </div>
        `;
        break;
      case 'checkbox':
        formFields += `
          <div class="form-group">
            <label>
              <input type="checkbox" id="${fieldId}" data-field-name="${field.name}" ${value ? 'checked' : ''}>
              ${field.name}
            </label>
          </div>
        `;
        break;
    }
  });

  const form = `
    <form onsubmit="saveCustomItem(event, ${item.categoryId})">
      <input type="hidden" id="itemId" value="${item.id}">
      <div class="form-group">
        <label for="itemTitle">Title *</label>
        <input type="text" id="itemTitle" value="${item.title}" required>
      </div>
      ${formFields}
      <div class="form-actions">
        <button type="button" onclick="closeModal(); loadCustomItems(${item.categoryId})" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Item</button>
      </div>
    </form>
  `;

  openModal(`Edit ${category.name} Item`, form);
}

async function deleteCustomItem(id) {
  const item = await db.get('customItems', id);
  if (confirmAction('Are you sure you want to delete this item?')) {
    await db.delete('customItems', id);
    showToast('Item deleted successfully!');
    loadCustomItems(item.categoryId);
  }
}