// "Global" references in this module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _Module: any;
let _isReady = false;

/**
 * Returns a Promise that resolves once the WASM module is ready.
 * If it's already ready, returns a resolved Promise immediately.
 */
export const ready = async (): Promise<void> => {
  if (_isReady) return Promise.resolve();

  // Dynamically import the factory function
  const ModuleFactory = (await import('../libcardano-c/cardano_c.js')).default;

  return new Promise<void>((resolve, reject) => {
    ModuleFactory({
      onRuntimeInitialized: () => {
        _isReady = true;
        resolve();
      },
      onAbort: (err: unknown) => {
        reject(err);
      }
    })
      // eslint-disable-next-line promise/always-return
      .then((moduleInstance) => {
        _Module = moduleInstance;
        _isReady = true;
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * Returns the ready Emscripten module.
 * Throws if you haven't called `ready()` yet (or it hasn't resolved).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getModule = (): any => {
  if (!_isReady) {
    throw new Error('Module is not ready yet. Make sure to call `await Cometa.ready()` first.');
  }
  return _Module;
};

/**
 * Synchronous boolean check if the module is ready.
 * If you want to see if it's safe to call `getModule()`.
 */
export const isReady = (): boolean => _isReady;
