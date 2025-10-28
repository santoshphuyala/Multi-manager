// Vehicle Manager Module

async function loadVehicles() {
  const vehicles = await db.getAll('vehicles');
  const container = document.getElementById('vehicleList');

  if (vehicles.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🚗</div>
        <p>No vehicles added yet</p>
        <button onclick="showAddVehicle()" class="btn btn-primary">Add Your First Vehicle</button>
      </div>
    `;
    return;
  }

  container.innerHTML = vehicles.map(vehicle => {
    const totalExpenses = (vehicle.fuelLogs || []).reduce((sum, log) => sum + log.cost, 0) +
                         (vehicle.maintenanceHistory || []).reduce((sum, m) => sum + m.cost, 0);

    return `
      <div class="item-card">
        <div class="vehicle-header">
          <div class="vehicle-icon">${getVehicleIcon(vehicle.type)}</div>
          <div class="vehicle-info">
            <h3>${vehicle.make} ${vehicle.model}</h3>
            <p>${vehicle.year} • ${vehicle.licensePlate}</p>
          </div>
          <div class="item-actions">
            <button class="icon-btn" onclick="addFuelLog(${vehicle.id})" title="Add Fuel">⛽</button>
            <button class="icon-btn" onclick="addMaintenance(${vehicle.id})" title="Add Service">🔧</button>
            <button class="icon-btn" onclick="editVehicle(${vehicle.id})" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteVehicle(${vehicle.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          <div class="item-detail"><strong>VIN:</strong> ${vehicle.vin || 'N/A'}</div>
          <div class="item-detail"><strong>Current Odometer:</strong> ${vehicle.currentOdometer?.toLocaleString() || 0} ${vehicle.unit || 'km'}</div>
          <div class="item-detail"><strong>Insurance Expiry:</strong> ${vehicle.insuranceExpiry ? formatDate(vehicle.insuranceExpiry) : 'Not set'}</div>
          <div class="item-detail"><strong>Registration Expiry:</strong> ${vehicle.registrationExpiry ? formatDate(vehicle.registrationExpiry) : 'Not set'}</div>
          <div class="item-detail"><strong>Total Expenses:</strong> ${formatCurrency(totalExpenses, vehicle.currency)}</div>
          
          ${vehicle.maintenanceHistory && vehicle.maintenanceHistory.length > 0 ? `
            <div class="maintenance-list">
              <h4 style="margin-bottom: 0.5rem;">Recent Services</h4>
              ${vehicle.maintenanceHistory.slice(-3).reverse().map(m => `
                <div class="maintenance-item">
                  <div>
                    <strong>${m.type}</strong><br>
                    <small>${formatDate(m.date)} • ${m.odometer.toLocaleString()} ${vehicle.unit}</small>
                  </div>
                  <div style="text-align: right;">
                    <strong>${formatCurrency(m.cost, vehicle.currency)}</strong>
                  </div>
                </div>
              `).join('')}
              <button onclick="viewVehicleDetails(${vehicle.id})" class="btn btn-secondary" style="width: 100%; margin-top: 0.5rem;">View All Details</button>
            </div>
          ` : '<p style="color: var(--text-secondary); margin-top: 1rem;">No maintenance history yet</p>'}
        </div>
      </div>
    `;
  }).join('');

  updateDashboard();
}

function getVehicleIcon(type) {
  const icons = {
    'Car': '🚗',
    'Motorcycle': '🏍️',
    'Truck': '🚚',
    'SUV': '🚙',
    'Van': '🚐',
    'Bicycle': '🚲',
    'Scooter': '🛵'
  };
  return icons[type] || '🚗';
}

function showAddVehicle() {
  const form = `
    <form onsubmit="saveVehicle(event)">
      <div class="form-group">
        <label for="vehType">Vehicle Type *</label>
        <select id="vehType" required>
          <option value="Car">Car</option>
          <option value="SUV">SUV</option>
          <option value="Truck">Truck</option>
          <option value="Motorcycle">Motorcycle</option>
          <option value="Scooter">Scooter</option>
          <option value="Van">Van</option>
          <option value="Bicycle">Bicycle</option>
        </select>
      </div>
      <div class="form-group">
        <label for="vehMake">Make *</label>
        <input type="text" id="vehMake" placeholder="e.g., Toyota, Honda" required>
      </div>
      <div class="form-group">
        <label for="vehModel">Model *</label>
        <input type="text" id="vehModel" placeholder="e.g., Camry, Civic" required>
      </div>
      <div class="form-group">
        <label for="vehYear">Year *</label>
        <input type="number" id="vehYear" min="1900" max="${new Date().getFullYear() + 1}" required>
      </div>
      <div class="form-group">
        <label for="vehLicense">License Plate *</label>
        <input type="text" id="vehLicense" required>
      </div>
      <div class="form-group">
        <label for="vehVin">VIN (Vehicle Identification Number)</label>
        <input type="text" id="vehVin" placeholder="17-digit VIN">
      </div>
      <div class="form-group">
        <label for="vehOdometer">Current Odometer Reading</label>
        <input type="number" id="vehOdometer" min="0" value="0">
      </div>
      <div class="form-group">
        <label for="vehUnit">Distance Unit</label>
        <select id="vehUnit">
          <option value="km">Kilometers</option>
          <option value="mi">Miles</option>
        </select>
      </div>
      <div class="form-group">
        <label for="vehCurrency">Currency</label>
        <select id="vehCurrency">
          <option value="NRs">NRs</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="INR">INR</option>
          <option value="JPY">JPY</option>
        </select>
      </div>
      ${createDateInput('vehInsuranceExpiry', 'Insurance Expiry Date')}
      ${createDateInput('vehRegistrationExpiry', 'Registration Expiry Date')}
      <div class="form-group">
        <label for="vehNotes">Notes</label>
        <textarea id="vehNotes" placeholder="Additional information..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Vehicle</button>
      </div>
    </form>
  `;

  openModal('Add Vehicle', form);
}

async function saveVehicle(event) {
  event.preventDefault();

  const vehicle = {
    type: document.getElementById('vehType').value,
    make: document.getElementById('vehMake').value,
    model: document.getElementById('vehModel').value,
    year: parseInt(document.getElementById('vehYear').value),
    licensePlate: document.getElementById('vehLicense').value,
    vin: document.getElementById('vehVin').value,
    currentOdometer: parseFloat(document.getElementById('vehOdometer').value) || 0,
    unit: document.getElementById('vehUnit').value,
    currency: document.getElementById('vehCurrency').value,
    insuranceExpiry: document.getElementById('vehInsuranceExpiry').value || null,
    registrationExpiry: document.getElementById('vehRegistrationExpiry').value || null,
    notes: document.getElementById('vehNotes').value,
    fuelLogs: [],
    maintenanceHistory: []
  };

  const id = document.getElementById('vehId')?.value;

  try {
    if (id) {
      vehicle.id = parseInt(id);
      const oldVehicle = await db.get('vehicles', vehicle.id);
      vehicle.fuelLogs = oldVehicle.fuelLogs || [];
      vehicle.maintenanceHistory = oldVehicle.maintenanceHistory || [];
      await db.update('vehicles', vehicle);
      showToast('Vehicle updated successfully!');
    } else {
      await db.add('vehicles', vehicle);
      showToast('Vehicle added successfully!');
    }

    closeModal();
    loadVehicles();
  } catch (error) {
    showToast('Error saving vehicle: ' + error.message);
  }
}

async function addFuelLog(id) {
  const vehicle = await db.get('vehicles', id);

  const form = `
    <form onsubmit="saveFuelLog(event, ${id})">
      ${createDateInput('fuelDate', 'Date *', new Date().toISOString().split('T')[0])}
      <div class="form-group">
        <label for="fuelOdometer">Odometer Reading *</label>
        <input type="number" id="fuelOdometer" min="0" value="${vehicle.currentOdometer}" required>
      </div>
      <div class="form-group">
        <label for="fuelAmount">Fuel Amount (Liters/Gallons) *</label>
        <input type="number" id="fuelAmount" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label for="fuelCost">Cost *</label>
        <input type="number" id="fuelCost" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label for="fuelStation">Gas Station</label>
        <input type="text" id="fuelStation" placeholder="Station name/location">
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="fuelFullTank" checked>
          Full tank
        </label>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Fuel Log</button>
      </div>
    </form>
  `;

  openModal('Add Fuel Log', form);
}

async function saveFuelLog(event, vehicleId) {
  event.preventDefault();

  const vehicle = await db.get('vehicles', vehicleId);

  const fuelLog = {
    date: document.getElementById('fuelDate').value,
    odometer: parseFloat(document.getElementById('fuelOdometer').value),
    amount: parseFloat(document.getElementById('fuelAmount').value),
    cost: parseFloat(document.getElementById('fuelCost').value),
    station: document.getElementById('fuelStation').value,
    fullTank: document.getElementById('fuelFullTank').checked
  };

  if (!vehicle.fuelLogs) vehicle.fuelLogs = [];
  vehicle.fuelLogs.push(fuelLog);
  vehicle.currentOdometer = fuelLog.odometer;

  await db.update('vehicles', vehicle);
  showToast('Fuel log added successfully!');
  closeModal();
  loadVehicles();
}

async function addMaintenance(id) {
  const vehicle = await db.get('vehicles', id);

  const form = `
    <form onsubmit="saveMaintenance(event, ${id})">
      ${createDateInput('maintDate', 'Date *', new Date().toISOString().split('T')[0])}
      <div class="form-group">
        <label for="maintType">Service Type *</label>
        <select id="maintType" required>
          <option value="Oil Change">Oil Change</option>
          <option value="Tire Rotation">Tire Rotation</option>
          <option value="Brake Service">Brake Service</option>
          <option value="Battery Replacement">Battery Replacement</option>
          <option value="Air Filter">Air Filter</option>
          <option value="Transmission">Transmission Service</option>
          <option value="Inspection">General Inspection</option>
          <option value="Repair">Repair</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="maintOdometer">Odometer Reading *</label>
        <input type="number" id="maintOdometer" min="0" value="${vehicle.currentOdometer}" required>
      </div>
      <div class="form-group">
        <label for="maintCost">Cost *</label>
        <input type="number" id="maintCost" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <label for="maintProvider">Service Provider</label>
        <input type="text" id="maintProvider" placeholder="Garage/Dealer name">
      </div>
      <div class="form-group">
        <label for="maintNotes">Notes</label>
        <textarea id="maintNotes" placeholder="Details about the service..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Service Record</button>
      </div>
    </form>
  `;

  openModal('Add Maintenance', form);
}

async function saveMaintenance(event, vehicleId) {
  event.preventDefault();

  const vehicle = await db.get('vehicles', vehicleId);

  const maintenance = {
    date: document.getElementById('maintDate').value,
    type: document.getElementById('maintType').value,
    odometer: parseFloat(document.getElementById('maintOdometer').value),
    cost: parseFloat(document.getElementById('maintCost').value),
    provider: document.getElementById('maintProvider').value,
    notes: document.getElementById('maintNotes').value
  };

  if (!vehicle.maintenanceHistory) vehicle.maintenanceHistory = [];
  vehicle.maintenanceHistory.push(maintenance);
  vehicle.currentOdometer = maintenance.odometer;

  await db.update('vehicles', vehicle);
  showToast('Maintenance record added successfully!');
  closeModal();
  loadVehicles();
}

async function viewVehicleDetails(id) {
  const vehicle = await db.get('vehicles', id);

  const totalFuelCost = (vehicle.fuelLogs || []).reduce((sum, log) => sum + log.cost, 0);
  const totalMaintenanceCost = (vehicle.maintenanceHistory || []).reduce((sum, m) => sum + m.cost, 0);

  let content = `
    <div class="vehicle-header">
      <div class="vehicle-icon" style="font-size: 4rem;">${getVehicleIcon(vehicle.type)}</div>
      <div class="vehicle-info">
        <h3>${vehicle.make} ${vehicle.model} ${vehicle.year}</h3>
        <p>${vehicle.licensePlate}</p>
      </div>
    </div>
    <div class="item-details" style="margin-top: 1rem;">
      <h4>Summary</h4>
      <div class="item-detail"><strong>Total Fuel Expenses:</strong> ${formatCurrency(totalFuelCost, vehicle.currency)}</div>
      <div class="item-detail"><strong>Total Maintenance:</strong> ${formatCurrency(totalMaintenanceCost, vehicle.currency)}</div>
      <div class="item-detail"><strong>Total Expenses:</strong> ${formatCurrency(totalFuelCost + totalMaintenanceCost, vehicle.currency)}</div>
      
      <h4 style="margin-top: 1.5rem;">Fuel Logs (${vehicle.fuelLogs?.length || 0})</h4>
      ${vehicle.fuelLogs && vehicle.fuelLogs.length > 0 ? `
        <div class="maintenance-list">
          ${vehicle.fuelLogs.slice(-10).reverse().map(log => `
            <div class="maintenance-item">
              <div>
                <strong>${formatDate(log.date)}</strong><br>
                <small>${log.amount} L • ${log.odometer.toLocaleString()} ${vehicle.unit}</small><br>
                <small>${log.station || 'N/A'}</small>
              </div>
              <div style="text-align: right;">
                <strong>${formatCurrency(log.cost, vehicle.currency)}</strong>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p style="text-align: center; color: var(--text-secondary);">No fuel logs yet</p>'}
      
      <h4 style="margin-top: 1.5rem;">Maintenance History (${vehicle.maintenanceHistory?.length || 0})</h4>
      ${vehicle.maintenanceHistory && vehicle.maintenanceHistory.length > 0 ? `
        <div class="maintenance-list">
          ${vehicle.maintenanceHistory.slice().reverse().map(m => `
            <div class="maintenance-item">
              <div>
                <strong>${m.type}</strong><br>
                <small>${formatDate(m.date)} • ${m.odometer.toLocaleString()} ${vehicle.unit}</small><br>
                <small>${m.provider || 'N/A'}</small>
                ${m.notes ? `<br><small>${m.notes}</small>` : ''}
              </div>
              <div style="text-align: right;">
                <strong>${formatCurrency(m.cost, vehicle.currency)}</strong>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p style="text-align: center; color: var(--text-secondary);">No maintenance history yet</p>'}
    </div>
  `;

  openModal(`${vehicle.make} ${vehicle.model} - Details`, content);
}

async function editVehicle(id) {
  const vehicle = await db.get('vehicles', id);

  const form = `
    <form onsubmit="saveVehicle(event)">
      <input type="hidden" id="vehId" value="${vehicle.id}">
      <div class="form-group">
        <label for="vehType">Vehicle Type *</label>
        <select id="vehType" required>
          <option value="Car" ${vehicle.type === 'Car' ? 'selected' : ''}>Car</option>
          <option value="Car" ${vehicle.type === 'Electric vehicle' ? 'selected' : ''}> EV Car</option>
          <option value="SUV" ${vehicle.type === 'SUV' ? 'selected' : ''}>SUV</option>
          <option value="Truck" ${vehicle.type === 'Truck' ? 'selected' : ''}>Truck</option>
          <option value="Motorcycle" ${vehicle.type === 'Motorcycle' ? 'selected' : ''}>Motorcycle</option>
          <option value="Scooter" ${vehicle.type === 'Scooter' ? 'selected' : ''}>Scooter</option>
          <option value="Van" ${vehicle.type === 'Van' ? 'selected' : ''}>Van</option>
          <option value="Bicycle" ${vehicle.type === 'Bicycle' ? 'selected' : ''}>Bicycle</option>
        </select>
      </div>
      <div class="form-group">
        <label for="vehMake">Make *</label>
        <input type="text" id="vehMake" value="${vehicle.make}" required>
      </div>
      <div class="form-group">
        <label for="vehModel">Model *</label>
        <input type="text" id="vehModel" value="${vehicle.model}" required>
      </div>
      <div class="form-group">
        <label for="vehYear">Year *</label>
        <input type="number" id="vehYear" value="${vehicle.year}" min="1900" max="${new Date().getFullYear() + 1}" required>
      </div>
      <div class="form-group">
        <label for="vehLicense">License Plate *</label>
        <input type="text" id="vehLicense" value="${vehicle.licensePlate}" required>
      </div>
      <div class="form-group">
        <label for="vehVin">VIN</label>
        <input type="text" id="vehVin" value="${vehicle.vin || ''}">
      </div>
      <div class="form-group">
        <label for="vehOdometer">Current Odometer Reading</label>
        <input type="number" id="vehOdometer" value="${vehicle.currentOdometer || 0}" min="0">
      </div>
      <div class="form-group">
        <label for="vehUnit">Distance Unit</label>
        <select id="vehUnit">
          <option value="km" ${vehicle.unit === 'km' ? 'selected' : ''}>Kilometers</option>
          <option value="mi" ${vehicle.unit === 'mi' ? 'selected' : ''}>Miles</option>
        </select>
      </div>
      <div class="form-group">
        <label for="vehCurrency">Currency</label>
        <select id="vehCurrency">
        <option value="NRs" ${Vehicle.currency === 'NRs' ? 'selected' : ''}>NRs</option>
          <option value="USD" ${vehicle.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${vehicle.currency === 'EUR' ? 'selected' : ''}>EUR</option>
          <option value="GBP" ${vehicle.currency === 'GBP' ? 'selected' : ''}>GBP</option>
          <option value="INR" ${vehicle.currency === 'INR' ? 'selected' : ''}>INR</option>
          <option value="JPY" ${vehicle.currency === 'JPY' ? 'selected' : ''}>JPY</option>
        </select>
      </div>
      ${createDateInput('vehInsuranceExpiry', 'Insurance Expiry Date', vehicle.insuranceExpiry || '')}
      ${createDateInput('vehRegistrationExpiry', 'Registration Expiry Date', vehicle.registrationExpiry || '')}
      <div class="form-group">
        <label for="vehNotes">Notes</label>
        <textarea id="vehNotes">${vehicle.notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Vehicle</button>
      </div>
    </form>
  `;

  openModal('Edit Vehicle', form);
}

async function deleteVehicle(id) {
  if (confirmAction('Are you sure you want to delete this vehicle and all its records?')) {
    await db.delete('vehicles', id);
    showToast('Vehicle deleted successfully!');
    loadVehicles();
  }
}
