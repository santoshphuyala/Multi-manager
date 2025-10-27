// Settings Module

function loadSettings() {
  // Load PIN setting
  const pinEnabled = storage.get('pinEnabled');
  if (pinEnabled) {
    document.getElementById('enablePin').checked = true;
    document.getElementById('pinSettings').classList.remove('hidden');
  }

  // Load theme setting
  const theme = storage.get('theme') || 'default';
  document.getElementById('themeSelect').value = theme;
  applyTheme(theme);
}

function togglePinProtection() {
  const enabled = document.getElementById('enablePin').checked;
  const pinSettings = document.getElementById('pinSettings');

  if (enabled) {
    pinSettings.classList.remove('hidden');
  } else {
    if (confirmAction('Are you sure you want to disable PIN protection?')) {
      storage.remove('appPin');
      storage.set('pinEnabled', false);
      pinSettings.classList.add('hidden');
      showToast('PIN protection disabled');
    } else {
      document.getElementById('enablePin').checked = true;
    }
  }
}

function setNewPin() {
  const newPin = document.getElementById('newPin').value;

  if (!/^\d{4}$/.test(newPin)) {
    showToast('PIN must be exactly 4 digits');
    return;
  }

  storage.set('appPin', newPin);
  storage.set('pinEnabled', true);
  showToast('PIN set successfully!');
  document.getElementById('newPin').value = '';
}

function verifyPin() {
  const inputPin = document.getElementById('pinInput').value;
  const storedPin = storage.get('appPin');

  if (inputPin === storedPin) {
    document.getElementById('pinLockScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('pinInput').value = '';
    document.getElementById('pinError').textContent = '';
  } else {
    document.getElementById('pinError').textContent = 'Incorrect PIN. Please try again.';
    document.getElementById('pinInput').value = '';
  }
}

function changeTheme() {
  const theme = document.getElementById('themeSelect').value;
  applyTheme(theme);
  storage.set('theme', theme);
  showToast('Theme changed successfully!');
}

function applyTheme(theme) {
  document.body.className = '';
  if (theme !== 'default') {
    document.body.classList.add(`theme-${theme}`);
  }
}

async function exportAllData() {
  try {
    const data = await db.exportData();
    const timestamp = new Date().toISOString().split('T')[0];
    exportToJSON(data, `multi-manager-backup-${timestamp}.json`);
    showToast('All data exported successfully!');
  } catch (error) {
    showToast('Error exporting data: ' + error.message);
  }
}

async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    let data;

    if (file.name.endsWith('.json')) {
      data = await importFromJSON(file);
      
      if (confirmAction('This will replace all existing data. Continue?')) {
        await db.importData(data);
        showToast('Data imported successfully!');
        setTimeout(() => location.reload(), 1000);
      }
    } else if (file.name.endsWith('.csv')) {
      showToast('CSV import: Please use JSON format for full backup import');
    } else {
      showToast('Unsupported file format. Please use JSON.');
    }
  } catch (error) {
    showToast('Error importing data: ' + error.message);
  }

  event.target.value = '';
}

async function clearAllData() {
  if (!confirmAction('Are you sure you want to delete ALL data? This cannot be undone!')) {
    return;
  }

  if (!confirmAction('This will permanently delete all medicines, subscriptions, expenses, travels, insurance, bills, vehicles, pets, and custom data. Continue?')) {
    return;
  }

  try {
    const stores = [
      'medicines',
      'subscriptions',
      'expenses',
      'travels',
      'insurances',
      'bills',
      'vehicles',
      'pets',
      'customCategories',
      'customItems'
    ];
    
    for (const store of stores) {
      await db.clear(store);
    }
    
    showToast('All data cleared successfully!');
    setTimeout(() => location.reload(), 1000);
  } catch (error) {
    showToast('Error clearing data: ' + error.message);
  }
}

// Individual module export functions
async function exportModuleData(moduleName, storeName) {
  try {
    const data = await db.getAll(storeName);
    if (data.length === 0) {
      showToast('No data to export');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];

    // Export as JSON
    exportToJSON(data, `${moduleName}-${timestamp}.json`);

    showToast(`${moduleName} data exported!`);
  } catch (error) {
    showToast('Error exporting: ' + error.message);
  }
}

function importData() {
  document.getElementById('importFile').click();
}

function exportData() {
  exportAllData();
}

async function backupAllData() {
  await exportAllData();
}