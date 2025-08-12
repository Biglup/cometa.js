import { PlutusData } from './PlutusData';

export enum DatumType {
  DataHash = 0,
  InlineData = 1
}

export type Datum = {
  type: DatumType;
  inlineDatum?: PlutusData;
  datumHash?: string;
};
