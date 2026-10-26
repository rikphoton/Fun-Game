// Minimal browser globals so the engine modules can be imported under plain Node.
export function installBrowserMocks() {
  const store = new Map();
  const localStorageMock = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
    _store: store
  };
  globalThis.localStorage = localStorageMock;
  globalThis.window = globalThis.window || {};
  globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
  return localStorageMock;
}

// Node 21+ defines `navigator` as a getter, so it has to be replaced via defineProperty.
export function setNavigator(value) {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
}
