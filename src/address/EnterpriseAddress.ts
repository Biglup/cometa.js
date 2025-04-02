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
 * Represents an enterprise address in the Cardano blockchain.
 *
 * An enterprise address is a type of Shelley-era address that includes only a payment credential.
 * Unlike base addresses, enterprise addresses cannot be used for staking and are typically used
 * by exchanges or other entities that only need to receive and send funds.
 */
export class EnterpriseAddress {
  /**
   * The memory address of the `EnterpriseAddress` WASM object.
   */
  public ptr: number;

  /**
   * Constructs a new `EnterpriseAddress` instance.
   *
   * This constructor is not meant to be called directly. Instead, use static methods like:
   * - {@link EnterpriseAddress.fromCredentials}: Creates an enterprise address from payment credentials.
   * - {@link EnterpriseAddress.fromAddress}: Creates an enterprise address from a general address.
   * - {@link EnterpriseAddress.fromBytes}: Creates an enterprise address from raw bytes.
   * - {@link EnterpriseAddress.fromBech32}: Creates an enterprise address from a Bech32 string.
   *
   * @param ptr The memory address of the enterprise address WASM object.
   * @private
   */
  public constructor(ptr: number) {
    this.ptr = ptr;

    finalizationRegistry.register(this, {
      freeFunc: getModule().enterprise_address_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates an enterprise address from payment credentials.
   *
   * @param networkId The network identifier (mainnet or testnet).
   * @param payment The payment credential.
   * @returns A new `EnterpriseAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromCredentials(networkId: NetworkId, payment: Credential): EnterpriseAddress {
    const module = getModule();
    const enterpriseAddressPtrPtr = module._malloc(4);
    let paymentPtr: number | null = null;

    try {
      paymentPtr = writeCredential(payment);

      const result = module.enterprise_address_from_credentials(networkId, paymentPtr, enterpriseAddressPtrPtr);
      assertSuccess(result, 'Failed to create enterprise address from credentials.');

      const enterpriseAddressPtr = module.getValue(enterpriseAddressPtrPtr, 'i32');
      return new EnterpriseAddress(enterpriseAddressPtr);
    } finally {
      if (paymentPtr) {
        unrefObject(paymentPtr);
      }

      module._free(enterpriseAddressPtrPtr);
    }
  }

  /**
   * Creates an enterprise address from a general address.
   *
   * @param address The general address to convert.
   * @returns A new `EnterpriseAddress` instance.
   * @throws {Error} If the operation fails or if the address is not an enterprise address.
   */
  public static fromAddress(address: Address): EnterpriseAddress {
    const module = getModule();
    const enterpriseAddressPtrPtr = module._malloc(4);

    try {
      const result = module.enterprise_address_from_address(address.ptr, enterpriseAddressPtrPtr);

      assertSuccess(result, 'Failed to create enterprise address from address.');

      const enterpriseAddressPtr = module.getValue(enterpriseAddressPtrPtr, 'i32');
      return new EnterpriseAddress(enterpriseAddressPtr);
    } finally {
      module._free(enterpriseAddressPtrPtr);
    }
  }

  /**
   * Creates an enterprise address from raw bytes.
   *
   * @param data The byte array containing the address data.
   * @returns A new `EnterpriseAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBytes(data: Uint8Array): EnterpriseAddress {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const enterpriseAddressPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.enterprise_address_from_bytes(dataPtr, data.length, enterpriseAddressPtrPtr);

      assertSuccess(result, 'Failed to create enterprise address from bytes.');

      const enterpriseAddressPtr = module.getValue(enterpriseAddressPtrPtr, 'i32');
      return new EnterpriseAddress(enterpriseAddressPtr);
    } finally {
      module._free(dataPtr);
      module._free(enterpriseAddressPtrPtr);
    }
  }

  /**
   * Creates an enterprise address from a Bech32 string.
   *
   * @param data The Bech32 string containing the address.
   * @returns A new `EnterpriseAddress` instance.
   * @throws {Error} If the operation fails.
   */
  public static fromBech32(data: string): EnterpriseAddress {
    const module = getModule();
    const dataPtr = writeStringToMemory(data);
    const enterpriseAddressPtrPtr = module._malloc(4);

    try {
      const result = module.enterprise_address_from_bech32(dataPtr, data.length, enterpriseAddressPtrPtr);

      assertSuccess(result, 'Failed to create enterprise address from Bech32.');

      const enterpriseAddressPtr = module.getValue(enterpriseAddressPtrPtr, 'i32');
      return new EnterpriseAddress(enterpriseAddressPtr);
    } finally {
      module._free(dataPtr);
      module._free(enterpriseAddressPtrPtr);
    }
  }

  /**
   * Converts this enterprise address to a general address.
   *
   * @returns A new `Address` instance.
   * @throws {Error} If the operation fails.
   */
  public toAddress(): Address {
    const module = getModule();
    const addressPtr = module.enterprise_address_to_address(this.ptr);

    if (!addressPtr) {
      throw new Error('Failed to convert enterprise address to address.');
    }

    return new Address(addressPtr);
  }

  /**
   * Gets the payment credential of the enterprise address.
   *
   * @returns The payment credential.
   * @throws {Error} If the operation fails.
   */
  public getCredential(): Credential {
    const module = getModule();
    const credentialPtr = module.enterprise_address_get_payment_credential(this.ptr);

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
   * Gets the network ID of the enterprise address.
   *
   * @returns The network ID.
   * @throws {Error} If the operation fails.
   */
  public getNetworkId(): NetworkId {
    const module = getModule();
    const networkIdPtr = module._malloc(4);

    try {
      const result = module.enterprise_address_get_network_id(this.ptr, networkIdPtr);
      assertSuccess(result, 'Failed to get network ID.');

      return module.getValue(networkIdPtr, 'i32');
    } finally {
      module._free(networkIdPtr);
    }
  }

  /**
   * Gets the raw bytes of the enterprise address.
   *
   * @returns A byte array containing the address data.
   * @throws {Error} If the operation fails.
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = module.enterprise_address_get_bytes_size(this.ptr);
    const bufferPtr = module._malloc(size);

    try {
      const result = module.enterprise_address_to_bytes(this.ptr, bufferPtr, size);
      assertSuccess(result, 'Failed to convert enterprise address to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Gets the Bech32 string representation of the enterprise address.
   *
   * @returns A Bech32 string containing the address.
   * @throws {Error} If the operation fails.
   */
  public toBech32(): string {
    const module = getModule();
    const size = module.enterprise_address_get_bech32_size(this.ptr);
    const bufferPtr = module._malloc(size);

    try {
      const result = module.enterprise_address_to_bech32(this.ptr, bufferPtr, size);
      assertSuccess(result, 'Failed to convert enterprise address to Bech32.');

      return module.UTF8ToString(bufferPtr);
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Gets the reference count of the enterprise address.
   *
   * @returns The current reference count.
   */
  public refCount(): number {
    const module = getModule();
    return module.enterprise_address_refcount(this.ptr);
  }
}
