import { ImportSpec, writePtr } from './trampolines';

export const providerSpecs: ImportSpec[] = [
  {
    cName: 'emscripten_get_parameters',
    encode: (result, [, outPtr]) => {
      console.error('Calling emscripten_get_parameters with ptr:', result, 'outPtr:', outPtr);
      writePtr(outPtr, result);
      return 0;
    },
    jsMethod: 'getParameters'
  }
];
