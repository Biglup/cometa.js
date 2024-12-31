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

/* IMPORTS ********************************************************************/

import * as Cometa from '../../dist/cjs';

/* TESTS **********************************************************************/

const validTestVectors = [
  {
    encoded: 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x',
    hex: '019493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251',
    hrp: 'addr'
  },
  {
    encoded: 'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu80w',
    hex: '6079467c69a9ac66280174d09d62575ba955748b21dec3b483a9469a65',
    hrp: 'addr'
  },
  {
    encoded: 'stake1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5egfu2p0u',
    hex: '6079467c69a9ac66280174d09d62575ba955748b21dec3b483a9469a65',
    hrp: 'stake'
  },
  {
    encoded: 'addr1z8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gten0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs9yc0hh',
    hex: '11c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251',
    hrp: 'addr'
  },
  {
    encoded: 'addr1yx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerkr0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs2z78ve',
    hex: '219493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8ec37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f',
    hrp: 'addr'
  },
  {
    encoded: 'addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g',
    hex: '31c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542fc37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f',
    hrp: 'addr'
  },
  {
    encoded: 'addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5pnz75xxcrzqf96k',
    hex: '419493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e8198bd431b03',
    hrp: 'addr'
  },
  {
    encoded: 'addr128phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtupnz75xxcrtw79hu',
    hex: '51c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f8198bd431b03',
    hrp: 'addr'
  },
  {
    encoded: 'addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8',
    hex: '619493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e',
    hrp: 'addr'
  },
  {
    encoded: 'addr1w8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcyjy7wx',
    hex: '71c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f',
    hrp: 'addr'
  },
  {
    encoded: 'stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gh6ffgw',
    hex: 'e1337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251',
    hrp: 'stake'
  },
  {
    encoded:
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs68faae',
    hex: '009493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251',
    hrp: 'addr_test'
  },
  {
    encoded:
      'addr_test1zrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gten0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgsxj90mg',
    hex: '10c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251',
    hrp: 'addr_test'
  },
  {
    encoded:
      'addr_test1yz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerkr0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shsf5r8qx',
    hex: '209493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8ec37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f',
    hrp: 'addr_test'
  },
  {
    encoded:
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh',
    hex: '30c37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542fc37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f',
    hrp: 'addr_test'
  }
];

const invalidTestVectors = [
  'tc1qw508d6qejxtdg4y5r3zarvary0c5xw7kg3g4ty',
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5',
  'BC13W508D6QEJXTDG4Y5R3ZARVARY0C5XW7KN40WF2',
  'bc1rw5uspcuh',
  'bc10w508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kw5rljs90',
  'BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9P',
  'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sL5k7',
  'stake_test1uyuqtqq84v9jrqm0asptaehtw7srrr7cnwuxyqz38a6e8scm6lcf3',
  'addr_test1qxkmuf2gqzsm5ejxm2amrwuq3pcc02cw6tttgsgqgafj46klskg5jjufdyf4znw8sjn37enwn5ge5l66qsx8srrpg3tq8du7us',
  'stake1ur84236ycjkxvt0r5l7tdqaatlhhec0hrpncqlv5gp58e0q2ajrqx',
  'addr1qznd7jmvw2a53ykmgg5c6dcqd9f35mtts77zf57wn6ern5x024r5f39vvck78fluk6pm6hl00nslwxr8sp7egsrg0j7q8y2a9d',
  'BC1QR508D6QEJXTdg4y5r3zarvaryv98gj9p',
  '21ibccqr508d6qejxtdg4y5r3zarvar98gj9p',
  'BCCQR508D6QEJXTdg4y5r3zarvaryv98gj9p',
  '2'
];

describe('Bech32', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('decode', () => {
    test.each(validTestVectors)('decodes valid Bech32 strings: %s', ({ encoded, hrp, hex }) => {
      const result = Cometa.Bech32.decode(encoded);

      expect(result.hrp).toBe(hrp);
      expect(result.hex).toBe(hex);
    });

    test.each(invalidTestVectors)('throws an error for invalid Bech32 strings: %s', (encoded) => {
      expect(() => Cometa.Bech32.decode(encoded)).toThrowError('Bech32 decoding failed');
    });
  });

  describe('encode', () => {
    test.each(validTestVectors)('encodes valid data to Bech32 strings: %s', ({ encoded, hrp, hex }) => {
      const binaryData = Buffer.from(hex, 'hex');
      const result = Cometa.Bech32.encode(hrp, binaryData);

      expect(result).toBe(encoded);
    });
  });
});
