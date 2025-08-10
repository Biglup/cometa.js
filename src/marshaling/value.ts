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

import { Value, assetNameFromAssetId, policyIdFromAssetId } from '../common';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';
import { writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

export const readValue = (ptr: number): Value => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();

  let coins = 0n;
  const assetsMapPtr = module.value_as_assets_map(ptr);
  const assetsCount = module.asset_id_map_get_length(assetsMapPtr);
  const assets: { [key: string]: bigint } = {};

  for (let i = 0; i < assetsCount; i++) {
    const assetIdPtrPtr = module._malloc(4);
    const amountPtr = module._malloc(8);

    try {
      const keyResult = module.asset_id_map_get_key_at(assetsMapPtr, i, assetIdPtrPtr);
      assertSuccess(keyResult, 'Failed to get asset ID from assets map');

      const assetIdPtr = module.getValue(assetIdPtrPtr, 'i32');
      unrefObject(assetIdPtr);

      const assetIdHexCStringPtr = module.asset_id_get_hex(assetIdPtr);

      const assetIdHex = module.UTF8ToString(assetIdHexCStringPtr);

      const valueResult = module.asset_id_map_get_value_at(assetsMapPtr, i, amountPtr);
      assertSuccess(valueResult, 'Failed to get asset value from assets map');

      const low = module.getValue(amountPtr, 'i32');
      const high = module.getValue(amountPtr + 4, 'i32');

      if (assetIdHex.length === 0) {
        coins = (BigInt(high) << 32n) | BigInt(low >>> 0);
        continue;
      }

      assets[assetIdHex] = (BigInt(high) << 32n) | BigInt(low >>> 0);
    } finally {
      module._free(assetIdPtrPtr);
      module._free(amountPtr);
    }
  }
  unrefObject(assetsMapPtr);

  return {
    assets,
    coins
  };
};

export const writeValue = (value: Value): number => {
  const module = getModule();

  const coinParts = splitToLowHigh64bit(value.coins);
  const valuePtr = module.value_new_from_coin(coinParts.low, coinParts.high);

  for (const assetId of Object.keys(value.assets || {})) {
    const policyId = policyIdFromAssetId(assetId);
    const assetName = assetNameFromAssetId(assetId);
    const quantity = value.assets?.[assetId] ?? 0n;

    const quantityParts = splitToLowHigh64bit(quantity);

    const policyIdPtr = writeStringToMemory(policyId);
    const assetNamePtr = writeStringToMemory(assetName);

    try {
      const addAssetResult = module.value_add_asset_ex(
        valuePtr,
        policyIdPtr,
        policyId.length,
        assetNamePtr,
        assetName.length,
        quantityParts.low,
        quantityParts.high
      );

      assertSuccess(addAssetResult, `Failed to add asset: ${assetId}`);
    } finally {
      module._free(policyIdPtr);
      module._free(assetNamePtr);
    }
  }
  return valuePtr;
};
