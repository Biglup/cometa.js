/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS ********************************************************************/

import { Bech32 } from '../encoding';
import { Credential, CredentialType, EnterpriseAddress, NetworkId } from '../address';
import { Ed25519PublicKey } from '../crypto';
import { Script, computeScriptHash } from './Script';
import { uint8ArrayToHex } from '../cometa';

/* CONSTANTS ******************************************************************/

const CIP_105_DREP_ID_LENGTH = 28;
const CIP_129_DREP_ID_LENGTH = 29;

/* DEFINITIONS ****************************************************************/

/**
 * Build a **CIP-105** DRep ID from a governance credential.
 *
 * @param credential - Credential containing `type` and hex `hash`.
 * @returns Bech32-encoded CIP-105 DRep ID (`drep1...` or `drep_script1...`).
 */
export const cip105DRepFromCredential = (credential: Credential): string => {
  let prefix = 'drep';
  if (credential.type === CredentialType.ScriptHash) {
    prefix = 'drep_script';
  }

  return Bech32.encodeFromHex(prefix, credential.hash);
};

/**
 * Build a **CIP-129** DRep ID from a governance credential.
 *
 * Prepends the appropriate 1-byte header (0x22 for key-hash, 0x23 for script-hash)
 * before Bech32-encoding with HRP `drep`.
 *
 * @param credential - Credential containing `type` and hex `hash`.
 * @returns Bech32-encoded CIP-129 DRep ID (`drep1...`).
 */
export const cip129DRepFromCredential = (credential: Credential): string => {
  // The CIP-129 header is defined by 2 nibbles, where the first 4 bits represent the kind of governance credential
  // (CC Hot, CC Cold and DRep), and the last 4 bits are the credential type (offset by 2 to ensure that governance
  // identifiers remain distinct and are not inadvertently processed as addresses).
  let header = '22'; // DRep-PubKeyHash header in hex [00100010]
  if (credential.type === CredentialType.ScriptHash) {
    header = '23'; // DRep-ScriptHash header in hex [00100011]
  }

  const cip129payload = `${header}${credential.hash}`;
  return Bech32.encodeFromHex('drep', cip129payload);
};

/**
 * Construct a **CIP-129** DRep ID from a public key.
 * @param publicKey - Hex-encoded Ed25519 public key.
 */
export const cip129DRepFromPublicKey = (publicKey: string): string => {
  const key = Ed25519PublicKey.fromHex(publicKey);
  return cip129DRepFromCredential({
    hash: key.toHashHex(),
    type: CredentialType.KeyHash
  });
};

/**
 * Construct a **CIP-129** DRep ID from a script.
 * @param script - Script that controls the DRep credential.
 */
export const cip129DRepFromScript = (script: Script): string => {
  const hash = computeScriptHash(script);
  return cip129DRepFromCredential({
    hash,
    type: CredentialType.ScriptHash
  });
};

/**
 * Decode a DRep ID (CIP-105 or CIP-129) back to a governance credential.
 *
 * - For **CIP-105**, the credential type is inferred from the HRP (`drep` vs `drep_script`).
 * - For **CIP-129**, the credential type is inferred from the header byte.
 *
 * @param drepId - Bech32-encoded DRep ID (`drep1...` or `drep_script1...`).
 * @returns The extracted `Credential` (`{ hash, type }`).
 * @throws Error if the payload length is not `CIP_105_DREP_ID_LENGTH` or `CIP_129_DREP_ID_LENGTH`,
 *         or if a CIP-129 header does not indicate a DRep governance credential.
 * @see toCip105DRepID
 * @see toCip129DRepID
 */
export const dRepToCredential = (drepId: string): Credential => {
  const payload = Bech32.decode(drepId);

  if (payload.data.length !== CIP_105_DREP_ID_LENGTH && payload.data.length !== CIP_129_DREP_ID_LENGTH) {
    throw new Error('Invalid DRepID payload');
  }

  if (payload.data.length === CIP_105_DREP_ID_LENGTH) {
    const isScriptHash = drepId.includes('drep_script');

    return {
      hash: payload.hex,
      type: isScriptHash ? CredentialType.ScriptHash : CredentialType.KeyHash
    };
  }

  // CIP-129
  const header = payload.data[0];
  const hash = payload.data.slice(1);
  const isDrepGovCred = (header & 0x20) === 0x20; // 0b00100000
  const isScriptHash = (header & 0x03) === 0x03; // 0b00000011

  if (!isDrepGovCred) {
    throw new Error('Invalid governance credential type');
  }

  return {
    hash: uint8ArrayToHex(hash),
    type: isScriptHash ? CredentialType.ScriptHash : CredentialType.KeyHash
  };
};

/**
 * Convert any DRep ID (CIP-105 or CIP-129) to **CIP-105** form.
 *
 * @param drepId - Bech32 DRep ID.
 * @returns CIP-105 DRep ID (`drep1...` or `drep_script1...`).
 */
export const toCip105DRepID = (drepId: string): string => {
  const credential = dRepToCredential(drepId);
  return cip105DRepFromCredential(credential);
};

/**
 * Convert any DRep ID (CIP-105 or CIP-129) to **CIP-129** form.
 *
 * @param drepId - Bech32 DRep ID.
 * @returns CIP-129 DRep ID (`drep1...`).
 */
export const toCip129DRepID = (drepId: string): string => {
  const credential = dRepToCredential(drepId);
  return cip129DRepFromCredential(credential);
};

/**
 * Construct a **mainnet enterprise address** from a DRep ID, if possible.
 *
 * Uses the extracted governance credential (key-hash or script-hash) as the payment credential.
 *
 * @param drepId - Bech32 DRep ID.
 * @returns A mainnet `EnterpriseAddress`, or `undefined` if construction fails upstream.
 * @note This always uses `NetworkId.Mainnet`. If you need testnet, create a variant that accepts a `NetworkId`.
 */
export const dRepToAddress = (drepId: string): EnterpriseAddress | undefined => {
  const credential = dRepToCredential(drepId);
  return EnterpriseAddress.fromCredentials(NetworkId.Mainnet, credential);
};
