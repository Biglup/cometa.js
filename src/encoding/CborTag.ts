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
 * Represents a CBOR semantic tag (major type 6).
 */
export enum CborTag {
  /**
   * Tag value for RFC3339 date/time strings.
   * Indicates a date/time string in ISO 8601 format.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc3339 RFC3339}
   */
  DateTimeString = 0,

  /**
   * Tag value for Epoch-based date/time strings.
   * Represents the number of seconds since the Unix epoch (1970-01-01T00:00:00Z).
   */
  UnixTimeSeconds = 1,

  /**
   * Tag value for unsigned bignum encodings.
   * Represents large positive integers that cannot fit in native integer types.
   */
  UnsignedBigNum = 2,

  /**
   * Tag value for negative bignum encodings.
   * Represents large negative integers that cannot fit in native integer types.
   */
  NegativeBigNum = 3,

  /**
   * Tag value for decimal fraction encodings.
   * Used to represent fractional numbers with a base-10 exponent and mantissa.
   */
  DecimalFraction = 4,

  /**
   * Tag value for big float encodings.
   * Used to represent floating-point numbers with extended precision.
   */
  BigFloat = 5,

  /**
   * Tag value for byte strings, meant for later encoding to a base64url string representation.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc4648 RFC4648}
   */
  Base64UrlLaterEncoding = 21,

  /**
   * Tag value for byte strings, meant for later encoding to a base64 string representation.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc4648 RFC4648}
   */
  Base64StringLaterEncoding = 22,

  /**
   * Tag value for byte strings, meant for later encoding to a base16 string representation.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc4648 RFC4648}
   */
  Base16StringLaterEncoding = 23,

  /**
   * Tag value for byte strings containing embedded CBOR data item encodings.
   * This allows the inclusion of pre-encoded CBOR data within a CBOR structure.
   */
  EncodedCborDataItem = 24,

  /**
   * Tag value for Rational numbers.
   * Represents rational numbers as defined in CBOR rational encoding.
   * @see {@link http://peteroupc.github.io/CBOR/rational.html CBOR Rational Numbers}
   */
  RationalNumber = 30,

  /**
   * Tag value for URI strings.
   * Indicates a URI string as defined in RFC3986.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc3986 RFC3986}
   */
  Uri = 32,

  /**
   * Tag value for base64url-encoded text strings.
   * Encodes binary data as text in base64url format as defined in RFC4648.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc4648 RFC4648}
   */
  Base64Url = 33,

  /**
   * Tag value for base64-encoded text strings.
   * Encodes binary data as text in base64 format as defined in RFC4648.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc4648 RFC4648}
   */
  Base64 = 34,

  /**
   * Tag value for regular expressions.
   * Represents regular expressions in Perl Compatible Regular Expressions (PCRE) or JavaScript syntax.
   */
  Regex = 35,

  /**
   * Tag value for MIME messages.
   * Includes the full MIME message with all headers as defined in RFC2045.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc2045 RFC2045}
   */
  MimeMessage = 36,

  /**
   * Tag value for sets.
   * Represents CBOR sets: `set<a> = #6.258([* a]) / [* a]`,
   * `nonempty_set<a> = #6.258([+ a]) / [+ a]`,
   * `nonempty_oset<a> = #6.258([+ a]) / [+ a]`.
   */
  Set = 258,

  /**
   * Tag value for the Self-Describe CBOR header (0xd9d9f7).
   * Indicates that the data that follows is a CBOR data item.
   */
  SelfDescribeCbor = 55_799
}
