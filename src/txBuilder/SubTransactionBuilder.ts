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

import { Credential } from '../address';
import { PlutusData, ProtocolParameters, SlotConfig } from '../common';
import { getModule } from '../module';
import {
  assertSuccess,
  unrefObject,
  writeCredential,
  writePlutusData,
  writeProtocolParameters,
  writeSlotConfig,
  writeSubTransactionToCbor
} from '../marshaling';
import { TransactionBuilderBase } from './TransactionBuilderBase';
import { subTransactionBuilderApi } from './builderApi';

/* DEFINITIONS ****************************************************************/

/** Build a fee-free Dijkstra sub-transaction to be included in a top-level batch. */
export class SubTransactionBuilder extends TransactionBuilderBase {
  private constructor(ptr: number) {
    super(ptr, subTransactionBuilderApi());
  }

  /** Create a sub-transaction builder using protocol version 12 parameters. */
  public static create({
    params,
    slotConfig
  }: {
    params: ProtocolParameters;
    slotConfig: SlotConfig;
  }): SubTransactionBuilder {
    let parameters = 0;
    let slots = 0;
    try {
      parameters = writeProtocolParameters(params);
      slots = writeSlotConfig(slotConfig);
      const ptr = getModule().sub_tx_builder_new(parameters, slots);
      if (!ptr) throw new Error('Failed to create sub-transaction builder.');
      return new SubTransactionBuilder(ptr);
    } finally {
      unrefObject(parameters);
      getModule()._free(slots);
    }
  }

  /** Require a guard on the enclosing top-level transaction, with an optional datum. */
  public requireTopLevelGuard(guard: Credential, datum?: PlutusData): this {
    let credential = 0;
    let data = 0;
    try {
      credential = writeCredential(guard);
      if (datum !== undefined) data = writePlutusData(datum);
      getModule().sub_tx_builder_require_top_level_guard(this.ptr, credential, data);
      return this;
    } finally {
      unrefObject(credential);
      unrefObject(data);
    }
  }

  /** Serialize the sub-transaction. Inputs are explicit; fees and change belong to the batch. */
  public async build(): Promise<string> {
    const builderPtr = this.beginBuild();
    const m = getModule();
    const out = m._malloc(4);
    let tx = 0;
    this.callbackState.error = undefined;
    try {
      const result = m.sub_tx_builder_build(builderPtr, out);
      if (this.callbackState.error) throw this.callbackState.error;
      assertSuccess(result, m.UTF8ToString(m.sub_tx_builder_get_last_error(builderPtr)));
      tx = m.getValue(out, 'i32');
      return writeSubTransactionToCbor(tx);
    } finally {
      this.endBuild();
      unrefObject(tx);
      m._free(out);
    }
  }
}
