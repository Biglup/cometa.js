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

/* TEST VECTORS **************************************************************/

const hexToBytes = (hex: string): Uint8Array =>
  new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)));

const PASSWORD = new TextEncoder().encode('password');
const WRONG_PASSWORD = new TextEncoder().encode('wrong-password');
const ENTROPY_BYTES = hexToBytes('387183ffe785d467ab662c01acbcf79400e2430dde6c9aee74cf0602de0d82e8');
const ED25519_PRIVATE_KEY_HEX =
  'f04462421183d227bbc0fa60799ef338169c05eed7aa6aac19bc4db20557df51e154255decce80ae4ab8a61af6abde05e7fbc049861cc040a7afe4fb0a875899';
const ED25519_PUBLIC_KEY_HEX = '07473467683e6a30a13d471a68641f311a14e2b37a38ea592e5d6efc2b446bce';
const EXTENDED_ACCOUNT_0_PUB_KEY =
  '1b39889a420374e41917cf420d88a84d9b40d7eeef533ac37f323076c5f7106a15ef170481a5c4333be2b4cf498525512ac4a3427e1a0e9c9f42cfcb42ba6deb';
const TX_CBOR =
  '84a40081825820f6dd880fb30480aa43117c73bfd09442ba30de5644c3ec1a91d9232fbe715aab000182a20058390071213dc119131f48f54d62e339053388d9d84faedecba9d8722ad2cad9debf34071615fc6452dfc743a4963f6bec68e488001c7384942c13011b0000000253c8e4f6a300581d702ed2631dbb277c84334453c5c437b86325d371f0835a28b910a91a6e011a001e848002820058209d7fee57d1dbb9b000b2a133256af0f2c83ffe638df523b2d1c13d405356d8ae021a0002fb050b582088e4779d217d10398a705530f9fb2af53ffac20aef6e75e85c26e93a00877556a10481d8799fd8799f40ffd8799fa1d8799fd8799fd87980d8799fd8799f581c71213dc119131f48f54d62e339053388d9d84faedecba9d8722ad2caffd8799fd8799fd8799f581cd9debf34071615fc6452dfc743a4963f6bec68e488001c7384942c13ffffffffffd8799f4040ffff1a001e8480a0a000ffd87c9f9fd8799fd8799fd8799fd87980d8799fd8799f581caa47de0ab3b7f0b1d8d196406b6af1b0d88cd46168c49ca0557b4f70ffd8799fd8799fd8799f581cd4b8fc88aec1d1c2f43ca5587898d88da20ef73964b8cf6f8f08ddfbffffffffffd8799f4040ffd87a9f1a00989680ffffd87c9f9fd8799fd87a9fd8799f4752656c65617365d8799fd87980d8799fd8799f581caa47de0ab3b7f0b1d8d196406b6af1b0d88cd46168c49ca0557b4f70ffd8799fd8799fd8799f581cd4b8fc88aec1d1c2f43ca5587898d88da20ef73964b8cf6f8f08ddfbffffffffffff9fd8799f0101ffffffd87c9f9fd8799fd87b9fd9050280ffd87980ffff1b000001884e1fb1c0d87980ffffff1b000001884e1fb1c0d87980ffffff1b000001884e1fb1c0d87980fffff5f6';
const LIBCARDANO_C_SERIALIZED_BIP32_KEY_HANDLER =
  '0a0a0a0a01010000005c97db5e09b3a4919ec75ed1126056241a1e5278731c2e0b01bea0a5f42c22db4131e0a4bbe75633677eb0e60e2ecd3520178f85c7e0d4be77a449087fe9674ee52f946b07c1b56d228c496ec0d36dd44212ba8af0f6eed1a82194dd69f479c603';

/* TESTS *********************************************************************/

const getPassphrase = async () => new Uint8Array(PASSWORD);
const getWrongPassphrase = async () => new Uint8Array(WRONG_PASSWORD);

