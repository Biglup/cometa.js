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

import { getModule } from '../module';
import { assertSuccess, unrefObject } from './object';
import { writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

/** @hidden */
export const readSubTransactionFromCbor = (cbor: string): number => {
  const m = getModule();
  const text = writeStringToMemory(cbor);
  const out = m._malloc(4);
  let reader = 0;
  try {
    reader = m.cbor_reader_from_hex(text, cbor.length);
    if (!reader) throw new Error('Invalid sub-transaction CBOR.');
    assertSuccess(m.sub_transaction_from_cbor(reader, out), 'Failed to decode sub-transaction');
    return m.getValue(out, 'i32');
  } finally {
    unrefObject(reader);
    m._free(out);
    m._free(text);
  }
};

/** @hidden */
export const writeSubTransactionToCbor = (ptr: number): string => {
  const m = getModule();
  const writer = m.cbor_writer_new();
  let text = 0;
  try {
    assertSuccess(m.sub_transaction_to_cbor(ptr, writer), 'Failed to encode sub-transaction');
    const size = m.cbor_writer_get_hex_size(writer);
    text = m._malloc(size);
    assertSuccess(m.cbor_writer_encode_hex(writer, text, size));
    return m.UTF8ToString(text);
  } finally {
    m._free(text);
    unrefObject(writer);
  }
};
