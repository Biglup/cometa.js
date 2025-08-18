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

/* DEFINITIONS **************************************************************/

/**
 * Represents the possible choices in a governance vote.
 */
export enum Vote {
  /** A vote against the governance action. */
  no = 0,
  /** A vote in favor of the governance action. */
  yes = 1,
  /** A vote to abstain, neither for nor against the action. */
  abstain = 2
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
