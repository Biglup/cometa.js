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

// eslint-disable-next-line import/no-extraneous-dependencies
import { expect } from '@jest/globals';

/* EXPORTS *******************************************************************/

const collect = async (): Promise<void> => {
  if (!global.gc) throw new Error('Memory checks require node --expose-gc.');
  for (let i = 0; i < 3; i++) {
    global.gc();
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};

/** Measures live WASM allocator bytes after JavaScript finalizers have run. */
export class MemoryLeakDetector {
  private readonly enabled: boolean;
  private startBytes: number | null = null;
  private endBytes: number | null = null;

  constructor(private readonly module: any) {
    this.enabled = typeof module._mallinfo === 'function';
    if (process.env.COMETA_CHECK_LEAKS === '1' && !this.enabled)
      throw new Error('Leak checks require a WASM build with CARDANO_WASM_ALLOCATOR_STATS=ON.');
  }

  private allocatedBytes(): number {
    const info = this.module._malloc(40);
    try {
      // wasm32 dlmalloc's mallinfo contains ten uint32 fields; uordblks is field 7.
      this.module._mallinfo(info);
      return this.module.HEAPU32[(info >>> 2) + 7];
    } finally {
      this.module._free(info);
    }
  }

  public async start(): Promise<void> {
    if (!this.enabled) return;
    await collect();
    this.startBytes = this.allocatedBytes();
  }

  public async stop(): Promise<void> {
    if (!this.enabled) return;
    await collect();
    this.endBytes = this.allocatedBytes();
  }

  public reset(): void {
    this.startBytes = null;
    this.endBytes = null;
  }

  public detect(): void {
    if (!this.enabled) return;
    if (this.startBytes === null || this.endBytes === null)
      throw new Error('Call start and stop before checking for leaks.');
    expect(this.endBytes).toBeLessThanOrEqual(this.startBytes);
  }
}
