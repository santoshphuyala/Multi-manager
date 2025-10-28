// Enhanced Settings Module - COMPLETE REWRITE FOR WORKING IMPORT/EXPORT

function loadSettings() {
  const pinEnabled = storage.get('pinEnabled');
  if (pinEnabled) {
    document.getElementById('enablePin').checked = true;
    document.getElementById('pinSettings').classList.remove('hidden');
  }

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

// ==================== EXPORT ALL DATA ====================

async function exportAllDataFormat(format) {
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  try {
    console.log('Starting export in format:', format);
    const data = await db.exportData();
    console.log('Data retrieved for export:', data);
    
    const baseFilename = 'MultiManager-Backup';
    
    switch(format) {
      case 'json':
        exportToJSON(data, baseFilename);
        showToast('Backup exported as JSON!');
        break;
      case 'csv':
        await exportAllAsCSV(data, baseFilename);
        break;
      case 'xlsx':
        await exportAllAsExcel(data, baseFilename);
        break;
      default:
        showToast('Invalid format');
    }
  } catch (error) {
    console.error('Export error:', error);
    showToast('Error exporting: ' + error.message);
  }
}

async function exportAllAsCSV(data, baseFilename) {
  let exportedCount = 0;
  
  const stores = ['medicines', 'subscriptions', 'expenseGroups', 'travels', 'insurances', 'bills', 'vehicles', 'pets'];
  
  for (const store of stores) {
    if (data[store] && data[store].length > 0) {
      if (store === 'expenseGroups') {
        const csvData = data[store].map(group => ({
          name: group.name,
          description: group.description || '',
          currency: group.currency || 'NRs',
          startDate: group.startDate,
          endDate: group.endDate,
          participants: (group.participants || []).join('; '),
          expenseCount: (group.expenses || []).length,
          settled: group.settled ? 'Yes' : 'No'
        }));
        exportToCSV(csvData, `${baseFilename}-ExpenseGroups`);
      } else {
        exportToCSV(data[store], `${baseFilename}-${store}`);
      }
      exportedCount++;
    }
  }
  
  showToast(`Exported ${exportedCount} modules as CSV!`);
}

async function exportAllAsExcel(data, baseFilename) {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded');
    return;
  }

  try {
    const wb = XLSX.utils.book_new();
    let sheetCount = 0;
    
    const storeMap = {
      'medicines': 'Medicines',
      'subscriptions': 'Subscriptions',
      'expenseGroups': 'Expense Groups',
      'travels': 'Travels',
      'insurances': 'Insurances',
      'bills': 'Bills',
      'vehicles': 'Vehicles',
      'pets': 'Pets'
    };
    
    for (const [key, sheetName] of Object.entries(storeMap)) {
      if (data[key] && data[key].length > 0) {
        let wsData;
        
        if (key === 'expenseGroups') {
          wsData = data[key].map(group => ({
            name: group.name,
            description: group.description || '',
            currency: group.currency || 'NRs',
            startDate: group.startDate,
            endDate: group.endDate,
            participants: (group.participants || []).join('; '),
            expenseCount: (group.expenses || []).length,
            settled: group.settled ? 'Yes' : 'No'
          }));
        } else {
          wsData = data[key].map(item => flattenObject(item));
        }
        
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        sheetCount++;
      }
    }
    
    if (sheetCount > 0) {
      const filename = `${baseFilename}_${getTimestamp()}.xlsx`;
      XLSX.writeFile(wb, filename);
      showToast(`Exported ${sheetCount} modules to Excel!`);
    } else {
      showToast('No data to export');
    }
  } catch (error) {
    console.error('Excel export error:', error);
    showToast('Error exporting Excel: ' + error.message);
  }
}

// ==================== IMPORT ALL DATA ====================

function importAllDataFormat(format) {
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  if (format === 'json') {
    document.getElementById('importFileJSON').click();
  } else if (format === 'csv') {
    showToast('Please use JSON or Excel for full backup import');
  } else if (format === 'xlsx') {
    document.getElementById('importFileXLSX').click();
  }
}

async function handleImportFile(event, format) {
  const file = event.target.files[0];
  if (!file) return;

  console.log('Importing file:', file.name, 'Format:', format);

  try {
    if (format === 'json') {
      const data = await importFromJSON(file);
      console.log('Parsed JSON data:', data);
      
      if (!confirmAction('This will replace ALL existing data. Continue?')) {
        event.target.value = '';
        return;
      }
      
      await importCompleteData(data);
      
    } else if (format === 'xlsx') {
      if (!confirmAction('Import from Excel will replace existing data. Continue?')) {
        event.target.value = '';
        return;
      }
      
      await importFromExcel(file);
    }
  } catch (error) {
    console.error('Import error:', error);
    showToast('Error importing: ' + error.message);
  }

  event.target.value = '';
}

