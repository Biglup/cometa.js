/**
 * Copyright 2024 Biglup Labs.
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

/* IMPORTS *******************************************************************/

import { DelegateRepresentativeThresholds } from '../common/DelegateRepresentativeThresholds';
import { assertSuccess } from './object';
import { derefUnitInterval, readIntervalComponents, writeUnitInterval } from './unitInterval';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Writes a DelegateRepresentativeThresholds object to WASM memory.
 *
 * @param thresholds - The DelegateRepresentativeThresholds object to write.
 * @returns A pointer to the created DRep voting thresholds in WASM memory.
 * @throws {Error} If the thresholds are invalid or creation fails.
 */
export const writeDRepVotingThresholds = (thresholds: DelegateRepresentativeThresholds): number => {
  const module = getModule();
  const thresholdsPtrPtr = module._malloc(4);

  try {
    // Create UnitInterval objects for each threshold
    const motionNoConfidencePtr = writeUnitInterval(thresholds.motionNoConfidence);
    const committeeNormalPtr = writeUnitInterval(thresholds.committeeNormal);
    const committeeNoConfidencePtr = writeUnitInterval(thresholds.committeeNoConfidence);
    const hardForkInitiationPtr = writeUnitInterval(thresholds.hardForkInitiation);
    const updateConstitutionPtr = writeUnitInterval(thresholds.updateConstitution);
    const ppNetworkGroupPtr = writeUnitInterval(thresholds.ppNetworkGroup);
    const ppEconomicGroupPtr = writeUnitInterval(thresholds.ppEconomicGroup);
    const ppTechnicalGroupPtr = writeUnitInterval(thresholds.ppTechnicalGroup);
    const ppGovernanceGroupPtr = writeUnitInterval(thresholds.ppGovernanceGroup);
    const treasuryWithdrawalPtr = writeUnitInterval(thresholds.treasuryWithdrawal);

    try {
      const result = module.drep_voting_thresholds_new(
        motionNoConfidencePtr,
        committeeNormalPtr,
        committeeNoConfidencePtr,
        updateConstitutionPtr,
        hardForkInitiationPtr,
        ppNetworkGroupPtr,
        ppEconomicGroupPtr,
        ppTechnicalGroupPtr,
        ppGovernanceGroupPtr,
        treasuryWithdrawalPtr,
        thresholdsPtrPtr
      );
      assertSuccess(result, 'Failed to create DRep voting thresholds');

      return module.getValue(thresholdsPtrPtr, 'i32');
    } finally {
      // Clean up UnitInterval objects
      derefUnitInterval(motionNoConfidencePtr);
      derefUnitInterval(committeeNormalPtr);
      derefUnitInterval(committeeNoConfidencePtr);
      derefUnitInterval(hardForkInitiationPtr);
      derefUnitInterval(updateConstitutionPtr);
      derefUnitInterval(ppNetworkGroupPtr);
      derefUnitInterval(ppEconomicGroupPtr);
      derefUnitInterval(ppTechnicalGroupPtr);
      derefUnitInterval(ppGovernanceGroupPtr);
      derefUnitInterval(treasuryWithdrawalPtr);
    }
  } finally {
    module._free(thresholdsPtrPtr);
  }
};

/**
 * Reads a DelegateRepresentativeThresholds object from a pointer in WASM memory.
 *
 * @param ptr - The pointer to the DRep voting thresholds in WASM memory.
 * @returns The DelegateRepresentativeThresholds object.
 * @throws {Error} If the pointer is null or reading fails.
 */
