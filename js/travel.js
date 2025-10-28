// Travel Manager Module

async function loadTravels() {
  const travels = await db.getAll('travels');
  const container = document.getElementById('travelList');

  if (travels.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✈️</div>
        <p>No trips planned yet</p>
        <button onclick="showAddTravel()" class="btn btn-primary">Plan Your First Trip</button>
      </div>
    `;
    return;
  }

  container.innerHTML = travels.map(trip => {
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const today = new Date();
    const status = today < startDate ? 'upcoming' : today > endDate ? 'completed' : 'ongoing';

    return `
      <div class="item-card">
        <div class="item-header">
          <h3 class="item-title">${trip.destination}</h3>
          <div class="item-actions">
            <button class="icon-btn" onclick="editTravel(${trip.id})" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteTravel(${trip.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          <div class="item-detail"><strong>From:</strong> ${formatDate(trip.startDate)}</div>
          <div class="item-detail"><strong>To:</strong> ${formatDate(trip.endDate)}</div>
          ${trip.accommodation ? `<div class="item-detail"><strong>Accommodation:</strong> ${trip.accommodation}</div>` : ''}
          ${trip.transportation ? `<div class="item-detail"><strong>Transportation:</strong> ${trip.transportation}</div>` : ''}
          ${trip.budget ? `<div class="item-detail"><strong>Budget:</strong> ${formatCurrency(trip.budget, trip.currency)}</div>` : ''}
          ${trip.notes ? `<div class="item-detail"><strong>Notes:</strong> ${trip.notes}</div>` : ''}
          <div class="item-detail">
            <span class="item-badge ${status === 'upcoming' ? 'badge-upcoming' : status === 'ongoing' ? 'badge-active' : 'badge-inactive'}">
              ${status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateDashboard();
}

function showAddTravel() {
  const form = `
    <form onsubmit="saveTravel(event)">
      <div class="form-group">
        <label for="travelDest">Destination *</label>
        <input type="text" id="travelDest" placeholder="e.g., Paris, France" required>
      </div>
      ${createDateInput('travelStart', 'Start Date *')}
      ${createDateInput('travelEnd', 'End Date *')}
      <div class="form-group">
        <label for="travelAccommodation">Accommodation</label>
        <input type="text" id="travelAccommodation" placeholder="Hotel name, Airbnb, etc.">
      </div>
      <div class="form-group">
        <label for="travelTransportation">Transportation</label>
        <input type="text" id="travelTransportation" placeholder="Flight, Train, Car, etc.">
      </div>
      <div class="form-group">
        <label for="travelBudget">Budget</label>
        <input type="number" id="travelBudget" step="0.01" min="0">
      </div>
      <div class="form-group">
        <label for="travelCurrency">Currency</label>
        <select id="travelCurrency">
        <option value="NRs">NRs</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="INR">INR</option>
          <option value="JPY">JPY</option>
        </select>
      </div>
      <div class="form-group">
        <label for="travelNotes">Notes & Itinerary</label>
        <textarea id="travelNotes" placeholder="Places to visit, activities, contacts..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Trip</button>
      </div>
    </form>
  `;

  openModal('Plan New Trip', form);
}

async function saveTravel(event) {
  event.preventDefault();

  const travel = {
    destination: document.getElementById('travelDest').value,
    startDate: document.getElementById('travelStart').value,
    endDate: document.getElementById('travelEnd').value,
    accommodation: document.getElementById('travelAccommodation').value,
    transportation: document.getElementById('travelTransportation').value,
    budget: parseFloat(document.getElementById('travelBudget').value) || 0,
    currency: document.getElementById('travelCurrency').value,
    notes: document.getElementById('travelNotes').value
  };

  // Validate dates
  if (new Date(travel.endDate) < new Date(travel.startDate)) {
    showToast('End date must be after start date!');
    return;
  }

  const id = document.getElementById('travelId')?.value;

  try {
    if (id) {
      travel.id = parseInt(id);
      await db.update('travels', travel);
      showToast('Trip updated successfully!');
    } else {
      await db.add('travels', travel);
      showToast('Trip added successfully!');
    }

    closeModal();
    loadTravels();
  } catch (error) {
    showToast('Error saving trip: ' + error.message);
  }
}

async function editTravel(id) {
  const trip = await db.get('travels', id);

  const form = `
    <form onsubmit="saveTravel(event)">
      <input type="hidden" id="travelId" value="${trip.id}">
      <div class="form-group">
        <label for="travelDest">Destination *</label>
        <input type="text" id="travelDest" value="${trip.destination}" required>
      </div>
      ${createDateInput('travelStart', 'Start Date *', trip.startDate)}
      ${createDateInput('travelEnd', 'End Date *', trip.endDate)}
      <div class="form-group">
        <label for="travelAccommodation">Accommodation</label>
        <input type="text" id="travelAccommodation" value="${trip.accommodation || ''}">
      </div>
      <div class="form-group">
        <label for="travelTransportation">Transportation</label>
        <input type="text" id="travelTransportation" value="${trip.transportation || ''}">
      </div>
      <div class="form-group">
        <label for="travelBudget">Budget</label>
        <input type="number" id="travelBudget" step="0.01" value="${trip.budget || 0}">
      </div>
      <div class="form-group">
        <label for="travelCurrency">Currency</label>
        <select id="travelCurrency">
          <option value="NRs" ${trip.currency === 'NRs' ? 'selected' : ''}>NRs</option>
          <option value="USD" ${trip.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${trip.currency === 'EUR' ? 'selected' : ''}>EUR</option>
          <option value="GBP" ${trip.currency === 'GBP' ? 'selected' : ''}>GBP</option>
          <option value="INR" ${trip.currency === 'INR' ? 'selected' : ''}>INR</option>
          <option value="JPY" ${trip.currency === 'JPY' ? 'selected' : ''}>JPY</option>
        </select>
      </div>
      <div class="form-group">
        <label for="travelNotes">Notes & Itinerary</label>
        <textarea id="travelNotes">${trip.notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Trip</button>
      </div>
    </form>
  `;

  openModal('Edit Trip', form);
}

async function deleteTravel(id) {
  if (confirmAction('Are you sure you want to delete this trip?')) {
    await db.delete('travels', id);
    showToast('Trip deleted successfully!');
    loadTravels();
  }
}
