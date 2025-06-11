import { ImportSpec, writePtr } from './trampolines';

export const providerSpecs: ImportSpec[] = [
  {
    cName: 'emscripten_get_parameters',
    encode: (ptr, [, outPtr]) => {
      console.error('Calling emscripten_get_parameters with ptr:', ptr, 'outPtr:', outPtr);
      writePtr(outPtr, ptr);
      return 0;
    },
    jsMethod: 'getParameters'
  }
];
