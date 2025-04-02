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

import { CredentialType } from './CredentialType';

/**
 * Represents a credential used in Cardano addresses.
 *
 * A credential is a fundamental component of Cardano addresses that determines
 * who has control over the funds. It can be either a key hash (representing a
 * public key) or a script hash (representing a smart contract).
 *
 * The credential is used in various address types to specify who can:
 * - Spend funds from the address (payment credential)
 * - Receive staking rewards (stake credential)
 * - Participate in governance (voting credential)
 *
 * @typedef {Object} Credential
 * @property {string} hash - The hash of the credential as a hex string, which is either a
 *                          Blake2b-224 hash of a public key or a script.
 * @property {CredentialType} type - The type of credential, indicating whether
 *                                  the hash represents a key or a script.
 */
export type Credential = {
  /** The hash of the credential (either key hash or script hash) as a hex string. */
  hash: string;
  /** The type of credential (key hash or script hash). */
  type: CredentialType;
};
