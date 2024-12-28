import { getModule } from '../module';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const finalizationRegistry = new FinalizationRegistry(({ ptr, freeFunc }: { ptr: any; freeFunc: any }) => {
  const module = getModule();
  if (ptr && freeFunc) {
    const ptrPtr = module._malloc(4);
    module.setValue(ptrPtr, ptr, 'i32');
    freeFunc(ptrPtr);
    module._free(ptrPtr);
  }
});

export { finalizationRegistry };
