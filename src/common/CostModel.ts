/**
 * Interface representing a cost model with a language version and an array of costs.
 */
export interface CostModel {
  language: string; // e.g., 'PlutusV1', 'PlutusV2', 'PlutusV3'
  costs: number[];
}
