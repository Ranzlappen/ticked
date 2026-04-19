// ── IndexedDB key-value helper ───────────────────────────
// Mirrors the shape of safeStorage (get/set/remove) but backed by IndexedDB
// so the main store payload can exceed the ~5-10 MB localStorage quota.
// Database name, object store name, and schema version are load-bearing —
// changing them requires a migration path inside core.js load().

const IDB_DB_NAME    = 'ticked_idb';
const IDB_STORE_NAME = 'kv';
const IDB_VERSION    = 1;

let _idbPromise = null;
function _openIdb() {
    if (_idbPromise) return _idbPromise;
    _idbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in self)) { reject(new Error('no-idb')); return; }
        const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE_NAME);
        req.onsuccess       = () => resolve(req.result);
        req.onerror         = () => reject(req.error);
        req.onblocked       = () => reject(new Error('idb-blocked'));
    }).catch(err => { _idbPromise = null; throw err; });
    return _idbPromise;
}

const idbStorage = {
    available() { return 'indexedDB' in self; },
    async get(key) {
        const db = await _openIdb();
        return new Promise((resolve, reject) => {
            const tx  = db.transaction(IDB_STORE_NAME, 'readonly');
            const req = tx.objectStore(IDB_STORE_NAME).get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror   = () => reject(req.error);
        });
    },
    async set(key, value) {
        const db = await _openIdb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
            tx.objectStore(IDB_STORE_NAME).put(value, key);
            tx.oncomplete = () => resolve(true);
            tx.onerror    = () => reject(tx.error);
            tx.onabort    = () => reject(tx.error);
        });
    },
    async remove(key) {
        const db = await _openIdb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
            tx.objectStore(IDB_STORE_NAME).delete(key);
            tx.oncomplete = () => resolve(true);
            tx.onerror    = () => reject(tx.error);
        });
    }
};