describe('SoftwareSecureKeyHandler', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('SoftwareBip32SecureKeyHandler', () => {
    it('can be created from entropy and derive a public key', async () => {
      const handler = await Cometa.SoftwareBip32SecureKeyHandler.fromEntropy(
        new Uint8Array(ENTROPY_BYTES),
        new Uint8Array(PASSWORD),
        getPassphrase
      );

      const accountPath: Cometa.AccountDerivationPath = {
        account: Cometa.harden(0),
        coinType: Cometa.harden(Cometa.CoinType.Cardano),
        purpose: Cometa.harden(Cometa.KeyDerivationPurpose.Standard)
      };

      const publicKey = await handler.getAccountPublicKey(accountPath);
      expect(publicKey.toHex()).toBe(EXTENDED_ACCOUNT_0_PUB_KEY);
    });

    it('can sign a transaction', async () => {
      const handler = await Cometa.SoftwareBip32SecureKeyHandler.fromEntropy(
        new Uint8Array(ENTROPY_BYTES),
        new Uint8Array(PASSWORD),
        getPassphrase
      );

      const derivationPaths: Cometa.DerivationPath[] = [
        {
          account: Cometa.harden(0),
          coinType: Cometa.harden(Cometa.CoinType.Cardano),
          index: 0,
          purpose: Cometa.harden(Cometa.KeyDerivationPurpose.Standard),
          role: Cometa.KeyDerivationRole.External
        },
        {
          account: Cometa.harden(0),
          coinType: Cometa.harden(Cometa.CoinType.Cardano),
          index: 0,
          purpose: Cometa.harden(Cometa.KeyDerivationPurpose.Standard),
          role: Cometa.KeyDerivationRole.Staking
        }
      ];

      const witnesses = await handler.signTransaction(TX_CBOR, derivationPaths);
      expect(witnesses).toHaveLength(2);
      expect(witnesses[0].vkey).toBe('07473467683e6a30a13d471a68641f311a14e2b37a38ea592e5d6efc2b446bce');
      expect(witnesses[0].signature).toBe(
        '5f9f725da55e2a89e725f2c147512c0508956aae6a99cb2f3150c73c812c7373f57311dcee14cb02ad1ab7b1940aecc5bbf0769a9b77aafb996393b08d48830b'
      );
      expect(witnesses[1].vkey).toBe('48f090d48246134d6307267451fcefbe4cd9df1530b9ac9a267e3e8cf28b6c61');
      expect(witnesses[1].signature).toBe(
        '9219b195082d71a1b6b9109862a6a053dc8b5342d3a31cc9067330c8f83824a92803a5fe39087fb8c73c746c6e278e98be24b1ddc0c1408c7d5a02776a7e3f07'
      );
    });

    it('can be serialized and deserialized correctly', async () => {
      const originalHandler = await Cometa.SoftwareBip32SecureKeyHandler.fromEntropy(
        new Uint8Array(ENTROPY_BYTES),
        new Uint8Array(PASSWORD),
        getPassphrase
      );
      const serializedData = await originalHandler.serialize();
      const deserializedHandler = Cometa.SoftwareBip32SecureKeyHandler.deserialize(serializedData, getPassphrase);

      const accountPath: Cometa.AccountDerivationPath = {
        account: Cometa.harden(0),
        coinType: Cometa.harden(Cometa.CoinType.Cardano),
        purpose: Cometa.harden(Cometa.KeyDerivationPurpose.Standard)
      };
      const publicKey = await deserializedHandler.getAccountPublicKey(accountPath);

      expect(publicKey.toHex()).toBe(EXTENDED_ACCOUNT_0_PUB_KEY);
    });

    it('can be created from serialized data from libcardano-c', async () => {
      const handler = Cometa.SoftwareBip32SecureKeyHandler.deserialize(
        hexToBytes(LIBCARDANO_C_SERIALIZED_BIP32_KEY_HANDLER),
        getPassphrase
      );

      const accountPath: Cometa.AccountDerivationPath = {
        account: Cometa.harden(0),
        coinType: Cometa.harden(Cometa.CoinType.Cardano),
        purpose: Cometa.harden(Cometa.KeyDerivationPurpose.Standard)
      };
      const publicKey = await handler.getAccountPublicKey(accountPath);
      expect(publicKey.toHex()).toBe(EXTENDED_ACCOUNT_0_PUB_KEY);
    });

    it('fails to decrypt with the wrong passphrase', async () => {
      const handler = await Cometa.SoftwareBip32SecureKeyHandler.fromEntropy(
        new Uint8Array(ENTROPY_BYTES),
        new Uint8Array(PASSWORD),
        getWrongPassphrase
      );

      const accountPath: Cometa.AccountDerivationPath = {
        account: Cometa.harden(0),
        coinType: Cometa.harden(Cometa.CoinType.Cardano),
        purpose: Cometa.harden(Cometa.KeyDerivationPurpose.Standard)
      };
      await expect(handler.getAccountPublicKey(accountPath)).rejects.toThrow();
    });
  });

  describe('SoftwareEd25519SecureKeyHandler', () => {
    it('can be created from an Ed25519 private key and get the public key', async () => {
      const privateKey = Cometa.Ed25519PrivateKey.fromExtendedHex(ED25519_PRIVATE_KEY_HEX);
      const handler = await Cometa.SoftwareEd25519SecureKeyHandler.fromEd25519Key(
        privateKey,
        new Uint8Array(PASSWORD),
        getPassphrase
      );

      const publicKey = await handler.getPublicKey();
      expect(publicKey.toHex()).toBe(ED25519_PUBLIC_KEY_HEX);
    });

    it('can sign a transaction', async () => {
      const privateKey = Cometa.Ed25519PrivateKey.fromExtendedHex(ED25519_PRIVATE_KEY_HEX);
      const handler = await Cometa.SoftwareEd25519SecureKeyHandler.fromEd25519Key(
        privateKey,
        new Uint8Array(PASSWORD),
        getPassphrase
      );
      const witnesses = await handler.signTransaction(TX_CBOR);

      expect(witnesses).toHaveLength(1);
      expect(witnesses[0].vkey).toBe(ED25519_PUBLIC_KEY_HEX);
      expect(witnesses[0].signature).toBe(
        '5f9f725da55e2a89e725f2c147512c0508956aae6a99cb2f3150c73c812c7373f57311dcee14cb02ad1ab7b1940aecc5bbf0769a9b77aafb996393b08d48830b'
      );
    });

    it('can be serialized and deserialized correctly', async () => {
      const privateKey = Cometa.Ed25519PrivateKey.fromExtendedHex(ED25519_PRIVATE_KEY_HEX);
      const originalHandler = await Cometa.SoftwareEd25519SecureKeyHandler.fromEd25519Key(
        privateKey,
        new Uint8Array(PASSWORD),
        getPassphrase
      );

      const serializedData = await originalHandler.serialize();
      const deserializedHandler = Cometa.SoftwareEd25519SecureKeyHandler.deserialize(serializedData, getPassphrase);

      const publicKey = await deserializedHandler.getPublicKey();
      expect(publicKey.toHex()).toBe(ED25519_PUBLIC_KEY_HEX);
    });
  });
});
