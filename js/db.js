// IndexedDB Database Manager
class DBManager {
  constructor() {
    this.dbName = 'MultiManagerDB';
    this.version = 1;
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

        // Create object stores
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
      data[store] = await this.getAll(store);
    }

    return data;
  }

  async importData(data) {
    for (const [storeName, items] of Object.entries(data)) {
      if (Array.isArray(items) && items.length > 0) {
        await this.clear(storeName);
        for (const item of items) {
          delete item.id; // Remove ID to let autoIncrement handle it
          await this.add(storeName, item);
        }
      }
    }
  }
}

const db = new DBManager();