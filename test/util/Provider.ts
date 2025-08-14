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

import * as Cometa from '../../dist/cjs';

/* DEFINITIONS ****************************************************************/

/**
 * Allocates a 4-byte pointer on the Emscripten heap.
 * This is used to store pointers returned by C functions.
 */
const allocPtr = (): number => Cometa.getModule()._malloc(4);

/**
 * Reads a pointer value from a 4-byte pointer on the Emscripten heap.
 * This is used to retrieve pointers returned by C functions.
 *
 * @param ptrPtr The pointer to the pointer (4 bytes).
 * @returns The actual pointer value (as a number).
 */
const readPtr = (ptrPtr: number): number => Cometa.getModule().getValue(ptrPtr, 'i32');

/**
 * A JavaScript wrapper for the C `cardano_provider_t` object, designed for testing.
 */
export class Provider {
  public readonly ptr: number;

  /**
   * Creates a new Provider instance.
   * @param ptr The pointer to the C `cardano_provider_t` object.
   */
  private constructor(ptr: number) {
    this.ptr = ptr;
    Cometa.finalizationRegistry.register(this, {
      freeFunc: Cometa.getModule().provider_unref,
      ptr: this.ptr
    });
  }

  /** Adopt an *existing* provider pointer. */
  static fromPtr(ptr: number): Provider {
    if (!ptr) throw new Error('Null provider pointer');
    Cometa.getModule().provider_ref(ptr); // Take ownership
    return new Provider(ptr);
  }

  /** Create a new provider instance with the specified network magic and name. */
  public ref(): void {
    Cometa.getModule().provider_ref(this.ptr);
  }

  /** Create a new provider instance with the specified network magic and name. */
  public unref(): void {
    const m = Cometa.getModule();
    const tmpPtr = m._malloc(4);
    m.setValue(tmpPtr, this.ptr, 'i32');
    m.provider_unref(tmpPtr);
    m._free(tmpPtr);
  }

  /** Get the current reference count of the provider. */
  public refCount(): number {
    return Cometa.getModule().provider_refcount(this.ptr);
  }

  /** Get the human-readable name of the provider. */
  get name(): string {
    return Cometa.getModule().UTF8ToString(Cometa.getModule().provider_get_name(this.ptr));
  }

  /** Get the network magic number of the provider. */
  get networkMagic(): number {
    return Cometa.getModule().provider_get_network_magic(this.ptr);
  }

  /** Get the unique identifier of the provider instance. */
  get lastError(): string {
    return Cometa.getModule().UTF8ToString(Cometa.getModule().provider_get_last_error(this.ptr));
  }

  /** Fetch the latest protocol parameters. */
  public async getParameters(): Promise<number> {
    const m = Cometa.getModule();
    const outPtr = allocPtr();

    try {
      m.provider_get_parameters(this.ptr, outPtr);
      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      m._free(outPtr);
    }
  }

