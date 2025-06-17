import { TxIn } from './TxIn';
import { TxOut } from './TxOut';

export interface UTxO {
  input: TxIn;
  output: TxOut;
}
