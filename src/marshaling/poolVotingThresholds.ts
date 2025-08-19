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

import { PoolVotingThresholds } from '../common';
import { assertSuccess } from './object';
import { derefUnitInterval, readIntervalComponents, writeUnitInterval } from './unitInterval';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Writes a PoolVotingThresholds object to WASM memory.
 *
 * @param thresholds - The PoolVotingThresholds object to write.
 * @returns A pointer to the created pool voting thresholds in WASM memory.
 * @throws {Error} If the thresholds are invalid or creation fails.
 */
export const writePoolVotingThresholds = (thresholds: PoolVotingThresholds): number => {
  const module = getModule();
  const thresholdsPtrPtr = module._malloc(4);

  try {
    // Create UnitInterval objects for each threshold
    const motionNoConfidencePtr = writeUnitInterval(thresholds.motionNoConfidence);
    const committeeNormalPtr = writeUnitInterval(thresholds.committeeNormal);
    const committeeNoConfidencePtr = writeUnitInterval(thresholds.committeeNoConfidence);
    const hardForkInitiationPtr = writeUnitInterval(thresholds.hardForkInitiation);
    const securityRelevantParamPtr = writeUnitInterval(thresholds.securityRelevantParamVotingThreshold);

    try {
      const result = module.pool_voting_thresholds_new(
        motionNoConfidencePtr,
        committeeNormalPtr,
        committeeNoConfidencePtr,
        hardForkInitiationPtr,
        securityRelevantParamPtr,
        thresholdsPtrPtr
      );
      assertSuccess(result, 'Failed to create pool voting thresholds');

      return module.getValue(thresholdsPtrPtr, 'i32');
    } finally {
      // Clean up UnitInterval objects
      derefUnitInterval(motionNoConfidencePtr);
      derefUnitInterval(committeeNormalPtr);
      derefUnitInterval(committeeNoConfidencePtr);
      derefUnitInterval(hardForkInitiationPtr);
      derefUnitInterval(securityRelevantParamPtr);
    }
  } finally {
    module._free(thresholdsPtrPtr);
  }
};

/**
 * @hidden
 * Reads a PoolVotingThresholds object from a pointer in WASM memory.
 *
 * @param ptr - The pointer to the pool voting thresholds in WASM memory.
 * @returns The PoolVotingThresholds object.
 * @throws {Error} If the pointer is null or reading fails.
 */
export const readPoolVotingThresholds = (ptr: number): PoolVotingThresholds => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const valuePtrPtr = module._malloc(4);

  try {
    // Read motion no confidence threshold
    let result = module.pool_voting_thresholds_get_motion_no_confidence(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read motion no confidence threshold');
    const motionNoConfidencePtr = module.getValue(valuePtrPtr, 'i32');
    const motionNoConfidence = readIntervalComponents(motionNoConfidencePtr);
    derefUnitInterval(motionNoConfidencePtr);

    // Read committee normal threshold
    result = module.pool_voting_thresholds_get_committee_normal(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read committee normal threshold');
    const committeeNormalPtr = module.getValue(valuePtrPtr, 'i32');
    const committeeNormal = readIntervalComponents(committeeNormalPtr);
    derefUnitInterval(committeeNormalPtr);

    // Read committee no confidence threshold
    result = module.pool_voting_thresholds_get_committee_no_confidence(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read committee no confidence threshold');
    const committeeNoConfidencePtr = module.getValue(valuePtrPtr, 'i32');
    const committeeNoConfidence = readIntervalComponents(committeeNoConfidencePtr);
    derefUnitInterval(committeeNoConfidencePtr);

    // Read hard fork initiation threshold
    result = module.pool_voting_thresholds_get_hard_fork_initiation(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read hard fork initiation threshold');
    const hardForkInitiationPtr = module.getValue(valuePtrPtr, 'i32');
    const hardForkInitiation = readIntervalComponents(hardForkInitiationPtr);
    derefUnitInterval(hardForkInitiationPtr);

    // Read security relevant parameter threshold
    result = module.pool_voting_thresholds_get_security_relevant_param(ptr, valuePtrPtr);
    assertSuccess(result, 'Failed to read security relevant parameter threshold');
    const securityRelevantParamPtr = module.getValue(valuePtrPtr, 'i32');
    const securityRelevantParam = readIntervalComponents(securityRelevantParamPtr);
    derefUnitInterval(securityRelevantParamPtr);

    return {
      committeeNoConfidence,
      committeeNormal,
      hardForkInitiation,
      motionNoConfidence,
      securityRelevantParamVotingThreshold: securityRelevantParam
    };
  } finally {
    module._free(valuePtrPtr);
  }
};

/**
 * @hidden
 * Dereferences a pool voting thresholds pointer, freeing its memory.
 *
 * @param ptr - The pointer to the pool voting thresholds in WASM memory.
 * @throws {Error} If the pointer is null or dereferencing fails.
 */
export const derefPoolVotingThresholds = (ptr: number): void => {
  if (ptr === 0) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const ptrPtr = module._malloc(4);
  try {
    module.setValue(ptrPtr, ptr, '*');
    module.pool_voting_thresholds_unref(ptrPtr);
  } finally {
    module._free(ptrPtr);
  }
};
