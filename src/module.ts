/**
 * Copyright 2024 Biglup Labs.
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

import { Address, RewardAddress } from './address';
import { ProtocolParameters, cborToPlutusData } from './common';
import { blake2bHashFromHex, readBlake2bHashData, unrefObject, writeProtocolParameters } from './marshaling';
import { ensureModuleHasRandomValue } from './randomValue';
import { getFromInstanceRegistry } from './instanceRegistry';
import { readTransactionFromCbor } from './marshaling/transaction';
import { readUtxoList, writeUtxo, writeUtxoList } from './marshaling/utxo';
import { uint8ArrayToHex } from './cometa';

/* GLOBALS ********************************************************************/

let _Module: any;
let _isReady = false;

/* DEFINITIONS ****************************************************************/

/**
 * Initializes the WASM module and ensures it is ready for use.
 *
 * This function dynamically imports the WASM module using Emscripten and sets up its initialization callbacks.
 * It returns a Promise that resolves once the module is fully initialized. If the module is already initialized,
 * the Promise resolves immediately.
 *
 * @returns {Promise<void>} A Promise that resolves when the WASM module is ready.
 */
export const ready = async (): Promise<void> => {
  if (_isReady) return;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const ModuleFactory = (await import('../libcardano-c/cardano_c.js')).default;

  return new Promise<void>((resolve, reject) => {
    Object.assign(globalThis, {
      get_provider_from_registry(objectId: any) {
        // eslint-disable-next-line sonarjs/no-empty-collection
        return getFromInstanceRegistry(objectId);
      },
      marshal_protocol_parameters(params: ProtocolParameters) {
        try {
          return writeProtocolParameters(params);
        } catch {
          return 0;
        }
      },
      marshall_address(addressPtr: number) {
        try {
          const addr = new Address(addressPtr, false);
          return addr.toString();
        } catch {
          return null;
        }
      },
      marshall_utxo_list_to_js(utxoListPtr: number) {
        if (utxoListPtr === 0) return [];
        try {
          return readUtxoList(utxoListPtr);
        } catch {
          return null;
        }
      },
      marshall_asset_id(assetIdPtr: number) {
        try {
          const hexStringPtr = _Module.asset_id_get_hex(assetIdPtr);
          return _Module.UTF8ToString(hexStringPtr);
        } catch {
          return null;
        }
      },
      marshall_blake2b_hash(hashPtr: number) {
        try {
          return uint8ArrayToHex(readBlake2bHashData(hashPtr));
        } catch {
          return null;
        }
      },
      marshall_reward_address(rewardAddressPtr: number) {
        try {
          const addr = new RewardAddress(rewardAddressPtr, false);
          return addr.toAddress().toString();
        } catch {
          return null;
        }
      },
      marshall_transaction_to_cbor_hex(txPtr: number) {
        try {
          return readTransactionFromCbor(txPtr);
        } catch {
          return null;
        }
      },
      marshal_utxo_list(jsUtxoArray: any[]) {
        try {
          console.error(jsUtxoArray)
          return writeUtxoList(jsUtxoArray);
        } catch (error) {
          console.error(error)
          return 0;
        }
      },
      marshal_utxo(jsUtxoObj: any) {
        try {
          return writeUtxo(jsUtxoObj);
        } catch {
          return 0;
        }
      },
      marshal_plutus_data(jsPlutusDataCborHex: string) {
        try {
          return cborToPlutusData(jsPlutusDataCborHex);
        } catch {
          return 0;
        }
      },
      marshal_blake2b_hash_from_hex(jsHexString: string) {
        try {
          return blake2bHashFromHex(jsHexString);
        } catch {
          return 0;
        }
      },
      marshal_redeemer_list(_jsRedeemerArray: any[]) {
        return 0;
      },
      marshall_tx_input_set(inputSetPtr: number) {
        try {
          const len = _Module.transaction_input_set_get_length(inputSetPtr);
          const jsArray = [];

          for (let i = 0; i < len; i++) {
            let inputPtr = 0;
            let txIdPtr = 0;

            try {
              inputPtr = _Module.transaction_input_set_get(inputSetPtr, i);
              txIdPtr = _Module.transaction_input_get_id(inputPtr);

              const txIdHex = readBlake2bHashData(txIdPtr);
              jsArray.push({
                index: _Module.transaction_input_get_index(inputPtr),
                transactionId: uint8ArrayToHex(txIdHex)
              });
            } finally {
              if (txIdPtr !== 0) {
                unrefObject(txIdPtr);
              }
              if (inputPtr !== 0) {
                unrefObject(inputPtr);
              }
            }
          }
          return jsArray;
        } catch {
          return null;
        }
      }
    });

    const moduleInstance = ModuleFactory({
      onAbort: (err: unknown) => {
        reject(err);
      },
      onRuntimeInitialized: () => {
        _isReady = true;

        resolve();
      }
    });

    moduleInstance
      .then((instance: any) => {
        _Module = instance;
        ensureModuleHasRandomValue(_Module);
      })
      .catch((error: any) => {
        reject(error);
      });
  });
};

/**
 * Retrieves the initialized Emscripten WASM module.
 *
 * This function returns the initialized Emscripten WASM module. If the module is not ready,
 * it throws an error. Ensure `ready()` has been called and resolved before using this function.
 *
 * @throws {Error} If the module is not ready.
 *
 * @returns {any} The initialized WASM module.
 */
export const getModule = (): any => {
  if (!_isReady) {
    throw new Error('Module is not ready yet. Make sure to call `await Cometa.ready()` first.');
  }
  return _Module;
};

/**
 * Checks if the WASM module is ready for use.
 *
 * This function provides a synchronous way to check if the WASM module has been initialized.
 * It is useful to verify the readiness state before calling `getModule()`.
 *
 * @returns {boolean} `true` if the module is ready, otherwise `false`.
 */
export const isReady = (): boolean => _isReady;
