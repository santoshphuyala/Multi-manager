// Bill Reminder & Payment Tracker Module

async function loadBills() {
  const bills = await db.getAll('bills');
  const container = document.getElementById('billList');

  if (bills.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <p>No bills tracked yet</p>
        <button onclick="showAddBill()" class="btn btn-primary">Add Your First Bill</button>
      </div>
    `;
    document.getElementById('billSummary').innerHTML = '';
    return;
  }

  // Calculate summary
  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  let totalMonthly = 0;
  let overdue = 0;
  let upcoming = 0;
  let paidThisMonth = 0;

  bills.forEach(bill => {
    if (bill.active) {
      totalMonthly += bill.amount;

      const dueDate = new Date(bill.nextDueDate);
      const isPaid = bill.paymentHistory?.some(p => {
        const payDate = new Date(p.date);
        return payDate.getMonth() === thisMonth &&
               payDate.getFullYear() === thisYear &&
               p.status === 'paid';
      });

      if (isPaid) {
        paidThisMonth += bill.amount;
      } else if (dueDate < today) {
        overdue++;
      } else if (dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        upcoming++;
      }
    }
  });

  // Display summary
  document.getElementById('billSummary').innerHTML = `
    <div class="summary-card">
      <h4>Monthly Total</h4>
      <div class="amount">${formatCurrency(totalMonthly)}</div>
    </div>
    <div class="summary-card">
      <h4>Paid This Month</h4>
      <div class="amount">${formatCurrency(paidThisMonth)}</div>
    </div>
    <div class="summary-card overdue">
      <h4>Overdue Bills</h4>
      <div class="amount">${overdue}</div>
    </div>
    <div class="summary-card upcoming">
      <h4>Due This Week</h4>
      <div class="amount">${upcoming}</div>
    </div>
  `;

  // Display bills
  container.innerHTML = bills.map(bill => {
    const dueDate = new Date(bill.nextDueDate);
    const today = new Date();
    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // Check if paid this month
    const isPaidThisMonth = bill.paymentHistory?.some(p => {
      const payDate = new Date(p.date);
      return payDate.getMonth() === today.getMonth() &&
             payDate.getFullYear() === today.getFullYear() &&
             p.status === 'paid';
    });

    const status = isPaidThisMonth ? 'paid' : daysUntil < 0 ? 'overdue' : 'pending';

    return `
      <div class="item-card">
        <div class="item-header">
          <h3 class="item-title">${bill.name}</h3>
          <div class="item-actions">
            <button class="icon-btn" onclick="markBillPaid(${bill.id})" title="Mark as Paid">✓</button>
            <button class="icon-btn" onclick="viewBillHistory(${bill.id})" title="History">📊</button>
            <button class="icon-btn" onclick="editBill(${bill.id})" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteBill(${bill.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          <div class="item-detail"><strong>Amount:</strong> ${formatCurrency(bill.amount, bill.currency)}</div>
          <div class="item-detail"><strong>Category:</strong> ${bill.category}</div>
          <div class="item-detail"><strong>Due Date:</strong> ${formatDate(bill.nextDueDate)}</div>
          ${daysUntil >= 0 && !isPaidThisMonth ? `<div class="item-detail"><strong>Due in:</strong> ${daysUntil} days</div>` : ''}
          ${bill.autoDebit ? '<div class="item-detail"><strong>Auto-Debit:</strong> Yes</div>' : ''}
          ${bill.notes ? `<div class="item-detail"><strong>Notes:</strong> ${bill.notes}</div>` : ''}
          <div class="item-detail">
            <span class="payment-status ${status}">${status.toUpperCase()}</span>
            ${!bill.active ? '<span class="item-badge badge-inactive">Inactive</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateDashboard();
}

function showAddBill() {
  const form = `
    <form onsubmit="saveBill(event)">
      <div class="form-group">
        <label for="billName">Bill Name *</label>
        <input type="text" id="billName" placeholder="e.g., Electricity, Internet" required>
      </div>
      <div class="form-group">
        <label for="billAmount">Amount *</label>
        <input type="number" id="billAmount" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label for="billCurrency">Currency</label>
        <select id="billCurrency">
        <option value="NRs">NRs</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="INR">INR</option>
          <option value="JPY">JPY</option>
        </select>
      </div>
      <div class="form-group">
        <label for="billCategory">Category *</label>
        <select id="billCategory" required>
          <option value="Utilities">Utilities (Water, Gas, Electric)</option>
          <option value="Internet/Phone">Internet/Phone</option>
          <option value="Rent/Mortgage">Rent/Mortgage</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Loan">Loan</option>
          <option value="Insurance">Insurance</option>
          <option value="Streaming">Streaming/Entertainment</option>
          <option value="Other">Other</option>
        </select>
      </div>
      ${createDateInput('billDueDate', 'Next Due Date *')}
      <div class="form-group">
        <label for="billFrequency">Frequency *</label>
        <select id="billFrequency" required>
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Yearly">Yearly</option>
          <option value="Weekly">Weekly</option>
          <option value="One-time">One-time</option>
        </select>
      </div>
      <div class="form-group">
        <label for="billPaymentMethod">Payment Method</label>
        <select id="billPaymentMethod">
          <option value="">Select Method</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Debit Card">Debit Card</option>
          <option value="Cash">Cash</option>
          <option value="Check">Check</option>
          <option value="Auto-Debit">Auto-Debit</option>
        </select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="billAutoDebit">
          Auto-debit enabled
        </label>
      </div>
      <div class="form-group">
        <label for="billNotes">Notes</label>
        <textarea id="billNotes" placeholder="Account number, website, contact..."></textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="billActive" checked>
          Active bill
        </label>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Bill</button>
      </div>
    </form>
  `;

  openModal('Add Bill', form);
}

async function saveBill(event) {
  event.preventDefault();

  const bill = {
    name: document.getElementById('billName').value,
    amount: parseFloat(document.getElementById('billAmount').value),
    currency: document.getElementById('billCurrency').value,
    category: document.getElementById('billCategory').value,
    nextDueDate: document.getElementById('billDueDate').value,
    frequency: document.getElementById('billFrequency').value,
    paymentMethod: document.getElementById('billPaymentMethod').value,
    autoDebit: document.getElementById('billAutoDebit').checked,
    notes: document.getElementById('billNotes').value,
    active: document.getElementById('billActive').checked,
    paymentHistory: []
  };

  const id = document.getElementById('billId')?.value;

  try {
    if (id) {
      bill.id = parseInt(id);
      const oldBill = await db.get('bills', bill.id);
      bill.paymentHistory = oldBill.paymentHistory || [];
      await db.update('bills', bill);
      showToast('Bill updated successfully!');
    } else {
      await db.add('bills', bill);
      showToast('Bill added successfully!');
    }

    closeModal();
    loadBills();
  } catch (error) {
    showToast('Error saving bill: ' + error.message);
  }
}

async function markBillPaid(id) {
  const bill = await db.get('bills', id);

  const paymentDate = prompt('Enter payment date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
  if (!paymentDate) return;

  if (!bill.paymentHistory) bill.paymentHistory = [];

  bill.paymentHistory.push({
    date: paymentDate,
    amount: bill.amount,
    status: 'paid',
    method: bill.paymentMethod
  });

  // Update next due date based on frequency
  const currentDue = new Date(bill.nextDueDate);
  switch (bill.frequency) {
    case 'Monthly':
      currentDue.setMonth(currentDue.getMonth() + 1);
      break;
    case 'Quarterly':
      currentDue.setMonth(currentDue.getMonth() + 3);
      break;
    case 'Yearly':
      currentDue.setFullYear(currentDue.getFullYear() + 1);
      break;
    case 'Weekly':
      currentDue.setDate(currentDue.getDate() + 7);
      break;
  }

  if (bill.frequency !== 'One-time') {
    bill.nextDueDate = currentDue.toISOString().split('T')[0];
  }

  await db.update('bills', bill);
  showToast('Bill marked as paid!');
  loadBills();
}

async function viewBillHistory(id) {
  const bill = await db.get('bills', id);

  let content = `
    <div class="item-details">
      <h4>Payment History for ${bill.name}</h4>
      ${bill.paymentHistory && bill.paymentHistory.length > 0 ? `
        <div style="margin-top: 1rem;">
          ${bill.paymentHistory.slice().reverse().map(payment => `
            <div class="maintenance-item">
              <div>
                <strong>${formatDate(payment.date)}</strong><br>
                <small>${payment.method || 'N/A'}</small>
              </div>
              <div style="text-align: right;">
                <strong>${formatCurrency(payment.amount, bill.currency)}</strong><br>
                <span class="payment-status ${payment.status}">${payment.status}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No payment history yet</p>'}
    </div>
  `;

  openModal('Payment History', content);
}

async function editBill(id) {
  const bill = await db.get('bills', id);

  const form = `
    <form onsubmit="saveBill(event)">
      <input type="hidden" id="billId" value="${bill.id}">
      <div class="form-group">
        <label for="billName">Bill Name *</label>
        <input type="text" id="billName" value="${bill.name}" required>
      </div>
      <div class="form-group">
        <label for="billAmount">Amount *</label>
        <input type="number" id="billAmount" step="0.01" value="${bill.amount}" required>
      </div>
      <div class="form-group">
        <label for="billCurrency">Currency</label>
        <select id="billCurrency">
        <option value="NRs" ${bill.currency === 'NRs' ? 'selected' : ''}>NRs</option>
          <option value="USD" ${bill.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${bill.currency === 'EUR' ? 'selected' : ''}>EUR</option>
          <option value="GBP" ${bill.currency === 'GBP' ? 'selected' : ''}>GBP</option>
          <option value="INR" ${bill.currency === 'INR' ? 'selected' : ''}>INR</option>
          <option value="JPY" ${bill.currency === 'JPY' ? 'selected' : ''}>JPY</option>
        </select>
      </div>
      <div class="form-group">
        <label for="billCategory">Category *</label>
        <select id="billCategory" required>
          <option value="Utilities" ${bill.category === 'Utilities' ? 'selected' : ''}>Utilities</option>
          <option value="Internet/Phone" ${bill.category === 'Internet/Phone' ? 'selected' : ''}>Internet/Phone</option>
          <option value="Rent/Mortgage" ${bill.category === 'Rent/Mortgage' ? 'selected' : ''}>Rent/Mortgage</option>
          <option value="Credit Card" ${bill.category === 'Credit Card' ? 'selected' : ''}>Credit Card</option>
          <option value="Loan" ${bill.category === 'Loan' ? 'selected' : ''}>Loan</option>
          <option value="Insurance" ${bill.category === 'Insurance' ? 'selected' : ''}>Insurance</option>
          <option value="Streaming" ${bill.category === 'Streaming' ? 'selected' : ''}>Streaming/Entertainment</option>
          <option value="Other" ${bill.category === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      ${createDateInput('billDueDate', 'Next Due Date *', bill.nextDueDate)}
      <div class="form-group">
        <label for="billFrequency">Frequency *</label>
        <select id="billFrequency" required>
          <option value="Monthly" ${bill.frequency === 'Monthly' ? 'selected' : ''}>Monthly</option>
          <option value="Quarterly" ${bill.frequency === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
          <option value="Yearly" ${bill.frequency === 'Yearly' ? 'selected' : ''}>Yearly</option>
          <option value="Weekly" ${bill.frequency === 'Weekly' ? 'selected' : ''}>Weekly</option>
          <option value="One-time" ${bill.frequency === 'One-time' ? 'selected' : ''}>One-time</option>
        </select>
      </div>
      <div class="form-group">
        <label for="billPaymentMethod">Payment Method</label>
        <select id="billPaymentMethod">
          <option value="">Select Method</option>
          <option value="Bank Transfer" ${bill.paymentMethod === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
          <option value="Credit Card" ${bill.paymentMethod === 'Credit Card' ? 'selected' : ''}>Credit Card</option>
          <option value="Debit Card" ${bill.paymentMethod === 'Debit Card' ? 'selected' : ''}>Debit Card</option>
          <option value="Cash" ${bill.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
          <option value="Check" ${bill.paymentMethod === 'Check' ? 'selected' : ''}>Check</option>
          <option value="Auto-Debit" ${bill.paymentMethod === 'Auto-Debit' ? 'selected' : ''}>Auto-Debit</option>
        </select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="billAutoDebit" ${bill.autoDebit ? 'checked' : ''}>
          Auto-debit enabled
        </label>
      </div>
      <div class="form-group">
        <label for="billNotes">Notes</label>
        <textarea id="billNotes">${bill.notes || ''}</textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="billActive" ${bill.active ? 'checked' : ''}>
          Active bill
        </label>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Bill</button>
      </div>
    </form>
  `;

  openModal('Edit Bill', form);
}

async function deleteBill(id) {
  if (confirmAction('Are you sure you want to delete this bill?')) {
    await db.delete('bills', id);
    showToast('Bill deleted successfully!');
    loadBills();
  }
}
