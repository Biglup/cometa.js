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
import { DRep } from './Voting';
import { PoolParameters } from './PoolParameters';

/* DEFINITIONS ****************************************************************/

/**
 * Enumerates the target pots for Move Instantaneous Reward (MIR) certificates.
 *
 * MIR certificates in Cardano can move funds between different accounting pots.
 * This enumeration defines the types of pots to which funds can be transferred.
 */
export enum MirCertificatePot {
  /**
   * Indicates that the MIR certificate moves funds to the reserve pot.
   *
   * The reserve pot in Cardano is a pool of ADA coins that are gradually released into
   * circulation. This reserve is used to provide a continuous supply of ADA for staking
   * rewards and other incentives. The reserve helps ensure the long-term sustainability
   * of the Cardano network by maintaining a steady flow of rewards for network participants.
   */
  Reserves = 0,

  /**
   * Indicates that the MIR certificate moves funds to the treasury pot.
   *
   * The treasury pot in Cardano is a fund allocated for the development and improvement
   * of the Cardano ecosystem. For example, it is used to finance projects, proposals, and initiatives
   * through the Project Catalyst governance system. The treasury is filled by a portion
   * of transaction fees and monetary expansion.
   */
  Treasury = 1
}

/**
 * Enumerates the types of MIR certificates.
 *
 * This enumeration defines the possible types of Move Instantaneous Rewards (MIR) certificates in the Cardano system.
 */
export enum MirCertificateKind {
  /**
   * This MIR certificate moves instantaneous rewards funds between accounting pots.
   */
  ToOtherPot = 0,

  /**
   * This MIR certificate transfers funds to the given set of reward accounts.
   */
  ToStakeCreds = 1
}

/**
 * Certificates are used to register, update, or deregister stake pools, and delegate stake.
 */
export enum CertificateType {
  /**
   * This certificate is used when an individual wants to register as a stakeholder.
   * It allows the holder to participate in the staking process by delegating their
   * stake or creating a stake pool.
   */
  StakeRegistration = 0,

  /**
   * This certificate is used when a stakeholder no longer wants to participate in
   * staking. It revokes the stake registration and the associated stake is no
   * longer counted when calculating stake pool rewards.
   */
  StakeDeregistration = 1,

  /**
   * This certificate is used when a stakeholder wants to delegate their stake to a
   * specific stake pool. It includes the stake pool id to which the stake is delegated.
   */
  StakeDelegation = 2,

  /**
   * This certificate is used to register a new stake pool. It includes various details
   * about the pool such as the pledge, costs, margin, reward account, and the pool's owners and relays.
   */
  PoolRegistration = 3,

  /**
   * This certificate is used to retire a stake pool. It includes an epoch number indicating when the pool will be retired.
   */
  PoolRetirement = 4,

  /**
   * This certificate is used to delegate from a Genesis key to a set of keys. This was primarily used in the early
   * phases of the Cardano network's existence during the transition from the Byron to the Shelley era.
   */
  GenesisKeyDelegation = 5,

  /**
   * Certificate used to facilitate an instantaneous transfer of rewards within the system.
   */
  MoveInstantaneousRewards = 6,

  /**
   * This certificate is used when an individual wants to register as a stakeholder.
   * It allows the holder to participate in the staking process by delegating their
   * stake or creating a stake pool.
   *
   * Deposit must match the expected deposit amount specified by `ppKeyDepositL` in
   * the protocol parameters.
   *
   * Remark: Replaces the deprecated `StakeRegistration` in after Conway era.
   */
  Registration = 7,

  /**
   * This certificate is used when a stakeholder no longer wants to participate in
   * staking. It revokes the stake registration and the associated stake is no
   * longer counted when calculating stake pool rewards.
   *
   * Deposit must match the expected deposit amount specified by `ppKeyDepositL` in
   * the protocol parameters.
   *
   * Remark: Replaces the deprecated `StakeDeregistration` in after Conway era.
   */
  Unregistration = 8,

  /**
   * This certificate is used when an individual wants to delegate their voting rights to any other DRep.
   */
  VoteDelegation = 9,

  /**
   * This certificate is used when an individual wants to delegate their voting
   * rights to any other DRep and simultaneously wants to delegate their stake to a
   * specific stake pool.
   */
  StakeVoteDelegation = 10,

  /**
   * This certificate Register the stake key and delegate with a single certificate to a stake pool.
   */
  StakeRegistrationDelegation = 11,