  /** Fetch the current staking rewards balance for a reward account. */
  async getRewardsBalance(bech32: string): Promise<bigint> {
    const m = Cometa.getModule();
    // Allocate 8 bytes on the heap to store the C uint64_t result
    const rewardsOutPtr = m._malloc(8);

    try {
      const address = Cometa.RewardAddress.fromAddress(Cometa.Address.fromString(bech32));
      // Call the asynchronous C++ bridge function
      m.provider_get_rewards_available(this.ptr, address.ptr, rewardsOutPtr);
      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);

      // Manually read the 64-bit integer from memory as two 32-bit halves
      const low = m.HEAPU32[rewardsOutPtr >> 2];
      const high = m.HEAPU32[(rewardsOutPtr >> 2) + 1];

      // Combine the halves into a JavaScript bigint
      return (BigInt(high) << 32n) | BigInt(low);
    } finally {
      // Always free the memory allocated for the result
      m._free(rewardsOutPtr);
    }
  }

  /** Fetch all UTXOs at a Cardano address. */
  async getUnspentOutputs(address: Cometa.Address): Promise<number> {
    const m = Cometa.getModule();
    const outPtr = allocPtr();

    try {
      // The Address object's pointer is passed to the async C function
      m.provider_get_unspent_outputs(this.ptr, address.ptr, outPtr);
      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      // Ensure the out pointer is always freed.
      m._free(outPtr);
    }
  }

  /** Fetch all UTXOs at an address that contain a specific asset. */
  async getUnspentOutputsWithAsset(address: Cometa.Address, assetId: string): Promise<number> {
    const m = Cometa.getModule();
    const outPtr = allocPtr();
    let assetIdPtr = 0;

    try {
      assetIdPtr = Cometa.writeAssetId(assetId);

      m.provider_get_unspent_outputs_with_asset(this.ptr, address.ptr, assetIdPtr, outPtr);

      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      if (assetIdPtr !== 0) {
        Cometa.unrefObject(assetIdPtr);
      }
      m._free(outPtr);
    }
  }

  /** Find the (single) UTXO that holds a given NFT. */
  async getUnspentOutputByNft(assetId: string): Promise<number> {
    const m = Cometa.getModule();
    const outPtr = allocPtr();
    let assetIdPtr = 0;

    try {
      assetIdPtr = Cometa.writeAssetId(assetId);

      m.provider_get_unspent_output_by_nft(this.ptr, assetIdPtr, outPtr);

      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      if (assetIdPtr !== 0) {
        Cometa.unrefObject(assetIdPtr);
      }
      m._free(outPtr);
    }
  }

  /** Resolve a set of transaction inputs to their corresponding UTXOs. */
  async resolveUnspentOutputs(txIns: Cometa.TxIn[]): Promise<number> {
    const m = Cometa.getModule();
    const outPtr = allocPtr();
    let txInsPtr = 0;
    try {
      txInsPtr = Cometa.writeInputSet(txIns);
      m.provider_resolve_unspent_outputs(this.ptr, txInsPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      Cometa.unrefObject(txInsPtr);
      m._free(outPtr);
    }
  }

  /** Resolve a datum by its hash. */
  async resolveDatum(datumHash: string): Promise<number> {
    const m = Cometa.getModule();
    const outPtr = allocPtr();
    let datumPtr = 0;
    try {
      datumPtr = Cometa.blake2bHashFromHex(datumHash);
      m.provider_resolve_datum(this.ptr, datumPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      Cometa.unrefObject(datumPtr);
      m._free(outPtr);
    }
  }

  /** Wait for a transaction to be confirmed on the blockchain. */
  async confirmTransaction(txId: string): Promise<boolean> {
    const m = Cometa.getModule();
    const txIdStrPtr = Cometa.blake2bHashFromHex(txId);
    const outPtr = m._malloc(1); // bool is 1 byte

    try {
      m.provider_confirm_transaction(this.ptr, txIdStrPtr, 90000, 0, outPtr); // 90s timeout
      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);
      return m.getValue(outPtr, 'i8') === 1;
    } finally {
      Cometa.unrefObject(txIdStrPtr);
      m._free(outPtr);
    }
  }

  /** Submit a signed transaction CBOR to the network. */
  async submitTransaction(txCbor: string): Promise<string> {
    const m = Cometa.getModule();
    const txCborPtr = Cometa.readTransactionFromCbor(txCbor);
    const outPtr = allocPtr();

    try {
      m.provider_submit_transaction(this.ptr, txCborPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);

      const txIdStrPtr = readPtr(outPtr);
      const txId = Cometa.readBlake2bHashData(txIdStrPtr);

      m._free(txIdStrPtr);

      return Buffer.from(txId).toString('hex');
    } finally {
      Cometa.unrefObject(txCborPtr);
    }
  }

  /** Evaluate the execution units for a transaction. */
  async evaluateTransaction(txCbor: string, additionalUtxos: Cometa.UTxO[]): Promise<number> {
    const m = Cometa.getModule();
    const txCborPtr = Cometa.readTransactionFromCbor(txCbor);
    const outPtr = allocPtr();
    let additionalUtxosPtr = 0;
    try {
      additionalUtxosPtr = Cometa.writeUtxoList(additionalUtxos);
      m.provider_evaluate_transaction(this.ptr, txCborPtr, additionalUtxosPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      Cometa.assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      Cometa.unrefObject(additionalUtxosPtr);
      Cometa.unrefObject(txCborPtr);
      m._free(outPtr);
    }
  }
}
