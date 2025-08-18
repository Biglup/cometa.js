/* eslint-disable max-len */
/**
 * Copyright 2024 Biglup Labs.
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

/* DEFINITIONS ***************************************************************/

/**
 * Performs a round-trip test for marshalling and unmarshalling PlutusData.
 *
 * @param originalData The original PlutusData to test.
 */
const performRoundTripTest = (originalData: Cometa.PlutusData) => {
  let dataPtr = 0;
  try {
    dataPtr = Cometa.writePlutusData(originalData);
    expect(dataPtr).not.toBe(0);

    const roundTripData = Cometa.readPlutusData(dataPtr);

    expect(roundTripData).toEqual(originalData);
  } finally {
    if (dataPtr !== 0) {
      Cometa.unrefObject(dataPtr);
    }
  }
};

/* TESTS *********************************************************************/

describe('PlutusData Marshalling & Unmarshalling', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('bigint', () => {
    it('should handle a simple positive integer', () => {
      performRoundTripTest(42n);
    });

    it('should handle a simple negative integer', () => {
      performRoundTripTest(-42n);
    });

    it('should handle zero', () => {
      performRoundTripTest(0n);
    });

    it('should handle a large 64-bit integer', () => {
      performRoundTripTest(1234567890123456789n);
    });

    it('should handle the max int64 value', () => {
      performRoundTripTest(9223372036854775807n);
    });
  });

  describe('Uint8Array (Bytes)', () => {
    it('should handle a simple byte array', () => {
      performRoundTripTest(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    });

    it('should handle an empty byte array', () => {
      performRoundTripTest(new Uint8Array([]));
    });
  });

  describe('PlutusList', () => {
    it('should handle an empty list', () => {
      const emptyList: Cometa.PlutusList = { cbor: '80', items: [] };
      performRoundTripTest(emptyList);
    });

    it('should handle a list of primitives', () => {
      const simpleList: Cometa.PlutusList = {
        cbor: '9f18644301020338c7ff',
        items: [100n, new Uint8Array([1, 2, 3]), -200n]
      };
      performRoundTripTest(simpleList);
    });

    it('should handle a nested list', () => {
      const nestedList: Cometa.PlutusList = {
        cbor: '9f019f0203ffff',
        items: [1n, { cbor: '9f0203ff', items: [2n, 3n] } as Cometa.PlutusList]
      };
      performRoundTripTest(nestedList);
    });
  });

  describe('PlutusMap', () => {
    it('should handle an empty map', () => {
      const emptyMap: Cometa.PlutusMap = { cbor: 'a0', entries: [] };
      performRoundTripTest(emptyMap);
    });

    it('should handle a map with primitive keys and values', () => {
      const simpleMap: Cometa.PlutusMap = {
        cbor: 'a201420a14430102033831',
        entries: [
          { key: 1n, value: new Uint8Array([10, 20]) },
          { key: new Uint8Array([1, 2, 3]), value: -50n }
        ]
      };
      performRoundTripTest(simpleMap);
    });

    it('should handle a map with complex keys and values', () => {
      const complexMap: Cometa.PlutusMap = {
        cbor: 'a19f0102ffa10a0b',
        entries: [
          {
            key: { cbor: '9f0102ff', items: [1n, 2n] } as Cometa.PlutusList,
            value: {
              cbor: 'a10a0b',
              entries: [{ key: 10n, value: 11n }]
            } as Cometa.PlutusMap
          }
        ]
      };
      performRoundTripTest(complexMap);
    });
  });

  describe('ConstrPlutusData', () => {
    it('should handle a constructor with no fields', () => {
      const constrNoFields: Cometa.ConstrPlutusData = {
        cbor: 'd87980',
        constructor: 0n,
        fields: { items: [] }
      };
      performRoundTripTest(constrNoFields);
    });

    it('should handle a constructor with simple fields', () => {
      const constrSimple: Cometa.ConstrPlutusData = {
        cbor: 'd87a9f187b43040506ff',
        constructor: 1n,
        fields: { items: [123n, new Uint8Array([4, 5, 6])] }
      };
      performRoundTripTest(constrSimple);
    });

    it('should handle a constructor with a high alternative number', () => {
      const constrHighAlt: Cometa.ConstrPlutusData = {
        cbor: 'd8668219050080',
        constructor: 1280n,
        fields: { items: [] }
      };
      performRoundTripTest(constrHighAlt);
    });
  });

  describe('Complex Nested Structures', () => {
    it('should handle a deeply nested "kitchen sink" datum', () => {
      const kitchenSinkDatum: Cometa.ConstrPlutusData = {
        cbor: 'd8799fa2436b6579d87a9f1864ff38299f010203ff1903e7ff',
        constructor: 0n,
        fields: {
          items: [
            {
              cbor: 'a2436b6579d87a9f1864ff38299f010203ff',
              entries: [
                {
                  key: new Uint8Array([0x6b, 0x65, 0x79]),
                  value: {
                    cbor: 'd87a9f1864ff',
                    constructor: 1n,
                    fields: { items: [100n] }
                  } as Cometa.ConstrPlutusData
                },
                {
                  key: -42n,
                  value: {
                    cbor: '9f010203ff',
                    items: [1n, 2n, 3n]
                  } as Cometa.PlutusList
                }
              ]
            } as Cometa.PlutusMap,
            999n
          ]
        }
      };
      performRoundTripTest(kitchenSinkDatum);
    });
  });

  it('round trip serializations produce the same core type output', () => {
    const plutusData = 123n;
    const cbor = Cometa.plutusDataToCbor(plutusData);
    const result = Cometa.cborToPlutusData(cbor);
    expect(plutusData).toEqual(result);
  });

  it('converts (TODO: describe is special about this that fails) inline datum', () => {
    // tx: https://preprod.cexplorer.io/tx/32d2b9062680c7ef5673114abce804d8b854f54440518e48a6db3e555f3a84d2
    // parsed datum: https://preprod.cexplorer.io/datum/f20e5a0a42a9015cd4e53f8b8c020e535957f782ea3231453fe4cf46a52d07c9
    const cbor =
      'd8799fa3446e616d6548537061636542756445696d6167654b697066733a2f2f7465737445696d616765583061723a2f2f66355738525a6d4151696d757a5f7679744659396f66497a6439517047614449763255587272616854753401ff';
    expect(() => Cometa.cborToPlutusData(cbor)).not.toThrowError();
  });

  describe('Integer', () => {
    it('can encode a positive integer', () => {
      const data = 5n;
      expect(Cometa.plutusDataToCbor(data)).toEqual('05');
    });

    it('can encode a negative integer', () => {
      const data = -5n;
      expect(Cometa.plutusDataToCbor(data)).toEqual('24');
    });

    it('can encode an integer bigger than unsigned 64bits', () => {
      const data = 18_446_744_073_709_551_616n;
      expect(Cometa.plutusDataToCbor(data)).toEqual('c249010000000000000000');
    });

    it('can encode a negative integer bigger than unsigned 64bits', () => {
      const data = -18_446_744_073_709_551_616n;
      expect(Cometa.plutusDataToCbor(data)).toEqual('c349010000000000000000');
    });

    it('can decode a positive integer', () => {
      const data = Cometa.cborToPlutusData('05');
      expect(data).toEqual(5n);
    });

    it('can decode a negative integer', () => {
      const data = Cometa.cborToPlutusData('24');
      expect(data).toEqual(-5n);
    });

    it('can decode an integer bigger than unsigned 64bits', () => {
      const data = Cometa.cborToPlutusData('c249010000000000000000');
      expect(data).toEqual(18_446_744_073_709_551_616n);
    });

    it('can decode a negative integer bigger than unsigned 64bits', () => {
      const data = Cometa.cborToPlutusData('c349010000000000000000');
      expect(data).toEqual(-18_446_744_073_709_551_616n);
    });

    it('can decode a positive tagged indefinite length unbounded int', () => {
      const data = Cometa.cborToPlutusData(
        'c25f584037d34fac60a7dd2edba0c76fa58862c91c45ff4298e9134ba8e76be9a7513d88865bfdb9315073dc2690b0f2b59a232fbfa0a8a504df6ee9bb78e3f33fbdfef95529c9e74ff30ffe1bd1cc5795c37535899dba800000ff'
      );
      expect(data).toEqual(
        // eslint-disable-next-line max-len
        1_093_929_156_918_367_016_766_069_563_027_239_416_446_778_893_307_251_997_971_794_948_729_105_062_347_369_330_146_869_223_033_199_554_831_433_128_491_376_164_494_134_119_896_793_625_745_623_928_731_109_781_036_903_510_617_119_765_359_815_723_399_113_165_600_284_443_934_720n
      );
    });
  });

  describe('Bytes', () => {
    it('can encode a small byte string (less than 64 bytes)', () => {
      const cbor = Cometa.plutusDataToCbor(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]));
      expect(cbor).toEqual('46010203040506');
    });

    it('can decode a small byte string (less than 64 bytes)', () => {
      const data = Cometa.cborToPlutusData('46010203040506');
      expect([...(data as Uint8Array)]).toEqual([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
    });

    it('can encode a big byte string (more than 64 bytes)', () => {
      const payload = new Uint8Array([
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02,
        0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02,
        0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02,
        0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02,
        0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08
      ]);

      const data = Cometa.plutusDataToCbor(payload);
      expect(data).toEqual(
        '5f584001020304050607080102030405060708010203040506070801020304050607080102030405060708010203040506070801020304050607080102030405060708584001020304050607080102030405060708010203040506070801020304050607080102030405060708010203040506070801020304050607080102030405060708584001020304050607080102030405060708010203040506070801020304050607080102030405060708010203040506070801020304050607080102030405060708584001020304050607080102030405060708010203040506070801020304050607080102030405060708010203040506070801020304050607080102030405060708ff'
      );
    });

    it('can decode a big byte string (more than 64 bytes)', () => {
      const payload = [
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02,
        0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02,
        0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02,
        0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02,
        0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08
      ];

      const data = Cometa.cborToPlutusData(
        '5f584001020304050607080102030405060708010203040506070801020304050607080102030405060708010203040506070801020304050607080102030405060708584001020304050607080102030405060708010203040506070801020304050607080102030405060708010203040506070801020304050607080102030405060708584001020304050607080102030405060708010203040506070801020304050607080102030405060708010203040506070801020304050607080102030405060708584001020304050607080102030405060708010203040506070801020304050607080102030405060708010203040506070801020304050607080102030405060708ff'
      );
      expect([...(data as Uint8Array)]).toEqual(payload);
    });

    it('can decode/encode a list of big integers', () => {
      // Arrange

      const expectedPlutusData: Cometa.PlutusList = {
        items: [
          1_093_929_156_918_367_016_766_069_563_027_239_416_446_778_893_307_251_997_971_794_948_729_105_062_347_369_330_146_869_223_033_199_554_831_433_128_491_376_164_494_134_119_896_793_625_745_623_928_731_109_781_036_903_510_617_119_765_359_815_723_399_113_165_600_284_443_934_720n,
          2_768_491_094_397_106_413_284_351_268_798_781_278_061_973_163_918_667_373_508_176_781_108_678_876_832_888_565_950_388_553_255_499_815_619_207_549_146_245_084_281_150_783_450_096_035_638_439_655_721_496_227_482_399_093_555_200_000_000_000_000_000_000_000_000_000_000_000_000n,
          2_768_491_094_397_106_413_284_351_268_798_781_278_061_973_163_918_667_373_508_176_781_108_678_876_832_888_565_950_388_553_255_499_815_619_207_549_146_245_084_281_150_783_450_096_035_638_439_655_721_496_227_482_399_093_555_200_000_000_000_000_000_000_000_000_000_000_000_000n,
          1_127_320_948_699_467_529_606_464_548_687_160_198_167_487_105_208_190_997_153_720_362_564_942_186_550_892_230_582_242_980_573_812_448_057_150_419_530_802_096_156_402_677_128_058_112_319_272_573_039_196_273_296_535_693_983_366_369_964_092_325_725_072_645_646_768_416_006_720n,
          678_966_618_629_088_994_577_385_052_394_593_905_048_788_216_453_653_741_455_475_012_343_328_029_630_393_478_083_358_655_655_534_689_789_017_294_468_365_725_065_895_808_744_013_442_165_812_351_180_871_208_842_081_615_673_249_725_577_503_335_455_257_844_242_272_891_195_840n,
          1_337_829_155_615_373_710_780_861_189_358_723_839_738_261_900_670_472_008_493_768_766_460_943_065_914_931_970_040_774_692_071_540_815_257_661_221_428_415_268_570_880_739_215_388_841_910_028_989_315_213_224_986_535_176_632_464_067_341_466_233_795_236_134_699_058_357_952_960n,
          45_981_213_582_240_091_300_385_870_382_262_347_274_104_141_060_516_509_284_758_089_043_905_194_449_918_733_499_912_740_694_341_485_053_723_341_097_850_038_365_519_925_374_324_306_213_051_881_991_025_304_309_829_953_615_052_414_155_047_559_800_693_983_587_151_987_253_760n,
          2_413_605_787_847_473_064_058_493_109_882_761_763_812_632_923_885_676_112_901_376_523_745_345_875_592_342_323_079_462_001_682_936_368_998_782_686_824_629_943_810_471_167_748_859_099_323_567_551_094_056_876_663_897_197_968_204_837_564_889_906_128_763_937_156_053n
        ]
      };

      const expectedCbor =
        '9fc25f584037d34fac60a7dd2edba0c76fa58862c91c45ff4298e9134ba8e76be9a7513d88865bfdb9315073dc2690b0f2b59a232fbfa0a8a504df6ee9bb78e3f33fbdfef95529c9e74ff30ffe1bd1cc5795c37535899dba800000ffc25f58408d4820519e9bba2d6556c87b100709082f4c8958769899eb5d288b6f9ea9e0723df7211959860edea5829c9732422d25962e3945c68a6089f50a18b0114248b7555feea4851e9f099180600000000000000000000000ffc25f58408d4820519e9bba2d6556c87b100709082f4c8958769899eb5d288b6f9ea9e0723df7211959860edea5829c9732422d25962e3945c68a6089f50a18b0114248b7555feea4851e9f099180600000000000000000000000ffc25f584039878c5f4d4063e9a2ee75a3fbdd1492c3cad46f4ecbae977ac94b709a730e367edf9dae05acd59638d1dec25e2351c2eecb871694afae979de7085b522efe1355634138bbd920200d574cdf400324cdd1aafe10a240ffc25f584022a6282a7d960570c4c729decd677ec617061f0e501249c41f8724c89dc97dc0d24917bdb7a7ebd7c079c1c56fa21af0f119168966356ea384fb711cb766015e55bfc5bc86583f6a82ae605a93e7bf974ae74cd051c0ffc25f58404445ab8649611ee8f74a3c31e504a2f25f2f7631ef6ef828a405542904d84c997304b1b332d528ee54873b03cfb73cd3c5b35b91184f6846afccec7271bda8a05563ba46aed8c82611da47fd608d027447f8391161c0ffc25f58400258b535c4d4a22a483b22b2f5c5c65bed9e7de59266f6bbaa8997edf5bec6bb5d203641bb58d8ade1a3a5b4e5f923df502cf1e47691865fe1984eacef3be96a551ed585e070265db203a8866726bed053cb6c8aa200ffc25f5840021104310667ec434e9e2cd9fa71853593c42e1b55865ac49f80b2ea22beeec9b4a55e9545055a2bcde3a78d36836df11df0f91c1dae9a8aee58419b8650bc6c529361f9601a4005051b045d05f39a5f00ebd5ffff';
      // Act
      const actualPlutusData = Cometa.cborToPlutusData(expectedCbor);
      const actualCbor = Cometa.plutusDataToCbor(expectedPlutusData);

      // Assert
      expect((actualPlutusData as Cometa.PlutusList).items).toEqual(expectedPlutusData.items);
      expect(actualCbor).toEqual(expectedCbor);
    });
  });

  describe('List', () => {
    it('can encode an empty plutus list', () => {
      const data = Cometa.plutusDataToCbor({ items: [] });

      expect(data).toEqual('80');
    });

    it('can encode simple plutus list', () => {
      const data = Cometa.plutusDataToCbor({ items: [1n, 2n, 3n, 4n, 5n] });
      expect(data).toEqual('9f0102030405ff');
    });

    it('can encode a list of plutus list', () => {
      const outerList = Cometa.plutusDataToCbor({
        items: [1n, 2n, { items: [1n, 2n, 3n, 4n, 5n] }, { items: [1n, 2n, 3n, 4n, 5n] }, 5n]
      });

      expect(outerList).toEqual('9f01029f0102030405ff9f0102030405ff05ff');
    });
  });

  describe('Map', () => {
    it('can encode simple plutus map', () => {
      const cbor = Cometa.plutusDataToCbor({ entries: [{ key: 1n, value: 2n }] });
      expect(cbor).toEqual('a10102');
    });

    it('can encode a plutus map with multiple entries', () => {
      const cbor = Cometa.plutusDataToCbor({
        entries: [
          { key: 1n, value: 2n },
          { key: 3n, value: 4n },
          { key: 5n, value: 6n }
        ]
      });
      expect(cbor).toEqual('a3010203040506');
    });
  });

  describe('Constr', () => {
    it('can encode simple Constr', () => {
      const cbor = Cometa.plutusDataToCbor({ constructor: 0n, fields: { items: [1n, 2n, 3n, 4n, 5n] } });
      expect(cbor).toEqual('d8799f0102030405ff');
    });
  });

  describe('Deep equality', () => {
    it('Integer', () => {
      expect(Cometa.deepEqualsPlutusData(1n, 1n)).toBeTruthy();
    });

    it('Bytes', () => {
      expect(Cometa.deepEqualsPlutusData(new Uint8Array([0, 1, 2]), new Uint8Array([0, 1, 2]))).toBeTruthy();
      expect(Cometa.deepEqualsPlutusData(new Uint8Array([0, 1, 2]), new Uint8Array([0, 1]))).toBeFalsy();
    });

    it('PlutusList', () => {
      const list1 = { items: [1n, 2n, 3n] };
      const list2 = { items: [1n, 2n, 3n] };
      expect(Cometa.deepEqualsPlutusData(list1, list2)).toBeTruthy();
      expect(Cometa.deepEqualsPlutusData(list1, { items: [1n, 2n] })).toBeFalsy();
    });

    it('PlutusMap', () => {
      const map1 = {
        entries: [
          { key: 1n, value: 2n },
          { key: 3n, value: 4n }
        ]
      };
      const map2 = {
        entries: [
          { key: 1n, value: 2n },
          { key: 3n, value: 4n }
        ]
      };
      expect(Cometa.deepEqualsPlutusData(map1, map2)).toBeTruthy();

      expect(Cometa.deepEqualsPlutusData(map1, { entries: [{ key: 1n, value: 2n }] })).toBeFalsy();
    });

    it('Constr', () => {
      const constr1 = { constructor: 0n, fields: { items: [1n, 2n, 3n] } };
      const constr2 = { constructor: 0n, fields: { items: [1n, 2n, 3n] } };

      expect(Cometa.deepEqualsPlutusData(constr1, constr2)).toBeTruthy();
      expect(Cometa.deepEqualsPlutusData(constr1, { constructor: 0n, fields: { items: [1n, 2n] } })).toBeFalsy();
    });
  });

  describe('Predicates', () => {
    it('isPlutusDataWithCborCache', () => {
      const data = { cbor: '820102', items: [1n, 2n] };
      expect(Cometa.isPlutusDataWithCborCache(data)).toBeTruthy();
      expect(Cometa.isPlutusDataWithCborCache(123n)).toBeFalsy();
      expect(Cometa.isPlutusDataWithCborCache(new Uint8Array([0x01, 0x02]))).toBeFalsy();
      expect(Cometa.isPlutusDataWithCborCache({ items: [1n, 2n] })).toBeFalsy();
      expect(Cometa.isPlutusDataWithCborCache({ entries: [{ key: 1n, value: 2n }] })).toBeFalsy();
      expect(Cometa.isPlutusDataWithCborCache({ constructor: 0n, fields: { items: [1n, 2n] } })).toBeFalsy();
    });

    it('isPlutusDataByteArray', () => {
      const data = new Uint8Array([0x01, 0x02]);
      expect(Cometa.isPlutusDataByteArray(data)).toBeTruthy();
      expect(Cometa.isPlutusDataByteArray(123n)).toBeFalsy();
      expect(Cometa.isPlutusDataByteArray({ items: [1n, 2n] })).toBeFalsy();
      expect(Cometa.isPlutusDataByteArray({ entries: [{ key: 1n, value: 2n }] })).toBeFalsy();
      expect(Cometa.isPlutusDataByteArray({ constructor: 0n, fields: { items: [1n, 2n] } })).toBeFalsy();
    });

    it('isPlutusDataBigInt', () => {
      const data = 123n;
      expect(Cometa.isPlutusDataBigInt(data)).toBeTruthy();
      expect(Cometa.isPlutusDataBigInt(new Uint8Array([0x01, 0x02]))).toBeFalsy();
      expect(Cometa.isPlutusDataBigInt({ items: [1n, 2n] })).toBeFalsy();
      expect(Cometa.isPlutusDataBigInt({ entries: [{ key: 1n, value: 2n }] })).toBeFalsy();
      expect(Cometa.isPlutusDataBigInt({ constructor: 0n, fields: { items: [1n, 2n] } })).toBeFalsy();
    });

    it('isPlutusDataList', () => {
      const data = { items: [1n, 2n] };
      expect(Cometa.isPlutusDataList(data)).toBeTruthy();
      expect(Cometa.isPlutusDataList(123n)).toBeFalsy();
      expect(Cometa.isPlutusDataList(new Uint8Array([0x01, 0x02]))).toBeFalsy();
      expect(Cometa.isPlutusDataList({ entries: [{ key: 1n, value: 2n }] })).toBeFalsy();
      expect(Cometa.isPlutusDataList({ constructor: 0n, fields: { items: [1n, 2n] } })).toBeFalsy();
    });

    it('isPlutusDataMap', () => {
      const data = { entries: [{ key: 1n, value: 2n }] };
      expect(Cometa.isPlutusDataMap(data)).toBeTruthy();
      expect(Cometa.isPlutusDataMap(123n)).toBeFalsy();
      expect(Cometa.isPlutusDataMap(new Uint8Array([0x01, 0x02]))).toBeFalsy();
      expect(Cometa.isPlutusDataMap({ items: [1n, 2n] })).toBeFalsy();
      expect(Cometa.isPlutusDataMap({ constructor: 0n, fields: { items: [1n, 2n] } })).toBeFalsy();
    });

    it('isPlutusDataConstr', () => {
      const data = { constructor: 0n, fields: { items: [1n, 2n] } };
      expect(Cometa.isPlutusDataConstr(data)).toBeTruthy();
      expect(Cometa.isPlutusDataConstr(123n)).toBeFalsy();
      expect(Cometa.isPlutusDataConstr(new Uint8Array([0x01, 0x02]))).toBeFalsy();
      expect(Cometa.isPlutusDataConstr({ items: [1n, 2n] })).toBeFalsy();
      expect(Cometa.isPlutusDataConstr({ entries: [{ key: 1n, value: 2n }] })).toBeFalsy();
    });
  });
});
