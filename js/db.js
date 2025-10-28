// IndexedDB Database Manager with Migration Support
class DBManager {
  constructor() {
    this.dbName = 'MultiManagerDB';
    this.version = 2; // UPDATED VERSION for migration
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Database error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        console.log(`Upgrading database from version ${oldVersion} to ${this.version}`);

        // Create all object stores
        const stores = [
          'medicines',
          'subscriptions',
          'expenses',
          'expenseGroups',  // NEW STORE
          'travels',
          'insurances',
          'bills',
          'vehicles',
          'pets',
          'customCategories',
          'customItems',
          'settings'
        ];

        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            console.log(`Created object store: ${storeName}`);
          }
        });

        // Migration: Convert old expenses to expense groups
        if (oldVersion < 2 && db.objectStoreNames.contains('expenses')) {
          const transaction = event.target.transaction;
          const expensesStore = transaction.objectStore('expenses');
          const expenseGroupsStore = transaction.objectStore('expenseGroups');

          expensesStore.openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              const oldExpense = cursor.value;
              
              // Convert old expense to new group format
              const newGroup = {
                name: oldExpense.description || 'Imported Expense',
                description: oldExpense.notes || '',
                currency: oldExpense.currency || 'USD',
                startDate: oldExpense.date || new Date().toISOString().split('T')[0],
                endDate: oldExpense.date || new Date().toISOString().split('T')[0],
                participants: oldExpense.participants?.map(p => p.name) || [],
                expenses: [{
                  id: generateId(),
                  description: oldExpense.description || 'Expense',
                  amount: oldExpense.amount || 0,
                  date: oldExpense.date || new Date().toISOString().split('T')[0],
                  paidBy: oldExpense.participants?.[0]?.name || 'Unknown',
                  splitType: oldExpense.splitType || 'equal',
                  splits: {},
                  notes: oldExpense.notes || ''
                }],
                settled: oldExpense.settled || false,
                createdAt: oldExpense.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              expenseGroupsStore.add(newGroup);
              console.log('Migrated expense to group:', newGroup.name);
              
              cursor.continue();
            }
          };
        }
      };
    });
  }

  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        data.createdAt = data.createdAt || new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async update(storeName, data) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        data.updatedAt = new Date().toISOString();
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error getting all from ${storeName}:`, error);
        reject(error);
      }
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async exportData() {
    const data = {};
    const stores = [
      'medicines',
      'subscriptions',
      'expenses',
      'expenseGroups',
      'travels',
      'insurances',
      'bills',
      'vehicles',
      'pets',
      'customCategories',
      'customItems',
      'settings'
    ];

    for (const store of stores) {
      try {
        data[store] = await this.getAll(store);
      } catch (error) {
        console.error(`Error exporting ${store}:`, error);
        data[store] = [];
      }
    }

    return data;
  }

  async importData(data) {
    for (const [storeName, items] of Object.entries(data)) {
      if (Array.isArray(items) && items.length > 0) {
        try {
          await this.clear(storeName);
          for (const item of items) {
            delete item.id;
            await this.add(storeName, item);
          }
        } catch (error) {
          console.error(`Error importing ${storeName}:`, error);
        }
      }
    }
  }
}

// Helper function for ID generation
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const db = new DBManager();
