if (typeof globalThis.require === 'undefined' && typeof globalThis.__r === 'function') {
  globalThis.require = function requireShim(moduleId) {
    if (moduleId === '@babel/runtime/helpers/defineProperty') {
      return function defineProperty(obj, key, value) {
        key = typeof key === 'symbol' ? key : String(key);
        if (key in obj) {
          Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true,
          });
        } else {
          obj[key] = value;
        }
        return obj;
      };
    }

    return globalThis.__r(moduleId);
  };
}
