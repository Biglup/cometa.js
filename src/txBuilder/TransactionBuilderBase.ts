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
  Certificate,
  CommitteeMembers,
  Constitution,
  CredentialSet,
  Datum,
  GovernanceActionId,
  InstanceType,
  NetworkId,
  PlutusData,
  ProtocolParametersUpdate,
  ProtocolVersion,
  RewardAddress,
  Script,
  TxOut,
  UTxO,
  UnitInterval,
  Value,
  Voter,
  VotingProcedure,
  Withdrawals,
  blake2bHashFromHex,
  getModule,
  splitToLowHigh64bit,
  unrefObject,
  unregisterBridgeErrorHandler,
  writeAnchor,
  writeCertificate,
  writeCommitteeMembersMap,
  writeConstitution,
  writeCredentialSet,
  writeDatum,
  writeGovernanceActionId,
  writePlutusData,
  writeProtocolParamUpdate,
  writeProtocolVersion,
  writeScript,
  writeStringToMemory,
  writeTxOut,
  writeUnitInterval,
  writeUtxo,
  writeValue,
  writeVoter,
  writeVotingProcedure,
  writeWithdrawalMap
} from '../';

import { AccountBalanceInterval, DeferredRedeemer } from '../common';
import { Credential } from '../address';
import {
  writeAccountBalanceInterval,
  writeCredential,
  readUtxoList,
  writeTransactionToCbor,
  assertSuccess
} from '../marshaling';

/* DEFINITIONS ****************************************************************/

let buildInProgress = false;

type BuilderResources = {
  ptr: number;
  building: boolean;
  handlers: Array<{ type: InstanceType; id: number }>;
  callbacks: number[];
};

const releaseBuilder = (resources: BuilderResources): void => {
  if (!resources.ptr) return;
  unrefObject(resources.ptr);
  resources.ptr = 0;
  for (const handler of resources.handlers) unregisterBridgeErrorHandler(handler.type, handler.id);
  for (const callback of resources.callbacks) getModule().removeFunction(callback);
  resources.handlers.length = 0;
  resources.callbacks.length = 0;
};

const builderFinalizer = new FinalizationRegistry(releaseBuilder);

/** Shared operations for transactions and fee-free sub-transactions. */
export abstract class TransactionBuilderBase {
  protected readonly callbackState: { error?: unknown } = {};
  protected readonly resources: BuilderResources;
  protected readonly registeredHandlers: Array<{ type: InstanceType; id: number }>;
  protected readonly native: Record<string, (...args: any[]) => any>;

  protected constructor(ptr: number, native: Record<string, (...args: any[]) => any>) {
    this.native = native;
    this.resources = { ptr, building: false, handlers: [], callbacks: [] };
    this.registeredHandlers = this.resources.handlers;
    builderFinalizer.register(this, this.resources, this);
  }

  protected forgetHandler(type: InstanceType, id: number): void {
    unregisterBridgeErrorHandler(type, id);
    const index = this.registeredHandlers.findIndex((handler) => handler.type === type && handler.id === id);
    if (index >= 0) this.registeredHandlers.splice(index, 1);
  }

  protected beginBuild(): number {
    const ptr = this.ptr;
    if (buildInProgress)
      throw new Error('Another transaction builder is building. Await it before starting another build.');
    buildInProgress = true;
    this.resources.building = true;
    return ptr;
  }

  protected endBuild(): void {
    this.resources.building = false;
    buildInProgress = false;
  }

  /** Native pointer. Throws after disposal. */
  public get ptr(): number {
    if (!this.resources.ptr) throw new Error('Transaction builder has been disposed.');
    if (this.resources.building) throw new Error('Transaction builder is building.');
    return this.resources.ptr;
  }

