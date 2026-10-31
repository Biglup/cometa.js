/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS *******************************************************************/

import {
  AuthCommitteeHotCertificate,
  Certificate,
  CertificateType,
  CredentialType,
  DRep,
  DRepRegistrationCertificate,
  DRepUnregistrationCertificate,
  GenesisKeyDelegationCertificate,
  MirCertificate,
  MirCertificateKind,
  PoolRegistrationCertificate,
  PoolRetirementCertificate,
  RegistrationCertificate,
  ResignCommitteeColdCertificate,
  StakeDelegationCertificate,
  StakeDeregistrationCertificate,
  StakeRegistrationCertificate,
  StakeRegistrationDelegationCertificate,
  StakeVoteDelegationCertificate,
  StakeVoteRegistrationDelegationCertificate,
  UnregistrationCertificate,
  UpdateDRepCertificate,
  VoteDelegationCertificate,
  VoteRegistrationDelegationCertificate,
  blake2bHashFromHex,
  readAnchor,
  readBlake2bHashData,
  readPoolParameters,
  splitToLowHigh64bit,
  uint8ArrayToHex,
  writeAnchor,
  writePoolParameters
} from '../';
import { Credential } from '../address';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { readCredential, writeCredential } from './credential';

/* CONSTANTS *****************************************************************/

const FAILED_TO_GET_CRED_ERROR = 'Failed to get stake credential from certificate';
const FAILED_TO_GET_DREP_ERROR = 'Failed to get DRep credential from certificate';

