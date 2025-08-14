/* eslint-disable complexity, max-statements, sonarjs/cognitive-complexity, max-depth */
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

import {
  NativeScript,
  NativeScriptKind,
  PlutusLanguageVersion,
  PlutusScript,
  Script,
  ScriptType,
  isNativeScript,
  isPlutusScript
} from '../common';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { readBlake2bHashData } from './blake2b';
import { readI64, splitToLowHigh64bit } from './number';
import { uint8ArrayToHex } from '../cometa';
import { writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

/**
 * Allocates a pointer in WASM memory for a 32-bit integer.
 */
const allocPtr = (): number => getModule()._malloc(4);

/**
 * Reads a 32-bit integer pointer from WASM memory.
 * @param ptr - The pointer to read from.
 */
const readPtr = (ptr: number): number => getModule().getValue(ptr, 'i32');

/**
 * Recursively writes a JavaScript NativeScript object to WASM memory and
 * returns a pointer to a `cardano_native_script_t`.
 *
 * This function is the core of the native script marshaling logic. It handles
 * the different kinds of native scripts, including recursively calling itself
 * for nested scripts (like in 'all', 'any', 'n_of_k').
 *
 * @param script The JavaScript NativeScript object.
 * @returns A pointer to the created C object.
 */
const writeNativeScript = (script: NativeScript): number => {
  const m = getModule();
  let nativeScriptPtr = 0;
  const outPtr = allocPtr();

  try {
    switch (script.kind) {
      case NativeScriptKind.RequireSignature: {
        const outKeyHashPtr = allocPtr();
        let strPtr = 0;
        let keyHashPtr = 0;
        let scriptPubKeyPtr = 0;
        const scriptPubKeyPtrPtr = allocPtr();
        try {
          strPtr = writeStringToMemory(script.keyHash);
          assertSuccess(
            m.blake2b_hash_from_hex(strPtr, script.keyHash.length, outKeyHashPtr),
            'Failed to create key hash from hex.'
          );
          keyHashPtr = readPtr(outKeyHashPtr);

          assertSuccess(m.script_pubkey_new(keyHashPtr, scriptPubKeyPtrPtr));
          scriptPubKeyPtr = readPtr(scriptPubKeyPtrPtr);

          assertSuccess(
            m.native_script_new_pubkey(scriptPubKeyPtr, outPtr),
            'Failed to create native_script from pubkey script'
          );

          nativeScriptPtr = readPtr(outPtr);
        } finally {
          m._free(strPtr);
          m._free(outKeyHashPtr);
          unrefObject(keyHashPtr);
          unrefObject(scriptPubKeyPtr);
          m._free(scriptPubKeyPtrPtr);
        }
        break;
      }
      case NativeScriptKind.RequireTimeAfter: {
        let scriptInvalidBeforePtrPtr = 0;
        let scriptInvalidBeforePtr = 0;
        try {
          scriptInvalidBeforePtrPtr = allocPtr();
          const slotParts = splitToLowHigh64bit(script.slot);
          assertSuccess(m.script_invalid_before_new(slotParts.low, slotParts.high, scriptInvalidBeforePtrPtr));
          scriptInvalidBeforePtr = readPtr(scriptInvalidBeforePtrPtr);

          assertSuccess(m.native_script_new_invalid_before(scriptInvalidBeforePtr, outPtr));
          nativeScriptPtr = readPtr(outPtr);
        } finally {
          m._free(scriptInvalidBeforePtrPtr);
          unrefObject(scriptInvalidBeforePtr);
        }
        break;
      }

      case NativeScriptKind.RequireTimeBefore: {
        let scriptInvalidAfterPtrPtr = 0;
        let scriptInvalidAfterPtr = 0;
        try {
          scriptInvalidAfterPtrPtr = allocPtr();
          const slotParts = splitToLowHigh64bit(script.slot);
          assertSuccess(m.script_invalid_after_new(slotParts.low, slotParts.high, scriptInvalidAfterPtrPtr));
          scriptInvalidAfterPtr = readPtr(scriptInvalidAfterPtrPtr);

          assertSuccess(m.native_script_new_invalid_after(scriptInvalidAfterPtr, outPtr));
          nativeScriptPtr = readPtr(outPtr);
        } finally {
          m._free(scriptInvalidAfterPtrPtr);
          unrefObject(scriptInvalidAfterPtr);
        }
        break;
      }

      case NativeScriptKind.RequireAllOf:
      case NativeScriptKind.RequireAnyOf:
      case NativeScriptKind.RequireNOf: {
        const outSubScriptsListPtr = allocPtr();
        let subScriptsListPtr = 0;
        try {
          assertSuccess(m.native_script_list_new(outSubScriptsListPtr), 'Failed to create native_script_list');
          subScriptsListPtr = readPtr(outSubScriptsListPtr);
          if (!subScriptsListPtr) throw new Error('C function created a null native_script_list pointer.');

          for (const subScript of script.scripts) {
            const subScriptPtr = writeNativeScript(subScript);
            m.native_script_list_add(subScriptsListPtr, subScriptPtr);
            unrefObject(subScriptPtr);
          }

          let containerPtr = 0;
          const outContainerPtr = allocPtr();
          try {
            if (script.kind === NativeScriptKind.RequireAllOf) {
              assertSuccess(m.script_all_new(subScriptsListPtr, outContainerPtr), 'script_all_new failed');
              containerPtr = readPtr(outContainerPtr);
              assertSuccess(m.native_script_new_all(containerPtr, outPtr), 'native_script_new_all failed.');
            } else if (script.kind === NativeScriptKind.RequireAnyOf) {
              assertSuccess(m.script_any_new(subScriptsListPtr, outContainerPtr), 'script_any_new failed');
              containerPtr = readPtr(outContainerPtr);
              assertSuccess(m.native_script_new_any(containerPtr, outPtr), 'native_script_new_any failed.');
            } else {
              assertSuccess(
                m.script_n_of_k_new(subScriptsListPtr, script.required, outContainerPtr),
                'script_n_of_k_new failed'
              );
              containerPtr = readPtr(outContainerPtr);
              assertSuccess(m.native_script_new_n_of_k(containerPtr, outPtr), 'native_script_new_n_of_k failed.');
            }
            nativeScriptPtr = readPtr(outPtr);
          } finally {
            m._free(outContainerPtr);
            if (containerPtr) {
              unrefObject(containerPtr);
            }
          }
        } finally {
          m._free(outSubScriptsListPtr);
          if (subScriptsListPtr) {
            unrefObject(subScriptsListPtr);
          }
        }
        break;
      }
      default:
        throw new Error(`Unsupported NativeScript kind: ${(script as any).kind}`);
    }

    if (!nativeScriptPtr) {
      throw new Error('Failed to create any native script, pointer is null');
    }
    return nativeScriptPtr;
  } finally {
    m._free(outPtr);
  }
};

/**
 * Writes a JavaScript PlutusScript object to WASM memory and returns a
 * pointer to a generic `cardano_script_t`.
 *
 * @param script The JavaScript PlutusScript object to write.
 */
const writePlutusScript = (script: PlutusScript): number => {
  const m = getModule();

  let newSpecificScriptFn;
  let wrapInGenericScriptFn;

  switch (script.version) {
    case PlutusLanguageVersion.V1:
      newSpecificScriptFn = m.plutus_v1_script_new_bytes_from_hex;
      wrapInGenericScriptFn = m.script_new_plutus_v1;
      break;
    case PlutusLanguageVersion.V2:
      newSpecificScriptFn = m.plutus_v2_script_new_bytes_from_hex;
      wrapInGenericScriptFn = m.script_new_plutus_v2;
      break;
    case PlutusLanguageVersion.V3:
      newSpecificScriptFn = m.plutus_v3_script_new_bytes_from_hex;
      wrapInGenericScriptFn = m.script_new_plutus_v3;
      break;
    default:
      throw new Error(`Unsupported Plutus language version: ${script.version}`);
  }

  const specificScriptOutPtr = allocPtr();
  let specificScriptPtr = 0;

  let strPtr = 0;
  try {
    strPtr = writeStringToMemory(script.bytes);
    const newResult = newSpecificScriptFn(strPtr, script.bytes.length, specificScriptOutPtr);
    assertSuccess(newResult, `Failed to create Plutus v${script.version + 1} script from bytes`);
    specificScriptPtr = readPtr(specificScriptOutPtr);
    if (!specificScriptPtr) {
      throw new Error('C function created a null Plutus script pointer.');
    }
  } finally {
    m._free(strPtr);
    m._free(specificScriptOutPtr);
  }

  try {
    const genericScriptOutPtr = allocPtr();
    try {
      const wrapResult = wrapInGenericScriptFn(specificScriptPtr, genericScriptOutPtr);
      assertSuccess(wrapResult, 'Failed to wrap Plutus script in generic script container');

      const genericScriptPtr = readPtr(genericScriptOutPtr);
      if (!genericScriptPtr) {
        throw new Error('C function created a null generic script pointer.');
      }

      return genericScriptPtr;
    } finally {
      m._free(genericScriptOutPtr);
    }
  } finally {
    unrefObject(specificScriptPtr);
  }
};

/**
 * Marshals a JavaScript `Script` object into a C `cardano_script_t` object
 * in WASM memory and returns a handle (pointer) to it.
 *
 * @param script The JavaScript Script object to write.
 */
export const writeScript = (script: Script): number => {
  const m = getModule();

  if (isPlutusScript(script)) {
    return writePlutusScript(script);
  }

  if (isNativeScript(script)) {
    const nativeScriptPtr = writeNativeScript(script);
    if (!nativeScriptPtr) throw new Error('Failed to write native script');

    const outPtr = allocPtr();
    try {
      if (m.script_new_native(nativeScriptPtr, outPtr) !== 0) {
        throw new Error('cardano_script_new_native failed');
      }
      return readPtr(outPtr);
    } finally {
      m._free(outPtr);
      unrefObject(nativeScriptPtr);
    }
  }

  throw new Error('Unsupported script type');
};

/**
 * Reads a C `cardano_native_script_t` pointer and converts it into a
 * @param nativeScriptPtr A pointer to the C `cardano_native_script_t` object.
 */
const readNativeScript = (nativeScriptPtr: number): NativeScript => {
  const m = getModule();
  const typePtr = allocPtr();
  try {
    if (m.native_script_get_type(nativeScriptPtr, typePtr) !== 0) throw new Error('Failed to get native script type');
    const kind = readPtr(typePtr) as NativeScriptKind;

    switch (kind) {
      case NativeScriptKind.RequireSignature: {
        let pubkeyScriptPtr = 0;
        let keyHashPtr = 0;
        const pubkeyScriptPtrPtr = allocPtr();
        const keyHashPtrPtr = allocPtr();
        try {
          assertSuccess(m.native_script_to_pubkey(nativeScriptPtr, pubkeyScriptPtrPtr));
          pubkeyScriptPtr = readPtr(pubkeyScriptPtrPtr);
          assertSuccess(m.script_pubkey_get_key_hash(pubkeyScriptPtr, keyHashPtrPtr));
          keyHashPtr = readPtr(keyHashPtrPtr);
          return {
            __type: ScriptType.Native,
            keyHash: uint8ArrayToHex(readBlake2bHashData(keyHashPtr)),
            kind: NativeScriptKind.RequireSignature
          };
        } finally {
          m._free(keyHashPtrPtr);
          m._free(pubkeyScriptPtrPtr);
          if (pubkeyScriptPtr) unrefObject(pubkeyScriptPtr);
          if (keyHashPtr) unrefObject(keyHashPtr);
        }
      }
      case NativeScriptKind.RequireTimeAfter: {
        let invalidBeforePtr = 0;
        const invalidBeforePtrPtr = allocPtr();
        try {
          assertSuccess(m.native_script_to_invalid_before(nativeScriptPtr, invalidBeforePtrPtr));
          invalidBeforePtr = readPtr(invalidBeforePtrPtr);
          const slotPtr = allocPtr();
          try {
            if (m.script_invalid_before_get_slot(invalidBeforePtr, slotPtr) !== 0)
              throw new Error('Failed to get slot');
            return {
              __type: ScriptType.Native,
              kind: NativeScriptKind.RequireTimeAfter,
              slot: Number(readI64(slotPtr))
            };
          } finally {
            m._free(slotPtr);
          }
        } finally {
          if (invalidBeforePtr) unrefObject(invalidBeforePtr);
          m._free(invalidBeforePtrPtr);
        }
      }
      case NativeScriptKind.RequireTimeBefore: {
        let invalidAfterPtr = 0;
        const invalidAfterPtrPtr = allocPtr();
        try {
          assertSuccess(m.native_script_to_invalid_after(nativeScriptPtr, invalidAfterPtrPtr));
          invalidAfterPtr = readPtr(invalidAfterPtrPtr);
          const slotPtr = allocPtr();
          try {
            if (m.script_invalid_after_get_slot(invalidAfterPtr, slotPtr) !== 0) throw new Error('Failed to get slot');
            return {
              __type: ScriptType.Native,
              kind: NativeScriptKind.RequireTimeBefore,
              slot: Number(readI64(slotPtr))
            };
          } finally {
            m._free(slotPtr);
          }
        } finally {
          if (invalidAfterPtr) unrefObject(invalidAfterPtr);
          m._free(invalidAfterPtrPtr);
        }
      }
      case NativeScriptKind.RequireAllOf:
      case NativeScriptKind.RequireAnyOf:
      case NativeScriptKind.RequireNOf: {
        let containerPtr = 0;
        let listPtr = 0;
        const containerPtrPtr = allocPtr();
        const listPtrPtr = allocPtr();
        try {
          if (kind === NativeScriptKind.RequireAllOf) {
            assertSuccess(m.native_script_to_all(nativeScriptPtr, containerPtrPtr));
            containerPtr = readPtr(containerPtrPtr);
            assertSuccess(m.script_all_get_scripts(containerPtr, listPtrPtr));
            listPtr = readPtr(listPtrPtr);
          } else if (kind === NativeScriptKind.RequireAnyOf) {
            assertSuccess(m.native_script_to_any(nativeScriptPtr, containerPtrPtr));
            containerPtr = readPtr(containerPtrPtr);
            assertSuccess(m.script_any_get_scripts(containerPtr, listPtrPtr));
            listPtr = readPtr(listPtrPtr);
          } else {
            assertSuccess(m.native_script_to_n_of_k(nativeScriptPtr, containerPtrPtr));
            containerPtr = readPtr(containerPtrPtr);
            assertSuccess(m.script_n_of_k_get_scripts(containerPtr, listPtrPtr));
            listPtr = readPtr(listPtrPtr);
          }
          if (!listPtr) throw new Error('Failed to get sub-script list');

          const length = m.native_script_list_get_length(listPtr);
          const scripts: NativeScript[] = [];
          for (let i = 0; i < length; i++) {
            let subScriptPtr = 0;
            const subScriptPtrPtr = allocPtr();
            try {
              assertSuccess(m.native_script_list_get(listPtr, i, subScriptPtrPtr));
              subScriptPtr = readPtr(subScriptPtrPtr);
              scripts.push(readNativeScript(subScriptPtr));
            } finally {
              if (subScriptPtr) unrefObject(subScriptPtr);
              m._free(subScriptPtrPtr);
            }
          }

          if (kind === NativeScriptKind.RequireNOf) {
            const required = m.script_n_of_k_get_required(containerPtr);
            return { __type: ScriptType.Native, kind, required, scripts };
          }
          return { __type: ScriptType.Native, kind, scripts };
        } finally {
          if (listPtr) unrefObject(listPtr);
          if (containerPtr) unrefObject(containerPtr);
          m._free(listPtrPtr);
          m._free(containerPtrPtr);
        }
      }
      default:
        throw new Error(`Unsupported NativeScript kind for reading: ${kind}`);
    }
  } finally {
    m._free(typePtr);
  }
};

/**
 * Reads a C `cardano_plutus_script_t` pointer and converts it into a
 * @param scriptPtr A pointer to the C `cardano_plutus_script_t` object.
 * @param language The Plutus language version of the script.
 *
 * @return A PlutusScript object containing the script bytes and version.
 */
const readPlutusScript = (scriptPtr: number, language: PlutusLanguageVersion): PlutusScript => {
  const m = getModule();
  let toSpecificScriptFn;
  let toRawBytesFn;

  switch (language) {
    case PlutusLanguageVersion.V1:
      toSpecificScriptFn = m.script_to_plutus_v1;
      toRawBytesFn = m.plutus_v1_script_to_raw_bytes;
      break;
    case PlutusLanguageVersion.V2:
      toSpecificScriptFn = m.script_to_plutus_v2;
      toRawBytesFn = m.plutus_v2_script_to_raw_bytes;
      break;
    case PlutusLanguageVersion.V3:
      toSpecificScriptFn = m.script_to_plutus_v3;
      toRawBytesFn = m.plutus_v3_script_to_raw_bytes;
      break;
    default:
      throw new Error(`Cannot read unknown Plutus language version: ${language}`);
  }

  let specificScriptPtr = 0;
  const specificScriptOutPtr = allocPtr();
  try {
    assertSuccess(toSpecificScriptFn(scriptPtr, specificScriptOutPtr));
    specificScriptPtr = readPtr(specificScriptOutPtr);
    if (!specificScriptPtr) throw new Error('C function created a null specific Plutus script pointer.');

    let byteBufferPtr = 0;
    const byteBufferOutPtr = allocPtr();
    try {
      assertSuccess(toRawBytesFn(specificScriptPtr, byteBufferOutPtr));
      byteBufferPtr = readPtr(byteBufferOutPtr);
      if (!byteBufferPtr) throw new Error('C function created a null byte buffer pointer.');

      const dataPtr = m.buffer_get_data(byteBufferPtr);
      const size = m.buffer_get_size(byteBufferPtr);
      const bytes = m.HEAPU8.subarray(dataPtr, dataPtr + size);

      return {
        __type: ScriptType.Plutus,
        bytes: uint8ArrayToHex(bytes),
        version: language
      };
    } finally {
      m._free(byteBufferOutPtr);
      if (byteBufferPtr) unrefObject(byteBufferPtr);
    }
  } finally {
    m._free(specificScriptOutPtr);
    if (specificScriptPtr) unrefObject(specificScriptPtr);
  }
};

/**
 * Reads a C `cardano_script_t` pointer and converts it into a
 * JavaScript Script object.
 * @param ptr A pointer to the C `cardano_script_t` object.
 *
 * @return A Script object containing the script data.
 */
export const readScript = (ptr: number): Script => {
  const m = getModule();
  const languagePtr = allocPtr();
  try {
    if (m.script_get_language(ptr, languagePtr) !== 0) throw new Error('Failed to get script language');
    const language = readPtr(languagePtr);

    switch (language) {
      case 0: {
        let nativeScriptPtr = 0;
        const nativeScriptPtrPtr = allocPtr();
        try {
          const result = m.script_to_native(ptr, nativeScriptPtrPtr);
          if (result !== 0) {
            throw new Error(`Failed to convert script to native script, result code: ${result}`);
          }
          nativeScriptPtr = readPtr(nativeScriptPtrPtr);
          return readNativeScript(nativeScriptPtr);
        } finally {
          if (nativeScriptPtr) unrefObject(nativeScriptPtr);
          m._free(nativeScriptPtrPtr);
        }
      }
      case 1:
        return readPlutusScript(ptr, PlutusLanguageVersion.V1);
      case 2:
        return readPlutusScript(ptr, PlutusLanguageVersion.V2);
      case 3:
        return readPlutusScript(ptr, PlutusLanguageVersion.V3);
      default:
        throw new Error(`Unsupported script language enum: ${language}`);
    }
  } finally {
    m._free(languagePtr);
  }
};
