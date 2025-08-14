/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS *******************************************************************/

import * as Cometa from '../../src';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

// eslint-disable-next-line max-statements
describe('Certificates', () => {
  let detector: MemoryLeakDetector;

  const KEY_HASH_CREDENTIAL = {
    hash: '00112233445566778899aabbccddeeff00112233445566778899aabb',
    type: Cometa.CredentialType.KeyHash
  };
  const SCRIPT_HASH_CREDENTIAL = {
    hash: 'ffeeddccbbaa99887766554433221100ffeeddccbbaa998877665544',
    type: Cometa.CredentialType.ScriptHash
  };
  const POOL_ID_HASH = '101112131415161718191a1b1c1d1e1f101112131415161718191a1b';
  const VRF_HASH = '201112131415161718191a1b1c1d1e1f201112131415161718191a1b1c1d1e1f';
  const ANCHOR = {
    dataHash: '301112131415161718191a1b1c1d1e1f301112131415161718191a1b1c1d1e1f',
    url: 'https://example.com/meta.json'
  };
  const DREP_CREDENTIAL = {
    hash: 'd0112233445566778899aabbccddeeff00112233445566778899aabb',
    type: Cometa.CredentialType.KeyHash
  };
  const VALID_POOL_PARAMS: Cometa.PoolParameters = {
    cost: 340000000n,
    id: '00112233445566778899aabbccddeeff00112233445566778899aabb',
    margin: 0.05,
    metadataJson: {
      dataHash: '20112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      url: 'https://example.com/pool.json'
    },
    owners: ['20112233445566778899aabbccddeeff00112233445566778899aabb'],
    pledge: 100000000000n,
    relays: [
      { ipv4: '127.0.0.1', port: 3001 },
      { ipv6: '0102:0304:0102:0304:0102:0304:0102:0304', port: 3002 },
      { hostname: 'relay.example.com', port: 3002 },
      { dnsName: 'relays.example.com' }
    ],
    rewardAccount: 'stake_test17rphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcljw6kf',
    vrf: '101112131415161718191a1b1c1d1e1f101112131415161718191a1b1c1d1e1f'
  };

  const ALL_CERT_SAMPLES: Cometa.Certificate[] = [
    { stakeCredential: KEY_HASH_CREDENTIAL, type: Cometa.CertificateType.StakeRegistration },
    { stakeCredential: KEY_HASH_CREDENTIAL, type: Cometa.CertificateType.StakeDeregistration },
    { poolId: POOL_ID_HASH, stakeCredential: KEY_HASH_CREDENTIAL, type: Cometa.CertificateType.StakeDelegation },
    { epoch: 120n, poolId: POOL_ID_HASH, type: Cometa.CertificateType.PoolRetirement },
    { deposit: 2000000n, stakeCredential: KEY_HASH_CREDENTIAL, type: Cometa.CertificateType.Registration },
    { deposit: 2000000n, stakeCredential: KEY_HASH_CREDENTIAL, type: Cometa.CertificateType.Unregistration },
    { dRep: DREP_CREDENTIAL, stakeCredential: KEY_HASH_CREDENTIAL, type: Cometa.CertificateType.VoteDelegation },
    {
      coldCredential: KEY_HASH_CREDENTIAL,
      hotCredential: SCRIPT_HASH_CREDENTIAL,
      type: Cometa.CertificateType.AuthCommitteeHot
    },
    { anchor: ANCHOR, coldCredential: KEY_HASH_CREDENTIAL, type: Cometa.CertificateType.ResignCommitteeCold },
    {
      anchor: ANCHOR,
      dRepCredential: DREP_CREDENTIAL,
      deposit: 500000000n,
      type: Cometa.CertificateType.DRepRegistration
    },
    { dRepCredential: DREP_CREDENTIAL, deposit: 500000000n, type: Cometa.CertificateType.DRepUnregistration },
    { anchor: ANCHOR, dRepCredential: DREP_CREDENTIAL, type: Cometa.CertificateType.UpdateDRep },
    { poolParameters: VALID_POOL_PARAMS, type: Cometa.CertificateType.PoolRegistration },
    {
      genesisDelegateHash: KEY_HASH_CREDENTIAL.hash,
      genesisHash: KEY_HASH_CREDENTIAL.hash,
      type: Cometa.CertificateType.GenesisKeyDelegation,
      vrfKeyHash: VRF_HASH
    },
    {
      kind: Cometa.MirCertificateKind.ToStakeCreds,
      pot: Cometa.MirCertificatePot.Reserves,
      rewards: { [KEY_HASH_CREDENTIAL.hash]: 100n },
      type: Cometa.CertificateType.MoveInstantaneousRewards
    },
    {
      kind: Cometa.MirCertificateKind.ToOtherPot,
      pot: Cometa.MirCertificatePot.Reserves,
      quantity: 100n,
      type: Cometa.CertificateType.MoveInstantaneousRewards
    },
    {
      dRep: DREP_CREDENTIAL,
      poolId: POOL_ID_HASH,
      stakeCredential: KEY_HASH_CREDENTIAL,
      type: Cometa.CertificateType.StakeVoteDelegation
    },
    {
      deposit: 500000000n,
      poolId: POOL_ID_HASH,
      stakeCredential: KEY_HASH_CREDENTIAL,
      type: Cometa.CertificateType.StakeRegistrationDelegation
    },
    {
      dRep: DREP_CREDENTIAL,
      deposit: 500000000n,
      stakeCredential: KEY_HASH_CREDENTIAL,
      type: Cometa.CertificateType.VoteRegistrationDelegation
    },
    {
      dRep: DREP_CREDENTIAL,
      deposit: 500000000n,
      poolId: POOL_ID_HASH,
      stakeCredential: KEY_HASH_CREDENTIAL,
      type: Cometa.CertificateType.StakeVoteRegistrationDelegation
    }
  ];

  beforeAll(async () => {
    await Cometa.ready();
  });

  beforeEach(() => {
    detector = new MemoryLeakDetector(Cometa.getModule());
    detector.start();
  });

  afterEach(() => {
    detector.stop();
    detector.detect();
  });

  /**
   * Generic test runner for a certificate type
   */
  const testCertificateType = (
    name: string,
    sample: Cometa.Certificate,
    writeFunc: (cert: any) => number,
    readFunc: (ptr: number) => Cometa.Certificate
  ) => {
    describe(name, () => {
      it('should correctly write and read using specific functions', () => {
        const ptr = writeFunc(sample);
        expect(ptr).not.toBe(0);
        const readValue = readFunc(ptr);
        expect(readValue).toEqual(sample);
        Cometa.unrefObject(ptr);
      });

      it('should correctly write and read using polymorphic functions', () => {
        const ptr = Cometa.writeCertificate(sample);
        expect(ptr).not.toBe(0);
        const readValue = Cometa.readCertificate(ptr);
        expect(readValue).toEqual(sample);
        Cometa.unrefObject(ptr);
      });
    });
  };

  testCertificateType(
    'StakeRegistration',
    ALL_CERT_SAMPLES[0],
    Cometa.writeStakeRegistrationCertificate,
    Cometa.readStakeRegistrationCertificate
  );

  testCertificateType(
    'StakeDeregistration',
    ALL_CERT_SAMPLES[1],
    Cometa.writeStakeDeregistrationCertificate,
    Cometa.readStakeDeregistrationCertificate
  );

  testCertificateType(
    'StakeDelegation',
    ALL_CERT_SAMPLES[2],
    Cometa.writeStakeDelegationCertificate,
    Cometa.readStakeDelegationCertificate
  );

  testCertificateType(
    'PoolRetirement',
    ALL_CERT_SAMPLES[3],
    Cometa.writePoolRetirementCertificate,
    Cometa.readPoolRetirementCertificate
  );

  testCertificateType(
    'Registration',
    ALL_CERT_SAMPLES[4],
    Cometa.writeRegistrationCertificate,
    Cometa.readRegistrationCertificate
  );

  testCertificateType(
    'Unregistration',
    ALL_CERT_SAMPLES[5],
    Cometa.writeUnregistrationCertificate,
    Cometa.readUnregistrationCertificate
  );

  testCertificateType(
    'VoteDelegation',
    ALL_CERT_SAMPLES[6],
    Cometa.writeVoteDelegationCertificate,
    Cometa.readVoteDelegationCertificate
  );

  testCertificateType(
    'AuthCommitteeHot',
    ALL_CERT_SAMPLES[7],
    Cometa.writeAuthCommitteeHotCertificate,
    Cometa.readAuthCommitteeHotCertificate
  );

  testCertificateType(
    'ResignCommitteeCold',
    ALL_CERT_SAMPLES[8],
    Cometa.writeResignCommitteeColdCertificate,
    Cometa.readResignCommitteeColdCertificate
  );

  testCertificateType(
    'DRepRegistration',
    ALL_CERT_SAMPLES[9],
    Cometa.writeDRepRegistrationCertificate,
    Cometa.readDRepRegistrationCertificate
  );

  testCertificateType(
    'DRepUnregistration',
    ALL_CERT_SAMPLES[10],
    Cometa.writeDRepUnregistrationCertificate,
    Cometa.readDRepUnregistrationCertificate
  );

  testCertificateType(
    'UpdateDRep',
    ALL_CERT_SAMPLES[11],
    Cometa.writeUpdateDRepCertificate,
    Cometa.readUpdateDRepCertificate
  );

  testCertificateType(
    'PoolRegistration',
    ALL_CERT_SAMPLES[12],
    Cometa.writePoolRegistrationCertificate,
    Cometa.readPoolRegistrationCertificate
  );

  testCertificateType(
    'GenesisKeyDelegation',
    ALL_CERT_SAMPLES[13],
    Cometa.writeGenesisKeyDelegationCertificate,
    Cometa.readGenesisKeyDelegationCertificate
  );

  testCertificateType(
    'MoveInstantaneousRewards - MirToStakeCreds',
    ALL_CERT_SAMPLES[14],
    Cometa.writeMoveInstantaneousRewardsCertificate,
    Cometa.readMoveInstantaneousRewardsCertificate
  );

  testCertificateType(
    'MoveInstantaneousRewards - MirToPot',
    ALL_CERT_SAMPLES[15],
    Cometa.writeMoveInstantaneousRewardsCertificate,
    Cometa.readMoveInstantaneousRewardsCertificate
  );

  testCertificateType(
    'StakeVoteDelegation',
    ALL_CERT_SAMPLES[16],
    Cometa.writeStakeVoteDelegationCertificate,
    Cometa.readStakeVoteDelegationCertificate
  );

  testCertificateType(
    'StakeRegistrationDelegation',
    ALL_CERT_SAMPLES[17],
    Cometa.writeStakeRegistrationDelegationCertificate,
    Cometa.readStakeRegistrationDelegationCertificate
  );

  testCertificateType(
    'VoteRegistrationDelegation',
    ALL_CERT_SAMPLES[18],
    Cometa.writeVoteRegistrationDelegationCertificate,
    Cometa.readVoteRegistrationDelegationCertificate
  );

  testCertificateType(
    'StakeVoteRegistrationDelegation',
    ALL_CERT_SAMPLES[19],
    Cometa.writeStakeVoteRegistrationDelegationCertificate,
    Cometa.readStakeVoteRegistrationDelegationCertificate
  );

  describe('Edge Cases', () => {
    it('readCertificate should throw for a null pointer', () => {
      expect(() => Cometa.readCertificate(0)).toThrow();
    });

    it('writeCertificate should throw for an unknown type', () => {
      const invalidCert = { type: 99 } as any;
      expect(() => Cometa.writeCertificate(invalidCert)).toThrow('Unsupported certificate type');
    });

    it('writeStakeDelegationCertificate should throw for invalid data', () => {
      const invalidCert = {
        poolId: 'this-is-not-a-valid-hash',
        stakeCredential: KEY_HASH_CREDENTIAL,
        type: Cometa.CertificateType.StakeDelegation
      } as Cometa.StakeDelegationCertificate;
      expect(() => Cometa.writeStakeDelegationCertificate(invalidCert)).toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory when processing any certificate type', () => {
      for (const cert of ALL_CERT_SAMPLES) {
        const ptr = Cometa.writeCertificate(cert);
        const readValue = Cometa.readCertificate(ptr);
        expect(readValue).toEqual(cert);
        Cometa.unrefObject(ptr);
      }
    });
  });
});
