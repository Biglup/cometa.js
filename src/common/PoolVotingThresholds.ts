import { UnitInterval } from './UnitInterval';

export interface PoolVotingThresholds {
  motionNoConfidence: UnitInterval;
  committeeNormal: UnitInterval;
  committeeNoConfidence: UnitInterval;
  hardForkInitiation: UnitInterval;
  securityRelevantParamVotingThreshold: UnitInterval;
}
