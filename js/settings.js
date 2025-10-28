// Enhanced Settings Module - COMPLETE REWRITE FOR RELIABLE EXPORT/IMPORT

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

// ==================== EXPORT ALL DATA ====================

async function exportAllDataFormat(format) {
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  try {
    const data = await db.exportData();
    const baseFilename = 'MultiManager-Full-Backup';
    
    switch(format) {
      case 'json':
        await exportAllAsJSON(data, baseFilename);
        break;
      case 'csv':
        await exportAllAsCSV(data, baseFilename);
        break;
      case 'xlsx':
        await exportAllAsExcel(data, baseFilename);
        break;
      default:
        showToast('Invalid format selected');
    }
  } catch (error) {
    console.error('Export error:', error);
    showToast('Error exporting data: ' + error.message);
  }
}

// Export all as JSON
async function exportAllAsJSON(data, baseFilename) {
  // Clean and prepare data
  const cleanData = {
    medicines: data.medicines || [],
    subscriptions: data.subscriptions || [],
    expenseGroups: (data.expenseGroups || []).map(group => ({
      name: group.name,
      description: group.description || '',
      currency: group.currency || 'NRs',
      startDate: group.startDate,
      endDate: group.endDate,
      participants: group.participants || [],
      expenses: (group.expenses || []).map(exp => ({
        id: exp.id,
        date: exp.date,
        description: exp.description,
        amount: exp.amount || 0,
        paidBy: exp.paidBy,
        splitType: exp.splitType,
        splits: exp.splits || {},
        notes: exp.notes || ''
      })),
      settled: group.settled || false
    })),
    travels: data.travels || [],
    insurances: data.insurances || [],
    bills: data.bills || [],
    vehicles: data.vehicles || [],
    pets: data.pets || [],
    customCategories: data.customCategories || [],
    customItems: data.customItems || []
  };

  exportToJSON(cleanData, baseFilename);
  showToast('Full backup exported as JSON!');
}

// Export all as CSV
async function exportAllAsCSV(data, baseFilename) {
  const stores = ['medicines', 'subscriptions', 'expenseGroups', 'travels', 'insurances', 'bills', 'vehicles', 'pets', 'customCategories', 'customItems'];
  let exportedCount = 0;
  
  for (const store of stores) {
    if (data[store] && data[store].length > 0) {
      if (store === 'expenseGroups') {
        const csvData = data[store].map(group => ({
          name: group.name || 'Untitled',
          description: group.description || '',
          currency: group.currency || 'NRs',
          startDate: group.startDate || '',
          endDate: group.endDate || '',
          participants: (group.participants || []).join('; '),
          expenseCount: (group.expenses || []).length,
          settled: group.settled ? 'Yes' : 'No'
        }));
        exportToCSV(csvData, `${baseFilename}-${store}`);
      } else {
        exportToCSV(data[store], `${baseFilename}-${store}`);
      }
      exportedCount++;
    }
  }
  
  if (exportedCount > 0) {
    showToast(`${exportedCount} CSV files exported successfully!`);
  } else {
    showToast('No data to export');
  }
}

