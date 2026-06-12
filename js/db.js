// IndexedDB wrapper for Noutheo PWA — replaces Android's Room/SQLite database.

const DB_NAME = 'noutheo';
const DB_VERSION = 1;

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('journal')) {
        db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('actionItems')) {
        db.createObjectStore('actionItems', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('vault')) {
        db.createObjectStore('vault', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('sessionQuotes')) {
        db.createObjectStore('sessionQuotes', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('conversation')) {
        db.createObjectStore('conversation', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

function tx(storeName, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = fn(store);
    transaction.oncomplete = () => resolve(result && result.__pendingResult !== undefined ? result.__pendingResult : result);
    transaction.onerror = (e) => reject(e.target.error);
  }));
}

// Generic helpers
const DB = {
  add(storeName, value) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readwrite');
      const req = t.objectStore(storeName).add(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    }));
  },
  put(storeName, value) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readwrite');
      const req = t.objectStore(storeName).put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    }));
  },
  get(storeName, key) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readonly');
      const req = t.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    }));
  },
  getAll(storeName) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readonly');
      const req = t.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    }));
  },
  delete(storeName, key) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readwrite');
      const req = t.objectStore(storeName).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    }));
  },
  clear(storeName) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readwrite');
      const req = t.objectStore(storeName).clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    }));
  }
};

// Settings convenience
DB.getSetting = function (key, fallback) {
  return DB.get('settings', key).then(row => row ? row.value : fallback);
};
DB.setSetting = function (key, value) {
  return DB.put('settings', { key, value });
};
