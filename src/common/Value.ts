export type TokenMap = Record<string, bigint>;

export interface Value {
  coins: bigint;
  assets?: TokenMap;
}

export const assetNameFromAssetId = (assetId: string): string => assetId.slice(56);
export const policyIdFromAssetId = (assetId: string): string => assetId.slice(0, 56);
export const assetIdFromParts = (policyId: string, assetName: string): string => `${policyId}${assetName}`;
