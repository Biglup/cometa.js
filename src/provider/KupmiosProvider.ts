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

import { Address, CredentialType, RewardAddress } from '../address';
import { Http, credential } from './internal/Http';
import { NetworkMagic, ProtocolParameters, Redeemer, TxIn, UTxO, cborToPlutusData } from '../common';
import { Ogmios } from './internal/Ogmios';
import { Provider } from './Provider';
import { addressText, datumBytes, ogmiosOutput, referenceScript } from './internal/Outputs';
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

const kupoAssetPattern = /^[0-9a-f]{56}(?:\.(?:[0-9a-f]{2}){0,32})?$/;

/** Independent Kupo and Ogmios HTTP endpoints and credentials for one network. */
export interface KupmiosProviderOptions {
  network: NetworkMagic;
  kupoUrl: string;
  ogmiosUrl: string;
  kupoToken?: string;
  ogmiosToken?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

/**
 * Kupo 2.x indexing with stateless Ogmios v6 JSON-RPC over HTTP.
 * Both services must track the configured network. Kupo must index the queried
 * addresses/assets and retain the datum, script and transaction history needed
 * by the application. Queries do not acquire a shared ledger snapshot.
 */
export class KupmiosProvider implements Provider {
  private readonly kupo: Http;
  private readonly ogmios: Ogmios;
  private readonly network: NetworkMagic;
  private readonly pollInterval: number;

  constructor(options: KupmiosProviderOptions) {
    networkName(options.network);
    this.network = options.network;
    this.pollInterval = options.pollIntervalMs ?? 1000;
    if (!Number.isSafeInteger(this.pollInterval) || this.pollInterval < 1 || this.pollInterval > 60_000)
      throw new Error('Invalid polling interval');
    this.kupo = new Http(
      options.kupoUrl,
      options.kupoToken === undefined ? {} : { Authorization: `Bearer ${credential(options.kupoToken)}` },
      options.timeoutMs
    );
    this.ogmios = new Ogmios(
      new Http(
        options.ogmiosUrl,
        options.ogmiosToken === undefined ? {} : { Authorization: `Bearer ${credential(options.ogmiosToken)}` },
        options.timeoutMs
      )
    );
  }

  getName(): string {
    return 'Kupmios';
  }
  getNetworkMagic(): NetworkMagic {
    return this.network;
  }

  async getParameters(): Promise<ProtocolParameters> {
    return protocolParameters(await this.ogmios.call('queryLedgerState/protocolParameters'));
  }

  async getRewardsBalance(address: RewardAddress | string): Promise<bigint> {
    const account = typeof address === 'string' ? RewardAddress.fromBech32(address) : address;
    const owner = account.getCredential();
    const script = owner.type === CredentialType.ScriptHash;
    const rows = array(
      await this.ogmios.call('queryLedgerState/rewardAccountSummaries', { [script ? 'scripts' : 'keys']: [owner.hash] })
    );
    if (rows.length === 0) return 0n;
    if (rows.length !== 1) return invalid();
    const row = object(rows[0]);
    if (hex(row.credential, 28) !== owner.hash || row.from !== (script ? 'script' : 'verificationKey'))
      return invalid();
    return integer(object(object(row.rewards).ada).lovelace);
  }

  async getUnspentOutputs(address: Address | string): Promise<UTxO[]> {
    const text = addressText(typeof address === 'string' ? address : address.toString());
    const outputs = await this.outputs(text);
    if (outputs.some((value) => value.output.address !== text)) return invalid();
    return outputs;
  }

  async getUnspentOutputsWithAsset(address: Address | string, assetId: string): Promise<UTxO[]> {
    const asset = KupmiosProvider.asset(assetId);
    return (await this.getUnspentOutputs(address)).filter((value) => (value.output.value.assets?.[asset] ?? 0n) > 0n);
  }

  async getUnspentOutputByNft(assetId: string): Promise<UTxO> {
    const asset = KupmiosProvider.asset(assetId);
    const outputs = await this.outputs('*', { asset_name: asset.slice(56), policy_id: asset.slice(0, 56) });
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
    const result: UTxO[] = [];
    for (const value of requested) result.push(...(await this.outputs(`${value.index}@${value.txId}`)));
    return resolveOrder(requested, result);
  }

  async resolveDatum(datumHash: string): Promise<string> {
    const expected = hex(datumHash, 32);
    return datumBytes(object(await this.kupo.json(['datums', expected])).datum, expected);
  }

  async confirmTransaction(txId: string, timeout = 20_000): Promise<boolean> {
    const id = hex(txId, 32);
    return confirm(timeout, this.pollInterval, async (remaining) => {
      const rows = array(await this.kupo.json(['matches', `*@${id}`], {}, undefined, remaining));
      for (const value of rows) {
        const row = object(value);
        if (hex(row.transaction_id, 32) !== id) return invalid();
        const created = object(row.created_at);
        natural(created.slot_no);
        hex(created.header_hash, 32);
      }
      return rows.length > 0;
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

  /** Validate a concatenated policy ID and optional asset-name byte string. */
  private static asset(value: string): string {
    const result = hex(value);
    if (result.length < 56 || result.length > 120) throw new Error('Invalid asset identifier');
    return result;
  }

  /** Kupo streams all matches; the HTTP reader rejects oversized responses. */
  private async outputs(pattern: string, query: Record<string, string> = {}): Promise<UTxO[]> {
    const rows = array(await this.kupo.json(['matches', pattern], { ...query, unspent: '' }));
    const outputs: UTxO[] = [];
    for (const value of rows) outputs.push(await this.output(value));
    return uniqueOutputs(outputs);
  }

  /** Resolve and authenticate a single indexed output's datum and script. */
  private async output(value: unknown): Promise<UTxO> {
    const row = object(value);
    if (row.spent_at !== null) return invalid();
    const amount = object(row.value);
    const assets: Record<string, bigint> = {};
    for (const [unit, quantity] of Object.entries(object(amount.assets))) {
      if (!kupoAssetPattern.test(unit)) return invalid();
      const asset = unit.replace('.', '');
      if (asset in assets) return invalid();
      assets[asset] = integer(quantity, 1n, 9223372036854775807n);
    }
    const utxo: UTxO = {
      input: input(row.transaction_id, row.output_index),
      output: {
        address: addressText(row.address),
        value: { assets, coins: integer(amount.coins, 0n, 9223372036854775807n) }
      }
    };
    await this.attachDatum(utxo, row);
    if (row.script_hash !== null) {
      const hash = hex(row.script_hash, 28);
      const script = object(await this.kupo.json(['scripts', hash]));
      utxo.output.scriptReference = referenceScript(script.language, script.script, hash);
    }
    return utxo;
  }

  /** Resolve an inline datum or retain its hash, rejecting inconsistent metadata. */
  private async attachDatum(utxo: UTxO, row: Record<string, unknown>): Promise<void> {
    if (row.datum_hash === null && row.datum_type !== null && row.datum_type !== undefined) return invalid();
    if (row.datum_hash !== null) {
      if (row.datum_type === 'hash') utxo.output.datumHash = hex(row.datum_hash, 32);
      else if (row.datum_type === 'inline')
        utxo.output.datum = cborToPlutusData(await this.resolveDatum(hex(row.datum_hash, 32)));
      else return invalid();
    }
  }
}
