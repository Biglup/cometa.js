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

/* GLOBALS ********************************************************************/

/**
 * A global registry to hold references to JavaScript instances that need to be
 * accessible from the WASM/C layer. Instances are stored in nested maps,
 * categorized by their type.
 * @private
 */
const _registry = new Map<number, Map<number, any>>();

/**
 * A registry for instance-specific error handlers.
 * @private
 */
const _handlerRegistry = new Map<number, Map<number, (exception: any) => void>>();

/* DEFINITIONS ****************************************************************/

/**
 * Enumerates the types of instances that can be registered for C-side callbacks.
 */
export enum InstanceType {
  Provider = 0,
  CoinSelector = 1,
  TxEvaluator = 2
}

/**
 * Registers a JavaScript instance, so it can be retrieved later by C code.
 *
 * @param {InstanceType} type - The category of the instance (e.g., Provider).
 * @param {number} id - The unique numeric ID assigned to this instance.
 * @param {any} obj - The JavaScript object instance to register.
 */
export const registerInstance = (type: InstanceType, id: number, obj: any): void => {
  if (!_registry.has(type)) {
    _registry.set(type, new Map<number, any>());
  }
  _registry.get(type)!.set(id, obj);
};

/**
 * Unregisters a JavaScript instance, removing it from the registry.
 *
 * @param {InstanceType} type - The category of the instance.
 * @param {number} id - The unique numeric ID of the instance to unregister.
 */
export const unregisterInstance = (type: InstanceType, id: number): void => {
  const typeMap = _registry.get(type);
  if (typeMap) {
    typeMap.delete(id);
  }
};

/**
 * Retrieves a registered JavaScript instance by its type and ID.
 *
 * @param {InstanceType} type - The category of the instance.
 * @param {number} id - The unique numeric ID of the instance to retrieve.
 * @returns {any | undefined} The registered object, or undefined if not found.
 */
export const getFromInstanceRegistry = (type: InstanceType, id: number): any | undefined => {
  const typeMap = _registry.get(type);
  return typeMap?.get(id);
};

/**
 * Registers an error handler for a specific instance.
 * @param {InstanceType} type The type of the instance.
 * @param {number} id The unique ID of the instance.
 * @param {(exception: any) => void} handler The callback function to handle the error.
 */
export const registerBridgeErrorHandler = (type: InstanceType, id: number, handler: (exception: any) => void) => {
  if (!_handlerRegistry.has(type)) {
    _handlerRegistry.set(type, new Map<number, (exception: any) => void>());
  }
  _handlerRegistry.get(type)!.set(id, handler);
};

/**
 * Unregisters an error handler for a specific instance.
 * @param {InstanceType} type The type of the instance.
 * @param {number} id The unique ID of the handler to remove.
 */
export const unregisterBridgeErrorHandler = (type: InstanceType, id: number) => {
  const typeMap = _handlerRegistry.get(type);
  if (typeMap) {
    typeMap.delete(id);
  }
};

/**
 * Invokes the error handler for a specific instance.
 * @param {InstanceType} type The type of the instance that erred.
 * @param {number} id The unique ID of the instance.
 * @param {any} exception The exception object that was caught.
 */
export const reportBridgeError = (type: InstanceType, id: number, exception: any) => {
  const handler = _handlerRegistry.get(type)?.get(id);
  if (handler) {
    handler(exception);
  }
};
