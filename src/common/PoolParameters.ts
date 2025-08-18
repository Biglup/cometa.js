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

/* IMPORTS ******************************************************************/

import { Anchor } from './Anchor';

/* DEFINITIONS **************************************************************/

/**
 * This relay points to a single host via its ipv4/ipv6 address and a given port.
 */
export interface RelayByAddress {
  ipv4?: string;
  ipv6?: string;
  port?: number;
}

/**
 * This relay points to a single host via a DNS (pointing to an A or AAAA DNS record) name and a given port.
 */
export interface RelayByName {
  hostname: string;
  port?: number;
}

/**
 * This relay points to a multi host name via a DNS (A SRV DNS record) name.
 */
export interface RelayByNameMultihost {
  dnsName: string;
}

/**
 * A relay is a type of node that acts as intermediaries between core nodes
 * (which produce blocks) and the wider internet. They help in passing along
 * transactions and blocks, ensuring that data is propagated throughout the
 * network.
 */
export type Relay = RelayByAddress | RelayByName | RelayByNameMultihost;

/**
 * Stake pool update certificate parameters.
 *
 * When a stake pool operator wants to change the parameters of their pool, they
 * must submit a pool update certificate with these parameters.
 */
export interface PoolParameters {
  id: string;
  rewardAccount: string;
  pledge: bigint;
  cost: bigint;
  margin: number;
  metadataJson?: Anchor;
  relays: Relay[];
  owners: string[];
  vrf: string;
}
