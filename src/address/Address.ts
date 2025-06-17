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

import { AddressType } from './AddressType';
import { BaseAddress } from './BaseAddress';
import { ByronAddress } from './ByronAddress';
import { EnterpriseAddress } from './EnterpriseAddress';
import { NetworkId } from './NetworkId';
import { PointerAddress } from './PointerAddress';
import { RewardAddress } from './RewardAddress';
import { assertSuccess, writeStringToMemory } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';
import { hexToUint8Array, uint8ArrayToHex } from '../cometa';

/* DEFINITIONS ****************************************************************/

/**
 * Represents a Cardano address in the blockchain ecosystem.
 *
 * The `Address` class provides methods for creating, managing, and performing operations
 * with Cardano addresses, including encoding/decoding and validation.
 */
export class Address {
  /**
   * Pointer to the native Address object in memory.
   */
  public ptr: number;

  /**
   * Constructs a new `Address` instance.
   *
   * This constructor is not meant to be called directly. Use static methods like:
   * - {@link Address.fromBytes} to create an instance from raw byte data.
   * - {@link Address.fromHex} to create an instance from a hexadecimal string.
   * - {@link Address.fromBech32} to create an instance from a Bech32-encoded string.
   *
   * @param ptr The memory address of the native Address object.
   * @param managed Whether the instance should be managed by the finalization registry for garbage collection.
   * @private
   */
  public constructor(ptr: number, managed = true) {
    this.ptr = ptr;

    if (!this.ptr) {
      throw new Error('Address pointer is null or undefined.');
    }

    // Register the instance for garbage collection if managed

    if (!managed) return;

    finalizationRegistry.register(this, {
      freeFunc: getModule().address_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates an `Address` instance from raw bytes.
   *
   * @param data The raw byte data of the address.
   * @returns A new `Address` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBytes(data: Uint8Array): Address {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const addressPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.address_from_bytes(dataPtr, data.length, addressPtrPtr);

      assertSuccess(result, 'Failed to create address from bytes.');

      const addressPtr = module.getValue(addressPtrPtr, 'i32');
      return new Address(addressPtr);
    } finally {
      module._free(dataPtr);
      module._free(addressPtrPtr);
    }
  }

  /**
   * Creates an `Address` instance from a hexadecimal string.
   *
   * @param hex The hexadecimal string representing the address.
   * @returns A new `Address` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromHex(hex: string): Address {
    return Address.fromBytes(hexToUint8Array(hex));
  }

  /**
   * Creates an `Address` instance from a string.
   *
   * @param address The string representing the address.
   * @returns A new `Address` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromString(address: string): Address {
    const module = getModule();
    const bech32Ptr = writeStringToMemory(address);
    const addressPtrPtr = module._malloc(4);

    try {
      const result = module.address_from_string(bech32Ptr, address.length, addressPtrPtr);

      assertSuccess(result, 'Failed to create address from Bech32.');

      const addressPtr = module.getValue(addressPtrPtr, 'i32');
      return new Address(addressPtr);
    } finally {
      module._free(bech32Ptr);
      module._free(addressPtrPtr);
    }
  }

  /**
   * Converts the address to its raw byte representation.
   *
   * @returns A `Uint8Array` containing the raw byte representation of the address.
   * @throws {Error} If the operation fails.
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = this.getBytesSize();
    const bufferPtr = module._malloc(size);

    try {
      const result = module.address_to_bytes(this.ptr, bufferPtr, size);

      assertSuccess(result, 'Failed to convert address to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Converts the address to a hexadecimal string representation.
   *
   * @returns A string containing the hexadecimal representation of the address.
   * @throws {Error} If the operation fails.
   */
  public toHex(): string {
    return uint8ArrayToHex(this.toBytes());
  }

  /**
   * Converts the address to string representation.
   *
   * @returns A string containing the representation of the address.
   * @throws {Error} If the operation fails.
   */
  public toString(): string {
    const module = getModule();
    const size = this.getStringSize();
    const stringPtr = module._malloc(size);

    try {
      const result = module.address_to_string(this.ptr, stringPtr, size);

      assertSuccess(result, 'Failed to convert address to string.');

      return module.UTF8ToString(stringPtr);
    } finally {
      module._free(stringPtr);
    }
  }

  /**
   * Gets the reference count of the address object in the WASM context.
   *
   * @returns The current reference count of the address object.
   */
  public refCount(): number {
    const module = getModule();
    return module.address_refcount(this.ptr);
  }

  /**
   * Validates if a string is a valid Bech32-encoded address.
   *
   * @param bech32 The Bech32-encoded string to validate.
   * @returns True if the string is a valid Bech32-encoded address.
   */
  public static isValidBech32(bech32: string): boolean {
    const module = getModule();
    const bech32Ptr = writeStringToMemory(bech32);

    try {
      return module.address_is_valid_bech32(bech32Ptr, bech32.length) === 1;
    } finally {
      module._free(bech32Ptr);
    }
  }

  /**
   * Validates if a string is a valid Byron-encoded address.
   *
   * @param byron The Byron-encoded string to validate.
   * @returns True if the string is a valid Byron-encoded address.
   */
  public static isValidByron(byron: string): boolean {
    const module = getModule();
    const byronPtr = writeStringToMemory(byron);

    try {
      return module.address_is_valid_byron(byronPtr, byron.length) === 1;
    } finally {
      module._free(byronPtr);
    }
  }

  /**
   * Validates if a string is a valid address in any supported format.
   *
   * @param address The address string to validate.
   * @returns True if the string is a valid address.
   */
  public static isValid(address: string): boolean {
    const module = getModule();
    const addressPtr = writeStringToMemory(address);

    try {
      return module.address_is_valid(addressPtr, address.length) === 1;
    } finally {
      module._free(addressPtr);
    }
  }

  /**
   * Gets the type of the address.
   *
   * @returns The type of the address.
   * @throws {Error} If the operation fails.
   */
  public getType(): AddressType {
    const module = getModule();
    const typePtr = module._malloc(4);

    try {
      const result = module.address_get_type(this.ptr, typePtr);
      assertSuccess(result, 'Failed to get address type.');

      return module.getValue(typePtr, 'i32') as AddressType;
    } finally {
      module._free(typePtr);
    }
  }

  /**
   * Gets the network ID of the address.
   *
   * @returns The network ID of the address.
   * @throws {Error} If the operation fails.
   */
  public getNetworkId(): NetworkId {
    const module = getModule();
    const networkIdPtr = module._malloc(4);

    try {
      const result = module.address_get_network_id(this.ptr, networkIdPtr);
      assertSuccess(result, 'Failed to get network ID.');
      return module.getValue(networkIdPtr, 'i32') as NetworkId;
    } finally {
      module._free(networkIdPtr);
    }
  }

  /**
   * Attempts to convert this address to a base address.
   *
   * @returns A new `BaseAddress` instance if the address is a base address, null otherwise.
   */
  public asBase(): BaseAddress | null {
    try {
      return BaseAddress.fromAddress(this);
    } catch {
      return null;
    }
  }

  /**
   * Attempts to convert this address to an enterprise address.
   *
   * @returns A new `EnterpriseAddress` instance if the address is an enterprise address, null otherwise.
   */
  public asEnterprise(): EnterpriseAddress | null {
    try {
      return EnterpriseAddress.fromAddress(this);
    } catch {
      return null;
    }
  }

  /**
   * Attempts to convert this address to a pointer address.
   *
   * @returns A new `PointerAddress` instance if the address is a pointer address, null otherwise.
   */
  public asPointer(): PointerAddress | null {
    try {
      return PointerAddress.fromAddress(this);
    } catch {
      return null;
    }
  }

  /**
   * Attempts to convert this address to a reward address.
   *
   * @returns A new `RewardAddress` instance if the address is a reward address, null otherwise.
   */
  public asReward(): RewardAddress | null {
    try {
      return RewardAddress.fromAddress(this);
    } catch {
      return null;
    }
  }

  /**
   * Attempts to convert this address to a Byron address.
   *
   * @returns A new `ByronAddress` instance if the address is a Byron address, null otherwise.
   */
  public asByron(): ByronAddress | null {
    try {
      return ByronAddress.fromAddress(this);
    } catch {
      return null;
    }
  }

  /**
   * Gets the size in bytes of the address.
   * @returns The size in bytes.
   * @private
   */
  private getBytesSize(): number {
    const module = getModule();
    return module.address_get_bytes_size(this.ptr);
  }

  /**
   * Gets the size of the string representation.
   * @returns The size of the string.
   * @private
   */
  private getStringSize(): number {
    const module = getModule();
    return module.address_get_string_size(this.ptr);
  }
}
