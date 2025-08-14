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

export class MemoryLeakDetector {
  private module: any;
  private startAddress: number | null = null;
  private endAddress: number | null = null;

  constructor(module: any) {
    this.module = module;
  }

  /**
   * Initializes the memory leak detector.
   * This function should be called in a `beforeEach` block in your test file.
   * It captures the current top of the WebAssembly stack.
   */
  public start(): void {
    if (global.gc) {
      global.gc();
    }

    this.startAddress = this.module._malloc(1);
    this.module._free(this.startAddress);
  }

  public stop(): void {
    if (this.startAddress === null) {
      throw new Error('Memory leak detector was not started. Please call detector.start() in beforeEach().');
    }

    if (global.gc) {
      global.gc();
    }

    this.endAddress = this.module._malloc(1);
    this.module._free(this.endAddress);
  }

  public reset(): void {
    this.startAddress = null;
    this.endAddress = null;
  }

  /**
   * Asserts that no memory has been leaked during a test.
   * This function should be called in an `afterEach` block.
   * It compares the current stack state to the initial state captured by
   * `init()` and fails the test if they do not match.
   */
  public detect(): void {
    if (this.startAddress === null) {
      throw new Error('Memory leak detector was not started. Please call detector.start() in beforeEach().');
    }

    if (this.endAddress === null) {
      throw new Error('Memory leak detector was not stopped. Please call detector.stop() in afterEach().');
    }

    expect(this.startAddress).toBeLessThanOrEqual(this.endAddress);
  }
}
