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

/* DEFINITIONS ****************************************************************/

/**
 * Represents CBOR Major Types as defined in RFC7049 section 2.1.
 */
export enum CborMajorType {
  /**
   * An unsigned integer in the range 0..2^64-1 inclusive.
   * The value of the encoded item is the argument itself.
   */
  UnsignedInteger = 0,

  /**
   * A negative integer in the range -2^64..-1 inclusive.
   * The value of the item is -1 minus the argument.
   */
  NegativeInteger = 1,

  /**
   * A byte string.
   * The number of bytes in the string is equal to the argument.
   */
  ByteString = 2,

  /**
   * A UTF-8 encoded text string.
   * The number of bytes in the string is equal to the argument.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc3629 RFC3629}
   */
  Utf8String = 3,

  /**
   * An array of data items.
   * Arrays are also called lists, sequences, or tuples in other formats.
   * (Note: A "CBOR sequence" is slightly different as described in RFC8742.)
   * The argument is the number of data items in the array.
   */
  Array = 4,

  /**
   * A map of pairs of data items.
   * Maps are also called tables, dictionaries, hashes, or objects (in JSON).
   * The argument represents the number of key-value pairs in the map.
   */
  Map = 5,

  /**
   * A tagged data item ("tag").
   * The tag number is an integer in the range 0..2^64-1 inclusive, and the enclosed data item (tag content)
   * is the single encoded data item that follows the tag.
   */
  Tag = 6,

  /**
   * Simple values, floating-point numbers, and the "break" stop code.
   */
  Simple = 7
}
