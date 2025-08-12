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

/* DEFINITIONS **************************************************************/

/**
 * Interface representing a value in the Cardano blockchain, which consists of coins and optionally assets.
 */
export type AssetAmounts = Record<string, bigint>;

/**
 * Interface representing a value in the Cardano blockchain, which consists of coins and optionally assets.
 */
export interface Value {
  /**
   * The amount of ADA (in lovelace) represented by this value.
   */
  coins: bigint;
  /**
   * A record of asset amounts, where the key is the asset ID and the value is the amount of that asset.
   * The asset ID is a string that uniquely identifies the asset.
   */
  assets?: AssetAmounts;
}

/**
 * Extracts the asset name from a given asset ID.
 * @param assetId - The asset ID from which to extract the asset name in hexadecimal format.
 */
export const assetNameFromAssetId = (assetId: string): string => assetId.slice(56);

/**
 * Extracts the policy ID from a given asset ID.
 * @param assetId - The asset ID from which to extract the policy ID in hexadecimal format.
 */

export const policyIdFromAssetId = (assetId: string): string => assetId.slice(0, 56);

/**
 * Constructs an asset ID from a policy ID and an asset name.
 * @param policyId - The policy ID to use in the asset ID in hexadecimal format.
 * @param assetName - The asset name to use in the asset ID in hexadecimal format.
 */
export const assetIdFromParts = (policyId: string, assetName: string): string => `${policyId}${assetName}`;
