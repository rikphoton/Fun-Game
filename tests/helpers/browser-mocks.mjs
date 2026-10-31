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
  if (typeof globalThis.navigator === 'undefined') {
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { getGamepads: () => [] },
        configurable: true,
        writable: true
      });
    } catch {
      globalThis.navigator = { getGamepads: () => [] };
    }
  } else if (!globalThis.navigator.getGamepads) {
    try {
      globalThis.navigator.getGamepads = () => [];
    } catch {}
  }
  return localStorageMock;
}

// Node 21+ defines `navigator` as a getter, so it has to be replaced via defineProperty.
export function setNavigator(value) {
  try {
    Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
  } catch {
    globalThis.navigator = value;
  }
}
