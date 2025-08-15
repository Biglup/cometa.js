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
  Anchor,
  CoinSelector,
  Datum,
  EmscriptenCoinSelector,
  EmscriptenProvider,
  EmscriptenTxEvaluator,
  InstanceType,
  NetworkId,
  PlutusData,
  ProtocolParameters,
  RewardAddress,
  Script,
  TxEvaluator,
  TxOut,
  UTxO,
  Value,
  asyncifyStateTracker,
  getModule,
  registerBridgeErrorHandler,
  unrefObject,
  unregisterBridgeErrorHandler,
  writeDatum,
  writePlutusData,
  writeProtocolParameters,
  writeScript,
  writeTransactionToCbor,
  writeTxOut,
  writeUtxo,
  writeValue
} from '../';
import { Provider } from '../provider';
import { splitToLowHigh64bit, writeStringToMemory, writeUtxoList } from '../marshaling';

/* DEFINITIONS ****************************************************************/

/**
 * A finalizer responsible for cleaning up all resources associated with a
 * TransactionBuilder instance when it is garbage collected.
 * @private
 */
const builderFinalizer = new FinalizationRegistry(
  (heldValue: { ptr: number; handlers: Array<{ type: InstanceType; id: number }> }) => {
    for (const h of heldValue.handlers) unregisterBridgeErrorHandler(h.type, h.id);
    unrefObject(heldValue.ptr);
  }
);

/**
 * A high-level builder for constructing Cardano transactions.
 *
 * This class provides a fluent interface to incrementally add inputs, outputs,
 * certificates, metadata, and other components to a transaction. It encapsulates
 * the complexities of transaction assembly, fee calculation, and balancing.
 */
export class TransactionBuilder {
  // We need to keep these references to the Emscripten provider, coin selector, and evaluator
  // to ensure they are not garbage collected while the TransactionBuilder is in use.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private provider: EmscriptenProvider | undefined;
  private coinSelector: EmscriptenCoinSelector | undefined;
  private txEvaluator: EmscriptenTxEvaluator | undefined;
  private registeredHandlers: Array<{ type: InstanceType; id: number }> = [];

  public ptr: number;

