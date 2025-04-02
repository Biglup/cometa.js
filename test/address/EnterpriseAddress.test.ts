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

describe('EnterpriseAddress', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('fromCredentials', () => {
    it('can build the correct EnterpriseAddress instance with key hash type', () => {
      const address = Cometa.EnterpriseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.enterpriseKey);
    });

    it('can build the correct EnterpriseAddress instance with script hash type', () => {
      const address = Cometa.EnterpriseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.SCRIPT_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.enterpriseScript);
    });

    it('can build the correct EnterpriseAddress instance for testnet with key hash type', () => {
      const address = Cometa.EnterpriseAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.testnetEnterpriseKey);
    });

    it('can build the correct EnterpriseAddress instance for testnet with script hash type', () => {
      const address = Cometa.EnterpriseAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.SCRIPT_CREDENTIAL
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.testnetEnterpriseScript);
    });
  });

  describe('fromAddress', () => {
    it('can create an EnterpriseAddress from a general Address', () => {
      const generalAddress = Cometa.Address.fromString(cip19TestVectors.enterpriseKey);
      const enterpriseAddress = Cometa.EnterpriseAddress.fromAddress(generalAddress);
      expect(enterpriseAddress.toAddress().toString()).toBe(cip19TestVectors.enterpriseKey);
    });

    it('throws an error when trying to create an EnterpriseAddress from a non-enterprise Address', () => {
      const baseAddress = Cometa.Address.fromString(cip19TestVectors.basePaymentKeyStakeKey);
      expect(() => {
        Cometa.EnterpriseAddress.fromAddress(baseAddress);
      }).toThrow();
    });
  });

  describe('fromBytes', () => {
    it('can create an EnterpriseAddress from raw bytes', () => {
      const address = Cometa.EnterpriseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL
      );
      const bytes = address.toBytes();
      const reconstructedAddress = Cometa.EnterpriseAddress.fromBytes(bytes);
      expect(reconstructedAddress.toAddress().toString()).toBe(cip19TestVectors.enterpriseKey);
    });

    it('can create a testnet EnterpriseAddress from raw bytes', () => {
      const address = Cometa.EnterpriseAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL
      );
      const bytes = address.toBytes();
      const reconstructedAddress = Cometa.EnterpriseAddress.fromBytes(bytes);
      expect(reconstructedAddress.toAddress().toString()).toBe(cip19TestVectors.testnetEnterpriseKey);
    });
  });

  describe('fromBech32', () => {
    it('can create an EnterpriseAddress from a Bech32 string', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.enterpriseKey);
      expect(address.toAddress().toString()).toBe(cip19TestVectors.enterpriseKey);
    });

    it('can create a testnet EnterpriseAddress from a Bech32 string', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.testnetEnterpriseKey);
      expect(address.toAddress().toString()).toBe(cip19TestVectors.testnetEnterpriseKey);
    });

    it('throws an error when trying to create an EnterpriseAddress from an invalid Bech32 string', () => {
      expect(() => {
        Cometa.EnterpriseAddress.fromBech32('invalid_bech32_string');
      }).toThrow();
    });
  });

  describe('toAddress', () => {
    it('can convert an EnterpriseAddress to a general Address', () => {
      const enterpriseAddress = Cometa.EnterpriseAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL
      );
      const address = enterpriseAddress.toAddress();
      expect(address.toString()).toBe(cip19TestVectors.enterpriseKey);
    });

    it('can convert a testnet EnterpriseAddress to a general Address', () => {
      const enterpriseAddress = Cometa.EnterpriseAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL
      );
      const address = enterpriseAddress.toAddress();
      expect(address.toString()).toBe(cip19TestVectors.testnetEnterpriseKey);
    });
  });

  describe('getCredential', () => {
    it('returns the correct payment credential for a key hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.enterpriseKey);
      const credential = address.getCredential();
      expect(credential).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    });

    it('returns the correct payment credential for a script hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.enterpriseScript);
      const credential = address.getCredential();
      expect(credential).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    });

    it('returns the correct payment credential for a testnet key hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.testnetEnterpriseKey);
      const credential = address.getCredential();
      expect(credential).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    });

    it('returns the correct payment credential for a testnet script hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.testnetEnterpriseScript);
      const credential = address.getCredential();
      expect(credential).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    });
  });

  describe('getNetworkId', () => {
    it('returns the correct network ID for a mainnet address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.enterpriseKey);
      expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    });

    it('returns the correct network ID for a testnet address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.testnetEnterpriseKey);
      expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    });
  });

  describe('toBytes', () => {
    it('returns the correct byte representation for a mainnet key hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.enterpriseKey);
      const bytes = address.toBytes();
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('619493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e');
    });

    it('returns the correct byte representation for a mainnet script hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.enterpriseScript);
      const bytes = address.toBytes();
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('71c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f');
    });

    it('returns the correct byte representation for a testnet key hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.testnetEnterpriseKey);
      const bytes = address.toBytes();
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('609493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e');
    });

    it('returns the correct byte representation for a testnet script hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.testnetEnterpriseScript);
      const bytes = address.toBytes();
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('70c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f');
    });
  });

  describe('toBech32', () => {
    it('returns the correct Bech32 string representation for a mainnet key hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.enterpriseKey);
      expect(address.toBech32()).toBe(cip19TestVectors.enterpriseKey);
    });

    it('returns the correct Bech32 string representation for a mainnet script hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.enterpriseScript);
      expect(address.toBech32()).toBe(cip19TestVectors.enterpriseScript);
    });

    it('returns the correct Bech32 string representation for a testnet key hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.testnetEnterpriseKey);
      expect(address.toBech32()).toBe(cip19TestVectors.testnetEnterpriseKey);
    });

    it('returns the correct Bech32 string representation for a testnet script hash address', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.testnetEnterpriseScript);
      expect(address.toBech32()).toBe(cip19TestVectors.testnetEnterpriseScript);
    });
  });

  describe('refCount', () => {
    it('returns a valid reference count', () => {
      const address = Cometa.EnterpriseAddress.fromBech32(cip19TestVectors.enterpriseKey);
      const refCount = address.refCount();
      expect(typeof refCount).toBe('number');
      expect(refCount).toBeGreaterThanOrEqual(0);
    });
  });
});