// Export all as Excel
async function exportAllAsExcel(data, baseFilename) {
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
      'expenseGroups': 'Expense Groups',
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
        if (key === 'expenseGroups') {
          const flattenedData = data[key].map(group => ({
            name: group.name || 'Untitled',
            description: group.description || '',
            currency: group.currency || 'NRs',
            startDate: group.startDate || '',
            endDate: group.endDate || '',
            participants: (group.participants || []).join('; '),
            expenseCount: (group.expenses || []).length,
            settled: group.settled ? 'Yes' : 'No'
          }));
          const ws = XLSX.utils.json_to_sheet(flattenedData);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        } else {
          const flattenedData = data[key].map(item => flattenObject(item));
          const ws = XLSX.utils.json_to_sheet(flattenedData);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
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

// ==================== IMPORT ALL DATA ====================

function importAllDataFormat(format) {
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

async function handleImportFile(event, format) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    if (format === 'json') {
      const data = await importFromJSON(file);
      
      if (confirmAction('This will replace all existing data. Continue?')) {
        await importAllFromJSON(data);
      }
    } else if (format === 'csv') {
      showImportCSVDialog(file);
    } else if (format === 'xlsx') {
      if (confirmAction('Import from Excel will replace existing data. Continue?')) {
        await importAllFromExcel(file);
      }
    }
  } catch (error) {
    console.error('Import error:', error);
    showToast('Error importing data: ' + error.message);
  }

  event.target.value = '';
}

// Import all from JSON
async function importAllFromJSON(data) {
  try {
    let totalImported = 0;

    // Import each store
    const stores = ['medicines', 'subscriptions', 'expenseGroups', 'travels', 'insurances', 'bills', 'vehicles', 'pets', 'customCategories', 'customItems'];
    
    for (const store of stores) {
      if (data[store] && Array.isArray(data[store]) && data[store].length > 0) {
        await db.clear(store);
        
        if (store === 'expenseGroups') {
          // Special handling for expense groups
          for (const group of data[store]) {
            if (!group.name || !group.name.trim()) continue;
            
            const cleanGroup = {
              name: group.name.trim(),
              description: group.description || '',
              currency: group.currency || 'NRs',
              startDate: group.startDate || new Date().toISOString().split('T')[0],
              endDate: group.endDate || new Date().toISOString().split('T')[0],
              participants: Array.isArray(group.participants) ? group.participants : [],
              expenses: Array.isArray(group.expenses) ? group.expenses.map(exp => ({
                id: exp.id || generateId(),
                date: exp.date || new Date().toISOString().split('T')[0],
                description: exp.description || '',
                amount: parseFloat(exp.amount) || 0,
                paidBy: exp.paidBy || '',
                splitType: exp.splitType || 'equal',
                splits: exp.splits || {},
                notes: exp.notes || ''
              })) : [],
              settled: group.settled || false
            };
            
            if (cleanGroup.participants.length > 0) {
              await db.add(store, cleanGroup);
              totalImported++;
            }
          }
        } else {
          // Regular modules
          for (const item of data[store]) {
            const cleanItem = {};
            Object.keys(item).forEach(key => {
              if (key !== 'id' && item[key] !== null && item[key] !== undefined) {
                cleanItem[key] = item[key];
              }
            });
            
            if (Object.keys(cleanItem).length > 0) {
              await db.add(store, cleanItem);
              totalImported++;
            }
          }
        }
      }
    }

    showToast(`Successfully imported ${totalImported} items!`);
    setTimeout(() => location.reload(), 1000);
  } catch (error) {
    console.error('JSON import error:', error);
    showToast('Error importing JSON: ' + error.message);
  }
}

// Import all from Excel
async function importAllFromExcel(file) {
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
          'Expense Groups': 'expenseGroups',
          'Travels': 'travels',
          'Insurances': 'insurances',
          'Bills': 'bills',
          'Vehicles': 'vehicles',
          'Pets': 'pets',
          'Custom Categories': 'customCategories',
          'Custom Items': 'customItems'
        };
        
        let totalImported = 0;
        
        for (const sheetName of workbook.SheetNames) {
          const storeName = storeMapping[sheetName];
          if (!storeName) continue;
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) continue;
          
          await db.clear(storeName);
          
          if (storeName === 'expenseGroups') {
            for (const item of jsonData) {
              if (!item.name || item.name.trim() === '') continue;
              
              const cleanGroup = {
                name: item.name.trim(),
                description: item.description || '',
                currency: item.currency || 'NRs',
                startDate: item.startDate || new Date().toISOString().split('T')[0],
                endDate: item.endDate || new Date().toISOString().split('T')[0],
                participants: item.participants ? 
                  (typeof item.participants === 'string' ? 
                    item.participants.split(';').map(p => p.trim()).filter(p => p) : 
                    []) : [],
                expenses: [],
                settled: item.settled === 'Yes' || item.settled === true
              };
              
              if (cleanGroup.participants.length > 0) {
                await db.add(storeName, cleanGroup);
                totalImported++;
              }
            }
          } else {
            for (const item of jsonData) {
              const cleanItem = {};
              Object.keys(item).forEach(key => {
                if (key !== 'id' && item[key] !== null && item[key] !== undefined && item[key] !== '') {
                  cleanItem[key] = item[key];
                }
              });
              
              if (Object.keys(cleanItem).length > 0) {
                await db.add(storeName, cleanItem);
                totalImported++;
              }
            }
          }
        }
        
        showToast(`Excel imported successfully! ${totalImported} items`);
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

// ==================== CSV IMPORT ====================

