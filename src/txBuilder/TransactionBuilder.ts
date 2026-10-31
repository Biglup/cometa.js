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
  CoinSelector,
  EmscriptenCoinSelector,
  EmscriptenTxEvaluator,
  InstanceType,
  ProtocolParameters,
  SlotConfig,
  TxEvaluator,
  UTxO,
  asyncifyStateTracker,
  getModule,
  registerBridgeErrorHandler,
  splitToLowHigh64bit,
  unrefObject,
  writeProtocolParameters,
  writeSlotConfig,
  writeStringToMemory,
  writeTransactionToCbor,
  writeUtxoList
} from '../';

import { TransactionBuilderBase } from './TransactionBuilderBase';
import { transactionBuilderApi } from './builderApi';

import { AccountBalanceInterval } from '../common';
import { RewardAddress } from '../address';
import { readSubTransactionFromCbor } from '../marshaling';

/* DEFINITIONS ****************************************************************/

/**
 * A high-level builder for constructing Cardano transactions.
 *
 * This class provides a fluent interface to incrementally add inputs, outputs,
 * certificates, metadata, and other components to a transaction. It encapsulates
 * the complexities of transaction assembly, fee calculation, and balancing.
 */
export class TransactionBuilder extends TransactionBuilderBase {
  // We need to keep these references to the Emscripten coin selector and evaluator
  // to ensure they are not garbage collected while the TransactionBuilder is in use.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private coinSelector: EmscriptenCoinSelector | undefined;
  private txEvaluator: EmscriptenTxEvaluator | undefined;

  /**
   * @private
   * Creates an instance of TransactionBuilder. Users should use the static `create` method.
   * @param {number} ptr - A pointer to the native transaction builder instance.
   */
  private constructor(ptr: number) {
    super(ptr, transactionBuilderApi());
  }

  /**
   * Creates a new transaction builder instance.
   *
   * @param {object} config - The configuration object for the builder.
   * @param {ProtocolParameters} config.params - The protocol parameters for the network.
   * @param {SlotConfig} config.slotConfig - The slot timing configuration for the network.
   * @returns {TransactionBuilder} A new, configured TransactionBuilder instance.
   * @throws {Error} If the native builder instance could not be created.
   */
  public static create({
    params,
    slotConfig
  }: {
    params: ProtocolParameters;
    slotConfig: SlotConfig;
  }): TransactionBuilder {
    if (!params) {
      throw new Error('Protocol parameters are required to create a TransactionBuilder.');
    }

    if (!slotConfig) {
      throw new Error('Slot configuration is required to create a TransactionBuilder.');
    }

    const protocolParamsPtr = writeProtocolParameters(params);

    let slotConfigPtr = 0;

    try {
      slotConfigPtr = writeSlotConfig(slotConfig);
      const ptr = getModule().tx_builder_new(protocolParamsPtr, slotConfigPtr);

      if (!ptr) {
        throw new Error('Failed to create TransactionBuilder: The native pointer is null.');
      }

      return new TransactionBuilder(ptr);
    } finally {
      unrefObject(protocolParamsPtr);
      getModule()._free(slotConfigPtr);
    }
  }

