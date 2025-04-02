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

// eslint-disable-next-line max-statements
describe('Address', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('isAddress', () => {
    it('returns false if the address is invalid', () => {
      expect(Cometa.Address.isValid('invalid')).toBe(false);
    });
    it('returns true if the address is a valid shelley address', () => {
      expect(
        Cometa.Address.isValid(
          'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
        )
      ).toBe(true);
    });
    it('returns true if the address is a valid stake address', () => {
      expect(Cometa.Address.isValid('stake1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5egfu2p0u')).toBe(true);
    });
    it('returns true if the address is a valid byron address', () => {
      expect(
        Cometa.Address.isValid(
          '37btjrVyb4KDXBNC4haBVPCrro8AQPHwvCMp3RFhhSVWwfFmZ6wwzSK6JK1hY6wHNmtrpTf1kdbva8TCneM2YsiXT7mrzT21EacHnPpz5YyUdj64na'
        )
      ).toBe(true);
    });
  });

  it('Address fromString can correctly decode Byron addresses', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.byronTestnetDaedalus);

    expect(address).toBeDefined();

    const byron = address.asByron();

    expect(byron).toBeDefined();

    expect(byron!.getType()).toEqual(Cometa.ByronAddressType.PubKey);
    expect(byron!.getAttributes()).toEqual({
      derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
      magic: 1_097_911_063
    });
    expect(byron!.getRoot()).toEqual('9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e');
  });

  it('Address fromString can correctly decode bech32 addresses', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetRewardScript);

    expect(address).toBeDefined();

    const reward = address.asReward();

    expect(reward).toBeDefined();
    expect(reward!.getCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
  });

  it('Address fromString can correctly decode CBOR addresses', () => {
    const address = Cometa.Address.fromBytes(
      new Uint8Array(Buffer.from('f0c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f', 'hex'))
    );

    expect(address).toBeDefined();

    const reward = address.asReward();

    expect(reward).toBeDefined();
    expect(reward!.getCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
  });

  it('Address fromString throws when a invalid addresses is given', () => {
    expect(() => Cometa.Address.fromString('invalidAddress')).toThrow();
  });

  it('Address isValidBech32 return true when a valid bech32 address is given', () => {
    expect(Cometa.Address.isValidBech32(cip19TestVectors.testnetBasePaymentKeyStakeKey)).toBe(true);
  });

  it('Address isValidBech32 return false when an invalid bech32 address is given', () => {
    expect(Cometa.Address.isValidBech32('invalidAddress')).toBe(false);
  });

  it('Address isValidByron return true when a valid byron address is given', () => {
    expect(Cometa.Address.isValidByron(cip19TestVectors.byronTestnetDaedalus)).toBe(true);
  });

  it('Address isValidByron return false when an invalid byron address is given', () => {
    expect(Cometa.Address.isValidByron('invalidAddress')).toBe(false);
  });

  it('Address isValid return true when a valid byron address is given', () => {
    expect(Cometa.Address.isValid(cip19TestVectors.byronTestnetDaedalus)).toBe(true);
  });

  it('Address isValid return true when a valid bech32 address is given', () => {
    expect(Cometa.Address.isValid(cip19TestVectors.testnetBasePaymentKeyStakeKey)).toBe(true);
  });

  it('Address isValid return false when an invalid address is given', () => {
    expect(Cometa.Address.isValid('invalidAddress')).toBe(false);
  });

  it('Address isValid return false when a bitcoin address is given', () => {
    expect(Cometa.Address.isValid('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')).toBe(false);
  });

  it('Address can correctly decode/encode mainnet BasePaymentKeyStakeKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.basePaymentKeyStakeKey);

    const baseAddress = address.asBase();

    expect(baseAddress).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asPointer()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(baseAddress!.getPaymentCredential()).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    expect(baseAddress!.getStakeCredential()).toEqual(cip19TestVectors.KEY_STAKE_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.BasePaymentKeyStakeKey);
    expect(address.toString()).toBe(cip19TestVectors.basePaymentKeyStakeKey);
    expect(address.toBytes()).toEqual(
      new Uint8Array(
        Buffer.from(
          '019493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251',
          'hex'
        )
      )
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.basePaymentKeyStakeKey);
  });

  it('Address can correctly decode/encode testnet BasePaymentKeyStakeKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetBasePaymentKeyStakeKey);

    const baseAddress = address.asBase();

    expect(baseAddress).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asPointer()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(baseAddress!.getPaymentCredential()).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    expect(baseAddress!.getStakeCredential()).toEqual(cip19TestVectors.KEY_STAKE_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.BasePaymentKeyStakeKey);
    expect(address.toString()).toBe(cip19TestVectors.testnetBasePaymentKeyStakeKey);
    expect(address.toBytes()).toEqual(
      new Uint8Array(
        Buffer.from(
          '009493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251',
          'hex'
        )
      )
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.testnetBasePaymentKeyStakeKey);
  });

  it('Address can correctly decode/encode mainnet BasePaymentScriptStakeKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.basePaymentScriptStakeKey);

    const baseAddress = address.asBase();

    expect(baseAddress).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asPointer()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(baseAddress!.getPaymentCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(baseAddress!.getStakeCredential()).toEqual(cip19TestVectors.KEY_STAKE_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.BasePaymentScriptStakeKey);
    expect(address.toString()).toBe(cip19TestVectors.basePaymentScriptStakeKey);
    expect(address.toHex()).toBe(
      '11c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251'
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.basePaymentScriptStakeKey);
  });

  it('Address can correctly decode/encode testnet BasePaymentScriptStakeKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetBasePaymentScriptStakeKey);

    const baseAddress = address.asBase();

    expect(baseAddress).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asPointer()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(baseAddress!.getPaymentCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(baseAddress!.getStakeCredential()).toEqual(cip19TestVectors.KEY_STAKE_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.BasePaymentScriptStakeKey);
    expect(address.toString()).toBe(cip19TestVectors.testnetBasePaymentScriptStakeKey);
    expect(address.toHex()).toBe(
      '10c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251'
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(
      cip19TestVectors.testnetBasePaymentScriptStakeKey
    );
  });

  it('Address can correctly decode/encode mainnet BasePaymentKeyStakeScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.basePaymentKeyStakeScript);

    const baseAddress = address.asBase();

    expect(baseAddress).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asPointer()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(baseAddress!.getPaymentCredential()).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    expect(baseAddress!.getStakeCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.BasePaymentKeyStakeScript);
    expect(address.toString()).toBe(cip19TestVectors.basePaymentKeyStakeScript);
    expect(address.toHex()).toBe(
      '219493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8ec37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f'
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.basePaymentKeyStakeScript);
  });

  it('Address can correctly decode/encode testnet BasePaymentKeyStakeScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetBasePaymentKeyStakeScript);

    const baseAddress = address.asBase();

    expect(baseAddress).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asPointer()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(baseAddress!.getPaymentCredential()).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    expect(baseAddress!.getStakeCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.BasePaymentKeyStakeScript);
    expect(address.toString()).toBe(cip19TestVectors.testnetBasePaymentKeyStakeScript);
    expect(address.toHex()).toBe(
      '209493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8ec37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f'
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(
      cip19TestVectors.testnetBasePaymentKeyStakeScript
    );
  });

  it('Address can correctly decode/encode mainnet BasePaymentScriptStakeScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.basePaymentScriptStakeScript);

    const baseAddress = address.asBase();

    expect(baseAddress).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asPointer()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(baseAddress!.getPaymentCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(baseAddress!.getStakeCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.BasePaymentScriptStakeScript);
    expect(address.toString()).toBe(cip19TestVectors.basePaymentScriptStakeScript);
    expect(address.toHex()).toBe(
      '31c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542fc37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f'
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.basePaymentScriptStakeScript);
  });

  it('Address can correctly decode/encode testnet BasePaymentScriptStakeScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetBasePaymentScriptStakeScript);

    const baseAddress = address.asBase();

    expect(baseAddress).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asPointer()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(baseAddress!.getPaymentCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(baseAddress!.getStakeCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.BasePaymentScriptStakeScript);
    expect(address.toString()).toBe(cip19TestVectors.testnetBasePaymentScriptStakeScript);
    expect(address.toHex()).toBe(
      '30c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542fc37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f'
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(
      cip19TestVectors.testnetBasePaymentScriptStakeScript
    );
  });

  it('Address can correctly decode/encode mainnet Byron', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.byronMainnetYoroi);

    const byron = address.asByron();

    expect(byron).toBeDefined();
    expect(address.asEnterprise()).toBeNull();
    expect(address.asReward()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(byron!.getType()).toEqual(Cometa.ByronAddressType.PubKey);
    expect(address.getType()).toBe(Cometa.AddressType.Byron);
    // This address payload has no attributes. It was a Yoroi's address on MainNet which follows a
    // BIP-44 derivation scheme and therefore, does not require any attributes.
    expect(byron!.getAttributes()).toEqual({ derivationPath: '', magic: -1 });
    expect(byron!.getRoot()).toEqual('ba970ad36654d8dd8f74274b733452ddeab9a62a397746be3c42ccdd');
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.toString()).toBe(cip19TestVectors.byronMainnetYoroi);
    expect(address.toHex()).toBe(
      '82d818582183581cba970ad36654d8dd8f74274b733452ddeab9a62a397746be3c42ccdda0001a9026da5b'
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.byronMainnetYoroi);
  });

  it('Address can correctly decode/encode testnet Byron', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.byronTestnetDaedalus);

    const byron = address.asByron();

    expect(byron).toBeDefined();
    expect(address.asEnterprise()).toBeNull();
    expect(address.asReward()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(byron!.getType()).toEqual(Cometa.ByronAddressType.PubKey);
    expect(address.getType()).toBe(Cometa.AddressType.Byron);
    expect(byron!.getAttributes()).toEqual({
      derivationPath: '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
      magic: 1_097_911_063
    });
    expect(byron!.getRoot()).toEqual('9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e');
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.toString()).toBe(cip19TestVectors.byronTestnetDaedalus);
    expect(address.toHex()).toBe(
      // eslint-disable-next-line max-len
      '82d818584983581c9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450ea201581e581c9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb697702451a4170cb17001a6979126c'
    );
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.byronTestnetDaedalus);
  });

  it('Address can correctly decode/encode mainnet EnterpriseKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.enterpriseKey);

    const enterprise = address.asEnterprise();

    expect(enterprise).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(enterprise!.getCredential()).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.EnterpriseKey);
    expect(address.toString()).toBe(cip19TestVectors.enterpriseKey);
    expect(address.toHex()).toBe('619493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.enterpriseKey);
  });

  it('Address can correctly decode/encode testnet EnterpriseKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetEnterpriseKey);

    const enterprise = address.asEnterprise();

    expect(enterprise).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(enterprise!.getCredential()).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.EnterpriseKey);
    expect(address.toString()).toBe(cip19TestVectors.testnetEnterpriseKey);
    expect(address.toHex()).toBe('609493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.testnetEnterpriseKey);
  });

  it('Address can correctly decode/encode mainnet EnterpriseScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.enterpriseScript);

    const enterprise = address.asEnterprise();

    expect(enterprise).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(enterprise!.getCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.EnterpriseScript);
    expect(address.toString()).toBe(cip19TestVectors.enterpriseScript);
    expect(address.toHex()).toBe('71c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.enterpriseScript);
  });

  it('Address can correctly decode/encode testnet EnterpriseScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetEnterpriseScript);

    const enterprise = address.asEnterprise();

    expect(enterprise).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(enterprise!.getCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.EnterpriseScript);
    expect(address.toString()).toBe(cip19TestVectors.testnetEnterpriseScript);
    expect(address.toHex()).toBe('70c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.testnetEnterpriseScript);
  });

  it('Address can correctly decode/encode mainnet PointerKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.pointerKey);

    const pointer = address.asPointer();

    expect(pointer).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(pointer!.getStakePointer()).toEqual(cip19TestVectors.POINTER);
    expect(pointer!.getPaymentCredential()).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.PointerKey);
    expect(address.toString()).toBe(cip19TestVectors.pointerKey);
    expect(address.toHex()).toBe('419493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e8198bd431b03');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.pointerKey);
  });

  it('Address can correctly decode/encode testnet PointerKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetPointerKey);

    const pointer = address.asPointer();

    expect(pointer).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(pointer!.getStakePointer()).toEqual(cip19TestVectors.POINTER);
    expect(pointer!.getPaymentCredential()).toEqual(cip19TestVectors.KEY_PAYMENT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.PointerKey);
    expect(address.toString()).toBe(cip19TestVectors.testnetPointerKey);
    expect(address.toHex()).toBe('409493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e8198bd431b03');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.testnetPointerKey);
  });

  it('Address can correctly decode/encode mainnet PointerScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.pointerScript);

    const pointer = address.asPointer();

    expect(pointer).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(pointer!.getStakePointer()).toEqual(cip19TestVectors.POINTER);
    expect(pointer!.getPaymentCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.PointerScript);
    expect(address.toString()).toBe(cip19TestVectors.pointerScript);
    expect(address.toHex()).toBe('51c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f8198bd431b03');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.pointerScript);
  });

  it('Address can correctly decode/encode testnet PointerScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetPointerScript);

    const pointer = address.asPointer();

    expect(pointer).toBeDefined();
    expect(address.asReward()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asEnterprise()).toBeNull();

    expect(pointer!.getStakePointer()).toEqual(cip19TestVectors.POINTER);
    expect(pointer!.getPaymentCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.PointerScript);
    expect(address.toString()).toBe(cip19TestVectors.testnetPointerScript);
    expect(address.toHex()).toBe('50c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f8198bd431b03');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.testnetPointerScript);
  });

  it('Address can correctly decode/encode mainnet RewardKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.rewardKey);

    const reward = address.asReward();

    expect(reward).toBeDefined();
    expect(address.asEnterprise()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(reward!.getCredential()).toEqual(cip19TestVectors.KEY_STAKE_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.RewardKey);
    expect(address.toString()).toBe(cip19TestVectors.rewardKey);
    expect(address.toHex()).toBe('e1337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.rewardKey);
  });

  it('Address can correctly decode/encode testnet RewardKey', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetRewardKey);

    const reward = address.asReward();

    expect(reward).toBeDefined();
    expect(address.asEnterprise()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(reward!.getCredential()).toEqual(cip19TestVectors.KEY_STAKE_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.RewardKey);
    expect(address.toString()).toBe(cip19TestVectors.testnetRewardKey);
    expect(address.toHex()).toBe('e0337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.testnetRewardKey);
  });

  it('Address can correctly decode/encode mainnet RewardScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.rewardScript);

    const reward = address.asReward();

    expect(reward).toBeDefined();
    expect(address.asEnterprise()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(reward!.getCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Mainnet);
    expect(address.getType()).toBe(Cometa.AddressType.RewardScript);
    expect(address.toString()).toBe(cip19TestVectors.rewardScript);
    expect(address.toHex()).toBe('f1c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.rewardScript);
  });

  it('Address can correctly decode/encode testnet RewardScript', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.testnetRewardScript);

    const reward = address.asReward();

    expect(reward).toBeDefined();
    expect(address.asEnterprise()).toBeNull();
    expect(address.asByron()).toBeNull();
    expect(address.asBase()).toBeNull();
    expect(address.asPointer()).toBeNull();

    expect(reward!.getCredential()).toEqual(cip19TestVectors.SCRIPT_CREDENTIAL);
    expect(address.getNetworkId()).toBe(Cometa.NetworkId.Testnet);
    expect(address.getType()).toBe(Cometa.AddressType.RewardScript);
    expect(address.toString()).toBe(cip19TestVectors.testnetRewardScript);
    expect(address.toHex()).toBe('f0c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f');
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.testnetRewardScript);
  });

  it('Address can correctly decode/encode from hex/to hex', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.rewardScript);
    expect(Cometa.Address.fromHex(address.toHex()).toString()).toBe(cip19TestVectors.rewardScript);
  });

  it('Address can correctly decode/encode from bytes/to bytes', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.rewardScript);
    expect(Cometa.Address.fromBytes(address.toBytes()).toString()).toBe(cip19TestVectors.rewardScript);
  });

  it('Address can correctly decode/encode from string/to string', () => {
    const address = Cometa.Address.fromString(cip19TestVectors.rewardScript);
    expect(address.toString()).toBe(cip19TestVectors.rewardScript);
  });
});
