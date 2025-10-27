// Medicine Tracker Module

async function loadMedicines() {
  const medicines = await db.getAll('medicines');
  const container = document.getElementById('medicineList');

  if (medicines.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💊</div>
        <p>No medicines tracked yet</p>
        <button onclick="showAddMedicine()" class="btn btn-primary">Add Your First Medicine</button>
      </div>
    `;
    return;
  }

  container.innerHTML = medicines.map(med => `
    <div class="item-card">
      <div class="item-header">
        <h3 class="item-title">${med.name}</h3>
        <div class="item-actions">
          <button class="icon-btn" onclick="editMedicine(${med.id})" title="Edit">✏️</button>
          <button class="icon-btn" onclick="deleteMedicine(${med.id})" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="item-details">
        <div class="item-detail"><strong>Dosage:</strong> ${med.dosage}</div>
        <div class="item-detail"><strong>Frequency:</strong> ${med.frequency}</div>
        <div class="item-detail"><strong>Start Date:</strong> ${formatDate(med.startDate)}</div>
        ${med.endDate ? `<div class="item-detail"><strong>End Date:</strong> ${formatDate(med.endDate)}</div>` : ''}
        ${med.notes ? `<div class="item-detail"><strong>Notes:</strong> ${med.notes}</div>` : ''}
        <div class="item-detail">
          <span class="item-badge ${med.active ? 'badge-active' : 'badge-inactive'}">
            ${med.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  `).join('');

  updateDashboard();
}

function showAddMedicine() {
  const form = `
    <form onsubmit="saveMedicine(event)">
      <div class="form-group">
        <label for="medName">Medicine Name *</label>
        <input type="text" id="medName" required>
      </div>
      <div class="form-group">
        <label for="medDosage">Dosage *</label>
        <input type="text" id="medDosage" placeholder="e.g., 500mg" required>
      </div>
      <div class="form-group">
        <label for="medFrequency">Frequency *</label>
        <select id="medFrequency" required>
          <option value="Once daily">Once daily</option>
          <option value="Twice daily">Twice daily</option>
          <option value="Three times daily">Three times daily</option>
          <option value="Every 4 hours">Every 4 hours</option>
          <option value="Every 6 hours">Every 6 hours</option>
          <option value="Every 8 hours">Every 8 hours</option>
          <option value="As needed">As needed</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>
      </div>
      ${createDateInput('medStartDate', 'Start Date *')}
      ${createDateInput('medEndDate', 'End Date (Optional)')}
      <div class="form-group">
        <label for="medNotes">Notes</label>
        <textarea id="medNotes" placeholder="Additional information..."></textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="medActive" checked>
          Currently taking this medicine
        </label>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Medicine</button>
      </div>
    </form>
  `;

  openModal('Add Medicine', form);
}

async function saveMedicine(event) {
  event.preventDefault();

  const medicine = {
    name: document.getElementById('medName').value,
    dosage: document.getElementById('medDosage').value,
    frequency: document.getElementById('medFrequency').value,
    startDate: document.getElementById('medStartDate').value,
    endDate: document.getElementById('medEndDate').value || null,
    notes: document.getElementById('medNotes').value,
    active: document.getElementById('medActive').checked
  };

  const id = document.getElementById('medId')?.value;

  try {
    if (id) {
      medicine.id = parseInt(id);
      await db.update('medicines', medicine);
      showToast('Medicine updated successfully!');
    } else {
      await db.add('medicines', medicine);
      showToast('Medicine added successfully!');
    }

    closeModal();
    loadMedicines();
  } catch (error) {
    showToast('Error saving medicine: ' + error.message);
  }
}

async function editMedicine(id) {
  const medicine = await db.get('medicines', id);

  const form = `
    <form onsubmit="saveMedicine(event)">
      <input type="hidden" id="medId" value="${medicine.id}">
      <div class="form-group">
        <label for="medName">Medicine Name *</label>
        <input type="text" id="medName" value="${medicine.name}" required>
      </div>
      <div class="form-group">
        <label for="medDosage">Dosage *</label>
        <input type="text" id="medDosage" value="${medicine.dosage}" required>
      </div>
      <div class="form-group">
        <label for="medFrequency">Frequency *</label>
        <select id="medFrequency" required>
          <option value="Once daily" ${medicine.frequency === 'Once daily' ? 'selected' : ''}>Once daily</option>
          <option value="Twice daily" ${medicine.frequency === 'Twice daily' ? 'selected' : ''}>Twice daily</option>
          <option value="Three times daily" ${medicine.frequency === 'Three times daily' ? 'selected' : ''}>Three times daily</option>
          <option value="Every 4 hours" ${medicine.frequency === 'Every 4 hours' ? 'selected' : ''}>Every 4 hours</option>
          <option value="Every 6 hours" ${medicine.frequency === 'Every 6 hours' ? 'selected' : ''}>Every 6 hours</option>
          <option value="Every 8 hours" ${medicine.frequency === 'Every 8 hours' ? 'selected' : ''}>Every 8 hours</option>
          <option value="As needed" ${medicine.frequency === 'As needed' ? 'selected' : ''}>As needed</option>
          <option value="Weekly" ${medicine.frequency === 'Weekly' ? 'selected' : ''}>Weekly</option>
          <option value="Monthly" ${medicine.frequency === 'Monthly' ? 'selected' : ''}>Monthly</option>
        </select>
      </div>
      ${createDateInput('medStartDate', 'Start Date *', medicine.startDate)}
      ${createDateInput('medEndDate', 'End Date (Optional)', medicine.endDate || '')}
      <div class="form-group">
        <label for="medNotes">Notes</label>
        <textarea id="medNotes">${medicine.notes || ''}</textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="medActive" ${medicine.active ? 'checked' : ''}>
          Currently taking this medicine
        </label>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Medicine</button>
      </div>
    </form>
  `;

  openModal('Edit Medicine', form);
}

async function deleteMedicine(id) {
  if (confirmAction('Are you sure you want to delete this medicine?')) {
    await db.delete('medicines', id);
    showToast('Medicine deleted successfully!');
    loadMedicines();
  }
}