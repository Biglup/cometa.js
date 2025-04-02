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

describe('ByronAddress', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('fromCredentials', () => {
    it('can build the correct ByronAddress instance with PubKey type', () => {
      const address = Cometa.ByronAddress.fromCredentials(
        '9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e',
        {
          derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
          magic: 1_097_911_063
        },
        Cometa.ByronAddressType.PubKey
      );
      expect(address.toAddress().toString()).toEqual(cip19TestVectors.byronTestnetDaedalus);
    });

    it('can build the correct ByronAddress instance with Script type', () => {
      const address = Cometa.ByronAddress.fromCredentials(
        '9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e',
        {
          derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
          magic: 1_097_911_063
        },
        Cometa.ByronAddressType.Script
      );
      expect(address.getType()).toEqual(Cometa.ByronAddressType.Script);
      expect(address.getRoot()).toEqual('9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e');
      expect(address.getAttributes()).toEqual({
        derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
        magic: 1_097_911_063
      });
    });

    it('can build the correct ByronAddress instance with Redeem type', () => {
      const address = Cometa.ByronAddress.fromCredentials(
        '9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e',
        {
          derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
          magic: 1_097_911_063
        },
        Cometa.ByronAddressType.Redeem
      );
      expect(address.getType()).toEqual(Cometa.ByronAddressType.Redeem);
      expect(address.getRoot()).toEqual('9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e');
      expect(address.getAttributes()).toEqual({
        derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
        magic: 1_097_911_063
      });
    });
  });

  describe('fromAddress', () => {
    it('can create a ByronAddress from a general Address', () => {
      const generalAddress = Cometa.Address.fromString(cip19TestVectors.byronTestnetDaedalus);
      const byronAddress = Cometa.ByronAddress.fromAddress(generalAddress);
      expect(byronAddress.toAddress().toString()).toEqual(cip19TestVectors.byronTestnetDaedalus);
    });

    it('throws an error when trying to create a ByronAddress from a non-Byron Address', () => {
      const enterpriseAddress = Cometa.Address.fromString(cip19TestVectors.enterpriseKey);
      expect(() => {
        Cometa.ByronAddress.fromAddress(enterpriseAddress);
      }).toThrow();
    });
  });

  describe('fromBytes', () => {
    it('can create a ByronAddress from raw bytes', () => {
      const address = Cometa.ByronAddress.fromCredentials(
        '9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e',
        {
          derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
          magic: 1_097_911_063
        },
        Cometa.ByronAddressType.PubKey
      );
      const bytes = address.getBytes();
      const reconstructedAddress = Cometa.ByronAddress.fromBytes(bytes);
      expect(reconstructedAddress.toAddress().toString()).toEqual(cip19TestVectors.byronTestnetDaedalus);
    });
  });

  describe('fromBase58', () => {
    it('can create a ByronAddress from a Base58 string', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronTestnetDaedalus);
      expect(address.toAddress().toString()).toEqual(cip19TestVectors.byronTestnetDaedalus);
    });

    it('throws an error when trying to create a ByronAddress from an invalid Base58 string', () => {
      expect(() => {
        Cometa.ByronAddress.fromBase58('invalid_base58_string');
      }).toThrow();
    });
  });

  describe('toAddress', () => {
    it('can convert a ByronAddress to a general Address', () => {
      const byronAddress = Cometa.ByronAddress.fromCredentials(
        '9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e',
        {
          derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
          magic: 1_097_911_063
        },
        Cometa.ByronAddressType.PubKey
      );
      const address = byronAddress.toAddress();
      expect(address.toString()).toEqual(cip19TestVectors.byronTestnetDaedalus);
    });
  });

  describe('getAttributes', () => {
    it('returns the correct attributes for a testnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronTestnetDaedalus);
      const attributes = address.getAttributes();
      expect(attributes).toEqual({
        derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
        magic: 1_097_911_063
      });
    });

    it('returns the correct attributes for a mainnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronMainnetYoroi);
      const attributes = address.getAttributes();
      // This address payload has no attributes. It was a Yoroi's address on MainNet which follows a
      // BIP-44 derivation scheme and therefore, does not require any attributes.
      expect(attributes).toEqual({ derivationPath: '', magic: -1 });
    });
  });

  describe('getType', () => {
    it('returns the correct type for a PubKey Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronTestnetDaedalus);
      expect(address.getType()).toEqual(Cometa.ByronAddressType.PubKey);
    });

    it('returns the correct type for a mainnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronMainnetYoroi);
      expect(address.getType()).toEqual(Cometa.ByronAddressType.PubKey);
    });
  });

  describe('getRoot', () => {
    it('returns the correct root hash for a testnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronTestnetDaedalus);
      expect(address.getRoot()).toEqual('9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e');
    });

    it('returns the correct root hash for a mainnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronMainnetYoroi);
      expect(address.getRoot()).toEqual('ba970ad36654d8dd8f74274b733452ddeab9a62a397746be3c42ccdd');
    });
  });

  describe('getBytes', () => {
    it('returns the correct byte representation for a testnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronTestnetDaedalus);
      const bytes = address.getBytes();
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toEqual(
        '82d818584983581c9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450ea201581e581c9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb697702451a4170cb17001a6979126c'
      );
    });

    it('returns the correct byte representation for a mainnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronMainnetYoroi);
      const bytes = address.getBytes();
      const hex = Buffer.from(bytes).toString('hex');
      expect(hex).toEqual('82d818582183581cba970ad36654d8dd8f74274b733452ddeab9a62a397746be3c42ccdda0001a9026da5b');
    });
  });

  describe('toBase58', () => {
    it('returns the correct Base58 string representation for a testnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronTestnetDaedalus);
      expect(address.toBase58()).toEqual(cip19TestVectors.byronTestnetDaedalus);
    });

    it('returns the correct Base58 string representation for a mainnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronMainnetYoroi);
      expect(address.toBase58()).toEqual(cip19TestVectors.byronMainnetYoroi);
    });
  });

  describe('getNetworkId', () => {
    it('returns the correct network ID for a testnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronTestnetDaedalus);
      expect(address.getNetworkId()).toEqual(Cometa.NetworkId.Testnet);
    });

    it('returns the correct network ID for a mainnet Byron address', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronMainnetYoroi);
      expect(address.getNetworkId()).toEqual(Cometa.NetworkId.Mainnet);
    });
  });

  describe('refCount', () => {
    it('returns a valid reference count', () => {
      const address = Cometa.ByronAddress.fromBase58(cip19TestVectors.byronTestnetDaedalus);
      const refCount = address.refCount();
      expect(typeof refCount).toBe('number');
      expect(refCount).toBeGreaterThanOrEqual(0);
    });
  });
});
