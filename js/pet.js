// Pet Manager Module

async function loadPets() {
  const pets = await db.getAll('pets');
  const container = document.getElementById('petList');

  if (pets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🐾</div>
        <p>No pets added yet</p>
        <button onclick="showAddPet()" class="btn btn-primary">Add Your First Pet</button>
      </div>
    `;
    return;
  }

  container.innerHTML = pets.map(pet => {
    const age = calculateAge(pet.birthDate);
    const upcomingVaccinations = (pet.vaccinations || []).filter(v => {
      if (!v.nextDue) return false;
      const nextDue = new Date(v.nextDue);
      const today = new Date();
      return nextDue > today && nextDue <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    });

    return `
      <div class="item-card">
        <div class="pet-header-info">
          <div class="pet-avatar">${getPetIcon(pet.species)}</div>
          <div style="flex: 1;">
            <div class="item-header">
              <h3 class="item-title">${pet.name}</h3>
              <div class="item-actions">
                <button class="icon-btn" onclick="viewPetDetails(${pet.id})" title="View Details">👁️</button>
                <button class="icon-btn" onclick="editPet(${pet.id})" title="Edit">✏️</button>
                <button class="icon-btn" onclick="deletePet(${pet.id})" title="Delete">🗑️</button>
              </div>
            </div>
            <div class="item-details">
              <div class="item-detail"><strong>Species:</strong> ${pet.species} ${pet.breed ? `(${pet.breed})` : ''}</div>
              <div class="item-detail"><strong>Age:</strong> ${age}</div>
              ${pet.gender ? `<div class="item-detail"><strong>Gender:</strong> ${pet.gender}</div>` : ''}
              ${pet.weight ? `<div class="item-detail"><strong>Weight:</strong> ${pet.weight} ${pet.weightUnit || 'kg'}</div>` : ''}
              ${pet.microchipId ? `<div class="item-detail"><strong>Microchip:</strong> ${pet.microchipId}</div>` : ''}
              ${upcomingVaccinations.length > 0 ? `
                <div class="item-detail">
                  <span class="item-badge badge-upcoming">
                    ${upcomingVaccinations.length} vaccination(s) due soon
                  </span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateDashboard();
}

function getPetIcon(species) {
  const icons = {
    'Dog': '🐕',
    'Cat': '🐈',
    'Bird': '🦜',
    'Fish': '🐠',
    'Rabbit': '🐰',
    'Hamster': '🐹',
    'Turtle': '🐢',
    'Horse': '🐴',
    'Other': '🐾'
  };
  return icons[species] || '🐾';
}

function calculateAge(birthDate) {
  if (!birthDate) return 'Unknown';

  const birth = new Date(birthDate);
  const today = new Date();

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''}`;
  } else {
    return `${months} month${months > 1 ? 's' : ''}`;
  }
}

function showAddPet() {
  const form = `
    <form onsubmit="savePet(event)">
      <div class="form-group">
        <label for="petName">Pet Name *</label>
        <input type="text" id="petName" placeholder="e.g., Max, Luna" required>
      </div>
      <div class="form-group">
        <label for="petSpecies">Species *</label>
        <select id="petSpecies" required>
          <option value="Dog">Dog</option>
          <option value="Cat">Cat</option>
          <option value="Bird">Bird</option>
          <option value="Fish">Fish</option>
          <option value="Rabbit">Rabbit</option>
          <option value="Hamster">Hamster</option>
          <option value="Turtle">Turtle</option>
          <option value="Horse">Horse</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="petBreed">Breed</label>
        <input type="text" id="petBreed" placeholder="e.g., Golden Retriever">
      </div>
      <div class="form-group">
        <label for="petGender">Gender</label>
        <select id="petGender">
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>
      ${createDateInput('petBirthDate', 'Birth Date')}
      ${createDateInput('petAdoptionDate', 'Adoption Date')}
      <div class="form-group">
        <label for="petWeight">Weight</label>
        <input type="number" id="petWeight" step="0.1" min="0" placeholder="Weight">
      </div>
      <div class="form-group">
        <label for="petWeightUnit">Weight Unit</label>
        <select id="petWeightUnit">
          <option value="kg">Kilograms</option>
          <option value="lbs">Pounds</option>
        </select>
      </div>
      <div class="form-group">
        <label for="petColor">Color/Markings</label>
        <input type="text" id="petColor" placeholder="e.g., Brown, White spots">
      </div>
      <div class="form-group">
        <label for="petMicrochip">Microchip ID</label>
        <input type="text" id="petMicrochip" placeholder="15-digit microchip number">
      </div>
      <div class="form-group">
        <label for="petVet">Veterinarian</label>
        <input type="text" id="petVet" placeholder="Vet name and contact">
      </div>
      <div class="form-group">
        <label for="petNotes">Notes</label>
        <textarea id="petNotes" placeholder="Special needs, allergies, behavior..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Pet</button>
      </div>
    </form>
  `;

  openModal('Add Pet', form);
}

async function savePet(event) {
  event.preventDefault();

  const pet = {
    name: document.getElementById('petName').value,
    species: document.getElementById('petSpecies').value,
    breed: document.getElementById('petBreed').value,
    gender: document.getElementById('petGender').value,
    birthDate: document.getElementById('petBirthDate').value || null,
    adoptionDate: document.getElementById('petAdoptionDate').value || null,
    weight: parseFloat(document.getElementById('petWeight').value) || null,
    weightUnit: document.getElementById('petWeightUnit').value,
    color: document.getElementById('petColor').value,
    microchipId: document.getElementById('petMicrochip').value,
    veterinarian: document.getElementById('petVet').value,
    notes: document.getElementById('petNotes').value,
    vaccinations: [],
    medicalHistory: [],
    appointments: []
  };

  const id = document.getElementById('petId')?.value;

  try {
    if (id) {
      pet.id = parseInt(id);
      const oldPet = await db.get('pets', pet.id);
      pet.vaccinations = oldPet.vaccinations || [];
      pet.medicalHistory = oldPet.medicalHistory || [];
      pet.appointments = oldPet.appointments || [];
      await db.update('pets', pet);
      showToast('Pet updated successfully!');
    } else {
      await db.add('pets', pet);
      showToast('Pet added successfully!');
    }

    closeModal();
    loadPets();
  } catch (error) {
    showToast('Error saving pet: ' + error.message);
  }
}

async function viewPetDetails(id) {
  const pet = await db.get('pets', id);

  let content = `
    <div style="text-align: center;">
      <div class="pet-avatar" style="margin: 0 auto;">${getPetIcon(pet.species)}</div>
      <h3>${pet.name}</h3>
      <p>${pet.species} ${pet.breed ? `• ${pet.breed}` : ''}</p>
    </div>
    
    <div class="pet-tabs">
      <button class="pet-tab active" onclick="switchPetTab(event, 'info')">Info</button>
      <button class="pet-tab" onclick="switchPetTab(event, 'vaccinations')">Vaccinations</button>
      <button class="pet-tab" onclick="switchPetTab(event, 'medical')">Medical</button>
      <button class="pet-tab" onclick="switchPetTab(event, 'appointments')">Appointments</button>
    </div>
    
    <div id="petTabInfo" class="pet-tab-content active">
      <div class="item-details">
        ${pet.gender ? `<div class="item-detail"><strong>Gender:</strong> ${pet.gender}</div>` : ''}
        ${pet.birthDate ? `<div class="item-detail"><strong>Birth Date:</strong> ${formatDate(pet.birthDate)}</div>` : ''}
        ${pet.birthDate ? `<div class="item-detail"><strong>Age:</strong> ${calculateAge(pet.birthDate)}</div>` : ''}
        ${pet.adoptionDate ? `<div class="item-detail"><strong>Adoption Date:</strong> ${formatDate(pet.adoptionDate)}</div>` : ''}
        ${pet.weight ? `<div class="item-detail"><strong>Weight:</strong> ${pet.weight} ${pet.weightUnit}</div>` : ''}
        ${pet.color ? `<div class="item-detail"><strong>Color:</strong> ${pet.color}</div>` : ''}
        ${pet.microchipId ? `<div class="item-detail"><strong>Microchip:</strong> ${pet.microchipId}</div>` : ''}
        ${pet.veterinarian ? `<div class="item-detail"><strong>Veterinarian:</strong> ${pet.veterinarian}</div>` : ''}
        ${pet.notes ? `<div class="item-detail"><strong>Notes:</strong> ${pet.notes}</div>` : ''}
      </div>
      <button onclick="editPet(${pet.id}); closeModal();" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Edit Pet Info</button>
    </div>
    
    <div id="petTabVaccinations" class="pet-tab-content">
      ${pet.vaccinations && pet.vaccinations.length > 0 ? `
        <div class="maintenance-list">
          ${pet.vaccinations.map(v => `
            <div class="maintenance-item">
              <div>
                <strong>${v.name}</strong><br>
                <small>Given: ${formatDate(v.date)}</small><br>
                ${v.nextDue ? `<small>Next Due: ${formatDate(v.nextDue)}</small>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No vaccination records</p>'}
      <button onclick="addVaccination(${pet.id})" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Add Vaccination</button>
    </div>
    
    <div id="petTabMedical" class="pet-tab-content">
      ${pet.medicalHistory && pet.medicalHistory.length > 0 ? `
        <div class="maintenance-list">
          ${pet.medicalHistory.map(m => `
            <div class="maintenance-item">
              <div>
                <strong>${m.condition}</strong><br>
                <small>${formatDate(m.date)}</small><br>
                ${m.treatment ? `<small>Treatment: ${m.treatment}</small>` : ''}
                ${m.notes ? `<br><small>${m.notes}</small>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No medical history</p>'}
      <button onclick="addMedicalRecord(${pet.id})" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Add Medical Record</button>
    </div>
    
    <div id="petTabAppointments" class="pet-tab-content">
      ${pet.appointments && pet.appointments.length > 0 ? `
        <div class="maintenance-list">
          ${pet.appointments.slice().reverse().map(a => `
            <div class="maintenance-item">
              <div>
                <strong>${a.type}</strong><br>
                <small>${formatDate(a.date)} at ${a.time || 'N/A'}</small><br>
                ${a.location ? `<small>${a.location}</small>` : ''}
                ${a.notes ? `<br><small>${a.notes}</small>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No appointments scheduled</p>'}
      <button onclick="addAppointment(${pet.id})" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Add Appointment</button>
    </div>
  `;

  openModal(`${pet.name} - Details`, content);
}

function switchPetTab(event, tabName) {
  document.querySelectorAll('.pet-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.pet-tab-content').forEach(content => content.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(`petTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
}

async function addVaccination(petId) {
  closeModal();

  const form = `
    <form onsubmit="saveVaccination(event, ${petId})">
      <div class="form-group">
        <label for="vacName">Vaccine Name *</label>
        <input type="text" id="vacName" placeholder="e.g., Rabies, DHPP" required>
      </div>
      ${createDateInput('vacDate', 'Date Given *', new Date().toISOString().split('T')[0])}
      ${createDateInput('vacNextDue', 'Next Due Date')}
      <div class="form-group">
        <label for="vacVet">Administered By</label>
        <input type="text" id="vacVet" placeholder="Veterinarian name">
      </div>
      <div class="form-group">
        <label for="vacNotes">Notes</label>
        <textarea id="vacNotes" placeholder="Lot number, reactions, etc."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="viewPetDetails(${petId})" class="btn btn-secondary">Back</button>
        <button type="submit" class="btn btn-primary">Save Vaccination</button>
      </div>
    </form>
  `;

  openModal('Add Vaccination', form);
}

async function saveVaccination(event, petId) {
  event.preventDefault();

  const pet = await db.get('pets', petId);

  const vaccination = {
    name: document.getElementById('vacName').value,
    date: document.getElementById('vacDate').value,
    nextDue: document.getElementById('vacNextDue').value || null,
    veterinarian: document.getElementById('vacVet').value,
    notes: document.getElementById('vacNotes').value
  };

  if (!pet.vaccinations) pet.vaccinations = [];
  pet.vaccinations.push(vaccination);

  await db.update('pets', pet);
  showToast('Vaccination added successfully!');
  viewPetDetails(petId);
}

async function addMedicalRecord(petId) {
  closeModal();

  const form = `
    <form onsubmit="saveMedicalRecord(event, ${petId})">
      <div class="form-group">
        <label for="medCondition">Condition/Diagnosis *</label>
        <input type="text" id="medCondition" placeholder="e.g., Ear infection" required>
      </div>
      ${createDateInput('medDate', 'Date *', new Date().toISOString().split('T')[0])}
      <div class="form-group">
        <label for="medTreatment">Treatment</label>
        <input type="text" id="medTreatment" placeholder="Medication, procedure, etc.">
      </div>
      <div class="form-group">
        <label for="medVet">Veterinarian</label>
        <input type="text" id="medVet" placeholder="Veterinarian name">
      </div>
      <div class="form-group">
        <label for="medNotes">Notes</label>
        <textarea id="medNotes" placeholder="Additional details..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="viewPetDetails(${petId})" class="btn btn-secondary">Back</button>
        <button type="submit" class="btn btn-primary">Save Record</button>
      </div>
    </form>
  `;

  openModal('Add Medical Record', form);
}

async function saveMedicalRecord(event, petId) {
  event.preventDefault();

  const pet = await db.get('pets', petId);

  const medical = {
    condition: document.getElementById('medCondition').value,
    date: document.getElementById('medDate').value,
    treatment: document.getElementById('medTreatment').value,
    veterinarian: document.getElementById('medVet').value,
    notes: document.getElementById('medNotes').value
  };

  if (!pet.medicalHistory) pet.medicalHistory = [];
  pet.medicalHistory.push(medical);

  await db.update('pets', pet);
  showToast('Medical record added successfully!');
  viewPetDetails(petId);
}

async function addAppointment(petId) {
  closeModal();

  const form = `
    <form onsubmit="saveAppointment(event, ${petId})">
      <div class="form-group">
        <label for="apptType">Appointment Type *</label>
        <select id="apptType" required>
          <option value="Checkup">Regular Checkup</option>
          <option value="Vaccination">Vaccination</option>
          <option value="Grooming">Grooming</option>
          <option value="Dental">Dental Cleaning</option>
          <option value="Surgery">Surgery</option>
          <option value="Emergency">Emergency</option>
          <option value="Other">Other</option>
        </select>
      </div>
      ${createDateInput('apptDate', 'Date *')}
      <div class="form-group">
        <label for="apptTime">Time</label>
        <input type="time" id="apptTime">
      </div>
      <div class="form-group">
        <label for="apptLocation">Location</label>
        <input type="text" id="apptLocation" placeholder="Clinic name and address">
      </div>
      <div class="form-group">
        <label for="apptNotes">Notes</label>
        <textarea id="apptNotes" placeholder="Reason for visit, instructions..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="viewPetDetails(${petId})" class="btn btn-secondary">Back</button>
        <button type="submit" class="btn btn-primary">Save Appointment</button>
      </div>
    </form>
  `;

  openModal('Add Appointment', form);
}

async function saveAppointment(event, petId) {
  event.preventDefault();

  const pet = await db.get('pets', petId);

  const appointment = {
    type: document.getElementById('apptType').value,
    date: document.getElementById('apptDate').value,
    time: document.getElementById('apptTime').value,
    location: document.getElementById('apptLocation').value,
    notes: document.getElementById('apptNotes').value
  };

  if (!pet.appointments) pet.appointments = [];
  pet.appointments.push(appointment);

  await db.update('pets', pet);
  showToast('Appointment added successfully!');
  viewPetDetails(petId);
}

async function editPet(id) {
  const pet = await db.get('pets', id);

  const form = `
    <form onsubmit="savePet(event)">
      <input type="hidden" id="petId" value="${pet.id}">
      <div class="form-group">
        <label for="petName">Pet Name *</label>
        <input type="text" id="petName" value="${pet.name}" required>
      </div>
      <div class="form-group">
        <label for="petSpecies">Species *</label>
        <select id="petSpecies" required>
          <option value="Dog" ${pet.species === 'Dog' ? 'selected' : ''}>Dog</option>
          <option value="Cat" ${pet.species === 'Cat' ? 'selected' : ''}>Cat</option>
          <option value="Bird" ${pet.species === 'Bird' ? 'selected' : ''}>Bird</option>
          <option value="Fish" ${pet.species === 'Fish' ? 'selected' : ''}>Fish</option>
          <option value="Rabbit" ${pet.species === 'Rabbit' ? 'selected' : ''}>Rabbit</option>
          <option value="Hamster" ${pet.species === 'Hamster' ? 'selected' : ''}>Hamster</option>
          <option value="Turtle" ${pet.species === 'Turtle' ? 'selected' : ''}>Turtle</option>
          <option value="Horse" ${pet.species === 'Horse' ? 'selected' : ''}>Horse</option>
          <option value="Other" ${pet.species === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="petBreed">Breed</label>
        <input type="text" id="petBreed" value="${pet.breed || ''}">
      </div>
      <div class="form-group">
        <label for="petGender">Gender</label>
        <select id="petGender">
          <option value="">Select Gender</option>
          <option value="Male" ${pet.gender === 'Male' ? 'selected' : ''}>Male</option>
          <option value="Female" ${pet.gender === 'Female' ? 'selected' : ''}>Female</option>
        </select>
      </div>
      ${createDateInput('petBirthDate', 'Birth Date', pet.birthDate || '')}
      ${createDateInput('petAdoptionDate', 'Adoption Date', pet.adoptionDate || '')}
      <div class="form-group">
        <label for="petWeight">Weight</label>
        <input type="number" id="petWeight" step="0.1" value="${pet.weight || ''}">
      </div>
      <div class="form-group">
        <label for="petWeightUnit">Weight Unit</label>
        <select id="petWeightUnit">
          <option value="kg" ${pet.weightUnit === 'kg' ? 'selected' : ''}>Kilograms</option>
          <option value="lbs" ${pet.weightUnit === 'lbs' ? 'selected' : ''}>Pounds</option>
        </select>
      </div>
      <div class="form-group">
        <label for="petColor">Color/Markings</label>
        <input type="text" id="petColor" value="${pet.color || ''}">
      </div>
      <div class="form-group">
        <label for="petMicrochip">Microchip ID</label>
        <input type="text" id="petMicrochip" value="${pet.microchipId || ''}">
      </div>
      <div class="form-group">
        <label for="petVet">Veterinarian</label>
        <input type="text" id="petVet" value="${pet.veterinarian || ''}">
      </div>
      <div class="form-group">
        <label for="petNotes">Notes</label>
        <textarea id="petNotes">${pet.notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Pet</button>
      </div>
    </form>
  `;

  openModal('Edit Pet', form);
}

async function deletePet(id) {
  if (confirmAction('Are you sure you want to delete this pet and all its records?')) {
    await db.delete('pets', id);
    showToast('Pet deleted successfully!');
    loadPets();
  }
}