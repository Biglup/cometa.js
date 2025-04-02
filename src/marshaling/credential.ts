import { Credential } from '../address';
import { assertSuccess } from './object';
import { getModule } from '../module';

export const readCredential = (credentialPtr: number): Credential => {
  const module = getModule();

  if (!credentialPtr) {
    throw new Error('Failed to get credential. Pointer is null.');
  }

  const typePtr = module._malloc(4);
  const size = module.credential_get_hash_hex_size(credentialPtr);

  try {
    const typeResult = module.credential_get_type(credentialPtr, typePtr);
    assertSuccess(typeResult, 'Failed to get credential type.');

    const hexPtr = module.credential_get_hash_hex(credentialPtr);
    if (!hexPtr) {
      throw new Error('Failed to get credential hash hex.');
    }

    return {
      hash: module.UTF8ToString(hexPtr, size),
      type: module.getValue(typePtr, 'i32')
    };
  } finally {
    module._free(typePtr);
  }
};

export const writeCredential = (credential: Credential): number => {
  const module = getModule();
  const credentialPtrPtr = module._malloc(4);
  const hashBytes = new Uint8Array(Buffer.from(credential.hash, 'hex'));
  const hashPtr = module._malloc(hashBytes.length);

  try {
    module.HEAPU8.set(hashBytes, hashPtr);

    const result = module.credential_from_hash_bytes(hashPtr, hashBytes.length, credential.type, credentialPtrPtr);
    assertSuccess(result, 'Failed to create credential from hash bytes.');

    return module.getValue(credentialPtrPtr, 'i32');
  } finally {
    module._free(credentialPtrPtr);
    module._free(hashPtr);
  }
};
