// Enhanced Settings Module with Format Selection - COMPLETE FIXED VERSION

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
        const stores = ['medicines', 'subscriptions', 'expenseGroups', 'travels', 'insurances', 'bills', 'vehicles', 'pets', 'customCategories', 'customItems'];
        let exportedCount = 0;
        
        for (const store of stores) {
          if (data[store] && data[store].length > 0) {
            // Special handling for expense groups
            if (store === 'expenseGroups') {
              const csvData = data[store].map(group => ({
                name: group.name || 'Untitled',
                description: group.description || '',
                currency: group.currency || 'NRs',
                startDate: group.startDate || '',
                endDate: group.endDate || '',
                participants: (group.participants || []).join(', '),
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

// Export all data to multi-sheet Excel
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
        // Special handling for expense groups
        if (key === 'expenseGroups') {
          const flattenedData = data[key].map(group => ({
            name: group.name || 'Untitled',
            description: group.description || '',
            currency: group.currency || 'NRs',
            startDate: group.startDate || '',
            endDate: group.endDate || '',
            participants: (group.participants || []).join(', '),
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

// Handle Import File
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

// Show CSV Import Dialog
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
  
  // Store file reference
  window.pendingCSVFile = file;
}

// Execute CSV Import
async function executeCSVImport() {
  const module = document.getElementById('csvImportModule').value;
  const file = window.pendingCSVFile;
  
  if (!file) {
    showToast('No file selected');
    return;
  }
  
  try {
    const data = await importFromCSV(file);
    
    // Filter out empty rows
    const validData = data.filter(item => {
      if (!item || typeof item !== 'object') return false;
      
      const keys = Object.keys(item);
      if (keys.length === 0) return false;
      
      // Check if row has meaningful data
      return keys.some(key => {
        const value = item[key];
        return key !== 'id' && value !== null && value !== undefined && value !== '';
      });
    });
    
    if (validData.length === 0) {
      showToast('No valid data found in CSV file');
      return;
    }
    
    if (confirmAction(`Import ${validData.length} items into ${module}? This will replace existing data.`)) {
      await db.clear(module);
      
      let importedCount = 0;
      
      // Special handling for expense groups
      if (module === 'expenseGroups') {
        for (const item of validData) {
          if (!item.name || item.name.trim() === '') continue;
          
          const expenseGroup = {
            name: item.name.trim(),
            description: item.description || '',
            currency: item.currency || 'NRs',
            startDate: item.startDate || new Date().toISOString().split('T')[0],
            endDate: item.endDate || new Date().toISOString().split('T')[0],
            participants: item.participants ? 
              (typeof item.participants === 'string' ? 
                item.participants.split(',').map(p => p.trim()).filter(p => p !== '') : 
                Array.isArray(item.participants) ? item.participants : []) : [],
            expenses: [],
            settled: item.settled === 'Yes' || item.settled === true || item.settled === 'true'
          };
          
          if (expenseGroup.participants.length > 0) {
            await db.add(module, expenseGroup);
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
      
      // Reload appropriate module
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
        setTimeout(() => {
          const moduleNames = {
            'medicines': 'medicine',
            'subscriptions': 'subscription',
            'expenseGroups': 'expense',
            'travels': 'travel',
            'insurances': 'insurance',
            'bills': 'bill',
            'vehicles': 'vehicle',
            'pets': 'pet'
          };
          showModule(moduleNames[module] || module);
          moduleLoaders[module]();
        }, 500);
      }
    }
  } catch (error) {
    showToast('Error importing CSV: ' + error.message);
  }
  
  window.pendingCSVFile = null;
}

// Import from Excel (multi-sheet) - FIXED TO AVOID BLANK ENTRIES
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
        
        // Mapping of sheet names to store names
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
        
        let importedSheets = 0;
        let totalItems = 0;
        
        for (const sheetName of workbook.SheetNames) {
          // Skip detail/reference sheets
          if (sheetName.startsWith('Detail_') || 
              sheetName.includes('Summary') || 
              sheetName.includes('Settlement') || 
              sheetName.includes('Split Details')) {
            continue;
          }
          
          const storeName = storeMapping[sheetName];
          
          // Only process sheets that match our store mapping
          if (storeName) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // Filter out empty rows
            const validData = jsonData.filter(item => {
              if (!item || typeof item !== 'object') return false;
              
              // Check if row has any meaningful data
              const keys = Object.keys(item);
              if (keys.length === 0) return false;
              
              // Check if all values are empty/null/undefined
              const hasData = keys.some(key => {
                const value = item[key];
                return value !== null && value !== undefined && value !== '' && 
                       !(typeof value === 'string' && value.trim() === '');
              });
              
              return hasData;
            });
            
            if (validData.length > 0) {
              await db.clear(storeName);
              
              // Special handling for expense groups
              if (storeName === 'expenseGroups') {
                for (const item of validData) {
                  // Only import if it has a name (required field)
                  if (!item.name || item.name.trim() === '') continue;
                  
                  const expenseGroup = {
                    name: item.name.trim(),
                    description: item.description || '',
                    currency: item.currency || 'NRs',
                    startDate: item.startDate || new Date().toISOString().split('T')[0],
                    endDate: item.endDate || new Date().toISOString().split('T')[0],
                    participants: item.participants ? 
                      (typeof item.participants === 'string' ? 
                        item.participants.split(',').map(p => p.trim()).filter(p => p !== '') : 
                        Array.isArray(item.participants) ? item.participants : []) : [],
                    expenses: [],
                    settled: item.settled === 'Yes' || item.settled === true || item.settled === 'true'
                  };
                  
                  // Only add if has participants
                  if (expenseGroup.participants.length > 0) {
                    await db.add(storeName, expenseGroup);
                    totalItems++;
                  }
                }
              } else {
                // For other modules
                for (const item of validData) {
                  // Clean the item - remove undefined/null values
                  const cleanItem = {};
                  let hasRequiredData = false;
                  
                  Object.keys(item).forEach(key => {
                    const value = item[key];
                    if (value !== null && value !== undefined && value !== '' && 
                        !(typeof value === 'string' && value.trim() === '')) {
                      cleanItem[key] = value;
                      if (key !== 'id') hasRequiredData = true;
                    }
                  });
                  
                  if (hasRequiredData) {
                    delete cleanItem.id; // Let autoincrement handle IDs
                    await db.add(storeName, cleanItem);
                    totalItems++;
                  }
                }
              }
              importedSheets++;
            }
          }
        }
        
        if (totalItems === 0) {
          showToast('No valid data found in Excel file');
          return;
        }
        
        showToast(`Excel imported successfully! ${totalItems} items from ${importedSheets} modules`);
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

// Import from XLSX for individual modules
async function importFromXLSX(file) {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded');
    return [];
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Take only the first sheet for individual module import
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Filter out empty rows
        const validData = jsonData.filter(item => {
          if (!item || typeof item !== 'object') return false;
          
          const keys = Object.keys(item);
          if (keys.length === 0) return false;
          
          const hasData = keys.some(key => {
            const value = item[key];
            return value !== null && value !== undefined && value !== '' && 
                   !(typeof value === 'string' && value.trim() === '');
          });
          
          return hasData;
        });
        
        resolve(validData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

// ==================== CLEAR ALL DATA ====================

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
      'expenseGroups',
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

// ==================== MODULE EXPORT/IMPORT ====================

// Export Module Data
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
      default:
        showToast('Invalid format');
    }
  } catch (error) {
    showToast('Error exporting: ' + error.message);
  }
}

// Export All Expense Groups - ENHANCED
async function exportAllExpenseGroups(groups, format) {
  if (typeof XLSX === 'undefined' && format === 'xlsx') {
    showToast('Excel library not loaded');
    return;
  }

  if (format === 'xlsx') {
    // Create a SINGLE summary sheet with all groups for easy re-import
    const wb = XLSX.utils.book_new();
    
    // Main sheet with all groups (importable)
    const summaryData = groups.map(group => {
      const participants = group.participants || [];
      const expenses = group.expenses || [];
      
      return {
        name: group.name || 'Untitled',
        description: group.description || '',
        currency: group.currency || 'NRs',
        startDate: group.startDate || '',
        endDate: group.endDate || '',
        participants: participants.join(', '),
        expenseCount: expenses.length,
        totalAmount: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
        settled: group.settled ? 'Yes' : 'No'
      };
    });
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Expense Groups');

    // Add detailed sheets for each group (for reference only, marked with prefix)
    groups.forEach((group, index) => {
      const participants = group.participants || [];
      const expenses = group.expenses || [];
      
      // Expense details sheet
      const expenseData = [
        [group.name || 'Untitled Group'],
        ['Period:', `${formatDate(group.startDate)} to ${formatDate(group.endDate)}`],
        ['Participants:', participants.join(', ')],
        ['Currency:', group.currency || 'NRs'],
        [''],
        ['Date', 'Description', 'Amount', 'Paid By', 'Split Type', 'Notes']
      ];

      expenses.forEach(exp => {
        expenseData.push([
          exp.date || '',
          exp.description || '',
          exp.amount || 0,
          exp.paidBy || '',
          exp.splitType === 'equal' ? 'Equal' : 'Custom',
          exp.notes || ''
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(expenseData);
      // Use "Detail_" prefix to mark as non-importable reference sheet
      const sheetName = `Detail_${(group.name || 'Group').substring(0, 20)}_${index + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const filename = `ExpenseGroups_Export_${getTimestamp()}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast(`${groups.length} expense groups exported to Excel!`);

  } else if (format === 'csv') {
    // Export summary CSV
    const csvData = groups.map(group => {
      const participants = group.participants || [];
      const expenses = group.expenses || [];
      
      return {
        name: group.name || 'Untitled',
        description: group.description || '',
        currency: group.currency || 'NRs',
        startDate: group.startDate || '',
        endDate: group.endDate || '',
        participants: participants.join(', '),
        expenseCount: expenses.length,
        totalAmount: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
        settled: group.settled ? 'Yes' : 'No'
      };
    });
    
    exportToCSV(csvData, 'ExpenseGroups_Summary');
    showToast(`${groups.length} expense groups exported as CSV!`);

  } else if (format === 'json') {
    const allData = groups.map(group => {
      const participants = group.participants || [];
      const expenses = group.expenses || [];
      
      return {
        name: group.name,
        description: group.description || '',
        startDate: group.startDate,
        endDate: group.endDate,
        participants: participants,
        expenses: expenses.map(exp => ({
          id: exp.id,
          date: exp.date,
          description: exp.description,
          amount: exp.amount || 0,
          paidBy: exp.paidBy,
          splitType: exp.splitType,
          splits: exp.splits || {},
          notes: exp.notes || ''
        })),
        currency: group.currency || 'NRs',
        settled: group.settled || false
      };
    });
    
    exportToJSON(allData, `ExpenseGroups_All`);
    showToast('All expense groups exported as JSON!');
  }
}

// Individual Module Import - ENHANCED VALIDATION
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
      
      // Filter out empty/invalid entries
      const validData = data.filter(item => {
        if (!item || typeof item !== 'object') return false;
        
        const keys = Object.keys(item);
        if (keys.length === 0) return false;
        
        // For expense groups, must have name
        if (storeName === 'expenseGroups') {
          return item.name && item.name.trim() !== '';
        }
        
        // For other modules, must have some data
        return keys.some(key => {
          const value = item[key];
          return key !== 'id' && value !== null && value !== undefined && value !== '' &&
                 !(typeof value === 'string' && value.trim() === '');
        });
      });
      
      if (validData.length === 0) {
        showToast('No valid data found in file');
        return;
      }
      
      if (confirmAction(`Import ${validData.length} items? This will replace existing data in this module.`)) {
        await db.clear(storeName);
        
        let importedCount = 0;
        
        // Special handling for expense groups
        if (storeName === 'expenseGroups') {
          for (const item of validData) {
            const expenseGroup = {
              name: item.name.trim(),
              description: item.description || '',
              currency: item.currency || 'NRs',
              startDate: item.startDate || new Date().toISOString().split('T')[0],
              endDate: item.endDate || new Date().toISOString().split('T')[0],
              participants: item.participants ? 
                (typeof item.participants === 'string' ? 
                  item.participants.split(',').map(p => p.trim()).filter(p => p !== '') : 
                  Array.isArray(item.participants) ? item.participants : []) : [],
              expenses: Array.isArray(item.expenses) ? item.expenses.map(exp => ({
                id: exp.id || generateId(),
                description: exp.description || '',
                amount: parseFloat(exp.amount) || 0,
                date: exp.date || new Date().toISOString().split('T')[0],
                paidBy: exp.paidBy || '',
                splitType: exp.splitType || 'equal',
                splits: exp.splits || {},
                notes: exp.notes || ''
              })) : [],
              settled: item.settled === 'Yes' || item.settled === true || item.settled === 'true' || false
            };
            
            if (expenseGroup.participants.length > 0) {
              await db.add(storeName, expenseGroup);
              importedCount++;
            }
          }
        } else {
          for (const item of validData) {
            const cleanItem = {};
            
            Object.keys(item).forEach(key => {
              if (key !== 'id' && item[key] !== null && item[key] !== undefined && item[key] !== '' &&
                  !(typeof item[key] === 'string' && item[key].trim() === '')) {
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
        
        // Reload the current module
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

// ==================== CUSTOM MODULE EXPORT/IMPORT ====================

// Export Custom Data
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
        showToast('Custom data exported as JSON!');
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
        } else {
          showToast('Excel library not loaded');
        }
        break;
    }
  } catch (error) {
    showToast('Error exporting custom data: ' + error.message);
  }
}

// Import Custom Data
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
          showToast(`${importedCount} custom items imported successfully!`);
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
