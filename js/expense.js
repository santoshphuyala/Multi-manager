// Expense Splitter Module

async function loadExpenses() {
  const expenses = await db.getAll('expenses');
  const container = document.getElementById('expenseList');

  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💰</div>
        <p>No expenses to split yet</p>
        <button onclick="showAddExpense()" class="btn btn-primary">Add Your First Expense</button>
      </div>
    `;
    return;
  }

  container.innerHTML = expenses.map(exp => {
    const perPerson = exp.splitType === 'equal'
      ? exp.amount / exp.participants.length
      : 0;

    return `
      <div class="item-card">
        <div class="item-header">
          <h3 class="item-title">${exp.description}</h3>
          <div class="item-actions">
            <button class="icon-btn" onclick="viewExpenseDetails(${exp.id})" title="View Details">👁️</button>
            <button class="icon-btn" onclick="editExpense(${exp.id})" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteExpense(${exp.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          <div class="item-detail"><strong>Total Amount:</strong> ${formatCurrency(exp.amount, exp.currency)}</div>
          <div class="item-detail"><strong>Split Type:</strong> ${exp.splitType === 'equal' ? 'Equal' : 'Custom'}</div>
          <div class="item-detail"><strong>Participants:</strong> ${exp.participants.length}</div>
          ${exp.splitType === 'equal' ? `<div class="item-detail"><strong>Per Person:</strong> ${formatCurrency(perPerson, exp.currency)}</div>` : ''}
          <div class="item-detail"><strong>Date:</strong> ${formatDate(exp.date)}</div>
          <div class="item-detail">
            <span class="item-badge ${exp.settled ? 'badge-active' : 'badge-warning'}">
              ${exp.settled ? 'Settled' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateDashboard();
}

function showAddExpense() {
  const form = `
    <form onsubmit="saveExpense(event)">
      <div class="form-group">
        <label for="expDescription">Description *</label>
        <input type="text" id="expDescription" placeholder="e.g., Dinner at restaurant" required>
      </div>
      <div class="form-group">
        <label for="expAmount">Total Amount *</label>
        <input type="number" id="expAmount" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label for="expCurrency">Currency</label>
        <select id="expCurrency">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="INR">INR</option>
          <option value="JPY">JPY</option>
        </select>
      </div>
      ${createDateInput('expDate', 'Date *', new Date().toISOString().split('T')[0])}
      <div class="form-group">
        <label for="expSplitType">Split Type *</label>
        <select id="expSplitType" onchange="toggleSplitType()" required>
          <option value="equal">Equal Split</option>
          <option value="custom">Custom Split</option>
        </select>
      </div>
      <div class="form-group">
        <label>Participants</label>
        <div id="participantsList" class="participant-list">
          <div class="participant-item">
            <input type="text" placeholder="Name" class="participant-name" required>
            <input type="number" placeholder="Paid" step="0.01" class="participant-paid" value="0">
            <input type="number" placeholder="Share" step="0.01" class="participant-share hidden" value="0">
            <button type="button" onclick="removeParticipant(this)" class="btn btn-danger">−</button>
          </div>
        </div>
        <button type="button" onclick="addParticipant()" class="btn btn-secondary">+ Add Participant</button>
      </div>
      <div class="form-group">
        <label for="expNotes">Notes</label>
        <textarea id="expNotes" placeholder="Additional details..."></textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="expSettled">
          Mark as settled
        </label>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Expense</button>
      </div>
    </form>
  `;

  openModal('Add Expense', form);
}

function addParticipant() {
  const splitType = document.getElementById('expSplitType').value;
  const list = document.getElementById('participantsList');
  const item = document.createElement('div');
  item.className = 'participant-item';
  item.innerHTML = `
    <input type="text" placeholder="Name" class="participant-name" required>
    <input type="number" placeholder="Paid" step="0.01" class="participant-paid" value="0">
    <input type="number" placeholder="Share" step="0.01" class="participant-share ${splitType === 'equal' ? 'hidden' : ''}" value="0">
    <button type="button" onclick="removeParticipant(this)" class="btn btn-danger">−</button>
  `;
  list.appendChild(item);
}

function removeParticipant(btn) {
  if (document.querySelectorAll('.participant-item').length > 1) {
    btn.parentElement.remove();
  } else {
    showToast('At least one participant is required');
  }
}

function toggleSplitType() {
  const splitType = document.getElementById('expSplitType').value;
  const shareInputs = document.querySelectorAll('.participant-share');
  shareInputs.forEach(input => {
    if (splitType === 'equal') {
      input.classList.add('hidden');
      input.value = 0;
    } else {
      input.classList.remove('hidden');
    }
  });
}

async function saveExpense(event) {
  event.preventDefault();

  const participantItems = document.querySelectorAll('.participant-item');
  const participants = Array.from(participantItems).map(item => ({
    name: item.querySelector('.participant-name').value,
    paid: parseFloat(item.querySelector('.participant-paid').value) || 0,
    share: parseFloat(item.querySelector('.participant-share').value) || 0
  }));

  const splitType = document.getElementById('expSplitType').value;
  const amount = parseFloat(document.getElementById('expAmount').value);

  // Validate custom split
  if (splitType === 'custom') {
    const totalShare = participants.reduce((sum, p) => sum + p.share, 0);
    if (Math.abs(totalShare - amount) > 0.01) {
      showToast('Total shares must equal total amount!');
      return;
    }
  }

  const expense = {
    description: document.getElementById('expDescription').value,
    amount: amount,
    currency: document.getElementById('expCurrency').value,
    date: document.getElementById('expDate').value,
    splitType: splitType,
    participants: participants,
    notes: document.getElementById('expNotes').value,
    settled: document.getElementById('expSettled').checked
  };

  const id = document.getElementById('expId')?.value;

  try {
    if (id) {
      expense.id = parseInt(id);
      await db.update('expenses', expense);
      showToast('Expense updated successfully!');
    } else {
      await db.add('expenses', expense);
      showToast('Expense added successfully!');
    }

    closeModal();
    loadExpenses();
  } catch (error) {
    showToast('Error saving expense: ' + error.message);
  }
}

async function viewExpenseDetails(id) {
  const exp = await db.get('expenses', id);
  const perPerson = exp.splitType === 'equal' ? exp.amount / exp.participants.length : 0;

  let content = `
    <div class="item-details">
      <div class="item-detail"><strong>Description:</strong> ${exp.description}</div>
      <div class="item-detail"><strong>Total:</strong> ${formatCurrency(exp.amount, exp.currency)}</div>
      <div class="item-detail"><strong>Date:</strong> ${formatDate(exp.date)}</div>
      <div class="item-detail"><strong>Split Type:</strong> ${exp.splitType === 'equal' ? 'Equal' : 'Custom'}</div>
      ${exp.notes ? `<div class="item-detail"><strong>Notes:</strong> ${exp.notes}</div>` : ''}
      <h4 style="margin-top: 1rem;">Participants:</h4>
  `;

  exp.participants.forEach(p => {
    const owes = exp.splitType === 'equal' ? perPerson : p.share;
    const balance = p.paid - owes;
    content += `
      <div class="item-card" style="margin-top: 0.5rem;">
        <strong>${p.name}</strong>
        <div class="item-detail">Paid: ${formatCurrency(p.paid, exp.currency)}</div>
        <div class="item-detail">Owes: ${formatCurrency(owes, exp.currency)}</div>
        <div class="item-detail">
          ${balance > 0.01 ? `Gets back: ${formatCurrency(balance, exp.currency)}` :
            balance < -0.01 ? `Needs to pay: ${formatCurrency(Math.abs(balance), exp.currency)}` : 'Settled'}
        </div>
      </div>
    `;
  });

  content += `</div>`;
  openModal('Expense Details', content);
}

async function editExpense(id) {
  const exp = await db.get('expenses', id);

  const form = `
    <form onsubmit="saveExpense(event)">
      <input type="hidden" id="expId" value="${exp.id}">
      <div class="form-group">
        <label for="expDescription">Description *</label>
        <input type="text" id="expDescription" value="${exp.description}" required>
      </div>
      <div class="form-group">
        <label for="expAmount">Total Amount *</label>
        <input type="number" id="expAmount" step="0.01" value="${exp.amount}" required>
      </div>
      <div class="form-group">
        <label for="expCurrency">Currency</label>
        <select id="expCurrency">
        <option value="NRs" ${exp.currency === 'NRs' ? 'selected' : ''}>NRs</option>
          <option value="USD" ${exp.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${exp.currency === 'EUR' ? 'selected' : ''}>EUR</option>
          <option value="GBP" ${exp.currency === 'GBP' ? 'selected' : ''}>GBP</option>
          <option value="INR" ${exp.currency === 'INR' ? 'selected' : ''}>INR</option>
          <option value="JPY" ${exp.currency === 'JPY' ? 'selected' : ''}>JPY</option>
        </select>
      </div>
      ${createDateInput('expDate', 'Date *', exp.date)}
      <div class="form-group">
        <label for="expSplitType">Split Type *</label>
        <select id="expSplitType" onchange="toggleSplitType()" required>
          <option value="equal" ${exp.splitType === 'equal' ? 'selected' : ''}>Equal Split</option>
          <option value="custom" ${exp.splitType === 'custom' ? 'selected' : ''}>Custom Split</option>
        </select>
      </div>
      <div class="form-group">
        <label>Participants</label>
        <div id="participantsList" class="participant-list">
          ${exp.participants.map(p => `
            <div class="participant-item">
              <input type="text" placeholder="Name" class="participant-name" value="${p.name}" required>
              <input type="number" placeholder="Paid" step="0.01" class="participant-paid" value="${p.paid}">
              <input type="number" placeholder="Share" step="0.01" class="participant-share ${exp.splitType === 'equal' ? 'hidden' : ''}" value="${p.share}">
              <button type="button" onclick="removeParticipant(this)" class="btn btn-danger">−</button>
            </div>
          `).join('')}
        </div>
        <button type="button" onclick="addParticipant()" class="btn btn-secondary">+ Add Participant</button>
      </div>
      <div class="form-group">
        <label for="expNotes">Notes</label>
        <textarea id="expNotes">${exp.notes || ''}</textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="expSettled" ${exp.settled ? 'checked' : ''}>
          Mark as settled
        </label>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Expense</button>
      </div>
    </form>
  `;

  openModal('Edit Expense', form);
}

async function deleteExpense(id) {
  if (confirmAction('Are you sure you want to delete this expense?')) {
    await db.delete('expenses', id);
    showToast('Expense deleted successfully!');
    loadExpenses();
  }
}