  /**
   * This certificate Register the stake key and delegate with a single certificate to a DRep.
   */
  VoteRegistrationDelegation = 12,

  /**
   * This certificate is used when an individual wants to register its stake key,
   * delegate their voting rights to any other DRep and simultaneously wants to delegate
   * their stake to a specific stake pool.
   */
  StakeVoteRegistrationDelegation = 13,

  /**
   * This certificate registers the Hot and Cold credentials of a committee member.
   */
  AuthCommitteeHot = 14,

  /**
   * This certificate is used then a committee member wants to resign early (will be marked on-chain as an expired member).
   */
  ResignCommitteeCold = 15,

  /**
   * In Voltaire, existing stake credentials will be able to delegate their stake to DReps for voting
   * purposes, in addition to the current delegation to stake pools for block production.
   * DRep delegation will mimic the existing stake delegation mechanisms (via on-chain certificates).
   *
   * This certificate register a stake key as a DRep.
   */
  DRepRegistration = 16,

  /**
   * This certificate unregister an individual as a DRep.
   *
   * Note that a DRep is retired immediately upon the chain accepting a retirement certificate, and
   * the deposit is returned as part of the transaction that submits the retirement certificate
   * (the same way that stake credential registration deposits are returned).
   */
  DRepUnregistration = 17,

  /**
   * Updates the DRep anchored metadata.
   */
  UpdateDRep = 18
}

/**
 * This certificate is used when an individual wants to register as a stakeholder.
 * It allows the holder to participate in the staking process by delegating their
 * stake or creating a stake pool.
 */
export interface RegistrationCertificate {
  type: CertificateType.Registration;
  stakeCredential: Credential;
  deposit: bigint;
}

/**
 * This certificate is used when a stakeholder no longer wants to participate in
 * staking. It revokes the stake registration and the associated stake is no
 * longer counted when calculating stake pool rewards.
 */
export interface UnregistrationCertificate {
  type: CertificateType.Unregistration;
  stakeCredential: Credential;
  deposit: bigint;
}

/**
 * This certificate is used when an individual wants to delegate their voting rights to any other DRep.
 */
export interface VoteDelegationCertificate {
  type: CertificateType.VoteDelegation;
  stakeCredential: Credential;
  dRep: DRep;
}

/**
 * This certificate is used when an individual wants to delegate their voting
 * rights to any other DRep and simultaneously wants to delegate their stake to a
 * specific stake pool.
 */
export interface StakeVoteDelegationCertificate {
  type: CertificateType.StakeVoteDelegation;
  stakeCredential: Credential;
  poolId: string;
  dRep: DRep;
}

/**
 * This certificate Register the stake key and delegate with a single certificate to a stake pool.
 */
export interface StakeRegistrationDelegationCertificate {
  type: CertificateType.StakeRegistrationDelegation;
  stakeCredential: Credential;
  poolId: string;
  deposit: bigint;
}

/**
 * This certificate Register the stake key and delegate with a single certificate to a DRep.
 */
export interface VoteRegistrationDelegationCertificate {
  type: CertificateType.VoteRegistrationDelegation;
  stakeCredential: Credential;
  dRep: DRep;
  deposit: bigint;
}

/**
 * This certificate is used when an individual wants to register its stake key,
 * delegate their voting rights to any other DRep and simultaneously wants to delegate
 * their stake to a specific stake pool.
 */
export interface StakeVoteRegistrationDelegationCertificate {
  type: CertificateType.StakeVoteRegistrationDelegation;
  stakeCredential: Credential;
  poolId: string;
  dRep: DRep;
  deposit: bigint;
}

/**
 * This certificate registers the Hot and Cold credentials of a committee member.
 */
export interface AuthCommitteeHotCertificate {
  type: CertificateType.AuthCommitteeHot;
  coldCredential: Credential;
  hotCredential: Credential;
}

/**
 * This certificate is used then a committee member wants to resign early (will be marked on-chain as an expired member).
 */
export interface ResignCommitteeColdCertificate {
  type: CertificateType.ResignCommitteeCold;
  coldCredential: Credential;
  anchor: Anchor | null;
}

/**
 * In Voltaire, existing stake credentials will be able to delegate their stake to DReps for voting
 * purposes, in addition to the current delegation to stake pools for block production.
 * DRep delegation will mimic the existing stake delegation mechanisms (via on-chain certificates).
 *
 * This certificate register a stake key as a DRep.
 */
