import { Address, RewardAddress } from '../address';
import { TxIn, UTxO } from '../common';
import {
  assertSuccess,
  blake2bHashFromHex,
  readBlake2bHashData,
  unrefObject,
  writeAssetId,
  writeInputSet,
  writeUtxoList
} from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';
import { readTransactionFromCbor } from '../marshaling/transaction';

// Helpers for interacting with pointers
const allocPtr = (): number => getModule()._malloc(4);
const readPtr = (ptrPtr: number): number => getModule().getValue(ptrPtr, 'i32');

/**
 * A JavaScript wrapper for the C `cardano_provider_t` object, designed for testing.
 */
export class Provider {
  public readonly ptr: number;

  private constructor(ptr: number) {
    this.ptr = ptr;
    finalizationRegistry.register(this, {
      freeFunc: getModule().provider_unref,
      ptr: this.ptr
    });
  }

  /** Adopt an *existing* provider pointer (advanced use-case). */
  static fromPtr(ptr: number): Provider {
    if (!ptr) throw new Error('Null provider pointer');
    getModule().provider_ref(ptr); // Take ownership
    return new Provider(ptr);
  }

  public ref(): void {
    getModule().provider_ref(this.ptr);
  }

  public unref(): void {
    const m = getModule();
    const tmpPtr = m._malloc(4);
    m.setValue(tmpPtr, this.ptr, 'i32');
    m.provider_unref(tmpPtr);
    m._free(tmpPtr);
  }

  public refCount(): number {
    return getModule().provider_refcount(this.ptr);
  }

  get name(): string {
    // This is likely a synchronous C call and doesn't need Asyncify
    return getModule().UTF8ToString(getModule().provider_get_name(this.ptr));
  }

  get networkMagic(): number {
    return getModule().provider_get_network_magic(this.ptr);
  }

  get lastError(): string {
    return getModule().UTF8ToString(getModule().provider_get_last_error(this.ptr));
  }

  /** Fetch the latest protocol parameters. */
  public async getParameters(): Promise<number> {
    const m = getModule();
    const outPtr = allocPtr();

    try {
      m.provider_get_parameters(this.ptr, outPtr);
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      m._free(outPtr);
    }
  }

  async getRewardsBalance(bech32: string): Promise<bigint> {
    const m = getModule();
    // Allocate 8 bytes on the heap to store the C uint64_t result
    const rewardsOutPtr = m._malloc(8);

    try {
      const address = RewardAddress.fromAddress(Address.fromString(bech32));
      // Call the asynchronous C++ bridge function
      m.provider_get_rewards_available(this.ptr, address.ptr, rewardsOutPtr);
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);

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
  async getUnspentOutputs(address: Address): Promise<number> {
    const m = getModule();
    const outPtr = allocPtr();

    try {
      // The Address object's pointer is passed to the async C function
      m.provider_get_unspent_outputs(this.ptr, address.ptr, outPtr);
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      // Ensure the out pointer is always freed.
      m._free(outPtr);
    }
  }

  /** Fetch all UTXOs at an address that contain a specific asset. */
  async getUnspentOutputsWithAsset(address: Address, assetId: string): Promise<number> {
    const m = getModule();
    const outPtr = allocPtr();
    let assetIdPtr = 0;

    try {
      assetIdPtr = writeAssetId(assetId);

      m.provider_get_unspent_outputs_with_asset(this.ptr, address.ptr, assetIdPtr, outPtr);

      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      if (assetIdPtr !== 0) {
        unrefObject(assetIdPtr);
      }
      m._free(outPtr);
    }
  }

  async getUnspentOutputByNft(assetId: string): Promise<number> {
    const m = getModule();
    const outPtr = allocPtr();
    let assetIdPtr = 0;

    try {
      assetIdPtr = writeAssetId(assetId);

      m.provider_get_unspent_output_by_nft(this.ptr, assetIdPtr, outPtr);

      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      if (assetIdPtr !== 0) {
        unrefObject(assetIdPtr);
      }
      m._free(outPtr);
    }
  }

  /** Resolve a set of transaction inputs to their corresponding UTXOs. */
  async resolveUnspentOutputs(txIns: TxIn[]): Promise<number> {
    const m = getModule();
    const outPtr = allocPtr();
    let txInsPtr = 0;
    try {
      txInsPtr = writeInputSet(txIns);
      m.provider_resolve_unspent_outputs(this.ptr, txInsPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      unrefObject(txInsPtr);
      m._free(outPtr);
    }
  }

  async resolveDatum(datumHash: string): Promise<number> {
    const m = getModule();
    const outPtr = allocPtr();
    let datumPtr = 0;
    try {
      datumPtr = blake2bHashFromHex(datumHash);
      m.provider_resolve_datum(this.ptr, datumPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      unrefObject(datumPtr);
      m._free(outPtr);
    }
  }

  /** Wait for a transaction to be confirmed on the blockchain. */
  async confirmTransaction(txId: string): Promise<boolean> {
    const m = getModule();
    const txIdStrPtr = blake2bHashFromHex(txId);
    const outPtr = m._malloc(1); // bool is 1 byte

    try {
      m.provider_confirm_transaction(this.ptr, txIdStrPtr, 90000, 0, outPtr); // 90s timeout
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return m.getValue(outPtr, 'i8') === 1;
    } finally {
      unrefObject(txIdStrPtr);
      m._free(outPtr);
    }
  }

  /** Submit a signed transaction CBOR to the network. */
  async submitTransaction(txCbor: string): Promise<string> {
    const m = getModule();
    const txCborPtr = readTransactionFromCbor(txCbor);
    const outPtr = allocPtr();

    try {
      m.provider_submit_transaction(this.ptr, txCborPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);

      const txIdStrPtr = readPtr(outPtr);
      const txId = readBlake2bHashData(txIdStrPtr);

      m._free(txIdStrPtr);

      return Buffer.from(txId).toString('hex');
    } finally {
      unrefObject(txCborPtr);
    }
  }

  /** Evaluate the execution units for a transaction. */
  async evaluateTransaction(txCbor: string, additionalUtxos: UTxO[]): Promise<number> {
    const m = getModule();
    const txCborPtr = readTransactionFromCbor(txCbor);
    const outPtr = allocPtr();
    let additionalUtxosPtr = 0;
    try {
      additionalUtxosPtr = writeUtxoList(additionalUtxos);
      m.provider_evaluate_transaction(this.ptr, txCborPtr, additionalUtxosPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      unrefObject(additionalUtxosPtr);
      unrefObject(txCborPtr);
      m._free(outPtr);
    }
  }
}
