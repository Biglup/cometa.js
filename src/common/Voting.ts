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

/* IMPORTS ******************************************************************/

import { Anchor } from './Anchor';
import { Credential } from '../address';
import {
  assertSuccess,
  readGovernanceActionId,
  readStringFromMemory,
  unrefObject,
  writeGovernanceActionId,
  writeStringToMemory
} from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS **************************************************************/

/**
 * Represents the possible choices in a governance vote.
 */
export enum Vote {
  /** A vote against the governance action. */
  No = 0,
  /** A vote in favor of the governance action. */
  Yes = 1,
  /** A vote to abstain, neither for nor against the action. */
  Abstain = 2
}

/**
 * Encapsulates a single voting action, including the vote itself
 * and an optional anchor for off-chain metadata.
 */
export type VotingProcedure = {
  /** The voter's choice. */
  vote: Vote;
  /** An optional anchor linking to off-chain metadata about the vote. */
  anchor: Anchor | null;
};

/**
 * Enumerates the different types of voters who can participate in governance.
 */
export enum VoterType {
  /** A Constitutional Committee member identified by a key hash. */
  ConstitutionalCommitteeKeyHash = 0,
  /** A Constitutional Committee member identified by a script hash. */
  ConstitutionalCommitteeScriptHash = 1,
  /** A Delegated Representative (DRep) identified by a key hash. */
  DRepKeyHash = 2,
  /** A Delegated Representative (DRep) identified by a script hash. */
  DRepScriptHash = 3,
  /** A Stake Pool Operator (SPO) identified by a key hash. */
  StakePoolKeyHash = 4
}

/**
 * Represents a participant in the governance process, defined by their role and credential.
 */
export type Voter = {
  /** The type or role of the voter. */
  type: VoterType;
  /** The on-chain credential (key hash or script hash) of the voter. */
  credential: Credential;
};

/**
 * A unique identifier for a governance action on the blockchain.
 */
export type GovernanceActionId = {
  /** The transaction hash that created the governance action. */
  id: string;
  /** The index of the action within the transaction's body. */
  actionIndex: number;
};

/**
 * A special type of DRep that always votes 'Abstain'.
 */
export type AlwaysAbstain = {
  type: 'AlwaysAbstain';
};

/**
 * A special type of DRep that always votes 'No Confidence'.
 */
export type AlwaysNoConfidence = {
  type: 'AlwaysNoConfidence';
};

/**
 * Represents a Delegated Representative (DRep).
 * A DRep can be a specific entity (identified by a credential) or one of two
 * special abstract roles: always abstaining or always voting no confidence.
 */
export type DRep = Credential | AlwaysAbstain | AlwaysNoConfidence;

/**
 * Type guard to check if a DRep is the 'AlwaysAbstain' variant.
 * @param {DRep} drep The DRep object to check.
 * @returns {boolean} True if the DRep is of the 'AlwaysAbstain' type.
 */
export const isDRepAbstain = (drep: DRep): drep is AlwaysAbstain => drep.type === 'AlwaysAbstain';

/**
 * Type guard to check if a DRep is the 'AlwaysNoConfidence' variant.
 * @param {DRep} drep The DRep object to check.
 * @returns {boolean} True if the DRep is of the 'AlwaysNoConfidence' type.
 */
export const isDRepNoConfidence = (drep: DRep): drep is AlwaysNoConfidence => drep.type === 'AlwaysNoConfidence';

/**
 * Type guard to check if a DRep is a specific entity identified by a credential.
 * @param {DRep} drep The DRep object to check.
 * @returns {boolean} True if the DRep is of the 'Credential' type.
 */
export const isDRepCredential = (drep: DRep): drep is Credential => !isDRepAbstain(drep) && !isDRepNoConfidence(drep);

/**
 * Deserializes a Bech32-encoded governance action ID string into a GovernanceActionId object.
 *
 * This function parses a governance action ID string (e.g., "gov_action1...") according to the
 * [CIP-129](https://cips.cardano.org/cip/CIP-129) specification and returns a structured object
 * containing the transaction ID and action index.
 *
 * @param {string} bech32 - The CIP-129 formatted, Bech32-encoded governance action ID string.
 * @returns {GovernanceActionId} A structured object representing the governance action ID.
 * @throws {Error} Throws an error if the Bech32 string is malformed or invalid.
 * @see {@link https://cips.cardano.org/cip/CIP-129|CIP-129} for the official specification.
 * @example
 * const bech32Id = 'gov_action1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpzklpgpf';
 * const govActionId = govActionIdFromBech32(bech32Id);
 *
 * console.log(govActionId.id);
 * //-> "0000000000000000000000000000000000000000000000000000000000000000"
 *
 * console.log(govActionId.actionIndex);
 * //-> 11
 */
export const govActionIdFromBech32 = (bech32: string): GovernanceActionId => {
  const module = getModule();

  const bech32Ptr = writeStringToMemory(bech32);
  const govActionIdPtrPtr = module._malloc(4);
  let ptr = 0;

  try {
    assertSuccess(
      module.governance_action_id_from_bech32(bech32Ptr, bech32.length, govActionIdPtrPtr),
      'Failed to create governance action id from bech32'
    );
    ptr = module.getValue(govActionIdPtrPtr, 'i32');
    return readGovernanceActionId(ptr);
  } finally {
    unrefObject(ptr);
    module._free(bech32Ptr);
    module._free(govActionIdPtrPtr);
  }
};

/**
 * Serializes a GovernanceActionId object into its Bech32 string representation.
 *
 * This function converts a structured GovernanceActionId object (containing a transaction ID
 * and action index) into its CIP-129 formatted Bech32 string (e.g., "gov_action1...").
 *
 * @param {GovernanceActionId} govActionId - The structured object to serialize.
 * @returns {string} The Bech32-encoded governance action ID string.
 * @throws {Error} Throws an error if the serialization fails.
 * @see {@link https://cips.cardano.org/cip/CIP-129|CIP-129} for the official specification.
 * @example
 * const govActionId = {
 * id: '0000000000000000000000000000000000000000000000000000000000000000',
 * actionIndex: 11
 * };
 * const bech32Id = govActionIdToBech32(govActionId);
 *
 * console.log(bech32Id);
 * //-> "gov_action1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpzklpgpf"
 */
export const govActionIdToBech32 = (govActionId: GovernanceActionId): string => {
  const module = getModule();
  let govActionIdPtr = 0;

  try {
    govActionIdPtr = writeGovernanceActionId(govActionId);

    const bech32Ptr = module.governance_action_id_get_string(govActionIdPtr);

    if (bech32Ptr === 0) {
      throw new Error('Failed to retrieve Bech32 string for GovernanceActionId');
    }

    return readStringFromMemory(bech32Ptr);
  } finally {
    // 4. We MUST free the Wasm object we created with writeGovernanceActionId
    unrefObject(govActionIdPtr);
  }
};
