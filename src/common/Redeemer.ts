import { ExUnits } from './ExUnits';
import { PlutusData } from './PlutusData';

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
  data: PlutusData;
  executionUnits: ExUnits;
}
