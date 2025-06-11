export interface ProtocolParameters {
  /** The number of coins per UTXO byte. */
  coinsPerUtxoByte: number;
  /** The maximum transaction size. */
  maxTxSize: number;
  /** The minimum fee coefficient. */
  minFeeCoefficient: number;
  /** The minimum fee constant. */
  minFeeConstant: number;
  /** The maximum block body size. */
  maxBlockBodySize: number;
  /** The maximum block header size. */
  maxBlockHeaderSize: number;
  /** The stake key deposit. */
  stakeKeyDeposit: number;
  /** The pool deposit. */
  poolDeposit: number | null;
  /** The pool retirement epoch bound. */
  poolRetirementEpochBound: number;
  /** The desired number of pools. */
  desiredNumberOfPools: number;
  /** The pool influence. */
  poolInfluence: string;
  /** The monetary expansion. */
  monetaryExpansion: string;
  /** The treasury expansion. */
  treasuryExpansion: string;
  /** The minimum pool cost. */
  minPoolCost: number;
  /** The protocol version. */
  protocolVersion: {
    major: number;
    minor: number;
  };
  /** The maximum value size. */
  maxValueSize: number;
  /** The collateral percentage. */
  collateralPercentage: number;
  /** The maximum collateral inputs. */
  maxCollateralInputs: number;
  /** The cost models. */
  costModels: Record<number, number[]>;
  /** The prices. */
  prices: {
    mem: number;
    step: number;
  };
  /** The maximum execution units per transaction. */
  maxExecutionUnitsPerTransaction: {
    mem: number;
    step: number;
  };
  /** The maximum execution units per block. */
  maxExecutionUnitsPerBlock: {
    mem: number;
    step: number;
  };
  /** Params used for calculating the minimum fee from reference inputs (see https://github.com/CardanoSolutions/ogmios/releases/tag/v6.5.0) */
  minFeeReferenceScripts?: number;
}
