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

describe('BaseAddress', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('fromCredentials', () => {
    it('can build the correct BaseAddress instance when given a key hash', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.basePaymentKeyStakeKey);
    });

    it('can build the correct BaseAddress instance when given a script hash', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.SCRIPT_CREDENTIAL,
        cip19TestVectors.SCRIPT_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.basePaymentScriptStakeScript);
    });

    it('can build the correct BaseAddress instance with mixed credential types', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.SCRIPT_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.basePaymentKeyStakeScript);
    });
  });

  describe('fromAddress', () => {
    it('can create a BaseAddress from a general Address', () => {
      const generalAddress = Cometa.Address.fromString(cip19TestVectors.basePaymentKeyStakeKey);
      const baseAddress = Cometa.BaseAddress.fromAddress(generalAddress);
      expect(baseAddress.toAddress().toString()).toBe(cip19TestVectors.basePaymentKeyStakeKey);
    });

    it('throws an error when trying to create a BaseAddress from a non-base Address', () => {
      const enterpriseAddress = Cometa.Address.fromString(cip19TestVectors.enterpriseKey);
      expect(() => {
        Cometa.BaseAddress.fromAddress(enterpriseAddress);
      }).toThrow();
    });
  });

  describe('fromBytes', () => {
    it('can create a BaseAddress from raw bytes', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      const bytes = address.toBytes();
      const reconstructedAddress = Cometa.BaseAddress.fromBytes(bytes);
      expect(reconstructedAddress.toAddress().toString()).toBe(cip19TestVectors.basePaymentKeyStakeKey);
    });
  });

  describe('fromBech32', () => {
    it('can create a BaseAddress from a Bech32 string', () => {
      const address = Cometa.BaseAddress.fromBech32(cip19TestVectors.basePaymentKeyStakeKey);
      expect(address.toAddress().toString()).toBe(cip19TestVectors.basePaymentKeyStakeKey);
    });

    it('throws an error when trying to create a BaseAddress from an invalid Bech32 string', () => {
      expect(() => {
        Cometa.BaseAddress.fromBech32('invalid_bech32_string');
      }).toThrow();
    });
  });

  describe('toAddress', () => {
    it('can convert a BaseAddress to a general Address', () => {
      const baseAddress = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      const address = baseAddress.toAddress();
      expect(address.toString()).toBe(cip19TestVectors.basePaymentKeyStakeKey);
    });
  });

  describe('getPaymentCredential', () => {
    it('returns the correct payment credential', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      const paymentCredential = address.getPaymentCredential();
      expect(paymentCredential).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    });
  });

  describe('getStakeCredential', () => {
    it('returns the correct stake credential', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      const stakeCredential = address.getStakeCredential();
      expect(stakeCredential).toEqual(cip19TestVectors.KEY_STAKE_CREDENTIAL);
    });
  });

  describe('getNetworkId', () => {
    it('returns the correct network ID for mainnet', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    });

    it('returns the correct network ID for testnet', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    });
  });

  describe('toBytes', () => {
    it('returns the correct byte representation', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      expect(Cometa.BaseAddress.fromBytes(address.toBytes()).toBech32()).toBe(cip19TestVectors.basePaymentKeyStakeKey);
    });
  });

  describe('toBech32', () => {
    it('returns the correct Bech32 string representation', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      expect(address.toBech32()).toBe(cip19TestVectors.basePaymentKeyStakeKey);
    });
  });

  describe('refCount', () => {
    it('returns a valid reference count', () => {
      const address = Cometa.BaseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.KEY_STAKE_CREDENTIAL
      );
      const refCount = address.refCount();
      expect(typeof refCount).toBe('number');
      expect(refCount).toBeGreaterThanOrEqual(0);
    });
  });
});
