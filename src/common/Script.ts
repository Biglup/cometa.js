/* eslint-disable no-use-before-define */
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

/* IMPORTS **************************************************************/

import { Address, CredentialType, EnterpriseAddress, NetworkId } from '../address';
import { CborReader, CborWriter } from '../encoding';
import { assertSuccess, readBlake2bHashData, readScript, unrefObject, writeScript } from '../marshaling';
import { getModule } from '../module';
import { uint8ArrayToHex } from '../cometa';

/* DEFINITIONS **********************************************************/

/** Plutus script type. */
export enum ScriptType {
  Native = 'native',
  Plutus = 'plutus'
}

/** native script kind. */
export enum NativeScriptKind {
  RequireSignature = 0,
  RequireAllOf = 1,
  RequireAnyOf = 2,
  RequireNOf = 3,
  RequireTimeAfter = 4,
  RequireTimeBefore = 5
}

/**
 * This script evaluates to true if the transaction also includes a valid key witness
 * where the witness verification key hashes to the given hash.
 *
 * In other words, this checks that the transaction is signed by a particular key, identified by its verification
 * key hash.
 */
export interface RequireSignatureScript {
  /** Script type. */
  type: ScriptType.Native;

  /** The hash of a verification key. */
  keyHash: string;

  /** The native script kind. */
  kind: NativeScriptKind.RequireSignature;
}

/**
 * This script evaluates to true if  all the sub-scripts evaluate to true.
 *
 * If the list of sub-scripts is empty, this script evaluates to true.
 */
export interface RequireAllOfScript {
  /** Script type. */
  type: ScriptType.Native;

  /** The list of sub-scripts. */
  scripts: NativeScript[];

  /** The native script kind. */
  kind: NativeScriptKind.RequireAllOf;
}

/**
 * This script evaluates to true if any the sub-scripts evaluate to true. That is, if one
 * or more evaluate to true.
 *
 * If the list of sub-scripts is empty, this script evaluates to false.
 */
export interface RequireAnyOfScript {
  /** Script type. */
  type: ScriptType.Native;

  /** The list of sub-scripts. */
  scripts: NativeScript[];

  /** The native script kind. */
  kind: NativeScriptKind.RequireAnyOf;
}

/** This script evaluates to true if at least M (required field) of the sub-scripts evaluate to true. */
export interface RequireAtLeastScript {
  /** Script type. */
  type: ScriptType.Native;

  /** The number of sub-scripts that must evaluate to true for this script to evaluate to true. */
  required: number;

  /** The list of sub-scripts. */
  scripts: NativeScript[];

  /** The native script kind. */
  kind: NativeScriptKind.RequireNOf;
}

/**
 * This script evaluates to true if the upper bound of the transaction validity interval is a
 * slot number Y, and X <= Y.
 *
 * This condition guarantees that the actual slot number in which the transaction is included is
 * (strictly) less than slot number X.
 */
export interface RequireTimeBeforeScript {
  /** Script type. */
  type: ScriptType.Native;

  /** The slot number specifying the upper bound of the validity interval. */
  slot: number;

  /** The native script kind. */
  kind: NativeScriptKind.RequireTimeBefore;
}

/**
 * This script evaluates to true if the lower bound of the transaction validity interval is a
 * slot number Y, and Y <= X.
 *
 * This condition guarantees that the actual slot number in which the transaction is included
 * is greater than or equal to slot number X.
 */
export interface RequireTimeAfterScript {
  /** Script type. */
  type: ScriptType.Native;

  /** The slot number specifying the lower bound of the validity interval. */
  slot: number;

  /** The native script kind. */
  kind: NativeScriptKind.RequireTimeAfter;
}

/**
 * The Native scripts form an expression tree, the evaluation of the script produces either true or false.
 *
 * Note that it is recursive. There are no constraints on the nesting or size, except that imposed by the overall
 * transaction size limit (given that the script must be included in the transaction in a script witnesses).
 */
export type NativeScript =
  | RequireAllOfScript
  | RequireSignatureScript
  | RequireAnyOfScript
  | RequireAtLeastScript
  | RequireTimeBeforeScript
  | RequireTimeAfterScript;

/**
 * The Cardano ledger tags scripts with a language that determines what the ledger will do with the script.
 *
 * In most cases this language will be very similar to the ones that came before, we refer to these as
 * 'Plutus language versions'. However, from the ledger’s perspective they are entirely unrelated and there
 * is generally no requirement that they be similar or compatible in any way.
 */
