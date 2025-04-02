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
import { assertSuccess, readCredential, unrefObject, writeCredential, writeStringToMemory } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Represents a base address in the Cardano blockchain.
 *
 * A base address is a type of Shelley-era address that includes both payment and stake credentials.
 * This allows for both spending funds and receiving staking rewards from the same address.
 */
export class BaseAddress {
  /**
   * The memory address of the `BaseAddress` WASM object.
   */
  public ptr: number;

  /**
   * Constructs a new `BaseAddress` instance.
   *
   * This constructor is not meant to be called directly. Instead, use static methods like:
   * - {@link BaseAddress.fromCredentials}: Creates a base address from payment and stake credentials.
   * - {@link BaseAddress.fromAddress}: Creates a base address from a general address.
   * - {@link BaseAddress.fromBytes}: Creates a base address from raw bytes.
   * - {@link BaseAddress.fromBech32}: Creates a base address from a Bech32 string.
   *
   * @param ptr The memory address of the base address WASM object.
   * @private
   */
  public constructor(ptr: number) {
    this.ptr = ptr;

    finalizationRegistry.register(this, {
      freeFunc: getModule().base_address_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates a base address from payment and stake credentials.
   *
   * @param networkId The network identifier (mainnet or testnet).
   * @param payment The payment credential.
   * @param stake The stake credential.
   * @returns A new `BaseAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromCredentials(networkId: NetworkId, payment: Credential, stake: Credential): BaseAddress {
    const module = getModule();
    const baseAddressPtrPtr = module._malloc(4);
    let paymentPtr: number | null = null;
    let stakePtr: number | null = null;

    try {
      paymentPtr = writeCredential(payment);
      stakePtr = writeCredential(stake);

      const result = module.base_address_from_credentials(networkId, paymentPtr, stakePtr, baseAddressPtrPtr);
      assertSuccess(result, 'Failed to create base address from credentials.');

      const baseAddressPtr = module.getValue(baseAddressPtrPtr, 'i32');
      return new BaseAddress(baseAddressPtr);
    } finally {
      if (paymentPtr) {
        unrefObject(paymentPtr);
      }
      if (stakePtr) {
        unrefObject(stakePtr);
      }

      module._free(baseAddressPtrPtr);
    }
  }

  /**
   * Creates a base address from a general address.
   *
   * @param address The general address to convert.
   * @returns A new `BaseAddress` instance.
   * @throws {Error} If the operation fails or if the address is not a base address.
   */
  public static fromAddress(address: Address): BaseAddress {
    const module = getModule();
    const baseAddressPtrPtr = module._malloc(4);

    try {
      const result = module.base_address_from_address(address.ptr, baseAddressPtrPtr);

      assertSuccess(result, 'Failed to create base address from address.');

      const baseAddressPtr = module.getValue(baseAddressPtrPtr, 'i32');
      return new BaseAddress(baseAddressPtr);
    } finally {
      module._free(baseAddressPtrPtr);
    }
  }

  /**
   * Creates a base address from raw bytes.
   *
   * @param data The byte array containing the address data.
   * @returns A new `BaseAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBytes(data: Uint8Array): BaseAddress {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const baseAddressPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.base_address_from_bytes(dataPtr, data.length, baseAddressPtrPtr);

      assertSuccess(result, 'Failed to create base address from bytes.');

      const baseAddressPtr = module.getValue(baseAddressPtrPtr, 'i32');
      return new BaseAddress(baseAddressPtr);
    } finally {
      module._free(dataPtr);
      module._free(baseAddressPtrPtr);
    }
  }

  /**
   * Creates a base address from a Bech32 string.
   *
   * @param data The Bech32 string containing the address.
   * @returns A new `BaseAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBech32(data: string): BaseAddress {
    const module = getModule();
    const dataPtr = writeStringToMemory(data);
    const baseAddressPtrPtr = module._malloc(4);

    try {
      const result = module.base_address_from_bech32(dataPtr, data.length, baseAddressPtrPtr);

      assertSuccess(result, 'Failed to create base address from Bech32.');

      const baseAddressPtr = module.getValue(baseAddressPtrPtr, 'i32');
      return new BaseAddress(baseAddressPtr);
    } finally {
      module._free(dataPtr);
      module._free(baseAddressPtrPtr);
    }
  }

  /**
   * Converts this base address to a general address.
   *
   * @returns A new `Address` instance.
   * @throws {Error} If the operation fails.
   */
  public toAddress(): Address {
    const module = getModule();
    const addressPtr = module.base_address_to_address(this.ptr);

    if (!addressPtr) {
      throw new Error('Failed to convert base address to address.');
    }

    return new Address(addressPtr);
  }

  /**
   * Gets the payment credential of the base address.
   *
   * @returns The payment credential.
   * @throws {Error} If the operation fails.
   */
  public getPaymentCredential(): Credential {
    const module = getModule();
    const credentialPtr = module.base_address_get_payment_credential(this.ptr);

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
   * Gets the stake credential of the base address.
   *
   * @returns The stake credential.
   * @throws {Error} If the operation fails.
   */
  public getStakeCredential(): Credential {
    const module = getModule();
    const credentialPtr = module.base_address_get_stake_credential(this.ptr);

    if (!credentialPtr) {
      throw new Error('Failed to get stake credential.');
    }

    try {
      return readCredential(credentialPtr);
    } finally {
      unrefObject(credentialPtr);
    }
  }

  /**
   * Gets the network ID of the base address.
   *
   * @returns The network ID.
   * @throws {Error} If the operation fails.
   */
  public getNetworkId(): NetworkId {
    const module = getModule();
    const networkIdPtr = module._malloc(4);

    try {
      const result = module.base_address_get_network_id(this.ptr, networkIdPtr);
      assertSuccess(result, 'Failed to get network ID.');

      return module.getValue(networkIdPtr, 'i32');
    } finally {
      module._free(networkIdPtr);
    }
  }

  /**
   * Gets the raw bytes of the base address.
   *
   * @returns A byte array containing the address data.
   * @throws {Error} If the operation fails.
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = module.base_address_get_bytes_size(this.ptr);
    const bufferPtr = module._malloc(size);

    try {
      const result = module.base_address_to_bytes(this.ptr, bufferPtr, size);
      assertSuccess(result, 'Failed to convert base address to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Gets the Bech32 string representation of the base address.
   *
   * @returns A Bech32 string containing the address.
   * @throws {Error} If the operation fails.
   */
  public toBech32(): string {
    const module = getModule();
    const size = module.base_address_get_bech32_size(this.ptr);
    const bufferPtr = module._malloc(size);

    try {
      const result = module.base_address_to_bech32(this.ptr, bufferPtr, size);
      assertSuccess(result, 'Failed to convert base address to Bech32.');

      return module.UTF8ToString(bufferPtr);
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Gets the reference count of the base address.
   *
   * @returns The current reference count.
   */
  public refCount(): number {
    const module = getModule();
    return module.base_address_refcount(this.ptr);
  }
}
