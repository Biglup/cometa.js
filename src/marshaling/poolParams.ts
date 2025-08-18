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
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS *******************************************************************/

import {
  Anchor,
  PoolParameters,
  Relay,
  RelayByAddress,
  RelayByName,
  RewardAddress,
  blake2bHashFromHex,
  readBlake2bHashData,
  readUnitIntervalAsDouble,
  uint8ArrayToHex,
  writeUnitIntervalAsDouble
} from '../';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';
import { writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

/**
 * Enumerates the types of relays used in the Cardano network.
 *
 * This enumeration defines the different types of relay nodes that can be configured in the Cardano network.
 * Each type represents a different method of connecting to the network.
 */
const enum RelayType {
  /**
   * Relay connects to a single host using an IP address and a port number. This is the most direct way of specifying
   * a relay and does not depend on DNS resolution.
   */
  SingleHostAddress = 0,

  /**
   * Relay connects using a DNS name and a port number. This type allows the relay's IP address to be resolved
   * dynamically, which can provide resilience in environments where IP addresses may change.
   */
  SingleHostName = 1,

  /**
   * Relay uses a multi-host name via a DNS SRV record to resolve multiple potential IP addresses and ports.
   * This type is used for more complex network setups where load balancing across multiple servers is required.
   */
  MultiHostName = 2
}

/**
 * @hidden
 * Deserializes a native `cardano_relay_t` into a JavaScript `Relay` object.
 */
// eslint-disable-next-line max-statements
const readRelay = (relayPtr: number): Relay => {
  const module = getModule();
  const typePtr = module._malloc(4);
  let specificRelayPtr = 0;
  const specificRelayPtrPtr = module._malloc(4);

  try {
    assertSuccess(module.relay_get_type(relayPtr, typePtr), 'Failed to get relay type');
    const type: RelayType = module.getValue(typePtr, 'i32');

    switch (type) {
      case RelayType.SingleHostAddress: {
        assertSuccess(
          module.relay_to_single_host_addr(relayPtr, specificRelayPtrPtr),
          'Failed to cast to SingleHostAddress relay'
        );
        specificRelayPtr = module.getValue(specificRelayPtrPtr, 'i32');

        const result: RelayByAddress = {};

        const portPtr = module.single_host_addr_relay_get_port(specificRelayPtr);
        if (portPtr) {
          try {
            result.port = module.getValue(portPtr, 'i16');
          } finally {
            module._free(portPtr);
          }
        }

        const ipv4ObjPtrPtr = module._malloc(4);
        let ipv4ObjPtr = 0;
        if (module.single_host_addr_relay_get_ipv4(specificRelayPtr, ipv4ObjPtrPtr) === 0) {
          ipv4ObjPtr = module.getValue(ipv4ObjPtrPtr, 'i32');
          const ipv4StrPtr = module.ipv4_get_string(ipv4ObjPtr);
          result.ipv4 = ipv4StrPtr !== 0 ? module.UTF8ToString(ipv4StrPtr) : undefined;
        }
        module._free(ipv4ObjPtrPtr);

        const ipv6ObjPtrPtr = module._malloc(4);
        let ipv6ObjPtr = 0;
        if (module.single_host_addr_relay_get_ipv6(specificRelayPtr, ipv6ObjPtrPtr) === 0) {
          ipv6ObjPtr = module.getValue(ipv6ObjPtrPtr, 'i32');
          const ipv6StrPtr = module.ipv6_get_string(ipv6ObjPtr);
          result.ipv6 = ipv6StrPtr !== 0 ? module.UTF8ToString(ipv6StrPtr) : undefined;
        }
        module._free(ipv6ObjPtrPtr);

        return result;
      }
      case RelayType.SingleHostName: {
        assertSuccess(
          module.relay_to_single_host_name(relayPtr, specificRelayPtrPtr),
          'Failed to cast to SingleHostName relay'
        );
        specificRelayPtr = module.getValue(specificRelayPtrPtr, 'i32');

        const result: Partial<RelayByName> = {};

        const portPtr = module.single_host_name_relay_get_port(specificRelayPtr);
        if (portPtr) {
          try {
            result.port = module.getValue(portPtr, 'i16');
          } finally {
            module._free(portPtr);
          }
        }

        const hostnamePtr = module.single_host_name_relay_get_dns(specificRelayPtr);
        result.hostname = module.UTF8ToString(hostnamePtr);

        return result as RelayByName;
      }
      case RelayType.MultiHostName: {
        assertSuccess(
          module.relay_to_multi_host_name(relayPtr, specificRelayPtrPtr),
          'Failed to cast to MultiHostName relay'
        );
        specificRelayPtr = module.getValue(specificRelayPtrPtr, 'i32');

        const dnsNamePtr = module.multi_host_name_relay_get_dns(specificRelayPtr);
        return { dnsName: module.UTF8ToString(dnsNamePtr) };
      }
      default:
        throw new Error('Unknown relay type');
    }
  } finally {
    module._free(typePtr);
    module._free(specificRelayPtrPtr);
    if (specificRelayPtr) {
      unrefObject(specificRelayPtr);
    }
  }
};

/**
 * @hidden
 * Serializes a JavaScript `Relay` object into a native `cardano_relay_t`.
 */
// eslint-disable-next-line complexity,max-statements,sonarjs/cognitive-complexity
const writeRelay = (relay: Relay): number => {
  const module = getModule();
  let specificRelayPtr = 0;
  const relayPtrPtr = module._malloc(4);

  try {
    if ('ipv4' in relay || 'ipv6' in relay) {
      const { ipv4, ipv6, port } = relay;
      let portPtr = 0;
      let ipv4ObjPtr = 0;
      let ipv6ObjPtr = 0;

      try {
        if (port !== null) {
          portPtr = module._malloc(2);
          module.setValue(portPtr, port, 'i16');
        }

        if (ipv4) {
          const ipPtr = writeStringToMemory(ipv4);
          const ipObjPtrPtr = module._malloc(4);
          // eslint-disable-next-line max-depth
          try {
            assertSuccess(module.ipv4_from_string(ipPtr, ipv4.length, ipObjPtrPtr), 'Failed to parse IPv4');
            ipv4ObjPtr = module.getValue(ipObjPtrPtr, 'i32');
          } finally {
            module._free(ipPtr);
            module._free(ipObjPtrPtr);
          }
        }

        if (ipv6) {
          const ipPtr = writeStringToMemory(ipv6);
          const ipObjPtrPtr = module._malloc(4);
          // eslint-disable-next-line max-depth
          try {
            assertSuccess(module.ipv6_from_string(ipPtr, ipv6.length, ipObjPtrPtr), 'Failed to parse IPv6');
            ipv6ObjPtr = module.getValue(ipObjPtrPtr, 'i32');
          } finally {
            module._free(ipPtr);
            module._free(ipObjPtrPtr);
          }
        }

        assertSuccess(
          module.single_host_addr_relay_new(portPtr, ipv4ObjPtr, ipv6ObjPtr, relayPtrPtr),
          'Failed to create SingleHostAddress relay'
        );
        specificRelayPtr = module.getValue(relayPtrPtr, 'i32');
        assertSuccess(module.relay_new_single_host_addr(specificRelayPtr, relayPtrPtr), 'Failed to create relay');
      } finally {
        if (portPtr) module._free(portPtr);
        if (ipv4ObjPtr) unrefObject(ipv4ObjPtr);
        if (ipv6ObjPtr) unrefObject(ipv6ObjPtr);
      }
    } else if ('hostname' in relay) {
      const { hostname, port } = relay;
      const hostnamePtr = writeStringToMemory(hostname);
      let portPtr = 0;

      try {
        if (port !== null) {
          portPtr = module._malloc(2);
          module.setValue(portPtr, port, 'i16');
        }

        assertSuccess(
          module.single_host_name_relay_new(portPtr, hostnamePtr, hostname.length, relayPtrPtr),
          'Failed to create SingleHostName relay'
        );
        specificRelayPtr = module.getValue(relayPtrPtr, 'i32');
        assertSuccess(
          module.relay_new_single_host_name(specificRelayPtr, relayPtrPtr),
          'Failed to create generic relay'
        );
      } finally {
        if (portPtr) module._free(portPtr);
        module._free(hostnamePtr);
      }
    } else if ('dnsName' in relay) {
      const { dnsName } = relay;
      const dnsNamePtr = writeStringToMemory(dnsName);
      try {
        assertSuccess(
          module.multi_host_name_relay_new(dnsNamePtr, dnsName.length, relayPtrPtr),
          'Failed to create MultiHostName relay'
        );
        specificRelayPtr = module.getValue(relayPtrPtr, 'i32');
        assertSuccess(
          module.relay_new_multi_host_name(specificRelayPtr, relayPtrPtr),
          'Failed to create generic relay'
        );
      } finally {
        module._free(dnsNamePtr);
      }
    } else {
      throw new Error('Invalid relay object');
    }

    return module.getValue(relayPtrPtr, 'i32');
  } finally {
    if (specificRelayPtr) {
      unrefObject(specificRelayPtr);
    }
    module._free(relayPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native `cardano_relays_t` into a JavaScript `Relay[]`.
 */
const readRelays = (relaysPtr: number): Relay[] => {
  const module = getModule();
  const count = module.relays_get_length(relaysPtr);
  const result: Relay[] = [];

  for (let i = 0; i < count; i++) {
    const relayPtrPtr = module._malloc(4);
    let relayPtr = 0;

    try {
      assertSuccess(module.relays_get(relaysPtr, i, relayPtrPtr), `Failed to get relay at index ${i}`);
      relayPtr = module.getValue(relayPtrPtr, 'i32');
      result.push(readRelay(relayPtr));
    } finally {
      module._free(relayPtrPtr);
      if (relayPtr) {
        unrefObject(relayPtr);
      }
    }
  }

  return result;
};

/**
 * @hidden
 * Serializes a JavaScript `Relay[]` into a native `cardano_relays_t`.
 */
const writeRelays = (relays: Relay[]): number => {
  const module = getModule();
  const relaysPtrPtr = module._malloc(4);
  assertSuccess(module.relays_new(relaysPtrPtr), 'Failed to create relays list');
  const relaysPtr = module.getValue(relaysPtrPtr, 'i32');
  module._free(relaysPtrPtr);

  for (const relay of relays) {
    const relayPtr = writeRelay(relay);
    try {
      assertSuccess(module.relays_add(relaysPtr, relayPtr), 'Failed to add relay to list');
    } finally {
      unrefObject(relayPtr);
    }
  }

  return relaysPtr;
};

/**
 * @hidden
 * Deserializes a native `cardano_pool_owners_t` into a string array.
 */
const readOwners = (ownersPtr: number): string[] => {
  const module = getModule();
  const count = module.pool_owners_get_length(ownersPtr);
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    const ownerPtrPtr = module._malloc(4);
    let ownerPtr = 0;

    try {
      assertSuccess(module.pool_owners_get(ownersPtr, i, ownerPtrPtr), `Failed to get owner at index ${i}`);
      ownerPtr = module.getValue(ownerPtrPtr, 'i32');
      result.push(uint8ArrayToHex(readBlake2bHashData(ownerPtr)));
    } finally {
      module._free(ownerPtrPtr);
    }
  }

  return result;
};

/**
 * @hidden
 * Serializes a string array of owner hashes into a native `cardano_pool_owners_t`.
 */
const writeOwners = (owners: string[]): number => {
  const module = getModule();
  const ownersPtrPtr = module._malloc(4);
  assertSuccess(module.pool_owners_new(ownersPtrPtr), 'Failed to create owners list');
  const ownersPtr = module.getValue(ownersPtrPtr, 'i32');
  module._free(ownersPtrPtr);

  for (const ownerHex of owners) {
    const ownerPtr = blake2bHashFromHex(ownerHex);
    try {
      assertSuccess(module.pool_owners_add(ownersPtr, ownerPtr), `Failed to add owner ${ownerHex} to list`);
    } finally {
      unrefObject(ownerPtr);
    }
  }

  return ownersPtr;
};

/**
 * @hidden
 * Deserializes a native `cardano_pool_metadata_t` into a JavaScript `Anchor` object.
 */
const readPoolMetadata = (metadataPtr: number): Anchor | undefined => {
  if (!metadataPtr) {
    return undefined;
  }

  const module = getModule();
  const url = module.UTF8ToString(module.pool_metadata_get_url(metadataPtr));
  const hashPtrPtr = module._malloc(4);
  let hashPtr = 0;
  try {
    assertSuccess(module.pool_metadata_get_hash(metadataPtr, hashPtrPtr), 'Failed to get metadata hash');
    hashPtr = module.getValue(hashPtrPtr, 'i32');
    const dataHash = uint8ArrayToHex(readBlake2bHashData(hashPtr));
    return { dataHash, url };
  } finally {
    module._free(hashPtrPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `Anchor` object into a native `cardano_pool_metadata_t`.
 */
const writePoolMetadata = (metadata: Anchor): number => {
  const module = getModule();
  const urlPtr = writeStringToMemory(metadata.url);
  const hashPtr = blake2bHashFromHex(metadata.dataHash);
  const metadataPtrPtr = module._malloc(4);

  try {
    assertSuccess(
      module.pool_metadata_new(urlPtr, metadata.url.length, hashPtr, metadataPtrPtr),
      'Failed to create pool metadata'
    );
    return module.getValue(metadataPtrPtr, 'i32');
  } finally {
    module._free(urlPtr);
    unrefObject(hashPtr);
    module._free(metadataPtrPtr);
  }
};

/**
 * Deserializes a native `cardano_pool_params_t` into a JavaScript `PoolParameters` object.
 *
 * @param {number} ptr A pointer to the native `cardano_pool_params_t` object.
 * @returns {PoolParameters} The deserialized JavaScript `PoolParameters` object.
 */
// eslint-disable-next-line max-statements
export const readPoolParameters = (ptr: number): PoolParameters => {
  const module = getModule();
  const idPtrPtr = module._malloc(4);
  const vrfPtrPtr = module._malloc(4);
  const pledgePtr = module._malloc(8);
  const costPtr = module._malloc(8);
  const marginPtrPtr = module._malloc(4);
  const rewardAccountPtrPtr = module._malloc(4);
  const ownersPtrPtr = module._malloc(4);
  const relaysPtrPtr = module._malloc(4);
  const metadataPtrPtr = module._malloc(4);

  let idPtr = 0;
  let vrfPtr = 0;
  let marginPtr = 0;
  let rewardAccountPtr = 0;
  let ownersPtr = 0;
  let relaysPtr = 0;
  let metadataPtr = 0;

  try {
    assertSuccess(module.pool_params_get_operator_key_hash(ptr, idPtrPtr));
    idPtr = module.getValue(idPtrPtr, 'i32');
    const id = uint8ArrayToHex(readBlake2bHashData(idPtr, false));

    assertSuccess(module.pool_params_get_vrf_vk_hash(ptr, vrfPtrPtr));
    vrfPtr = module.getValue(vrfPtrPtr, 'i32');
    const vrf = uint8ArrayToHex(readBlake2bHashData(vrfPtr, false));

    assertSuccess(module.pool_params_get_pledge(ptr, pledgePtr));
    const pledge =
      (BigInt(module.getValue(pledgePtr + 4, 'i32')) << 32n) | BigInt(module.getValue(pledgePtr, 'i32') >>> 0);

    assertSuccess(module.pool_params_get_cost(ptr, costPtr));
    const cost = (BigInt(module.getValue(costPtr + 4, 'i32')) << 32n) | BigInt(module.getValue(costPtr, 'i32') >>> 0);

    assertSuccess(module.pool_params_get_margin(ptr, marginPtrPtr));
    marginPtr = module.getValue(marginPtrPtr, 'i32');
    const margin = readUnitIntervalAsDouble(marginPtr);

    assertSuccess(module.pool_params_get_reward_account(ptr, rewardAccountPtrPtr));
    rewardAccountPtr = module.getValue(rewardAccountPtrPtr, 'i32');
    const rewardAccount = new RewardAddress(rewardAccountPtr, false);

    assertSuccess(module.pool_params_get_owners(ptr, ownersPtrPtr));
    ownersPtr = module.getValue(ownersPtrPtr, 'i32');
    const owners = readOwners(ownersPtr);

    assertSuccess(module.pool_params_get_relays(ptr, relaysPtrPtr));
    relaysPtr = module.getValue(relaysPtrPtr, 'i32');
    const relays = readRelays(relaysPtr);

    const metadataResult = module.pool_params_get_metadata(ptr, metadataPtrPtr);
    const metadataJson =
      metadataResult === 0
        ? ((metadataPtr = module.getValue(metadataPtrPtr, 'i32')), readPoolMetadata(metadataPtr))
        : undefined;

    return { cost, id, margin, metadataJson, owners, pledge, relays, rewardAccount: rewardAccount.toBech32(), vrf };
  } finally {
    module._free(idPtrPtr);
    module._free(vrfPtrPtr);
    module._free(pledgePtr);
    module._free(costPtr);
    module._free(marginPtrPtr);
    module._free(rewardAccountPtrPtr);
    module._free(ownersPtrPtr);
    module._free(relaysPtrPtr);
    module._free(metadataPtrPtr);

    if (idPtr) unrefObject(idPtr);
    if (vrfPtr) unrefObject(vrfPtr);
    if (marginPtr) unrefObject(marginPtr);
    if (rewardAccountPtr) unrefObject(rewardAccountPtr);
    if (ownersPtr) unrefObject(ownersPtr);
    if (relaysPtr) unrefObject(relaysPtr);
    if (metadataPtr) unrefObject(metadataPtr);
  }
};

/**
 * Serializes a JavaScript `PoolParameters` object into a native `cardano_pool_params_t`.
 *
 * @param {PoolParameters} params The `PoolParameters` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_pool_params_t` object.
 */
export const writePoolParameters = (params: PoolParameters): number => {
  const module = getModule();
  const poolParamsPtrPtr = module._malloc(4);

  const operatorKeyHashPtr = blake2bHashFromHex(params.id);
  const vrfVkHashPtr = blake2bHashFromHex(params.vrf);
  const pledgeParts = splitToLowHigh64bit(params.pledge);
  const costParts = splitToLowHigh64bit(params.cost);
  const marginPtr = writeUnitIntervalAsDouble(params.margin);
  const rewardAccountObj = RewardAddress.fromBech32(params.rewardAccount);
  const ownersPtr = writeOwners(params.owners);
  const relaysPtr = writeRelays(params.relays);
  const metadataPtr = params.metadataJson ? writePoolMetadata(params.metadataJson) : 0;

  try {
    assertSuccess(
      module.pool_params_new(
        operatorKeyHashPtr,
        vrfVkHashPtr,
        pledgeParts.low,
        pledgeParts.high,
        costParts.low,
        costParts.high,
        marginPtr,
        rewardAccountObj.ptr,
        ownersPtr,
        relaysPtr,
        metadataPtr,
        poolParamsPtrPtr
      ),
      'Failed to create pool parameters'
    );

    return module.getValue(poolParamsPtrPtr, 'i32');
  } finally {
    module._free(poolParamsPtrPtr);
    unrefObject(operatorKeyHashPtr);
    unrefObject(vrfVkHashPtr);
    unrefObject(marginPtr);
    unrefObject(ownersPtr);
    unrefObject(relaysPtr);
    if (metadataPtr) {
      unrefObject(metadataPtr);
    }
  }
};