async function importCompleteData(data) {
  try {
    console.log('Starting complete data import...');
    
    const stores = ['medicines', 'subscriptions', 'expenseGroups', 'travels', 'insurances', 'bills', 'vehicles', 'pets', 'customCategories', 'customItems'];
    let totalImported = 0;
    
    for (const storeName of stores) {
      if (!data[storeName] || !Array.isArray(data[storeName])) {
        console.log(`No data for ${storeName}`);
        continue;
      }
      
      console.log(`Importing ${data[storeName].length} items to ${storeName}`);
      
      await db.clear(storeName);
      
      for (const item of data[storeName]) {
        try {
          const cleanItem = prepareItemForImport(item, storeName);
          if (cleanItem) {
            await db.add(storeName, cleanItem);
            totalImported++;
            console.log(`Imported item to ${storeName}:`, cleanItem);
          }
        } catch (err) {
          console.error(`Error importing item to ${storeName}:`, err, item);
        }
      }
    }
    
    console.log(`Total imported: ${totalImported}`);
    
    if (totalImported > 0) {
      showToast(`Successfully imported ${totalImported} items!`);
      setTimeout(() => {
        location.reload();
      }, 1500);
    } else {
      showToast('No valid data found to import');
    }
    
  } catch (error) {
    console.error('Complete import error:', error);
    showToast('Error during import: ' + error.message);
  }
}

function prepareItemForImport(item, storeName) {
  if (!item || typeof item !== 'object') return null;
  
  const cleanItem = {};
  
  // Copy all properties except id
  Object.keys(item).forEach(key => {
    if (key !== 'id') {
      cleanItem[key] = item[key];
    }
  });
  
  // Special handling for expense groups
  if (storeName === 'expenseGroups') {
    if (!cleanItem.name || !cleanItem.name.trim()) return null;
    
    cleanItem.name = cleanItem.name.trim();
    cleanItem.description = cleanItem.description || '';
    cleanItem.currency = cleanItem.currency || 'NRs';
    cleanItem.startDate = cleanItem.startDate || new Date().toISOString().split('T')[0];
    cleanItem.endDate = cleanItem.endDate || new Date().toISOString().split('T')[0];
    cleanItem.participants = Array.isArray(cleanItem.participants) ? cleanItem.participants : [];
    cleanItem.expenses = Array.isArray(cleanItem.expenses) ? cleanItem.expenses : [];
    cleanItem.settled = cleanItem.settled || false;
    
    if (cleanItem.participants.length === 0) return null;
  }
  
  // Check if item has any meaningful data
  const hasData = Object.keys(cleanItem).some(key => {
    const value = cleanItem[key];
    return value !== null && value !== undefined && value !== '';
  });
  
  return hasData ? cleanItem : null;
}

async function importFromExcel(file) {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded');
    return;
  }

  try {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        console.log('Excel sheets:', workbook.SheetNames);
        
        const storeMap = {
          'Medicines': 'medicines',
          'Subscriptions': 'subscriptions',
          'Expense Groups': 'expenseGroups',
          'Travels': 'travels',
          'Insurances': 'insurances',
          'Bills': 'bills',
          'Vehicles': 'vehicles',
          'Pets': 'pets'
        };
        
        const importData = {};
        
        for (const sheetName of workbook.SheetNames) {
          const storeName = storeMap[sheetName];
          if (!storeName) continue;
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (storeName === 'expenseGroups') {
            importData[storeName] = jsonData.map(row => ({
              name: row.name,
              description: row.description || '',
              currency: row.currency || 'NRs',
              startDate: row.startDate,
              endDate: row.endDate,
              participants: row.participants ? row.participants.split(';').map(p => p.trim()).filter(p => p) : [],
              expenses: [],
              settled: row.settled === 'Yes' || row.settled === true
            }));
          } else {
            importData[storeName] = jsonData;
          }
        }
        
        console.log('Parsed Excel data:', importData);
        await importCompleteData(importData);
        
      } catch (error) {
        console.error('Excel parse error:', error);
        showToast('Error reading Excel: ' + error.message);
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      showToast('Error reading file');
    };
    
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Excel import error:', error);
    showToast('Error importing Excel: ' + error.message);
  }
}

// ==================== MODULE EXPORT/IMPORT ====================

