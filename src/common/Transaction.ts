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

import { assertSuccess, readTransactionFromCbor, unrefObject } from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * @brief Inspects a Cardano transaction CBOR string and converts it into a structured JavaScript object (JSON).
 *
 * This function takes a hexadecimal CBOR representation of a Cardano transaction and then serializes it
 * into a CIP-116 compliant JSON string. Finally, it parses the JSON string into a native JavaScript object.
 *
 * @param {string} transactionCbor The hexadecimal string representation of the Cardano transaction CBOR.
 * @returns {any} A JavaScript object representing the decoded Cardano transaction structure (CIP-116 JSON format).
 * @throws {Error} If CBOR reading fails, JSON encoding fails, or memory allocation fails.
 */
export const inspectTx = (transactionCbor: string): any => {
  let txPtr = 0;
  let jsonWriter = 0;
  let jsonPtr = 0;
  try {
    txPtr = readTransactionFromCbor(transactionCbor);
    jsonWriter = getModule().json_writer_new(0); // CARDANO_JSON_FORMAT_COMPACT

    getModule().transaction_to_cip116_json(txPtr, jsonWriter);

    const jsonSize = getModule().json_writer_get_encoded_size(jsonWriter);
    jsonPtr = getModule()._malloc(jsonSize ? jsonSize : 1);

    if (jsonSize !== 0) {
      const result = getModule().json_writer_encode(jsonWriter, jsonPtr, jsonSize);
      assertSuccess(result, 'Failed to encode transaction JSON');
    } else {
      getModule().HEAPU8[jsonPtr] = 0;
    }

    const jsonString = getModule().UTF8ToString(jsonPtr);

    return JSON.parse(jsonString);
  } finally {
    unrefObject(txPtr);
    unrefObject(jsonWriter);
    getModule()._free(jsonPtr);
  }
};