export enum PlutusLanguageVersion {
  /** V1 was the initial version of Plutus, introduced in the Alonzo hard fork. */
  V1 = 0,

  /**
   * V2 was introduced in the Vasil hard fork.
   *
   * The main changes in V2 of Plutus were to the interface to scripts. The ScriptContext was extended
   * to include the following information:
   *
   *  - The full “redeemers” structure, which contains all the redeemers used in the transaction
   *  - Reference inputs in the transaction (proposed in CIP-31)
   *  - Inline datums in the transaction (proposed in CIP-32)
   *  - Reference scripts in the transaction (proposed in CIP-33)
   */
  V2 = 1,

  /**
   * V3 was introduced in the Conway hard fork.
   *
   * The main changes in V3 of Plutus introduce:
   *
   * - The value of costmdls map at key 2 is encoded as a definite length list.
   */
  V3 = 2
}

/**
 * Plutus scripts are pieces of code that implement pure functions with True or False outputs. These functions take
 * several inputs such as Datum, Redeemer and the transaction context to decide whether an output can be spent or not.
 */
export interface PlutusScript {
  type: ScriptType.Plutus;
  bytes: string;
  version: PlutusLanguageVersion;
}

/** Program that decides whether the transaction that spends the output is authorized to do so. */
export type Script = NativeScript | PlutusScript;

/**
 * Predicate that returns true if the given core script is a native script.
 *
 * @param script The Script to check.
 */
export const isNativeScript = (script: Script): script is NativeScript => script.type === ScriptType.Native;

/**
 * Predicate that returns true if the given core script is a plutus script.
 *
 * @param script The Script to check.
 */
export const isPlutusScript = (script: Script): script is PlutusScript => script.type === ScriptType.Plutus;

/**
 * Performs a deep equality check on two Script.
 *
 * @param a The first Script object.
 * @param b The second Script object.
 * @returns True if the objects are deeply equal, false otherwise.
 */
export const deepEqualsScript = (a: Script, b: Script): boolean => {
  const module = getModule();
  let ptrA = 0;
  let ptrB = 0;

  try {
    ptrA = writeScript(a);
    ptrB = writeScript(b);

    return module.script_equals(ptrA, ptrB);
  } finally {
    if (ptrA) {
      unrefObject(ptrA);
    }
    if (ptrB) {
      unrefObject(ptrB);
    }
  }
};

/**
 * Computes the hash of a Script object.
 *
 * This function calculates the Blake2b hash of the provided Script.
 *
 * @param script The Script object to hash.
 * @returns The hexadecimal string representation of the hash.
 */
export const computeScriptHash = (script: Script): string => {
  const module = getModule();
  let ptr = 0;
  let hashPtr = 0;

  try {
    ptr = writeScript(script);
    hashPtr = module.script_get_hash(ptr);

    return uint8ArrayToHex(readBlake2bHashData(hashPtr));
  } finally {
    unrefObject(ptr);
  }
};

/**
 * Derives a script address (enterprise address) from a script.
 *
 * This function calculates the script's hash, creates a script credential from it,
 * and then constructs an enterprise address for the specified network.
 *
 * @param {Script} script The script (Native or Plutus) from which to derive the address.
 * @param {NetworkId} networkId The network identifier (e.g., Mainnet or Testnet).
 * @returns {Address} An Address object representing the script address.
 * @throws {Error} If any step of the address creation process fails.
 */
// eslint-disable-next-line max-statements
export const getScriptAddress = (script: Script, networkId: NetworkId): Address => {
  const scriptHash = computeScriptHash(script);
  const credential = {
    hash: scriptHash,
    type: CredentialType.ScriptHash
  };
  const enterpriseAddress = EnterpriseAddress.fromCredentials(networkId, credential);

  return enterpriseAddress.toAddress();
};

/**
 * Serializes a Script object into its CBOR hexadecimal string representation.
 *
 * @param data The Script object to serialize.
 * @returns A hex-encoded CBOR string.
 */
export const scriptToCbor = (data: Script): string => {
  const module = getModule();
  let dataPtr = 0;

  const cborWriter = new CborWriter();
  try {
    dataPtr = writeScript(data);

    assertSuccess(module.script_to_cbor(dataPtr, cborWriter.ptr), 'Failed to serialize Script to CBOR');

    return cborWriter.encodeHex();
  } finally {
    if (dataPtr) {
      unrefObject(dataPtr);
    }
  }
};

