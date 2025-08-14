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

/* IMPORTS *******************************************************************/

import {
  Address,
  BaseProvider,
  NetworkId,
  ProtocolParameters,
  TxOut,
  UTxO,
  getModule,
  unrefObject,
  writeProtocolParameters,
  writeTransactionToCbor,
  writeTxOut,
  writeUtxo
} from '../';
import { finalizationRegistry } from '../garbageCollection';
import { splitToLowHigh64bit, writeStringToMemory, writeUtxoList } from '../marshaling';

/* DEFINITIONS ****************************************************************/

/**
 * A high-level builder for constructing Cardano transactions.
 *
 * This class provides a fluent interface to incrementally add inputs, outputs,
 * certificates, metadata, and other components to a transaction. It encapsulates
 * the complexities of transaction assembly, fee calculation, and balancing.
 */
export class TransactionBuilder {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private provider: BaseProvider; // We need to keep the js side of this instance alive while the tx builder is alive.
  public ptr: number;

  /**
   * @private
   * Creates an instance of TransactionBuilder. Users should use the static `create` method.
   * @param {number} ptr - A pointer to the native transaction builder instance.
   */
  private constructor(ptr: number) {
    this.ptr = ptr;
    finalizationRegistry.register(this, {
      freeFunc: getModule().tx_builder_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates a new transaction builder instance.
   *
   * @param {ProtocolParameters} params - The protocol parameters for the network.
   * @param {Provider} provider - A provider instance for fetching on-chain data.
   * @returns {TransactionBuilder} A new, configured TransactionBuilder instance.
   * @throws {Error} If the native builder instance could not be created.
   */
  public static create(params: ProtocolParameters, provider: BaseProvider): TransactionBuilder {
    const protocolParamsPtr = writeProtocolParameters(params);
    const ptr = getModule().tx_builder_new(protocolParamsPtr, provider.providerPtr);

    unrefObject(protocolParamsPtr);

    if (!ptr) {
      throw new Error('Failed to create TransactionBuilder: The native pointer is null.');
    }
    const builder = new TransactionBuilder(ptr);

    builder.provider = provider;
    return builder;
  }

  /**
   * Sets the network ID for the transaction.
   *
   * This specifies the target network (e.g., Mainnet or a Testnet) for which
   * the transaction is intended.
   *
   * @param {NetworkId} networkId The network ID to assign to the transaction.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setNetworkId(networkId: NetworkId): TransactionBuilder {
    getModule().tx_builder_set_network_id(this.ptr, networkId);
    return this;
  }

  /**
   * Sets the change address for the transaction. This is where any remaining
   * funds from inputs will be sent after covering outputs and fees.
   *
   * @param {string | Address} address - The change address as a bech32 string or an Address object.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setChangeAddress(address: string | Address): TransactionBuilder {
    const addr = typeof address === 'string' ? Address.fromString(address) : address;
    getModule().tx_builder_set_change_address(this.ptr, addr.ptr);
    return this;
  }

  /**
   * Sets the collateral change address for the transaction.
   *
   * This address specifies where any remaining balance from collateral inputs will be
   * sent. Collateral is required for transactions involving Plutus scripts.
   *
   * @param {string | Address} address - The collateral return address as a bech32 string or an Address object.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setCollateralChangeAddress(address: string | Address): TransactionBuilder {
    const module = getModule();

    if (typeof address === 'string') {
      const addressPtr = writeStringToMemory(address);
      try {
        module.tx_builder_set_collateral_change_address_ex(this.ptr, addressPtr, address.length);
      } finally {
        module._free(addressPtr);
      }
    } else {
      module.tx_builder_set_collateral_change_address(this.ptr, address.ptr);
    }

    return this;
  }

  /**
   * Sets a minimum transaction fee.
   *
   * This function allows you to specify a minimum fee for the transaction in lovelace.
   * The final fee calculated by the builder during the build process will be at
   * least this amount.
   *
   * @param {number | bigint} fee - The minimum fee amount in lovelace.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setMinimumFee(fee: number | bigint): TransactionBuilder {
    const parts = splitToLowHigh64bit(BigInt(fee));
    getModule().tx_builder_set_minimum_fee(this.ptr, parts.low, parts.high);

    return this;
  }

  /**
   * Sets the available UTXOs for the builder to use for coin selection.
   *
   * @param {UTxO[]} utxos - An array of available UTxOs.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setUtxos(utxos: UTxO[]): TransactionBuilder {
    const utxoListPtr = writeUtxoList(utxos);
    try {
      getModule().tx_builder_set_utxos(this.ptr, utxoListPtr);
    } finally {
      unrefObject(utxoListPtr);
    }

    return this;
  }

  /**
   * Sets a specific list of UTXOs to be used for collateral.
   *
   * Collateral is required for transactions involving Plutus scripts. If this method
   * is not called, the builder will attempt to select collateral from the general
   * UTXO set provided via the `setUtxos` method.
   *
   * @param {UTxO[]} utxos - An array of UTxOs to be designated for collateral.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setCollateralUtxos(utxos: UTxO[]): TransactionBuilder {
    const module = getModule();
    let utxoListPtr = 0;

    try {
      utxoListPtr = writeUtxoList(utxos);

      module.tx_builder_set_collateral_utxos(this.ptr, utxoListPtr);
    } finally {
      if (utxoListPtr !== 0) {
        unrefObject(utxoListPtr);
      }
    }

    return this;
  }

  /**
   * Sets the transaction's expiration, also known as Time To Live (TTL).
   *
   * This function marks the transaction as invalid if it is not included in a block
   * before the specified time.
   *
   * @param {number | bigint | Date} value The expiration time for the transaction.
   * - If a `number` or `bigint` is provided, it is treated as an absolute **slot number**.
   * - If a `Date` object is provided, it is converted to a **Unix timestamp** (in seconds).
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setInvalidAfter(value: number | bigint | Date): TransactionBuilder {
    const module = getModule();

    if (value instanceof Date) {
      const unixTime = BigInt(Math.floor(value.getTime() / 1000));
      module.tx_builder_set_invalid_after_ex(this.ptr, unixTime);
    } else {
      module.tx_builder_set_invalid_after(this.ptr, BigInt(value));
    }

    return this;
  }

  /**
   * Sets the transaction's validity start time.
   *
   * This function marks the transaction as invalid if it is included in a block
   * created before the specified time. It defines the earliest point at which
   * the transaction can be processed.
   *
   * @param {number | bigint | Date} value The validity start time for the transaction.
   * - If a `number` or `bigint` is provided, it is treated as an absolute **slot number**.
   * - If a `Date` object is provided, it is converted to a **Unix timestamp** (in seconds).
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setInvalidBefore(value: number | bigint | Date): TransactionBuilder {
    const module = getModule();

    if (value instanceof Date) {
      const unixTime = BigInt(Math.floor(value.getTime() / 1000));
      module.tx_builder_set_invalid_before_ex(this.ptr, unixTime);
    } else {
      module.tx_builder_set_invalid_before(this.ptr, BigInt(value));
    }

    return this;
  }

  /**
   * Adds a reference input to the transaction.
   *
   * Reference inputs allow Plutus scripts to inspect the data, datum, and script
   * of a UTxO without actually spending it. This is useful for looking up on-chain
   * information.
   *
   * @param {UTxO} utxo The UTxO to be used as a reference input.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public addReferenceInput(utxo: UTxO): TransactionBuilder {
    const module = getModule();
    let utxoPtr = 0;

    try {
      utxoPtr = writeUtxo(utxo);

      module.tx_builder_add_reference_input(this.ptr, utxoPtr);
    } finally {
      if (utxoPtr !== 0) {
        unrefObject(utxoPtr);
      }
    }

    return this;
  }

  /**
   * Adds a transaction output to send a specific amount of lovelace to an address.
   *
   * @param {string | Address} address - The recipient's address as a bech32 string or an Address object.
   * @param {number | bigint} amount - The amount of lovelace to send.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public sendLovelace(address: string | Address, amount: number | bigint): TransactionBuilder {
    const module = getModule();
    const lovelaceAmount = BigInt(amount);
    const splitAmount = splitToLowHigh64bit(lovelaceAmount);
    if (typeof address === 'string') {
      const addressPtr = writeStringToMemory(address);
      try {
        module.tx_builder_send_lovelace_ex(this.ptr, addressPtr, address.length, splitAmount.low, splitAmount.high);
      } finally {
        module._free(addressPtr);
      }
    } else {
      module.tx_builder_send_lovelace(this.ptr, address.ptr, splitAmount.low, splitAmount.high);
    }

    return this;
  }

  /**
   * Adds a transaction output to send a specific value to an address.
   *
   * @param {TxOut} output - The transaction output to add.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public addOutput(output: TxOut): TransactionBuilder {
    const outputPtr = writeTxOut(output);
    try {
      getModule().tx_builder_add_output(this.ptr, outputPtr);
    } finally {
      unrefObject(outputPtr);
    }
    return this;
  }

  /**
   * Adds a required signer to the transaction.
   *
   * @param {string} pkh - The public key hash (PKH) of the required signer as a hex string.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public addSigner(pkh: string): TransactionBuilder {
    const pkhPtr = writeStringToMemory(pkh);
    try {
      getModule().tx_builder_add_signer_ex(this.ptr, pkhPtr, pkh.length);
    } finally {
      getModule()._free(pkhPtr);
    }
    return this;
  }

  /**
   * Finalizes the transaction by performing coin selection, balancing, and fee calculation.
   * This is the final step in the building process.
   *
   * @returns string - The built transaction as a CBOR hex string.
   * @throws {Error} If the transaction build fails due to insufficient funds, invalid inputs, or other errors.
   */
  public async build(): Promise<string> {
    const module = getModule();
    const txPtrPtr = module._malloc(4);
    let txPtr = 0;

    try {
      const result = await module.tx_builder_build(this.ptr, txPtrPtr);

      if (result !== 0) {
        const errorMsg = module.UTF8ToString(module.tx_builder_get_last_error(this.ptr));
        throw new Error(`Transaction build failed: ${errorMsg}`);
      }

      txPtr = module.getValue(txPtrPtr, 'i32');
      if (!txPtr) {
        throw new Error('Transaction build returned a null pointer despite success code.');
      }

      return writeTransactionToCbor(txPtr);
    } finally {
      unrefObject(txPtr);
      module._free(txPtrPtr);
    }
  }

  /**
   * Retrieves the current reference count of the native object.
   * This is primarily for debugging and diagnostic purposes.
   *
   * @returns {number} The reference count.
   */
  public getRefCount(): number {
    return getModule().tx_builder_refcount(this.ptr);
  }
}
