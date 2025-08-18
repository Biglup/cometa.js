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

/* DEFINITIONS ****************************************************************/

/**
 * Defines the types of credentials that can be used in Cardano addresses.
 *
 * A credential can be either a key hash or a script hash, representing different ways
 * of controlling funds in a Cardano address.
 *
 * @enum {number}
 */
export enum CredentialType {
  /**
   * Represents a credential based on a key hash.
   * This type is used when the credential is derived from a public key.
   */
  KeyHash = 0,

  /**
   * Represents a credential based on a script hash.
   * This type is used when the credential is derived from a smart contract script.
   */
  ScriptHash = 1
}
