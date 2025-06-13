import { UnitInterval } from './UnitInterval';

export interface DelegateRepresentativeThresholds {
  motionNoConfidence: UnitInterval;
  committeeNormal: UnitInterval;
  committeeNoConfidence: UnitInterval;
  hardForkInitiation: UnitInterval;
  updateConstitution: UnitInterval;
  ppNetworkGroup: UnitInterval;
  ppEconomicGroup: UnitInterval;
  ppTechnicalGroup: UnitInterval;
  ppGovernanceGroup: UnitInterval;
  treasuryWithdrawal: UnitInterval;
}
