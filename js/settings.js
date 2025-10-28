// Enhanced Settings Module with Format Selection - FIXED VERSION

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

// Export All Data with Format Selection - FIXED
async function exportAllDataFormat(format) {
  // Close dropdown
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  try {
    const data = await db.exportData();
    const baseFilename = 'MultiManager-Full-Backup';
    
    switch(format) {
      case 'json':
        exportToJSON(data, baseFilename);
        showToast('Full backup exported as JSON!');
        break;
        
      case 'csv':
        // Export each module as separate CSV
        const stores = ['medicines', 'subscriptions', 'expenses', 'travels', 'insurances', 'bills', 'vehicles', 'pets', 'customCategories', 'customItems'];
        let exportedCount = 0;
        
        for (const store of stores) {
          if (data[store] && data[store].length > 0) {
            exportToCSV(data[store], `${baseFilename}-${store}`);
            exportedCount++;
          }
        }
        
        if (exportedCount > 0) {
          showToast(`${exportedCount} CSV files exported successfully!`);
        } else {
          showToast('No data to export');
        }
        break;
        
      case 'xlsx':
        // Create multi-sheet Excel file
        await exportAllToExcel(data, baseFilename);
        break;
        
      default:
        showToast('Invalid format selected');
    }
  } catch (error) {
    console.error('Export error:', error);
    showToast('Error exporting data: ' + error.message);
  }
}

