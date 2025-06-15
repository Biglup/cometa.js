import { assertSuccess } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';

/* --------------------------------------------------------------------- */
/* Helper: malloc 4-bytes & read back i32                                */
/* --------------------------------------------------------------------- */
const allocPtr = (): number => getModule()._malloc(4);
const readPtr = (ptrPtr: number): number => getModule().getValue(ptrPtr, 'i32');

/* --------------------------------------------------------------------- */
/* Main wrapper class                                                    */
/* --------------------------------------------------------------------- */

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
    return new Provider(ptr);
  }

  public ref(): void {
    getModule().provider_ref(this.ptr);
  }

  public unref(): void {
    getModule().provider_unref(this.addressOfPtr());
  }

  public refCount(): number {
    return getModule().provider_refcount(this.ptr);
  }

  private addressOfPtr(): number {
    const m = getModule();
    const tmp = m._malloc(4);
    m.setValue(tmp, this.ptr, 'i32');
    return tmp;
  }

  get name(): string {
    return getModule().provider_get_name(this.ptr);
  }

  get networkMagic(): number {
    return getModule().provider_get_network_magic(this.ptr);
  }

  get lastError(): string {
    return getModule().provider_get_last_error(this.ptr);
  }
  public async getParameters(): Promise<number> {
    const m = getModule();
    const outPtr = m._malloc(4);

    try {
      m.provider_get_parameters(this.ptr, outPtr);

      const rc = await m.Asyncify.whenDone();

      assertSuccess(rc, this.lastError);

      return m.getValue(outPtr, 'i32');
    } finally {
      m._free(outPtr);
    }
  }
  /** Fetch all UTXOs at a Cardano address. */
  async getUnspentOutputs(address: /* TODO Address */ any): Promise<number /* utxo_list* */> {
    const m = getModule();
    const outPtr = allocPtr();

    const rc = m.provider_get_unspent_outputs(this.ptr, address.ptr /* assuming you have an Address wrapper */, outPtr);
    assertSuccess(rc, this.lastError);

    const listPtr = readPtr(outPtr);
    m._free(outPtr);
    return listPtr; // TODO wrap
  }

  /** Rewards available for a reward address. */
  async getRewards(address: /* RewardAddress */ any): Promise<bigint> {
    const m = getModule();
    const rewardsPtr = m._malloc(8); // uint64_t

    try {
      const rc = m.provider_get_rewards_available(this.ptr, address.ptr, rewardsPtr);
      assertSuccess(rc, this.lastError);

      /* read Uint64 little-endian as BigInt */
      const lo = m.HEAPU32[rewardsPtr >> 2];
      const hi = m.HEAPU32[(rewardsPtr >> 2) + 1];
      return (BigInt(hi) << 32n) | BigInt(lo);
    } finally {
      m._free(rewardsPtr);
    }
  }
}
