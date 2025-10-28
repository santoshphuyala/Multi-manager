// Enhanced Utility Functions with XLSX Support

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return 'N/A';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (error) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function openModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('modal').classList.remove('hidden');
}

// Get timestamp for filenames
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// Export to JSON with timestamp
function exportToJSON(data, baseFilename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = `${baseFilename}_${getTimestamp()}.json`;
  downloadFile(blob, filename);
}

// Export to CSV with timestamp
function exportToCSV(data, baseFilename) {
  if (!data || data.length === 0) {
    showToast('No data to export');
    return;
  }

  // Flatten nested objects for CSV
  const flattenedData = data.map(item => flattenObject(item));
  
  const headers = Object.keys(flattenedData[0]);
  const csv = [
    headers.join(','),
    ...flattenedData.map(row => headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') 
        ? `"${stringValue.replace(/"/g, '""')}"` 
        : stringValue;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const filename = `${baseFilename}_${getTimestamp()}.csv`;
  downloadFile(blob, filename);
}

// Export to XLSX (Excel) with timestamp
function exportToXLSX(data, baseFilename) {
  if (!data || data.length === 0) {
    showToast('No data to export');
    return;
  }

  // Check if XLSX library is loaded
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded. Please refresh the page.');
    return;
  }

  try {
    // Flatten nested objects for Excel
    const flattenedData = data.map(item => flattenObject(item));
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(flattenedData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    
    // Generate filename with timestamp
    const filename = `${baseFilename}_${getTimestamp()}.xlsx`;
    
    // Write file
    XLSX.writeFile(wb, filename);
    showToast('Excel file exported successfully!');
  } catch (error) {
    console.error('Excel export error:', error);
    showToast('Error exporting to Excel: ' + error.message);
  }
}

// Flatten nested objects for CSV/Excel export
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}_${key}` : key;
      
      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = JSON.stringify(value);
      } else {
        flattened[newKey] = value;
      }
    }
  }
  
  return flattened;
}

// Download file
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import from JSON
async function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Import from CSV
async function importFromCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          reject(new Error('Empty CSV file'));
          return;
        }

        // Parse CSV
        const headers = parseCSVLine(lines[0]);
        const data = lines.slice(1).map(line => {
          const values = parseCSVLine(line);
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
        
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid CSV file: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Parse CSV line (handles quoted values)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Import from XLSX (Excel)
async function importFromXLSX(file) {
  return new Promise((resolve, reject) => {
    if (typeof XLSX === 'undefined') {
      reject(new Error('Excel library not loaded'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          reject(new Error('Empty Excel file'));
          return;
        }
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Invalid Excel file: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Date Input Helper
function createDateInput(id, label, value = '') {
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <input type="date" id="${id}" value="${value}">
    </div>
  `;
}

// Confirm Dialog
function confirmAction(message) {
  return confirm(message);
}

// Local Storage Helpers
const storage = {
  get(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// Toggle Dropdown
function toggleDropdown(dropdownId) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Close all other dropdowns
  document.querySelectorAll('.dropdown-content').forEach(dropdown => {
    if (dropdown.id !== dropdownId) {
      dropdown.classList.remove('show');
    }
  });
  
  // Toggle current dropdown
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.matches('.dropdown-btn') && !e.target.closest('.dropdown-btn')) {
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }
});
