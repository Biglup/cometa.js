/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS ********************************************************************/

import { Address } from './Address';
import { ByronAddressAttributes } from './ByronAddressAttributes';
import { ByronAddressType } from './ByronAddressType';
import { NetworkId } from './NetworkId';
import {
  assertSuccess,
  blake2bHashFromHex,
  readBlake2bHashData,
  unrefObject,
  writeI64,
  writeStringToMemory
} from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Represents a Byron-era address in the Cardano blockchain.
 *
 * Byron addresses were used during the Byron era of the Cardano blockchain and include
 * additional attributes such as derivation paths and network magic identifiers.
 */
export class ByronAddress {
  /**
   * The memory address of the `ByronAddress` WASM object.
   */
  public ptr: number;

  /**
   * Constructs a new `ByronAddress` instance.
   *
   * This constructor is not meant to be called directly. Instead, use static methods like:
   * - {@link ByronAddress.fromCredentials}: Creates a Byron address from credentials and attributes.
   * - {@link ByronAddress.fromAddress}: Creates a Byron address from a general address.
   * - {@link ByronAddress.fromBytes}: Creates a Byron address from raw bytes.
   * - {@link ByronAddress.fromBase58}: Creates a Byron address from a Base58 string.
   *
   * @param ptr The memory address of the Byron address WASM object.
   * @private
   */
  public constructor(ptr: number) {
    this.ptr = ptr;

    finalizationRegistry.register(this, {
      freeFunc: getModule().byron_address_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates a Byron address from credentials and attributes.
   *
   * @param root The root hash of the address as a hex string.
   * @param attributes Optional attributes for the address.
   * @param type The type of Byron address.
   * @returns A new `ByronAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromCredentials(
    root: string,
    attributes: ByronAddressAttributes,
    type: ByronAddressType
  ): ByronAddress {
    const module = getModule();
    const byronAddressPtrPtr = module._malloc(4);
    const attributesPtr = module._malloc(80);
    let blake2bHashPtr;

    try {
      blake2bHashPtr = blake2bHashFromHex(root);

      const derivationPathBytes = new Uint8Array(Buffer.from(attributes.derivationPath, 'hex'));
      module.HEAPU8.set(derivationPathBytes, attributesPtr);

      const sizeOffset = attributesPtr + 64;
      writeI64(sizeOffset, derivationPathBytes.length, false);

      const magicOffset = attributesPtr + 72;
      writeI64(magicOffset, attributes.magic, true);

      const result = module.byron_address_from_credentials(blake2bHashPtr, attributesPtr, type, byronAddressPtrPtr);
      assertSuccess(result, 'Failed to create Byron address from credentials.');

      const byronAddressPtr = module.getValue(byronAddressPtrPtr, 'i32');
      return new ByronAddress(byronAddressPtr);
    } finally {
      if (blake2bHashPtr) {
        unrefObject(blake2bHashPtr);
      }

      module._free(byronAddressPtrPtr);
      module._free(attributesPtr);
    }
  }

  /**
   * Creates a Byron address from a general Cardano address.
   *
   * @param address The general Cardano address to convert.
   * @returns A new `ByronAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromAddress(address: Address): ByronAddress {
    const module = getModule();
    const byronAddressPtrPtr = module._malloc(4);

    try {
      const result = module.byron_address_from_address(address.ptr, byronAddressPtrPtr);

      assertSuccess(result, 'Failed to create Byron address from general address.');

      const byronAddressPtr = module.getValue(byronAddressPtrPtr, 'i32');
      return new ByronAddress(byronAddressPtr);
    } finally {
      module._free(byronAddressPtrPtr);
    }
  }

  /**
   * Creates a Byron address from raw bytes.
   *
   * @param bytes The raw bytes of the address.
   * @returns A new `ByronAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBytes(bytes: Uint8Array): ByronAddress {
    const module = getModule();
    const bytesPtr = module._malloc(bytes.length);
    const byronAddressPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(bytes, bytesPtr);
      const result = module.byron_address_from_bytes(bytesPtr, bytes.length, byronAddressPtrPtr);

      assertSuccess(result, 'Failed to create Byron address from bytes.');
      const byronAddressPtr = module.getValue(byronAddressPtrPtr, 'i32');
      return new ByronAddress(byronAddressPtr);
    } finally {
      module._free(bytesPtr);
      module._free(byronAddressPtrPtr);
    }
  }

  /**
   * Creates a Byron address from a Base58 string.
   *
   * @param base58 The Base58 string representation of the address.
   * @returns A new `ByronAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBase58(base58: string): ByronAddress {
    const module = getModule();
    const base58Ptr = writeStringToMemory(base58);
    const byronAddressPtrPtr = module._malloc(4);

    try {
      const result = module.byron_address_from_base58(base58Ptr, base58.length, byronAddressPtrPtr);

      assertSuccess(result, 'Failed to create Byron address from Base58 string.');
      const byronAddressPtr = module.getValue(byronAddressPtrPtr, 'i32');
      return new ByronAddress(byronAddressPtr);
    } finally {
      module._free(base58Ptr);
      module._free(byronAddressPtrPtr);
    }
  }

  /**
   * Converts this Byron address to a general Cardano address.
   *
   * @returns A new `Address` instance.
   */
  public toAddress(): Address {
    const module = getModule();
    const result = module.byron_address_to_address(this.ptr);
    return new Address(result);
  }

  /**
   * Gets the attributes of this Byron address.
   *
   * @returns The address attributes.
   * @throws {Error} If the operation fails.
   */
  public getAttributes(): ByronAddressAttributes {
    const module = getModule();
    const attributesPtr = module._malloc(80);

    try {
      const result = module.byron_address_get_attributes(this.ptr, attributesPtr);
      assertSuccess(result, 'Failed to get Byron address attributes.');

      const derivationPathSize = module.getValue(attributesPtr + 64, 'i32');
      const derivationPathBytes = new Uint8Array(derivationPathSize);
      derivationPathBytes.set(module.HEAPU8.slice(attributesPtr, attributesPtr + derivationPathSize));
      const magic = module.getValue(attributesPtr + 72, 'i32');

      return {
        derivationPath: Buffer.from(derivationPathBytes).toString('hex'),
        magic
      };
    } finally {
      module._free(attributesPtr);
    }
  }

  /**
   * Gets the type of this Byron address.
   *
   * @returns The address type.
   * @throws {Error} If the operation fails.
   */
  public getType(): ByronAddressType {
    const module = getModule();
    const typePtr = module._malloc(4);

    try {
      const result = module.byron_address_get_type(this.ptr, typePtr);
      assertSuccess(result, 'Failed to get Byron address type.');
      return module.getValue(typePtr, 'i32') as ByronAddressType;
    } finally {
      module._free(typePtr);
    }
  }

  /**
   * Gets the root hash of this Byron address.
   *
   * @returns The root hash as a byte array.
   * @throws {Error} If the operation fails.
   */
  public getRoot(): string {
    const module = getModule();
    const hashPtrPtr = module._malloc(4);

    try {
      const result = module.byron_address_get_root(this.ptr, hashPtrPtr);
      assertSuccess(result, 'Failed to get Byron address root hash.');
      const hashPtr = module.getValue(hashPtrPtr, 'i32');

      return Buffer.from(readBlake2bHashData(hashPtr)).toString('hex');
    } finally {
      module._free(hashPtrPtr);
    }
  }

  /**
   * Gets the raw bytes of this Byron address.
   *
   * @returns The address as a byte array.
   * @throws {Error} If the operation fails.
   */
  public getBytes(): Uint8Array {
    const module = getModule();
    const size = module.byron_address_get_bytes_size(this.ptr);
    const bytesPtr = module._malloc(size);

    try {
      const result = module.byron_address_to_bytes(this.ptr, bytesPtr, size);
      assertSuccess(result, 'Failed to get Byron address bytes.');
      return new Uint8Array(module.HEAPU8.slice(bytesPtr, bytesPtr + size));
    } finally {
      module._free(bytesPtr);
    }
  }

  /**
   * Gets the Base58 string representation of this Byron address.
   *
   * @returns The address as a Base58 string.
   * @throws {Error} If the operation fails.
   */
  public toBase58(): string {
    const module = getModule();
    const size = module.byron_address_get_base58_size(this.ptr);
    const base58Ptr = module._malloc(size);

    try {
      const result = module.byron_address_to_base58(this.ptr, base58Ptr, size);
      assertSuccess(result, 'Failed to convert Byron address to Base58.');
      return module.UTF8ToString(base58Ptr);
    } finally {
      module._free(base58Ptr);
    }
  }

  /**
   * Gets the network ID of this Byron address.
   *
   * @returns The network ID.
   * @throws {Error} If the operation fails.
   */
  public getNetworkId(): NetworkId {
    const module = getModule();
    const networkIdPtr = module._malloc(4);

    try {
      const result = module.byron_address_get_network_id(this.ptr, networkIdPtr);
      assertSuccess(result, 'Failed to get Byron address network ID.');
      return module.getValue(networkIdPtr, 'i32') as NetworkId;
    } finally {
      module._free(networkIdPtr);
    }
  }

  /**
   * Gets the reference count of this Byron address.
   *
   * @returns The current reference count.
   */
  public refCount(): number {
    const module = getModule();
    return module.byron_address_refcount(this.ptr);
  }
}
