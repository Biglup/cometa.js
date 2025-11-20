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

/* IMPORTS *******************************************************************/

import * as Cometa from '../../dist/cjs';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

describe('Transaction CBOR Serialization', () => {
  const VALID_TX_CBOR =
    '84af00818258200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5000181825839009493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e32c728d3861e164cab28cb8f006448139c8f1740ffb8e7aa9e5232dc820aa3581c2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740a14014581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c411832581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a240182846504154415445181e020a031903e804828304581c26b17b78de4f035dc0bfce60d1d3c3a8085c38dcce5fb8767e518bed1901f48405581c0d94e174732ef9aae73f395ab44507bfa983d65023c11a951f0c32e4581ca646474b8f5431261506b6c273d307c7569a4eb6c96b42dd4a29520a582003170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c11131405a1581de013cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d0050758202ceb364d93225b4a0f004a0975a13eb50c3cc6348474b4fe9121f8dc72ca0cfa08186409a3581c2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740a14014581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c413831581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a240182846504154415445181e0b58206199186adb51974690d7247d2646097d2c62763b16fb7ed3f9f55d38abc123de0d818258200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5010e81581c6199186adb51974690d7247d2646097d2c62763b16fb7ed3f9f55d3910825839009493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e32c728d3861e164cab28cb8f006448139c8f1740ffb8e7aa9e5232dc820aa3581c2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740a14014581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c411832581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a240182846504154415445181e11186412818258200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d500a700818258206199186adb51974690d7247d2646097d2c62763b767b528816fb7ed3f9f55d395840bdea87fca1b4b4df8a9b8fb4183c0fab2f8261eb6c5e4bc42c800bb9c8918755bdea87fca1b4b4df8a9b8fb4183c0fab2f8261eb6c5e4bc42c800bb9c891875501868205186482041901f48200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f548201818200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f548202818200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f54830301818200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f540281845820deeb8f82f2af5836ebbc1b450b6dbf0b03c93afe5696f10d49e8a8304ebfac01584064676273786767746f6768646a7074657476746b636f6376796669647171676775726a687268716169697370717275656c6876797071786565777072796676775820b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b45041a003815820b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b450049f187bff0582840100d87a9f187bff82190bb8191b58840201d87a9f187bff821913881907d006815820b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b450f5a6011904d2026373747203821904d2637374720445627974657305a2667374726b6579187b81676c6973746b65796873747276616c75650626';

  const VALID_TX_JSON = {
    auxiliary_data: {
      metadata: [
        { key: '1', value: { tag: 'int', value: '1234' } },
        {
          key: '2',
          value: { tag: 'string', value: 'str' }
        },
        {
          key: '3',
          value: {
            contents: [
              { tag: 'int', value: '1234' },
              { tag: 'string', value: 'str' }
            ],
            tag: 'list'
          }
        },
        { key: '4', value: { tag: 'bytes', value: '6279746573' } },
        {
          key: '5',
          value: {
            contents: [
              {
                key: { tag: 'string', value: 'strkey' },
                value: { tag: 'int', value: '123' }
              },
              {
                key: { contents: [{ tag: 'string', value: 'listkey' }], tag: 'list' },
                value: { tag: 'string', value: 'strvalue' }
              }
            ],
            tag: 'map'
          }
        },
        { key: '6', value: { tag: 'int', value: '-7' } }
      ]
    },
    body: {
      auxiliary_data_hash: '2ceb364d93225b4a0f004a0975a13eb50c3cc6348474b4fe9121f8dc72ca0cfa',
      certs: [
        {
          epoch: 500,
          pool_keyhash: 'pool1y6chk7x7fup4ms9leesdr57r4qy9cwxuee0msan72x976a6u0nc',
          tag: 'pool_retirement'
        },
        {
          genesis_delegate_hash: 'a646474b8f5431261506b6c273d307c7569a4eb6c96b42dd4a29520a',
          genesis_hash: '0d94e174732ef9aae73f395ab44507bfa983d65023c11a951f0c32e4',
          tag: 'genesis_key_delegation',
          vrf_keyhash: 'vrf_vkh1qvts5tn4j7mm0c7cfsznj8gnnf3tz4l8s7rd3syz72wu7nq3zv2qegvt5c'
        }
      ],
      collateral: [
        {
          index: 1,
          transaction_id: '0f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5'
        }
      ],
      collateral_return: {
        address:
          'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
        amount: {
          assets: {
            '2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740': { '': '20' },
            '7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373': { '': '40', '504154415445': '30' },
            '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82': { '54534c41': '50' }
          },
          coin: '10'
        }
      },
      fee: '10',
      inputs: [{ index: 0, transaction_id: '0f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5' }],
      mint: [
        {
          assets: { '': '20' },
          script_hash: '2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740'
        },
        {
          assets: { '54534c41': '-50' },
          script_hash: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82'
        },
        {
          assets: { '': '40', '504154415445': '30' },
          script_hash: '7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373'
        }
      ],
      outputs: [
        {
          address:
            'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
          amount: {
            assets: {
              '2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740': { '': '20' },
              '7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373': { '': '40', '504154415445': '30' },
              '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82': { '54534c41': '50' }
            },
            coin: '10'
          }
        }
      ],
      reference_inputs: [
        {
          index: 0,
          transaction_id: '0f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5'
        }
      ],
      required_signers: ['6199186adb51974690d7247d2646097d2c62763b16fb7ed3f9f55d39'],
      script_data_hash: '6199186adb51974690d7247d2646097d2c62763b16fb7ed3f9f55d38abc123de',
      total_collateral: '100',
      ttl: '1000',
      validity_start_interval: '100',
      withdrawals: [{ key: 'stake_test1uqfu74w3wh4gfzu8m6e7j987h4lq9r3t7ef5gaw497uu85qsqfy27', value: '5' }]
    },
    is_valid: true,
    witness_set: {
      bootstraps: [
        {
          attributes: 'a0',
          chain_code: 'b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b450',
          signature:
            '64676273786767746f6768646a7074657476746b636f6376796669647171676775726a687268716169697370717275656c687679707178656577707279667677',
          vkey: 'deeb8f82f2af5836ebbc1b450b6dbf0b03c93afe5696f10d49e8a8304ebfac01'
        }
      ],
      native_scripts: [
        { slot: '100', tag: 'timelock_expiry' },
        {
          slot: '500',
          tag: 'timelock_start'
        },
        {
          pubkey: 'b5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f54',
          tag: 'pubkey'
        },
        {
          scripts: [{ pubkey: 'b5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f54', tag: 'pubkey' }],
          tag: 'all'
        },
        {
          scripts: [{ pubkey: 'b5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f54', tag: 'pubkey' }],
          tag: 'any'
        },
        {
          n: 1,
          scripts: [{ pubkey: 'b5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f54', tag: 'pubkey' }],
          tag: 'n_of_k'
        }
      ],
      plutus_data: [{ tag: 'integer', value: '123' }],
      plutus_scripts: [
        {
          bytes: 'b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b450',
          language: 'plutus_v1'
        },
        { bytes: 'b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b450', language: 'plutus_v2' }
      ],
      redeemers: [
        {
          data: { alternative: '1', data: [{ tag: 'integer', value: '123' }], tag: 'constr' },
          ex_units: { mem: '3000', steps: '7000' },
          index: '0',
          tag: 'mint'
        },
        {
          data: { alternative: '1', data: [{ tag: 'integer', value: '123' }], tag: 'constr' },
          ex_units: { mem: '5000', steps: '2000' },
          index: '1',
          tag: 'cert'
        }
      ],
      vkey_witnesses: [
        {
          signature:
            'bdea87fca1b4b4df8a9b8fb4183c0fab2f8261eb6c5e4bc42c800bb9c8918755bdea87fca1b4b4df8a9b8fb4183c0fab2f8261eb6c5e4bc42c800bb9c8918755',
          vkey: '6199186adb51974690d7247d2646097d2c62763b767b528816fb7ed3f9f55d39'
        }
      ]
    }
  };

  let detector: MemoryLeakDetector;

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

  describe('Round-Trip Serialization', () => {
    it('should correctly read a transaction from CBOR and write it back to the same CBOR', () => {
      let txPtr = 0;
      try {
        txPtr = Cometa.readTransactionFromCbor(VALID_TX_CBOR);
        expect(txPtr).not.toBe(0);

        const resultCbor = Cometa.writeTransactionToCbor(txPtr);

        expect(resultCbor).toBe(VALID_TX_CBOR);
      } finally {
        if (txPtr !== 0) {
          Cometa.unrefObject(txPtr);
        }
      }
    });
  });

  describe('JSON Serialization', () => {
    it('should correctly convert a transaction from CBOR to cip116 JSON', () => {
      expect(Cometa.inspectTx(VALID_TX_CBOR)).toEqual(VALID_TX_JSON);
    });
  });

  describe('readTransactionFromCbor', () => {
    it('should throw an error for a non-transaction CBOR string', () => {
      const invalidTxCbor = 'a16570726963651903e8';
      expect(() => Cometa.readTransactionFromCbor(invalidTxCbor)).toThrow(/Failed to unmarshal transaction from CBOR/);
    });

    it('should throw an error for an invalid hex string', () => {
      const invalidHex = 'this-is-not-hex';
      expect(() => Cometa.readTransactionFromCbor(invalidHex)).toThrow();
    });
  });

  describe('writeTransactionToCbor', () => {
    it('should throw an error when writing from a null pointer', () => {
      expect(() => Cometa.writeTransactionToCbor(0)).toThrow('Failed to get transaction. Pointer is null.');
    });
  });
});
