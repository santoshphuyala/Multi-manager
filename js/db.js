// Enhanced Database Module with Proper Error Handling
const DB_NAME = 'MultiManagerDB';
const DB_VERSION = 3;

const db = {
  instance: null,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Database failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.instance = request.result;
        console.log('Database opened successfully');
        resolve(this.instance);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
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

        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            console.log(`Created object store: ${storeName}`);
          }
        });
      };
    });
  },

  async add(storeName, data) {
    try {
      if (!this.instance) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.instance.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => {
          console.log(`Added to ${storeName}:`, request.result);
          resolve(request.result);
        };

        request.onerror = () => {
          console.error(`Error adding to ${storeName}:`, request.error);
          reject(request.error);
        };

        transaction.oncomplete = () => {
          console.log(`Transaction complete for ${storeName}`);
        };

        transaction.onerror = () => {
          console.error(`Transaction error for ${storeName}:`, transaction.error);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error(`Error in add() for ${storeName}:`, error);
      throw error;
    }
  },

  async getAll(storeName) {
    try {
      if (!this.instance) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.instance.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          console.log(`Retrieved ${request.result.length} items from ${storeName}`);
          resolve(request.result);
        };

        request.onerror = () => {
          console.error(`Error getting all from ${storeName}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Error in getAll() for ${storeName}:`, error);
      return [];
    }
  },

  async get(storeName, id) {
    try {
      if (!this.instance) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.instance.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(parseInt(id));

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error(`Error getting from ${storeName}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Error in get() for ${storeName}:`, error);
      return null;
    }
  },

  async update(storeName, data) {
    try {
      if (!this.instance) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.instance.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => {
          console.log(`Updated in ${storeName}:`, request.result);
          resolve(request.result);
        };

        request.onerror = () => {
          console.error(`Error updating ${storeName}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Error in update() for ${storeName}:`, error);
      throw error;
    }
  },

  async delete(storeName, id) {
    try {
      if (!this.instance) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.instance.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(parseInt(id));

        request.onsuccess = () => {
          console.log(`Deleted from ${storeName}:`, id);
          resolve();
        };

        request.onerror = () => {
          console.error(`Error deleting from ${storeName}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Error in delete() for ${storeName}:`, error);
      throw error;
    }
  },

  async clear(storeName) {
    try {
      if (!this.instance) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.instance.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
          console.log(`Cleared ${storeName}`);
          resolve();
        };

        request.onerror = () => {
          console.error(`Error clearing ${storeName}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Error in clear() for ${storeName}:`, error);
      throw error;
    }
  },

  async exportData() {
    try {
      const data = {};
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
        data[store] = await this.getAll(store);
      }

      console.log('Exported data:', data);
      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  },

  async importData(data) {
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

      let totalImported = 0;

      for (const store of stores) {
        if (data[store] && Array.isArray(data[store])) {
          await this.clear(store);
          
          for (const item of data[store]) {
            // Remove id to let autoincrement handle it
            const cleanItem = { ...item };
            delete cleanItem.id;
            
            try {
              await this.add(store, cleanItem);
              totalImported++;
            } catch (err) {
              console.error(`Error importing item to ${store}:`, err, item);
            }
          }
        }
      }

      console.log(`Total items imported: ${totalImported}`);
      return totalImported;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
};

// Initialize database when script loads
db.init().catch(err => console.error('Failed to initialize database:', err));
