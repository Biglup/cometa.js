import { CborReader, CborWriter } from '../encoding';
import { getModule } from '../module';

export const readTransactionFromCbor = (transactionPtr: number): string => {
  const module = getModule();

  if (!transactionPtr) {
    throw new Error('Failed to get transaction. Pointer is null.');
  }

  const cborWriter = new CborWriter();

  const result = module.transaction_to_cbor(transactionPtr, cborWriter.ptr);

  if (result !== 0) {
    throw new Error('Failed to marshal transaction to CBOR.');
  }

  return cborWriter.encodeHex();
};

export const writeTransactionToCbor = (transactionCbor: string): number => {
  const module = getModule();

  const cborReader = CborReader.fromHex(transactionCbor);
  const txPtrPtr = module._malloc(4);

  try {
    const result = module.transaction_from_cbor(cborReader.ptr, txPtrPtr);

    if (result !== 0) {
      throw new Error('Failed to marshal transaction to CBOR.');
    }

    return module.getValue(txPtrPtr, 'i32');
  } finally {
    module._free(txPtrPtr);
  }
};
