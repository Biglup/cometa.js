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

describe('PointerAddress', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('fromCredentials', () => {
    it('can build the correct PointerAddress instance with key hash type', () => {
      const address = Cometa.PointerAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.POINTER
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.pointerKey);
    });

    it('can build the correct PointerAddress instance with script hash type', () => {
      const address = Cometa.PointerAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.SCRIPT_CREDENTIAL,
        cip19TestVectors.POINTER
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.pointerScript);
    });

    it('can build the correct PointerAddress instance for testnet with key hash type', () => {
      const address = Cometa.PointerAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.POINTER
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.testnetPointerKey);
    });

    it('can build the correct PointerAddress instance for testnet with script hash type', () => {
      const address = Cometa.PointerAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.SCRIPT_CREDENTIAL,
        cip19TestVectors.POINTER
      );
      expect(address.toAddress().toString()).toBe(cip19TestVectors.testnetPointerScript);
    });
  });

  describe('fromAddress', () => {
    it('can create a PointerAddress from a general Address', () => {
      const generalAddress = Cometa.Address.fromString(cip19TestVectors.pointerKey);
      const pointerAddress = Cometa.PointerAddress.fromAddress(generalAddress);
      expect(pointerAddress.toAddress().toString()).toBe(cip19TestVectors.pointerKey);
    });

    it('throws an error when trying to create a PointerAddress from a non-pointer Address', () => {
      const baseAddress = Cometa.Address.fromString(cip19TestVectors.basePaymentKeyStakeKey);
      expect(() => {
        Cometa.PointerAddress.fromAddress(baseAddress);
      }).toThrow();
    });
  });

  describe('fromBytes', () => {
    it('can create a PointerAddress from raw bytes', () => {
      const address = Cometa.PointerAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.POINTER
      );
      const bytes = address.toBytes();
      const reconstructedAddress = Cometa.PointerAddress.fromBytes(bytes);
      expect(reconstructedAddress.toAddress().toString()).toBe(cip19TestVectors.pointerKey);
    });

    it('can create a testnet PointerAddress from raw bytes', () => {
      const address = Cometa.PointerAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.POINTER
      );
      const bytes = address.toBytes();
      const reconstructedAddress = Cometa.PointerAddress.fromBytes(bytes);
      expect(reconstructedAddress.toAddress().toString()).toBe(cip19TestVectors.testnetPointerKey);
    });
  });

  describe('fromBech32', () => {
    it('can create a PointerAddress from a Bech32 string', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerKey);
      expect(address.toAddress().toString()).toBe(cip19TestVectors.pointerKey);
    });

    it('can create a testnet PointerAddress from a Bech32 string', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.testnetPointerKey);
      expect(address.toAddress().toString()).toBe(cip19TestVectors.testnetPointerKey);
    });

    it('throws an error when trying to create a PointerAddress from an invalid Bech32 string', () => {
      expect(() => {
        Cometa.PointerAddress.fromBech32('invalid_bech32_string');
      }).toThrow();
    });
  });

  describe('toAddress', () => {
    it('can convert a PointerAddress to a general Address', () => {
      const pointerAddress = Cometa.PointerAddress.fromCredentials(
        Cometa.NetworkId.Mainnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.POINTER
      );
      const address = pointerAddress.toAddress();
      expect(address.toString()).toBe(cip19TestVectors.pointerKey);
    });

    it('can convert a testnet PointerAddress to a general Address', () => {
      const pointerAddress = Cometa.PointerAddress.fromCredentials(
        Cometa.NetworkId.Testnet,
        cip19TestVectors.KEY_PAYMENT_CREDENTIAL,
        cip19TestVectors.POINTER
      );
      const address = pointerAddress.toAddress();
      expect(address.toString()).toBe(cip19TestVectors.testnetPointerKey);
    });
  });

  describe('getPaymentCredential', () => {
    it('returns the correct payment credential for a key hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerKey);
      const credential = address.getPaymentCredential();
      expect(credential).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    });

    it('returns the correct payment credential for a script hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerScript);
      const credential = address.getPaymentCredential();
      expect(credential).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    });

    it('returns the correct payment credential for a testnet key hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.testnetPointerKey);
      const credential = address.getPaymentCredential();
      expect(credential).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    });

    it('returns the correct payment credential for a testnet script hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.testnetPointerScript);
      const credential = address.getPaymentCredential();
      expect(credential).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    });
  });

  describe('getStakePointer', () => {
    it('returns the correct stake pointer for a mainnet address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerKey);
      const stakePointer = address.getStakePointer();
      expect(stakePointer).toEqual(cip19TestVectors.POINTER);
    });

    it('returns the correct stake pointer for a testnet address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.testnetPointerKey);
      const stakePointer = address.getStakePointer();
      expect(stakePointer).toEqual(cip19TestVectors.POINTER);
    });
  });

  describe('getNetworkId', () => {
    it('returns the correct network ID for a mainnet address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerKey);
      expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    });

    it('returns the correct network ID for a testnet address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.testnetPointerKey);
      expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    });
  });

  describe('toBytes', () => {
    it('returns the correct byte representation for a mainnet key hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerKey);
      const bytes = address.toBytes();
      // Convert bytes to hex for comparison
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('419493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e8198bd431b03');
    });

    it('returns the correct byte representation for a mainnet script hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerScript);
      const bytes = address.toBytes();
      // Convert bytes to hex for comparison
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('51c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f8198bd431b03');
    });

    it('returns the correct byte representation for a testnet key hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.testnetPointerKey);
      const bytes = address.toBytes();
      // Convert bytes to hex for comparison
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('409493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e8198bd431b03');
    });

    it('returns the correct byte representation for a testnet script hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.testnetPointerScript);
      const bytes = address.toBytes();
      // Convert bytes to hex for comparison
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toBe('50c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f8198bd431b03');
    });
  });

  describe('toBech32', () => {
    it('returns the correct Bech32 string representation for a mainnet key hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerKey);
      expect(address.toBech32()).toBe(cip19TestVectors.pointerKey);
    });

    it('returns the correct Bech32 string representation for a mainnet script hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerScript);
      expect(address.toBech32()).toBe(cip19TestVectors.pointerScript);
    });

    it('returns the correct Bech32 string representation for a testnet key hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.testnetPointerKey);
      expect(address.toBech32()).toBe(cip19TestVectors.testnetPointerKey);
    });

    it('returns the correct Bech32 string representation for a testnet script hash address', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.testnetPointerScript);
      expect(address.toBech32()).toBe(cip19TestVectors.testnetPointerScript);
    });
  });

  describe('refCount', () => {
    it('returns a valid reference count', () => {
      const address = Cometa.PointerAddress.fromBech32(cip19TestVectors.pointerKey);
      const refCount = address.refCount();
      expect(typeof refCount).toBe('number');
      expect(refCount).toBeGreaterThanOrEqual(0);
    });
  });
});
