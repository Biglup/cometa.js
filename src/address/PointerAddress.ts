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
import { Credential } from './Credential';
import { NetworkId } from './NetworkId';
import { StakePointer } from './StakePointer';
import {
  assertSuccess,
  readCredential,
  readI64,
  unrefObject,
  writeCredential,
  writeI64,
  writeStringToMemory
} from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Represents a pointer address in the Cardano blockchain.
 *
 * A pointer address is a type of Shelley-era address that includes a payment credential
 * and a stake pointer. The stake pointer references a stake credential by its location
 * in the blockchain (slot, transaction index, and output index) rather than by its hash.
 * This allows for more efficient stake credential lookup in certain scenarios.
 */
export class PointerAddress {
  /**
   * The memory address of the `PointerAddress` WASM object.
   */
  public ptr: number;

  /**
   * Constructs a new `PointerAddress` instance.
   *
   * This constructor is not meant to be called directly. Instead, use static methods like:
   * - {@link PointerAddress.fromCredentials}: Creates a pointer address from payment credentials and stake pointer.
   * - {@link PointerAddress.fromAddress}: Creates a pointer address from a general address.
   * - {@link PointerAddress.fromBytes}: Creates a pointer address from raw bytes.
   * - {@link PointerAddress.fromBech32}: Creates a pointer address from a Bech32 string.
   *
   * @param ptr The memory address of the pointer address WASM object.
   * @private
   */
  public constructor(ptr: number) {
    this.ptr = ptr;

    finalizationRegistry.register(this, {
      freeFunc: getModule().pointer_address_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates a pointer address from payment credentials and stake pointer.
   *
   * @param networkId The network identifier (mainnet or testnet).
   * @param payment The payment credential.
   * @param stakePointer The stake pointer containing slot, transaction index, and certificate index.
   * @returns A new `PointerAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromCredentials(networkId: NetworkId, payment: Credential, stakePointer: StakePointer): PointerAddress {
    const module = getModule();
    const pointerAddressPtrPtr = module._malloc(4);
    let paymentPtr: number | null = null;
    const stakePointerPtr = module._malloc(24);

    try {
      paymentPtr = writeCredential(payment);

      writeI64(stakePointerPtr, stakePointer.slot, false);
      writeI64(stakePointerPtr + 8, stakePointer.txIndex, false);
      writeI64(stakePointerPtr + 16, stakePointer.certIndex, false);

      const result = module.pointer_address_from_credentials(
        networkId,
        paymentPtr,
        stakePointerPtr,
        pointerAddressPtrPtr
      );

      assertSuccess(result, 'Failed to create pointer address from credentials.');

      const pointerAddressPtr = module.getValue(pointerAddressPtrPtr, 'i32');
      return new PointerAddress(pointerAddressPtr);
    } finally {
      if (paymentPtr) {
        unrefObject(paymentPtr);
      }

      module._free(stakePointerPtr);
      module._free(pointerAddressPtrPtr);
    }
  }

  /**
   * Creates a pointer address from a general address.
   *
   * @param address The general address to convert.
   * @returns A new `PointerAddress` instance.
   * @throws {Error} If the operation fails or if the address is not a pointer address.
   */
  public static fromAddress(address: Address): PointerAddress {
    const module = getModule();
    const pointerAddressPtrPtr = module._malloc(4);

    try {
      const result = module.pointer_address_from_address(address.ptr, pointerAddressPtrPtr);

      assertSuccess(result, 'Failed to create pointer address from address.');

      const pointerAddressPtr = module.getValue(pointerAddressPtrPtr, 'i32');
      return new PointerAddress(pointerAddressPtr);
    } finally {
      module._free(pointerAddressPtrPtr);
    }
  }

  /**
   * Creates a pointer address from raw bytes.
   *
   * @param data The byte array containing the address data.
   * @returns A new `PointerAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBytes(data: Uint8Array): PointerAddress {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const pointerAddressPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.pointer_address_from_bytes(dataPtr, data.length, pointerAddressPtrPtr);

      assertSuccess(result, 'Failed to create pointer address from bytes.');

      const pointerAddressPtr = module.getValue(pointerAddressPtrPtr, 'i32');
      return new PointerAddress(pointerAddressPtr);
    } finally {
      module._free(dataPtr);
      module._free(pointerAddressPtrPtr);
    }
  }

  /**
   * Creates a pointer address from a Bech32 string.
   *
   * @param data The Bech32 string containing the address.
   * @returns A new `PointerAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBech32(data: string): PointerAddress {
    const module = getModule();
    const dataPtr = writeStringToMemory(data);
    const pointerAddressPtrPtr = module._malloc(4);

    try {
      const result = module.pointer_address_from_bech32(dataPtr, data.length, pointerAddressPtrPtr);

      assertSuccess(result, 'Failed to create pointer address from Bech32.');

      const pointerAddressPtr = module.getValue(pointerAddressPtrPtr, 'i32');
      return new PointerAddress(pointerAddressPtr);
    } finally {
      module._free(dataPtr);
      module._free(pointerAddressPtrPtr);
    }
  }

  /**
   * Converts this pointer address to a general address.
   *
   * @returns A new `Address` instance.
   * @throws {Error} If the operation fails.
   */
  public toAddress(): Address {
    const module = getModule();
    const addressPtr = module.pointer_address_to_address(this.ptr);

    if (!addressPtr) {
      throw new Error('Failed to convert pointer address to address.');
    }

    return new Address(addressPtr);
  }

  /**
   * Gets the payment credential of the pointer address.
   *
   * @returns The payment credential.
   * @throws {Error} If the operation fails.
   */
  public getPaymentCredential(): Credential {
    const module = getModule();
    const credentialPtr = module.pointer_address_get_payment_credential(this.ptr);

    if (!credentialPtr) {
      throw new Error('Failed to get payment credential.');
    }

    try {
      return readCredential(credentialPtr);
    } finally {
      unrefObject(credentialPtr);
    }
  }

  /**
   * Gets the stake pointer information.
   *
   * @returns The stake pointer containing slot, transaction index, and certificate index.
   * @throws {Error} If the operation fails.
   */
  public getStakePointer(): StakePointer {
    const module = getModule();
    const stakePointerPtr = module._malloc(24);

    try {
      const result = module.pointer_address_get_stake_pointer(this.ptr, stakePointerPtr);
      assertSuccess(result, 'Failed to get stake pointer.');

      const slot = readI64(stakePointerPtr);
      const txIndex = Number(readI64(stakePointerPtr + 8));
      const certIndex = Number(readI64(stakePointerPtr + 16));

      return {
        certIndex,
        slot,
        txIndex
      };
    } finally {
      module._free(stakePointerPtr);
    }
  }

  /**
   * Gets the network ID of the pointer address.
   *
   * @returns The network ID.
   * @throws {Error} If the operation fails.
   */
  public getNetworkId(): NetworkId {
    const module = getModule();
    const networkIdPtr = module._malloc(4);

    try {
      const result = module.pointer_address_get_network_id(this.ptr, networkIdPtr);
      assertSuccess(result, 'Failed to get network ID.');

      return module.getValue(networkIdPtr, 'i32');
    } finally {
      module._free(networkIdPtr);
    }
  }

  /**
   * Gets the raw bytes of the pointer address.
   *
   * @returns A byte array containing the address data.
   * @throws {Error} If the operation fails.
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = module.pointer_address_get_bytes_size(this.ptr);
    const bufferPtr = module._malloc(size);

    try {
      const result = module.pointer_address_to_bytes(this.ptr, bufferPtr, size);
      assertSuccess(result, 'Failed to convert pointer address to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Gets the Bech32 string representation of the pointer address.
   *
   * @returns A Bech32 string containing the address.
   * @throws {Error} If the operation fails.
   */
  public toBech32(): string {
    const module = getModule();
    const size = module.pointer_address_get_bech32_size(this.ptr);
    const bufferPtr = module._malloc(size);

    try {
      const result = module.pointer_address_to_bech32(this.ptr, bufferPtr, size);
      assertSuccess(result, 'Failed to convert pointer address to Bech32.');

      return module.UTF8ToString(bufferPtr);
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Gets the reference count of the pointer address.
   *
   * @returns The current reference count.
   */
  public refCount(): number {
    const module = getModule();
    return module.pointer_address_refcount(this.ptr);
  }
}
