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

describe('Cip8', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('Can sign using an address', () => {
    const message = new Uint8Array([0xab, 0xc1, 0x23]);
    const privateKey = Cometa.Ed25519PrivateKey.fromExtendedHex(
      'd06d3744d9089b21b1fbb736a45d359ed5d5b4028800e70aa1a2968183cb68528ef06f1c2b289a85e09738d528869dd1f69f436ada4b471b12e950a2b9e780b6'
    );
    const address = Cometa.Address.fromString(
      'addr_test1qqja52pwpq7v7amg34r6x9dpp5le04n6cmqf2zpnurt2lm48wgx7j5cur9w0zxv7ky333eef3akg092hhcmp3teeth3qktnslv'
    );

    const { coseKey, coseSign1 } = Cometa.Cip8.sign(message, address, privateKey);
    expect(Cometa.uint8ArrayToHex(coseKey)).toEqual(
      'a501010258390025da282e083ccf77688d47a315a10d3f97d67ac6c0950833e0d6afeea7720de9531c195cf1199eb12318e7298f6c879557be3618af395de20327200621582088cb67866b59520bffcfe9c421ef5d9e0db88815637796f597d3305126c8c78c'
    );
    expect(Cometa.uint8ArrayToHex(coseSign1)).toEqual(
      '845882a301270458390025da282e083ccf77688d47a315a10d3f97d67ac6c0950833e0d6afeea7720de9531c195cf1199eb12318e7298f6c879557be3618af395de2676164647265737358390025da282e083ccf77688d47a315a10d3f97d67ac6c0950833e0d6afeea7720de9531c195cf1199eb12318e7298f6c879557be3618af395de2a166686173686564f443abc1235840cf4f8356899ef40f4c21869b50a3d5dc95414a8d3c1aae088b7518a65069cdf841331877c16f11f6a88bbfe402e8fbb338a5646ff2d931d5e955c6717cf1c404'
    );
  });

  it('Can sign using a public key hash', () => {
    const message = new Uint8Array([0xab, 0xc1, 0x23]);
    const privateKey = Cometa.Ed25519PrivateKey.fromExtendedHex(
      'd06d3744d9089b21b1fbb736a45d359ed5d5b4028800e70aa1a2968183cb68528ef06f1c2b289a85e09738d528869dd1f69f436ada4b471b12e950a2b9e780b6'
    );
    const keyHash = Cometa.hexToUint8Array('25da282e083ccf77688d47a315a10d3f97d67ac6c0950833e0d6afee');

    const { coseKey, coseSign1 } = Cometa.Cip8.signEx(message, keyHash, privateKey);
    expect(Cometa.uint8ArrayToHex(coseKey)).toEqual(
      'a5010102581c25da282e083ccf77688d47a315a10d3f97d67ac6c0950833e0d6afee0327200621582088cb67866b59520bffcfe9c421ef5d9e0db88815637796f597d3305126c8c78c'
    );
    expect(Cometa.uint8ArrayToHex(coseSign1)).toEqual(
      '845848a3012704581c25da282e083ccf77688d47a315a10d3f97d67ac6c0950833e0d6afee676b657948617368581c25da282e083ccf77688d47a315a10d3f97d67ac6c0950833e0d6afeea166686173686564f443abc123584021b71bfddb8794a41f6420c70968085b8bc4ca61d55980da8378eac2ceb9531efff499fd7f111a1f8d64674246aeddbfc4aed82c79f9f6cfa7f66b4a791b5c04'
    );
  });
});
