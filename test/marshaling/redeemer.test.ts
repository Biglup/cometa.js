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

import * as Cometa from '../../src';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

describe('Redeemer', () => {
  const SAMPLE_REDEEMER_SPEND: Cometa.Redeemer = {
    data: {
      cbor: 'd87980',
      constructor: 0n,
      fields: { items: [] }
    },
    executionUnits: { memory: 1700, steps: 476468 },
    index: 0,
    purpose: Cometa.RedeemerPurpose.spend
  };

  const SAMPLE_REDEEMER_MINT: Cometa.Redeemer = {
    data: 42n,
    executionUnits: { memory: 5000, steps: 10000 },
    index: 1,
    purpose: Cometa.RedeemerPurpose.mint
  };

  const TX_CBOR_WITH_REDEEMERS =
    '84af00818258200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5000181825839009493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e32c728d3861e164cab28cb8f006448139c8f1740ffb8e7aa9e5232dc820aa3581c2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740a14014581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c411832581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a240182846504154415445181e020a031903e804828304581c26b17b78de4f035dc0bfce60d1d3c3a8085c38dcce5fb8767e518bed1901f48405581c0d94e174732ef9aae73f395ab44507bfa983d65023c11a951f0c32e4581ca646474b8f5431261506b6c273d307c7569a4eb6c96b42dd4a29520a582003170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c11131405a1581de013cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d0050758202ceb364d93225b4a0f004a0975a13eb50c3cc6348474b4fe9121f8dc72ca0cfa08186409a3581c2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740a14014581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c413831581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a240182846504154415445181e0b58206199186adb51974690d7247d2646097d2c62763b16fb7ed3f9f55d38abc123de0d818258200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5010e81581c6199186adb51974690d7247d2646097d2c62763b16fb7ed3f9f55d3910825839009493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e32c728d3861e164cab28cb8f006448139c8f1740ffb8e7aa9e5232dc820aa3581c2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740a14014581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c411832581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a240182846504154415445181e11186412818258200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d500a700818258206199186adb51974690d7247d2646097d2c62763b767b528816fb7ed3f9f55d395840bdea87fca1b4b4df8a9b8fb4183c0fab2f8261eb6c5e4bc42c800bb9c8918755bdea87fca1b4b4df8a9b8fb4183c0fab2f8261eb6c5e4bc42c800bb9c891875501868205186482041901f48200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f548201818200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f548202818200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f54830301818200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f540281845820deeb8f82f2af5836ebbc1b450b6dbf0b03c93afe5696f10d49e8a8304ebfac01584064676273786767746f6768646a7074657476746b636f6376796669647171676775726a687268716169697370717275656c6876797071786565777072796676775820b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b45041a003815820b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b450049f187bff0582840100d87a9f187bff82190bb8191b58840201d87a9f187bff821913881907d006815820b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b450f5a6011904d2026373747203821904d2637374720445627974657305a2667374726b6579187b81676c6973746b65796873747276616c75650626';

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

  describe('writeRedeemer / readRedeemer', () => {
    it('should correctly write and read a single Redeemer', () => {
      // Act
      const ptr = Cometa.writeRedeemer(SAMPLE_REDEEMER_SPEND);
      expect(ptr).not.toBe(0);

      // Assert
      const readValue = Cometa.readRedeemer(ptr);
      expect(readValue).toEqual(SAMPLE_REDEEMER_SPEND);

      // Cleanup
      Cometa.unrefObject(ptr);
    });

    it('readRedeemer should throw for a null pointer', () => {
      expect(() => Cometa.readRedeemer(0)).toThrow('Pointer to Redeemer is null');
    });
  });

  describe('writeRedeemerList / readRedeemerList', () => {
    it('should correctly write and read a list of Redeemers', () => {
      // Arrange
      const redeemers = [SAMPLE_REDEEMER_SPEND, SAMPLE_REDEEMER_MINT];

      // Act
      const ptr = Cometa.writeRedeemerList(redeemers);
      expect(ptr).not.toBe(0);

      // Assert
      const readValue = Cometa.readRedeemerList(ptr);
      expect(readValue).toEqual(redeemers);

      // Cleanup
      Cometa.unrefObject(ptr);
    });

    it('should correctly handle an empty list', () => {
      const ptr = Cometa.writeRedeemerList([]);
      expect(ptr).not.toBe(0);

      const readValue = Cometa.readRedeemerList(ptr);
      expect(readValue).toEqual([]);

      Cometa.unrefObject(ptr);
    });
  });

  describe('readRedeemersFromTx', () => {
    it('should correctly extract redeemers from a transaction CBOR', () => {
      const redeemers = Cometa.readRedeemersFromTx(TX_CBOR_WITH_REDEEMERS);

      expect(redeemers.length).toBe(2);
      expect(redeemers[0].purpose).toBe(Cometa.RedeemerPurpose.mint);
      expect(redeemers[0].index).toBe(0);
      expect(redeemers[0].executionUnits).toEqual({ memory: 3000, steps: 7000 });
    });

    it('should return an empty array for a transaction without redeemers', () => {
      const txCborNoWitnesses =
        '84a400d901028182582019fe2a8817d1860cbbd714df6fce2f163b3a249f9592517bd08a4ee80eb73a58010182a300581d70d1f8737aebb2c1da4255e4d28cf0bd5c109b15a55755f63bebaaa856011a001e8480028201d81843d87980a200583900dc435fc2638f6684bd1f9f6f917d80c92ae642a4a33a412e516479e64245236ab8056760efceebbff57e8cab220182be3e36439e520a645401821b000000021c55199aa2581cd1f8737aebb2c1da4255e4d28cf0bd5c109b15a55755f63bebaaa856a154506c75747573426572727952617370626572727901581ceb7e6282971727598462d39d7627bfa6fbbbf56496cb91b76840affba14e426572727952617370626572727901021a0002a14d031a05eb4c7da100d901028182582007473467683e6a30a13d471a68641f311a14e2b37a38ea592e5d6efc2b446bce5840e9b4d1e37743b967f483db51f4e7f150c097a26f1cd2fcd25d13a28ef81a6242b1ac5567315e28e0baf5432aef5ee258de4becb5f0075b990c58a1fba52be30bf5f6';
      const redeemers = Cometa.readRedeemersFromTx(txCborNoWitnesses);
      expect(redeemers).toEqual([]);
    });

    it('should throw an error for invalid transaction CBOR', () => {
      const invalidCbor = 'this-is-not-cbor';
      expect(() => Cometa.readRedeemersFromTx(invalidCbor)).toThrow();
    });
  });
});