async function exportModuleData(storeName, moduleName, format) {
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  try {
    const data = await db.getAll(storeName);
    
    if (!data || data.length === 0) {
      showToast('No data to export');
      return;
    }

    console.log(`Exporting ${data.length} items from ${storeName}`);
    
    const filename = `${moduleName}_${getTimestamp()}`;
    
    switch(format) {
      case 'json':
        exportToJSON(data, filename);
        showToast(`${moduleName} exported as JSON!`);
        break;
      case 'csv':
        if (storeName === 'expenseGroups') {
          const csvData = data.map(group => ({
            name: group.name,
            description: group.description || '',
            currency: group.currency || 'NRs',
            startDate: group.startDate,
            endDate: group.endDate,
            participants: (group.participants || []).join('; '),
            expenseCount: (group.expenses || []).length,
            settled: group.settled ? 'Yes' : 'No'
          }));
          exportToCSV(csvData, filename);
        } else {
          exportToCSV(data, filename);
        }
        showToast(`${moduleName} exported as CSV!`);
        break;
      case 'xlsx':
        exportToXLSX(data, filename);
        showToast(`${moduleName} exported as Excel!`);
        break;
    }
  } catch (error) {
    console.error('Module export error:', error);
    showToast('Error exporting: ' + error.message);
  }
}

function importModuleData(storeName, format) {
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = format === 'json' ? '.json' : format === 'csv' ? '.csv' : '.xlsx,.xls';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log(`Importing to ${storeName} from ${file.name}`);
    
    try {
      let data;
      
      if (format === 'json') {
        data = await importFromJSON(file);
      } else if (format === 'csv') {
        data = await importFromCSV(file);
      } else if (format === 'xlsx') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        showToast('No valid data in file');
        return;
      }
      
      console.log(`Parsed ${data.length} items from file`);
      
      if (!confirmAction(`Import ${data.length} items? This will replace existing ${storeName} data.`)) {
        return;
      }
      
      await db.clear(storeName);
      let importedCount = 0;
      
      for (const item of data) {
        const cleanItem = prepareItemForImport(item, storeName);
        if (cleanItem) {
          await db.add(storeName, cleanItem);
          importedCount++;
        }
      }
      
      showToast(`Imported ${importedCount} items!`);
      
      // Reload module
      const loaders = {
        'medicines': loadMedicines,
        'subscriptions': loadSubscriptions,
        'expenseGroups': loadExpenses,
        'travels': loadTravels,
        'insurances': loadInsurances,
        'bills': loadBills,
        'vehicles': loadVehicles,
        'pets': loadPets
      };
      
      if (loaders[storeName]) {
        setTimeout(() => loaders[storeName](), 500);
      }
      
    } catch (error) {
      console.error('Module import error:', error);
      showToast('Error importing: ' + error.message);
    }
  };
  
  input.click();
}

// ==================== CUSTOM DATA ====================

async function exportCustomData(format) {
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  try {
    const categories = await db.getAll('customCategories');
    const items = await db.getAll('customItems');
    
    if (categories.length === 0 && items.length === 0) {
      showToast('No custom data to export');
      return;
    }
    
    const data = { categories, items };
    const filename = 'CustomData_' + getTimestamp();
    
    if (format === 'json') {
      exportToJSON(data, filename);
      showToast('Custom data exported!');
    } else {
      showToast('Please use JSON format for custom data');
    }
  } catch (error) {
    showToast('Error exporting: ' + error.message);
  }
}

async function importCustomData(format) {
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const data = await importFromJSON(file);
      
      if (!confirmAction('Import custom data? This will replace existing custom data.')) {
        return;
      }
      
      let count = 0;
      
      if (data.categories && Array.isArray(data.categories)) {
        await db.clear('customCategories');
        for (const cat of data.categories) {
          delete cat.id;
          await db.add('customCategories', cat);
          count++;
        }
      }
      
      if (data.items && Array.isArray(data.items)) {
        await db.clear('customItems');
        for (const item of data.items) {
          delete item.id;
          await db.add('customItems', item);
          count++;
        }
      }
      
      showToast(`Imported ${count} custom items!`);
      loadCustomCategories();
      
    } catch (error) {
      showToast('Error importing: ' + error.message);
    }
  };
  
  input.click();
}

// ==================== CLEAR DATA ====================

async function clearAllData() {
  if (!confirmAction('Delete ALL data? This CANNOT be undone!')) return;
  if (!confirmAction('Last warning: ALL data will be permanently deleted!')) return;

  try {
    const stores = ['medicines', 'subscriptions', 'expenseGroups', 'travels', 'insurances', 'bills', 'vehicles', 'pets', 'customCategories', 'customItems'];
    
    for (const store of stores) {
      await db.clear(store);
    }
    
    showToast('All data cleared!');
    setTimeout(() => location.reload(), 1000);
  } catch (error) {
    showToast('Error clearing data: ' + error.message);
  }
}