function showImportCSVDialog(file) {
  const modalContent = `
    <div class="form-group">
      <label>Select module to import CSV data into:</label>
      <select id="csvImportModule" class="form-control">
        <option value="medicines">Medicines</option>
        <option value="subscriptions">Subscriptions</option>
        <option value="expenseGroups">Expense Groups</option>
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
  window.pendingCSVFile = file;
}

async function executeCSVImport() {
  const module = document.getElementById('csvImportModule').value;
  const file = window.pendingCSVFile;
  
  if (!file) {
    showToast('No file selected');
    return;
  }
  
  try {
    const data = await importFromCSV(file);
    
    const validData = data.filter(item => {
      if (!item || typeof item !== 'object') return false;
      return Object.keys(item).some(key => key !== 'id' && item[key] !== null && item[key] !== undefined && item[key] !== '');
    });
    
    if (validData.length === 0) {
      showToast('No valid data found in CSV file');
      return;
    }
    
    if (confirmAction(`Import ${validData.length} items into ${module}?`)) {
      await db.clear(module);
      
      let importedCount = 0;
      
      if (module === 'expenseGroups') {
        for (const item of validData) {
          if (!item.name || item.name.trim() === '') continue;
          
          const cleanGroup = {
            name: item.name.trim(),
            description: item.description || '',
            currency: item.currency || 'NRs',
            startDate: item.startDate || new Date().toISOString().split('T')[0],
            endDate: item.endDate || new Date().toISOString().split('T')[0],
            participants: item.participants ? 
              item.participants.split(';').map(p => p.trim()).filter(p => p) : [],
            expenses: [],
            settled: item.settled === 'Yes' || item.settled === true
          };
          
          if (cleanGroup.participants.length > 0) {
            await db.add(module, cleanGroup);
            importedCount++;
          }
        }
      } else {
        for (const item of validData) {
          const cleanItem = {};
          Object.keys(item).forEach(key => {
            if (key !== 'id' && item[key] !== null && item[key] !== undefined && item[key] !== '') {
              cleanItem[key] = item[key];
            }
          });
          
          if (Object.keys(cleanItem).length > 0) {
            await db.add(module, cleanItem);
            importedCount++;
          }
        }
      }
      
      showToast(`${importedCount} items imported successfully!`);
      closeModal();
      
      const moduleLoaders = {
        'medicines': loadMedicines,
        'subscriptions': loadSubscriptions,
        'expenseGroups': loadExpenses,
        'travels': loadTravels,
        'insurances': loadInsurances,
        'bills': loadBills,
        'vehicles': loadVehicles,
        'pets': loadPets
      };
      
      if (moduleLoaders[module]) {
        setTimeout(() => moduleLoaders[module](), 500);
      }
    }
  } catch (error) {
    showToast('Error importing CSV: ' + error.message);
  }
  
  window.pendingCSVFile = null;
}

// ==================== MODULE EXPORT/IMPORT ====================

async function exportModuleData(storeName, moduleName, format) {
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  try {
    const data = await db.getAll(storeName);
    if (data.length === 0) {
      showToast('No data to export');
      return;
    }

    if (storeName === 'expenseGroups') {
      exportExpenseGroupsModule(data, format);
      return;
    }

    const baseFilename = `MultiManager-${moduleName}`;
    
    switch(format) {
      case 'json':
        exportToJSON(data, baseFilename);
        showToast(`${moduleName} exported as JSON!`);
        break;
      case 'csv':
        exportToCSV(data, baseFilename);
        showToast(`${moduleName} exported as CSV!`);
        break;
      case 'xlsx':
        exportToXLSX(data, baseFilename);
        showToast(`${moduleName} exported as Excel!`);
        break;
    }
  } catch (error) {
    showToast('Error exporting: ' + error.message);
  }
}

// Export expense groups module
function exportExpenseGroupsModule(groups, format) {
  if (format === 'json') {
    const exportData = groups.map(group => ({
      name: group.name,
      description: group.description || '',
      currency: group.currency || 'NRs',
      startDate: group.startDate,
      endDate: group.endDate,
      participants: group.participants || [],
      expenses: (group.expenses || []).map(exp => ({
        id: exp.id,
        date: exp.date,
        description: exp.description,
        amount: exp.amount || 0,
        paidBy: exp.paidBy,
        splitType: exp.splitType,
        splits: exp.splits || {},
        notes: exp.notes || ''
      })),
      settled: group.settled || false
    }));
    
    exportToJSON(exportData, 'ExpenseGroups_Export');
    showToast(`${groups.length} expense groups exported as JSON!`);
    
  } else if (format === 'csv') {
    const csvData = groups.map(group => ({
      name: group.name || 'Untitled',
      description: group.description || '',
      currency: group.currency || 'NRs',
      startDate: group.startDate || '',
      endDate: group.endDate || '',
      participants: (group.participants || []).join('; '),
      expenseCount: (group.expenses || []).length,
      settled: group.settled ? 'Yes' : 'No'
    }));
    
    exportToCSV(csvData, 'ExpenseGroups_Export');
    showToast(`${groups.length} expense groups exported as CSV!`);
    
  } else if (format === 'xlsx') {
    if (typeof XLSX === 'undefined') {
      showToast('Excel library not loaded');
      return;
    }
    
    const wb = XLSX.utils.book_new();
    
    const summaryData = groups.map(group => ({
      name: group.name || 'Untitled',
      description: group.description || '',
      currency: group.currency || 'NRs',
      startDate: group.startDate || '',
      endDate: group.endDate || '',
      participants: (group.participants || []).join('; '),
      expenseCount: (group.expenses || []).length,
      settled: group.settled ? 'Yes' : 'No'
    }));
    
    const ws = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, 'Expense Groups');
    
    const filename = `ExpenseGroups_Export_${getTimestamp()}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast(`${groups.length} expense groups exported to Excel!`);
  }
}

