/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may not use this file except in compliance with the License.
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
describe('Governance Collections', () => {
  let detector: MemoryLeakDetector;

  const CRED_1: Cometa.Credential = {
    hash: '00112233445566778899aabbccddeeff00112233445566778899aabb',
    type: Cometa.CredentialType.KeyHash
  };
  const CRED_2: Cometa.Credential = {
    hash: 'ffeeddccbbaa99887766554433221100ffeeddccbbaa998877665544',
    type: Cometa.CredentialType.ScriptHash
  };

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

  describe('CredentialSet', () => {
    const credentialSet: Cometa.CredentialSet = [CRED_1, CRED_2];

    it('should correctly write and read a set with multiple entries', () => {
      const ptr = Cometa.writeCredentialSet(credentialSet);
      try {
        const readSet = Cometa.readCredentialSet(ptr);
        expect(readSet).toEqual(credentialSet);
      } finally {
        Cometa.unrefObject(ptr);
      }
    });

    it('should correctly handle an empty set', () => {
      const ptr = Cometa.writeCredentialSet([]);
      try {
        const readSet = Cometa.readCredentialSet(ptr);
        expect(readSet).toEqual([]);
      } finally {
        Cometa.unrefObject(ptr);
      }
    });
  });

  describe('CommitteeMembersMap', () => {
    const committeeMembers: Cometa.CommitteeMembers = [
      { coldCredential: CRED_1, epoch: 120n },
      { coldCredential: CRED_2, epoch: 125n }
    ];

    it('should correctly write and read a map with multiple entries', () => {
      const ptr = Cometa.writeCommitteeMembersMap(committeeMembers);
      try {
        const readMap = Cometa.readCommitteeMembersMap(ptr);
        expect(readMap).toEqual(committeeMembers);
      } finally {
        Cometa.unrefObject(ptr);
      }
    });

    it('should correctly handle an empty map', () => {
      const ptr = Cometa.writeCommitteeMembersMap([]);
      try {
        const readMap = Cometa.readCommitteeMembersMap(ptr);
        expect(readMap).toEqual([]);
      } finally {
        Cometa.unrefObject(ptr);
      }
    });

    it('should correctly handle large bigint epoch values', () => {
      const largeEpochMap: Cometa.CommitteeMembers = [{ coldCredential: CRED_1, epoch: 1844674407370955161n }];
      const ptr = Cometa.writeCommitteeMembersMap(largeEpochMap);
      try {
        const readMap = Cometa.readCommitteeMembersMap(ptr);
        expect(readMap).toEqual(largeEpochMap);
      } finally {
        Cometa.unrefObject(ptr);
      }
    });
  });
});
