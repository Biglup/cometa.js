import { finalizationRegistry } from '../garbageCollection/finalizationRegistry';
import { getModule } from '../module';

export class CborWriter {
  public ptr: number;

  constructor() {
    this.ptr = getModule().cbor_writer_new();
    if (!this.ptr) {
      throw new Error('Failed to create CborWriter.');
    }

    finalizationRegistry.register(this, {
      freeFunc: getModule().cbor_writer_unref,
      ptr: this.ptr
    });
  }

  getEncodedData(): Uint8Array {
    const size = getModule().cbor_writer_get_encode_size(this.ptr);
    const bufferPtr = getModule()._malloc(size);
    try {
      const result = getModule().cbor_writer_encode(this.ptr, bufferPtr, size);
      if (result !== 0) {
        throw new Error('Failed to encode data in CborWriter.');
      }
      return new Uint8Array(getModule().HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      getModule()._free(bufferPtr);
    }
  }

  unref(): void {
    if (this.ptr !== 0) {
      const ptrPtr = getModule()._malloc(4);
      getModule().setValue(ptrPtr, this.ptr, 'i32');
      getModule().cbor_writer_free(ptrPtr);
      getModule()._free(ptrPtr);
      this.ptr = 0;
    }
  }

  finalize(): void {
    this.unref();
  }
}
