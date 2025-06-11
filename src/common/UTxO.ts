export interface UTxO {
  address: string;
  txHash: string;
  outputIndex: number;
  amount: {
    unit: string;
    quantity: string;
  }[];
  block: string;
  dataHash?: string;
  inlineDatum?: string;
  referenceScriptHash?: string;
  scriptReference?: string;
}
