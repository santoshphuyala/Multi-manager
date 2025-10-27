// Insurance Manager Module

async function loadInsurances() {
  const insurances = await db.getAll('insurances');
  const container = document.getElementById('insuranceList');

  if (insurances.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛡️</div>
        <p>No insurance policies tracked yet</p>
        <button onclick="showAddInsurance()" class="btn btn-primary">Add Your First Policy</button>
      </div>
    `;
    return;
  }

  container.innerHTML = insurances.map(ins => {
    const renewalDate = new Date(ins.renewalDate);
    const today = new Date();
    const daysUntil = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
    const isExpired = renewalDate < today;

    return `
      <div class="item-card">
        <div class="item-header">
          <h3 class="item-title">${ins.policyName}</h3>
          <div class="item-actions">
            <button class="icon-btn" onclick="editInsurance(${ins.id})" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteInsurance(${ins.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          <div class="item-detail"><strong>Provider:</strong> ${ins.provider}</div>
          <div class="item-detail"><strong>Type:</strong> ${ins.type}</div>
          <div class="item-detail"><strong>Policy Number:</strong> ${ins.policyNumber}</div>
          <div class="item-detail"><strong>Premium:</strong> ${formatCurrency(ins.premium, ins.currency)} / ${ins.paymentFrequency}</div>
          <div class="item-detail"><strong>Coverage:</strong> ${formatCurrency(ins.coverage, ins.currency)}</div>
          <div class="item-detail"><strong>Renewal Date:</strong> ${formatDate(ins.renewalDate)}</div>
          ${!isExpired && daysUntil <= 30 ? `<div class="item-detail"><strong>Renews in:</strong> ${daysUntil} days</div>` : ''}
          ${ins.beneficiary ? `<div class="item-detail"><strong>Beneficiary:</strong> ${ins.beneficiary}</div>` : ''}
          ${ins.notes ? `<div class="item-detail"><strong>Notes:</strong> ${ins.notes}</div>` : ''}
          <div class="item-detail">
            <span class="item-badge ${isExpired ? 'badge-expired' : daysUntil <= 30 ? 'badge-upcoming' : 'badge-active'}">
              ${isExpired ? 'Expired' : daysUntil <= 30 ? 'Renewal Soon' : 'Active'}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateDashboard();
}

function showAddInsurance() {
  const form = `
    <form onsubmit="saveInsurance(event)">
      <div class="form-group">
        <label for="insPolicyName">Policy Name *</label>
        <input type="text" id="insPolicyName" placeholder="e.g., Life Insurance Policy" required>
      </div>
      <div class="form-group">
        <label for="insProvider">Insurance Provider *</label>
        <input type="text" id="insProvider" placeholder="e.g., State Farm, Allstate" required>
      </div>
      <div class="form-group">
        <label for="insType">Insurance Type *</label>
        <select id="insType" required>
          <option value="">Select Type</option>
          <option value="Life">Life Insurance</option>
          <option value="Health">Health Insurance</option>
          <option value="Auto">Auto Insurance</option>
          <option value="Home">Home Insurance</option>
          <option value="Travel">Travel Insurance</option>
          <option value="Pet">Pet Insurance</option>
          <option value="Disability">Disability Insurance</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="insPolicyNumber">Policy Number *</label>
        <input type="text" id="insPolicyNumber" required>
      </div>
      <div class="form-group">
        <label for="insPremium">Premium Amount *</label>
        <input type="number" id="insPremium" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label for="insPaymentFreq">Payment Frequency *</label>
        <select id="insPaymentFreq" required>
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Semi-Annually">Semi-Annually</option>
          <option value="Annually">Annually</option>
        </select>
      </div>
      <div class="form-group">
        <label for="insCoverage">Coverage Amount *</label>
        <input type="number" id="insCoverage" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label for="insCurrency">Currency</label>
        <select id="insCurrency">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="INR">INR</option>
          <option value="JPY">JPY</option>
        </select>
      </div>
      ${createDateInput('insRenewalDate', 'Renewal Date *')}
      <div class="form-group">
        <label for="insBeneficiary">Beneficiary</label>
        <input type="text" id="insBeneficiary" placeholder="Name of beneficiary">
      </div>
      <div class="form-group">
        <label for="insNotes">Notes</label>
        <textarea id="insNotes" placeholder="Coverage details, exclusions, contacts..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Policy</button>
      </div>
    </form>
  `;

  openModal('Add Insurance Policy', form);
}

async function saveInsurance(event) {
  event.preventDefault();

  const insurance = {
    policyName: document.getElementById('insPolicyName').value,
    provider: document.getElementById('insProvider').value,
    type: document.getElementById('insType').value,
    policyNumber: document.getElementById('insPolicyNumber').value,
    premium: parseFloat(document.getElementById('insPremium').value),
    paymentFrequency: document.getElementById('insPaymentFreq').value,
    coverage: parseFloat(document.getElementById('insCoverage').value),
    currency: document.getElementById('insCurrency').value,
    renewalDate: document.getElementById('insRenewalDate').value,
    beneficiary: document.getElementById('insBeneficiary').value,
    notes: document.getElementById('insNotes').value
  };

  const id = document.getElementById('insId')?.value;

  try {
    if (id) {
      insurance.id = parseInt(id);
      await db.update('insurances', insurance);
      showToast('Insurance policy updated successfully!');
    } else {
      await db.add('insurances', insurance);
      showToast('Insurance policy added successfully!');
    }

    closeModal();
    loadInsurances();
  } catch (error) {
    showToast('Error saving insurance: ' + error.message);
  }
}

async function editInsurance(id) {
  const ins = await db.get('insurances', id);

  const form = `
    <form onsubmit="saveInsurance(event)">
      <input type="hidden" id="insId" value="${ins.id}">
      <div class="form-group">
        <label for="insPolicyName">Policy Name *</label>
        <input type="text" id="insPolicyName" value="${ins.policyName}" required>
      </div>
      <div class="form-group">
        <label for="insProvider">Insurance Provider *</label>
        <input type="text" id="insProvider" value="${ins.provider}" required>
      </div>
      <div class="form-group">
        <label for="insType">Insurance Type *</label>
        <select id="insType" required>
          <option value="">Select Type</option>
          <option value="Life" ${ins.type === 'Life' ? 'selected' : ''}>Life Insurance</option>
          <option value="Health" ${ins.type === 'Health' ? 'selected' : ''}>Health Insurance</option>
          <option value="Auto" ${ins.type === 'Auto' ? 'selected' : ''}>Auto Insurance</option>
          <option value="Home" ${ins.type === 'Home' ? 'selected' : ''}>Home Insurance</option>
          <option value="Travel" ${ins.type === 'Travel' ? 'selected' : ''}>Travel Insurance</option>
          <option value="Pet" ${ins.type === 'Pet' ? 'selected' : ''}>Pet Insurance</option>
          <option value="Disability" ${ins.type === 'Disability' ? 'selected' : ''}>Disability Insurance</option>
          <option value="Other" ${ins.type === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="insPolicyNumber">Policy Number *</label>
        <input type="text" id="insPolicyNumber" value="${ins.policyNumber}" required>
      </div>
      <div class="form-group">
        <label for="insPremium">Premium Amount *</label>
        <input type="number" id="insPremium" step="0.01" value="${ins.premium}" required>
      </div>
      <div class="form-group">
        <label for="insPaymentFreq">Payment Frequency *</label>
        <select id="insPaymentFreq" required>
          <option value="Monthly" ${ins.paymentFrequency === 'Monthly' ? 'selected' : ''}>Monthly</option>
          <option value="Quarterly" ${ins.paymentFrequency === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
          <option value="Semi-Annually" ${ins.paymentFrequency === 'Semi-Annually' ? 'selected' : ''}>Semi-Annually</option>
          <option value="Annually" ${ins.paymentFrequency === 'Annually' ? 'selected' : ''}>Annually</option>
        </select>
      </div>
      <div class="form-group">
        <label for="insCoverage">Coverage Amount *</label>
        <input type="number" id="insCoverage" step="0.01" value="${ins.coverage}" required>
      </div>
      <div class="form-group">
        <label for="insCurrency">Currency</label>
        <select id="insCurrency">
          <option value="USD" ${ins.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${ins.currency === 'EUR' ? 'selected' : ''}>EUR</option>
          <option value="GBP" ${ins.currency === 'GBP' ? 'selected' : ''}>GBP</option>
          <option value="INR" ${ins.currency === 'INR' ? 'selected' : ''}>INR</option>
          <option value="JPY" ${ins.currency === 'JPY' ? 'selected' : ''}>JPY</option>
        </select>
      </div>
      ${createDateInput('insRenewalDate', 'Renewal Date *', ins.renewalDate)}
      <div class="form-group">
        <label for="insBeneficiary">Beneficiary</label>
        <input type="text" id="insBeneficiary" value="${ins.beneficiary || ''}">
      </div>
      <div class="form-group">
        <label for="insNotes">Notes</label>
        <textarea id="insNotes">${ins.notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Policy</button>
      </div>
    </form>
  `;

  openModal('Edit Insurance Policy', form);
}

async function deleteInsurance(id) {
  if (confirmAction('Are you sure you want to delete this insurance policy?')) {
    await db.delete('insurances', id);
    showToast('Insurance policy deleted successfully!');
    loadInsurances();
  }
}