export const readDRepVotingThresholds = (ptr: number): DelegateRepresentativeThresholds => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const valuePtrPtr = module._malloc(4);

  try {
    // Read motion no confidence threshold
    let result = module.drep_voting_thresholds_get_motion_no_confidence(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read motion no confidence threshold');
    const motionNoConfidencePtr = module.getValue(valuePtrPtr, 'i32');
    const motionNoConfidence = readIntervalComponents(motionNoConfidencePtr);
    derefUnitInterval(motionNoConfidencePtr);

    // Read committee normal threshold
    result = module.drep_voting_thresholds_get_committee_normal(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read committee normal threshold');
    const committeeNormalPtr = module.getValue(valuePtrPtr, 'i32');
    const committeeNormal = readIntervalComponents(committeeNormalPtr);
    derefUnitInterval(committeeNormalPtr);

    // Read committee no confidence threshold
    result = module.drep_voting_thresholds_get_committee_no_confidence(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read committee no confidence threshold');
    const committeeNoConfidencePtr = module.getValue(valuePtrPtr, 'i32');
    const committeeNoConfidence = readIntervalComponents(committeeNoConfidencePtr);
    derefUnitInterval(committeeNoConfidencePtr);

    // Read hard fork initiation threshold
    result = module.drep_voting_thresholds_get_hard_fork_initiation(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read hard fork initiation threshold');
    const hardForkInitiationPtr = module.getValue(valuePtrPtr, 'i32');
    const hardForkInitiation = readIntervalComponents(hardForkInitiationPtr);
    derefUnitInterval(hardForkInitiationPtr);

    // Read update constitution threshold
    result = module.drep_voting_thresholds_get_update_constitution(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read update constitution threshold');
    const updateConstitutionPtr = module.getValue(valuePtrPtr, 'i32');
    const updateConstitution = readIntervalComponents(updateConstitutionPtr);
    derefUnitInterval(updateConstitutionPtr);

    // Read PP network group threshold
    result = module.drep_voting_thresholds_get_pp_network_group(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read PP network group threshold');
    const ppNetworkGroupPtr = module.getValue(valuePtrPtr, 'i32');
    const ppNetworkGroup = readIntervalComponents(ppNetworkGroupPtr);
    derefUnitInterval(ppNetworkGroupPtr);

    // Read PP economic group threshold
    result = module.drep_voting_thresholds_get_pp_economic_group(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read PP economic group threshold');
    const ppEconomicGroupPtr = module.getValue(valuePtrPtr, 'i32');
    const ppEconomicGroup = readIntervalComponents(ppEconomicGroupPtr);
    derefUnitInterval(ppEconomicGroupPtr);

    // Read PP technical group threshold
    result = module.drep_voting_thresholds_get_pp_technical_group(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read PP technical group threshold');
    const ppTechnicalGroupPtr = module.getValue(valuePtrPtr, 'i32');
    const ppTechnicalGroup = readIntervalComponents(ppTechnicalGroupPtr);
    derefUnitInterval(ppTechnicalGroupPtr);

    // Read PP governance group threshold
    result = module.drep_voting_thresholds_get_pp_governance_group(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read PP governance group threshold');
    const ppGovernanceGroupPtr = module.getValue(valuePtrPtr, 'i32');
    const ppGovernanceGroup = readIntervalComponents(ppGovernanceGroupPtr);
    derefUnitInterval(ppGovernanceGroupPtr);

    // Read treasury withdrawal threshold
    result = module.drep_voting_thresholds_get_treasury_withdrawal(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read treasury withdrawal threshold');
    const treasuryWithdrawalPtr = module.getValue(valuePtrPtr, 'i32');
    const treasuryWithdrawal = readIntervalComponents(treasuryWithdrawalPtr);
    derefUnitInterval(treasuryWithdrawalPtr);

    return {
      committeeNoConfidence,
      committeeNormal,
      hardForkInitiation,
      motionNoConfidence,
      ppEconomicGroup,
      ppGovernanceGroup,
      ppNetworkGroup,
      ppTechnicalGroup,
      treasuryWithdrawal,
      updateConstitution
    };
  } finally {
    module._free(valuePtrPtr);
  }
};

/**
 * Dereferences a DRep voting thresholds pointer, freeing its memory.
 *
 * @param ptr - The pointer to the DRep voting thresholds in WASM memory.
 * @throws {Error} If the pointer is null or dereferencing fails.
 */
export const derefDRepVotingThresholds = (ptr: number): void => {
  if (ptr === 0) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const ptrPtr = module._malloc(4);
  try {
    module.setValue(ptrPtr, ptr, '*');
    module.drep_voting_thresholds_unref(ptrPtr);
  } finally {
    module._free(ptrPtr);
  }
};
