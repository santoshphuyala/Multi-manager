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

/**
 * --- Helper Functions for CSV Conversion and Download ---
 * (These must be present in your file)
 */

// 1. Converts an array of objects to a CSV string.
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    // Use the keys of the first object as headers
    const headers = Object.keys(data[0]);
    const headerRow = headers.map(h => `"${h}"`).join(',') + '\n';
    
    const dataRows = data.map(obj => {
        return headers.map(header => {
            let value = obj[header] === null || obj[header] === undefined ? '' : String(obj[header]);
            // Simple logic to escape quotes and wrap value if it contains a comma or quote
            value = value.replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    }).join('\n');

    return headerRow + dataRows;
}

// 2. Triggers a download of generic content.
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // Append to body, click, and remove to trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the URL object
}


/**
 * --- Main Export Function ---
 * Handles fetching data and calling the correct download method.
 * @param {('json'|'csv')} format - The desired export format.
 */
async function exportData(format) {
    // Hide the dropdown after selection (assuming it has the 'show' class)
    const dropdown = document.getElementById('export-options');
    if (dropdown) dropdown.classList.remove('show');

    try {
        // 1. Fetch Data
        const data = await db.exportData();
        
        if (!data || data.length === 0) {
            showToast('No data found to export.');
            return;
        }

        // 2. Prepare Metadata
        const timestamp = new Date().toISOString().split('T')[0];
        const baseName = `multi-manager-backup-${timestamp}`;

        // 3. Process and Download
        let content, fileName, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify(data, null, 2); // Pretty-printed JSON
                fileName = `${baseName}.json`;
                mimeType = 'application/json';
                break;
                
            case 'csv':
                // Assumes your data is an array of objects for CSV conversion
                content = convertToCSV(data);
                fileName = `${baseName}.csv`;
                mimeType = 'text/csv;charset=utf-8;';
                break;
                
            default:
                showToast(`Unsupported format: ${format}`);
                return;
        }

        downloadFile(content, fileName, mimeType);
        showToast(`Data successfully exported as ${format.toUpperCase()}!`);

    } catch (error) {
        console.error('Export Error:', error);
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
