// Subscription Manager Module

async function loadSubscriptions() {
  const subscriptions = await db.getAll('subscriptions');
  const container = document.getElementById('subscriptionList');

  if (subscriptions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📱</div>
        <p>No subscriptions tracked yet</p>
        <button onclick="showAddSubscription()" class="btn btn-primary">Add Your First Subscription</button>
      </div>
    `;
    return;
  }

  container.innerHTML = subscriptions.map(sub => {
    const nextBilling = new Date(sub.nextBillingDate);
    const today = new Date();
    const daysUntil = Math.ceil((nextBilling - today) / (1000 * 60 * 60 * 24));

    return `
      <div class="item-card">
        <div class="item-header">
          <h3 class="item-title">${sub.name}</h3>
          <div class="item-actions">
            <button class="icon-btn" onclick="editSubscription(${sub.id})" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteSubscription(${sub.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          <div class="item-detail"><strong>Cost:</strong> ${formatCurrency(sub.cost, sub.currency)}</div>
          <div class="item-detail"><strong>Billing Cycle:</strong> ${sub.billingCycle}</div>
          <div class="item-detail"><strong>Next Billing:</strong> ${formatDate(sub.nextBillingDate)}</div>
          ${daysUntil <= 7 && daysUntil >= 0 ? `<div class="item-detail"><strong>Due in:</strong> ${daysUntil} days</div>` : ''}
          ${sub.category ? `<div class="item-detail"><strong>Category:</strong> ${sub.category}</div>` : ''}
          ${sub.notes ? `<div class="item-detail"><strong>Notes:</strong> ${sub.notes}</div>` : ''}
          <div class="item-detail">
            <span class="item-badge ${sub.active ? 'badge-active' : 'badge-inactive'}">
              ${sub.active ? 'Active' : 'Cancelled'}
            </span>
            ${daysUntil <= 7 && daysUntil >= 0 && sub.active ? '<span class="item-badge badge-upcoming">Due Soon</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateDashboard();
}

function showAddSubscription() {
  const form = `
    <form onsubmit="saveSubscription(event)">
      <div class="form-group">
        <label for="subName">Subscription Name *</label>
        <input type="text" id="subName" placeholder="e.g., Netflix, Spotify" required>
      </div>
      <div class="form-group">
        <label for="subCost">Cost *</label>
        <input type="number" id="subCost" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label for="subCurrency">Currency</label>
        <select id="subCurrency">
        <option value="NRs">NRs - NRs</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="INR">INR - Indian Rupee</option>
          <option value="JPY">JPY - Japanese Yen</option>
          <option value="AUD">AUD - Australian Dollar</option>
          <option value="CAD">CAD - Canadian Dollar</option>
        </select>
      </div>
      <div class="form-group">
        <label for="subBillingCycle">Billing Cycle *</label>
        <select id="subBillingCycle" required>
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Yearly">Yearly</option>
          <option value="Weekly">Weekly</option>
        </select>
      </div>
      ${createDateInput('subNextBilling', 'Next Billing Date *')}
      <div class="form-group">
        <label for="subCategory">Category</label>
        <select id="subCategory">
          <option value="">Select Category</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Software">Software</option>
          <option value="Cloud Storage">Cloud Storage</option>
          <option value="Fitness">Fitness</option>
          <option value="News">News</option>
          <option value="Music">Music</option>
          <option value="Gaming">Gaming</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="subNotes">Notes</label>
        <textarea id="subNotes" placeholder="Plan details, login info, etc."></textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="subActive" checked>
          Active subscription
        </label>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Subscription</button>
      </div>
    </form>
  `;

  openModal('Add Subscription', form);
}

async function saveSubscription(event) {
  event.preventDefault();

  const subscription = {
    name: document.getElementById('subName').value,
    cost: parseFloat(document.getElementById('subCost').value),
    currency: document.getElementById('subCurrency').value,
    billingCycle: document.getElementById('subBillingCycle').value,
    nextBillingDate: document.getElementById('subNextBilling').value,
    category: document.getElementById('subCategory').value,
    notes: document.getElementById('subNotes').value,
    active: document.getElementById('subActive').checked
  };

  const id = document.getElementById('subId')?.value;

  try {
    if (id) {
      subscription.id = parseInt(id);
      await db.update('subscriptions', subscription);
      showToast('Subscription updated successfully!');
    } else {
      await db.add('subscriptions', subscription);
      showToast('Subscription added successfully!');
    }

    closeModal();
    loadSubscriptions();
  } catch (error) {
    showToast('Error saving subscription: ' + error.message);
  }
}

async function editSubscription(id) {
  const sub = await db.get('subscriptions', id);

  const form = `
    <form onsubmit="saveSubscription(event)">
      <input type="hidden" id="subId" value="${sub.id}">
      <div class="form-group">
        <label for="subName">Subscription Name *</label>
        <input type="text" id="subName" value="${sub.name}" required>
      </div>
      <div class="form-group">
        <label for="subCost">Cost *</label>
        <input type="number" id="subCost" step="0.01" value="${sub.cost}" required>
      </div>
      <div class="form-group">
        <label for="subCurrency">Currency</label>
        <select id="subCurrency">
        <option value="NRs" ${sub.currency === 'NRs' ? 'selected' : ''}>NRs - Nepalese Rupee</option>
          <option value="USD" ${sub.currency === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
          <option value="EUR" ${sub.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
          <option value="GBP" ${sub.currency === 'GBP' ? 'selected' : ''}>GBP - British Pound</option>
          <option value="INR" ${sub.currency === 'INR' ? 'selected' : ''}>INR - Indian Rupee</option>
          <option value="JPY" ${sub.currency === 'JPY' ? 'selected' : ''}>JPY - Japanese Yen</option>
          <option value="AUD" ${sub.currency === 'AUD' ? 'selected' : ''}>AUD - Australian Dollar</option>
          <option value="CAD" ${sub.currency === 'CAD' ? 'selected' : ''}>CAD - Canadian Dollar</option>
        </select>
      </div>
      <div class="form-group">
        <label for="subBillingCycle">Billing Cycle *</label>
        <select id="subBillingCycle" required>
          <option value="Monthly" ${sub.billingCycle === 'Monthly' ? 'selected' : ''}>Monthly</option>
          <option value="Quarterly" ${sub.billingCycle === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
          <option value="Yearly" ${sub.billingCycle === 'Yearly' ? 'selected' : ''}>Yearly</option>
          <option value="Weekly" ${sub.billingCycle === 'Weekly' ? 'selected' : ''}>Weekly</option>
        </select>
      </div>
      ${createDateInput('subNextBilling', 'Next Billing Date *', sub.nextBillingDate)}
      <div class="form-group">
        <label for="subCategory">Category</label>
        <select id="subCategory">
          <option value="">Select Category</option>
          <option value="Entertainment" ${sub.category === 'Entertainment' ? 'selected' : ''}>Entertainment</option>
          <option value="Software" ${sub.category === 'Software' ? 'selected' : ''}>Software</option>
          <option value="Cloud Storage" ${sub.category === 'Cloud Storage' ? 'selected' : ''}>Cloud Storage</option>
          <option value="Fitness" ${sub.category === 'Fitness' ? 'selected' : ''}>Fitness</option>
          <option value="News" ${sub.category === 'News' ? 'selected' : ''}>News</option>
          <option value="Music" ${sub.category === 'Music' ? 'selected' : ''}>Music</option>
          <option value="Gaming" ${sub.category === 'Gaming' ? 'selected' : ''}>Gaming</option>
          <option value="Other" ${sub.category === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="subNotes">Notes</label>
        <textarea id="subNotes">${sub.notes || ''}</textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="subActive" ${sub.active ? 'checked' : ''}>
          Active subscription
        </label>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Subscription</button>
      </div>
    </form>
  `;

  openModal('Edit Subscription', form);
}

async function deleteSubscription(id) {
  if (confirmAction('Are you sure you want to delete this subscription?')) {
    await db.delete('subscriptions', id);
    showToast('Subscription deleted successfully!');
    loadSubscriptions();
  }
}
