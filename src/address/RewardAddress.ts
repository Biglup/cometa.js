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
 * Represents a reward address in the Cardano blockchain.
 *
 * A reward address is a type of Shelley-era address that includes only a stake credential.
 * Unlike base addresses, reward addresses cannot be used for spending and are specifically
 * designed to receive staking rewards. They are typically derived from the stake credential
 * of a base address.
 */
export class RewardAddress {
  /**
   * The memory address of the `RewardAddress` WASM object.
   */
  public ptr: number;

  /**
   * Constructs a new `RewardAddress` instance.
   *
   * This constructor is not meant to be called directly. Instead, use static methods like:
   * - {@link RewardAddress.fromCredentials}: Creates a reward address from stake credentials.
   * - {@link RewardAddress.fromAddress}: Creates a reward address from a general address.
   * - {@link RewardAddress.fromBytes}: Creates a reward address from raw bytes.
   * - {@link RewardAddress.fromBech32}: Creates a reward address from a Bech32 string.
   *
   * @param ptr The memory address of the reward address WASM object.
   * @param managed Whether the instance should be managed by the finalization registry for garbage collection.
   */
  public constructor(ptr: number, managed = true) {
    this.ptr = ptr;

    // Register the instance for garbage collection if managed
    if (!managed) return;

    finalizationRegistry.register(this, {
      freeFunc: getModule().reward_address_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates a reward address from stake credentials.
   *
   * @param networkId The network identifier (mainnet or testnet).
   * @param stake The stake credential.
   * @returns A new `RewardAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromCredentials(networkId: NetworkId, stake: Credential): RewardAddress {
    const module = getModule();
    const rewardAddressPtrPtr = module._malloc(4);
    let stakePtr: number | null = null;

    try {
      stakePtr = writeCredential(stake);

      const result = module.reward_address_from_credentials(networkId, stakePtr, rewardAddressPtrPtr);
      assertSuccess(result, 'Failed to create reward address from credentials.');

      const rewardAddressPtr = module.getValue(rewardAddressPtrPtr, 'i32');
      return new RewardAddress(rewardAddressPtr);
    } finally {
      if (stakePtr) {
        unrefObject(stakePtr);
      }

      module._free(rewardAddressPtrPtr);
    }
  }

  /**
   * Creates a reward address from a general address.
   *
   * @param address The general address to convert.
   * @returns A new `RewardAddress` instance.
   * @throws {Error} If the operation fails or if the address is not a reward address.
   */
  public static fromAddress(address: Address): RewardAddress {
    const module = getModule();
    const rewardAddressPtrPtr = module._malloc(4);

    try {
      const result = module.reward_address_from_address(address.ptr, rewardAddressPtrPtr);

      assertSuccess(result, 'Failed to create reward address from address.');

      const rewardAddressPtr = module.getValue(rewardAddressPtrPtr, 'i32');
      return new RewardAddress(rewardAddressPtr);
    } finally {
      module._free(rewardAddressPtrPtr);
    }
  }

  /**
   * Creates a reward address from raw bytes.
   *
   * @param data The byte array containing the address data.
   * @returns A new `RewardAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBytes(data: Uint8Array): RewardAddress {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const rewardAddressPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.reward_address_from_bytes(dataPtr, data.length, rewardAddressPtrPtr);

      assertSuccess(result, 'Failed to create reward address from bytes.');

      const rewardAddressPtr = module.getValue(rewardAddressPtrPtr, 'i32');
      return new RewardAddress(rewardAddressPtr);
    } finally {
      module._free(dataPtr);
      module._free(rewardAddressPtrPtr);
    }
  }

  /**
   * Creates a reward address from a Bech32 string.
   *
   * @param data The Bech32 string containing the address.
   * @returns A new `RewardAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBech32(data: string): RewardAddress {
    const module = getModule();
    const dataPtr = writeStringToMemory(data);
    const rewardAddressPtrPtr = module._malloc(4);

    try {
      const result = module.reward_address_from_bech32(dataPtr, data.length, rewardAddressPtrPtr);

      assertSuccess(result, 'Failed to create reward address from Bech32.');

      const rewardAddressPtr = module.getValue(rewardAddressPtrPtr, 'i32');
      return new RewardAddress(rewardAddressPtr);
    } finally {
      module._free(dataPtr);
      module._free(rewardAddressPtrPtr);
    }
  }

  /**
   * Converts this reward address to a general address.
   *
   * @returns A new `Address` instance.
   * @throws {Error} If the operation fails.
   */
  public toAddress(): Address {
    const module = getModule();
    const addressPtr = module.reward_address_to_address(this.ptr);

    if (!addressPtr) {
      throw new Error('Failed to convert reward address to address.');
    }

    return new Address(addressPtr);
  }

  /**
   * Gets the stake credential of the reward address.
   *
   * @returns The stake credential.
   * @throws {Error} If the operation fails.
   */
  public getCredential(): Credential {
    const module = getModule();
    const credentialPtr = module.reward_address_get_credential(this.ptr);

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
   * Gets the network ID of the reward address.
   *
   * @returns The network ID.
   * @throws {Error} If the operation fails.
   */
  public getNetworkId(): NetworkId {
    const module = getModule();
    const networkIdPtr = module._malloc(4);

    try {
      const result = module.reward_address_get_network_id(this.ptr, networkIdPtr);
      assertSuccess(result, 'Failed to get network ID.');

      return module.getValue(networkIdPtr, 'i32');
    } finally {
      module._free(networkIdPtr);
    }
  }

  /**
   * Gets the raw bytes of the reward address.
   *
   * @returns A byte array containing the address data.
   * @throws {Error} If the operation fails.
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = module.reward_address_get_bytes_size(this.ptr);
    const bufferPtr = module._malloc(size);

    try {
      const result = module.reward_address_to_bytes(this.ptr, bufferPtr, size);
      assertSuccess(result, 'Failed to convert reward address to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Gets the Bech32 string representation of the reward address.
   *
   * @returns A Bech32 string containing the address.
   * @throws {Error} If the operation fails.
   */
  public toBech32(): string {
    const module = getModule();
    const size = module.reward_address_get_bech32_size(this.ptr);
    const bufferPtr = module._malloc(size);

    try {
      const result = module.reward_address_to_bech32(this.ptr, bufferPtr, size);
      assertSuccess(result, 'Failed to convert reward address to Bech32.');

      return module.UTF8ToString(bufferPtr);
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Gets the reference count of the reward address.
   *
   * @returns The current reference count.
   */
  public refCount(): number {
    const module = getModule();
    return module.reward_address_refcount(this.ptr);
  }
}
