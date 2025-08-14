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

describe('Voting Marshalling', () => {
  let detector: MemoryLeakDetector;

  const VALID_KEY_HASH = '00112233445566778899aabbccddeeff00112233445566778899aabb';
  const VALID_TX_ID = 'f1993466150257c329b2e2f3b92f0945ac493721e7841981a78e7a60fb523f03';
  const VALID_ANCHOR: Cometa.Anchor = {
    dataHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    url: 'https://example.com/vote-metadata'
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

  describe('Voter', () => {
    const voter: Cometa.Voter = {
      credential: {
        hash: VALID_KEY_HASH,
        type: Cometa.CredentialType.KeyHash
      },
      type: Cometa.VoterType.DRepKeyHash
    };

    it('should correctly write and read a valid Voter object', () => {
      const ptr = Cometa.writeVoter(voter);
      expect(ptr).not.toBe(0);

      const readValue = Cometa.readVoter(ptr);
      expect(readValue).toEqual(voter);

      Cometa.unrefObject(ptr);
    });

    it('readVoter should throw an error for a null pointer', () => {
      expect(() => Cometa.readVoter(0)).toThrow('Argument is a NULL pointer. Failed to get voter type');
    });

    it('writeVoter should throw an error for an invalid credential', () => {
      const invalidVoter = {
        ...voter,
        credential: { hash: 'invalid-hash', type: Cometa.CredentialType.KeyHash }
      };
      expect(() => Cometa.writeVoter(invalidVoter)).toThrow();
    });
  });

  describe('GovernanceActionId', () => {
    const govActionId: Cometa.GovernanceActionId = {
      actionIndex: 12,
      id: VALID_TX_ID
    };

    it('should correctly write and read a valid GovernanceActionId object', () => {
      const ptr = Cometa.writeGovernanceActionId(govActionId);
      expect(ptr).not.toBe(0);

      const readValue = Cometa.readGovernanceActionId(ptr);
      expect(readValue).toEqual(govActionId);

      Cometa.unrefObject(ptr);
    });

    it('readGovernanceActionId should throw an error for a null pointer', () => {
      expect(() => Cometa.readGovernanceActionId(0)).toThrow('Pointer is null');
    });

    it('writeGovernanceActionId should throw an error for an invalid transaction ID', () => {
      const invalidGovActionId = { ...govActionId, id: 'invalid-tx-id' };
      expect(() => Cometa.writeGovernanceActionId(invalidGovActionId)).toThrow();
    });
  });

  describe('VotingProcedure', () => {
    it('should correctly write and read a VotingProcedure with an anchor', () => {
      const votingProcedure: Cometa.VotingProcedure = {
        anchor: VALID_ANCHOR,
        vote: Cometa.Vote.yes
      };

      const ptr = Cometa.writeVotingProcedure(votingProcedure);
      expect(ptr).not.toBe(0);

      const readValue = Cometa.readVotingProcedure(ptr);
      expect(readValue).toEqual(votingProcedure);

      Cometa.unrefObject(ptr);
    });

    it('should correctly write and read a VotingProcedure without an anchor', () => {
      const votingProcedure: Cometa.VotingProcedure = {
        anchor: null,
        vote: Cometa.Vote.abstain
      };

      const ptr = Cometa.writeVotingProcedure(votingProcedure);
      expect(ptr).not.toBe(0);

      const readValue = Cometa.readVotingProcedure(ptr);
      expect(readValue).toEqual(votingProcedure);

      Cometa.unrefObject(ptr);
    });

    it('readVotingProcedure should throw an error for a null pointer', () => {
      expect(() => Cometa.readVotingProcedure(0)).toThrow('Pointer is null');
    });
  });
});
