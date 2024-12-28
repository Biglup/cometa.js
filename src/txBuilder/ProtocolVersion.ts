import { CborReader } from '../encoding/CborReader';
import { CborWriter } from '../encoding/CborWriter';
import { finalizationRegistry } from '../garbageCollection/finalizationRegistry';
import { getModule } from '../module';

export class ProtocolVersion {
  public ptr: number;

  constructor(major: number, minor: number) {
    const protocolPtrPtr = getModule()._malloc(4);

    const result = getModule().protocol_version_new(major, 0, minor, 0, protocolPtrPtr);

    if (result !== 0) {
      const errorMessagePtr = getModule().error_to_string(result);
      const errorMessage = getModule().UTF8ToString(errorMessagePtr);
      getModule()._free(protocolPtrPtr);
      throw new Error(`Failed to create ProtocolVersion. Error code: ${result}, message: ${errorMessage}`);
    }

    this.ptr = getModule().HEAP32[protocolPtrPtr >> 2];
    getModule()._free(protocolPtrPtr);

    finalizationRegistry.register(this, {
      freeFunc: getModule().protocol_version_unref,
      ptr: this.ptr
    });
  }

  static fromCbor(reader: CborReader): ProtocolVersion {
    if (!reader || !reader.ptr) {
      throw new Error('Invalid CborReader instance.');
    }

    const protocolPtrPtr = getModule()._malloc(4);

    try {
      const result = getModule().protocol_version_from_cbor(reader.ptr, protocolPtrPtr);
      if (result !== 0) {
        throw new Error(`Failed to deserialize ProtocolVersion from CBOR: error code ${result}`);
      }

      const protocolPtr = getModule().HEAP32[protocolPtrPtr >> 2];
      const instance = Object.create(ProtocolVersion.prototype) as ProtocolVersion;
      instance.ptr = protocolPtr;

      finalizationRegistry.register(instance, {
        freeFunc: getModule().protocol_version_unref,
        ptr: protocolPtr
      });

      return instance;
    } finally {
      getModule()._free(protocolPtrPtr);
    }
  }

  toCbor(writer: CborWriter): void {
    if (!writer || !writer.ptr) {
      throw new Error('Invalid CborWriter instance.');
    }

    const result = getModule().protocol_version_to_cbor(this.ptr, writer.ptr);

    if (result !== 0) {
      const errorMessagePtr = getModule().error_to_string(result);
      const errorMessage = getModule().UTF8ToString(errorMessagePtr);

      throw new Error(`Failed to serialize ProtocolVersion to CBOR: error code ${result}, message: ${errorMessage}`);
    }
  }

  getMajor(): number {
    return getModule().protocol_version_get_major(this.ptr);
  }

  setMajor(major: number): void {
    const resultPtr = getModule()._malloc(4);
    try {
      const result = getModule().protocol_version_set_major(this.ptr, major, resultPtr);
      if (result !== 0) {
        throw new Error(`Failed to set major version: error code ${result}`);
      }
    } finally {
      getModule()._free(resultPtr);
    }
  }

  getMinor(): number {
    return getModule().protocol_version_get_minor(this.ptr);
  }

  setMinor(minor: number): void {
    const resultPtr = getModule()._malloc(4);
    try {
      const result = getModule().protocol_version_set_minor(this.ptr, minor, resultPtr);
      if (result !== 0) {
        throw new Error(`Failed to set minor version: error code ${result}`);
      }
    } finally {
      getModule()._free(resultPtr);
    }
  }
}
