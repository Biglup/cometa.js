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

/* IMPORTS ********************************************************************/

import * as Cometa from '../../dist/cjs';
import * as cip19TestVectors from '../vectors/Cip19TestVectors';

/* TESTS **********************************************************************/

describe('RewardAddress', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('fromCredentials', () => {
    it('can build the correct RewardAddress instance with key hash type', () => {
      const address = Cometa.RewardAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.rewardKey);
    });

    it('can build the correct RewardAddress instance with script hash type', () => {
      const address = Cometa.RewardAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.SCRIPT_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.rewardScript);
    });

    it('can build the correct RewardAddress instance for testnet with key hash type', () => {
      const address = Cometa.RewardAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.testnetRewardKey);
    });

    it('can build the correct RewardAddress instance for testnet with script hash type', () => {
      const address = Cometa.RewardAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.SCRIPT_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.testnetRewardScript);
    });
  });

  describe('fromAddress', () => {
    it('can create a RewardAddress from a general Address', () => {
      const generalAddress = Cometa.Address.fromString(cip19TestVectors.rewardKey);
      const rewardAddress = Cometa.RewardAddress.fromAddress(generalAddress);
      expect(rewardAddress.toAddress().toString()).toBe(cip19TestVectors.rewardKey);
    });

    it('throws an error when trying to create a RewardAddress from a non-reward Address', () => {
      const baseAddress = Cometa.Address.fromString(cip19TestVectors.basePaymentKeyStakeKey);
      expect(() => {
        Cometa.RewardAddress.fromAddress(baseAddress);
      }).toThrow();
    });
  });

  describe('fromBytes', () => {
    it('can create a RewardAddress from raw bytes', () => {
      const address = Cometa.RewardAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      const bytes = address.toBytes();
      const reconstructedAddress = Cometa.RewardAddress.fromBytes(bytes);
      expect(reconstructedAddress.toAddress().toString()).toBe(cip19TestVectors.rewardKey);
    });

    it('can create a testnet RewardAddress from raw bytes', () => {
      const address = Cometa.RewardAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      const bytes = address.toBytes();
      const reconstructedAddress = Cometa.RewardAddress.fromBytes(bytes);
      expect(reconstructedAddress.toAddress().toString()).toBe(cip19TestVectors.testnetRewardKey);
    });
  });

  describe('fromBech32', () => {
    it('can create a RewardAddress from a Bech32 string', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.rewardKey);
      expect(address.toAddress().toString()).toBe(cip19TestVectors.rewardKey);
    });

    it('can create a testnet RewardAddress from a Bech32 string', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.testnetRewardKey);
      expect(address.toAddress().toString()).toBe(cip19TestVectors.testnetRewardKey);
    });

    it('throws an error when trying to create a RewardAddress from an invalid Bech32 string', () => {
      expect(() => {
        Cometa.RewardAddress.fromBech32('invalid_bech32_string');
      }).toThrow();
    });
  });

  describe('toAddress', () => {
    it('can convert a RewardAddress to a general Address', () => {
      const rewardAddress = Cometa.RewardAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      const address = rewardAddress.toAddress();
      expect(address.toString()).toBe(cip19TestVectors.rewardKey);
    });

    it('can convert a testnet RewardAddress to a general Address', () => {
      const rewardAddress = Cometa.RewardAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      const address = rewardAddress.toAddress();
      expect(address.toString()).toBe(cip19TestVectors.testnetRewardKey);
    });
  });

  describe('getCredential', () => {
    it('returns the correct stake credential for a key hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.rewardKey);
      const credential = address.getCredential();
      expect(credential).toEqual(cip19TestVectors.KEY_STAKE_CREDENTIAL);
    });

    it('returns the correct stake credential for a script hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.rewardScript);
      const credential = address.getCredential();
      expect(credential).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    });

    it('returns the correct stake credential for a testnet key hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.testnetRewardKey);
      const credential = address.getCredential();
      expect(credential).toEqual(cip19TestVectors.KEY_STAKE_CREDENTIAL);
    });

    it('returns the correct stake credential for a testnet script hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.testnetRewardScript);
      const credential = address.getCredential();
      expect(credential).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    });
  });

  describe('getNetworkId', () => {
    it('returns the correct network ID for a mainnet address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.rewardKey);
      expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    });

    it('returns the correct network ID for a testnet address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.testnetRewardKey);
      expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    });
  });

  describe('toBytes', () => {
    it('returns the correct byte representation for a mainnet key hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.rewardKey);
      const bytes = address.toBytes();
      // Convert bytes to hex for comparison
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('e1337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251');
    });

    it('returns the correct byte representation for a mainnet script hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.rewardScript);
      const bytes = address.toBytes();
      // Convert bytes to hex for comparison
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('f1c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f');
    });

    it('returns the correct byte representation for a testnet key hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.testnetRewardKey);
      const bytes = address.toBytes();
      // Convert bytes to hex for comparison
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('e0337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251');
    });

    it('returns the correct byte representation for a testnet script hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.testnetRewardScript);
      const bytes = address.toBytes();
      // Convert bytes to hex for comparison
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('f0c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f');
    });
  });

  describe('toBech32', () => {
    it('returns the correct Bech32 string representation for a mainnet key hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.rewardKey);
      expect(address.toBech32()).toBe(cip19TestVectors.rewardKey);
    });

    it('returns the correct Bech32 string representation for a mainnet script hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.rewardScript);
      expect(address.toBech32()).toBe(cip19TestVectors.rewardScript);
    });

    it('returns the correct Bech32 string representation for a testnet key hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.testnetRewardKey);
      expect(address.toBech32()).toBe(cip19TestVectors.testnetRewardKey);
    });

    it('returns the correct Bech32 string representation for a testnet script hash address', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.testnetRewardScript);
      expect(address.toBech32()).toBe(cip19TestVectors.testnetRewardScript);
    });
  });

  describe('refCount', () => {
    it('returns a valid reference count', () => {
      const address = Cometa.RewardAddress.fromBech32(cip19TestVectors.rewardKey);
      const refCount = address.refCount();
      expect(typeof refCount).toBe('number');
      expect(refCount).toBeGreaterThanOrEqual(0);
    });
  });
});
