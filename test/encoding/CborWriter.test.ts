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

import { Cometa } from '../../dist/cjs';

/* TESTS **********************************************************************/

// Data points taken from https://tools.ietf.org/html/rfc7049#appendix-A
// Additional pairs generated using http://cbor.me/

describe('CborWriter', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('Array', () => {
    it('can write an empty fixed size array', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray(0);

      expect(writer.encodeHex()).toEqual('80');
    });

    it('can write fixed size array with an unsigned number', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray(1);
      writer.writeInt(42);

      expect(writer.encodeHex()).toEqual('81182a');
    });

    it('can write a fixed size array with several unsigned numbers', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray(25);

      for (let i = 0; i < 25; ++i) {
        writer.writeInt(i + 1);
      }

      expect(writer.encodeHex()).toEqual('98190102030405060708090a0b0c0d0e0f101112131415161718181819');
    });

    it('can write a fixed size array with mixed types', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray(4);
      writer.writeInt(1);
      writer.writeInt(-1);
      writer.writeTextString('');
      writer.writeByteString(new Uint8Array([7]));

      expect(writer.encodeHex()).toEqual('840120604107');
    });

    it('can write a fixed size array of strings', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray(3);
      writer.writeTextString('lorem');
      writer.writeTextString('ipsum');
      writer.writeTextString('dolor');

      expect(writer.encodeHex()).toEqual('83656c6f72656d65697073756d65646f6c6f72');
    });

    it('can write a fixed size array of simple values', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray(2);
      writer.writeBoolean(false);
      writer.writeNull();

      expect(writer.encodeHex()).toEqual('82f4f6');
    });

    it('can write a fixed size array with nested values', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray(3);
      writer.writeInt(1);
      writer.startArray(2);
      writer.writeInt(2);
      writer.writeInt(3);
      writer.startArray(2);
      writer.writeInt(4);
      writer.writeInt(5);

      expect(writer.encodeHex()).toEqual('8301820203820405');
    });

    it('can write an empty indefinite length array', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray();
      writer.endArray();

      expect(writer.encodeHex()).toEqual('9fff');
    });

    it('can write an indefinite length array with an unsigned number', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray();
      writer.writeInt(42);
      writer.endArray();

      expect(writer.encodeHex()).toEqual('9f182aff');
    });

    it('can read indefinite length array with several unsigned numbers', async () => {
      const writer = new Cometa.CborWriter();

      writer.startArray();

      for (let i = 0; i < 25; ++i) {
        writer.writeInt(i + 1);
      }

      writer.endArray();

      expect(writer.encodeHex()).toEqual('9f0102030405060708090a0b0c0d0e0f101112131415161718181819ff');
    });
  });

  describe('ByteString', () => {
    it('can write an empty fixed size ByteString', async () => {
      const writer = new Cometa.CborWriter();

      writer.writeByteString(new Uint8Array([]));

      expect(writer.encodeHex()).toEqual('40');
    });

    it('can write a non empty fixed size ByteString', async () => {
      let writer = new Cometa.CborWriter();

      writer.writeByteString(new Uint8Array([0x01, 0x02, 0x03, 0x04]));

      expect(writer.encodeHex()).toEqual('4401020304');

      writer = new Cometa.CborWriter();

      const array = new Uint8Array(14);

      for (let i = 0; i < 14; ++i) array[i] = 0xff;

      writer.writeByteString(array);

      expect(writer.encodeHex()).toEqual('4effffffffffffffffffffffffffff');
    });
  });

  describe('Integer', () => {
    it('can write unsigned integers', async () => {
      expect(new Cometa.CborWriter().writeInt(0).encodeHex()).toEqual('00');
      expect(new Cometa.CborWriter().writeInt(1).encodeHex()).toEqual('01');
      expect(new Cometa.CborWriter().writeInt(10).encodeHex()).toEqual('0a');
      expect(new Cometa.CborWriter().writeInt(23).encodeHex()).toEqual('17');
      expect(new Cometa.CborWriter().writeInt(24).encodeHex()).toEqual('1818');
      expect(new Cometa.CborWriter().writeInt(25).encodeHex()).toEqual('1819');
      expect(new Cometa.CborWriter().writeInt(100).encodeHex()).toEqual('1864');
      expect(new Cometa.CborWriter().writeInt(1000).encodeHex()).toEqual('1903e8');
      expect(new Cometa.CborWriter().writeInt(1_000_000).encodeHex()).toEqual('1a000f4240');
      expect(new Cometa.CborWriter().writeInt(1_000_000_000_000).encodeHex()).toEqual('1b000000e8d4a51000');
      expect(new Cometa.CborWriter().writeInt(255).encodeHex()).toEqual('18ff');
      expect(new Cometa.CborWriter().writeInt(256).encodeHex()).toEqual('190100');
      expect(new Cometa.CborWriter().writeInt(4_294_967_295).encodeHex()).toEqual('1affffffff');
      expect(new Cometa.CborWriter().writeInt(9_223_372_036_854_775_807n).encodeHex()).toEqual('1b7fffffffffffffff');
      expect(new Cometa.CborWriter().writeInt(4_294_967_296).encodeHex()).toEqual('1b0000000100000000');
      expect(new Cometa.CborWriter().writeInt(65_535).encodeHex()).toEqual('19ffff');
      expect(new Cometa.CborWriter().writeInt(65_536).encodeHex()).toEqual('1a00010000');
    });

    it('can write negative integers', async () => {
      expect(new Cometa.CborWriter().writeInt(-1).encodeHex()).toEqual('20');
      expect(new Cometa.CborWriter().writeInt(-10).encodeHex()).toEqual('29');
      expect(new Cometa.CborWriter().writeInt(-24).encodeHex()).toEqual('37');
      expect(new Cometa.CborWriter().writeInt(-100).encodeHex()).toEqual('3863');
      expect(new Cometa.CborWriter().writeInt(-1000).encodeHex()).toEqual('3903e7');
      expect(new Cometa.CborWriter().writeInt(-256).encodeHex()).toEqual('38ff');
      expect(new Cometa.CborWriter().writeInt(-257).encodeHex()).toEqual('390100');
      expect(new Cometa.CborWriter().writeInt(-65_536).encodeHex()).toEqual('39ffff');
      expect(new Cometa.CborWriter().writeInt(-65_537).encodeHex()).toEqual('3a00010000');
      expect(new Cometa.CborWriter().writeInt(-4_294_967_296).encodeHex()).toEqual('3affffffff');
      expect(new Cometa.CborWriter().writeInt(-4_294_967_297).encodeHex()).toEqual('3b0000000100000000');
      expect(new Cometa.CborWriter().writeInt(-9_223_372_036_854_775_808n).encodeHex()).toEqual('3b7fffffffffffffff');
    });
  });

  describe('Simple', () => {
    it('can write null values', async () => {
      expect(new Cometa.CborWriter().writeNull().encodeHex()).toEqual('f6');
    });

    it('can read boolean values', async () => {
      expect(new Cometa.CborWriter().writeBoolean(false).encodeHex()).toEqual('f4');
      expect(new Cometa.CborWriter().writeBoolean(true).encodeHex()).toEqual('f5');
    });
  });

  describe('Tag', () => {
    it('can write single tagged string value', async () => {
      const writer = new Cometa.CborWriter();

      writer.writeTag(Cometa.CborTag.DateTimeString);
      writer.writeTextString('2013-03-21T20:04:00Z');

      expect(writer.encodeHex()).toEqual('c074323031332d30332d32315432303a30343a30305a');
    });

    it('can write single tagged unix time seconds value', async () => {
      const writer = new Cometa.CborWriter();

      writer.writeTag(Cometa.CborTag.UnixTimeSeconds);
      writer.writeInt(1_363_896_240);

      expect(writer.encodeHex()).toEqual('c11a514b67b0');
    });

    it('can write single tagged unsigned bignum value', async () => {
      const writer = new Cometa.CborWriter();

      writer.writeTag(Cometa.CborTag.UnsignedBigNum);
      writer.writeInt(2n);

      expect(writer.encodeHex()).toEqual('c202');
    });

    it('can write single tagged base 16 value', async () => {
      const writer = new Cometa.CborWriter();

      writer.writeTag(Cometa.CborTag.Base16StringLaterEncoding);
      writer.writeByteString(new Uint8Array([1, 2, 3, 4]));

      expect(writer.encodeHex()).toEqual('d74401020304');
    });

    it('can write single tagged uri value', async () => {
      const writer = new Cometa.CborWriter();

      writer.writeTag(Cometa.CborTag.Uri);
      writer.writeTextString('http://www.example.com');

      expect(writer.encodeHex()).toEqual('d82076687474703a2f2f7777772e6578616d706c652e636f6d');
    });

    it('can write nested tagged values', async () => {
      const writer = new Cometa.CborWriter();

      writer.writeTag(Cometa.CborTag.DateTimeString);
      writer.writeTag(Cometa.CborTag.DateTimeString);
      writer.writeTag(Cometa.CborTag.DateTimeString);

      writer.writeTextString('2013-03-21T20:04:00Z');

      expect(writer.encodeHex()).toEqual('c0c0c074323031332d30332d32315432303a30343a30305a');
    });
  });

  describe('TextString', () => {
    it('can write fixed length text strings', async () => {
      expect(new Cometa.CborWriter().writeTextString('').encodeHex()).toEqual('60');
      expect(new Cometa.CborWriter().writeTextString('a').encodeHex()).toEqual('6161');
      expect(new Cometa.CborWriter().writeTextString('IETF').encodeHex()).toEqual('6449455446');
      expect(new Cometa.CborWriter().writeTextString('"\\').encodeHex()).toEqual('62225c');
      expect(new Cometa.CborWriter().writeTextString('\u00FC').encodeHex()).toEqual('62c3bc');
      expect(new Cometa.CborWriter().writeTextString('\u6C34').encodeHex()).toEqual('63e6b0b4');
      expect(new Cometa.CborWriter().writeTextString('\u03BB').encodeHex()).toEqual('62cebb');
      expect(new Cometa.CborWriter().writeTextString('\uD800\uDD51').encodeHex()).toEqual('64f0908591');
    });
  });

  describe('Map', () => {
    it('can write empty maps', async () => {
      const writer = new Cometa.CborWriter();

      writer.startMap(0);

      expect(writer.encodeHex()).toEqual('a0');
    });

    it('can write fixed length maps with numbers', async () => {
      const writer = new Cometa.CborWriter();

      writer.startMap(2);
      // Key.Val
      writer.writeInt(1).writeInt(2);
      writer.writeInt(3).writeInt(4);

      expect(writer.encodeHex()).toEqual('a201020304');
    });

    it('can write fixed length maps with strings', async () => {
      const writer = new Cometa.CborWriter();

      writer.startMap(5);
      // Key.Val
      writer.writeTextString('a').writeTextString('A');
      writer.writeTextString('b').writeTextString('B');
      writer.writeTextString('c').writeTextString('C');
      writer.writeTextString('d').writeTextString('D');
      writer.writeTextString('e').writeTextString('E');

      expect(writer.encodeHex()).toEqual('a56161614161626142616361436164614461656145');
    });

    it('can write fixed length maps with mixed types', async () => {
      const writer = new Cometa.CborWriter();

      writer.startMap(3);
      writer.writeTextString('a');
      writer.writeTextString('A');
      writer.writeInt(-1);
      writer.writeInt(2);
      writer.writeByteString(new Uint8Array([]));
      writer.writeByteString(new Uint8Array([1]));

      expect(writer.encodeHex()).toEqual('a3616161412002404101');
    });

    it('can write fixed length maps with nested types', async () => {
      const writer = new Cometa.CborWriter();

      writer.startMap(2);

      writer.writeTextString('a');
      writer.startMap(1);
      writer.writeInt(2);
      writer.writeInt(3);

      writer.writeTextString('b');
      writer.startMap(2);
      writer.writeTextString('x');
      writer.writeInt(-1);
      writer.writeTextString('y');
      writer.startMap(1);
      writer.writeTextString('z');
      writer.writeInt(0);

      expect(writer.encodeHex()).toEqual('a26161a102036162a26178206179a1617a00');
    });

    it('can write empty indefinite length maps', async () => {
      const writer = new Cometa.CborWriter();

      writer.startMap();
      writer.endMap();

      expect(writer.encodeHex()).toEqual('bfff');
    });

    it('can write indefinite length maps', async () => {
      const writer = new Cometa.CborWriter();

      writer.startMap();

      // Key.Val
      writer.writeTextString('a');
      writer.writeTextString('A');
      writer.writeTextString('b');
      writer.writeTextString('B');
      writer.writeTextString('c');
      writer.writeTextString('C');
      writer.writeTextString('d');
      writer.writeTextString('D');
      writer.writeTextString('e');
      writer.writeTextString('E');

      writer.endMap();

      expect(writer.encodeHex()).toEqual('bf6161614161626142616361436164614461656145ff');
    });

    it('can write indefinite length maps with mixed types', async () => {
      const writer = new Cometa.CborWriter();

      writer.startMap();
      writer.writeTextString('a');
      writer.writeTextString('A');
      writer.writeInt(-1);
      writer.writeInt(2);
      writer.writeByteString(new Uint8Array([]));
      writer.writeByteString(new Uint8Array([1]));
      writer.endMap();

      expect(writer.encodeHex()).toEqual('bf616161412002404101ff');
    });
  });
});
