// Enhanced Expense Splitter Module with Groups and Advanced Features

// ==================== LOAD EXPENSE GROUPS ====================
async function loadExpenses() {
  const groups = await db.getAll('expenseGroups');
  const container = document.getElementById('expenseList');

  if (groups.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💰</div>
        <p>No expense groups yet</p>
        <p style="font-size: 0.875rem; color: var(--text-secondary);">Create a group for trips, outings, or shared activities</p>
        <button onclick="showAddExpenseGroup()" class="btn btn-primary">+ Create Expense Group</button>
      </div>
    `;
    return;
  }

  container.innerHTML = groups.map(group => {
    const totalExpenses = group.expenses?.length || 0;
    const totalAmount = (group.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
    const dateRange = group.startDate && group.endDate 
      ? `${formatDate(group.startDate)} - ${formatDate(group.endDate)}`
      : 'No dates set';

    return `
      <div class="item-card expense-group-card">
        <div class="item-header">
          <div>
            <h3 class="item-title">${group.name}</h3>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0.25rem 0;">
              ${group.participants?.length || 0} participants • ${totalExpenses} expenses
            </p>
          </div>
          <div class="item-actions">
            <button class="icon-btn" onclick="viewGroupSummary(${group.id})" title="View Summary">📊</button>
            <button class="icon-btn" onclick="addExpenseToGroup(${group.id})" title="Add Expense">➕</button>
            <button class="icon-btn" onclick="editExpenseGroup(${group.id})" title="Edit Group">✏️</button>
            <button class="icon-btn" onclick="deleteExpenseGroup(${group.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          <div class="item-detail"><strong>Period:</strong> ${dateRange}</div>
          <div class="item-detail"><strong>Total Amount:</strong> ${formatCurrency(totalAmount, group.currency)}</div>
          <div class="item-detail"><strong>Participants:</strong> ${(group.participants || []).join(', ')}</div>
          ${group.description ? `<div class="item-detail"><strong>Description:</strong> ${group.description}</div>` : ''}
          <div class="item-detail">
            <span class="item-badge ${group.settled ? 'badge-active' : 'badge-warning'}">
              ${group.settled ? '✓ Settled' : '⏳ Pending'}
            </span>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <button onclick="viewGroupDetails(${group.id})" class="btn btn-secondary" style="width: 100%;">
            View Details & Add Expenses
          </button>
        </div>
      </div>
    `;
  }).join('');

  updateDashboard();
}

// ==================== CREATE EXPENSE GROUP ====================
function showAddExpenseGroup() {
  const form = `
    <form onsubmit="saveExpenseGroup(event)">
      <div class="form-group">
        <label for="groupName">Group Name *</label>
        <input type="text" id="groupName" placeholder="e.g., Pokhara Trip, Dinner with Friends" required>
      </div>
      <div class="form-group">
        <label for="groupDescription">Description</label>
        <textarea id="groupDescription" placeholder="Purpose or details about this expense group"></textarea>
      </div>
      <div class="form-group">
        <label for="groupCurrency">Currency</label>
        <select id="groupCurrency">
          <option value="NRs">NRs - Nepalese Rupee</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="INR">INR - Indian Rupee</option>
          <option value="JPY">JPY - Japanese Yen</option>
        </select>
      </div>
      ${createDateInput('groupStartDate', 'Start Date *')}
      ${createDateInput('groupEndDate', 'End Date *')}
      <div class="form-group">
        <label>Participants (Friends) *</label>
        <div id="participantsList" class="participant-list">
          <div class="participant-item">
            <input type="text" placeholder="Participant Name" class="participant-name" required>
            <button type="button" onclick="removeGroupParticipant(this)" class="btn btn-danger">−</button>
          </div>
        </div>
        <button type="button" onclick="addGroupParticipant()" class="btn btn-secondary">+ Add Participant</button>
        <small style="color: var(--text-secondary);">Add all friends who will be part of this expense group</small>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Group</button>
      </div>
    </form>
  `;

  openModal('Create Expense Group', form);
}

function addGroupParticipant() {
  const list = document.getElementById('participantsList');
  const item = document.createElement('div');
  item.className = 'participant-item';
  item.innerHTML = `
    <input type="text" placeholder="Participant Name" class="participant-name" required>
    <button type="button" onclick="removeGroupParticipant(this)" class="btn btn-danger">−</button>
  `;
  list.appendChild(item);
}

function removeGroupParticipant(btn) {
  if (document.querySelectorAll('.participant-item').length > 1) {
    btn.parentElement.remove();
  } else {
    showToast('At least one participant is required');
  }
}

async function saveExpenseGroup(event) {
  event.preventDefault();

  const participantItems = document.querySelectorAll('.participant-name');
  const participants = Array.from(participantItems)
    .map(input => input.value.trim())
    .filter(name => name !== '');

  if (participants.length < 2) {
    showToast('Add at least 2 participants');
    return;
  }

  const startDate = document.getElementById('groupStartDate').value;
  const endDate = document.getElementById('groupEndDate').value;

  if (new Date(endDate) < new Date(startDate)) {
    showToast('End date must be after start date');
    return;
  }

  const group = {
    name: document.getElementById('groupName').value,
    description: document.getElementById('groupDescription').value,
    currency: document.getElementById('groupCurrency').value,
    startDate: startDate,
    endDate: endDate,
    participants: participants,
    expenses: [],
    settled: false
  };

  const id = document.getElementById('groupId')?.value;

  try {
    if (id) {
      group.id = parseInt(id);
      const oldGroup = await db.get('expenseGroups', group.id);
      group.expenses = oldGroup.expenses || [];
      await db.update('expenseGroups', group);
      showToast('Group updated successfully!');
    } else {
      await db.add('expenseGroups', group);
      showToast('Expense group created successfully!');
    }

    closeModal();
    loadExpenses();
  } catch (error) {
    showToast('Error saving group: ' + error.message);
  }
}

// ==================== VIEW GROUP DETAILS ====================
async function viewGroupDetails(groupId) {
  const group = await db.get('expenseGroups', groupId);
  
  // Group expenses by date
  const expensesByDate = {};
  (group.expenses || []).forEach(exp => {
    if (!expensesByDate[exp.date]) {
      expensesByDate[exp.date] = [];
    }
    expensesByDate[exp.date].push(exp);
  });

  const sortedDates = Object.keys(expensesByDate).sort();

  // In viewGroupDetails function, after the group info section, add:

let content = `
  <div class="expense-group-details">
    <div style="margin-bottom: 1rem;">
      <h3>${group.name}</h3>
      <p style="color: var(--text-secondary);">${group.description || ''}</p>
      <p><strong>Period:</strong> ${formatDate(group.startDate)} - ${formatDate(group.endDate)}</p>
      <p><strong>Participants:</strong> ${group.participants.join(', ')}</p>
    </div>

    <!-- ADD EXPORT BUTTONS HERE -->
    <div class="export-buttons" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
      <button onclick="exportExpenseGroup(${groupId}, 'xlsx')" class="btn btn-success" style="flex: 1;">
        📊 Export Excel Report
      </button>
      <button onclick="exportExpenseGroup(${groupId}, 'csv')" class="btn btn-secondary" style="flex: 1;">
        📄 Export CSV
      </button>
      <button onclick="exportExpenseGroup(${groupId}, 'json')" class="btn btn-secondary" style="flex: 1;">
        📋 Export JSON
      </button>
    </div>

    <button onclick="addExpenseToGroup(${groupId})" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">
      ➕ Add New Expense
    </button>

      <div class="expense-tabs">
        <button class="expense-tab active" onclick="switchExpenseTab(event, 'expenses')">Expenses</button>
        <button class="expense-tab" onclick="switchExpenseTab(event, 'summary')">Settlement Summary</button>
      </div>

      <div id="expensesTab" class="expense-tab-content active">
  `;

  if (sortedDates.length === 0) {
    content += '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No expenses added yet</p>';
  } else {
    sortedDates.forEach(date => {
      const dayExpenses = expensesByDate[date];
      const dayTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      content += `
        <div class="day-expenses">
          <div class="day-header">
            <h4>${formatDate(date)}</h4>
            <span class="day-total">${formatCurrency(dayTotal, group.currency)}</span>
          </div>
      `;

      dayExpenses.forEach(exp => {
        content += `
          <div class="expense-item">
            <div class="expense-item-header">
              <strong>${exp.description}</strong>
              <span>${formatCurrency(exp.amount, group.currency)}</span>
            </div>
            <div class="expense-item-details">
              <small>Paid by: <strong>${exp.paidBy}</strong></small>
              <small>Split: ${exp.splitType === 'equal' ? 'Equal' : 'Custom'}</small>
              <div class="expense-item-actions">
                <button class="icon-btn-small" onclick="viewExpenseInGroup(${groupId}, '${exp.id}')" title="View">👁️</button>
                <button class="icon-btn-small" onclick="editExpenseInGroup(${groupId}, '${exp.id}')" title="Edit">✏️</button>
                <button class="icon-btn-small" onclick="deleteExpenseFromGroup(${groupId}, '${exp.id}')" title="Delete">🗑️</button>
              </div>
            </div>
          </div>
        `;
      });

      // Day settlement
      const daySettlement = calculateDaySettlement(dayExpenses, group.participants, group.currency);
      if (daySettlement.length > 0) {
        content += `
          <div class="day-settlement">
            <strong>Day Settlement:</strong>
            ${daySettlement.map(s => `<div>${s}</div>`).join('')}
          </div>
        `;
      }

      content += '</div>';
    });
  }

  content += `
      </div>

      <div id="summaryTab" class="expense-tab-content">
        ${generateSettlementSummary(group)}
      </div>
    </div>
  `;

  openModal(`${group.name} - Details`, content);
}

// Calculate settlement for a single day
function calculateDaySettlement(expenses, participants, currency) {
  const balances = {};
  
  // Initialize balances
  participants.forEach(p => balances[p] = 0);

  // Calculate what each person paid and owes
  expenses.forEach(exp => {
    const perPerson = exp.splitType === 'equal' 
      ? exp.amount / participants.length 
      : 0;

    participants.forEach(person => {
      const owes = exp.splitType === 'equal' 
        ? perPerson 
        : (exp.splits?.[person] || 0);
      
      const paid = exp.paidBy === person ? exp.amount : 0;
      
      balances[person] += paid - owes;
    });
  });

  // Generate settlement instructions
  const settlements = [];
  const debtors = [];
  const creditors = [];

  Object.entries(balances).forEach(([person, balance]) => {
    if (balance < -0.01) {
      debtors.push({ person, amount: Math.abs(balance) });
    } else if (balance > 0.01) {
      creditors.push({ person, amount: balance });
    }
  });

  // Simplify settlements
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debt = debtors[i].amount;
    const credit = creditors[j].amount;
    const settleAmount = Math.min(debt, credit);

    settlements.push(
      `${debtors[i].person} pays ${formatCurrency(settleAmount, currency)} to ${creditors[j].person}`
    );

    debtors[i].amount -= settleAmount;
    creditors[j].amount -= settleAmount;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}

// Generate overall settlement summary
function generateSettlementSummary(group) {
  if (!group.expenses || group.expenses.length === 0) {
    return '<p style="text-align: center; padding: 2rem;">No expenses to settle</p>';
  }

  const balances = {};
  const totalPaid = {};
  const totalOwed = {};

  // Initialize
  group.participants.forEach(p => {
    balances[p] = 0;
    totalPaid[p] = 0;
    totalOwed[p] = 0;
  });

  // Calculate balances
  group.expenses.forEach(exp => {
    const perPerson = exp.splitType === 'equal' 
      ? exp.amount / group.participants.length 
      : 0;

    group.participants.forEach(person => {
      const owes = exp.splitType === 'equal' 
        ? perPerson 
        : (exp.splits?.[person] || 0);
      
      const paid = exp.paidBy === person ? exp.amount : 0;
      
      totalPaid[person] += paid;
      totalOwed[person] += owes;
      balances[person] += paid - owes;
    });
  });

  let summary = `
    <div class="settlement-summary">
      <h4>Individual Summary</h4>
      <table class="settlement-table">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Total Paid</th>
            <th>Total Owed</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
  `;

  group.participants.forEach(person => {
    const balance = balances[person];
    const balanceClass = balance > 0.01 ? 'positive' : balance < -0.01 ? 'negative' : 'zero';
    summary += `
      <tr>
        <td><strong>${person}</strong></td>
        <td>${formatCurrency(totalPaid[person], group.currency)}</td>
        <td>${formatCurrency(totalOwed[person], group.currency)}</td>
        <td class="balance-${balanceClass}">
          ${balance > 0.01 ? '+' : ''}${formatCurrency(balance, group.currency)}
        </td>
      </tr>
    `;
  });

  summary += `
        </tbody>
      </table>

      <h4 style="margin-top: 1.5rem;">Settlement Instructions</h4>
      <div class="settlement-instructions">
  `;

  const settlements = calculateDaySettlement(group.expenses, group.participants, group.currency);
  
  if (settlements.length === 0) {
    summary += '<p style="text-align: center;">✓ All settled!</p>';
  } else {
    settlements.forEach((instruction, index) => {
      summary += `<div class="settlement-instruction">${index + 1}. ${instruction}</div>`;
    });
  }

  summary += `
      </div>
      
      <div style="margin-top: 1rem;">
        <button onclick="markGroupAsSettled(${group.id})" class="btn ${group.settled ? 'btn-secondary' : 'btn-success'}" style="width: 100%;">
          ${group.settled ? '✓ Already Settled' : 'Mark as Settled'}
        </button>
      </div>
    </div>
  `;

  return summary;
}

// ==================== ADD EXPENSE TO GROUP ====================
async function addExpenseToGroup(groupId) {
  closeModal();
  
  const group = await db.get('expenseGroups', groupId);

  const form = `
    <form onsubmit="saveExpenseToGroup(event, ${groupId})">
      <div class="form-group">
        <label for="expDescription">Description *</label>
        <input type="text" id="expDescription" placeholder="e.g., Hotel booking, Lunch" required>
      </div>
      <div class="form-group">
        <label for="expAmount">Amount *</label>
        <input type="number" id="expAmount" step="0.01" min="0" required>
      </div>
      ${createDateInput('expDate', 'Date *', new Date().toISOString().split('T')[0])}
      <div class="form-group">
        <label for="expPaidBy">Paid By *</label>
        <select id="expPaidBy" required>
          ${group.participants.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="expSplitType">Split Type *</label>
        <select id="expSplitType" onchange="toggleExpenseSplitType(${groupId})" required>
          <option value="equal">Equal Split</option>
          <option value="custom">Custom Split</option>
        </select>
      </div>
      <div id="customSplitContainer" class="hidden">
        <label>Custom Split Amounts</label>
        ${group.participants.map(p => `
          <div class="form-group">
            <label for="split_${p}">${p}</label>
            <input type="number" id="split_${p}" step="0.01" min="0" value="0" class="custom-split-input">
          </div>
        `).join('')}
        <small style="color: var(--text-secondary);">Total must equal the expense amount</small>
      </div>
      <div class="form-group">
        <label for="expNotes">Notes</label>
        <textarea id="expNotes" placeholder="Additional details..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="viewGroupDetails(${groupId})" class="btn btn-secondary">Back</button>
        <button type="submit" class="btn btn-primary">Add Expense</button>
      </div>
    </form>
  `;

  openModal('Add Expense to Group', form);
}

function toggleExpenseSplitType(groupId) {
  const splitType = document.getElementById('expSplitType').value;
  const container = document.getElementById('customSplitContainer');
  
  if (splitType === 'custom') {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

async function saveExpenseToGroup(event, groupId) {
  event.preventDefault();

  const group = await db.get('expenseGroups', groupId);
  const amount = parseFloat(document.getElementById('expAmount').value);
  const splitType = document.getElementById('expSplitType').value;

  let splits = {};
  
  if (splitType === 'custom') {
    let totalSplit = 0;
    group.participants.forEach(p => {
      const splitAmount = parseFloat(document.getElementById(`split_${p}`).value) || 0;
      splits[p] = splitAmount;
      totalSplit += splitAmount;
    });

    if (Math.abs(totalSplit - amount) > 0.01) {
      showToast(`Total split (${totalSplit}) must equal amount (${amount})`);
      return;
    }
  }

  const expense = {
    id: generateId(),
    description: document.getElementById('expDescription').value,
    amount: amount,
    date: document.getElementById('expDate').value,
    paidBy: document.getElementById('expPaidBy').value,
    splitType: splitType,
    splits: splitType === 'custom' ? splits : {},
    notes: document.getElementById('expNotes').value
  };

  // Validate date is within group period
  if (expense.date < group.startDate || expense.date > group.endDate) {
    if (!confirmAction('Date is outside group period. Continue anyway?')) {
      return;
    }
  }

  if (!group.expenses) group.expenses = [];
  
  const expenseId = document.getElementById('expenseEditId')?.value;
  if (expenseId) {
    // Update existing expense
    const index = group.expenses.findIndex(e => e.id === expenseId);
    if (index !== -1) {
      group.expenses[index] = { ...expense, id: expenseId };
    }
  } else {
    // Add new expense
    group.expenses.push(expense);
  }

  await db.update('expenseGroups', group);
  showToast('Expense added successfully!');
  viewGroupDetails(groupId);
}

// ==================== EXPENSE ACTIONS ====================
async function viewExpenseInGroup(groupId, expenseId) {
  const group = await db.get('expenseGroups', groupId);
  const expense = group.expenses.find(e => e.id === expenseId);
  
  if (!expense) return;

  const perPerson = expense.splitType === 'equal' 
    ? expense.amount / group.participants.length 
    : 0;

  let content = `
    <div class="expense-detail-view">
      <h4>${expense.description}</h4>
      <p><strong>Amount:</strong> ${formatCurrency(expense.amount, group.currency)}</p>
      <p><strong>Date:</strong> ${formatDate(expense.date)}</p>
      <p><strong>Paid By:</strong> ${expense.paidBy}</p>
      <p><strong>Split Type:</strong> ${expense.splitType === 'equal' ? 'Equal Split' : 'Custom Split'}</p>
      ${expense.notes ? `<p><strong>Notes:</strong> ${expense.notes}</p>` : ''}
      
      <h4 style="margin-top: 1rem;">Split Details:</h4>
      <table class="split-details-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Share</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
  `;

  group.participants.forEach(person => {
    const share = expense.splitType === 'equal' 
      ? perPerson 
      : (expense.splits[person] || 0);
    const isPayer = person === expense.paidBy;

    content += `
      <tr>
        <td><strong>${person}</strong></td>
        <td>${formatCurrency(share, group.currency)}</td>
        <td>${isPayer ? '<span class="badge-active">Paid</span>' : '<span class="badge-warning">Owes</span>'}</td>
      </tr>
    `;
  });

  content += `
        </tbody>
      </table>
    </div>
    <div class="form-actions" style="margin-top: 1rem;">
      <button onclick="viewGroupDetails(${groupId})" class="btn btn-primary">Back to Group</button>
    </div>
  `;

  openModal('Expense Details', content);
}

async function editExpenseInGroup(groupId, expenseId) {
  closeModal();
  
  const group = await db.get('expenseGroups', groupId);
  const expense = group.expenses.find(e => e.id === expenseId);
  
  if (!expense) return;

  const form = `
    <form onsubmit="saveExpenseToGroup(event, ${groupId})">
      <input type="hidden" id="expenseEditId" value="${expense.id}">
      <div class="form-group">
        <label for="expDescription">Description *</label>
        <input type="text" id="expDescription" value="${expense.description}" required>
      </div>
      <div class="form-group">
        <label for="expAmount">Amount *</label>
        <input type="number" id="expAmount" step="0.01" value="${expense.amount}" required>
      </div>
      ${createDateInput('expDate', 'Date *', expense.date)}
      <div class="form-group">
        <label for="expPaidBy">Paid By *</label>
        <select id="expPaidBy" required>
          ${group.participants.map(p => `
            <option value="${p}" ${expense.paidBy === p ? 'selected' : ''}>${p}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="expSplitType">Split Type *</label>
        <select id="expSplitType" onchange="toggleExpenseSplitType(${groupId})" required>
          <option value="equal" ${expense.splitType === 'equal' ? 'selected' : ''}>Equal Split</option>
          <option value="custom" ${expense.splitType === 'custom' ? 'selected' : ''}>Custom Split</option>
        </select>
      </div>
      <div id="customSplitContainer" class="${expense.splitType === 'custom' ? '' : 'hidden'}">
        <label>Custom Split Amounts</label>
        ${group.participants.map(p => `
          <div class="form-group">
            <label for="split_${p}">${p}</label>
            <input type="number" id="split_${p}" step="0.01" value="${expense.splits?.[p] || 0}" class="custom-split-input">
          </div>
        `).join('')}
      </div>
      <div class="form-group">
        <label for="expNotes">Notes</label>
        <textarea id="expNotes">${expense.notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="viewGroupDetails(${groupId})" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Expense</button>
      </div>
    </form>
  `;

  openModal('Edit Expense', form);
}

async function deleteExpenseFromGroup(groupId, expenseId) {
  if (!confirmAction('Delete this expense?')) return;

  const group = await db.get('expenseGroups', groupId);
  group.expenses = group.expenses.filter(e => e.id !== expenseId);
  
  await db.update('expenseGroups', group);
  showToast('Expense deleted!');
  viewGroupDetails(groupId);
}

// ==================== GROUP ACTIONS ====================
async function editExpenseGroup(id) {
  const group = await db.get('expenseGroups', id);

  const form = `
    <form onsubmit="saveExpenseGroup(event)">
      <input type="hidden" id="groupId" value="${group.id}">
      <div class="form-group">
        <label for="groupName">Group Name *</label>
        <input type="text" id="groupName" value="${group.name}" required>
      </div>
      <div class="form-group">
        <label for="groupDescription">Description</label>
        <textarea id="groupDescription">${group.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label for="groupCurrency">Currency</label>
        <select id="groupCurrency">
          <option value="NRs" ${group.currency === 'NRs' ? 'selected' : ''}>NRs</option>
          <option value="USD" ${group.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${group.currency === 'EUR' ? 'selected' : ''}>EUR</option>
          <option value="GBP" ${group.currency === 'GBP' ? 'selected' : ''}>GBP</option>
          <option value="INR" ${group.currency === 'INR' ? 'selected' : ''}>INR</option>
          <option value="JPY" ${group.currency === 'JPY' ? 'selected' : ''}>JPY</option>
        </select>
      </div>
      ${createDateInput('groupStartDate', 'Start Date *', group.startDate)}
      ${createDateInput('groupEndDate', 'End Date *', group.endDate)}
      <div class="form-group">
        <label>Participants *</label>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">Note: Changing participants may affect existing expenses</p>
        <div id="participantsList" class="participant-list">
          ${group.participants.map(p => `
            <div class="participant-item">
              <input type="text" placeholder="Participant Name" class="participant-name" value="${p}" required>
              <button type="button" onclick="removeGroupParticipant(this)" class="btn btn-danger">−</button>
            </div>
          `).join('')}
        </div>
        <button type="button" onclick="addGroupParticipant()" class="btn btn-secondary">+ Add Participant</button>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Group</button>
      </div>
    </form>
  `;

  openModal('Edit Expense Group', form);
}

async function deleteExpenseGroup(id) {
  if (confirmAction('Delete this expense group and all its expenses?')) {
    await db.delete('expenseGroups', id);
    showToast('Expense group deleted!');
    loadExpenses();
  }
}

async function viewGroupSummary(groupId) {
  const group = await db.get('expenseGroups', groupId);
  const summary = generateSettlementSummary(group);
  
  openModal(`${group.name} - Settlement Summary`, summary);
}

async function markGroupAsSettled(groupId) {
  const group = await db.get('expenseGroups', groupId);
  group.settled = !group.settled;
  
  await db.update('expenseGroups', group);
  showToast(group.settled ? 'Group marked as settled!' : 'Group marked as pending');
  viewGroupDetails(groupId);
}

// ==================== TAB SWITCHING ====================
function switchExpenseTab(event, tabName) {
  // Remove active from all tabs
  document.querySelectorAll('.expense-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.expense-tab-content').forEach(content => content.classList.remove('active'));

  // Add active to clicked tab
  event.target.classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.add('active');
}
// ==================== ENHANCED EXPORT FUNCTIONS ====================

async function exportExpenseGroup(groupId, format) {
  const group = await db.get('expenseGroups', groupId);
  
  if (!group) {
    showToast('Group not found');
    return;
  }

  switch(format) {
    case 'json':
      exportExpenseGroupJSON(group);
      break;
    case 'csv':
      exportExpenseGroupCSV(group);
      break;
    case 'xlsx':
      exportExpenseGroupExcel(group);
      break;
  }
}

// Export as formatted Excel with multiple sheets
function exportExpenseGroupExcel(group) {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded');
    return;
  }

  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Group Summary
    const summaryData = [
      ['Expense Group Report'],
      [''],
      ['Group Name:', group.name],
      ['Description:', group.description || 'N/A'],
      ['Period:', `${formatDate(group.startDate)} to ${formatDate(group.endDate)}`],
      ['Currency:', group.currency],
      ['Participants:', group.participants.join(', ')],
      ['Total Expenses:', (group.expenses || []).length],
      ['Status:', group.settled ? 'Settled' : 'Pending'],
      ['']
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Detailed Expenses (Day-wise)
    const expensesData = [
      ['Date', 'Description', 'Amount', 'Paid By', 'Split Type', 'Notes']
    ];

    // Group by date
    const expensesByDate = {};
    (group.expenses || []).forEach(exp => {
      if (!expensesByDate[exp.date]) {
        expensesByDate[exp.date] = [];
      }
      expensesByDate[exp.date].push(exp);
    });

    const sortedDates = Object.keys(expensesByDate).sort();
    let grandTotal = 0;

    sortedDates.forEach(date => {
      const dayExpenses = expensesByDate[date];
      const dayTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      grandTotal += dayTotal;

      // Date header
      expensesData.push([`=== ${formatDate(date)} ===`, '', '', '', '', '']);

      // Expenses for this day
      dayExpenses.forEach(exp => {
        expensesData.push([
          formatDate(exp.date),
          exp.description,
          exp.amount,
          exp.paidBy,
          exp.splitType === 'equal' ? 'Equal Split' : 'Custom Split',
          exp.notes || ''
        ]);
      });

      // Day subtotal
      expensesData.push([
        '',
        'Day Total',
        dayTotal,
        '',
        '',
        ''
      ]);
      expensesData.push(['']); // Empty row
    });

    // Grand total
    expensesData.push([
      '',
      'GRAND TOTAL',
      grandTotal,
      '',
      '',
      ''
    ]);

    const wsExpenses = XLSX.utils.aoa_to_sheet(expensesData);
    
    // Set column widths
    wsExpenses['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

    // Sheet 3: Split Details
    const splitData = [
      ['Date', 'Description', 'Participant', 'Share Amount', 'Paid Amount', 'Balance']
    ];

    sortedDates.forEach(date => {
      const dayExpenses = expensesByDate[date];
      
      expensesData.push([`=== ${formatDate(date)} ===`, '', '', '', '', '']);

      dayExpenses.forEach(exp => {
        const perPerson = exp.splitType === 'equal' 
          ? exp.amount / group.participants.length 
          : 0;

        group.participants.forEach(person => {
          const share = exp.splitType === 'equal' 
            ? perPerson 
            : (exp.splits[person] || 0);
          const paid = exp.paidBy === person ? exp.amount : 0;
          const balance = paid - share;

          splitData.push([
            formatDate(exp.date),
            exp.description,
            person,
            share.toFixed(2),
            paid.toFixed(2),
            balance.toFixed(2)
          ]);
        });

        splitData.push(['']); // Empty row after each expense
      });
    });

    const wsSplit = XLSX.utils.aoa_to_sheet(splitData);
    wsSplit['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSplit, 'Split Details');

    // Sheet 4: Settlement Summary
    const settlementData = [
      ['Settlement Summary'],
      [''],
      ['Participant', 'Total Paid', 'Total Owed', 'Balance', 'Status']
    ];

    const balances = {};
    const totalPaid = {};
    const totalOwed = {};

    group.participants.forEach(p => {
      balances[p] = 0;
      totalPaid[p] = 0;
      totalOwed[p] = 0;
    });

    (group.expenses || []).forEach(exp => {
      const perPerson = exp.splitType === 'equal' 
        ? exp.amount / group.participants.length 
        : 0;

      group.participants.forEach(person => {
        const owes = exp.splitType === 'equal' 
          ? perPerson 
          : (exp.splits[person] || 0);
        const paid = exp.paidBy === person ? exp.amount : 0;
        
        totalPaid[person] += paid;
        totalOwed[person] += owes;
        balances[person] += paid - owes;
      });
    });

    group.participants.forEach(person => {
      const balance = balances[person];
      const status = balance > 0.01 ? 'Gets Back' : balance < -0.01 ? 'Needs to Pay' : 'Settled';
      
      settlementData.push([
        person,
        totalPaid[person].toFixed(2),
        totalOwed[person].toFixed(2),
        balance.toFixed(2),
        status
      ]);
    });

    settlementData.push(['']);
    settlementData.push(['Payment Instructions']);
    settlementData.push(['']);

    const settlements = calculateDaySettlement(group.expenses || [], group.participants, group.currency);
    
    if (settlements.length === 0) {
      settlementData.push(['All payments are settled!']);
    } else {
      settlements.forEach((instruction, index) => {
        settlementData.push([`${index + 1}. ${instruction}`]);
      });
    }

    const wsSettlement = XLSX.utils.aoa_to_sheet(settlementData);
    wsSettlement['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSettlement, 'Settlement');

    // Export file
    const filename = `${group.name.replace(/[^a-z0-9]/gi, '_')}_${getTimestamp()}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast('Excel file exported successfully!');
    
  } catch (error) {
    console.error('Excel export error:', error);
    showToast('Error exporting to Excel: ' + error.message);
  }
}

// Export as formatted CSV
function exportExpenseGroupCSV(group) {
  let csv = '';
  
  // Summary section
  csv += `Expense Group Report\n\n`;
  csv += `Group Name,${group.name}\n`;
  csv += `Description,${group.description || 'N/A'}\n`;
  csv += `Period,${formatDate(group.startDate)} to ${formatDate(group.endDate)}\n`;
  csv += `Currency,${group.currency}\n`;
  csv += `Participants,"${group.participants.join(', ')}"\n`;
  csv += `Total Expenses,${(group.expenses || []).length}\n`;
  csv += `Status,${group.settled ? 'Settled' : 'Pending'}\n\n`;

  // Detailed expenses
  csv += `\nDetailed Expenses\n`;
  csv += `Date,Description,Amount,Paid By,Split Type,Notes\n`;

  const expensesByDate = {};
  (group.expenses || []).forEach(exp => {
    if (!expensesByDate[exp.date]) {
      expensesByDate[exp.date] = [];
    }
    expensesByDate[exp.date].push(exp);
  });

  const sortedDates = Object.keys(expensesByDate).sort();
  let grandTotal = 0;

  sortedDates.forEach(date => {
    const dayExpenses = expensesByDate[date];
    const dayTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    grandTotal += dayTotal;

    csv += `\n=== ${formatDate(date)} ===\n`;

    dayExpenses.forEach(exp => {
      csv += `${formatDate(exp.date)},"${exp.description}",${exp.amount},${exp.paidBy},${exp.splitType === 'equal' ? 'Equal Split' : 'Custom Split'},"${exp.notes || ''}"\n`;
    });

    csv += `,Day Total,${dayTotal}\n`;
  });

  csv += `\n,GRAND TOTAL,${grandTotal}\n`;

  // Settlement summary
  csv += `\n\nSettlement Summary\n`;
  csv += `Participant,Total Paid,Total Owed,Balance,Status\n`;

  const balances = {};
  const totalPaid = {};
  const totalOwed = {};

  group.participants.forEach(p => {
    balances[p] = 0;
    totalPaid[p] = 0;
    totalOwed[p] = 0;
  });

  (group.expenses || []).forEach(exp => {
    const perPerson = exp.splitType === 'equal' 
      ? exp.amount / group.participants.length 
      : 0;

    group.participants.forEach(person => {
      const owes = exp.splitType === 'equal' 
        ? perPerson 
        : (exp.splits[person] || 0);
      const paid = exp.paidBy === person ? exp.amount : 0;
      
      totalPaid[person] += paid;
      totalOwed[person] += owes;
      balances[person] += paid - owes;
    });
  });

  group.participants.forEach(person => {
    const balance = balances[person];
    const status = balance > 0.01 ? 'Gets Back' : balance < -0.01 ? 'Needs to Pay' : 'Settled';
    
    csv += `${person},${totalPaid[person].toFixed(2)},${totalOwed[person].toFixed(2)},${balance.toFixed(2)},${status}\n`;
  });

  csv += `\n\nPayment Instructions\n`;
  
  const settlements = calculateDaySettlement(group.expenses || [], group.participants, group.currency);
  
  if (settlements.length === 0) {
    csv += `All payments are settled!\n`;
  } else {
    settlements.forEach((instruction, index) => {
      csv += `${index + 1}. ${instruction}\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const filename = `${group.name.replace(/[^a-z0-9]/gi, '_')}_${getTimestamp()}.csv`;
  downloadFile(blob, filename);
  showToast('CSV file exported successfully!');
}

// Export as JSON (formatted)
function exportExpenseGroupJSON(group) {
  const exportData = {
    groupInfo: {
      name: group.name,
      description: group.description,
      currency: group.currency,
      period: {
        start: group.startDate,
        end: group.endDate
      },
      participants: group.participants,
      status: group.settled ? 'Settled' : 'Pending'
    },
    expenses: (group.expenses || []).map(exp => ({
      date: exp.date,
      description: exp.description,
      amount: exp.amount,
      paidBy: exp.paidBy,
      splitType: exp.splitType,
      customSplits: exp.splitType === 'custom' ? exp.splits : null,
      notes: exp.notes
    })),
    settlement: generateSettlementJSON(group)
  };

  const filename = `${group.name.replace(/[^a-z0-9]/gi, '_')}_${getTimestamp()}.json`;
  exportToJSON(exportData, filename.replace('.json', ''));
  showToast('JSON file exported successfully!');
}

function generateSettlementJSON(group) {
  const balances = {};
  const totalPaid = {};
  const totalOwed = {};

  group.participants.forEach(p => {
    balances[p] = 0;
    totalPaid[p] = 0;
    totalOwed[p] = 0;
  });

  (group.expenses || []).forEach(exp => {
    const perPerson = exp.splitType === 'equal' 
      ? exp.amount / group.participants.length 
      : 0;

    group.participants.forEach(person => {
      const owes = exp.splitType === 'equal' 
        ? perPerson 
        : (exp.splits[person] || 0);
      const paid = exp.paidBy === person ? exp.amount : 0;
      
      totalPaid[person] += paid;
      totalOwed[person] += owes;
      balances[person] += paid - owes;
    });
  });

  const summary = group.participants.map(person => ({
    participant: person,
    totalPaid: parseFloat(totalPaid[person].toFixed(2)),
    totalOwed: parseFloat(totalOwed[person].toFixed(2)),
    balance: parseFloat(balances[person].toFixed(2)),
    status: balances[person] > 0.01 ? 'Gets Back' : balances[person] < -0.01 ? 'Needs to Pay' : 'Settled'
  }));

  const settlements = calculateDaySettlement(group.expenses || [], group.participants, group.currency);

  return {
    individualBalances: summary,
    paymentInstructions: settlements
  };
}