  /**
   * Sets a custom coin selection strategy for the transaction.
   *
   * The coin selector determines how UTxOs are chosen to cover the transaction's
   * required value. If this method is not called, the builder will use a default
   * coin selection strategy ('round-robin random-improve').
   *
   * @param {CoinSelector} coinSelector The coin selection strategy to use.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setCoinSelector(coinSelector: CoinSelector): this {
    const builderPtr = this.ptr;
    const previous = this.coinSelector;
    this.coinSelector = new EmscriptenCoinSelector(coinSelector);
    getModule().tx_builder_set_coin_selector(builderPtr, this.coinSelector.coinSelectorPtr);

    if (previous) {
      this.forgetHandler(InstanceType.CoinSelector, previous.objectId);
      previous.dispose();
    }
    registerBridgeErrorHandler(InstanceType.CoinSelector, this.coinSelector.objectId, (exception: any) => {
      const errorMessage = exception.message || 'Error in CoinSelector';
      const errorPtr = writeStringToMemory(errorMessage);
      try {
        getModule().tx_builder_set_last_error(builderPtr, errorPtr);
      } finally {
        getModule()._free(errorPtr);
      }
    });
    this.registeredHandlers.push({ id: this.coinSelector.objectId, type: InstanceType.CoinSelector });

    return this;
  }

  /**
   * Sets a custom transaction evaluator.
   *
   * The evaluator is responsible for calculating the execution units (memory and steps)
   * required for any Plutus scripts in the transaction. If this method is not called,
   * the builder will use the native Plutus evaluator.
   *
   * @param {TxEvaluator} txEvaluator The transaction evaluator to use.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setTxEvaluator(txEvaluator: TxEvaluator): this {
    const builderPtr = this.ptr;
    const previous = this.txEvaluator;
    this.txEvaluator = new EmscriptenTxEvaluator(txEvaluator);
    getModule().tx_builder_set_tx_evaluator(builderPtr, this.txEvaluator.txEvaluatorPtr);

    if (previous) {
      this.forgetHandler(InstanceType.TxEvaluator, previous.objectId);
      previous.dispose();
    }
    registerBridgeErrorHandler(InstanceType.TxEvaluator, this.txEvaluator.objectId, (exception: any) => {
      const errorMessage = exception.message || 'Error in TxEvaluator';
      const errorPtr = writeStringToMemory(errorMessage);
      try {
        getModule().tx_builder_set_last_error(builderPtr, errorPtr);
      } finally {
        getModule()._free(errorPtr);
      }
    });

    this.registeredHandlers.push({ id: this.txEvaluator.objectId, type: InstanceType.TxEvaluator });

    return this;
  }

  /**
   * Sets the change address for the transaction. This is where any remaining
   * funds from inputs will be sent after covering outputs and fees.
   *
   * @param {string | Address} address - The change address as a bech32 string or an Address object.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setChangeAddress(address: string | Address): this {
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
  public setCollateralChangeAddress(address: string | Address): this {
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
  public setMinimumFee(fee: number | bigint): this {
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
  public setUtxos(utxos: UTxO[]): this {
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
  public setCollateralUtxos(utxos: UTxO[]): this {
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
   * Pads the transaction with space for a specified number of additional signers.
   *
   * This is used for fee calculation purposes to ensure the final transaction fee
   * is sufficient to cover signatures that will be added after the transaction is built
   * (e.g., by co-signers). This method does **not** add any actual required signers
   * to the transaction witnesses.
   *
   * @param {number} count The number of additional signer "slots" to account for in the fee calculation.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public padSignerCount(count: number): this {
    getModule().tx_builder_pad_signer_count(this.ptr, count);
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
    const builderPtr = this.beginBuild();
    const module = getModule();
    const txPtrPtr = module._malloc(4);
    let txPtr = 0;

    try {
      asyncifyStateTracker.isAsyncActive = false;

      this.callbackState.error = undefined;
      let result = module.tx_builder_build(builderPtr, txPtrPtr);

      if (asyncifyStateTracker.isAsyncActive) {
        result = await module.Asyncify.whenDone();
      }

      if (this.callbackState.error) throw this.callbackState.error;
      if (result !== 0) {
        const errorMsg = module.UTF8ToString(module.tx_builder_get_last_error(builderPtr));
        throw new Error(`Transaction build failed: ${errorMsg}`);
      }

      txPtr = module.getValue(txPtrPtr, 'i32');
      if (!txPtr) {
        throw new Error('Transaction build returned a null pointer despite success code.');
      }

      return writeTransactionToCbor(txPtr);
    } finally {
      this.endBuild();
      unrefObject(txPtr);
      module._free(txPtrPtr);
    }
  }
  /** Include a serialized sub-transaction and its resolved spending/reference inputs. */
  public addSubTransaction(cbor: string, resolvedUtxos: UTxO[]): this {
    let tx = 0;
    let inputs = 0;
    try {
      tx = readSubTransactionFromCbor(cbor);
      inputs = writeUtxoList(resolvedUtxos);
      getModule().tx_builder_add_sub_transaction(this.ptr, tx, inputs);
      return this;
    } finally {
      unrefObject(tx);
      unrefObject(inputs);
    }
  }

  /** Constrain a reward account balance before any sub-transaction in the batch is applied. */
  public addStartingAccountBalanceInterval(
    rewardAddress: string | RewardAddress,
    interval: AccountBalanceInterval
  ): this {
    return this.setAccountInterval(
      getModule().tx_builder_add_starting_account_balance_interval_ex,
      rewardAddress,
      interval
    );
  }

  public dispose(): void {
    super.dispose();
    this.coinSelector?.dispose();
    this.txEvaluator?.dispose();
    this.coinSelector = undefined;
    this.txEvaluator = undefined;
  }
}