export interface DRepRegistrationCertificate {
  type: CertificateType.DRepRegistration;
  dRepCredential: Credential;
  deposit: bigint;
  anchor: Anchor | null;
}

/**
 * This certificate unregister an individual as a DRep.
 *
 * Note that a DRep is retired immediately upon the chain accepting a retirement certificate, and
 * the deposit is returned as part of the transaction that submits the retirement certificate
 * (the same way that stake credential registration deposits are returned).
 */
export interface DRepUnregistrationCertificate {
  type: CertificateType.DRepUnregistration;
  dRepCredential: Credential;
  deposit: bigint;
}

/**
 * Updates the DRep anchored metadata.
 */
export interface UpdateDRepCertificate {
  type: CertificateType.UpdateDRep;
  dRepCredential: Credential;
  anchor: Anchor | null;
}

/**
 * This certificate is used when an individual wants to register as a stakeholder.
 * It allows the holder to participate in the staking process by delegating their
 * stake or creating a stake pool.
 */
export interface StakeRegistrationCertificate {
  type: CertificateType.StakeRegistration;
  stakeCredential: Credential;
}

/**
 * This certificate is used when a stakeholder no longer wants to participate in
 * staking. It revokes the stake registration and the associated stake is no
 * longer counted when calculating stake pool rewards.
 */
export interface StakeDeregistrationCertificate {
  type: CertificateType.StakeDeregistration;
  stakeCredential: Credential;
}

/**
 * This certificate is used to register a new stake pool. It includes various details
 * about the pool such as the pledge, costs, margin, reward account, and the pool's owners and relays.
 */
export interface PoolRegistrationCertificate {
  type: CertificateType.PoolRegistration;
  poolParameters: PoolParameters;
}

/**
 * This certificate is used to retire a stake pool. It includes an epoch number indicating when the pool will be retired.
 */
export interface PoolRetirementCertificate {
  type: CertificateType.PoolRetirement;
  poolId: string;
  epoch: bigint;
}

/**
 * This certificate is used when a stakeholder wants to delegate their stake to a
 * specific stake pool. It includes the stake pool id to which the stake is delegated.
 */
export interface StakeDelegationCertificate {
  type: CertificateType.StakeDelegation;
  stakeCredential: Credential;
  poolId: string;
}

/**
 * @deprecated
 */
export type MirToPot = {
  kind: MirCertificateKind.ToOtherPot;
  pot: MirCertificatePot;
  quantity: bigint;
};

/**
 * @deprecated
 */
export type MirToStakeCreds = {
  kind: MirCertificateKind.ToStakeCreds;
  pot: MirCertificatePot;
  rewards: { [credentialHex: string]: bigint };
};

/**
 * @deprecated
 * Certificate used to facilitate an instantaneous transfer of rewards within the system.
 */
export type MirCertificate = {
  type: CertificateType.MoveInstantaneousRewards;
} & (MirToPot | MirToStakeCreds);

/**
 * @deprecated
 * This certificate is used to delegate from a Genesis key to a set of keys. This was primarily used in the early
 * phases of the Cardano network's existence during the transition from the Byron to the Shelley era.
 */
export interface GenesisKeyDelegationCertificate {
  type: CertificateType.GenesisKeyDelegation;
  genesisHash: string;
  genesisDelegateHash: string;
  vrfKeyHash: string;
}

/**
 * Certificates are a means to encode various essential operations related to stake
 * delegation and stake pool management. Certificates are embedded in transactions and
 * included in blocks. They're a vital aspect of Cardano's proof-of-stake mechanism,
 * ensuring that stakeholders can participate in the protocol and its governance.
 */
export type Certificate =
  | StakeRegistrationCertificate
  | StakeDeregistrationCertificate
  | PoolRegistrationCertificate
  | PoolRetirementCertificate
  | StakeDelegationCertificate
  | MirCertificate
  | GenesisKeyDelegationCertificate
  | RegistrationCertificate
  | UnregistrationCertificate
  | VoteDelegationCertificate
  | StakeVoteDelegationCertificate
  | StakeRegistrationDelegationCertificate
  | VoteRegistrationDelegationCertificate
  | StakeVoteRegistrationDelegationCertificate
  | AuthCommitteeHotCertificate
  | ResignCommitteeColdCertificate
  | DRepRegistrationCertificate
  | DRepUnregistrationCertificate
  | UpdateDRepCertificate;