// Import module data
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
    
    try {
      let data;
      
      if (format === 'json') {
        data = await importFromJSON(file);
      } else if (format === 'csv') {
        data = await importFromCSV(file);
      } else if (format === 'xlsx') {
        data = await importModuleFromXLSX(file);
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        showToast('No valid data found in file');
        return;
      }
      
      if (confirmAction(`Import ${data.length} items? This will replace existing data.`)) {
        await db.clear(storeName);
        
        let importedCount = 0;
        
        if (storeName === 'expenseGroups') {
          for (const item of data) {
            if (!item.name || item.name.trim() === '') continue;
            
            const cleanGroup = {
              name: item.name.trim(),
              description: item.description || '',
              currency: item.currency || 'NRs',
              startDate: item.startDate || new Date().toISOString().split('T')[0],
              endDate: item.endDate || new Date().toISOString().split('T')[0],
              participants: Array.isArray(item.participants) ? item.participants : 
                (typeof item.participants === 'string' ? 
                  item.participants.split(';').map(p => p.trim()).filter(p => p) : []),
              expenses: Array.isArray(item.expenses) ? item.expenses.map(exp => ({
                id: exp.id || generateId(),
                date: exp.date || new Date().toISOString().split('T')[0],
                description: exp.description || '',
                amount: parseFloat(exp.amount) || 0,
                paidBy: exp.paidBy || '',
                splitType: exp.splitType || 'equal',
                splits: exp.splits || {},
                notes: exp.notes || ''
              })) : [],
              settled: item.settled === 'Yes' || item.settled === true || false
            };
            
            if (cleanGroup.participants.length > 0) {
              await db.add(storeName, cleanGroup);
              importedCount++;
            }
          }
        } else {
          for (const item of data) {
            const cleanItem = {};
            Object.keys(item).forEach(key => {
              if (key !== 'id' && item[key] !== null && item[key] !== undefined && item[key] !== '') {
                cleanItem[key] = item[key];
              }
            });
            
            if (Object.keys(cleanItem).length > 0) {
              await db.add(storeName, cleanItem);
              importedCount++;
            }
          }
        }
        
        showToast(`${importedCount} items imported successfully!`);
        
        const moduleLoaders = {
          'medicines': loadMedicines,
          'subscriptions': loadSubscriptions,
          'expenseGroups': loadExpenses,
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
      console.error('Import error:', error);
      showToast('Error importing: ' + error.message);
    }
  };
  
  input.click();
}

// Import module from XLSX
async function importModuleFromXLSX(file) {
  if (typeof XLSX === 'undefined') {
    throw new Error('Excel library not loaded');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
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
    const baseFilename = 'MultiManager-Custom';
    
    switch(format) {
      case 'json':
        exportToJSON(data, baseFilename);
        showToast('Custom data exported as JSON!');
        break;
      case 'csv':
        if (categories.length > 0) exportToCSV(categories, `${baseFilename}-Categories`);
        if (items.length > 0) exportToCSV(items, `${baseFilename}-Items`);
        showToast('Custom data exported as CSV files!');
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
          showToast('Custom data exported to Excel!');
        }
        break;
    }
  } catch (error) {
    showToast('Error exporting custom data: ' + error.message);
  }
}

async function importCustomData(format) {
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
        if (confirmAction('Import custom data? This will replace existing custom data.')) {
          let importedCount = 0;
          
          if (data.categories && Array.isArray(data.categories)) {
            await db.clear('customCategories');
            for (const cat of data.categories) {
              delete cat.id;
              await db.add('customCategories', cat);
              importedCount++;
            }
          }
          if (data.items && Array.isArray(data.items)) {
            await db.clear('customItems');
            for (const item of data.items) {
              delete item.id;
              await db.add('customItems', item);
              importedCount++;
            }
          }
          showToast(`${importedCount} custom items imported!`);
          loadCustomCategories();
        }
      } else {
        showToast('Please use JSON format for custom data import');
      }
    } catch (error) {
      showToast('Error importing: ' + error.message);
    }
  };
  
  input.click();
}

// ==================== CLEAR DATA ====================

async function clearAllData() {
  if (!confirmAction('Delete ALL data? This cannot be undone!')) return;
  if (!confirmAction('This will permanently delete everything. Continue?')) return;

  try {
    const stores = ['medicines', 'subscriptions', 'expenseGroups', 'travels', 'insurances', 'bills', 'vehicles', 'pets', 'customCategories', 'customItems'];
    
    for (const store of stores) {
      await db.clear(store);
    }
    
    showToast('All data cleared successfully!');
    setTimeout(() => location.reload(), 1000);
  } catch (error) {
    showToast('Error clearing data: ' + error.message);
  }
}
