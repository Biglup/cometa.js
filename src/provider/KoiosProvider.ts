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

import { Address, RewardAddress } from '../address';
import { Http, credential } from './internal/Http';
import { NetworkMagic, ProtocolParameters, Redeemer, TxIn, UTxO } from '../common';
import { Ogmios } from './internal/Ogmios';
import { Provider } from './Provider';
import { addressText, datumBytes, koiosOutput, ogmiosOutput } from './internal/Outputs';
import {
  array,
  evaluation,
  hex,
  input,
  inputKey,
  integer,
  invalid,
  natural,
  networkName,
  object,
  resolveOrder,
  transactionId,
  uniqueOutputs
} from './internal/Values';
import { confirm } from './internal/Confirmation';
import { protocolParameters } from './internal/Protocol';

/* DEFINITIONS ****************************************************************/

/** Koios v1 configuration, including an optional bearer token for hosted endpoints. */
export interface KoiosProviderOptions {
  network: NetworkMagic;
  token?: string;
  baseUrl?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

/**
 * Koios v1 provider. Uses extended UTxO responses and Ogmios v6 for protocol
 * parameters, evaluation and submission. Queries do not form an atomic snapshot.
 * Call Cometa.ready() before operations that decode ledger values.
 */
export class KoiosProvider implements Provider {
  private readonly http: Http;
  private readonly ogmios: Ogmios;
  private readonly network: NetworkMagic;
  private readonly pollInterval: number;

  constructor(options: KoiosProviderOptions) {
    const network = networkName(options.network);
    this.network = options.network;
    this.pollInterval = options.pollIntervalMs ?? 1000;
    if (!Number.isSafeInteger(this.pollInterval) || this.pollInterval < 1 || this.pollInterval > 60_000)
      throw new Error('Invalid polling interval');
    this.http = new Http(
      options.baseUrl ?? `https://${network === 'mainnet' ? 'api' : network}.koios.rest/api/v1`,
      options.token === undefined ? {} : { Authorization: `Bearer ${credential(options.token)}` },
      options.timeoutMs
    );
    this.ogmios = new Ogmios(this.http, ['ogmios']);
  }

  getName(): string {
    return 'Koios';
  }
  getNetworkMagic(): NetworkMagic {
    return this.network;
  }

  async getParameters(): Promise<ProtocolParameters> {
    return protocolParameters(await this.ogmios.call('queryLedgerState/protocolParameters'));
  }

  async getRewardsBalance(address: RewardAddress | string): Promise<bigint> {
    const account = typeof address === 'string' ? address : address.toBech32();
    const rows = array(await this.http.json(['account_info'], {}, { _stake_addresses: [account] }));
    if (rows.length === 0) return 0n;
    if (rows.length !== 1) return invalid();
    const row = object(rows[0]);
    if (row.stake_address !== account) return invalid();
    return integer(row.rewards_available);
  }

  async getUnspentOutputs(address: Address | string): Promise<UTxO[]> {
    const text = addressText(typeof address === 'string' ? address : address.toString());
    const outputs = await this.outputs('address_utxos', { _addresses: [text], _extended: true });
    if (outputs.some((value) => value.output.address !== text)) return invalid();
    return outputs;
  }

  async getUnspentOutputsWithAsset(address: Address | string, assetId: string): Promise<UTxO[]> {
    const asset = KoiosProvider.asset(assetId);
    return (await this.getUnspentOutputs(address)).filter((value) => (value.output.value.assets?.[asset] ?? 0n) > 0n);
  }

  async getUnspentOutputByNft(assetId: string): Promise<UTxO> {
    const asset = KoiosProvider.asset(assetId);
    const outputs = await this.outputs('asset_utxos', {
      _asset_list: [[asset.slice(0, 56), asset.slice(56)]],
      _extended: true
    });
    if (outputs.length !== 1 || outputs[0].output.value.assets?.[asset] !== 1n)
      throw new Error('Expected exactly one NFT output');
    return outputs[0];
  }

  async resolveUnspentOutputs(txIns: TxIn[]): Promise<UTxO[]> {
    const requested = [
      ...new Map(
        txIns.map((value) => {
          const validated = input(value.txId, value.index);
          return [inputKey(validated), validated];
        })
      ).values()
    ];
    const found: UTxO[] = [];
    for (let offset = 0; offset < requested.length; offset += 100) {
      found.push(
        ...(await this.outputs('utxo_info', {
          _extended: true,
          _utxo_refs: requested.slice(offset, offset + 100).map(inputKey)
        }))
      );
    }
    return resolveOrder(requested, found);
  }

  async resolveDatum(datumHash: string): Promise<string> {
    const expected = hex(datumHash, 32);
    const rows = array(await this.http.json(['datum_info'], {}, { _datum_hashes: [expected] }));
    if (rows.length !== 1 || object(rows[0]).datum_hash !== expected) return invalid();
    return datumBytes(object(rows[0]).bytes, expected);
  }

  async confirmTransaction(txId: string, timeout = 20_000): Promise<boolean> {
    const id = hex(txId, 32);
    return confirm(timeout, this.pollInterval, async (remaining) => {
      const rows = array(await this.http.json(['tx_status'], {}, { _tx_hashes: [id] }, remaining));
      if (rows.length > 1) return invalid();
      if (rows.length === 0) return false;
      const row = object(rows[0]);
      if (hex(row.tx_hash, 32) !== id) return invalid();
      return row.num_confirmations !== null && natural(row.num_confirmations) > 0;
    });
  }

  async submitTransaction(tx: string): Promise<string> {
    const expected = transactionId(tx);
    const result = object(await this.ogmios.call('submitTransaction', { transaction: { cbor: hex(tx) } }));
    if (hex(object(result.transaction).id, 32) !== expected) return invalid();
    return expected;
  }

  async evaluateTransaction(tx: string, additionalUtxos: UTxO[] = []): Promise<Redeemer[]> {
    const result = await this.ogmios.call('evaluateTransaction', {
      additionalUtxo: uniqueOutputs(additionalUtxos).map(ogmiosOutput),
      transaction: { cbor: hex(tx) }
    });
    return evaluation(tx, array(result));
  }

  /** Validate native-asset identifiers without accepting lovelace as an NFT. */
  private static asset(value: string): string {
    const result = hex(value);
    if (result.length < 56 || result.length > 120) throw new Error('Invalid asset identifier');
    return result;
  }

  /** Page deterministically and reject duplicate rows rather than silently truncating. */
  private async outputs(path: string, body: unknown): Promise<UTxO[]> {
    const result: UTxO[] = [];
    const seen = new Set<string>();
    for (let page = 0; page < 10_000; page++) {
      const rows = array(
        await this.http.json(
          [path],
          { limit: '100', offset: String(page * 100), order: 'tx_hash.asc,tx_index.asc' },
          body
        )
      );
      if (rows.length > 100) return invalid();
      for (const value of rows) {
        const output = koiosOutput(value);
        const key = inputKey(output.input);
        if (seen.has(key)) return invalid();
        seen.add(key);
        if (object(value).is_spent === false) result.push(output);
      }
      if (rows.length < 100) return result;
    }
    throw new Error('Provider pagination limit exceeded');
  }
}