  /** Release the builder and its callbacks deterministically. Safe to call more than once. */
  public dispose(): void {
    if (this.resources.building) throw new Error('Transaction builder is building.');
    builderFinalizer.unregister(this);
    releaseBuilder(this.resources);
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
  public setNetworkId(networkId: NetworkId): this {
    this.native.set_network_id(this.ptr, networkId);
    return this;
  }

  /**
   * Sets the donation amount for the transaction being built.
   *
   * Donations are a Conway-era feature that contribute a
   * specific amount to the treasury.
   *
   * @param {number | bigint} donation The donation amount in lovelace.
   *
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setDonation(donation: number | bigint): this {
    const { low, high } = splitToLowHigh64bit(BigInt(donation));
    this.native.set_donation(this.ptr, low, high);

    return this;
  }

  /**
   * Sets the transaction's expiration, also known as Time To Live (TTL).
   *
   * This function marks the transaction as invalid if it is not included in a block
   * before the specified time.
   *
   * @param {number | bigint} slot The absolute **slot number** after which this transaction will be invalid.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setInvalidAfter(slot: number | bigint): this {
    const parts = splitToLowHigh64bit(slot);
    this.native.set_invalid_after(this.ptr, parts.low, parts.high);

    return this;
  }

  /**
   * Sets the transaction to be valid for a specific duration from now.
   *
   * This is a convenience method that calculates a future expiration date and sets it.
   * The transaction will be marked as invalid if it is not included in a block
   * within the specified duration.
   *
   * @param {number} seconds - The number of seconds from now that the transaction should remain valid.
   * @returns {TransactionBuilder} The builder instance for chaining.
   *
   * @example
   * // Set the transaction to expire in 3 minutes (180 seconds) from now.
   * txBuilder.setValidFor(180);
   */
  public expiresIn(seconds: number): this {
    const now = Date.now() / 1000;
    const unixTime = BigInt(Math.floor(now + seconds));
    const parts = splitToLowHigh64bit(unixTime);
    this.native.set_invalid_after_ex(this.ptr, parts.low, parts.high);

    return this;
  }

  /**
   * Sets the transaction's expiration to a specific, absolute date and time.
   *
   * This function marks the transaction as invalid if it is not included in a block
   * before the specified date.
   *
   * @param {Date} date - The absolute date and time after which the transaction will be invalid.
   * @returns {TransactionBuilder} The builder instance for chaining.
   *
   * @example
   * // Set the transaction to expire on New Year's Day, 2026.
   * const expiryDate = new Date('2026-01-01T00:00:00Z');
   * txBuilder.expiresAfter(expiryDate);
   */
  public expiresAfter(date: Date): this {
    const unixTime = BigInt(Math.floor(date.getTime() / 1000));

    const parts = splitToLowHigh64bit(unixTime);
    this.native.set_invalid_after_ex(this.ptr, parts.low, parts.high);

    return this;
  }

  /**
   * Sets the transaction's validity start time using an absolute slot number.
   *
   * This function marks the transaction as invalid if it is included in a block
   * created before the specified slot.
   *
   * @param {number | bigint} slot The absolute slot number before which this transaction is invalid.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setInvalidBefore(slot: number | bigint): this {
    const slotValue = BigInt(slot);
    const parts = splitToLowHigh64bit(slotValue);
    this.native.set_invalid_before(this.ptr, parts.low, parts.high);
    return this;
  }

  /**
   * Sets the transaction's validity start time to a specific, absolute date and time.
   * The transaction will be invalid if processed before this date.
   *
   * @param {Date} date The absolute date and time from which the transaction will be valid.
   * @returns {TransactionBuilder} The builder instance for chaining.
   *
   * @example
   * // Make the transaction valid starting on New Year's Day, 2026.
   * const startDate = new Date('2026-01-01T00:00:00Z');
   * txBuilder.validFromDate(startDate);
   */
  public validFromDate(date: Date): this {
    const unixTime = BigInt(Math.floor(date.getTime() / 1000));
    const parts = splitToLowHigh64bit(unixTime);
    this.native.set_invalid_before_ex(this.ptr, parts.low, parts.high);
    return this;
  }

  /**
   * Sets the transaction to become valid only after a specified duration from now.
   * This is a convenience method that calculates a future start date.
   *
   * @param {number} seconds The number of seconds from now to wait before the transaction becomes valid.
   * @returns {TransactionBuilder} The builder instance for chaining.
   *
   * @example
   * // Make the transaction valid only after 1 hour (3600 seconds) has passed.
   * txBuilder.validAfter(3600);
   */
  public validAfter(seconds: number): this {
    const startTime = Date.now() + seconds * 1000;
    const startDate = new Date(startTime);
    return this.validFromDate(startDate);
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
  public addReferenceInput(utxo: UTxO): this {
    let utxoPtr = 0;

    try {
      utxoPtr = writeUtxo(utxo);

      this.native.add_reference_input(this.ptr, utxoPtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {string | Address} params.address - The recipient's address as a bech32 string or an Address object.
   * @param {Value} params.value - The value object, containing the coins and/or other assets to send.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public sendValue({ address, value }: { address: string | Address; value: Value }): this {
    const module = getModule();
    let valuePtr = 0;

    try {
      valuePtr = writeValue(value);

      if (typeof address === 'string') {
        const addressPtr = writeStringToMemory(address);
        try {
          this.native.send_value_ex(this.ptr, addressPtr, address.length, valuePtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        this.native.send_value(this.ptr, address.ptr, valuePtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {string | Address} params.address - The recipient's address as a bech32 string or an Address object.
   * @param {number | bigint} params.amount - The amount of lovelace to send.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public sendLovelace({ address, amount }: { address: string | Address; amount: number | bigint }): this {
    const module = getModule();
    const lovelaceAmount = BigInt(amount);
    const splitAmount = splitToLowHigh64bit(lovelaceAmount);
    if (typeof address === 'string') {
      const addressPtr = writeStringToMemory(address);
      try {
        this.native.send_lovelace_ex(this.ptr, addressPtr, address.length, splitAmount.low, splitAmount.high);
      } finally {
        module._free(addressPtr);
      }
    } else {
      this.native.send_lovelace(this.ptr, address.ptr, splitAmount.low, splitAmount.high);
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
   * @param {Object} params - The parameters for the function.
   * @param {string | Address} params.scriptAddress - The recipient script address as a bech32 string or an Address object.
   * @param {number | bigint} params.amount - The amount of lovelace to lock.
   * @param {Datum} params.datum - The datum to attach to the output, which will be available to the script.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public lockLovelace({
    scriptAddress,
    amount,
    datum
  }: {
    scriptAddress: string | Address;
    amount: number | bigint;
    datum?: Datum;
  }): this {
    const module = getModule();
    const lovelaceAmount = BigInt(amount);
    const parts = splitToLowHigh64bit(lovelaceAmount);
    let datumPtr = 0;

    try {
      datumPtr = datum ? writeDatum(datum) : 0;

      if (typeof scriptAddress === 'string') {
        const addressPtr = writeStringToMemory(scriptAddress);
        try {
          this.native.lock_lovelace_ex(this.ptr, addressPtr, scriptAddress.length, parts.low, parts.high, datumPtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        this.native.lock_lovelace(this.ptr, scriptAddress.ptr, parts.low, parts.high, datumPtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {string | Address} params.scriptAddress - The recipient script address as a bech32 string or an Address object.
   * @param {Value} params.value - The value object, containing the coins and/or other assets to lock.
   * @param {Datum} params.datum - The datum to attach to the output, which will be available to the script.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public lockValue({
    scriptAddress,
    value,
    datum
  }: {
    scriptAddress: string | Address;
    value: Value;
    datum: Datum;
  }): this {
    const module = getModule();
    let valuePtr = 0;
    let datumPtr = 0;

    try {
      valuePtr = writeValue(value);
      datumPtr = datum ? writeDatum(datum) : 0;

      if (typeof scriptAddress === 'string') {
        const addressPtr = writeStringToMemory(scriptAddress);
        try {
          this.native.lock_value_ex(this.ptr, addressPtr, scriptAddress.length, valuePtr, datumPtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        this.native.lock_value(this.ptr, scriptAddress.ptr, valuePtr, datumPtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {UTxO} params.utxo The Unspent Transaction Output (UTxO) to be spent.
   * @param {PlutusData} [params.redeemer] Optional. The redeemer to use for unlocking the script.
   * @param {PlutusData} [params.datum] Optional. The datum that was locking the script output.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public addInput({ utxo, redeemer, datum }: { utxo: UTxO; redeemer?: PlutusData; datum?: PlutusData }): this {
    let utxoPtr = 0;
    let redeemerPtr = 0;
    let datumPtr = 0;

    try {
      utxoPtr = writeUtxo(utxo);
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }
      if (datum !== undefined) {
        datumPtr = writePlutusData(datum);
      }

      this.native.add_input(this.ptr, utxoPtr, redeemerPtr, datumPtr);
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
  public addOutput(output: TxOut): this {
    const outputPtr = writeTxOut(output);
    try {
      this.native.add_output(this.ptr, outputPtr);
    } finally {
      unrefObject(outputPtr);
    }
    return this;
  }

  /**
   * Attaches metadata to the transaction under a specific label (tag).
   *
   * @param {Object} params - The parameters for the function.
   * @param {number | bigint} params.tag - A unique integer label for this piece of metadata.
   * @param {object | string } params.metadata - The metadata content. Can be a plain object,
   * or a pre-serialized JSON string.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public setMetadata({ tag, metadata }: { tag: number | bigint; metadata: object | string }): this {
    const module = getModule();
    const metadataTag = BigInt(tag);
    const parts = splitToLowHigh64bit(metadataTag);

    const metadataJson = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    const jsonPtr = writeStringToMemory(metadataJson);

    try {
      this.native.set_metadata_ex(this.ptr, parts.low, parts.high, jsonPtr, metadataJson.length);
    } finally {
      module._free(jsonPtr);
    }

    return this;
  }

  /**
   * Adds a token minting or burning operation to the transaction using a concatenated Asset ID.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string} params.assetIdHex - The hex-encoded Asset ID (concatenation of the policy ID and asset name).
   * @param {number | bigint} params.amount - The quantity to mint (positive integer) or burn (negative integer).
   * @param {PlutusData} [params.redeemer] - Optional. The redeemer required if the minting policy is a Plutus script.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public mintToken({
    assetIdHex,
    amount,
    redeemer
  }: {
    assetIdHex: string;
    amount: number | bigint;
    redeemer?: PlutusData;
  }): this {
    const module = getModule();
    const mintAmount = BigInt(amount);
    const parts = splitToLowHigh64bit(mintAmount);
    let assetIdPtr = 0;
    let redeemerPtr = 0;

    try {
      assetIdPtr = writeStringToMemory(assetIdHex);

      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      this.native.mint_token_with_id_ex(this.ptr, assetIdPtr, assetIdHex.length, parts.low, parts.high, redeemerPtr);
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
   * Adds a required signer to the transaction.
   *
   * @param {string} pkh - The public key hash (PKH) of the required signer as a hex string.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public addSigner(pkh: string): this {
    const pkhPtr = writeStringToMemory(pkh);
    try {
      this.native.add_signer_ex(this.ptr, pkhPtr, pkh.length);
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
  public addDatum(datum: PlutusData): this {
    let datumPtr = 0;

    try {
      datumPtr = writePlutusData(datum);

      this.native.add_datum(this.ptr, datumPtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress The reward account address as a bech32 string or a RewardAddress object.
   * @param {number | bigint} params.amount The full amount of rewards to withdraw in lovelace.
   * @param {PlutusData} [params.redeemer] Optional. The redeemer for a script-locked withdrawal.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public withdrawRewards({
    rewardAddress,
    amount,
    redeemer
  }: {
    rewardAddress: string | RewardAddress;
    amount: number | bigint;
    redeemer?: PlutusData;
  }): this {
    const module = getModule();
    const withdrawalAmount = BigInt(amount);
    const parts = splitToLowHigh64bit(withdrawalAmount);
    let redeemerPtr = 0;

    try {
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      if (typeof rewardAddress === 'string') {
        const addressPtr = writeStringToMemory(rewardAddress);
        try {
          this.native.withdraw_rewards_ex(this.ptr, addressPtr, rewardAddress.length, withdrawalAmount, redeemerPtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        this.native.withdraw_rewards(this.ptr, rewardAddress.ptr, parts.low, parts.high, redeemerPtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress The stake address to register, as a bech32 string or a RewardAddress object.
   * @param {PlutusData} [params.redeemer] Optional. The redeemer for a script-controlled stake credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public registerStakeAddress({
    rewardAddress,
    redeemer
  }: {
    rewardAddress: string | RewardAddress;
    redeemer?: PlutusData;
  }): this {
    const module = getModule();
    let redeemerPtr = 0;

    try {
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      if (typeof rewardAddress === 'string') {
        const addressPtr = writeStringToMemory(rewardAddress);
        try {
          this.native.register_reward_address_ex(this.ptr, addressPtr, rewardAddress.length, redeemerPtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        this.native.register_reward_address(this.ptr, rewardAddress.ptr, redeemerPtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress - The stake address to deregister, as a bech32 string or a RewardAddress object.
   * @param {PlutusData} [params.redeemer] - Optional. The redeemer for a script-controlled stake credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public deregisterStakeAddress({
    rewardAddress,
    redeemer
  }: {
    rewardAddress: string | RewardAddress;
    redeemer?: PlutusData;
  }): this {
    const module = getModule();
    let redeemerPtr = 0;

    try {
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      if (typeof rewardAddress === 'string') {
        const addressPtr = writeStringToMemory(rewardAddress);
        try {
          this.native.deregister_reward_address_ex(this.ptr, addressPtr, rewardAddress.length, redeemerPtr);
        } finally {
          module._free(addressPtr);
        }
      } else {
        this.native.deregister_reward_address(this.ptr, rewardAddress.ptr, redeemerPtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress The bech32-encoded stake address to delegate from.
   * @param {string} params.poolId The bech32-encoded ID of the stake pool to delegate to.
   * @param {PlutusData} [params.redeemer] Optional. The redeemer for a script-controlled stake credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public delegateStake({
    rewardAddress,
    poolId,
    redeemer
  }: {
    rewardAddress: string | RewardAddress;
    poolId: string;
    redeemer?: PlutusData;
  }): this {
    const module = getModule();
    let addressPtr = 0;
    let poolIdPtr = 0;
    let redeemerPtr = 0;

    try {
      const addr = typeof rewardAddress === 'string' ? rewardAddress : rewardAddress.toBech32();
      addressPtr = writeStringToMemory(addr);
      poolIdPtr = writeStringToMemory(poolId);
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      this.native.delegate_stake_ex(this.ptr, addressPtr, addr.length, poolIdPtr, poolId.length, redeemerPtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress The bech32-encoded stake address to delegate from.
   * @param {string} params.drepId The bech32-encoded ID of the DRep to delegate to. The DRep ID can be
   * in CIP-129 format or CIP-105 format.
   * @param {PlutusData} [params.redeemer] Optional. The redeemer for a script-controlled stake credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public delegateVotingPower({
    rewardAddress,
    drepId,
    redeemer
  }: {
    rewardAddress: string | RewardAddress;
    drepId: string;
    redeemer?: PlutusData;
  }): this {
    const module = getModule();
    let addressPtr = 0;
    let drepIdPtr = 0;
    let redeemerPtr = 0;

    try {
      const addr = typeof rewardAddress === 'string' ? rewardAddress : rewardAddress.toBech32();
      addressPtr = writeStringToMemory(addr);
      drepIdPtr = writeStringToMemory(drepId);
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      this.native.delegate_voting_power_ex(this.ptr, addressPtr, addr.length, drepIdPtr, drepId.length, redeemerPtr);
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
   * @param {Object} params - The parameters for the function.
   * @param {string} params.drepId The bech32-encoded ID of the DRep to delegate to. The DRep ID can be
   * in CIP-129 format or CIP-105 format.
   * @param {Anchor} params.anchor - An object containing the URL and hash of the DRep's metadata.
   * @param {PlutusData} [params.redeemer] - Optional. The redeemer for a script-controlled DRep credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public registerDRep({ drepId, anchor, redeemer }: { drepId: string; anchor: Anchor; redeemer?: PlutusData }): this {
    const module = getModule();
    let drepIdPtr = 0;
    let urlPtr = 0;
    let hashPtr = 0;
    let redeemerPtr = 0;

    try {
      drepIdPtr = writeStringToMemory(drepId);
      urlPtr = writeStringToMemory(anchor.url);
      hashPtr = writeStringToMemory(anchor.dataHash);
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      this.native.register_drep_ex(
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
   * Adds an update DRep certificate in the transaction.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string} params.drepId - The bech32-encoded ID of the DRep to deregister.
   * This can be in either CIP-105 or CIP-129 format.
   * @param {Anchor} params.anchor - An object containing the URL and hash of the DRep's metadata.
   * @param {PlutusData} params.redeemer Optional redeemer data for script-based DReps.
   *
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public updateDRep({ drepId, anchor, redeemer }: { drepId: string; anchor: Anchor; redeemer?: PlutusData }): this {
    const module = getModule();
    let drepIdPtr = 0;
    let urlPtr = 0;
    let hashPtr = 0;
    let redeemerPtr = 0;

    try {
      drepIdPtr = writeStringToMemory(drepId);
      urlPtr = writeStringToMemory(anchor.url);
      hashPtr = writeStringToMemory(anchor.dataHash);
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      this.native.update_drep_ex(
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
   * Adds a DRep deregistration certificate to the transaction.
   *
   * This action retires the DRep, making them ineligible for future governance proposals.
   * An optional redeemer can be provided for script-controlled DRep credentials.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string} params.drepId - The bech32-encoded ID of the DRep to deregister.
   * This can be in either CIP-105 or CIP-129 format.
   * @param {PlutusData} [params.redeemer] - Optional. The redeemer for a script-controlled DRep credential.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public deregisterDRep({ drepId, redeemer }: { drepId: string; redeemer?: PlutusData }): this {
    const module = getModule();
    let drepIdPtr = 0;
    let redeemerPtr = 0;

    try {
      drepIdPtr = writeStringToMemory(drepId);
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      this.native.deregister_drep_ex(this.ptr, drepIdPtr, drepId.length, redeemerPtr);
    } finally {
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
   * Adds a vote for a specific governance action to the transaction.
   *
   * This function allows a voter to submit their vote for a given governance action.
   *
   * @param {Object} params - The parameters for the function.
   * @param {Voter} params.voter The voter participating in the governance action.
   * @param {GovernanceActionId} params.actionId The ID of the governance action being voted on.
   * @param {VotingProcedure} params.votingProcedure The voting procedure, including the vote choice.
   * @param {PlutusData} [params.redeemer] Optional. Redeemer data required if the voter is script-controlled.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public vote({
    voter,
    actionId,
    votingProcedure,
    redeemer
  }: {
    voter: Voter;
    actionId: GovernanceActionId | string;
    votingProcedure: VotingProcedure;
    redeemer?: PlutusData;
  }): this {
    let voterPtr = 0;
    let actionIdPtr = 0;
    let votePtr = 0;
    let redeemerPtr = 0;

    try {
      voterPtr = writeVoter(voter);
      actionIdPtr = writeGovernanceActionId(actionId);
      votePtr = writeVotingProcedure(votingProcedure);
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      this.native.vote(this.ptr, voterPtr, actionIdPtr, votePtr, redeemerPtr);
    } finally {
      if (voterPtr !== 0) {
        unrefObject(voterPtr);
      }
      if (actionIdPtr !== 0) {
        unrefObject(actionIdPtr);
      }
      if (votePtr !== 0) {
        unrefObject(votePtr);
      }
      if (redeemerPtr !== 0) {
        unrefObject(redeemerPtr);
      }
    }

    return this;
  }

  /**
   * Adds a certificate to the transaction.
   *
   * Certificates are used to perform various on-chain actions like staking,
   * delegation, or registering entities like stake pools and DReps.
   *
   * @param {Object} params - The parameters for the function.
   * @param {Certificate} params.certificate - The certificate object to add to the transaction.
   * @param {PlutusData} [params.redeemer] - Optional. The redeemer data required if the
   * certificate action is controlled by a Plutus script.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public addCertificate({ certificate, redeemer }: { certificate: Certificate; redeemer?: PlutusData }): this {
    let certificatePtr = 0;
    let redeemerPtr = 0;

    try {
      certificatePtr = writeCertificate(certificate);
      if (redeemer !== undefined) {
        redeemerPtr = writePlutusData(redeemer);
      }

      this.native.add_certificate(this.ptr, certificatePtr, redeemerPtr);
    } finally {
      if (certificatePtr !== 0) {
        unrefObject(certificatePtr);
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
  public addScript(script: Script): this {
    let scriptPtr = 0;

    try {
      scriptPtr = writeScript(script);

      this.native.add_script(this.ptr, scriptPtr);
    } finally {
      if (scriptPtr !== 0) {
        unrefObject(scriptPtr);
      }
    }

    return this;
  }

  /**
   * Adds a protocol parameter change proposal to the transaction.
   *
   * This governance action is used to propose modifications to the network's protocol parameters.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress - The reward address where the governance action deposit will be refunded.
   * @param {Anchor} params.anchor - The anchor containing the URL and hash of off-chain metadata for the proposal.
   * @param {ProtocolParametersUpdate} params.protocolParamUpdate - An object containing the specific protocol parameters to be updated.
   * @param {string} [params.policyHash] - The hex-encoded hash of the governance action policy script (guardrails script).
   * @param {GovernanceActionId} [params.governanceActionId] - Optional. The ID of the most recent parameter change action.
   * Can be undefined if this is the first proposal of this type on the network.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public proposeParameterChange({
    rewardAddress,
    anchor,
    protocolParamUpdate,
    policyHash,
    governanceActionId
  }: {
    rewardAddress: string | RewardAddress;
    anchor: Anchor;
    protocolParamUpdate: ProtocolParametersUpdate;
    policyHash: string;
    governanceActionId?: GovernanceActionId;
  }): this {
    let anchorPtr = 0;
    let paramUpdatePtr = 0;
    let govActionIdPtr = 0;
    let policyHashPtr = 0;

    try {
      const addr = typeof rewardAddress === 'string' ? RewardAddress.fromBech32(rewardAddress) : rewardAddress;

      anchorPtr = writeAnchor(anchor);
      paramUpdatePtr = writeProtocolParamUpdate(protocolParamUpdate);

      if (governanceActionId) {
        govActionIdPtr = writeGovernanceActionId(governanceActionId);
      }

      policyHashPtr = blake2bHashFromHex(policyHash);

      this.native.propose_parameter_change(
        this.ptr,
        addr.ptr,
        anchorPtr,
        paramUpdatePtr,
        govActionIdPtr,
        policyHashPtr
      );
    } finally {
      if (anchorPtr !== 0) {
        unrefObject(anchorPtr);
      }
      if (paramUpdatePtr !== 0) {
        unrefObject(paramUpdatePtr);
      }
      if (govActionIdPtr !== 0) {
        unrefObject(govActionIdPtr);
      }
      if (policyHashPtr !== 0) {
        unrefObject(policyHashPtr);
      }
    }

    return this;
  }

  /**
   * Adds a hard fork initiation proposal to the transaction.
   *
   * This governance action is used to propose an upgrade to a new major protocol version.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress - The reward address where the governance action deposit will be refunded.
   * @param {Anchor} params.anchor - The anchor containing the URL and hash of off-chain metadata for the proposal.
   * @param {ProtocolVersion} params.version - The protocol version to upgrade to.
   * @param {GovernanceActionId} [params.governanceActionId] - Optional. The ID of the most recent hard fork initiation action.
   * Can be undefined if this is the first proposal of this type on the network.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public proposeHardfork({
    rewardAddress,
    anchor,
    version,
    governanceActionId
  }: {
    rewardAddress: string | RewardAddress;
    anchor: Anchor;
    version: ProtocolVersion;
    governanceActionId?: GovernanceActionId;
  }): this {
    let rewardAddressObj: RewardAddress | undefined;
    let anchorPtr = 0;
    let versionPtr = 0;
    let govActionIdPtr = 0;

    try {
      if (typeof rewardAddress === 'string') {
        rewardAddressObj = RewardAddress.fromBech32(rewardAddress);
      }
      const rewardAddressPtr = rewardAddressObj ? rewardAddressObj.ptr : (rewardAddress as RewardAddress).ptr;

      anchorPtr = writeAnchor(anchor);
      versionPtr = writeProtocolVersion(version.major, version.minor);

      if (governanceActionId) {
        govActionIdPtr = writeGovernanceActionId(governanceActionId);
      }

      this.native.propose_hardfork(this.ptr, rewardAddressPtr, anchorPtr, versionPtr, govActionIdPtr);
    } finally {
      if (anchorPtr !== 0) {
        unrefObject(anchorPtr);
      }
      if (versionPtr !== 0) {
        unrefObject(versionPtr);
      }
      if (govActionIdPtr !== 0) {
        unrefObject(govActionIdPtr);
      }
    }

    return this;
  }

  /**
   * Adds a treasury withdrawals proposal to the transaction.
   *
   * This governance action proposes the withdrawal of funds from the treasury to be
   * distributed to a set of specified reward accounts.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress - The reward address where the governance action deposit will be refunded.
   * @param {Anchor} params.anchor - The anchor containing the URL and hash of off-chain metadata for the proposal.
   * @param {Withdrawals} params.withdrawals - A map where keys are the Bech32-encoded reward addresses of the recipients and values are the corresponding lovelace amounts to be withdrawn.
   * @param {string} [params.policyHash] - Optional. The hex-encoded hash of the governance action policy script (guardrails script).
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public proposeTreasuryWithdrawals({
    rewardAddress,
    anchor,
    withdrawals,
    policyHash
  }: {
    rewardAddress: string | RewardAddress;
    anchor: Anchor;
    withdrawals: Withdrawals;
    policyHash?: string;
  }): this {
    let rewardAddressObj: RewardAddress | undefined;
    let anchorPtr = 0;
    let withdrawalsPtr = 0;
    let policyHashPtr = 0;

    try {
      if (typeof rewardAddress === 'string') {
        rewardAddressObj = RewardAddress.fromBech32(rewardAddress);
      }
      const rewardAddressPtr = rewardAddressObj ? rewardAddressObj.ptr : (rewardAddress as RewardAddress).ptr;

      anchorPtr = writeAnchor(anchor);
      withdrawalsPtr = writeWithdrawalMap(withdrawals);

      if (policyHash) {
        policyHashPtr = blake2bHashFromHex(policyHash);
      }

      this.native.propose_treasury_withdrawals(this.ptr, rewardAddressPtr, anchorPtr, withdrawalsPtr, policyHashPtr);
    } finally {
      if (anchorPtr !== 0) {
        unrefObject(anchorPtr);
      }
      if (withdrawalsPtr !== 0) {
        unrefObject(withdrawalsPtr);
      }
      if (policyHashPtr !== 0) {
        unrefObject(policyHashPtr);
      }
    }

    return this;
  }

  /**
   * Adds a "no confidence" proposal to the transaction.
   *
   * This governance action is used to express a lack of confidence in the current
   * constitutional committee.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress - The reward address where the governance action deposit will be refunded.
   * @param {Anchor} params.anchor - The anchor containing the URL and hash of off-chain metadata for the proposal.
   * @param {GovernanceActionId} [params.governanceActionId] - Optional. The ID of the most recent hard fork initiation action.
   * Can be undefined if this is the first proposal of this type on the network.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public proposeNoConfidence({
    rewardAddress,
    anchor,
    governanceActionId
  }: {
    rewardAddress: string | RewardAddress;
    anchor: Anchor;
    governanceActionId?: GovernanceActionId;
  }): this {
    let rewardAddressObj: RewardAddress | undefined;
    let anchorPtr = 0;
    let govActionIdPtr = 0;

    try {
      if (typeof rewardAddress === 'string') {
        rewardAddressObj = RewardAddress.fromBech32(rewardAddress);
      }
      const rewardAddressPtr = rewardAddressObj ? rewardAddressObj.ptr : (rewardAddress as RewardAddress).ptr;

      anchorPtr = writeAnchor(anchor);

      if (governanceActionId) {
        govActionIdPtr = writeGovernanceActionId(governanceActionId);
      }

      this.native.propose_no_confidence(this.ptr, rewardAddressPtr, anchorPtr, govActionIdPtr);
    } finally {
      if (anchorPtr !== 0) {
        unrefObject(anchorPtr);
      }
      if (govActionIdPtr !== 0) {
        unrefObject(govActionIdPtr);
      }
    }

    return this;
  }

  /**
   * Adds a proposal to update the constitutional committee to the transaction.
   *
   * This governance action can add new members, remove existing members, and change the
   * required quorum for committee votes.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress - The reward address where the governance action deposit will be refunded.
   * @param {Anchor} params.anchor - The anchor containing the URL and hash of off-chain metadata for the proposal.
   * @param {CredentialSet} params.membersToBeRemoved - An array of `Credential` objects for committee members to be removed.
   * @param {CommitteeMembers} params.membersToBeAdded - An array of `CommitteeMember` objects (credential and epoch) for new members.
   * @param {UnitInterval} params.newQuorum - The new quorum for the committee, as a unit interval (e.g., { numerator: 1n, denominator: 2n }).
   * @param {GovernanceActionId} [params.governanceActionId] - Optional. The ID of the most recent hard fork initiation action.
   * Can be undefined if this is the first proposal of this type on the network.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public proposeCommitteeUpdate({
    rewardAddress,
    anchor,
    membersToBeRemoved,
    membersToBeAdded,
    newQuorum,
    governanceActionId
  }: {
    rewardAddress: string | RewardAddress;
    anchor: Anchor;
    membersToBeRemoved: CredentialSet;
    membersToBeAdded: CommitteeMembers;
    newQuorum: UnitInterval;
    governanceActionId?: GovernanceActionId;
  }): this {
    let rewardAddressObj: RewardAddress | undefined;
    let anchorPtr = 0;
    let govActionIdPtr = 0;
    let membersToRemovePtr = 0;
    let membersToAddPtr = 0;
    let newQuorumPtr = 0;

    try {
      if (typeof rewardAddress === 'string') {
        rewardAddressObj = RewardAddress.fromBech32(rewardAddress);
      }
      const rewardAddressPtr = rewardAddressObj ? rewardAddressObj.ptr : (rewardAddress as RewardAddress).ptr;

      anchorPtr = writeAnchor(anchor);
      membersToRemovePtr = writeCredentialSet(membersToBeRemoved);
      membersToAddPtr = writeCommitteeMembersMap(membersToBeAdded);
      newQuorumPtr = writeUnitInterval(newQuorum);

      if (governanceActionId) {
        govActionIdPtr = writeGovernanceActionId(governanceActionId);
      }

      this.native.propose_update_committee(
        this.ptr,
        rewardAddressPtr,
        anchorPtr,
        govActionIdPtr,
        membersToRemovePtr,
        membersToAddPtr,
        newQuorumPtr
      );
    } finally {
      if (anchorPtr !== 0) {
        unrefObject(anchorPtr);
      }
      if (govActionIdPtr !== 0) {
        unrefObject(govActionIdPtr);
      }
      if (membersToRemovePtr !== 0) {
        unrefObject(membersToRemovePtr);
      }
      if (membersToAddPtr !== 0) {
        unrefObject(membersToAddPtr);
      }
      if (newQuorumPtr !== 0) {
        unrefObject(newQuorumPtr);
      }
    }

    return this;
  }

  /**
   * Adds a new constitution proposal to the transaction.
   *
   * This governance action proposes to replace the current on-chain constitution
   * with a new one.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress - The reward address where the governance action deposit will be refunded.
   * @param {Anchor} params.anchor - The anchor containing the URL and hash of off-chain metadata for this specific proposal.
   * @param {Constitution} params.constitution - The new constitution being proposed, which includes its own anchor and an optional script hash.
   * @param {GovernanceActionId} [params.governanceActionId] - Optional. The ID of the most recent hard fork initiation action.
   * Can be undefined if this is the first proposal of this type on the network.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public proposeNewConstitution({
    rewardAddress,
    anchor,
    constitution,
    governanceActionId
  }: {
    rewardAddress: string | RewardAddress;
    anchor: Anchor;
    constitution: Constitution;
    governanceActionId?: GovernanceActionId;
  }): this {
    let rewardAddressObj: RewardAddress | undefined;
    let anchorPtr = 0;
    let constitutionPtr = 0;
    let govActionIdPtr = 0;

    try {
      if (typeof rewardAddress === 'string') {
        rewardAddressObj = RewardAddress.fromBech32(rewardAddress);
      }
      const rewardAddressPtr = rewardAddressObj ? rewardAddressObj.ptr : (rewardAddress as RewardAddress).ptr;

      anchorPtr = writeAnchor(anchor);
      constitutionPtr = writeConstitution(constitution);

      if (governanceActionId) {
        govActionIdPtr = writeGovernanceActionId(governanceActionId);
      }

      this.native.propose_new_constitution(this.ptr, rewardAddressPtr, anchorPtr, govActionIdPtr, constitutionPtr);
    } finally {
      if (anchorPtr !== 0) {
        unrefObject(anchorPtr);
      }
      if (constitutionPtr !== 0) {
        unrefObject(constitutionPtr);
      }
      if (govActionIdPtr !== 0) {
        unrefObject(govActionIdPtr);
      }
    }

    return this;
  }

  /**
   * Adds an informational governance action proposal to the transaction.
   *
   * This type of action has no direct on-chain effect but serves to record information
   * or a statement on the blockchain, retrievable via its metadata anchor.
   *
   * @param {Object} params - The parameters for the function.
   * @param {string | RewardAddress} params.rewardAddress - The reward address where the governance action deposit will be refunded.
   * @param {Anchor} params.anchor - The anchor containing the URL and hash of the off-chain information.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public proposeInfoAction({ rewardAddress, anchor }: { rewardAddress: string | RewardAddress; anchor: Anchor }): this {
    let rewardAddressObj: RewardAddress | undefined;
    let anchorPtr = 0;

    try {
      if (typeof rewardAddress === 'string') {
        rewardAddressObj = RewardAddress.fromBech32(rewardAddress);
      }
      const rewardAddressPtr = rewardAddressObj ? rewardAddressObj.ptr : (rewardAddress as RewardAddress).ptr;

      anchorPtr = writeAnchor(anchor);

      this.native.propose_info(this.ptr, rewardAddressPtr, anchorPtr);
    } finally {
      if (anchorPtr !== 0) {
        unrefObject(anchorPtr);
      }
    }

    return this;
  }

  /**
   * Retrieves the current reference count of the native object.
   * This is primarily for debugging and diagnostic purposes.
   *
   * @returns {number} The reference count.
   */
  public getRefCount(): number {
    return this.native.refcount(this.ptr);
  }
  /** Add a key or script guard. A Plutus guard requires its redeemer and script witness. */
  public addGuard(guard: Credential, redeemer?: PlutusData): this {
    let credential = 0;
    let data = 0;
    try {
      credential = writeCredential(guard);
      if (redeemer === undefined) this.native.add_guard(this.ptr, credential);
      else {
        data = writePlutusData(redeemer);
        this.native.add_guard_with_redeemer(this.ptr, credential, data);
      }
      return this;
    } finally {
      unrefObject(data);
      unrefObject(credential);
    }
  }

  /** Deposit lovelace directly into a reward account. */
  public addDirectDeposit(rewardAddress: string | RewardAddress, amount: bigint): this {
    if (amount < 0n || amount > 0xffffffffffffffffn) throw new RangeError('Deposit must fit uint64.');
    const address = typeof rewardAddress === 'string' ? rewardAddress : rewardAddress.toAddress().toString();
    const text = writeStringToMemory(address);
    try {
      const { low, high } = splitToLowHigh64bit(amount);
      this.native.add_direct_deposit_ex(this.ptr, text, address.length, low, high);
      return this;
    } finally {
      getModule()._free(text);
    }
  }

  /** Constrain a reward account balance when the transaction is applied. */
  public addAccountBalanceInterval(rewardAddress: string | RewardAddress, interval: AccountBalanceInterval): this {
    return this.setAccountInterval(this.native.add_account_balance_interval_ex, rewardAddress, interval);
  }

  protected setAccountInterval(
    setter: (...args: number[]) => void,
    rewardAddress: string | RewardAddress,
    interval: AccountBalanceInterval
  ): this {
    const address = typeof rewardAddress === 'string' ? rewardAddress : rewardAddress.toAddress().toString();
    let text = 0;
    let value = 0;
    try {
      text = writeStringToMemory(address);
      value = writeAccountBalanceInterval(interval);
      setter(this.ptr, text, address.length, value);
      return this;
    } finally {
      unrefObject(value);
      getModule()._free(text);
    }
  }

  protected registerDeferredRedeemer(callback: DeferredRedeemer): number {
    const m = getModule();
    const state = this.callbackState;
    const pointer = m.addFunction((_context: number, tx: number, inputs: number, out: number): number => {
      try {
        const data = callback(writeTransactionToCbor(tx), readUtxoList(inputs));
        if (data && typeof (data as any).then === 'function')
          throw new TypeError('Deferred redeemers must be synchronous.');
        m.setValue(out, writePlutusData(data), 'i32');
        return 0;
      } catch (error) {
        state.error = error;
        return 1;
      }
    }, 'iiiii');
    this.resources.callbacks.push(pointer);
    return pointer;
  }

  /** Spend an input with a redeemer computed after balancing. */
  public addInputWithDeferredRedeemer(utxo: UTxO, callback: DeferredRedeemer, datum?: PlutusData): this {
    let input = 0;
    let data = 0;
    try {
      input = writeUtxo(utxo);
      if (datum !== undefined) data = writePlutusData(datum);
      this.native.add_input_with_deferred_redeemer(this.ptr, input, this.registerDeferredRedeemer(callback), 0, data);
      return this;
    } finally {
      unrefObject(data);
      unrefObject(input);
    }
  }

  /** Mint or burn tokens with a deferred redeemer. */
  public mintTokenWithDeferredRedeemer(assetId: string, amount: bigint, callback: DeferredRedeemer): this {
    const m = getModule();
    let policy = 0;
    let name = 0;
    let text = 0;
    const out = m._malloc(4);
    try {
      if (amount < -(1n << 63n) || amount >= 1n << 63n) throw new RangeError('Mint amount must fit int64.');
      policy = blake2bHashFromHex(assetId.slice(0, 56));
      text = writeStringToMemory(assetId.slice(56));
      assertSuccess(m.asset_name_from_hex(text, assetId.length - 56, out));
      name = m.getValue(out, 'i32');
      const { low, high } = splitToLowHigh64bit(amount);
      this.native.mint_token_with_deferred_redeemer(
        this.ptr,
        policy,
        name,
        low,
        high,
        this.registerDeferredRedeemer(callback),
        0
      );
      return this;
    } finally {
      unrefObject(policy);
      unrefObject(name);
      m._free(text);
      m._free(out);
    }
  }

  /** Withdraw rewards with a deferred redeemer. */
  public withdrawRewardsWithDeferredRedeemer(
    rewardAddress: RewardAddress,
    amount: bigint,
    callback: DeferredRedeemer
  ): this {
    const { low, high } = splitToLowHigh64bit(amount);
    this.native.withdraw_rewards_with_deferred_redeemer(
      this.ptr,
      rewardAddress.ptr,
      low,
      high,
      this.registerDeferredRedeemer(callback),
      0
    );
    return this;
  }

  /** Attach a certificate with a deferred redeemer. */
  public addCertificateWithDeferredRedeemer(certificate: Certificate, callback: DeferredRedeemer): this {
    const ptr = writeCertificate(certificate);
    try {
      this.native.add_certificate_with_deferred_redeemer(this.ptr, ptr, this.registerDeferredRedeemer(callback), 0);
      return this;
    } finally {
      unrefObject(ptr);
    }
  }

  /** Cast a vote with a deferred redeemer. */
  public voteWithDeferredRedeemer(
    voter: Voter,
    actionId: GovernanceActionId,
    vote: VotingProcedure,
    callback: DeferredRedeemer
  ): this {
    let voterPtr = 0;
    let actionPtr = 0;
    let votePtr = 0;
    try {
      voterPtr = writeVoter(voter);
      actionPtr = writeGovernanceActionId(actionId);
      votePtr = writeVotingProcedure(vote);
      this.native.vote_with_deferred_redeemer(
        this.ptr,
        voterPtr,
        actionPtr,
        votePtr,
        this.registerDeferredRedeemer(callback),
        0
      );
      return this;
    } finally {
      unrefObject(voterPtr);
      unrefObject(actionPtr);
      unrefObject(votePtr);
    }
  }
}