// Export all data to multi-sheet Excel - FIXED
async function exportAllToExcel(data, baseFilename) {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded. Please refresh the page.');
    return;
  }

  try {
    const wb = XLSX.utils.book_new();
    let sheetCount = 0;
    
    const stores = {
      'medicines': 'Medicines',
      'subscriptions': 'Subscriptions',
      'expenses': 'Expenses',
      'travels': 'Travels',
      'insurances': 'Insurances',
      'bills': 'Bills',
      'vehicles': 'Vehicles',
      'pets': 'Pets',
      'customCategories': 'Custom Categories',
      'customItems': 'Custom Items'
    };
    
    for (const [key, sheetName] of Object.entries(stores)) {
      if (data[key] && data[key].length > 0) {
        const flattenedData = data[key].map(item => flattenObject(item));
        const ws = XLSX.utils.json_to_sheet(flattenedData);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        sheetCount++;
      }
    }
    
    if (sheetCount === 0) {
      showToast('No data to export');
      return;
    }
    
    const filename = `${baseFilename}_${getTimestamp()}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast(`Excel file with ${sheetCount} sheets exported successfully!`);
  } catch (error) {
    console.error('Excel export error:', error);
    showToast('Error creating Excel file: ' + error.message);
  }
}

// Import All Data with Format Selection - FIXED
function importAllDataFormat(format) {
  // Close dropdown
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  if (format === 'json') {
    document.getElementById('importFileJSON').click();
  } else if (format === 'csv') {
    document.getElementById('importFileCSV').click();
  } else if (format === 'xlsx') {
    document.getElementById('importFileXLSX').click();
  }
}

// Handle Import File - FIXED
async function handleImportFile(event, format) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    if (format === 'json') {
      const data = await importFromJSON(file);
      
      if (confirmAction('This will replace all existing data. Continue?')) {
        await db.importData(data);
        showToast('Data imported successfully!');
        setTimeout(() => location.reload(), 1000);
      }
    } else if (format === 'csv') {
      // CSV import - ask which module
      showImportCSVDialog(file);
    } else if (format === 'xlsx') {
      if (confirmAction('Import from Excel will replace existing data. Continue?')) {
        await importFromExcel(file);
      }
    }
  } catch (error) {
    console.error('Import error:', error);
    showToast('Error importing data: ' + error.message);
  }

  event.target.value = '';
}

// Show CSV Import Dialog - NEW
function showImportCSVDialog(file) {
  const modalContent = `
    <div class="form-group">
      <label>Select module to import CSV data into:</label>
      <select id="csvImportModule" class="form-control">
        <option value="medicines">Medicines</option>
        <option value="subscriptions">Subscriptions</option>
        <option value="expenses">Expenses</option>
        <option value="travels">Travels</option>
        <option value="insurances">Insurances</option>
        <option value="bills">Bills</option>
        <option value="vehicles">Vehicles</option>
        <option value="pets">Pets</option>
        <option value="customCategories">Custom Categories</option>
        <option value="customItems">Custom Items</option>
      </select>
    </div>
    <div class="form-actions">
      <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
      <button type="button" onclick="executeCSVImport()" class="btn btn-primary">Import CSV</button>
    </div>
  `;
  
  openModal('Import CSV File', modalContent);
  
  // Store file reference
  window.pendingCSVFile = file;
}

// Execute CSV Import - NEW
async function executeCSVImport() {
  const module = document.getElementById('csvImportModule').value;
  const file = window.pendingCSVFile;
  
  if (!file) {
    showToast('No file selected');
    return;
  }
  
  try {
    const data = await importFromCSV(file);
    
    if (confirmAction(`Import ${data.length} items into ${module}? This will replace existing data.`)) {
      await db.clear(module);
      for (const item of data) {
        delete item.id;
        await db.add(module, item);
      }
      showToast('CSV data imported successfully!');
      closeModal();
      
      // Reload appropriate module
      const moduleLoaders = {
        'medicines': loadMedicines,
        'subscriptions': loadSubscriptions,
        'expenseGroups': loadExpenses,  // CHANGED from 'expenses'
        'travels': loadTravels,
        'insurances': loadInsurances,
        'bills': loadBills,
        'vehicles': loadVehicles,
        'pets': loadPets
      };
      
      if (moduleLoaders[module]) {
        setTimeout(() => {
          showModule(module.replace('s', ''));
          moduleLoaders[module]();
        }, 500);
      }
    }
  } catch (error) {
    showToast('Error importing CSV: ' + error.message);
  }
  
  window.pendingCSVFile = null;
}

// Import from Excel (multi-sheet) - FIXED
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
        
        const storeMapping = {
          'Medicines': 'medicines',
          'Subscriptions': 'subscriptions',
          'Expenses': 'expenses',
          'Travels': 'travels',
          'Insurances': 'insurances',
          'Bills': 'bills',
          'Vehicles': 'vehicles',
          'Pets': 'pets',
          'Custom Categories': 'customCategories',
          'Custom Items': 'customItems'
        };
        
        let importedSheets = 0;
        
        for (const sheetName of workbook.SheetNames) {
          const storeName = storeMapping[sheetName];
          if (storeName) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length > 0) {
              await db.clear(storeName);
              for (const item of jsonData) {
                delete item.id;
                await db.add(storeName, item);
              }
              importedSheets++;
            }
          }
        }
        
        showToast(`Excel data imported successfully! (${importedSheets} modules)`);
        setTimeout(() => location.reload(), 1000);
      } catch (error) {
        console.error('Excel read error:', error);
        showToast('Error reading Excel file: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Excel import error:', error);
    showToast('Error importing Excel: ' + error.message);
  }
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

// Find exportModuleData function and update it:

async function exportModuleData(storeName, moduleName, format) {
  // Close dropdown
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  try {
    const data = await db.getAll(storeName);
    if (data.length === 0) {
      showToast('No data to export');
      return;
    }

    // Special handling for expense groups
    if (storeName === 'expenseGroups') {
      exportAllExpenseGroups(data, format);
      return;
    }

    const baseFilename = `MultiManager-${moduleName}`;
    
    switch(format) {
      case 'json':
        exportToJSON(data, baseFilename);
        break;
      case 'csv':
        exportToCSV(data, baseFilename);
        break;
      case 'xlsx':
        exportToXLSX(data, baseFilename);
        break;
      default:
        showToast('Invalid format');
    }
  } catch (error) {
    showToast('Error exporting: ' + error.message);
  }
}

// Add this new function to settings.js:
async function exportAllExpenseGroups(groups, format) {
  if (typeof XLSX === 'undefined' && format === 'xlsx') {
    showToast('Excel library not loaded');
    return;
  }

  if (format === 'xlsx') {
    // Create workbook with all groups
    const wb = XLSX.utils.book_new();

    groups.forEach((group, index) => {
      // Summary sheet for each group
      const summaryData = [
        [group.name],
        ['Period:', `${formatDate(group.startDate)} to ${formatDate(group.endDate)}`],
        ['Participants:', group.participants.join(', ')],
        ['Currency:', group.currency],
        [''],
        ['Date', 'Description', 'Amount', 'Paid By', 'Split Type']
      ];

      (group.expenses || []).forEach(exp => {
        summaryData.push([
          exp.date,
          exp.description,
          exp.amount,
          exp.paidBy,
          exp.splitType === 'equal' ? 'Equal' : 'Custom'
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      const sheetName = `${group.name.substring(0, 25)}_${index + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const filename = `ExpenseGroups_All_${getTimestamp()}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast(`${groups.length} expense groups exported to Excel!`);

  } else if (format === 'csv') {
    // Export each group as separate CSV
    groups.forEach(group => {
      exportExpenseGroupCSV(group);
    });
    showToast(`${groups.length} CSV files exported!`);

  } else if (format === 'json') {
    const allData = groups.map(group => ({
      name: group.name,
      period: `${group.startDate} to ${group.endDate}`,
      participants: group.participants,
      expenses: group.expenses,
      currency: group.currency,
      settled: group.settled
    }));
    
    exportToJSON(allData, `ExpenseGroups_All`);
    showToast('All expense groups exported as JSON!');
  }
}
// Individual Module Import with Format Selection
function importModuleData(storeName, format) {
  // Close dropdown
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = format === 'json' ? '.json' : format === 'csv' ? '.csv' : '.xlsx,.xls';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      let data;
      
      if (format === 'json') {
        data = await importFromJSON(file);
      } else if (format === 'csv') {
        data = await importFromCSV(file);
      } else if (format === 'xlsx') {
        data = await importFromXLSX(file);
      }
      
      if (confirmAction(`Import ${data.length} items? This will replace existing data in this module.`)) {
        await db.clear(storeName);
        for (const item of data) {
          delete item.id; // Let autoincrement handle IDs
          await db.add(storeName, item);
        }
        showToast('Data imported successfully!');
        
        // Reload the current module
        const moduleLoaders = {
          'medicines': loadMedicines,
          'subscriptions': loadSubscriptions,
          'expenses': loadExpenses,
          'travels': loadTravels,
          'insurances': loadInsurances,
          'bills': loadBills,
          'vehicles': loadVehicles,
          'pets': loadPets
        };
        
        if (moduleLoaders[storeName]) {
          moduleLoaders[storeName]();
        }
      }
    } catch (error) {
      showToast('Error importing: ' + error.message);
    }
  };
  
  input.click();
}

// Custom module export/import
async function exportCustomData(format) {
  // Close dropdown
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
    const baseFilename = 'MultiManager-Custom';
    
    switch(format) {
      case 'json':
        exportToJSON(data, baseFilename);
        break;
      case 'csv':
        if (categories.length > 0) exportToCSV(categories, `${baseFilename}-Categories`);
        if (items.length > 0) exportToCSV(items, `${baseFilename}-Items`);
        showToast('Custom data exported as separate CSV files!');
        break;
      case 'xlsx':
        if (typeof XLSX !== 'undefined') {
          const wb = XLSX.utils.book_new();
          if (categories.length > 0) {
            const ws1 = XLSX.utils.json_to_sheet(categories.map(c => flattenObject(c)));
            XLSX.utils.book_append_sheet(wb, ws1, 'Categories');
          }
          if (items.length > 0) {
            const ws2 = XLSX.utils.json_to_sheet(items.map(i => flattenObject(i)));
            XLSX.utils.book_append_sheet(wb, ws2, 'Items');
          }
          const filename = `${baseFilename}_${getTimestamp()}.xlsx`;
          XLSX.writeFile(wb, filename);
          showToast('Excel file exported successfully!');
        }
        break;
    }
  } catch (error) {
    showToast('Error exporting custom data: ' + error.message);
  }
}

async function importCustomData(format) {
  // Close dropdown
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = format === 'json' ? '.json' : format === 'csv' ? '.csv' : '.xlsx,.xls';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      if (format === 'json') {
        const data = await importFromJSON(file);
        if (confirmAction('Import custom data? This will replace existing custom categories and items.')) {
          if (data.categories) {
            await db.clear('customCategories');
            for (const cat of data.categories) {
              delete cat.id;
              await db.add('customCategories', cat);
            }
          }
          if (data.items) {
            await db.clear('customItems');
            for (const item of data.items) {
              delete item.id;
              await db.add('customItems', item);
            }
          }
          showToast('Custom data imported successfully!');
          loadCustomCategories();
        }
      } else {
        showToast('CSV/Excel import for custom data: Please use JSON format');
      }
    } catch (error) {
      showToast('Error importing: ' + error.message);
    }
  };
  
  input.click();
}