/**
 * Deserializes a CBOR hexadecimal string into a Script object.
 *
 * @param cborHex The hex-encoded CBOR string to deserialize.
 * @returns The deserialized Script object.
 */
export const cborToScript = (cborHex: string): Script => {
  const module = getModule();

  let cborReader: CborReader | null = null;
  let scriptOutPtr = 0;
  let scriptPtr = 0;

  try {
    cborReader = CborReader.fromHex(cborHex);
    if (!cborReader || !cborReader.ptr) {
      throw new Error('Failed to create CBOR reader from hex.');
    }

    scriptOutPtr = module._malloc(4);

    assertSuccess(module.script_from_cbor(cborReader.ptr, scriptOutPtr), 'Failed to deserialize CBOR to Script');

    scriptPtr = module.getValue(scriptOutPtr, 'i32');
    if (!scriptPtr) {
      throw new Error('script_from_cbor returned a null pointer.');
    }

    return readScript(scriptPtr);
  } finally {
    unrefObject(scriptPtr);
    module._free(scriptOutPtr);
  }
};

/**
 * Converts a json representation of a native script into a NativeScript.
 *
 * @param json The JSON representation of a native script. The JSON must conform
 * to the following format:
 *
 * https://github.com/input-output-hk/cardano-node/blob/master/doc/reference/simple-scripts.md
 */
export const jsonToNativeScript = (json: any): NativeScript => {
  let coreScript: NativeScript;

  if (!json.type) {
    throw new Error("Invalid Native Script. Missing 'type' field.");
  }

  switch (json.type) {
    case 'sig': {
      coreScript = {
        keyHash: json.keyHash,
        kind: NativeScriptKind.RequireSignature,
        type: ScriptType.Native
      };

      break;
    }
    case 'all': {
      coreScript = {
        kind: NativeScriptKind.RequireAllOf,
        scripts: new Array<NativeScript>(),
        type: ScriptType.Native
      };
      for (let i = 0; i < json.scripts.length; ++i) {
        coreScript.scripts.push(jsonToNativeScript(json.scripts[i]));
      }

      break;
    }
    case 'any': {
      coreScript = {
        kind: NativeScriptKind.RequireAnyOf,
        scripts: new Array<NativeScript>(),
        type: ScriptType.Native
      };
      for (let i = 0; i < json.scripts.length; ++i) {
        coreScript.scripts.push(jsonToNativeScript(json.scripts[i]));
      }

      break;
    }
    case 'atLeast': {
      const required = Number.parseInt(json.required);
      coreScript = {
        kind: NativeScriptKind.RequireNOf,
        required,
        scripts: new Array<NativeScript>(),
        type: ScriptType.Native
      };

      for (let i = 0; i < json.scripts.length; ++i) {
        coreScript.scripts.push(jsonToNativeScript(json.scripts[i]));
      }

      break;
    }
    case 'before': {
      coreScript = {
        kind: NativeScriptKind.RequireTimeBefore,
        slot: Number.parseInt(json.slot),
        type: ScriptType.Native
      };

      break;
    }
    case 'after': {
      coreScript = {
        kind: NativeScriptKind.RequireTimeAfter,
        slot: Number.parseInt(json.slot),
        type: ScriptType.Native
      };

      break;
    }
    default: {
      throw new Error(`Native Script value '${json.type}' is not supported.`);
    }
  }

  return coreScript;
};

/**
 * Converts a NativeScript into its json representation.
 *
 * @param script The native script to be converted to JSON following the format described at:
 *
 * https://github.com/input-output-hk/cardano-node/blob/master/doc/reference/simple-scripts.md
 */
export const nativeScriptToJson = (script: NativeScript): any => {
  switch (script.kind) {
    case NativeScriptKind.RequireSignature:
      return { keyHash: script.keyHash, type: 'sig' };
    case NativeScriptKind.RequireTimeBefore:
      return { slot: script.slot, type: 'before' };
    case NativeScriptKind.RequireTimeAfter:
      return { slot: script.slot, type: 'after' };
    case NativeScriptKind.RequireAllOf:
      return {
        scripts: script.scripts?.map(nativeScriptToJson) ?? [],
        type: 'all'
      };
    case NativeScriptKind.RequireAnyOf:
      return {
        scripts: script.scripts?.map(nativeScriptToJson) ?? [],
        type: 'any'
      };
    case NativeScriptKind.RequireNOf:
      return {
        required: script.required,
        scripts: script.scripts?.map(nativeScriptToJson) ?? [],
        type: 'atLeast'
      };
  }
};