  /**
   * @private
   * Creates an instance of TransactionBuilder. Users should use the static `create` method.
   * @param {number} ptr - A pointer to the native transaction builder instance.
   */
  private constructor(ptr: number) {
    this.ptr = ptr;
    builderFinalizer.register(this, {
      handlers: this.registeredHandlers,
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
  public static create(params: ProtocolParameters, provider: Provider): TransactionBuilder {
    const protocolParamsPtr = writeProtocolParameters(params);
    const emscriptenProvider = new EmscriptenProvider(provider);
    const ptr = getModule().tx_builder_new(protocolParamsPtr, emscriptenProvider.providerPtr);

    unrefObject(protocolParamsPtr);

    if (!ptr) {
      throw new Error('Failed to create TransactionBuilder: The native pointer is null.');
    }
    const builder = new TransactionBuilder(ptr);

    builder.provider = emscriptenProvider;

    registerBridgeErrorHandler(InstanceType.Provider, emscriptenProvider.objectId, (exception: any) => {
      const errorMessage = exception.message || 'Error in Provider';
      const errorPtr = writeStringToMemory(errorMessage);
      try {
        getModule().tx_builder_set_last_error(builder.ptr, errorPtr);
      } finally {
        getModule()._free(errorPtr);
      }
    });
    builder.registeredHandlers.push({ id: emscriptenProvider.objectId, type: InstanceType.CoinSelector });

    return builder;
  }

  /**
   * Sets a custom coin selection strategy for the transaction.
   *
   * The coin selector determines how UTxOs are chosen to cover the transaction's
   * required value. If this method is not called, the builder will use a default
   * coin selection strategy ('largest-first').
   *
   * @param {CoinSelector} coinSelector The coin selection strategy to use.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setCoinSelector(coinSelector: CoinSelector): TransactionBuilder {
    this.coinSelector = new EmscriptenCoinSelector(coinSelector);
    getModule().tx_builder_set_coin_selector(this.ptr, this.coinSelector.coinSelectorPtr);

    registerBridgeErrorHandler(InstanceType.CoinSelector, this.coinSelector.objectId, (exception: any) => {
      const errorMessage = exception.message || 'Error in CoinSelector';
      const errorPtr = writeStringToMemory(errorMessage);
      try {
        getModule().tx_builder_set_last_error(this.ptr, errorPtr);
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
   * the builder will use a default evaluator that relies on the configured provider.
   *
   * @param {TxEvaluator} txEvaluator The transaction evaluator to use.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setTxEvaluator(txEvaluator: TxEvaluator): TransactionBuilder {
    this.txEvaluator = new EmscriptenTxEvaluator(txEvaluator);
    getModule().tx_builder_set_tx_evaluator(this.ptr, this.txEvaluator.txEvaluatorPtr);

    registerBridgeErrorHandler(InstanceType.TxEvaluator, this.txEvaluator.objectId, (exception: any) => {
      const errorMessage = exception.message || 'Error in TxEvaluator';
      const errorPtr = writeStringToMemory(errorMessage);
      try {
        getModule().tx_builder_set_last_error(this.ptr, errorPtr);
      } finally {
        getModule()._free(errorPtr);
      }
    });

    return this;
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
      const parts = splitToLowHigh64bit(unixTime);
      module.tx_builder_set_invalid_after_ex(this.ptr, parts.low, parts.high);
    } else {
      const slot = BigInt(value);
      const parts = splitToLowHigh64bit(slot);
      module.tx_builder_set_invalid_after(this.ptr, parts.low, parts.high);
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
      const parts = splitToLowHigh64bit(unixTime);
      module.tx_builder_set_invalid_before_ex(this.ptr, parts.low, parts.high);
    } else {
      const slot = BigInt(value);
      const parts = splitToLowHigh64bit(slot);
      module.tx_builder_set_invalid_before(this.ptr, parts.low, parts.high);
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
   * Adds a transaction output to send a value (lovelace and/or other assets) to an address.
   *
   * @param {string | Address} address - The recipient's address as a bech32 string or an Address object.
   * @param {Value} value - The value object, containing the coins and/or other assets to send.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public sendValue(address: string | Address, value: Value): TransactionBuilder {
    const module = getModule();
    let valuePtr = 0;

    try {
      valuePtr = writeValue(value);

      if (typeof address === 'string') {
        const addressPtr = writeStringToMemory(address);
        try {
          module.tx_builder_send_value_ex(this.ptr, addressPtr, address.length, valuePtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        module.tx_builder_send_value(this.ptr, address.ptr, valuePtr);
      }
    } finally {
      if (valuePtr !== 0) {
        unrefObject(valuePtr);
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
   * Adds a transaction output to lock a specific amount of lovelace at a script address.
   *
   * This is used to send funds to a smart contract, where the funds are locked
   * until the script conditions are met. A datum must be provided to be attached
   * to the script output.
   *
   * @param {string | Address} scriptAddress - The recipient script address as a bech32 string or an Address object.
   * @param {number | bigint} amount - The amount of lovelace to lock.
   * @param {Datum} datum - The datum to attach to the output, which will be available to the script.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public lockLovelace(scriptAddress: string | Address, amount: number | bigint, datum?: Datum): TransactionBuilder {
    const module = getModule();
    const lovelaceAmount = BigInt(amount);
    const parts = splitToLowHigh64bit(lovelaceAmount);
    let datumPtr = 0;

    try {
      datumPtr = datum ? writeDatum(datum) : 0;

      if (typeof scriptAddress === 'string') {
        const addressPtr = writeStringToMemory(scriptAddress);
        try {
          module.tx_builder_lock_lovelace_ex(
            this.ptr,
            addressPtr,
            scriptAddress.length,
            parts.low,
            parts.high,
            datumPtr
          );
        } finally {
          module._free(addressPtr);
        }
      } else {
        module.tx_builder_lock_lovelace(this.ptr, scriptAddress.ptr, parts.low, parts.high, datumPtr);
      }
    } finally {
      if (datumPtr !== 0) {
        unrefObject(datumPtr);
      }
    }

    return this;
  }

  /**
   * Adds a transaction output to lock a value (lovelace and/or other assets) at a script address.
   *
   * This is used to send funds to a smart contract, where they are locked
   * until the script conditions are met. A datum must be provided with the output.
   *
   * @param {string | Address} scriptAddress - The recipient script address as a bech32 string or an Address object.
   * @param {Value} value - The value object, containing the coins and/or other assets to lock.
   * @param {Datum} datum - The datum to attach to the output, which will be available to the script.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public lockValue(scriptAddress: string | Address, value: Value, datum: Datum): TransactionBuilder {
    const module = getModule();
    let valuePtr = 0;
    let datumPtr = 0;

    try {
      valuePtr = writeValue(value);
      datumPtr = datum ? writeDatum(datum) : 0;

      if (typeof scriptAddress === 'string') {
        const addressPtr = writeStringToMemory(scriptAddress);
        try {
          module.tx_builder_lock_value_ex(this.ptr, addressPtr, scriptAddress.length, valuePtr, datumPtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        module.tx_builder_lock_value(this.ptr, scriptAddress.ptr, valuePtr, datumPtr);
      }
    } finally {
      if (valuePtr !== 0) {
        unrefObject(valuePtr);
      }
      if (datumPtr !== 0) {
        unrefObject(datumPtr);
      }
    }

    return this;
  }

  /**
   * Adds an input to the transaction to be spent.
   *
   * Optionally, a redeemer and datum can be provided. These are typically required
   * when spending a UTxO that is locked at a Plutus script address.
   *
   * @param {UTxO} utxo The Unspent Transaction Output (UTxO) to be spent.
   * @param {PlutusData} [redeemer] Optional. The redeemer to use for unlocking the script.
   * @param {PlutusData} [datum] Optional. The datum that was locking the script output.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public addInput(utxo: UTxO, redeemer?: PlutusData, datum?: PlutusData): TransactionBuilder {
    const module = getModule();
    let utxoPtr = 0;
    let redeemerPtr = 0;
    let datumPtr = 0;

    try {
      utxoPtr = writeUtxo(utxo);
      if (redeemer) {
        redeemerPtr = writePlutusData(redeemer);
      }
      if (datum) {
        datumPtr = writePlutusData(datum);
      }

      module.tx_builder_add_input(this.ptr, utxoPtr, redeemerPtr, datumPtr);
    } finally {
      if (utxoPtr !== 0) {
        unrefObject(utxoPtr);
      }
      if (redeemerPtr !== 0) {
        unrefObject(redeemerPtr);
      }
      if (datumPtr !== 0) {
        unrefObject(datumPtr);
      }
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
   * Attaches metadata to the transaction under a specific label (tag).
   *
   * @param {number | bigint} tag - A unique integer label for this piece of metadata.
   * @param {object | string } metadata - The metadata content. Can be a plain object,
   * or a pre-serialized JSON string.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setMetadata(tag: number | bigint, metadata: object | string): TransactionBuilder {
    const module = getModule();
    const metadataTag = BigInt(tag);

    const metadataJson = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    const jsonPtr = writeStringToMemory(metadataJson);

    try {
      module.tx_builder_set_metadata_ex(this.ptr, metadataTag, jsonPtr, metadataJson.length);
    } finally {
      module._free(jsonPtr);
    }

    return this;
  }

  /**
   * Adds a token minting or burning operation to the transaction using a concatenated Asset ID.
   *
   * @param {string} assetIdHex - The hex-encoded Asset ID (concatenation of the policy ID and asset name).
   * @param {number | bigint} amount - The quantity to mint (positive integer) or burn (negative integer).
   * @param {PlutusData} [redeemer] - Optional. The redeemer required if the minting policy is a Plutus script.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public mintToken(assetIdHex: string, amount: number | bigint, redeemer?: PlutusData): TransactionBuilder {
    const module = getModule();
    const mintAmount = BigInt(amount);
    const parts = splitToLowHigh64bit(mintAmount);
    let assetIdPtr = 0;
    let redeemerPtr = 0;

    try {
      assetIdPtr = writeStringToMemory(assetIdHex);

      if (redeemer) {
        redeemerPtr = writePlutusData(redeemer);
      }

      module.tx_builder_mint_token_with_id_ex(
        this.ptr,
        assetIdPtr,
        assetIdHex.length,
        parts.low,
        parts.high,
        redeemerPtr
      );
    } finally {
      if (assetIdPtr !== 0) {
        module._free(assetIdPtr);
      }
      if (redeemerPtr !== 0) {
        unrefObject(redeemerPtr);
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
  public padSignerCount(count: number): TransactionBuilder {
    getModule().tx_builder_pad_signer_count(this.ptr, count);
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
   * Adds a Plutus datum to the transaction's witness set.
   *
   * This allows the datum to be referenced by its hash from a transaction output,
   * satisfying a script's requirement without including the full datum directly
   * in the output itself.
   *
   * @param {PlutusData} datum The PlutusData object to add to the transaction witnesses.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public addDatum(datum: PlutusData): TransactionBuilder {
    const module = getModule();
    let datumPtr = 0;

    try {
      datumPtr = writePlutusData(datum);

      module.tx_builder_add_datum(this.ptr, datumPtr);
    } finally {
      if (datumPtr !== 0) {
        unrefObject(datumPtr);
      }
    }

    return this;
  }

  /**
   * Adds a withdrawal from a reward account to the transaction.
   *
   * The amount specified must be the full available reward balance for the account.
   * An optional redeemer can be provided for script-locked withdrawals.
   *
   * @param {string | RewardAddress} rewardAddress The reward account address as a bech32 string or a RewardAddress object.
   * @param {number | bigint} amount The full amount of rewards to withdraw in lovelace.
   * @param {PlutusData} [redeemer] Optional. The redeemer for a script-locked withdrawal.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public withdrawRewards(
    rewardAddress: string | RewardAddress,
    amount: number | bigint,
    redeemer?: PlutusData
  ): TransactionBuilder {
    const module = getModule();
    const withdrawalAmount = BigInt(amount);
    const parts = splitToLowHigh64bit(withdrawalAmount);
    let redeemerPtr = 0;

    try {
      if (redeemer) {
        redeemerPtr = writePlutusData(redeemer);
      }

      if (typeof rewardAddress === 'string') {
        const addressPtr = writeStringToMemory(rewardAddress);
        try {
          module.tx_builder_withdraw_rewards_ex(
            this.ptr,
            addressPtr,
            rewardAddress.length,
            withdrawalAmount,
            redeemerPtr
          );
        } finally {
          module._free(addressPtr);
        }
      } else {
        module.tx_builder_withdraw_rewards(this.ptr, rewardAddress.ptr, parts.low, parts.high, redeemerPtr);
      }
    } finally {
      if (redeemerPtr !== 0) {
        unrefObject(redeemerPtr);
      }
    }

    return this;
  }

  /**
   * Adds a stake registration certificate to the transaction.
   *
   * This allows the specified stake address to start participating in staking and
   * receiving rewards. An optional redeemer can be provided for script-controlled
   * stake credentials.
   *
   * @param {string | RewardAddress} stakeAddress The stake address to register, as a bech32 string or a RewardAddress object.
   * @param {PlutusData} [redeemer] Optional. The redeemer for a script-controlled stake credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public registerStakeAddress(stakeAddress: string | RewardAddress, redeemer?: PlutusData): TransactionBuilder {
    const module = getModule();
    let redeemerPtr = 0;

    try {
      if (redeemer) {
        redeemerPtr = writePlutusData(redeemer);
      }

      if (typeof stakeAddress === 'string') {
        const addressPtr = writeStringToMemory(stakeAddress);
        try {
          module.tx_builder_register_reward_address_ex(this.ptr, addressPtr, stakeAddress.length, redeemerPtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        module.tx_builder_register_reward_address(this.ptr, stakeAddress.ptr, redeemerPtr);
      }
    } finally {
      if (redeemerPtr !== 0) {
        unrefObject(redeemerPtr);
      }
    }

    return this;
  }

  /**
   * Adds a stake deregistration certificate to the transaction.
   *
   * This action retires the stake address and initiates the refund of the key deposit.
   * An optional redeemer can be provided for script-controlled stake credentials.
   *
   * @param {string | RewardAddress} stakeAddress - The stake address to deregister, as a bech32 string or a RewardAddress object.
   * @param {PlutusData} [redeemer] - Optional. The redeemer for a script-controlled stake credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public deregisterStakeAddress(stakeAddress: string | RewardAddress, redeemer?: PlutusData): TransactionBuilder {
    const module = getModule();
    let redeemerPtr = 0;

    try {
      if (redeemer) {
        redeemerPtr = writePlutusData(redeemer);
      }

      if (typeof stakeAddress === 'string') {
        const addressPtr = writeStringToMemory(stakeAddress);
        try {
          module.tx_builder_deregister_reward_address_ex(this.ptr, addressPtr, stakeAddress.length, redeemerPtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        module.tx_builder_deregister_reward_address(this.ptr, stakeAddress.ptr, redeemerPtr);
      }
    } finally {
      if (redeemerPtr !== 0) {
        unrefObject(redeemerPtr);
      }
    }

    return this;
  }

  /**
   * Adds a stake delegation certificate to the transaction.
   *
   * This delegates the staking power of a reward address to a specified stake pool.
   * An optional redeemer can be provided for script-controlled stake credentials.
   *
   * @param {string | RewardAddress} stakeAddress The bech32-encoded stake address to delegate from.
   * @param {string} poolId The bech32-encoded ID of the stake pool to delegate to.
   * @param {PlutusData} [redeemer] Optional. The redeemer for a script-controlled stake credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public delegateStake(
    stakeAddress: string | RewardAddress,
    poolId: string,
    redeemer?: PlutusData
  ): TransactionBuilder {
    const module = getModule();
    let addressPtr = 0;
    let poolIdPtr = 0;
    let redeemerPtr = 0;

    try {
      const addr = typeof stakeAddress === 'string' ? stakeAddress : stakeAddress.toBech32();
      addressPtr = writeStringToMemory(addr);
      poolIdPtr = writeStringToMemory(poolId);
      if (redeemer) {
        redeemerPtr = writePlutusData(redeemer);
      }

      module.tx_builder_delegate_stake_ex(this.ptr, addressPtr, addr.length, poolIdPtr, poolId.length, redeemerPtr);
    } finally {
      if (addressPtr !== 0) {
        module._free(addressPtr);
      }
      if (poolIdPtr !== 0) {
        module._free(poolIdPtr);
      }
      if (redeemerPtr !== 0) {
        unrefObject(redeemerPtr);
      }
    }

    return this;
  }

  /**
   * Adds a voting delegation certificate to the transaction.
   *
   * This delegates the voting power of a stake address to a specified DRep
   * (Decentralized Representative) for on-chain governance.
   *
   * @param {string | RewardAddress} stakeAddress The bech32-encoded stake address to delegate from.
   * @param {string} drepId The bech32-encoded ID of the DRep to delegate to. The DRep ID can be
   * in CIP-129 format or CIP-105 format.
   * @param {PlutusData} [redeemer] Optional. The redeemer for a script-controlled stake credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public delegateVotingPower(
    stakeAddress: string | RewardAddress,
    drepId: string,
    redeemer?: PlutusData
  ): TransactionBuilder {
    const module = getModule();
    let addressPtr = 0;
    let drepIdPtr = 0;
    let redeemerPtr = 0;

    try {
      const addr = typeof stakeAddress === 'string' ? stakeAddress : stakeAddress.toBech32();
      addressPtr = writeStringToMemory(addr);
      drepIdPtr = writeStringToMemory(drepId);
      if (redeemer) {
        redeemerPtr = writePlutusData(redeemer);
      }

      module.tx_builder_delegate_voting_power_ex(
        this.ptr,
        addressPtr,
        addr.length,
        drepIdPtr,
        drepId.length,
        redeemerPtr
      );
    } finally {
      if (addressPtr !== 0) {
        module._free(addressPtr);
      }
      if (drepIdPtr !== 0) {
        module._free(drepIdPtr);
      }
      if (redeemerPtr !== 0) {
        unrefObject(redeemerPtr);
      }
    }

    return this;
  }

  /**
   * Adds a DRep registration certificate to the transaction.
   *
   * @param {string} drepId The bech32-encoded ID of the DRep to delegate to. The DRep ID can be
   * in CIP-129 format or CIP-105 format.
   * @param {Anchor} anchor - An object containing the URL and hash of the DRep's metadata.
   * @param {PlutusData} [redeemer] - Optional. The redeemer for a script-controlled DRep credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public registerDRep(drepId: string, anchor: Anchor, redeemer?: PlutusData): TransactionBuilder {
    const module = getModule();
    let drepIdPtr = 0;
    let urlPtr = 0;
    let hashPtr = 0;
    let redeemerPtr = 0;

    try {
      drepIdPtr = writeStringToMemory(drepId);
      urlPtr = writeStringToMemory(anchor.url);
      hashPtr = writeStringToMemory(anchor.dataHash);
      if (redeemer) {
        redeemerPtr = writePlutusData(redeemer);
      }

      module.tx_builder_register_drep_ex(
        this.ptr,
        drepIdPtr,
        drepId.length,
        urlPtr,
        anchor.url.length,
        hashPtr,
        anchor.dataHash.length,
        redeemerPtr
      );
    } finally {
      if (drepIdPtr !== 0) {
        module._free(drepIdPtr);
      }
      if (urlPtr !== 0) {
        module._free(urlPtr);
      }
      if (hashPtr !== 0) {
        module._free(hashPtr);
      }
      if (redeemerPtr !== 0) {
        unrefObject(redeemerPtr);
      }
    }

    return this;
  }

  /**
   * Adds a script to the transaction's witness set.
   *
   * This is necessary when using a script that is not already available on-chain
   * via a reference input, such as a minting policy or a native script for a
   * required signer.
   *
   * @param {Script} script The script object (Plutus or Native) to add.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public addScript(script: Script): TransactionBuilder {
    const module = getModule();
    let scriptPtr = 0;

    try {
      scriptPtr = writeScript(script);

      module.tx_builder_add_script(this.ptr, scriptPtr);
    } finally {
      if (scriptPtr !== 0) {
        unrefObject(scriptPtr);
      }
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
      asyncifyStateTracker.isAsyncActive = false;

      let result = module.tx_builder_build(this.ptr, txPtrPtr);

      if (asyncifyStateTracker.isAsyncActive) {
        result = await module.Asyncify.whenDone();
      }

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
