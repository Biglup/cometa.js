import { Address } from '../address';
import { TxIn, UTxO } from '../common';
import { assertSuccess, unrefObject, writeInputSet, writeStringToMemory, writeUtxoList } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';

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
    const assetIdStrPtr = writeStringToMemory(assetId);

    try {
      m.provider_get_unspent_outputs_with_asset(this.ptr, address.ptr, assetIdStrPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return readPtr(outPtr);
    } finally {
      m._free(outPtr);
      m._free(assetIdStrPtr);
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

  /** Wait for a transaction to be confirmed on the blockchain. */
  async awaitTransactionConfirmation(txId: string): Promise<boolean> {
    const m = getModule();
    const txIdStrPtr = writeStringToMemory(txId);
    const outPtr = m._malloc(1); // bool is 1 byte

    try {
      m.provider_confirm_transaction(this.ptr, txIdStrPtr, 90000, outPtr); // 90s timeout
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);
      return m.getValue(outPtr, 'i8') === 1;
    } finally {
      m._free(txIdStrPtr);
      m._free(outPtr);
    }
  }

  /** Submit a signed transaction CBOR to the network. */
  async submitTransaction(txCbor: string): Promise<string> {
    const m = getModule();
    const txCborPtr = writeStringToMemory(txCbor);
    const outPtr = allocPtr();

    try {
      m.provider_submit_transaction(this.ptr, txCborPtr, outPtr);
      const rc = await m.Asyncify.whenDone();
      assertSuccess(rc, this.lastError);

      const txIdStrPtr = readPtr(outPtr);
      const txId = m.UTF8ToString(txIdStrPtr);

      m._free(txIdStrPtr);

      return txId;
    } finally {
      m._free(txCborPtr);
      m._free(outPtr);
    }
  }

  /** Evaluate the execution units for a transaction. */
  async evaluateTransaction(txCbor: string, additionalUtxos: UTxO[]): Promise<number> {
    const m = getModule();
    const txCborPtr = writeStringToMemory(txCbor);
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
      m._free(txCborPtr);
      m._free(outPtr);
    }
  }
}
