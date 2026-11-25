/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS ********************************************************************/

import { NetworkMagic, Redeemer, RedeemerPurpose, TxIn, UTxO, UnitInterval } from '../../common';
import { getModule } from '../../module';
import { readBlake2bHashData, readRedeemersFromTx, readTransactionFromCbor, unrefObject } from '../../marshaling';
import { uint8ArrayToHex } from '../../cometa';

/* DEFINITIONS ****************************************************************/

const hexBytesPattern = /^(?:[a-fA-F0-9]{2})+$/;
const integerPattern = /^-?(?:0|[1-9]\d*)$/;
const ratioPattern = /^\d+\/\d+$/;
const decimalPattern = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/** @internal Reject malformed responses without including remote content. */
export const invalid = (): never => {
  throw new Error('Invalid provider response');
};

/** @internal Require a JSON object. */
export const object = (value: unknown): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
};

/** @internal Require a JSON array. */
export const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : invalid());

/** @internal Require a string. */
export const string = (value: unknown): string => (typeof value === 'string' ? value : invalid());

/** @internal Require nonempty hexadecimal bytes, optionally of an exact length. */
export const hex = (value: unknown, bytes?: number): string => {
  const result = string(value);
  if (!hexBytesPattern.test(result) || (bytes !== undefined && result.length !== bytes * 2)) return invalid();
  return result.toLowerCase();
};

/** @internal Read a bounded exact integer, including JSON numeric strings. */
export const integer = (value: unknown, minimum = 0n, maximum = 18446744073709551615n): bigint => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return invalid();
  if (!['number', 'string', 'bigint'].includes(typeof value) || !integerPattern.test(String(value))) return invalid();
  const result = BigInt(String(value));
  return result >= minimum && result <= maximum ? result : invalid();
};

/** @internal Respect the public number representation rather than rounding. */
export const natural = (value: unknown): number => Number(integer(value, 0n, BigInt(Number.MAX_SAFE_INTEGER)));

/** @internal Expand bounded scientific notation without floating-point rounding. */
const decimalRatio = (text: string): [bigint, bigint] => {
  const [mantissa, scale] = text.toLowerCase().split('e');
  const exponent = scale === undefined ? 0 : Number(scale);
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) return invalid();
  const parts = mantissa.split('.');
  let denominator = 10n ** BigInt(parts[1]?.length ?? 0);
  let numerator = BigInt(parts[0]) * denominator + BigInt(parts[1] ?? '0');
  if (exponent > 0) numerator *= 10n ** BigInt(exponent);
  else denominator *= 10n ** BigInt(-exponent);
  return [numerator, denominator];
};

/** @internal Parse exact ratios or decimal prices; reject zero denominators. */
export const ratio = (value: unknown): UnitInterval => {
  const text = String(value);
  if (text.length > 100) return invalid();
  let numerator: bigint;
  let denominator: bigint;
  if (ratioPattern.test(text)) {
    const parts = text.split('/');
    numerator = BigInt(parts[0]);
    denominator = BigInt(parts[1]);
  } else if (decimalPattern.test(text)) {
    [numerator, denominator] = decimalRatio(text);
  } else return invalid();
  if (denominator === 0n) return invalid();
  let a = numerator;
  let b = denominator;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return { denominator: natural(denominator / a), numerator: natural(numerator / a) };
};

/** @internal Translate only supported network identities; never infer from URL text. */
export const networkName = (network: NetworkMagic): string => {
  switch (network) {
    case NetworkMagic.Mainnet:
      return 'mainnet';
    case NetworkMagic.Preprod:
      return 'preprod';
    case NetworkMagic.Preview:
      return 'preview';
    default:
      throw new Error('Unsupported provider network');
  }
};

/** @internal Validate an input identity. */
export const input = (id: unknown, index: unknown): TxIn => ({
  index: Number(integer(index, 0n, 65535n)),
  txId: hex(id, 32)
});

/** @internal Stable identity for deduplication and resolution. */
export const inputKey = (value: TxIn): string => `${value.txId}#${value.index}`;

/** @internal Check unique outputs, including across pagination boundaries. */
export const uniqueOutputs = (values: UTxO[]): UTxO[] => {
  const seen = new Set<string>();
  for (const value of values) {
    const key = inputKey(value.input);
    if (seen.has(key)) return invalid();
    seen.add(key);
  }
  return values;
};

/** @internal Preserve requested order, omit missing outputs, reject extraneous results. */
export const resolveOrder = (requested: TxIn[], found: UTxO[]): UTxO[] => {
  const keys = new Set(requested.map((item) => inputKey(input(item.txId, item.index))));
  const indexed = new Map(uniqueOutputs(found).map((item) => [inputKey(item.input), item]));
  for (const key of indexed.keys()) if (!keys.has(key)) return invalid();
  return [...keys].flatMap((key) => {
    const value = indexed.get(key);
    return value ? [value] : [];
  });
};

/** @internal Decode and hash the original transaction body through the native library. */
export const transactionId = (cbor: string): string => {
  const transaction = readTransactionFromCbor(hex(cbor));
  try {
    return uint8ArrayToHex(readBlake2bHashData(getModule().transaction_get_id(transaction)));
  } finally {
    unrefObject(transaction);
  }
};

/** @internal Decode one budget without losing its purpose/index identity. */
const budget = (value: unknown): Omit<Redeemer, 'data'> => {
  const tags: Record<string, RedeemerPurpose> = {
    mint: RedeemerPurpose.mint,
    propose: RedeemerPurpose.propose,
    publish: RedeemerPurpose.certificate,
    spend: RedeemerPurpose.spend,
    vote: RedeemerPurpose.vote,
    withdraw: RedeemerPurpose.withdrawal
  };
  const row = object(value);
  const validator = object(row.validator);
  const units = object(row.budget);
  return {
    executionUnits: {
      memory: natural(units.memory),
      steps: natural(units.cpu)
    },
    index: natural(validator.index),
    purpose: tags[string(validator.purpose)]
  };
};

/** @internal Join all and only the returned budgets to original redeemers. */
export const evaluation = (cbor: string, budgets: unknown[]): Redeemer[] => {
  const redeemers = readRedeemersFromTx(cbor);
  const pending = new Map(redeemers.map((item) => [`${item.purpose}:${item.index}`, item]));
  const result: Redeemer[] = [];
  for (const value of budgets) {
    const { purpose, index, executionUnits } = budget(value);
    const key = `${purpose}:${index}`;
    const original = pending.get(key);
    if (!purpose || !original) return invalid();
    pending.delete(key);
    result.push({
      ...original,
      executionUnits
    });
  }
  if (pending.size > 0) return invalid();
  const indexed = new Map(result.map((item) => [`${item.purpose}:${item.index}`, item]));
  return redeemers.map((item) => indexed.get(`${item.purpose}:${item.index}`) ?? invalid());
};