/* IMPORTS *******************************************************************/

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `StakeRegistrationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the stake registration type.
 * @returns {StakeRegistrationCertificate} The deserialized JavaScript `StakeRegistrationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readStakeRegistrationCertificate = (ptr: number): StakeRegistrationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_stake_registration(ptr, specificCertPtrPtr),
      'Failed to cast to StakeRegistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.stake_registration_cert_get_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error(FAILED_TO_GET_CRED_ERROR);
    }

    return {
      stakeCredential: readCredential(credPtr),
      type: CertificateType.StakeRegistration
    };
  } finally {
    if (credPtr) {
      unrefObject(credPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `StakeRegistrationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {StakeRegistrationCertificate} cert - The `StakeRegistrationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeStakeRegistrationCertificate = (cert: StakeRegistrationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;

  try {
    credPtr = writeCredential(cert.stakeCredential);
    assertSuccess(
      module.stake_registration_cert_new(credPtr, specificCertPtrPtr),
      'Failed to create specific StakeRegistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_stake_registration(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap StakeRegistrationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `StakeDeregistrationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the stake deregistration type.
 * @returns {StakeDeregistrationCertificate} The deserialized JavaScript `StakeDeregistrationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readStakeDeregistrationCertificate = (ptr: number): StakeDeregistrationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_stake_deregistration(ptr, specificCertPtrPtr),
      'Failed to cast to StakeDeregistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.stake_deregistration_cert_get_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error(FAILED_TO_GET_CRED_ERROR);
    }

    return {
      stakeCredential: readCredential(credPtr),
      type: CertificateType.StakeDeregistration
    };
  } finally {
    if (credPtr) {
      unrefObject(credPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `StakeDeregistrationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {StakeDeregistrationCertificate} cert - The `StakeDeregistrationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeStakeDeregistrationCertificate = (cert: StakeDeregistrationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;

  try {
    credPtr = writeCredential(cert.stakeCredential);
    assertSuccess(
      module.stake_deregistration_cert_new(credPtr, specificCertPtrPtr),
      'Failed to create specific StakeDeregistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_stake_deregistration(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap StakeDeregistrationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `StakeDelegationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the stake delegation type.
 * @returns {StakeDelegationCertificate} The deserialized JavaScript `StakeDelegationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readStakeDelegationCertificate = (ptr: number): StakeDelegationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;
  let poolHashPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_stake_delegation(ptr, specificCertPtrPtr),
      'Failed to cast to StakeDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.stake_delegation_cert_get_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error(FAILED_TO_GET_CRED_ERROR);
    }

    poolHashPtr = module.stake_delegation_cert_get_pool_key_hash(specificCertPtr);
    if (!poolHashPtr) {
      throw new Error('Failed to get pool key hash from certificate');
    }

    return {
      poolId: uint8ArrayToHex(readBlake2bHashData(poolHashPtr, false)),
      stakeCredential: readCredential(credPtr),
      type: CertificateType.StakeDelegation
    };
  } finally {
    if (credPtr) {
      unrefObject(credPtr);
    }
    if (poolHashPtr) {
      unrefObject(poolHashPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `StakeDelegationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {StakeDelegationCertificate} cert - The `StakeDelegationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeStakeDelegationCertificate = (cert: StakeDelegationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  let poolHashPtr = 0;

  try {
    credPtr = writeCredential(cert.stakeCredential);
    poolHashPtr = blake2bHashFromHex(cert.poolId);
    assertSuccess(
      module.stake_delegation_cert_new(credPtr, poolHashPtr, specificCertPtrPtr),
      'Failed to create specific StakeDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_stake_delegation(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap StakeDelegationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    unrefObject(poolHashPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `PoolRegistrationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the pool registration type.
 * @returns {PoolRegistrationCertificate} The deserialized JavaScript `PoolRegistrationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readPoolRegistrationCertificate = (ptr: number): PoolRegistrationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  const paramsPtrPtr = module._malloc(4);
  let paramsPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_pool_registration(ptr, specificCertPtrPtr),
      'Failed to cast to PoolRegistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.pool_registration_cert_get_params(specificCertPtr, paramsPtrPtr),
      'Failed to get pool parameters from certificate'
    );
    paramsPtr = module.getValue(paramsPtrPtr, 'i32');

    return {
      poolParameters: readPoolParameters(paramsPtr),
      type: CertificateType.PoolRegistration
    };
  } finally {
    if (paramsPtr) {
      unrefObject(paramsPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(paramsPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `PoolRegistrationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {PoolRegistrationCertificate} cert - The `PoolRegistrationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writePoolRegistrationCertificate = (cert: PoolRegistrationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let paramsPtr = 0;

  try {
    paramsPtr = writePoolParameters(cert.poolParameters);
    assertSuccess(
      module.pool_registration_cert_new(paramsPtr, specificCertPtrPtr),
      'Failed to create specific PoolRegistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_pool_registration(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap PoolRegistrationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(paramsPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `PoolRetirementCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the pool retirement type.
 * @returns {PoolRetirementCertificate} The deserialized JavaScript `PoolRetirementCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readPoolRetirementCertificate = (ptr: number): PoolRetirementCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let poolHashPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_pool_retirement(ptr, specificCertPtrPtr),
      'Failed to cast to PoolRetirementCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    poolHashPtr = module.pool_retirement_cert_get_pool_key_hash(specificCertPtr);
    if (!poolHashPtr) {
      throw new Error('Failed to get pool key hash from certificate');
    }

    const epoch = BigInt(module.pool_retirement_cert_get_epoch(specificCertPtr));

    return {
      epoch,
      poolId: uint8ArrayToHex(readBlake2bHashData(poolHashPtr, false)),
      type: CertificateType.PoolRetirement
    };
  } finally {
    if (poolHashPtr) {
      unrefObject(poolHashPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `PoolRetirementCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {PoolRetirementCertificate} cert - The `PoolRetirementCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writePoolRetirementCertificate = (cert: PoolRetirementCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let poolHashPtr = 0;
  const epochParts = splitToLowHigh64bit(cert.epoch);

  try {
    poolHashPtr = blake2bHashFromHex(cert.poolId);
    assertSuccess(
      module.pool_retirement_cert_new(poolHashPtr, epochParts.low, epochParts.high, specificCertPtrPtr),
      'Failed to create specific PoolRetirementCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_pool_retirement(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap PoolRetirementCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(poolHashPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `GenesisKeyDelegationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the genesis key delegation type.
 * @returns {GenesisKeyDelegationCertificate} The deserialized JavaScript `GenesisKeyDelegationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readGenesisKeyDelegationCertificate = (ptr: number): GenesisKeyDelegationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let genesisHashPtr = 0;
  let delegateHashPtr = 0;
  let vrfHashPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_genesis_key_delegation(ptr, specificCertPtrPtr),
      'Failed to cast to GenesisKeyDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    genesisHashPtr = module.genesis_key_delegation_cert_get_genesis_hash(specificCertPtr);
    delegateHashPtr = module.genesis_key_delegation_cert_get_genesis_delegate_hash(specificCertPtr);
    vrfHashPtr = module.genesis_key_delegation_cert_get_vrf_key_hash(specificCertPtr);

    if (!genesisHashPtr || !delegateHashPtr || !vrfHashPtr) {
      throw new Error('Failed to retrieve one or more hashes from the GenesisKeyDelegationCertificate');
    }

    return {
      genesisDelegateHash: uint8ArrayToHex(readBlake2bHashData(delegateHashPtr, false)),
      genesisHash: uint8ArrayToHex(readBlake2bHashData(genesisHashPtr, false)),
      type: CertificateType.GenesisKeyDelegation,
      vrfKeyHash: uint8ArrayToHex(readBlake2bHashData(vrfHashPtr, false))
    };
  } finally {
    if (genesisHashPtr) unrefObject(genesisHashPtr);
    if (delegateHashPtr) unrefObject(delegateHashPtr);
    if (vrfHashPtr) unrefObject(vrfHashPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `GenesisKeyDelegationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {GenesisKeyDelegationCertificate} cert - The `GenesisKeyDelegationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeGenesisKeyDelegationCertificate = (cert: GenesisKeyDelegationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let genesisHashPtr = 0;
  let delegateHashPtr = 0;
  let vrfHashPtr = 0;

  try {
    genesisHashPtr = blake2bHashFromHex(cert.genesisHash);
    delegateHashPtr = blake2bHashFromHex(cert.genesisDelegateHash);
    vrfHashPtr = blake2bHashFromHex(cert.vrfKeyHash);
    assertSuccess(
      module.genesis_key_delegation_cert_new(genesisHashPtr, delegateHashPtr, vrfHashPtr, specificCertPtrPtr),
      'Failed to create specific GenesisKeyDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_genesis_key_delegation(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap GenesisKeyDelegationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(genesisHashPtr);
    unrefObject(delegateHashPtr);
    unrefObject(vrfHashPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `MirCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the MIR type.
 * @returns {MirCertificate} The deserialized JavaScript `MirCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
// eslint-disable-next-line max-statements
export const readMoveInstantaneousRewardsCertificate = (ptr: number): MirCertificate => {
  const module = getModule();
  const mirCertPtrPtr = module._malloc(4);
  let mirCertPtr = 0;

  try {
    assertSuccess(module.certificate_to_mir(ptr, mirCertPtrPtr), 'Failed to cast to MirCertificate');
    mirCertPtr = module.getValue(mirCertPtrPtr, 'i32');

    const kindPtr = module._malloc(4);
    let specificMirCertPtr = 0;
    const specificMirCertPtrPtr = module._malloc(4);

    try {
      assertSuccess(module.mir_cert_get_type(mirCertPtr, kindPtr));
      const kind: MirCertificateKind = module.getValue(kindPtr, 'i32');

      if (kind === MirCertificateKind.ToOtherPot) {
        assertSuccess(module.mir_cert_as_to_other_pot(mirCertPtr, specificMirCertPtrPtr));
        specificMirCertPtr = module.getValue(specificMirCertPtrPtr, 'i32');

        const potTypePtr = module._malloc(4);
        const amountPtr = module._malloc(8);
        try {
          assertSuccess(module.mir_to_pot_cert_get_pot(specificMirCertPtr, potTypePtr));
          assertSuccess(module.mir_to_pot_cert_get_amount(specificMirCertPtr, amountPtr));

          const pot = module.getValue(potTypePtr, 'i32');
          const quantity =
            (BigInt(module.getValue(amountPtr + 4, 'i32')) << 32n) | BigInt(module.getValue(amountPtr, 'i32') >>> 0);

          return { kind, pot, quantity, type: CertificateType.MoveInstantaneousRewards };
        } finally {
          module._free(potTypePtr);
          module._free(amountPtr);
        }
      } else {
        assertSuccess(module.mir_cert_as_to_stake_creds(mirCertPtr, specificMirCertPtrPtr));
        specificMirCertPtr = module.getValue(specificMirCertPtrPtr, 'i32');

        const potTypePtr = module._malloc(4);
        try {
          assertSuccess(module.mir_to_stake_creds_cert_get_pot(specificMirCertPtr, potTypePtr));
          const pot = module.getValue(potTypePtr, 'i32');
          const size = module.mir_to_stake_creds_cert_get_size(specificMirCertPtr);
          const rewards: { [credentialHex: string]: bigint } = {};

          // eslint-disable-next-line max-depth
          for (let i = 0; i < size; i++) {
            const credPtrPtr = module._malloc(4);
            const amountPtr = module._malloc(8);
            let credPtr = 0;
            // eslint-disable-next-line max-depth
            try {
              assertSuccess(
                module.mir_to_stake_creds_cert_get_key_value_at(specificMirCertPtr, i, credPtrPtr, amountPtr)
              );
              credPtr = module.getValue(credPtrPtr, 'i32');
              const credential = readCredential(credPtr);
              rewards[credential.hash] =
                (BigInt(module.getValue(amountPtr + 4, 'i32')) << 32n) |
                BigInt(module.getValue(amountPtr, 'i32') >>> 0);
            } finally {
              // eslint-disable-next-line max-depth
              if (credPtr) unrefObject(credPtr);
              module._free(credPtrPtr);
              module._free(amountPtr);
            }
          }
          return { kind, pot, rewards, type: CertificateType.MoveInstantaneousRewards };
        } finally {
          module._free(potTypePtr);
        }
      }
    } finally {
      if (specificMirCertPtr) unrefObject(specificMirCertPtr);
      module._free(specificMirCertPtrPtr);
      module._free(kindPtr);
    }
  } finally {
    if (mirCertPtr) unrefObject(mirCertPtr);
    module._free(mirCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `MirCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {MirCertificate} cert - The `MirCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeMoveInstantaneousRewardsCertificate = (cert: MirCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const mirCertPtrPtr = module._malloc(4);
  let mirCertPtr = 0;
  let specificMirCertPtr = 0;
  const specificMirCertPtrPtr = module._malloc(4);

  try {
    if (cert.kind === MirCertificateKind.ToOtherPot) {
      const { low, high } = splitToLowHigh64bit(cert.quantity);
      assertSuccess(module.mir_to_pot_cert_new(cert.pot, low, high, specificMirCertPtrPtr));
      specificMirCertPtr = module.getValue(specificMirCertPtrPtr, 'i32');
      assertSuccess(module.mir_cert_new_to_other_pot(specificMirCertPtr, mirCertPtrPtr));
    } else {
      assertSuccess(module.mir_to_stake_creds_cert_new(cert.pot, specificMirCertPtrPtr));
      specificMirCertPtr = module.getValue(specificMirCertPtrPtr, 'i32');

      for (const [credHex, amount] of Object.entries(cert.rewards)) {
        const credPtr = writeCredential({ hash: credHex, type: CredentialType.KeyHash });
        const { low, high } = splitToLowHigh64bit(amount);
        try {
          assertSuccess(module.mir_to_stake_creds_cert_insert(specificMirCertPtr, credPtr, low, high));
        } finally {
          unrefObject(credPtr);
        }
      }
      assertSuccess(module.mir_cert_new_to_stake_creds(specificMirCertPtr, mirCertPtrPtr));
    }

    mirCertPtr = module.getValue(mirCertPtrPtr, 'i32');
    assertSuccess(module.certificate_new_mir(mirCertPtr, genericCertPtrPtr));

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    if (specificMirCertPtr) unrefObject(specificMirCertPtr);
    if (mirCertPtr) unrefObject(mirCertPtr);
    module._free(specificMirCertPtrPtr);
    module._free(mirCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `RegistrationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the registration type.
 * @returns {RegistrationCertificate} The deserialized JavaScript `RegistrationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readRegistrationCertificate = (ptr: number): RegistrationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_registration(ptr, specificCertPtrPtr),
      'Failed to cast to RegistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.registration_cert_get_stake_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error(FAILED_TO_GET_CRED_ERROR);
    }

    const deposit = BigInt(module.registration_cert_get_deposit(specificCertPtr));

    return {
      deposit,
      stakeCredential: readCredential(credPtr),
      type: CertificateType.Registration
    };
  } finally {
    if (credPtr) {
      unrefObject(credPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `RegistrationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {RegistrationCertificate} cert - The `RegistrationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeRegistrationCertificate = (cert: RegistrationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  const depositParts = splitToLowHigh64bit(cert.deposit);

  try {
    credPtr = writeCredential(cert.stakeCredential);
    assertSuccess(
      module.registration_cert_new(credPtr, depositParts.low, depositParts.high, specificCertPtrPtr),
      'Failed to create specific RegistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_registration(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap RegistrationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `UnregistrationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the unregistration type.
 * @returns {UnregistrationCertificate} The deserialized JavaScript `UnregistrationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readUnregistrationCertificate = (ptr: number): UnregistrationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_unregistration(ptr, specificCertPtrPtr),
      'Failed to cast to UnregistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.unregistration_cert_get_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error(FAILED_TO_GET_CRED_ERROR);
    }

    const deposit = BigInt(module.unregistration_cert_get_deposit(specificCertPtr));

    return {
      deposit,
      stakeCredential: readCredential(credPtr),
      type: CertificateType.Unregistration
    };
  } finally {
    if (credPtr) {
      unrefObject(credPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `UnregistrationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {UnregistrationCertificate} cert - The `UnregistrationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeUnregistrationCertificate = (cert: UnregistrationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  const depositParts = splitToLowHigh64bit(cert.deposit);

  try {
    credPtr = writeCredential(cert.stakeCredential);
    assertSuccess(
      module.unregistration_cert_new(credPtr, depositParts.low, depositParts.high, specificCertPtrPtr),
      'Failed to create specific UnregistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_unregistration(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap UnregistrationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native `cardano_drep_t` into a JavaScript `DRep` object.
 */
const readDRep = (drepPtr: number): DRep => {
  const module = getModule();
  const typePtr = module._malloc(4);
  try {
    assertSuccess(module.drep_get_type(drepPtr, typePtr), 'Failed to get DRep type');

    const kind = module.getValue(typePtr, 'i32');

    switch (kind) {
      case 0:
      case 1: {
        const credPtrPtr = module._malloc(4);
        assertSuccess(module.drep_get_credential(drepPtr, credPtrPtr), 'Failed to get DRep credential');
        const credPtr = module.getValue(credPtrPtr, 'i32');
        try {
          return readCredential(credPtr);
        } finally {
          module._free(credPtrPtr);
          unrefObject(credPtr);
        }
      }
      case 2:
        return { type: 'AlwaysAbstain' };
      case 3:
        return { type: 'AlwaysNoConfidence' };
      default:
        throw new Error(`Unknown DRep kind: ${kind}`);
    }
  } finally {
    module._free(typePtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `DRep` object into a native `cardano_drep_t`.
 */
const writeDRep = (drep: DRep): number => {
  const module = getModule();
  const drepPtrPtr = module._malloc(4);

  try {
    if (
      typeof drep === 'object' &&
      'type' in drep &&
      (drep.type === 'AlwaysAbstain' || drep.type === 'AlwaysNoConfidence')
    ) {
      if (drep.type === 'AlwaysAbstain') {
        assertSuccess(module.drep_new(2, 0, drepPtrPtr), 'Failed to create DRep AlwaysAbstain');
      } else {
        assertSuccess(module.drep_new(3, 0, drepPtrPtr), 'Failed to create DRep AlwaysNoConfidence');
      }
    } else {
      const credPtr = writeCredential(drep as Credential);
      try {
        const kind = (drep as Credential).type === CredentialType.KeyHash ? 0 : 1;
        assertSuccess(module.drep_new(kind, credPtr, drepPtrPtr), 'Failed to create DRep from credential');
      } finally {
        unrefObject(credPtr);
      }
    }
    return module.getValue(drepPtrPtr, 'i32');
  } finally {
    module._free(drepPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `VoteDelegationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the vote delegation type.
 * @returns {VoteDelegationCertificate} The deserialized JavaScript `VoteDelegationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readVoteDelegationCertificate = (ptr: number): VoteDelegationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;
  let drepPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_vote_delegation(ptr, specificCertPtrPtr),
      'Failed to cast to VoteDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.vote_delegation_cert_get_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error(FAILED_TO_GET_CRED_ERROR);
    }

    drepPtr = module.vote_delegation_cert_get_drep(specificCertPtr);
    if (!drepPtr) {
      throw new Error('Failed to get DRep from certificate');
    }

    return {
      dRep: readDRep(drepPtr),
      stakeCredential: readCredential(credPtr),
      type: CertificateType.VoteDelegation
    };
  } finally {
    if (credPtr) {
      unrefObject(credPtr);
    }
    if (drepPtr) {
      unrefObject(drepPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `VoteDelegationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {VoteDelegationCertificate} cert - The `VoteDelegationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeVoteDelegationCertificate = (cert: VoteDelegationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  let drepPtr = 0;

  try {
    credPtr = writeCredential(cert.stakeCredential);
    drepPtr = writeDRep(cert.dRep);
    assertSuccess(
      module.vote_delegation_cert_new(credPtr, drepPtr, specificCertPtrPtr),
      'Failed to create specific VoteDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_vote_delegation(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap VoteDelegationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    unrefObject(drepPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `StakeVoteDelegationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the stake vote delegation type.
 * @returns {StakeVoteDelegationCertificate} The deserialized JavaScript `StakeVoteDelegationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readStakeVoteDelegationCertificate = (ptr: number): StakeVoteDelegationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;
  let poolHashPtr = 0;
  let drepPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_stake_vote_delegation(ptr, specificCertPtrPtr),
      'Failed to cast to StakeVoteDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.stake_vote_delegation_cert_get_credential(specificCertPtr);
    poolHashPtr = module.stake_vote_delegation_cert_get_pool_key_hash(specificCertPtr);
    drepPtr = module.stake_vote_delegation_cert_get_drep(specificCertPtr);

    if (!credPtr || !poolHashPtr || !drepPtr) {
      throw new Error('Failed to retrieve components from StakeVoteDelegationCertificate');
    }

    return {
      dRep: readDRep(drepPtr),
      poolId: uint8ArrayToHex(readBlake2bHashData(poolHashPtr, false)),
      stakeCredential: readCredential(credPtr),
      type: CertificateType.StakeVoteDelegation
    };
  } finally {
    if (credPtr) unrefObject(credPtr);
    if (poolHashPtr) unrefObject(poolHashPtr);
    if (drepPtr) unrefObject(drepPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `StakeVoteDelegationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {StakeVoteDelegationCertificate} cert - The `StakeVoteDelegationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeStakeVoteDelegationCertificate = (cert: StakeVoteDelegationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  let poolHashPtr = 0;
  let drepPtr = 0;

  try {
    credPtr = writeCredential(cert.stakeCredential);
    poolHashPtr = blake2bHashFromHex(cert.poolId);
    drepPtr = writeDRep(cert.dRep);
    assertSuccess(
      module.stake_vote_delegation_cert_new(credPtr, poolHashPtr, drepPtr, specificCertPtrPtr),
      'Failed to create specific StakeVoteDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_stake_vote_delegation(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap StakeVoteDelegationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    unrefObject(poolHashPtr);
    unrefObject(drepPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `StakeRegistrationDelegationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the stake registration delegation type.
 * @returns {StakeRegistrationDelegationCertificate} The deserialized JavaScript `StakeRegistrationDelegationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readStakeRegistrationDelegationCertificate = (ptr: number): StakeRegistrationDelegationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;
  let poolHashPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_stake_registration_delegation(ptr, specificCertPtrPtr),
      'Failed to cast to StakeRegistrationDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.stake_registration_delegation_cert_get_credential(specificCertPtr);
    poolHashPtr = module.stake_registration_delegation_cert_get_pool_key_hash(specificCertPtr);
    const deposit = BigInt(module.stake_registration_delegation_cert_get_deposit(specificCertPtr));

    if (!credPtr || !poolHashPtr) {
      throw new Error('Failed to retrieve components from StakeRegistrationDelegationCertificate');
    }

    return {
      deposit,
      poolId: uint8ArrayToHex(readBlake2bHashData(poolHashPtr, false)),
      stakeCredential: readCredential(credPtr),
      type: CertificateType.StakeRegistrationDelegation
    };
  } finally {
    if (credPtr) unrefObject(credPtr);
    if (poolHashPtr) unrefObject(poolHashPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `StakeRegistrationDelegationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {StakeRegistrationDelegationCertificate} cert - The `StakeRegistrationDelegationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeStakeRegistrationDelegationCertificate = (cert: StakeRegistrationDelegationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  let poolHashPtr = 0;
  const depositParts = splitToLowHigh64bit(cert.deposit);

  try {
    credPtr = writeCredential(cert.stakeCredential);
    poolHashPtr = blake2bHashFromHex(cert.poolId);
    assertSuccess(
      module.stake_registration_delegation_cert_new(
        credPtr,
        poolHashPtr,
        depositParts.low,
        depositParts.high,
        specificCertPtrPtr
      ),
      'Failed to create specific StakeRegistrationDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_stake_registration_delegation(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap StakeRegistrationDelegationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    unrefObject(poolHashPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `VoteRegistrationDelegationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the vote registration delegation type.
 * @returns {VoteRegistrationDelegationCertificate} The deserialized JavaScript `VoteRegistrationDelegationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readVoteRegistrationDelegationCertificate = (ptr: number): VoteRegistrationDelegationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;
  let drepPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_vote_registration_delegation(ptr, specificCertPtrPtr),
      'Failed to cast to VoteRegistrationDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.vote_registration_delegation_cert_get_credential(specificCertPtr);
    drepPtr = module.vote_registration_delegation_cert_get_drep(specificCertPtr);
    const deposit = BigInt(module.vote_registration_delegation_cert_get_deposit(specificCertPtr));

    if (!credPtr || !drepPtr) {
      throw new Error('Failed to retrieve components from VoteRegistrationDelegationCertificate');
    }

    return {
      dRep: readDRep(drepPtr),
      deposit,
      stakeCredential: readCredential(credPtr),
      type: CertificateType.VoteRegistrationDelegation
    };
  } finally {
    if (credPtr) unrefObject(credPtr);
    if (drepPtr) unrefObject(drepPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `VoteRegistrationDelegationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {VoteRegistrationDelegationCertificate} cert - The `VoteRegistrationDelegationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeVoteRegistrationDelegationCertificate = (cert: VoteRegistrationDelegationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  let drepPtr = 0;
  const depositParts = splitToLowHigh64bit(cert.deposit);

  try {
    credPtr = writeCredential(cert.stakeCredential);
    drepPtr = writeDRep(cert.dRep);
    assertSuccess(
      module.vote_registration_delegation_cert_new(
        credPtr,
        depositParts.low,
        depositParts.high,
        drepPtr,
        specificCertPtrPtr
      ),
      'Failed to create specific VoteRegistrationDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_vote_registration_delegation(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap VoteRegistrationDelegationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    unrefObject(drepPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `StakeVoteRegistrationDelegationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the stake vote registration delegation type.
 * @returns {StakeVoteRegistrationDelegationCertificate} The deserialized JavaScript `StakeVoteRegistrationDelegationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readStakeVoteRegistrationDelegationCertificate = (
  ptr: number
): StakeVoteRegistrationDelegationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;
  let poolHashPtr = 0;
  let drepPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_stake_vote_registration_delegation(ptr, specificCertPtrPtr),
      'Failed to cast to StakeVoteRegistrationDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.stake_vote_registration_delegation_cert_get_credential(specificCertPtr);
    poolHashPtr = module.stake_vote_registration_delegation_cert_get_pool_key_hash(specificCertPtr);
    drepPtr = module.stake_vote_registration_delegation_cert_get_drep(specificCertPtr);
    const deposit = BigInt(module.stake_vote_registration_delegation_cert_get_deposit(specificCertPtr));

    if (!credPtr || !poolHashPtr || !drepPtr) {
      throw new Error('Failed to retrieve components from StakeVoteRegistrationDelegationCertificate');
    }

    return {
      dRep: readDRep(drepPtr),
      deposit,
      poolId: uint8ArrayToHex(readBlake2bHashData(poolHashPtr, false)),
      stakeCredential: readCredential(credPtr),
      type: CertificateType.StakeVoteRegistrationDelegation
    };
  } finally {
    if (credPtr) unrefObject(credPtr);
    if (poolHashPtr) unrefObject(poolHashPtr);
    if (drepPtr) unrefObject(drepPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `StakeVoteRegistrationDelegationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {StakeVoteRegistrationDelegationCertificate} cert - The `StakeVoteRegistrationDelegationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeStakeVoteRegistrationDelegationCertificate = (
  cert: StakeVoteRegistrationDelegationCertificate
): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  let poolHashPtr = 0;
  let drepPtr = 0;
  const depositParts = splitToLowHigh64bit(cert.deposit);

  try {
    credPtr = writeCredential(cert.stakeCredential);
    poolHashPtr = blake2bHashFromHex(cert.poolId);
    drepPtr = writeDRep(cert.dRep);
    assertSuccess(
      module.stake_vote_registration_delegation_cert_new(
        credPtr,
        depositParts.low,
        depositParts.high,
        drepPtr,
        poolHashPtr,
        specificCertPtrPtr
      ),
      'Failed to create specific StakeVoteRegistrationDelegationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_stake_vote_registration_delegation(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap StakeVoteRegistrationDelegationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    unrefObject(poolHashPtr);
    unrefObject(drepPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `AuthCommitteeHotCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the auth committee hot type.
 * @returns {AuthCommitteeHotCertificate} The deserialized JavaScript `AuthCommitteeHotCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readAuthCommitteeHotCertificate = (ptr: number): AuthCommitteeHotCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  const coldCredPtrPtr = module._malloc(4);
  let coldCredPtr = 0;
  const hotCredPtrPtr = module._malloc(4);
  let hotCredPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_auth_committee_hot(ptr, specificCertPtrPtr),
      'Failed to cast to AuthCommitteeHotCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.auth_committee_hot_cert_get_cold_cred(specificCertPtr, coldCredPtrPtr),
      'Failed to get cold credential from certificate'
    );
    coldCredPtr = module.getValue(coldCredPtrPtr, 'i32');

    assertSuccess(
      module.auth_committee_hot_cert_get_hot_cred(specificCertPtr, hotCredPtrPtr),
      'Failed to get hot credential from certificate'
    );
    hotCredPtr = module.getValue(hotCredPtrPtr, 'i32');

    return {
      coldCredential: readCredential(coldCredPtr),
      hotCredential: readCredential(hotCredPtr),
      type: CertificateType.AuthCommitteeHot
    };
  } finally {
    if (coldCredPtr) unrefObject(coldCredPtr);
    if (hotCredPtr) unrefObject(hotCredPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
    module._free(coldCredPtrPtr);
    module._free(hotCredPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `AuthCommitteeHotCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {AuthCommitteeHotCertificate} cert - The `AuthCommitteeHotCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeAuthCommitteeHotCertificate = (cert: AuthCommitteeHotCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let coldCredPtr = 0;
  let hotCredPtr = 0;

  try {
    coldCredPtr = writeCredential(cert.coldCredential);
    hotCredPtr = writeCredential(cert.hotCredential);
    assertSuccess(
      module.auth_committee_hot_cert_new(coldCredPtr, hotCredPtr, specificCertPtrPtr),
      'Failed to create specific AuthCommitteeHotCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_auth_committee_hot(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap AuthCommitteeHotCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(coldCredPtr);
    unrefObject(hotCredPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `ResignCommitteeColdCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the resign committee cold type.
 * @returns {ResignCommitteeColdCertificate} The deserialized JavaScript `ResignCommitteeColdCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readResignCommitteeColdCertificate = (ptr: number): ResignCommitteeColdCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;
  let anchorPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_resign_committee_cold(ptr, specificCertPtrPtr),
      'Failed to cast to ResignCommitteeColdCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.resign_committee_cold_cert_get_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error('Failed to get cold credential from certificate');
    }

    anchorPtr = module.resign_committee_cold_cert_get_anchor(specificCertPtr);

    return {
      anchor: anchorPtr ? readAnchor(anchorPtr) : null,
      coldCredential: readCredential(credPtr),
      type: CertificateType.ResignCommitteeCold
    };
  } finally {
    if (credPtr) unrefObject(credPtr);
    if (anchorPtr) unrefObject(anchorPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `ResignCommitteeColdCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {ResignCommitteeColdCertificate} cert - The `ResignCommitteeColdCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeResignCommitteeColdCertificate = (cert: ResignCommitteeColdCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  const anchorPtr = cert.anchor ? writeAnchor(cert.anchor) : 0;

  try {
    credPtr = writeCredential(cert.coldCredential);
    assertSuccess(
      module.resign_committee_cold_cert_new(credPtr, anchorPtr, specificCertPtrPtr),
      'Failed to create specific ResignCommitteeColdCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_resign_committee_cold(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap ResignCommitteeColdCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    if (anchorPtr) {
      unrefObject(anchorPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `DRepRegistrationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the DRep registration type.
 * @returns {DRepRegistrationCertificate} The deserialized JavaScript `DRepRegistrationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readDRepRegistrationCertificate = (ptr: number): DRepRegistrationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;
  let anchorPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_register_drep(ptr, specificCertPtrPtr),
      'Failed to cast to DRepRegistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.register_drep_cert_get_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error(FAILED_TO_GET_DREP_ERROR);
    }

    const deposit = BigInt(module.register_drep_cert_get_deposit(specificCertPtr));
    anchorPtr = module.register_drep_cert_get_anchor(specificCertPtr);

    return {
      anchor: anchorPtr ? readAnchor(anchorPtr) : null,
      dRepCredential: readCredential(credPtr),
      deposit,
      type: CertificateType.DRepRegistration
    };
  } finally {
    if (credPtr) unrefObject(credPtr);
    if (anchorPtr) unrefObject(anchorPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `DRepRegistrationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {DRepRegistrationCertificate} cert - The `DRepRegistrationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeDRepRegistrationCertificate = (cert: DRepRegistrationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  const depositParts = splitToLowHigh64bit(cert.deposit);
  const anchorPtr = cert.anchor ? writeAnchor(cert.anchor) : 0;

  try {
    credPtr = writeCredential(cert.dRepCredential);
    assertSuccess(
      module.register_drep_cert_new(credPtr, depositParts.low, depositParts.high, anchorPtr, specificCertPtrPtr),
      'Failed to create specific DRepRegistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_register_drep(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap DRepRegistrationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    if (anchorPtr) {
      unrefObject(anchorPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `DRepUnregistrationCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the DRep unregistration type.
 * @returns {DRepUnregistrationCertificate} The deserialized JavaScript `DRepUnregistrationCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readDRepUnregistrationCertificate = (ptr: number): DRepUnregistrationCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_unregister_drep(ptr, specificCertPtrPtr),
      'Failed to cast to DRepUnregistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.unregister_drep_cert_get_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error(FAILED_TO_GET_DREP_ERROR);
    }

    const deposit = BigInt(module.unregister_drep_cert_get_deposit(specificCertPtr));

    return {
      dRepCredential: readCredential(credPtr),
      deposit,
      type: CertificateType.DRepUnregistration
    };
  } finally {
    if (credPtr) unrefObject(credPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `DRepUnregistrationCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {DRepUnregistrationCertificate} cert - The `DRepUnregistrationCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeDRepUnregistrationCertificate = (cert: DRepUnregistrationCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  const depositParts = splitToLowHigh64bit(cert.deposit);

  try {
    credPtr = writeCredential(cert.dRepCredential);
    assertSuccess(
      module.unregister_drep_cert_new(credPtr, depositParts.low, depositParts.high, specificCertPtrPtr),
      'Failed to create specific DRepUnregistrationCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_unregister_drep(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap DRepUnregistrationCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native C `cardano_certificate_t` object into a JavaScript `UpdateDRepCertificate` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_certificate_t` object, expected to be of the update DRep type.
 * @returns {UpdateDRepCertificate} The deserialized JavaScript `UpdateDRepCertificate` object.
 * @throws {Error} If the certificate type is incorrect or a marshalling error occurs.
 */
export const readUpdateDRepCertificate = (ptr: number): UpdateDRepCertificate => {
  const module = getModule();
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;
  let credPtr = 0;
  let anchorPtr = 0;

  try {
    assertSuccess(
      module.certificate_to_update_drep(ptr, specificCertPtrPtr),
      'Failed to cast to UpdateDRepCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    credPtr = module.update_drep_cert_get_credential(specificCertPtr);
    if (!credPtr) {
      throw new Error(FAILED_TO_GET_DREP_ERROR);
    }

    anchorPtr = module.update_drep_cert_get_anchor(specificCertPtr);

    return {
      anchor: anchorPtr ? readAnchor(anchorPtr) : null,
      dRepCredential: readCredential(credPtr),
      type: CertificateType.UpdateDRep
    };
  } finally {
    if (credPtr) unrefObject(credPtr);
    if (anchorPtr) unrefObject(anchorPtr);
    if (specificCertPtr) unrefObject(specificCertPtr);
    module._free(specificCertPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `UpdateDRepCertificate` object into a native C `cardano_certificate_t`.
 *
 * @param {UpdateDRepCertificate} cert - The `UpdateDRepCertificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeUpdateDRepCertificate = (cert: UpdateDRepCertificate): number => {
  const module = getModule();
  const genericCertPtrPtr = module._malloc(4);
  const specificCertPtrPtr = module._malloc(4);
  let specificCertPtr = 0;

  let credPtr = 0;
  const anchorPtr = cert.anchor ? writeAnchor(cert.anchor) : 0;

  try {
    credPtr = writeCredential(cert.dRepCredential);
    assertSuccess(
      module.update_drep_cert_new(credPtr, anchorPtr, specificCertPtrPtr),
      'Failed to create specific UpdateDRepCertificate'
    );
    specificCertPtr = module.getValue(specificCertPtrPtr, 'i32');

    assertSuccess(
      module.certificate_new_update_drep(specificCertPtr, genericCertPtrPtr),
      'Failed to wrap UpdateDRepCertificate'
    );

    return module.getValue(genericCertPtrPtr, 'i32');
  } finally {
    unrefObject(credPtr);
    if (anchorPtr) {
      unrefObject(anchorPtr);
    }
    if (specificCertPtr) {
      unrefObject(specificCertPtr);
    }
    module._free(specificCertPtrPtr);
    module._free(genericCertPtrPtr);
  }
};

/* MAIN EXPORTS **************************************************************/

/**
 * @hidden
 * Deserializes a native `cardano_certificate_t` object into a specific JavaScript `Certificate` object.
 *
 * @param {number} ptr A pointer to the native `cardano_certificate_t` object.
 * @returns {Certificate} The deserialized JavaScript `Certificate` object.
 * @throws {Error} If the certificate type is unknown or a marshalling error occurs.
 */
// eslint-disable-next-line max-statements,complexity
export const readCertificate = (ptr: number): Certificate => {
  const module = getModule();
  const typePtr = module._malloc(4);
  try {
    assertSuccess(module.cert_get_type(ptr, typePtr), 'Failed to get certificate type');
    switch (module.getValue(typePtr, 'i32') as CertificateType) {
      case CertificateType.StakeRegistration:
        return readStakeRegistrationCertificate(ptr);
      case CertificateType.StakeDeregistration:
        return readStakeDeregistrationCertificate(ptr);
      case CertificateType.StakeDelegation:
        return readStakeDelegationCertificate(ptr);
      case CertificateType.PoolRegistration:
        return readPoolRegistrationCertificate(ptr);
      case CertificateType.PoolRetirement:
        return readPoolRetirementCertificate(ptr);
      case CertificateType.GenesisKeyDelegation:
        return readGenesisKeyDelegationCertificate(ptr);
      case CertificateType.MoveInstantaneousRewards:
        return readMoveInstantaneousRewardsCertificate(ptr);
      case CertificateType.Registration:
        return readRegistrationCertificate(ptr);
      case CertificateType.Unregistration:
        return readUnregistrationCertificate(ptr);
      case CertificateType.VoteDelegation:
        return readVoteDelegationCertificate(ptr);
      case CertificateType.StakeVoteDelegation:
        return readStakeVoteDelegationCertificate(ptr);
      case CertificateType.StakeRegistrationDelegation:
        return readStakeRegistrationDelegationCertificate(ptr);
      case CertificateType.VoteRegistrationDelegation:
        return readVoteRegistrationDelegationCertificate(ptr);
      case CertificateType.StakeVoteRegistrationDelegation:
        return readStakeVoteRegistrationDelegationCertificate(ptr);
      case CertificateType.AuthCommitteeHot:
        return readAuthCommitteeHotCertificate(ptr);
      case CertificateType.ResignCommitteeCold:
        return readResignCommitteeColdCertificate(ptr);
      case CertificateType.DRepRegistration:
        return readDRepRegistrationCertificate(ptr);
      case CertificateType.DRepUnregistration:
        return readDRepUnregistrationCertificate(ptr);
      case CertificateType.UpdateDRep:
        return readUpdateDRepCertificate(ptr);
      default:
        throw new Error('Unsupported certificate type');
    }
  } finally {
    module._free(typePtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `Certificate` object into a native `cardano_certificate_t`.
 *
 * @param {Certificate} cert The `Certificate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_certificate_t` object.
 * @throws {Error} If the certificate type is unknown or a marshalling error occurs.
 */
// eslint-disable-next-line max-statements,complexity
export const writeCertificate = (cert: Certificate): number => {
  switch (cert.type) {
    case CertificateType.StakeRegistration:
      return writeStakeRegistrationCertificate(cert as StakeRegistrationCertificate);
    case CertificateType.StakeDeregistration:
      return writeStakeDeregistrationCertificate(cert as StakeDeregistrationCertificate);
    case CertificateType.StakeDelegation:
      return writeStakeDelegationCertificate(cert as StakeDelegationCertificate);
    case CertificateType.PoolRegistration:
      return writePoolRegistrationCertificate(cert as PoolRegistrationCertificate);
    case CertificateType.PoolRetirement:
      return writePoolRetirementCertificate(cert as PoolRetirementCertificate);
    case CertificateType.GenesisKeyDelegation:
      return writeGenesisKeyDelegationCertificate(cert as GenesisKeyDelegationCertificate);
    case CertificateType.MoveInstantaneousRewards:
      return writeMoveInstantaneousRewardsCertificate(cert as MirCertificate);
    case CertificateType.Registration:
      return writeRegistrationCertificate(cert as RegistrationCertificate);
    case CertificateType.Unregistration:
      return writeUnregistrationCertificate(cert as UnregistrationCertificate);
    case CertificateType.VoteDelegation:
      return writeVoteDelegationCertificate(cert as VoteDelegationCertificate);
    case CertificateType.StakeVoteDelegation:
      return writeStakeVoteDelegationCertificate(cert as StakeVoteDelegationCertificate);
    case CertificateType.StakeRegistrationDelegation:
      return writeStakeRegistrationDelegationCertificate(cert as StakeRegistrationDelegationCertificate);
    case CertificateType.VoteRegistrationDelegation:
      return writeVoteRegistrationDelegationCertificate(cert as VoteRegistrationDelegationCertificate);
    case CertificateType.StakeVoteRegistrationDelegation:
      return writeStakeVoteRegistrationDelegationCertificate(cert as StakeVoteRegistrationDelegationCertificate);
    case CertificateType.AuthCommitteeHot:
      return writeAuthCommitteeHotCertificate(cert as AuthCommitteeHotCertificate);
    case CertificateType.ResignCommitteeCold:
      return writeResignCommitteeColdCertificate(cert as ResignCommitteeColdCertificate);
    case CertificateType.DRepRegistration:
      return writeDRepRegistrationCertificate(cert as DRepRegistrationCertificate);
    case CertificateType.DRepUnregistration:
      return writeDRepUnregistrationCertificate(cert as DRepUnregistrationCertificate);
    case CertificateType.UpdateDRep:
      return writeUpdateDRepCertificate(cert as UpdateDRepCertificate);
    default:
      throw new Error('Unsupported certificate type');
  }
};
