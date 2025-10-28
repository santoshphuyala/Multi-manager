// Main Application Controller

let currentModule = 'dashboard';

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize Database
    await db.init();
    console.log('App initialized successfully');

    // Check PIN Protection
    const pinEnabled = storage.get('pinEnabled');
    if (pinEnabled && storage.get('appPin')) {
      document.getElementById('pinLockScreen').classList.remove('hidden');
      document.getElementById('mainApp').classList.add('hidden');

      // Allow Enter key to submit PIN
      document.getElementById('pinInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPin();
      });
    } else {
      document.getElementById('pinLockScreen').classList.add('hidden');
      document.getElementById('mainApp').classList.remove('hidden');
    }

    // Load Settings
    loadSettings();

    // Load Dashboard
    updateDashboard();

    // Show Welcome Toast
    setTimeout(() => {
      showToast('Welcome to Multi Manager! 👋');
    }, 500);

  } catch (error) {
    console.error('Error initializing app:', error);
    showToast('Error initializing app. Please refresh the page.');
  }
});

// Module Navigation
function showModule(moduleName) {
  // Hide all modules
  document.querySelectorAll('.module').forEach(module => {
    module.classList.remove('active');
  });

  // Show selected module
  const selectedModule = document.getElementById(`${moduleName}Module`);
  if (selectedModule) {
    selectedModule.classList.add('active');
  }

  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Find and activate the correct nav item
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('onclick')?.includes(`'${moduleName}'`)) {
      item.classList.add('active');
    }
  });

  // Load module data
  switch (moduleName) {
    case 'medicine':
      loadMedicines();
      break;
    case 'subscription':
      loadSubscriptions();
      break;
    case 'expense':
      loadExpenses();
      break;
    case 'travel':
      loadTravels();
      break;
    case 'insurance':
      loadInsurances();
      break;
    case 'bill':
      loadBills();
      break;
    case 'vehicle':
      loadVehicles();
      break;
    case 'pet':
      loadPets();
      break;
    case 'custom':
      loadCustomCategories();
      break;
    case 'dashboard':
      updateDashboard();
      break;
  }

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    toggleSidebar();
  }

  currentModule = moduleName;
}

function showSettings() {
  showModule('settings');
}

// Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}

// REPLACE the updateDashboard function in app.js

async function updateDashboard() {
  try {
    const medicines = await db.getAll('medicines');
    const subscriptions = await db.getAll('subscriptions');
    const expenseGroups = await db.getAll('expenseGroups'); // CHANGED from expenses
    const travels = await db.getAll('travels');
    const insurances = await db.getAll('insurances');
    const bills = await db.getAll('bills');
    const vehicles = await db.getAll('vehicles');
    const pets = await db.getAll('pets');
    const customItems = await db.getAll('customItems');
    
    document.getElementById('medicineCount').textContent = medicines.length;
    document.getElementById('subscriptionCount').textContent = subscriptions.length;
    document.getElementById('expenseCount').textContent = expenseGroups.length; // CHANGED
    document.getElementById('travelCount').textContent = travels.length;
    document.getElementById('insuranceCount').textContent = insurances.length;
    document.getElementById('billCount').textContent = bills.length;
    document.getElementById('vehicleCount').textContent = vehicles.length;
    document.getElementById('petCount').textContent = pets.length;
    document.getElementById('customCount').textContent = customItems.length;
  } catch (error) {
    console.error('Error updating dashboard:', error);
  }
}

// Handle online/offline status
window.addEventListener('online', () => {
  showToast('You are back online! 🌐');
});

window.addEventListener('offline', () => {
  showToast('You are offline. Changes will be saved locally. 📴');
});

// Install PWA prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showToast('📲 You can install this app for a better experience!');
});

window.addEventListener('appinstalled', () => {
  showToast('App installed successfully! 🎉');
  deferredPrompt = null;
});

// Close modal on overlay click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modal');
  if (e.target === modal) {
    closeModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('modal');
    if (!modal.classList.contains('hidden')) {
      closeModal();
    }
  }
});
