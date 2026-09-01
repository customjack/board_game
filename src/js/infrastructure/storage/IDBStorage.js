/**
 * IDBStorage - IndexedDB-backed key/value store that mirrors the localStorage API.
 *
 * Why IndexedDB instead of localStorage?
 *  - localStorage is limited to ~5-10 MB and is synchronous (blocks the main thread).
 *  - IndexedDB supports hundreds of MB, is async, and can store binary data natively.
 *
 * Usage:
 *   const store = new IDBStorage('my-db', 'my-store');
 *   await store.ready();          // wait for DB open (once per instance)
 *   await store.setItem('key', value);   // value can be any structured-clone-able object
 *   const v = await store.getItem('key');
 *   await store.removeItem('key');
 *   await store.clear();
 *   const keys = await store.keys();
 */
export default class IDBStorage {
    /**
     * All object stores that belong to 'board-game-db', in the order they were added.
     * Bump DB_VERSION whenever a new store is added here.
     */
    static DB_VERSION = 2;
    static DB_STORES = ['game-states', 'map-editor', 'maps'];

    /**
     * @param {string} dbName    - IndexedDB database name
     * @param {string} storeName - Object store name within the database
     * @param {number} [version] - DB schema version (defaults to DB_VERSION for 'board-game-db')
     */
    constructor(dbName = 'board-game-db', storeName = 'kv', version = null) {
        this.dbName = dbName;
        this.storeName = storeName;
        // Use the shared version for the shared DB so all stores are always created on upgrade
        this.version = version ?? (dbName === 'board-game-db' ? IDBStorage.DB_VERSION : 1);
        this._db = null;
        this._readyPromise = null;
    }

    /** Open (or reuse) the database. Safe to call multiple times. */
    ready() {
        if (this._readyPromise) return this._readyPromise;
        this._readyPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, this.version);

            req.onupgradeneeded = (event) => {
                const db = event.target.result;
                // When upgrading 'board-game-db', ensure every known store exists
                const storesToCreate = this.dbName === 'board-game-db'
                    ? IDBStorage.DB_STORES
                    : [this.storeName];
                for (const name of storesToCreate) {
                    if (!db.objectStoreNames.contains(name)) {
                        db.createObjectStore(name);
                    }
                }
            };

            req.onsuccess = (event) => {
                this._db = event.target.result;
                resolve(this._db);
            };

            req.onerror = (event) => {
                console.error(`[IDBStorage] Failed to open "${this.dbName}":`, event.target.error);
                reject(event.target.error);
            };
        });
        return this._readyPromise;
    }

    /** @private - get a transaction + object store */
    _store(mode = 'readonly') {
        if (!this._db) throw new Error('[IDBStorage] DB not open — call ready() first');
        return this._db.transaction(this.storeName, mode).objectStore(this.storeName);
    }

    /** @private - wrap an IDB request in a Promise */
    static _wrap(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror  = () => reject(req.error);
        });
    }

    /** Retrieve a value by key. Returns null if not found. */
    async getItem(key) {
        await this.ready();
        const result = await IDBStorage._wrap(this._store('readonly').get(key));
        return result === undefined ? null : result;
    }

    /** Store a value. Value must be structured-clone-able (objects, arrays, strings, etc.). */
    async setItem(key, value) {
        await this.ready();
        await IDBStorage._wrap(this._store('readwrite').put(value, key));
    }

    /** Delete a key. */
    async removeItem(key) {
        await this.ready();
        await IDBStorage._wrap(this._store('readwrite').delete(key));
    }

    /** Delete all entries in this store. */
    async clear() {
        await this.ready();
        await IDBStorage._wrap(this._store('readwrite').clear());
    }

    /** Return all keys in the store. */
    async keys() {
        await this.ready();
        return IDBStorage._wrap(this._store('readonly').getAllKeys());
    }

    /**
     * One-time migration: copy all keys from localStorage that match a prefix
     * into IndexedDB, then remove them from localStorage.
     * Safe to call on every startup — skips keys that already exist in IDB.
     */
    async migrateFromLocalStorage(keys) {
        await this.ready();
        for (const key of keys) {
            const raw = localStorage.getItem(key);
            if (raw === null) continue;

            const existing = await this.getItem(key);
            if (existing !== null) {
                // Already migrated — just clean up localStorage
                localStorage.removeItem(key);
                continue;
            }

            try {
                const parsed = JSON.parse(raw);
                await this.setItem(key, parsed);
                localStorage.removeItem(key);
                console.log(`[IDBStorage] Migrated "${key}" from localStorage → IndexedDB`);
            } catch (e) {
                console.warn(`[IDBStorage] Could not migrate "${key}":`, e);
            }
        }
    }
}
