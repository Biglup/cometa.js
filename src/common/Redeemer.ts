import { ExUnits } from './ExUnits';

export enum RedeemerPurpose {
  spend = 'spend',
  mint = 'mint',
  certificate = 'certificate',
  withdrawal = 'withdrawal',
  propose = 'propose',
  vote = 'vote'
}

export interface Redeemer {
  index: number;
  purpose: RedeemerPurpose;
  dataCbor: string;
  executionUnits: ExUnits;
}
